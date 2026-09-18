import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
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

export interface SystemAuditAgentControl {
  companyId: string;
  ownerProfileId: string | null;
  enabled: boolean;
  paused: boolean;
  killSwitch: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  version: number;
  updatedAt: string | null;
}

export interface SystemAuditOperator {
  id: string;
  displayName: string;
  position: string | null;
}

export interface SystemAuditDashboardData {
  ok: true;
  companyId: string;
  generatedAt: string;
  dashboardVersion: string;
  reviewSnapshotComplete?: boolean;
  control?: SystemAuditAgentControl;
  permissions?: {
    canManageAgent: boolean;
    canUseKillSwitch: boolean;
    canAssignOwner: boolean;
  };
  operators?: SystemAuditOperator[];
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

  return useMutation({
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    mutationFn: async (dashboard: SystemAuditDashboardData) => {
      const companyId = dashboard.companyId;
      if (!companyId) {
        return { created: 0, skipped: 0, archived: 0, refreshed: 0 };
      }
      const { data, error } = await supabase.functions.invoke(
        "system-audit-dashboard",
        { body: { companyId, action: "sync_review_tasks" } }
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "تعذر مزامنة مهام المراجعة");

      const result = data.sync || {};
      return {
        created: Number(result.created || 0),
        skipped: Number(result.current || 0) - Number(result.created || 0),
        archived: Number(result.archived || 0),
        refreshed: Number(result.refreshed || 0),
      };
    },
    onSuccess: (result) => {
      if (result.created > 0 || result.archived > 0 || result.refreshed > 0) {
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

export function useSetSystemAuditAgentControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      enabled: boolean;
      paused: boolean;
      killSwitch: boolean;
      reason?: string;
      ownerProfileId?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "system-audit-dashboard",
        { body: { ...input, action: "set_control" } }
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "تعذر تحديث تحكم الوكيل");
      return data.control as SystemAuditAgentControl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-audit-dashboard"] });
      toast.success("تم تحديث حالة وكيل التدقيق");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الوكيل");
    },
  });
}

export function useCancelSystemAuditRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      runId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "system-audit-dashboard",
        { body: { ...input, action: "cancel_run" } }
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "تعذر إلغاء تشغيل الوكيل");
      return data.cancellation as { affectedJobs: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["system-audit-dashboard"] });
      toast.success(`تم طلب إلغاء ${Number(result?.affectedJobs || 0)} مهمة تشغيل`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إلغاء تشغيل الوكيل");
    },
  });
}
