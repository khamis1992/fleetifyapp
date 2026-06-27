import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Lock, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function MonthlyClosePanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const defaultPeriod = useMemo(() => getPreviousMonthRange(), []);
  const [periodName, setPeriodName] = useState(defaultPeriod.periodName);
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);

  const periodsQuery = useQuery({
    queryKey: ["accounting-periods", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
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

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا توجد شركة محددة");
      if (!periodName.trim() || !startDate || !endDate) throw new Error("أكمل بيانات الفترة المالية");
      if (new Date(startDate) > new Date(endDate)) throw new Error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");

      const { data: existing, error: existingError } = await supabase
        .from("accounting_periods")
        .select("id,status")
        .eq("company_id", companyId)
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error } = await supabase
          .from("accounting_periods")
          .update({
            period_name: periodName.trim(),
            status: "locked",
            is_adjustment_period: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        return existing.id;
      }

      const { data, error } = await supabase
        .from("accounting_periods")
        .insert({
          company_id: companyId,
          period_name: periodName.trim(),
          start_date: startDate,
          end_date: endDate,
          status: "locked",
          is_adjustment_period: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("تم إقفال الفترة المالية");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إقفال الفترة المالية");
    },
  });

  const latestClosed = periodsQuery.data?.find((period) => ["closed", "locked"].includes(period.status));

  return (
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
  );
}
