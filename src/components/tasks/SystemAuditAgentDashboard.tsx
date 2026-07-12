import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import {
  useSystemAuditDashboard,
  useSyncSystemAuditReviewTasks,
  type SystemAuditDomain,
  type SystemAuditJobSummary,
  type SystemAuditRunSummary,
} from "@/hooks/useSystemAuditDashboard";
import {
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  type Task,
} from "@/hooks/useTasks";
import {
  Activity,
  AlertTriangle,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Calculator,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  FileText,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";

const colors = systemColorPattern.colors;
const allDomains: SystemAuditDomain[] = [
  "contracts",
  "accounting",
  "fleet",
  "customers",
  "inventory",
  "legal",
  "employees",
];

const domainConfig: Record<
  SystemAuditDomain,
  { label: string; icon: React.ElementType; color: string }
> = {
  contracts: { label: "العقود", icon: FileText, color: "#38BDF8" },
  accounting: { label: "الحسابات", icon: Calculator, color: "#7C83F6" },
  fleet: { label: "الأسطول", icon: Car, color: "#22C7A1" },
  customers: { label: "العملاء", icon: Users, color: "#F59E0B" },
  inventory: { label: "المخزون", icon: Boxes, color: "#0EA5E9" },
  legal: { label: "القضايا", icon: Scale, color: "#FB6B7A" },
  employees: { label: "الموظفين", icon: BriefcaseBusiness, color: "#14B8A6" },
};

const commandLabels: Record<string, string> = {
  "contract.recalculate_totals": "إعادة احتساب إجماليات العقد",
  "invoice.recalculate_balance": "إعادة احتساب رصيد الفاتورة",
  "invoice.sync_zero_impact_amount": "مزامنة مبلغ فاتورة بلا أثر مالي",
  "invoice.cancel_zero_safe": "إلغاء فاتورة صفرية آمنة",
  "schedule.sync_payment_state": "مزامنة حالة القسط",
  "schedule.link_invoice": "ربط القسط بالفاتورة",
  "schedule.link_invoice_by_billing_month": "ربط القسط بفاتورة شهره الصحيحة",
  "schedule.consolidate_duplicate_rows": "دمج صفوف الأقساط المكررة",
  "schedule.repair_invoice_link": "تصحيح رابط القسط بالفاتورة",
  "schedule.realign_contract_invoice_links":
    "إعادة محاذاة روابط الأقساط بالفواتير",
  "schedule.realign_contract_invoice_links_v2":
    "مطابقة الأقساط بالفواتير واحدًا لواحد",
  "schedule.realign_contract_invoice_links_v3":
    "مطابقة كل أقساط العقد بالفواتير",
  "schedule.sync_amount_from_invoice": "مزامنة مبلغ القسط من الفاتورة",
  "contract.generate_missing_invoice": "إنشاء فاتورة مفقودة",
  "payment.correct_uncompleted_date": "تصحيح تاريخ دفعة غير مكتملة",
  "payment.link_clear_invoice": "ربط دفعة واضحة بالفاتورة",
  "payment.classify_customer_advance": "تصنيف الدفعة كدفعة مقدمة",
  "accounting.sync_draft_journal_totals": "مزامنة إجماليات قيد مسودة",
  "vehicle.sync_status": "مزامنة حالة المركبة",
  "vehicle.sync_mileage": "مزامنة عداد المركبة",
  "customer.sync_balance": "مزامنة رصيد العميل",
  "customer.create_balance": "إنشاء ملخص رصيد العميل المفقود",
  "inventory.sync_stock_level": "مزامنة رصيد المخزون",
  "inventory.create_stock_level": "إنشاء رصيد مخزون",
  "legal.sync_case_costs": "مزامنة تكاليف القضية",
  "employee.sync_active_status": "مزامنة حالة الموظف",
  "employee.sync_attendance_hours": "احتساب ساعات الحضور",
  "employee.sync_leave_balance": "مزامنة رصيد الإجازة",
  "employee.sync_payroll_net": "احتساب صافي الراتب",
};

const entityLabels: Record<string, string> = {
  contract: "عقد",
  contracts: "عقد",
  invoice: "فاتورة",
  invoices: "فاتورة",
  contract_payment_schedule: "قسط",
  contract_payment_schedules: "قسط",
  payment: "دفعة",
  payments: "دفعة",
  journal_entry: "قيد محاسبي",
  journal_entries: "قيد محاسبي",
  vehicle: "مركبة",
  vehicles: "مركبة",
  customer: "عميل",
  customer_balance: "رصيد عميل",
  customer_balances: "رصيد عميل",
  inventory_stock_level: "رصيد مخزون",
  inventory_stock_levels: "رصيد مخزون",
  legal_case: "قضية",
  legal_cases: "قضية",
  employee: "موظف",
  employees: "موظف",
  attendance_record: "حضور",
  attendance_records: "حضور",
  leave_balance: "رصيد إجازة",
  leave_balances: "رصيد إجازة",
  payroll: "راتب",
};

const reviewLabels: Record<string, string> = {
  "contract.invalid_period": "فترة عقد غير صحيحة",
  "contract.overpayment": "دفعات أعلى من قيمة العقد",
  "invoice.active_on_cancelled_contract": "فاتورة نشطة لعقد ملغي",
  "invoice.duplicate_contract_month": "أكثر من فاتورة للشهر نفسه",
  "invoice.outside_contract_period": "فاتورة خارج فترة العقد",
  "invoice.schedule_amount_mismatch_with_financial_impact":
    "فرق مؤثر بين القسط والفاتورة",
  "invoice.zero_schedule_amount_requires_review": "فاتورة مرتبطة بقسط صفري",
  "schedule.duplicate_installment": "رقم قسط مكرر",
  "schedule.duplicate_rows": "صفوف أقساط مكررة",
  "schedule.duplicate_rows_ambiguous": "صفوف أقساط مكررة متعارضة",
  "schedule.stale_invoice_link": "رابط قسط بفاتورة قديمة أو خاطئة",
  "schedule.contract_invoice_links_shifted": "روابط الأقساط والفواتير مزاحة",
  "schedule.contract_invoice_links_rebalanced":
    "روابط الأقساط والفواتير تحتاج إعادة مطابقة",
  "schedule.invoice_link_graph_requires_review":
    "شبكة ربط الأقساط والفواتير تحتاج مراجعة",
  "schedule.amount_mismatch_with_financial_invoice":
    "مبلغ القسط لا يطابق الفاتورة المالية",
  "schedule.existing_invoice_link_mismatch": "ربط القسط بفاتورة غير مطابقة",
  "schedule.invoice_link_mismatch": "الفاتورة لا تطابق القسط",
  "schedule.invoice_month_constraint_conflict": "تعارض فاتورة شهرية قائمة",
  "payment.completed_unlinked_requires_reversal":
    "دفعة مكتملة بلا ربط مالي واضح",
  "payment.completed_unlinked_ambiguous": "دفعة مكتملة بلا فاتورة وحيدة واضحة",
  "payment.completed_unlinked_customer_advance":
    "دفعة مقدمة غير مصنفة محاسبيًا",
  "payment.completed_outside_contract_period": "دفعة مكتملة خارج فترة العقد",
  "payment.possible_duplicate": "دفعة مكررة محتملة",
  "accounting.unbalanced_journal": "قيد محاسبي غير متوازن",
  "accounting.journal_insufficient_lines": "قيد محاسبي ناقص السطور",
  "accounting.completed_payment_missing_journal": "دفعة مكتملة بلا قيد محاسبي",
  "accounting.payment_broken_journal_link": "رابط قيد الدفعة غير صالح",
  "customer.duplicate_national_id": "رقم مدني مكرر للعميل",
  "customer.inactive_with_active_contract": "عميل غير نشط لديه عقد نشط",
  "customer.balance_summary_row_count": "ملخص رصيد العميل مفقود أو مكرر",
  "customer.balance_summary_missing": "ملخص رصيد العميل مفقود",
  "customer.balance_summary_duplicate": "ملخصات رصيد مكررة للعميل",
  "inventory.negative_stock": "رصيد مخزون سالب",
  "inventory.missing_stock_level_negative_ledger":
    "رصيد مخزون مفقود وحركاته سالبة",
  "legal.broken_contract_link": "قضية مرتبطة بعقد غير صالح",
  "legal.closed_case_missing_outcome": "قضية مغلقة بلا نتيجة",
  "employee.leave_balance_overused": "إجازات مستخدمة أعلى من الرصيد",
  "employee.payroll_negative_net": "صافي راتب سالب",
  "employee.payroll_journal_linked_mismatch": "فرق راتب مرتبط بقيد محاسبي",
};

const statusConfig: Record<
  string,
  { label: string; color: string; background: string }
> = {
  completed: { label: "مكتمل", color: "#0F766E", background: "#ECFDF5" },
  running: { label: "يعمل الآن", color: "#0369A1", background: "#F0F9FF" },
  retry: { label: "يعيد المحاولة", color: "#B45309", background: "#FFFBEB" },
  queued: { label: "في الانتظار", color: "#5B5FC7", background: "#F5F3FF" },
  partial: { label: "مكتمل جزئيًا", color: "#B45309", background: "#FFFBEB" },
  failed: { label: "تعذر التنفيذ", color: "#BE123C", background: "#FFF1F2" },
  cancelled: { label: "ملغي", color: "#64748B", background: "#F1F5F9" },
  missing: { label: "لم يبدأ", color: "#64748B", background: "#F1F5F9" },
};

const decisionTaskStatusConfig: Record<
  Task["status"],
  { label: string; color: string; background: string }
> = {
  pending: { label: "بانتظار القرار", color: "#B45309", background: "#FFFBEB" },
  in_progress: {
    label: "قيد المعالجة",
    color: "#0369A1",
    background: "#F0F9FF",
  },
  completed: { label: "تمت المراجعة", color: "#0F766E", background: "#ECFDF5" },
  cancelled: { label: "ملغاة", color: "#BE123C", background: "#FFF1F2" },
  on_hold: { label: "مؤجلة", color: "#5B5FC7", background: "#F5F3FF" },
};

const decisionTaskPriorityConfig: Record<
  Task["priority"],
  { label: string; color: string; background: string }
> = {
  low: { label: "منخفضة", color: "#64748B", background: "#F1F5F9" },
  medium: {
    label: "متوسطة",
    color: colors.info,
    background: `${colors.info}14`,
  },
  high: { label: "عالية", color: "#B45309", background: "#FFFBEB" },
  urgent: { label: "عاجلة", color: "#BE123C", background: "#FFF1F2" },
};

type DecisionActionOption = {
  id: string;
  title: string;
  description: string;
  outcome: string;
};

export function SystemAuditAgentDashboard() {
  const { data, isLoading, isWaitingForCompany, isError, isFetching, refetch } =
    useSystemAuditDashboard();
  const { mutate: syncReviewTasks, isPending: isSyncingReviewTasks } =
    useSyncSystemAuditReviewTasks();
  const { data: decisionTasks = [], isLoading: isLoadingDecisionTasks } =
    useTasks({
      category: "system_audit_review",
      status: ["pending", "in_progress", "on_hold"],
    });
  const updateTaskStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();
  const syncedReviewTaskKeyRef = React.useRef<string | null>(null);

  const reviewTaskSyncKey = React.useMemo(() => {
    if (!data?.latestRun || !data.overview.pendingReview) return null;
    const detailedKey = (data.reviewFindings || [])
      .map((finding) => finding.id)
      .join("|");
    const aggregateKey = (data.topReviewTypes || [])
      .map((item) => `${item.domain}:${item.code}:${item.count}`)
      .join("|");
    return `${data.latestRun.id}:${data.overview.pendingReview}:${
      detailedKey || aggregateKey
    }`;
  }, [data]);

  React.useEffect(() => {
    if (!data || !reviewTaskSyncKey || isSyncingReviewTasks) return;
    if (syncedReviewTaskKeyRef.current === reviewTaskSyncKey) return;
    syncedReviewTaskKeyRef.current = reviewTaskSyncKey;
    syncReviewTasks(data);
  }, [data, isSyncingReviewTasks, reviewTaskSyncKey, syncReviewTasks]);

  if (isLoading || isWaitingForCompany) return <DashboardSkeleton />;

  if (isError) {
    return (
      <section className="rounded-lg border border-[#F8CBD0] bg-[#FFF6F7] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#BE123C]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#881337]">
                تعذر تحميل إنجازات الوكيل
              </h2>
              <p className="mt-1 text-sm text-[#9F1239]">
                تحقق من اتصال النظام ثم أعد المحاولة.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-10 gap-2 rounded-lg border-[#F8CBD0] bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </section>
    );
  }

  if (!data?.latestRun)
    return (
      <EmptyDashboard isFetching={isFetching} onRefresh={() => refetch()} />
    );

  const latestRun = data.latestRun;
  const latestAppliedRepair = data.recentRepairs.find(
    (repair) => repair.status === "applied"
  );
  const handleDecisionTaskStatus = (task: Task, status: Task["status"]) => {
    updateTaskStatus.mutate({ taskId: task.id, status });
  };
  const handleDecisionAction = (task: Task, option: DecisionActionOption) => {
    updateTask.mutate({
      id: task.id,
      status: "in_progress",
      metadata: {
        ...(task.metadata || {}),
        selectedHumanDecision: {
          id: option.id,
          title: option.title,
          description: option.description,
          outcome: option.outcome,
          selectedAt: new Date().toISOString(),
        },
      },
    });
  };
  const metrics = [
    {
      title: "الإصلاحات المنفذة",
      value: data.overview.totalAppliedRepairs,
      hint: data.overview.rolledBackRepairs
        ? `${formatNumber(
            data.overview.rolledBackRepairs
          )} عملية تم التراجع عنها`
        : "إصلاحات محفوظة في النظام",
      icon: Wrench,
      color: colors.success,
    },
    {
      title: "السجلات المفحوصة",
      value: data.overview.scanned,
      hint: "في آخر تدقيق شامل",
      icon: Database,
      color: colors.info,
    },
    {
      title: "بانتظار المراجعة",
      value: data.overview.pendingReview,
      hint: "تحتاج قرارًا بشريًا",
      icon: Eye,
      color: "#F59E0B",
    },
    {
      title: "متاح للإصلاح الآلي",
      value: data.overview.automaticRemaining,
      hint:
        latestRun.mode === "dry_run"
          ? "اكتشفه تشغيل المعاينة"
          : "قيد التنفيذ أو الانتظار",
      icon: Activity,
      color: colors.focus,
    },
    {
      title: "أخطاء التنفيذ",
      value: data.overview.failures,
      hint: data.overview.failures
        ? "تحتاج متابعة"
        : "لا توجد أخطاء في آخر تدقيق",
      icon: AlertTriangle,
      color: colors.alert,
    },
    {
      title: "تم التحقق دون تعديل",
      value: data.overview.verifiedNoChange,
      hint: "كانت صحيحة عند الفحص النهائي",
      icon: CheckCircle2,
      color: "#14B8A6",
    },
  ];

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-5">
        <section
          className="overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderColor: colors.border }}
        >
          <div className="flex flex-col gap-4 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#0F766E]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-normal text-[#020617]">
                    وكيل تدقيق النظام
                  </h2>
                  <StatusBadge status={latestRun.status} />
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">
                  متابعة العمل اليومي لوكلاء العقود والحسابات والأسطول والعملاء
                  والمخزون والقضايا والموظفين.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto">
              {isFetching && (
                <span className="text-xs font-medium text-[#64748B]">
                  جارٍ التحديث...
                </span>
              )}
              {data.overview.pendingReview > 0 && (
                <Badge
                  variant="outline"
                  className="h-10 gap-2 rounded-lg border-[#BAE6FD] bg-[#F0F9FF] px-3 text-[#0369A1]"
                >
                  {isSyncingReviewTasks ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isSyncingReviewTasks
                    ? "إدراج مهام المراجعة..."
                    : "تُدرج في مهامي تلقائيًا"}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="تحديث إنجازات الوكيل"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="h-10 w-10 rounded-lg border-[#E5EAF1] bg-white"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", isFetching && "animate-spin")}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>تحديث إنجازات الوكيل</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div
            className="grid border-t bg-[#F6F8FB] sm:grid-cols-2 xl:grid-cols-4"
            style={{ borderColor: colors.border }}
          >
            <HeaderFact
              label="آخر تدقيق شامل"
              value={formatDateTime(
                latestRun.finishedAt ||
                  latestRun.startedAt ||
                  latestRun.createdAt
              )}
              icon={Clock3}
            />
            <HeaderFact
              label="نوع التشغيل"
              value={modeLabel(latestRun.mode)}
              icon={Bot}
            />
            <HeaderFact
              label="تغطية الوكلاء"
              value={`${formatNumber(
                latestRun.completedDomains
              )} من ${formatNumber(latestRun.totalDomains)}`}
              icon={ShieldCheck}
            />
            <HeaderFact
              label="آخر إصلاح محفوظ"
              value={
                latestAppliedRepair
                  ? formatDateTime(latestAppliedRepair.appliedAt)
                  : "لا يوجد إصلاح مسجل"
              }
              icon={CheckCircle2}
            />
          </div>
        </section>

        <section
          aria-label="ملخص إنجازات الوكيل"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
        >
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.title}
                className="min-h-[136px] rounded-lg border bg-white p-4 shadow-sm"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-[#64748B]">
                      {metric.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#020617]">
                      {formatNumber(metric.value)}
                    </p>
                  </div>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      color: metric.color,
                      backgroundColor: `${metric.color}14`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#94A3B8]">
                  {metric.hint}
                </p>
              </article>
            );
          })}
        </section>

        <HumanDecisionPanel
          tasks={decisionTasks}
          pendingReviewCount={data.overview.pendingReview}
          isLoading={isLoadingDecisionTasks || isSyncingReviewTasks}
          isUpdating={updateTaskStatus.isPending || updateTask.isPending}
          onStatusChange={handleDecisionTaskStatus}
          onActionSelect={handleDecisionAction}
        />

        <section
          className="rounded-lg border bg-white shadow-sm"
          style={{ borderColor: colors.border }}
        >
          <SectionHeader
            title="حالة الوكلاء المتخصصين"
            description="نتيجة كل قسم ضمن آخر تدقيق شامل."
            trailing={`${formatNumber(
              latestRun.completedDomains
            )}/${formatNumber(latestRun.totalDomains)} مكتمل`}
          />
          <div
            className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-4"
            style={{ borderColor: colors.border }}
          >
            {allDomains.map((domain) => (
              <DomainAgentCard
                key={domain}
                domain={domain}
                job={data.jobs.find((item) => item.domain === domain)}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <section
            className="min-w-0 rounded-lg border bg-white shadow-sm"
            style={{ borderColor: colors.border }}
          >
            <SectionHeader
              title="آخر الإصلاحات المنفذة"
              description="عمليات الإصلاح التي حُفظت فعليًا في قاعدة البيانات."
              trailing={`${formatNumber(
                data.overview.totalAppliedRepairs
              )} إجمالي`}
            />
            {data.recentRepairs.length ? (
              <div
                className="overflow-x-auto border-t"
                style={{ borderColor: colors.border }}
              >
                <table className="w-full min-w-[720px] table-fixed">
                  <thead className="bg-[#F6F8FB]">
                    <tr>
                      <th className="w-[38%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                        العملية
                      </th>
                      <th className="w-[18%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                        القسم
                      </th>
                      <th className="w-[17%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                        الحالة
                      </th>
                      <th className="w-[27%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                        وقت التنفيذ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1]">
                    {data.recentRepairs.map((repair) => (
                      <tr
                        key={repair.id}
                        className="transition-colors hover:bg-[#F8FAFC]"
                      >
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-semibold leading-5 text-[#0F172A]">
                            {commandLabels[repair.command] || repair.command}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#94A3B8]">
                            {entityLabels[repair.entityTable] || "سجل"} ·{" "}
                            {shortReference(repair.entityId)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#475569]">
                          {domainConfig[repair.domain]?.label || repair.domain}
                        </td>
                        <td className="px-4 py-3">
                          {repair.status === "rolled_back" ? (
                            <Badge
                              variant="outline"
                              className="gap-1 rounded-md border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                            >
                              <RotateCcw className="h-3 w-3" />
                              تم التراجع
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 rounded-md border-[#A7F3D0] bg-[#ECFDF5] text-[#0F766E]"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              نُفذ
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs leading-5 text-[#64748B]">
                          {formatDateTime(
                            repair.rolledBackAt || repair.appliedAt
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptySection
                icon={Wrench}
                text="لا توجد إصلاحات منفذة حتى الآن."
              />
            )}
          </section>

          <section
            className="min-w-0 rounded-lg border bg-white shadow-sm"
            style={{ borderColor: colors.border }}
          >
            <SectionHeader
              title="أبرز ما يحتاج مراجعة"
              description="أكثر أنواع الملاحظات تكرارًا في آخر تدقيق."
            />
            {data.topReviewTypes.length ? (
              <div
                className="space-y-4 border-t p-4"
                style={{ borderColor: colors.border }}
              >
                {data.topReviewTypes.map((item) => {
                  const maxCount = data.topReviewTypes[0]?.count || 1;
                  return (
                    <div key={item.code} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-5 text-[#0F172A]">
                            {reviewLabels[item.code] ||
                              `ملاحظة تدقيق: ${item.code}`}
                          </p>
                          <p className="mt-0.5 text-xs text-[#94A3B8]">
                            {domainConfig[item.domain]?.label || item.domain}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-[#0F172A]">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F7]">
                        <div
                          className="h-full rounded-full bg-[#F59E0B]"
                          style={{
                            width: `${Math.max(
                              6,
                              (item.count / maxCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection
                icon={CheckCircle2}
                text="لا توجد ملاحظات معلقة في آخر تدقيق."
              />
            )}
          </section>
        </div>

        <section
          className="rounded-lg border bg-white shadow-sm"
          style={{ borderColor: colors.border }}
        >
          <SectionHeader
            title="سجل التشغيل"
            description="آخر مرات تشغيل الوكيل ونتيجة كل تشغيل."
            trailing={`${formatNumber(data.recentRuns.length)} تشغيلات`}
          />
          <div
            className="overflow-x-auto border-t"
            style={{ borderColor: colors.border }}
          >
            <table className="w-full min-w-[780px] table-fixed">
              <thead className="bg-[#F6F8FB]">
                <tr>
                  <th className="w-[24%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    وقت التشغيل
                  </th>
                  <th className="w-[17%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    النوع
                  </th>
                  <th className="w-[17%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    الحالة
                  </th>
                  <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    الأقسام
                  </th>
                  <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    المفحوص
                  </th>
                  <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold text-[#64748B]">
                    الإصلاحات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {data.recentRuns.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="grid gap-4 rounded-lg border bg-[#F6F8FB] p-4 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center"
          style={{ borderColor: colors.border }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#38BDF8] shadow-sm">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              التدقيق اليومي يعمل تلقائيًا
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              يبدأ الساعة {formatClock(data.schedule.dailyAuditTime)} بتوقيت
              الرياض، ويستكمل الدفعات المتوقفة كل{" "}
              {formatNumber(data.schedule.recoveryFrequencyMinutes)} دقائق أثناء
              نافذة التدقيق.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-md border-[#BAE6FD] bg-white text-[#0369A1]"
          >
            تحديث تلقائي كل دقيقة
          </Badge>
        </section>
      </div>
    </TooltipProvider>
  );
}

function HumanDecisionPanel({
  tasks,
  pendingReviewCount,
  isLoading,
  isUpdating,
  onStatusChange,
  onActionSelect,
}: {
  tasks: Task[];
  pendingReviewCount: number;
  isLoading: boolean;
  isUpdating: boolean;
  onStatusChange: (task: Task, status: Task["status"]) => void;
  onActionSelect: (task: Task, option: DecisionActionOption) => void;
}) {
  const [expandedTaskId, setExpandedTaskId] = React.useState<string | null>(
    null
  );
  const visibleTasks = tasks.slice(0, 8);
  const trailing = tasks.length
    ? `${formatNumber(tasks.length)} قرار مفتوح`
    : pendingReviewCount
    ? `${formatNumber(pendingReviewCount)} بانتظار المراجعة`
    : undefined;

  return (
    <section
      className="rounded-lg border bg-white shadow-sm"
      style={{ borderColor: colors.border }}
    >
      <SectionHeader
        title="قرارات تحتاج مراجعة بشرية"
        description="هذه عناصر الوكيل التي لا يصلح تنفيذها آليًا. اختر القرار المناسب حتى يعرف الفريق ما تمت معالجته وما بقي للمتابعة."
        trailing={trailing}
      />

      <div className="border-t p-4" style={{ borderColor: colors.border }}>
        {isLoading && tasks.length === 0 ? (
          <div className="flex min-h-[150px] items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-sm font-semibold text-[#64748B]">
            <Loader2 className="h-4 w-4 animate-spin text-[#38BDF8]" />
            تجهيز قرارات الوكيل...
          </div>
        ) : visibleTasks.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleTasks.map((task) => (
              <DecisionTaskCard
                key={task.id}
                task={task}
                isExpanded={expandedTaskId === task.id}
                isUpdating={isUpdating}
                onToggleDetails={() =>
                  setExpandedTaskId((current) =>
                    current === task.id ? null : task.id
                  )
                }
                onStatusChange={onStatusChange}
                onActionSelect={onActionSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-[#22C7A1]" />
            <h3 className="mt-3 text-sm font-bold text-[#0F172A]">
              لا توجد قرارات مفتوحة الآن
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#64748B]">
              عند ظهور عناصر تحتاج قرارًا بشريًا سيعرضها الوكيل هنا مع خيارات
              المعالجة مباشرة.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function DecisionTaskCard({
  task,
  isExpanded,
  isUpdating,
  onToggleDetails,
  onStatusChange,
  onActionSelect,
}: {
  task: Task;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggleDetails: () => void;
  onStatusChange: (task: Task, status: Task["status"]) => void;
  onActionSelect: (task: Task, option: DecisionActionOption) => void;
}) {
  const statusStyle =
    decisionTaskStatusConfig[task.status] || decisionTaskStatusConfig.pending;
  const priorityStyle =
    decisionTaskPriorityConfig[task.priority] ||
    decisionTaskPriorityConfig.medium;
  const metadata = task.metadata || {};
  const domain =
    typeof metadata.domain === "string" ? metadata.domain : undefined;
  const code = typeof metadata.code === "string" ? metadata.code : undefined;
  const entityType =
    typeof metadata.entityType === "string" ? metadata.entityType : undefined;
  const entityId =
    typeof metadata.entityId === "string" ? metadata.entityId : undefined;
  const count = typeof metadata.count === "number" ? metadata.count : undefined;
  const description = compactTaskDescription(task.description);
  const detailLines = taskDescriptionLines(task.description);
  const metadataRows = decisionMetadataRows(task);
  const actionOptions = decisionActionOptions(code);
  const selectedDecision = selectedHumanDecision(task);

  return (
    <article className="rounded-lg border border-[#E5EAF1] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-transparent px-2 py-1 text-[11px]"
              style={{
                color: statusStyle.color,
                backgroundColor: statusStyle.background,
              }}
            >
              {statusStyle.label}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-transparent px-2 py-1 text-[11px]"
              style={{
                color: priorityStyle.color,
                backgroundColor: priorityStyle.background,
              }}
            >
              {priorityStyle.label}
            </Badge>
            {domain && (
              <Badge
                variant="outline"
                className="rounded-md border-[#E5EAF1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#475569]"
              >
                {domainConfig[domain as SystemAuditDomain]?.label || domain}
              </Badge>
            )}
          </div>

          <h3 className="mt-3 text-base font-bold leading-6 text-[#0F172A]">
            {task.title}
          </h3>
          {description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">
              {description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748B]">
            {code && (
              <span className="rounded-md bg-[#F6F8FB] px-2 py-1">
                {reviewLabels[code] || code}
              </span>
            )}
            {count ? (
              <span className="rounded-md bg-[#F6F8FB] px-2 py-1">
                {formatNumber(count)} عنصر
              </span>
            ) : null}
            {entityType && entityId && (
              <span className="rounded-md bg-[#F6F8FB] px-2 py-1">
                {entityLabels[entityType] || entityType}:{" "}
                {shortReference(entityId)}
              </span>
            )}
          </div>
        </div>

        <ShieldCheck className="hidden h-5 w-5 shrink-0 text-[#38BDF8] sm:block" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F7] pt-3">
        <p className="text-xs font-medium text-[#94A3B8]">
          اضغط لعرض سبب القرار والبيانات التي اعتمد عليها الوكيل.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-lg border-[#E5EAF1] bg-[#F8FAFC] px-3 text-[#0F172A] hover:bg-[#EEF2F7]"
          aria-expanded={isExpanded}
          onClick={onToggleDetails}
        >
          {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-[#DCEAF7] bg-[#F8FAFC] p-4">
          <div>
            <h4 className="text-sm font-bold text-[#0F172A]">تفاصيل القرار</h4>
            {detailLines.length ? (
              <div className="mt-2 space-y-2">
                {detailLines.map((line, index) => (
                  <p
                    key={`${task.id}-detail-${index}`}
                    className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-[#334155]"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-[#64748B]">
                لا توجد تفاصيل إضافية محفوظة لهذه المهمة.
              </p>
            )}
          </div>

          {metadataRows.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">
                بيانات التحقق
              </h4>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {metadataRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-md border border-[#E5EAF1] bg-white px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold text-[#94A3B8]">
                      {row.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-[#0F172A]">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-sm font-bold text-[#0F172A]">
                ما الإجراء الصحيح؟
              </h4>
              {selectedDecision && (
                <Badge
                  variant="outline"
                  className="w-fit rounded-md border-[#BAE6FD] bg-white text-[#0369A1]"
                >
                  المختار: {selectedDecision.title}
                </Badge>
              )}
            </div>
            <div className="mt-2 grid gap-2">
              {actionOptions.map((option) => {
                const selected = selectedDecision?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onActionSelect(task, option)}
                    className={cn(
                      "rounded-lg border bg-white p-3 text-right transition-colors hover:border-[#38BDF8] hover:bg-[#F0F9FF] disabled:cursor-not-allowed disabled:opacity-60",
                      selected
                        ? "border-[#38BDF8] bg-[#F0F9FF]"
                        : "border-[#E5EAF1]"
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#0F172A]">
                          {option.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[#64748B]">
                          {option.description}
                        </span>
                        <span className="mt-2 block rounded-md bg-[#F8FAFC] px-2 py-1 text-xs font-medium leading-5 text-[#475569]">
                          النتيجة: {option.outcome}
                        </span>
                      </span>
                      {selected ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22C7A1]" />
                      ) : (
                        <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#38BDF8]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-lg border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1] hover:bg-[#E0F2FE]"
          disabled={isUpdating}
          onClick={onToggleDetails}
        >
          <PlayCircle className="h-4 w-4" />
          اختيار إجراء
        </Button>
        <Button
          type="button"
          className="h-10 gap-2 rounded-lg bg-[#22C7A1] text-white hover:bg-[#0F766E]"
          disabled={isUpdating}
          onClick={() => onStatusChange(task, "completed")}
        >
          <CheckCircle2 className="h-4 w-4" />
          تمت المراجعة
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-lg border-[#DDD6FE] bg-[#F5F3FF] text-[#5B5FC7] hover:bg-[#EDE9FE]"
          disabled={isUpdating || task.status === "on_hold"}
          onClick={() => onStatusChange(task, "on_hold")}
        >
          <PauseCircle className="h-4 w-4" />
          تأجيل القرار
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-lg border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C] hover:bg-[#FFE4E6]"
          disabled={isUpdating}
          onClick={() => onStatusChange(task, "cancelled")}
        >
          <XCircle className="h-4 w-4" />
          إلغاء المتابعة
        </Button>
      </div>
    </article>
  );
}

function HeaderFact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex min-h-[78px] items-center gap-3 border-b border-[#E5EAF1] px-4 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-l xl:border-b-0 xl:border-l xl:last:border-l-0">
      <Icon className="h-4 w-4 shrink-0 text-[#38BDF8]" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#94A3B8]">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  );
}

function DomainAgentCard({
  domain,
  job,
}: {
  domain: SystemAuditDomain;
  job?: SystemAuditJobSummary;
}) {
  const config = domainConfig[domain];
  const Icon = config.icon;
  const status = job?.status || "missing";
  const stats = job?.stats || {};
  const completion =
    status === "completed"
      ? 100
      : status === "failed"
      ? 100
      : status === "running"
      ? 65
      : status === "retry"
      ? 40
      : 10;

  return (
    <article className="min-h-[184px] rounded-lg border border-[#E5EAF1] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              color: config.color,
              backgroundColor: `${config.color}14`,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              وكيل {config.label}
            </h3>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              {formatNumber(job?.processedBatches || 0)} دفعة
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <Progress
        value={completion}
        className={cn(
          "mt-4 h-1.5 bg-[#EEF2F7]",
          status === "failed" ? "[&>div]:bg-[#FB6B7A]" : "[&>div]:bg-[#22C7A1]"
        )}
      />

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[#EEF2F7] pt-3 text-center">
        <CompactStat label="فُحص" value={stats.scanned || 0} />
        <CompactStat label="ملاحظات" value={stats.findings || 0} />
        <CompactStat label="أُصلح" value={stats.repaired || 0} />
        <CompactStat label="سليم" value={stats.verified || 0} />
      </div>
      {job?.hasError && (
        <p className="mt-3 text-xs font-medium text-[#BE123C]">
          تعذر إكمال إحدى الدفعات ويجري تسجيلها للمتابعة.
        </p>
      )}
    </article>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-[#0F172A]">{formatNumber(value)}</p>
      <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">{label}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">{description}</p>
      </div>
      {trailing && (
        <Badge
          variant="outline"
          className="w-fit rounded-md border-[#E5EAF1] bg-[#F8FAFC] text-[#475569]"
        >
          {trailing}
        </Badge>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.missing;
  return (
    <Badge
      variant="outline"
      className="shrink-0 whitespace-nowrap rounded-md border-transparent px-2 py-1 text-[11px]"
      style={{ color: config.color, backgroundColor: config.background }}
    >
      {status === "running" && (
        <Loader2 className="ml-1 h-3 w-3 animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}

function RunRow({ run }: { run: SystemAuditRunSummary }) {
  return (
    <tr className="transition-colors hover:bg-[#F8FAFC]">
      <td className="px-4 py-3 text-xs leading-5 text-[#64748B]">
        {formatDateTime(run.finishedAt || run.startedAt || run.createdAt)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-[#334155]">
        {modeLabel(run.mode)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={run.status} />
      </td>
      <td className="px-4 py-3 text-sm text-[#475569]">
        {formatNumber(run.completedDomains)}/{formatNumber(run.totalDomains)}
      </td>
      <td className="px-4 py-3 text-sm text-[#475569]">
        {formatNumber(run.scanned)}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-[#0F766E]">
        {formatNumber(run.repaired)}
      </td>
    </tr>
  );
}

function EmptySection({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div
      className="flex min-h-[220px] flex-col items-center justify-center border-t px-4 py-10 text-center"
      style={{ borderColor: colors.border }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F6F8FB] text-[#94A3B8]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-[#64748B]">{text}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="جارٍ تحميل إنجازات الوكيل">
      <section className="rounded-lg border border-[#E5EAF1] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-[min(520px,70vw)]" />
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[136px] rounded-lg" />
        ))}
      </section>
      <Skeleton className="h-[390px] rounded-lg" />
    </div>
  );
}

function EmptyDashboard({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-lg border border-[#E5EAF1] bg-white px-5 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#0F766E]">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#0F172A]">
        لا يوجد تشغيل مسجل بعد
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#64748B]">
        ستظهر هنا نتائج أول تدقيق شامل وإصلاحاته فور تشغيل الوكيل.
      </p>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={isFetching}
        className="mt-5 h-10 gap-2 rounded-lg border-[#E5EAF1]"
      >
        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        تحديث
      </Button>
    </section>
  );
}

function modeLabel(mode: string) {
  return mode === "apply" ? "إصلاح فعلي" : "تدقيق ومعاينة";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-QA", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-QA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatClock(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date(2026, 0, 1, Number(hours), Number(minutes));
  return new Intl.DateTimeFormat("ar-QA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function decisionActionOptions(
  code: string | undefined
): DecisionActionOption[] {
  const optionsByCode: Record<string, DecisionActionOption[]> = {
    "customer.balance_summary_row_count": [
      {
        id: "rebuild_customer_balance_summary",
        title: "إعادة بناء ملخص رصيد العميل",
        description:
          "اختر هذا إذا كان الملخص مفقودًا أو غير موجود للعميل، وتحتاج مطابقة الرصيد مع الفواتير والدفعات.",
        outcome:
          "تتحول المهمة لقيد المعالجة ويتم توجيه الموظف لإعادة بناء ملخص الرصيد ومراجعة الأرقام.",
      },
      {
        id: "merge_duplicate_customer_balance_rows",
        title: "دمج أو حذف الملخصات المكررة",
        description:
          "اختر هذا إذا كان للعميل أكثر من صف ملخص رصيد وتحتاج إبقاء الصف الصحيح فقط.",
        outcome:
          "يتم حفظ القرار كمعالجة دمج/تنظيف، ثم يراجع الموظف الصفوف المتكررة قبل الإغلاق.",
      },
      {
        id: "send_to_finance_review",
        title: "تحويل للمالية لمراجعة الرصيد",
        description:
          "اختر هذا إذا كانت الفواتير أو الدفعات غير واضحة ولا يمكن اعتماد الملخص مباشرة.",
        outcome: "تتحول المهمة للمعالجة مع قرار تصعيد مالي قبل أي تعديل.",
      },
    ],
    "customer.balance_summary_duplicate": [
      {
        id: "consolidate_customer_balance_summaries",
        title: "دمج ملخصات الرصيد المكررة",
        description:
          "اختر هذا بعد تحديد صف الرصيد المعتمد ومراجعة أي أرصدة أو حدود ائتمانية خاصة.",
        outcome:
          "تتحول المهمة للمعالجة اليدوية مع الحفاظ على سجل القرار قبل الدمج.",
      },
      {
        id: "escalate_customer_balance_duplicates",
        title: "تصعيد للمراجعة المالية",
        description:
          "استخدمه عندما تختلف الصفوف أو توجد بيانات ائتمانية لا يمكن دمجها آليًا.",
        outcome: "تُسند المهمة للمراجعة المالية دون حذف أي صف.",
      },
    ],
    "schedule.existing_invoice_link_mismatch": [
      {
        id: "correct_schedule_invoice_link",
        title: "تصحيح ربط القسط بالفاتورة الصحيحة",
        description: "اختر هذا عند وجود فاتورة شهرية واضحة تطابق القسط والعقد.",
        outcome: "تبدأ المعالجة على أساس تصحيح الربط ثم التحقق من حالة السداد.",
      },
      {
        id: "unlink_and_review_schedule",
        title: "إزالة الربط الحالي وإعادة المراجعة",
        description:
          "اختر هذا إذا كان الربط الحالي غير موثوق ولا توجد فاتورة بديلة مؤكدة.",
        outcome: "يُحفظ القرار كإعادة مراجعة، ويمنع اعتماد ربط خاطئ.",
      },
      {
        id: "finance_linking_review",
        title: "تحويل الربط للمالية",
        description: "اختر هذا إذا كان الربط يؤثر على دفعة أو قيد محاسبي.",
        outcome: "تتحول المهمة للمعالجة مع قرار مراجعة مالية قبل تعديل الربط.",
      },
    ],
    "schedule.invoice_link_mismatch": [
      {
        id: "correct_schedule_invoice_link",
        title: "تصحيح ربط القسط بالفاتورة المطابقة",
        description:
          "اختر هذا إذا كانت الفاتورة الصحيحة واضحة من نفس العقد ونفس الشهر.",
        outcome: "يتم اعتماد مسار تصحيح الربط ومتابعة السداد.",
      },
      {
        id: "manual_schedule_invoice_check",
        title: "مراجعة يدوية للقسط والفاتورة",
        description:
          "اختر هذا إذا كان الشهر أو المبلغ غير واضح ويحتاج تدقيقًا قبل الربط.",
        outcome: "تبدأ معالجة تدقيق يدوي بدون تعديل آلي.",
      },
      {
        id: "legal_or_finance_escalation",
        title: "تصعيد قبل التعديل",
        description:
          "اختر هذا إذا كان القسط مرتبطًا بنزاع، تحصيل، أو ملف قانوني.",
        outcome: "يُحفظ القرار كتصعيد قبل أي تغيير في الربط.",
      },
    ],
    "invoice.active_on_cancelled_contract": [
      {
        id: "cancel_zero_impact_invoice",
        title: "إلغاء الفاتورة إذا كانت بلا أثر مالي",
        description: "اختر هذا إذا لم تكن الفاتورة مرتبطة بدفعة أو قيد محاسبي.",
        outcome:
          "تبدأ المعالجة على أساس إلغاء آمن بعد التأكد من عدم وجود أثر مالي.",
      },
      {
        id: "finance_review_active_invoice",
        title: "مراجعة مالية قبل الإلغاء",
        description:
          "اختر هذا إذا كانت الفاتورة مرتبطة بدفعة أو قيد أو مطالبة مالية.",
        outcome: "يُحفظ القرار كمراجعة مالية قبل الإلغاء.",
      },
      {
        id: "review_contract_cancellation_state",
        title: "مراجعة حالة إلغاء العقد",
        description:
          "اختر هذا إذا كان العقد قد لا يكون ملغيًا فعليًا أو يحتاج تصحيح حالة.",
        outcome: "تبدأ المعالجة بمراجعة حالة العقد بدل حذف الفاتورة مباشرة.",
      },
    ],
    "payment.completed_unlinked_requires_reversal": [
      {
        id: "link_completed_payment_to_invoice",
        title: "ربط الدفعة بالفاتورة الصحيحة",
        description:
          "اختر هذا إذا كانت الفاتورة المقابلة واضحة ويمكن ربط الدفعة بها.",
        outcome: "تبدأ المعالجة بربط الدفعة والتحقق من أثرها المالي.",
      },
      {
        id: "create_reversal_review",
        title: "مراجعة عكس/إعادة تصنيف الدفعة",
        description:
          "اختر هذا إذا كانت الدفعة مكتملة لكن لا يوجد ربط واضح أو يوجد أثر محاسبي خاطئ.",
        outcome: "تُحفظ كحالة تحتاج عكس أو إعادة تصنيف قبل الإغلاق.",
      },
      {
        id: "finance_payment_investigation",
        title: "تحويل الدفعة للتحقيق المالي",
        description: "اختر هذا إذا كانت الدفعة مرتبطة بعميل أو عقد غير مؤكد.",
        outcome: "تبدأ المعالجة كمراجعة مالية موجهة.",
      },
    ],
    "invoice.outside_contract_period": [
      {
        id: "cancel_outside_period_invoice",
        title: "إلغاء الفاتورة خارج فترة العقد",
        description:
          "اختر هذا إذا كانت الفاتورة خارج الفترة ولا ترتبط بدفعة أو قيد.",
        outcome: "تبدأ المعالجة بإلغاء آمن بعد التحقق من عدم وجود أثر مالي.",
      },
      {
        id: "correct_invoice_date",
        title: "تصحيح تاريخ الفاتورة",
        description:
          "اختر هذا إذا كان الخطأ في التاريخ فقط والفاتورة تخص شهرًا داخل العقد.",
        outcome: "يُحفظ القرار كتصحيح تاريخ بدل الإلغاء.",
      },
      {
        id: "review_contract_period",
        title: "مراجعة فترة العقد نفسها",
        description:
          "اختر هذا إذا كانت تواريخ العقد غير مؤكدة أو تم تمديد العقد بدون تحديث.",
        outcome: "تبدأ المعالجة بمراجعة فترة العقد قبل تعديل الفواتير.",
      },
    ],
  };

  return code && optionsByCode[code]
    ? optionsByCode[code]
    : [
        {
          id: "manual_department_review",
          title: "مراجعة يدوية داخل القسم",
          description:
            "اختر هذا إذا كان القرار يحتاج موظف القسم لمراجعة السجل ومرفقاته.",
          outcome:
            "تتحول المهمة إلى قيد المعالجة مع حفظ قرار المراجعة اليدوية.",
        },
        {
          id: "finance_review",
          title: "تحويل للمالية",
          description:
            "اختر هذا إذا كان القرار قد يؤثر على فاتورة، دفعة، أو قيد محاسبي.",
          outcome: "يتم حفظ القرار كتصعيد مالي قبل أي تعديل.",
        },
        {
          id: "wait_for_more_information",
          title: "انتظار معلومات إضافية",
          description:
            "اختر هذا إذا كانت البيانات غير كافية لاتخاذ قرار صحيح الآن.",
          outcome: "يمكن بعدها تأجيل القرار مع بقاء المهمة قابلة للمتابعة.",
        },
      ];
}

function selectedHumanDecision(task: Task): DecisionActionOption | null {
  const selected = task.metadata?.selectedHumanDecision;
  if (!selected || typeof selected !== "object") return null;
  const record = selected as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.title !== "string")
    return null;
  return {
    id: record.id,
    title: record.title,
    description:
      typeof record.description === "string" ? record.description : "",
    outcome: typeof record.outcome === "string" ? record.outcome : "",
  };
}

function compactTaskDescription(value: string | undefined) {
  if (!value) return "";
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ");
}

function taskDescriptionLines(value: string | undefined) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function decisionMetadataRows(task: Task) {
  const metadata = task.metadata || {};
  const rows: Array<{ label: string; value: string }> = [];
  addMetadataRow(rows, "القسم", formatDomainValue(metadata.domain));
  addMetadataRow(rows, "نوع الملاحظة", formatReviewCodeValue(metadata.code));
  addMetadataRow(
    rows,
    "عدد العناصر",
    typeof metadata.count === "number"
      ? formatNumber(metadata.count)
      : undefined
  );
  addMetadataRow(
    rows,
    "مستوى الخطورة",
    typeof metadata.severity === "string" ? metadata.severity : undefined
  );
  addMetadataRow(
    rows,
    "نوع السجل",
    typeof metadata.entityType === "string" ? metadata.entityType : undefined
  );
  addMetadataRow(
    rows,
    "معرّف السجل",
    typeof metadata.entityId === "string" ? metadata.entityId : undefined
  );
  addMetadataRow(
    rows,
    "معرّف التشغيل",
    typeof metadata.runId === "string" ? metadata.runId : undefined
  );
  addMetadataRow(
    rows,
    "معرّف ملاحظة الوكيل",
    typeof metadata.systemAgentFindingId === "string"
      ? metadata.systemAgentFindingId
      : undefined
  );
  addMetadataRow(
    rows,
    "أمر الإصلاح المقترح",
    typeof metadata.repairCommand === "string"
      ? commandLabels[metadata.repairCommand] || metadata.repairCommand
      : undefined
  );
  addMetadataRow(
    rows,
    "الدليل المختصر",
    formatMetadataObject(metadata.evidence)
  );
  return rows;
}

function addMetadataRow(
  rows: Array<{ label: string; value: string }>,
  label: string,
  value: string | undefined
) {
  if (!value) return;
  rows.push({ label, value });
}

function formatDomainValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  return domainConfig[value as SystemAuditDomain]?.label || value;
}

function formatReviewCodeValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  return reviewLabels[value] || value;
}

function formatMetadataObject(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  try {
    return JSON.stringify(value).slice(0, 260);
  } catch {
    return undefined;
  }
}

function shortReference(value: string) {
  if (!value) return "بدون مرجع";
  return value.length > 14 ? `${value.slice(0, 8)}…` : value;
}
