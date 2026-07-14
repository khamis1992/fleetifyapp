import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Lock, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

type AccountingPeriod = {
  id: string;
  company_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  is_adjustment_period: boolean | null;
};

type EquityAccount = {
  id: string;
  account_name: string;
  account_code: string;
};

type AnnualCloseRun = {
  id: string;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  revenue_total: number;
  expense_total: number;
  net_income: number;
  status: string;
  notes: string | null;
};

function getPreviousMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    periodName: `إقفال ${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

function getDefaultAnnualCloseDates() {
  const today = new Date();
  const year = today.getFullYear() - 1;
  return {
    fiscalYear: year,
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  };
}

const ANNUAL_CLOSE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  calculated: "محسوبة",
  closed: "مقفلة",
  voided: "ملغاة",
};

export function MonthlyClosePanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const defaultPeriod = useMemo(() => getPreviousMonthRange(), []);
  const [periodName, setPeriodName] = useState(defaultPeriod.periodName);
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);

  const defaultAnnual = useMemo(() => getDefaultAnnualCloseDates(), []);
  const [fiscalYear, setFiscalYear] = useState<number>(defaultAnnual.fiscalYear);
  const [annualStart, setAnnualStart] = useState(defaultAnnual.periodStart);
  const [annualEnd, setAnnualEnd] = useState(defaultAnnual.periodEnd);
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState("");
  const [annualNotes, setAnnualNotes] = useState("");
  const [calculatedRunId, setCalculatedRunId] = useState<string | null>(null);
  const [calculatedResult, setCalculatedResult] = useState<{ revenue: number; expense: number; netIncome: number } | null>(null);

  const periodsQuery = useQuery({
    queryKey: ["accounting-periods", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("accounting_periods")
        .select("id,company_id,period_name,start_date,end_date,status,is_adjustment_period")
        .eq("company_id", companyId)
        .order("start_date", { ascending: false })
        .limit(8);

      if (error) throw error;
      return (data || []) as AccountingPeriod[];
    },
  });

  const equityAccountsQuery = useQuery({
    queryKey: ["equity-accounts", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, account_name, account_code")
        .eq("company_id", companyId)
        .ilike("account_type", "equity")
        .eq("is_header", false)
        .order("account_code", { ascending: true });

      if (error) throw error;
      return (data || []) as EquityAccount[];
    },
  });

  const annualCloseRunsQuery = useQuery({
    queryKey: ["annual-financial-close-runs", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("annual_financial_close_runs")
        .select("id, fiscal_year, period_start, period_end, revenue_total, expense_total, net_income, status, notes")
        .eq("company_id", companyId)
        .order("fiscal_year", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as AnnualCloseRun[];
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا توجد شركة محددة");
      if (!periodName.trim() || !startDate || !endDate) throw new Error("أكمل بيانات الفترة المالية");
      if (new Date(startDate) > new Date(endDate)) throw new Error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

      const { data, error } = await supabase.rpc("close_accounting_period_v1", {
        p_company_id: companyId,
        p_period_name: periodName.trim(),
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("تم إقفال الفترة المالية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إقفال الفترة المالية");
    },
  });

  const calculateAnnualCloseMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا توجد شركة محددة");
      if (!retainedEarningsAccountId) throw new Error("اختر حساب الأرباح المحتجزة");
      if (new Date(annualStart) > new Date(annualEnd)) throw new Error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

      const { data, error } = await (supabase as any).rpc("calculate_annual_financial_close", {
        p_company_id: companyId,
        p_fiscal_year: fiscalYear,
        p_period_start: annualStart,
        p_period_end: annualEnd,
        p_retained_earnings_account_id: retainedEarningsAccountId,
        p_notes: annualNotes.trim() || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (runId) => {
      setCalculatedRunId(runId);
      queryClient.invalidateQueries({ queryKey: ["annual-financial-close-runs"] });
      const run = annualCloseRunsQuery.data?.find((r) => r.id === runId);
      if (run) {
        setCalculatedResult({
          revenue: run.revenue_total,
          expense: run.expense_total,
          netIncome: run.net_income,
        });
      } else {
        setCalculatedResult({ revenue: 0, expense: 0, netIncome: 0 });
      }
      toast.success("تم حساب الإقفال السنوي. راجع النتائج ثم اعتمده.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حساب الإقفال السنوي");
    },
  });

  const approveAnnualCloseMutation = useMutation({
    mutationFn: async () => {
      if (!calculatedRunId) throw new Error("لا يوجد إقفال محسوب للاعتماد");

      const { data, error } = await (supabase as any).rpc("approve_annual_financial_close", {
        p_close_run_id: calculatedRunId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["annual-financial-close-runs"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      setCalculatedRunId(null);
      setCalculatedResult(null);
      toast.success(`تم اعتماد الإقفال السنوي. صافي الدخل: ${Number(result?.net_income ?? 0).toLocaleString()} QAR`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "تعذر اعتماد الإقفال السنوي";
      if (msg.includes("Requester cannot approve")) {
        toast.error("لا يمكن للطالب اعتماد إقفاله الخاص (فصل المهام). اطلب من مستخدم آخر الاعتماد.");
      } else {
        toast.error(msg);
      }
    },
  });

  const latestClosed = periodsQuery.data?.find((period) => ["closed", "locked"].includes(period.status));

  const formatCurrency = (amount: number) => `${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} QAR`;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm" dir="rtl">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECEEFE] text-[#7C83F6]">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-[#020617]">الإقفال الشهري</CardTitle>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                  اقفل الفترات المالية لمنع تسجيل أو تعديل أي حركة بتاريخ داخل فترة مقفلة.
                </p>
              </div>
            </div>
            <Badge className="w-fit border-0 bg-[#E8FBF6] px-3 py-1 text-[#22C7A1] hover:bg-[#E8FBF6]">
              {latestClosed ? `آخر إقفال: ${latestClosed.period_name}` : "لا توجد فترات مقفلة"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">اسم الفترة</Label>
              <Input value={periodName} onChange={(event) => setPeriodName(event.target.value)} className="h-11 rounded-xl bg-[#F6F8FB]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">من تاريخ</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 rounded-xl bg-[#F6F8FB]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">إلى تاريخ</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 rounded-xl bg-[#F6F8FB]" />
            </div>
            <Button
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending || !companyId}
              className="h-11 gap-2 rounded-xl bg-[#020617] text-white hover:bg-[#020617]/90"
            >
              {closeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              إقفال الفترة
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الفترة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">النطاق</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                      جاري تحميل الفترات...
                    </TableCell>
                  </TableRow>
                ) : periodsQuery.data?.length ? (
                  periodsQuery.data.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-black text-[#020617]">{period.period_name}</TableCell>
                      <TableCell className="text-sm text-[#64748B]">{period.start_date} - {period.end_date}</TableCell>
                      <TableCell>
                        <Badge className={period.status === "locked" ? "border-0 bg-[#E8FBF6] text-[#22C7A1]" : "border-0 bg-[#F6F8FB] text-[#94A3B8]"}>
                          {period.status === "locked" ? "مقفلة" : period.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                      لا توجد فترات مالية بعد. ابدأ بإقفال الشهر السابق.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#E8FBF6] p-3 text-sm font-bold text-[#0F766E]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>بعد الإقفال، أي محاولة تسجيل دفعة أو قيد بتاريخ داخل الفترة ستُرفض من طبقة الضوابط المالية.</span>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm" dir="rtl">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-[#020617]">الإقفال السنوي</CardTitle>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                  إقفال حسابات الإيرادات والمصروفات في الأرباح المحتجزة وإنشاء قيد افتتاحي للسنة المالية الجديدة.
                </p>
              </div>
            </div>
            <Badge className="w-fit border-0 bg-[#FEF3C7] px-3 py-1 text-[#D97706] hover:bg-[#FEF3C7]">
              {annualCloseRunsQuery.data?.find((r) => r.status === "closed")
                ? `آخر إقفال سنوي: ${annualCloseRunsQuery.data.find((r) => r.status === "closed")?.fiscal_year}`
                : "لا توجد إقفالات سنوية معتمدة"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 md:items-end">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">السنة المالية</Label>
              <Input
                type="number"
                value={fiscalYear}
                onChange={(event) => setFiscalYear(Number(event.target.value))}
                className="h-11 rounded-xl bg-[#F6F8FB]"
                min={2000}
                max={2100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">من تاريخ</Label>
              <Input type="date" value={annualStart} onChange={(event) => setAnnualStart(event.target.value)} className="h-11 rounded-xl bg-[#F6F8FB]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">إلى تاريخ</Label>
              <Input type="date" value={annualEnd} onChange={(event) => setAnnualEnd(event.target.value)} className="h-11 rounded-xl bg-[#F6F8FB]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#020617]">حساب الأرباح المحتجزة</Label>
              <Select value={retainedEarningsAccountId} onValueChange={setRetainedEarningsAccountId}>
                <SelectTrigger className="h-11 rounded-xl bg-[#F6F8FB]">
                  <SelectValue placeholder="اختر حساب حقوق الملكية" />
                </SelectTrigger>
                <SelectContent>
                  {equityAccountsQuery.isLoading ? (
                    <SelectItem value="_loading" disabled>جاري التحميل...</SelectItem>
                  ) : equityAccountsQuery.data?.length ? (
                    equityAccountsQuery.data.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>لا توجد حسابات حقوق ملكية</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-[#020617]">ملاحظات (اختياري)</Label>
            <Input
              value={annualNotes}
              onChange={(event) => setAnnualNotes(event.target.value)}
              placeholder="ملاحظات حول الإقفال السنوي..."
              className="h-11 rounded-xl bg-[#F6F8FB]"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Button
              onClick={() => calculateAnnualCloseMutation.mutate()}
              disabled={calculateAnnualCloseMutation.isPending || !companyId || !retainedEarningsAccountId}
              className="h-11 gap-2 rounded-xl bg-[#020617] text-white hover:bg-[#020617]/90"
            >
              {calculateAnnualCloseMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              حساب الإقفال السنوي
            </Button>
            <Button
              onClick={() => approveAnnualCloseMutation.mutate()}
              disabled={approveAnnualCloseMutation.isPending || !calculatedRunId}
              className="h-11 gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#22C7A1]/90"
            >
              {approveAnnualCloseMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              اعتماد الإقفال السنوي
            </Button>
          </div>

          {calculatedResult && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#E8FBF6] p-4">
                <p className="text-xs font-bold text-[#0F766E]">إجمالي الإيرادات</p>
                <p className="mt-1 text-lg font-black text-[#020617]">{formatCurrency(calculatedResult.revenue)}</p>
              </div>
              <div className="rounded-2xl bg-[#FEF2F2] p-4">
                <p className="text-xs font-bold text-[#991B1B]">إجمالي المصروفات</p>
                <p className="mt-1 text-lg font-black text-[#020617]">{formatCurrency(calculatedResult.expense)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${calculatedResult.netIncome >= 0 ? "bg-[#E8FBF6]" : "bg-[#FEF2F2]"}`}>
                <p className={`text-xs font-bold ${calculatedResult.netIncome >= 0 ? "text-[#0F766E]" : "text-[#991B1B]"}`}>صافي الدخل</p>
                <p className="mt-1 text-lg font-black text-[#020617]">{formatCurrency(calculatedResult.netIncome)}</p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">السنة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">النطاق</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الإيرادات</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">المصروفات</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">صافي الدخل</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annualCloseRunsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                      جاري تحميل الإقفالات السنوية...
                    </TableCell>
                  </TableRow>
                ) : annualCloseRunsQuery.data?.length ? (
                  annualCloseRunsQuery.data.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-black text-[#020617]">{run.fiscal_year}</TableCell>
                      <TableCell className="text-sm text-[#64748B]">{run.period_start} - {run.period_end}</TableCell>
                      <TableCell className="text-sm text-[#0F766E]">{formatCurrency(run.revenue_total)}</TableCell>
                      <TableCell className="text-sm text-[#991B1B]">{formatCurrency(run.expense_total)}</TableCell>
                      <TableCell className="text-sm font-bold text-[#020617]">{formatCurrency(run.net_income)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            run.status === "closed"
                              ? "border-0 bg-[#E8FBF6] text-[#22C7A1]"
                              : run.status === "calculated"
                                ? "border-0 bg-[#FEF3C7] text-[#D97706]"
                                : "border-0 bg-[#F6F8FB] text-[#94A3B8]"
                          }
                        >
                          {ANNUAL_CLOSE_STATUS_LABELS[run.status] ?? run.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                      لا توجد إقفالات سنوية بعد. ابدأ بحساب إقفال السنة المالية السابقة.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#FEF3C7] p-3 text-sm font-bold text-[#92400E]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>الموافق لا يمكن أن يكون نفس الطالب (فصل المهام). سيقوم النظام برفض الاعتماد إذا حاول نفس المستخدم الاعتماد.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
