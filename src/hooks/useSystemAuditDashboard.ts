import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SystemAuditDomain =
  | "contracts"
  | "accounting"
  | "fleet"
  | "customers"
  | "inventory"
  | "legal"
  | "employees";

export interface SystemAuditRunSummary {
  id: string;
  mode: "dry_run" | "apply";
  status: string;
  triggerSource: string;
  requestedDomains: SystemAuditDomain[];
  completedDomains: number;
  totalDomains: number;
  scanned: number;
  findings: number;
  repaired: number;
  verified: number;
  review: number;
  failed: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface SystemAuditJobSummary {
  domain: SystemAuditDomain;
  status: string;
  processedBatches: number;
  attempts: number;
  stats: Record<string, number>;
  hasError: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

export interface SystemAuditRepairSummary {
  id: string;
  runId: string;
  domain: SystemAuditDomain;
  command: string;
  entityTable: string;
  entityId: string;
  status: "applied" | "rolled_back";
  appliedAt: string;
  rolledBackAt: string | null;
}

export interface SystemAuditReviewFindingSummary {
  id: string;
  runId: string;
  domain: SystemAuditDomain;
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "detected" | "review";
  entityType: string;
  entityId: string;
  title: string;
  details: string;
  evidence: Record<string, unknown>;
  confidence: number;
  repairCommand: string | null;
  aiDecision: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAuditDashboardData {
  ok: true;
  companyId: string;
  generatedAt: string;
  dashboardVersion: string;
  overview: {
    totalAppliedRepairs: number;
    rolledBackRepairs: number;
    latestRepairs: number;
    verifiedNoChange: number;
    pendingReview: number;
    automaticRemaining: number;
    failures: number;
    aiDecisions: number;
    scanned: number;
    findings: number;
  };
  latestRun: SystemAuditRunSummary | null;
  latestObservedRun: SystemAuditRunSummary | null;
  latestApplyRun: SystemAuditRunSummary | null;
  jobs: SystemAuditJobSummary[];
  recentRuns: SystemAuditRunSummary[];
  recentRepairs: SystemAuditRepairSummary[];
  topReviewTypes: Array<{
    code: string;
    domain: SystemAuditDomain;
    count: number;
  }>;
  reviewFindings: SystemAuditReviewFindingSummary[];
  severityTotals: Record<string, number>;
  schedule: {
    timezone: string;
    dailyAuditTime: string;
    recoveryWindow: string;
    recoveryFrequencyMinutes: number;
  };
}

const SYSTEM_AUDIT_REVIEW_TASK_CATEGORY = "system_audit_review";
const OPEN_REVIEW_TASK_STATUSES = ["pending", "in_progress", "on_hold"];

const domainLabels: Record<SystemAuditDomain, string> = {
  contracts: "العقود",
  accounting: "الحسابات",
  fleet: "الأسطول",
  customers: "العملاء",
  inventory: "المخزون",
  legal: "القضايا",
  employees: "الموظفين",
};

const severityLabels: Record<
  SystemAuditReviewFindingSummary["severity"],
  string
> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
};

const reviewTypeLabels: Record<string, string> = {
  "contract.financial_totals_mismatch": "إجماليات العقد المالية غير متطابقة",
  "contract.invalid_period": "فترة عقد غير صحيحة",
  "contract.overpayment": "دفعات أعلى من قيمة العقد",
  "invoice.active_on_cancelled_contract": "فاتورة نشطة لعقد ملغي",
  "invoice.duplicate_contract_month": "أكثر من فاتورة للشهر نفسه",
  "invoice.outside_contract_period": "فاتورة خارج فترة العقد",
  "invoice.legacy_direct_overpayment":
    "دفعة مباشرة قديمة تتجاوز رصيد الفاتورة",
  "invoice.balance_mismatch": "رصيد الفاتورة غير متطابق",
  "invoice.schedule_amount_mismatch": "مبلغ الفاتورة لا يطابق القسط",
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
  "schedule.ambiguous_invoice_link": "أكثر من فاتورة محتملة للقسط",
  "schedule.due_month_invoice_missing": "فاتورة شهر استحقاق القسط مفقودة",
  "schedule.invoice_exists_with_shifted_due_date":
    "فاتورة القسط موجودة بتاريخ استحقاق مزاح",
  "schedule.invoice_link_requires_active_contract":
    "ربط الفاتورة يتطلب عقدًا نشطًا",
  "schedule.missing_invoice": "قسط بلا فاتورة",
  "schedule.payment_state_mismatch": "حالة سداد القسط غير متطابقة",
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
  "accounting.draft_journal_totals_mismatch": "إجماليات قيد المسودة غير متطابقة",
  "accounting.posted_journal_totals_mismatch":
    "إجماليات قيد مرحّل غير متطابقة",
  "accounting.bank_payment_missing_bank_for_reconciliation":
    "دفعة بنكية بلا حساب بنك محدد",
  "accounting.bank_payment_missing_transaction_for_reconciliation":
    "دفعة بنكية بلا حركة بنكية مرتبطة",
  "accounting.bank_payment_duplicate_transactions":
    "دفعة مرتبطة بأكثر من حركة بنكية أصلية",
  "accounting.bank_payment_awaiting_statement_match":
    "دفعة جاهزة لمطابقة كشف البنك",
  "accounting.bank_payment_transaction_mismatch":
    "الحركة البنكية لا تطابق الدفعة",
  "accounting.bank_transaction_unlinked_for_reconciliation":
    "حركة بنكية مكتملة بلا دفعة مرتبطة",
  "customer.duplicate_national_id": "رقم مدني مكرر للعميل",
  "customer.inactive_with_active_contract": "عميل غير نشط لديه عقد نشط",
  "customer.balance_summary_row_count": "ملخص رصيد العميل مفقود أو مكرر",
  "customer.balance_summary_missing": "ملخص رصيد العميل مفقود",
  "customer.balance_summary_duplicate": "ملخصات رصيد مكررة للعميل",
  "customer.balance_summary_mismatch": "ملخص رصيد العميل غير متطابق",
  "inventory.negative_stock": "رصيد مخزون سالب",
  "inventory.missing_stock_level_negative_ledger":
    "رصيد مخزون مفقود وحركاته سالبة",
  "legal.broken_contract_link": "قضية مرتبطة بعقد غير صالح",
  "legal.closed_case_missing_outcome": "قضية مغلقة بلا نتيجة",
  "legal.completed_payment_missing_financial_link":
    "دفعة قضية مكتملة بلا ربط مالي",
  "employee.leave_balance_overused": "إجازات مستخدمة أعلى من الرصيد",
  "employee.payroll_negative_net": "صافي راتب سالب",
  "employee.payroll_journal_linked_mismatch": "فرق راتب مرتبط بقيد محاسبي",
};

type ReviewTaskSeed = {
  key: string;
  title: string;
  description: string;
  priority: "medium" | "high" | "urgent";
  metadata: Record<string, unknown>;
};

export function useSystemAuditDashboard() {
  const { companyId, isInitializing, authError } = useUnifiedCompanyAccess();

  const query = useQuery({
    queryKey: ["system-audit-dashboard", companyId],
    enabled: Boolean(companyId) && !isInitializing && !authError,
    queryFn: async (): Promise<SystemAuditDashboardData> => {
      const { data, error } = await supabase.functions.invoke(
        "system-audit-dashboard",
        {
          body: { companyId },
        }
      );

      if (error) throw error;
      if (!data?.ok)
        throw new Error(data?.error || "تعذر تحميل سجل وكيل التدقيق");
      return data as SystemAuditDashboardData;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  return {
    ...query,
    companyId,
    isWaitingForCompany: isInitializing || (!companyId && !authError),
  };
}

export function useSyncSystemAuditReviewTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    mutationFn: async (dashboard: SystemAuditDashboardData) => {
      const companyId = user?.profile?.company_id || dashboard.companyId;
      const profileId = user?.profile?.id;
      if (!companyId || !profileId) {
        return { created: 0, skipped: 0, archived: 0 };
      }

      const seeds = buildReviewTaskSeeds(dashboard);

      const { data: existingTasks, error: existingError } = await supabase
        .from("tasks")
        .select("id,metadata,status,created_at")
        .eq("company_id", companyId)
        .eq("category", SYSTEM_AUDIT_REVIEW_TASK_CATEGORY)
        .in("status", OPEN_REVIEW_TASK_STATUSES)
        .order("created_at", { ascending: false });
      if (existingError) throw existingError;

      const currentKeys = new Set(seeds.map((seed) => seed.key));
      const existingKeys = new Set<string>();
      const staleTaskIds: string[] = [];

      for (const task of existingTasks || []) {
        const metadata = task.metadata as Record<string, unknown> | null;
        const key = canonicalReviewTaskKeyFromMetadata(metadata);
        if (!key || !currentKeys.has(key) || existingKeys.has(key)) {
          staleTaskIds.push(task.id);
          continue;
        }
        existingKeys.add(key);
      }

      if (staleTaskIds.length > 0) {
        const { error: archiveError } = await supabase
          .from("tasks")
          .update({ status: "cancelled" })
          .eq("company_id", companyId)
          .in("id", staleTaskIds);
        if (archiveError) throw archiveError;

        const { error: archiveLogError } = await supabase
          .from("task_activity_log")
          .insert(
            staleTaskIds.map((taskId) => ({
              task_id: taskId,
              user_id: profileId,
              action: "status_changed",
              description:
                "أغلق وكيل تدقيق النظام هذه المهمة لأنها قديمة أو مكررة ولا تمثل قرارًا حاليًا.",
              new_value: {
                status: "cancelled",
                reason: "system_audit_review_reconciled",
                runId: dashboard.latestRun?.id || null,
              },
            }))
          );
        if (archiveLogError) {
          console.warn(
            "[system-audit-review-tasks] archive activity log unavailable",
            archiveLogError.message
          );
        }
      }

      const newSeeds = seeds.filter((seed) => !existingKeys.has(seed.key));
      if (newSeeds.length === 0) {
        return {
          created: 0,
          skipped: seeds.length,
          archived: staleTaskIds.length,
        };
      }

      const now = new Date();
      const dueDate = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: insertedTasks, error: insertError } = await supabase
        .from("tasks")
        .insert(
          newSeeds.map((seed) => ({
            company_id: companyId,
            created_by: profileId,
            assigned_to: profileId,
            title: seed.title,
            description: seed.description,
            status: "pending",
            priority: seed.priority,
            due_date: dueDate,
            category: SYSTEM_AUDIT_REVIEW_TASK_CATEGORY,
            tags: ["system-audit", "agent-review", "human-decision"],
            metadata: {
              ...seed.metadata,
              systemAuditTaskKey: seed.key,
              source: "system_audit_agent",
              syncedAt: now.toISOString(),
            },
          }))
        )
        .select("id,title");
      if (insertError) throw insertError;

      const activityRows = (insertedTasks || []).map((task) => ({
        task_id: task.id,
        user_id: profileId,
        action: "created",
        description: `تم إنشاء المهمة تلقائيًا من وكيل تدقيق النظام: ${task.title}`,
      }));

      if (activityRows.length > 0) {
        const { error: activityError } = await supabase
          .from("task_activity_log")
          .insert(activityRows);
        if (activityError)
          console.error(
            "[system-audit-review-tasks] activity log failed",
            activityError
          );
      }

      return {
        created: insertedTasks?.length || 0,
        skipped: seeds.length - newSeeds.length,
        archived: staleTaskIds.length,
      };
    },
    onSuccess: (result) => {
      if (result.created > 0 || result.archived > 0) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task-statistics"] });
        if (result.created > 0) {
          toast.success(
            `تم إدراج ${result.created} مهمة تحتاج قرارًا بشريًا في مهامك`
          );
        }
      }
    },
    onError: (error) => {
      const details = error as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };
      console.error(
        "[system-audit-review-tasks] sync failed",
        JSON.stringify({
          message: details.message || String(error),
          code: details.code || null,
          details: details.details || null,
          hint: details.hint || null,
        })
      );
    },
  });
}

function buildReviewTaskSeeds(
  dashboard: SystemAuditDashboardData
): ReviewTaskSeed[] {
  if (dashboard.overview.pendingReview <= 0) return [];

  const findingSeeds = (dashboard.reviewFindings || []).map(
    buildFindingTaskSeed
  );
  const seeds =
    findingSeeds.length > 0
      ? findingSeeds
      : buildAggregateReviewSeeds(dashboard);

  const uniqueSeeds = new Map<string, ReviewTaskSeed>();
  for (const seed of seeds) uniqueSeeds.set(seed.key, seed);
  return [...uniqueSeeds.values()];
}

function buildFindingTaskSeed(
  finding: SystemAuditReviewFindingSummary
): ReviewTaskSeed {
  const typeLabel =
    reviewTypeLabels[finding.code] || finding.title || finding.code;
  const domainLabel = domainLabels[finding.domain] || finding.domain;
  const evidence = formatEvidenceSummary(finding.evidence);
  const priority = priorityFromSeverity(finding.severity);

  return {
    key: findingReviewTaskKey(
      finding.code,
      finding.entityType,
      finding.entityId
    ),
    title: `قرار بشري مطلوب: ${typeLabel}`,
    priority,
    description: [
      `القسم: ${domainLabel}`,
      `نوع الملاحظة: ${finding.code}`,
      `الخطورة: ${severityLabels[finding.severity] || finding.severity}`,
      `السجل: ${finding.entityType} / ${finding.entityId}`,
      `ثقة الوكيل: ${Math.round(Number(finding.confidence || 0) * 100)}%`,
      "",
      "تفاصيل الوكيل:",
      finding.details || finding.title,
      evidence ? ["", "الدليل المختصر:", evidence].join("\n") : "",
      "",
      "الإجراء المطلوب: راجع السجل واتخذ القرار المناسب، ثم أغلق المهمة أو أضف نتيجة المعالجة في التعليقات.",
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      systemAgentFindingId: finding.id,
      runId: finding.runId,
      domain: finding.domain,
      code: finding.code,
      severity: finding.severity,
      entityType: finding.entityType,
      entityId: finding.entityId,
      evidence: finding.evidence,
      repairCommand: finding.repairCommand,
      aiDecision: finding.aiDecision,
    },
  };
}

function buildAggregateReviewSeeds(
  dashboard: SystemAuditDashboardData
): ReviewTaskSeed[] {
  if (dashboard.topReviewTypes.length === 0) {
    return [
      {
        key: "pending-review:aggregate",
        title: "مراجعة قرارات وكيل النظام",
        priority: "high",
        description: `يوجد ${dashboard.overview.pendingReview} عنصرًا يحتاج قرارًا بشريًا من وكيل تدقيق النظام. افتح تبويب إنجازات الوكيل وراجع العناصر قبل اتخاذ أي إجراء يدوي.`,
        metadata: {
          runId: dashboard.latestRun?.id || null,
          pendingReview: dashboard.overview.pendingReview,
          aggregate: true,
        },
      },
    ];
  }

  return dashboard.topReviewTypes.map((item) => {
    const typeLabel = reviewTypeLabels[item.code] || item.code;
    const domainLabel = domainLabels[item.domain] || item.domain;
    return {
      key: `review-type:${item.domain}:${item.code}`,
      title: `مراجعة ${item.count} عنصر: ${typeLabel}`,
      priority: "high",
      description: [
        `وجد وكيل النظام ${item.count} عنصرًا في قسم ${domainLabel} يحتاج قرارًا بشريًا.`,
        `نوع الملاحظة: ${item.code}`,
        "",
        "الإجراء المطلوب: راجع هذا النوع من الملاحظات في تبويب إنجازات الوكيل، وحدد قرار المعالجة أو التصعيد ثم أغلق المهمة.",
      ].join("\n"),
      metadata: {
        runId: dashboard.latestRun?.id || null,
        domain: item.domain,
        code: item.code,
        count: item.count,
        aggregate: true,
      },
    };
  });
}

function findingReviewTaskKey(
  code: string,
  entityType: string,
  entityId: string
): string {
  return `finding:${code}:${entityType}:${entityId}`;
}

function canonicalReviewTaskKeyFromMetadata(
  metadata: Record<string, unknown> | null
): string | null {
  if (!metadata) return null;

  if (
    typeof metadata.code === "string" &&
    typeof metadata.entityType === "string" &&
    typeof metadata.entityId === "string"
  ) {
    return findingReviewTaskKey(
      metadata.code,
      metadata.entityType,
      metadata.entityId
    );
  }

  if (
    metadata.aggregate === true &&
    typeof metadata.domain === "string" &&
    typeof metadata.code === "string"
  ) {
    return `review-type:${metadata.domain}:${metadata.code}`;
  }

  if (metadata.aggregate === true) return "pending-review:aggregate";

  return typeof metadata.systemAuditTaskKey === "string"
    ? metadata.systemAuditTaskKey
    : null;
}

function priorityFromSeverity(
  severity: SystemAuditReviewFindingSummary["severity"]
): ReviewTaskSeed["priority"] {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  return "medium";
}

function formatEvidenceSummary(
  evidence: Record<string, unknown> | null | undefined
): string {
  const entries = Object.entries(evidence || {}).slice(0, 8);
  return entries
    .map(([key, value]) => `${key}: ${formatEvidenceValue(value)}`)
    .join("\n");
}

function formatEvidenceValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).slice(0, 140);
  }
  try {
    return JSON.stringify(value).slice(0, 140);
  } catch {
    return String(value).slice(0, 140);
  }
}
