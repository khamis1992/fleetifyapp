import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileCheck2, Plus, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useAuth } from "@/contexts/AuthContext";

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

type AdvancedApprovalRequest = {
  id: string;
  policy_id: string;
  action: string;
  source_table: string;
  source_id: string;
  amount: number;
  currency: string;
  status: string;
  current_step_order: number;
  requested_by: string | null;
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
};

type AdvancedApprovalPolicy = {
  id: string;
  action: string;
  branch_id: string | null;
  currency: string;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
};

type AdvancedApprovalAction = {
  id: string;
  step_order: number;
  action: string;
  actor_id: string | null;
  actor_role: string;
  notes: string | null;
  acted_at: string;
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

const ADVANCED_ACTION_LABELS: Record<string, string> = {
  invoice_cancel: "إلغاء فاتورة",
  payment_cancel: "إلغاء دفعة",
  journal_post: "ترحيل قيد",
  period_reopen: "إعادة فتح فترة",
  budget_override: "تجاوز ميزانية",
  bank_reconcile: "مطابقة بنكية",
  report_approve: "اعتماد تقرير",
};

const ADVANCED_STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export function FinancialApprovalsPanel() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const userRole = user?.roles?.[0] ?? "staff";

  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [policyAction, setPolicyAction] = useState("invoice_cancel");
  const [policyMinAmount, setPolicyMinAmount] = useState("0");
  const [policyMaxAmount, setPolicyMaxAmount] = useState("");
  const [policyCurrency, setPolicyCurrency] = useState("QAR");

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

  const advancedRequestsQuery = useQuery({
    queryKey: ["advanced-financial-approval-requests", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_approval_requests")
        .select("id,policy_id,action,source_table,source_id,amount,currency,status,current_step_order,requested_by,requested_at,completed_at,notes")
        .eq("company_id", companyId)
        .order("requested_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as AdvancedApprovalRequest[];
    },
  });

  const advancedPoliciesQuery = useQuery({
    queryKey: ["advanced-financial-approval-policies", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_approval_policies")
        .select("id,action,branch_id,currency,min_amount,max_amount,is_active")
        .eq("company_id", companyId)
        .order("action", { ascending: true });

      if (error) throw error;
      return (data || []) as AdvancedApprovalPolicy[];
    },
  });

  const approvalActionsQuery = useQuery({
    queryKey: ["advanced-financial-approval-actions", expandedRequestId],
    enabled: Boolean(expandedRequestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_approval_actions")
        .select("id,step_order,action,actor_id,actor_role,notes,acted_at")
        .eq("request_id", expandedRequestId!)
        .order("acted_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AdvancedApprovalAction[];
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

  const advancedTotals = useMemo(() => {
    const rows = advancedRequestsQuery.data || [];
    const pending = rows.filter((r) => r.status === "pending");
    return {
      total: rows.length,
      pending: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    };
  }, [advancedRequestsQuery.data]);

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

  const actOnAdvancedMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }: { requestId: string; action: "approved" | "rejected"; notes?: string }) => {
      const { data, error } = await (supabase as any).rpc("act_on_financial_approval_step", {
        p_request_id: requestId,
        p_action: action,
        p_actor_role: userRole,
        p_actor_branch_id: null,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["advanced-financial-approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["advanced-financial-approval-actions"] });
      const status = result?.status ?? "pending";
      if (status === "approved") {
        toast.success("تم اعتماد الطلب المالي (الخطوة النهائية)");
      } else if (status === "rejected") {
        toast.success("تم رفض الطلب المالي");
      } else {
        toast.success("تمت الموافقة على هذه الخطوة. انتقل إلى الخطوة التالية.");
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "تعذر تنفيذ إجراء الموافقة";
      if (msg.includes("Requester cannot approve")) {
        toast.error("لا يمكن للطالب اعتماد طلبه الخاص (فصل المهام). اطلب من مستخدم آخر الاعتماد.");
      } else if (msg.includes("Actor role is not allowed")) {
        toast.error("دورك لا يسمح بالموافقة على هذه الخطوة. مطلوب دور مختلف.");
      } else {
        toast.error(msg);
      }
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا توجد شركة محددة");

      const { data, error } = await supabase
        .from("financial_approval_policies")
        .insert({
          company_id: companyId,
          action: policyAction,
          currency: policyCurrency,
          min_amount: Number(policyMinAmount) || 0,
          max_amount: policyMaxAmount ? Number(policyMaxAmount) : null,
          is_active: true,
          created_by: user?.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advanced-financial-approval-policies"] });
      toast.success("تم إنشاء سياسة الموافقة المالية");
      setShowPolicyDialog(false);
      setPolicyMinAmount("0");
      setPolicyMaxAmount("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء سياسة الموافقة");
    },
  });

  return (
    <div className="space-y-6">
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

      <Separator className="my-2" />

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm" dir="rtl">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECEEFE] text-[#7C83F6]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-[#020617]">الموافقات المتقدمة متعددة المراحل</CardTitle>
                <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                  نظام الموافقات المالية المتقدم مع سياسات حسب النوع والمبلغ والدور وفصل المهام.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-[#FFF0F2] px-3 py-1 text-[#FB6B7A] hover:bg-[#FFF0F2]">
                {advancedTotals.pending} معلق
              </Badge>
              <Badge className="border-0 bg-[#EAF8FE] px-3 py-1 text-[#0284C7] hover:bg-[#EAF8FE]">
                {formatCurrency(advancedTotals.pendingAmount)}
              </Badge>
              <Badge className="border-0 bg-[#F6F8FB] px-3 py-1 text-[#64748B] hover:bg-[#F6F8FB]">
                {advancedTotals.total} إجمالي
              </Badge>
              <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 rounded-xl bg-[#020617] text-white hover:bg-[#020617]/90">
                    <Plus className="h-3.5 w-3.5" />
                    سياسة جديدة
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إنشاء سياسة موافقة مالية</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#020617]">نوع الإجراء</Label>
                      <Select value={policyAction} onValueChange={setPolicyAction}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#F6F8FB]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ADVANCED_ACTION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-[#020617]">الحد الأدنى للمبلغ</Label>
                        <Input
                          type="number"
                          value={policyMinAmount}
                          onChange={(e) => setPolicyMinAmount(e.target.value)}
                          className="h-11 rounded-xl bg-[#F6F8FB]"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-[#020617]">الحد الأقصى (اختياري)</Label>
                        <Input
                          type="number"
                          value={policyMaxAmount}
                          onChange={(e) => setPolicyMaxAmount(e.target.value)}
                          placeholder="بدون حد"
                          className="h-11 rounded-xl bg-[#F6F8FB]"
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#020617]">العملة</Label>
                      <Select value={policyCurrency} onValueChange={setPolicyCurrency}>
                        <SelectTrigger className="h-11 rounded-xl bg-[#F6F8FB]">
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
                    <Button
                      onClick={() => createPolicyMutation.mutate()}
                      disabled={createPolicyMutation.isPending || !companyId}
                      className="h-11 w-full gap-2 rounded-xl bg-[#020617] text-white hover:bg-[#020617]/90"
                    >
                      {createPolicyMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      إنشاء السياسة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          {advancedPoliciesQuery.data && advancedPoliciesQuery.data.length > 0 && (
            <div className="rounded-2xl bg-[#F6F8FB] p-3">
              <p className="mb-2 text-xs font-black text-[#94A3B8]">السياسات النشطة</p>
              <div className="flex flex-wrap gap-2">
                {advancedPoliciesQuery.data.filter((p) => p.is_active).map((policy) => (
                  <Badge key={policy.id} className="border-0 bg-white text-[#020617]">
                    {ADVANCED_ACTION_LABELS[policy.action] ?? policy.action}
                    {" "}({policy.currency} {policy.min_amount}
                    {policy.max_amount ? `-${policy.max_amount}` : "+"})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الإجراء</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">المصدر</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">المبلغ</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الخطوة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">الحالة</TableHead>
                  <TableHead className="text-right text-xs font-black text-[#94A3B8]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advancedRequestsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-[#94A3B8]">
                      جاري تحميل الطلبات المتقدمة...
                    </TableCell>
                  </TableRow>
                ) : advancedRequestsQuery.data?.length ? (
                  advancedRequestsQuery.data.map((req) => (
                    <TableRow
                      key={req.id}
                      className={expandedRequestId === req.id ? "bg-[#F6F8FB]" : ""}
                      onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-black text-[#020617]">
                            {ADVANCED_ACTION_LABELS[req.action] ?? req.action}
                          </p>
                          {req.notes && (
                            <p className="mt-1 max-w-[280px] truncate text-xs text-[#64748B]">{req.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#64748B]">
                        {req.source_table} / {req.source_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-black text-[#020617]">
                        {formatCurrency(req.amount)}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-[#020617]">
                        {req.current_step_order}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            req.status === "approved"
                              ? "border-0 bg-[#E8FBF6] text-[#22C7A1]"
                              : req.status === "rejected"
                                ? "border-0 bg-[#FFF0F2] text-[#FB6B7A]"
                                : req.status === "cancelled"
                                  ? "border-0 bg-[#F6F8FB] text-[#94A3B8]"
                                  : "border-0 bg-[#FEF3C7] text-[#D97706]"
                          }
                        >
                          {ADVANCED_STATUS_LABELS[req.status] ?? req.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {req.status === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => actOnAdvancedMutation.mutate({ requestId: req.id, action: "approved" })}
                              disabled={actOnAdvancedMutation.isPending}
                              className="gap-1 bg-[#22C7A1] text-white hover:bg-[#1BAF8D]"
                            >
                              {actOnAdvancedMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => actOnAdvancedMutation.mutate({ requestId: req.id, action: "rejected" })}
                              disabled={actOnAdvancedMutation.isPending}
                              className="gap-1 border-[#FB6B7A]/30 text-[#FB6B7A] hover:bg-[#FFF0F2]"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              رفض
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
                        <ShieldCheck className="h-6 w-6" />
                        <p className="text-sm font-bold">لا توجد طلبات موافقة متقدمة بعد</p>
                        <p className="text-xs">أنشئ سياسة موافقة أولاً، ثم ستظهر الطلبات هنا عند إنشائها.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {expandedRequestId && approvalActionsQuery.data && (
            <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
              <p className="mb-3 text-xs font-black text-[#94A3B8]">سجل إجراءات الموافقة</p>
              {approvalActionsQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {approvalActionsQuery.data.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 rounded-xl bg-white p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        act.action === "approved" ? "bg-[#E8FBF6] text-[#22C7A1]"
                        : act.action === "rejected" ? "bg-[#FFF0F2] text-[#FB6B7A]"
                        : "bg-[#F6F8FB] text-[#94A3B8]"
                      }`}>
                        {act.action === "approved" ? <CheckCircle2 className="h-4 w-4" />
                        : act.action === "rejected" ? <XCircle className="h-4 w-4" />
                        : <Clock3 className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#020617]">
                            خطوة {act.step_order} — {act.action === "approved" ? "موافقة" : act.action === "rejected" ? "رفض" : "إلغاء"}
                          </p>
                          <p className="text-xs text-[#94A3B8]">{new Date(act.acted_at).toLocaleString("ar")}</p>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">الدور: {act.actor_role}</p>
                        {act.notes && <p className="mt-1 text-xs text-[#64748B]">{act.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-[#94A3B8]">لا توجد إجراءات بعد</p>
              )}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl bg-[#ECEEFE] p-3 text-sm font-bold text-[#4F46E5]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>نظام الموافقات المتقدم يطبق فصل المهام (الطالب ≠ الموافق)، ويتطلب أدواراً محددة لكل خطوة، ويدعم موافقات متعددة المراحل حسب المبلغ.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}