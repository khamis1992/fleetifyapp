import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileCheck2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

type FinancialApprovalRequest = {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  source_type: string;
  source_id: string | null;
  status: string | null;
  priority: string | null;
  total_amount: number | null;
  current_step_order: number | null;
  created_at: string | null;
};

const financialSourceTypes = ["payment", "expense", "purchase", "contract", "budget"];

const sourceLabels: Record<string, string> = {
  payment: "دفعة",
  expense: "مصروف",
  purchase: "مشتريات",
  contract: "عقد",
  budget: "ميزانية",
};

const priorityTone: Record<string, string> = {
  urgent: "border-0 bg-[#FFF0F2] text-[#FB6B7A]",
  high: "border-0 bg-[#FFF7ED] text-[#EA580C]",
  medium: "border-0 bg-[#EAF8FE] text-[#0284C7]",
  low: "border-0 bg-[#F6F8FB] text-[#64748B]",
};

export function FinancialApprovalsPanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  const approvalsQuery = useQuery({
    queryKey: ["financial-approval-requests", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("id,request_number,title,description,source_type,source_id,status,priority,total_amount,current_step_order,created_at")
        .eq("company_id", companyId)
        .in("source_type", financialSourceTypes as any)
        .in("status", ["pending"] as any)
        .order("created_at", { ascending: true })
        .limit(12);

      if (error) throw error;
      return (data || []) as FinancialApprovalRequest[];
    },
  });

  const totals = useMemo(() => {
    const rows = approvalsQuery.data || [];
    return {
      count: rows.length,
      amount: rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      urgent: rows.filter((row) => row.priority === "urgent" || row.priority === "high").length,
    };
  }, [approvalsQuery.data]);

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const now = new Date().toISOString();
      const { data: userData } = await supabase.auth.getUser();

      const { error: requestError } = await supabase
        .from("approval_requests")
        .update({
          status: status as any,
          completed_at: now,
          updated_at: now,
        })
        .eq("id", id);

      if (requestError) throw requestError;

      await supabase
        .from("approval_steps")
        .update({
          status: status as any,
          approver_id: userData.user?.id || null,
          approved_at: now,
        })
        .eq("request_id", id)
        .eq("status", "pending" as any);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["financial-approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      toast.success(variables.status === "approved" ? "تمت الموافقة المالية" : "تم رفض الطلب المالي");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الموافقة المالية");
    },
  });

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm" dir="rtl">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F2] text-[#FB6B7A]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-[#020617]">الموافقات المالية</CardTitle>
              <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                راقب طلبات الإلغاء، الدفعات، المصروفات، العقود والميزانيات قبل تنفيذ أثرها المالي.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-[#F6F8FB] px-3 py-1 text-[#64748B] hover:bg-[#F6F8FB]">
              {totals.count} طلب معلق
            </Badge>
            <Badge className="border-0 bg-[#EAF8FE] px-3 py-1 text-[#0284C7] hover:bg-[#EAF8FE]">
              {formatCurrency(totals.amount)}
            </Badge>
            {totals.urgent > 0 && (
              <Badge className="border-0 bg-[#FFF0F2] px-3 py-1 text-[#FB6B7A] hover:bg-[#FFF0F2]">
                {totals.urgent} عاجل
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F6F8FB]">
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">الطلب</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">النوع</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">الأولوية</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">المبلغ</TableHead>
                <TableHead className="text-right text-xs font-black text-[#94A3B8]">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                    جاري تحميل الموافقات...
                  </TableCell>
                </TableRow>
              ) : approvalsQuery.data?.length ? (
                approvalsQuery.data.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm font-black text-[#020617]">{request.request_number}</p>
                        <p className="mt-1 max-w-[360px] truncate text-xs font-bold text-[#64748B]">{request.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-0 bg-[#ECEEFE] text-[#7C83F6]">
                        {sourceLabels[request.source_type] || request.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityTone[request.priority || "low"] || priorityTone.low}>
                        {request.priority || "low"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-[#020617]">{formatCurrency(request.total_amount || 0)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateApprovalMutation.mutate({ id: request.id, status: "approved" })}
                          disabled={updateApprovalMutation.isPending}
                          className="gap-1 bg-[#22C7A1] text-white hover:bg-[#1BAF8D]"
                        >
                          {updateApprovalMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateApprovalMutation.mutate({ id: request.id, status: "rejected" })}
                          disabled={updateApprovalMutation.isPending}
                          className="gap-1 border-[#FB6B7A]/30 text-[#FB6B7A] hover:bg-[#FFF0F2]"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          رفض
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#22C7A1]">
                      <Clock3 className="h-6 w-6" />
                      <p className="text-sm font-black">لا توجد موافقات مالية معلقة الآن</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
