import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Calculator, CheckCircle2, Lock, Plus, RefreshCw, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

type ConsolidationRun = {
  id: string;
  run_number: string;
  period_start: string;
  period_end: string;
  target_currency: string;
  status: string;
  total_debit: number;
  total_credit: number;
  imbalance: number;
  company_count: number;
  elimination_count: number;
  notes: string | null;
  created_at: string;
};

type ConsolidationLine = {
  id: string;
  account_code: string;
  account_name: string | null;
  account_name_ar: string | null;
  account_type: string;
  source_debit: number;
  source_credit: number;
  elimination_debit: number;
  elimination_credit: number;
  consolidated_debit: number;
  consolidated_credit: number;
  consolidated_balance: number;
};

type ConsolidationElimination = {
  id: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  reason: string;
};

type Company = {
  id: string;
  name: string;
  name_ar: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  calculated: "محسوبة",
  approved: "معتمدة",
  locked: "مقفلة",
  cancelled: "ملغاة",
};

const STATUS_TONES: Record<string, string> = {
  draft: "border-0 bg-[#F6F8FB] text-[#94A3B8]",
  calculated: "border-0 bg-[#FEF3C7] text-[#D97706]",
  approved: "border-0 bg-[#E8FBF6] text-[#22C7A1]",
  locked: "border-0 bg-[#ECEEFE] text-[#7C83F6]",
  cancelled: "border-0 bg-[#FFF0F2] text-[#FB6B7A]",
};

export default function FinancialConsolidation() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [runNumber, setRunNumber] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("QAR");
  const [consolidationNotes, setConsolidationNotes] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [eliminationAccountCode, setEliminationAccountCode] = useState("");
  const [eliminationDebit, setEliminationDebit] = useState("0");
  const [eliminationCredit, setEliminationCredit] = useState("0");
  const [eliminationReason, setEliminationReason] = useState("");

  const runsQuery = useQuery({
    queryKey: ["financial-consolidation-runs", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("financial_consolidation_runs")
        .select("id,run_number,period_start,period_end,target_currency,status,total_debit,total_credit,imbalance,company_count,elimination_count,notes,created_at")
        .eq("parent_company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as ConsolidationRun[];
    },
  });

  const linesQuery = useQuery({
    queryKey: ["financial-consolidation-lines", selectedRunId],
    enabled: Boolean(selectedRunId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_consolidation_lines")
        .select("id,account_code,account_name,account_name_ar,account_type,source_debit,source_credit,elimination_debit,elimination_credit,consolidated_debit,consolidated_credit,consolidated_balance")
        .eq("run_id", selectedRunId!)
        .order("account_code", { ascending: true });

      if (error) throw error;
      return (data || []) as ConsolidationLine[];
    },
  });

  const eliminationsQuery = useQuery({
    queryKey: ["financial-consolidation-eliminations", selectedRunId],
    enabled: Boolean(selectedRunId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_consolidation_eliminations")
        .select("id,account_code,debit_amount,credit_amount,reason")
        .eq("run_id", selectedRunId!)
        .order("account_code", { ascending: true });

      if (error) throw error;
      return (data || []) as ConsolidationElimination[];
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id,name,name_ar")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Company[];
    },
  });

  const runCompaniesQuery = useQuery({
    queryKey: ["financial-consolidation-companies", selectedRunId],
    enabled: Boolean(selectedRunId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_consolidation_companies")
        .select("id,company_id,source_currency,exchange_rate")
        .eq("run_id", selectedRunId!);

      if (error) throw error;
      return data || [];
    },
  });

  const selectedRun = useMemo(() => {
    return runsQuery.data?.find((r) => r.id === selectedRunId) ?? null;
  }, [runsQuery.data, selectedRunId]);

  const createRunMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا توجد شركة محددة");
      if (!runNumber.trim() || !periodStart || !periodEnd) throw new Error("أكمل بيانات عملية التوحيد");
      if (new Date(periodStart) > new Date(periodEnd)) throw new Error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

      const { data, error } = await supabase
        .from("financial_consolidation_runs")
        .insert({
          parent_company_id: companyId,
          run_number: runNumber.trim(),
          period_start: periodStart,
          period_end: periodEnd,
          target_currency: targetCurrency,
          status: "draft",
          notes: consolidationNotes.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-runs"] });
      toast.success("تم إنشاء عملية التوحيد المالي");
      setShowCreateDialog(false);
      setRunNumber("");
      setPeriodStart("");
      setPeriodEnd("");
      setConsolidationNotes("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء عملية التوحيد");
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await (supabase as any).rpc("recalculate_financial_consolidation_run", {
        p_run_id: runId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-runs"] });
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-lines"] });
      const balanced = result?.is_balanced ?? false;
      const imbalance = Number(result?.imbalance ?? 0);
      if (balanced) {
        toast.success("تم حساب التوحيد. القائمة متوازنة.");
      } else {
        toast.warning(`تم حساب التوحيد. هناك عدم توازن: ${imbalance.toLocaleString()} ${targetCurrency}`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إعادة حساب التوحيد");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await (supabase as any).rpc("approve_financial_consolidation_run", {
        p_run_id: runId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-runs"] });
      toast.success("تم اعتماد عملية التوحيد المالي");
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "تعذر اعتماد التوحيد";
      if (msg.includes("Creator cannot approve")) {
        toast.error("لا يمكن لمنشئ التوحيد اعتماده (فصل المهام). اطلب من مستخدم آخر الاعتماد.");
      } else if (msg.includes("Unbalanced")) {
        toast.error("لا يمكن اعتماد توحيد غير متوازن. أضف إدخالات إزالة أو راجع البيانات.");
      } else {
        toast.error(msg);
      }
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await (supabase as any).rpc("lock_financial_consolidation_run", {
        p_run_id: runId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-runs"] });
      toast.success("تم قفل عملية التوحيد المالي");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر قفل التوحيد");
    },
  });

  const addCompanyMutation = useMutation({
    mutationFn: async ({ runId, companyToAddId, exchangeRate }: { runId: string; companyToAddId: string; exchangeRate: number }) => {
      const { error } = await supabase
        .from("financial_consolidation_companies")
        .insert({
          run_id: runId,
          company_id: companyToAddId,
          source_currency: targetCurrency,
          exchange_rate: exchangeRate,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-companies"] });
      toast.success("تمت إضافة الشركة إلى التوحيد");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة الشركة");
    },
  });

  const addEliminationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRunId) throw new Error("اختر عملية توحيد أولاً");
      if (!eliminationAccountCode.trim()) throw new Error("أدخل كود الحساب");
      if (!eliminationReason.trim()) throw new Error("أدخل سبب الإزالة");

      const { error } = await supabase
        .from("financial_consolidation_eliminations")
        .insert({
          run_id: selectedRunId,
          account_code: eliminationAccountCode.trim(),
          debit_amount: Number(eliminationDebit) || 0,
          credit_amount: Number(eliminationCredit) || 0,
          reason: eliminationReason.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-consolidation-eliminations"] });
      setEliminationAccountCode("");
      setEliminationDebit("0");
      setEliminationCredit("0");
      setEliminationReason("");
      toast.success("تمت إضافة قيد الإزالة البينية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة قيد الإزالة");
    },
  });

  const fmt = (amount: number) => `${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECEEFE] text-[#7C83F6]">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#020617]">التوحيد المالي متعدد الشركات</h1>
            <p className="mt-1 text-sm font-medium text-[#94A3B8]">
              تجميع القوائم المالية لشركات المجموعة مع إزالة المعاملات البينية.
            </p>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-lg bg-[#020617] text-white hover:bg-[#020617]/90">
              <Plus className="h-4 w-4" />
              عملية توحيد جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء عملية توحيد مالي</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#020617]">رقم العملية</Label>
                <Input value={runNumber} onChange={(e) => setRunNumber(e.target.value)} placeholder="CON-2026-01" className="h-11 rounded-lg bg-[#F6F8FB]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#020617]">من تاريخ</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-11 rounded-lg bg-[#F6F8FB]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#020617]">إلى تاريخ</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-11 rounded-lg bg-[#F6F8FB]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#020617]">العملة المستهدفة</Label>
                <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                  <SelectTrigger className="h-11 rounded-lg bg-[#F6F8FB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QAR">QAR - ريال قطري</SelectItem>
                    <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">EUR - يورو</SelectItem>
                    <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#020617]">ملاحظات (اختياري)</Label>
                <Input value={consolidationNotes} onChange={(e) => setConsolidationNotes(e.target.value)} placeholder="ملاحظات حول عملية التوحيد..." className="h-11 rounded-lg bg-[#F6F8FB]" />
              </div>
              <Button
                onClick={() => createRunMutation.mutate()}
                disabled={createRunMutation.isPending || !companyId}
                className="h-11 w-full gap-2 rounded-lg bg-[#020617] text-white hover:bg-[#020617]/90"
              >
                {createRunMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إنشاء العملية
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-black text-[#020617]">عمليات التوحيد</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">رقم</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">النطاق</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">العملة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الشركات</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الإزالات</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">عدم التوازن</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحالة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm font-bold text-[#94A3B8]">جاري التحميل...</TableCell>
                  </TableRow>
                ) : runsQuery.data?.length ? (
                  runsQuery.data.map((run) => (
                    <TableRow
                      key={run.id}
                      className={selectedRunId === run.id ? "bg-[#F6F8FB]" : ""}
                      onClick={() => setSelectedRunId(run.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell className="font-mono text-sm font-black text-[#020617]">{run.run_number}</TableCell>
                      <TableCell className="text-sm text-[#64748B]">{run.period_start} - {run.period_end}</TableCell>
                      <TableCell className="text-sm text-[#64748B]">{run.target_currency}</TableCell>
                      <TableCell className="text-sm text-[#020617]">{run.company_count}</TableCell>
                      <TableCell className="text-sm text-[#020617]">{run.elimination_count}</TableCell>
                      <TableCell className={`text-sm font-bold ${Math.abs(run.imbalance) > 0.01 ? "text-[#FB6B7A]" : "text-[#22C7A1]"}`}>
                        {fmt(run.imbalance)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_TONES[run.status] ?? STATUS_TONES.draft}>
                          {STATUS_LABELS[run.status] ?? run.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => recalculateMutation.mutate(run.id)}
                            disabled={recalculateMutation.isPending || run.status === "locked"}
                            className="gap-1 text-xs"
                          >
                            {recalculateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
                            حساب
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(run.id)}
                            disabled={approveMutation.isPending || run.status !== "calculated"}
                            className="gap-1 bg-[#22C7A1] text-xs text-white hover:bg-[#1BAF8D]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            اعتماد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => lockMutation.mutate(run.id)}
                            disabled={lockMutation.isPending || run.status !== "approved"}
                            className="gap-1 text-xs"
                          >
                            <Lock className="h-3 w-3" />
                            قفل
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
                        <Globe2 className="h-6 w-6" />
                        <p className="text-sm font-bold">لا توجد عمليات توحيد بعد</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedRun && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#7C83F6]" />
                <CardTitle className="text-base font-black text-[#020617]">
                  الشركات المضمّنة — {selectedRun.run_number}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {runCompaniesQuery.data && runCompaniesQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {runCompaniesQuery.data.map((rc) => {
                    const company = companiesQuery.data?.find((c) => c.id === rc.company_id);
                    return (
                      <div key={rc.id} className="flex items-center justify-between rounded-lg bg-[#F6F8FB] p-3">
                        <div>
                          <p className="text-sm font-bold text-[#020617]">{company?.name_ar || company?.name || rc.company_id.slice(0, 8)}</p>
                          <p className="text-xs text-[#94A3B8]">{rc.source_currency} × {rc.exchange_rate}</p>
                        </div>
                        <Badge className="border-0 bg-white text-[#64748B]">{rc.source_currency}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-[#94A3B8]">لا توجد شركات مضمّنة بعد</p>
              )}

              {companiesQuery.data && companiesQuery.data.length > 1 && selectedRun.status === "draft" && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-black text-[#94A3B8]">إضافة شركة</p>
                  <Select onValueChange={(val) => {
                    const company = companiesQuery.data.find((c) => c.id === val);
                    if (company && company.id !== companyId) {
                      addCompanyMutation.mutate({ runId: selectedRunId!, companyToAddId: company.id, exchangeRate: 1 });
                    }
                  }}>
                    <SelectTrigger className="h-10 rounded-lg bg-[#F6F8FB]">
                      <SelectValue placeholder="اختر شركة للإضافة" />
                    </SelectTrigger>
                    <SelectContent>
                      {companiesQuery.data
                        .filter((c) => c.id !== companyId && !runCompaniesQuery.data?.some((rc) => rc.company_id === c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#D97706]" />
                <CardTitle className="text-base font-black text-[#020617]">قيود الإزالة البينية</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {eliminationsQuery.data && eliminationsQuery.data.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F6F8FB]">
                        <TableHead className="text-right text-xs text-[#94A3B8]">الحساب</TableHead>
                        <TableHead className="text-right text-xs text-[#94A3B8]">مدين</TableHead>
                        <TableHead className="text-right text-xs text-[#94A3B8]">دائن</TableHead>
                        <TableHead className="text-right text-xs text-[#94A3B8]">السبب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eliminationsQuery.data.map((elim) => (
                        <TableRow key={elim.id}>
                          <TableCell className="font-mono text-sm text-[#020617]">{elim.account_code}</TableCell>
                          <TableCell className="text-sm text-[#0F766E]">{fmt(elim.debit_amount)}</TableCell>
                          <TableCell className="text-sm text-[#991B1B]">{fmt(elim.credit_amount)}</TableCell>
                          <TableCell className="text-xs text-[#64748B]">{elim.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-sm text-[#94A3B8]">لا توجد قيود إزالة بينية</p>
              )}

              {selectedRun.status === "draft" && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-black text-[#94A3B8]">إضافة قيد إزالة</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={eliminationAccountCode} onChange={(e) => setEliminationAccountCode(e.target.value)} placeholder="كود الحساب" className="h-10 rounded-lg bg-[#F6F8FB]" />
                    <Input value={eliminationReason} onChange={(e) => setEliminationReason(e.target.value)} placeholder="السبب" className="h-10 rounded-lg bg-[#F6F8FB]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={eliminationDebit} onChange={(e) => setEliminationDebit(e.target.value)} placeholder="مدين" className="h-10 rounded-lg bg-[#F6F8FB]" min={0} />
                    <Input type="number" value={eliminationCredit} onChange={(e) => setEliminationCredit(e.target.value)} placeholder="دائن" className="h-10 rounded-lg bg-[#F6F8FB]" min={0} />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addEliminationMutation.mutate()}
                    disabled={addEliminationMutation.isPending}
                    className="w-full gap-1 rounded-lg bg-[#020617] text-white hover:bg-[#020617]/90"
                  >
                    {addEliminationMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    إضافة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRun && linesQuery.data && linesQuery.data.length > 0 && (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-black text-[#020617]">
              بنود التوحيد — {selectedRun.run_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F6F8FB]">
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">الكود</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحساب</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">مدين (مصدر)</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">دائن (مصدر)</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">إزالة مدين</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">إزالة دائن</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">مدين (موحد)</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">دائن (موحد)</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linesQuery.data.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-sm font-black text-[#020617]">{line.account_code}</TableCell>
                      <TableCell className="text-sm text-[#020617]">{line.account_name_ar || line.account_name || "—"}</TableCell>
                      <TableCell className="text-sm text-[#0F766E]">{fmt(line.source_debit)}</TableCell>
                      <TableCell className="text-sm text-[#991B1B]">{fmt(line.source_credit)}</TableCell>
                      <TableCell className="text-sm text-[#D97706]">{fmt(line.elimination_debit)}</TableCell>
                      <TableCell className="text-sm text-[#D97706]">{fmt(line.elimination_credit)}</TableCell>
                      <TableCell className="text-sm font-bold text-[#020617]">{fmt(line.consolidated_debit)}</TableCell>
                      <TableCell className="text-sm font-bold text-[#020617]">{fmt(line.consolidated_credit)}</TableCell>
                      <TableCell className={`text-sm font-bold ${line.consolidated_balance >= 0 ? "text-[#0F766E]" : "text-[#991B1B]"}`}>
                        {fmt(line.consolidated_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-[#ECEEFE] p-3 text-sm font-bold text-[#4F46E5]">
        <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>نظام التوحيد المالي يدعم: شركات متعددة بعملات مختلفة، إزالة المعاملات البينية، فصل المهام (المنشئ ≠ المعتمد)، قفل نهائي بعد الاعتماد.</span>
      </div>
    </div>
  );
}
