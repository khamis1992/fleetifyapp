import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const DASHBOARD_VERSION = "2026-07-12.4";
const DOMAINS = [
  "contracts",
  "accounting",
  "fleet",
  "customers",
  "inventory",
  "legal",
  "employees",
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;
type SupabaseAdminClient = ReturnType<typeof createClient>;

type AgentRun = {
  id: string;
  requested_domains: string[];
  mode: string;
  status: string;
  trigger_source: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

type AgentJob = {
  run_id: string;
  domain: string;
  status: string;
  processed_batches: number;
  attempts: number;
  stats: JsonRecord | null;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

type AgentFinding = {
  code: string;
  domain: string;
  severity: string;
  status: string;
  ai_decision: JsonRecord | null;
};

type AgentReviewFinding = AgentFinding & {
  id: string;
  run_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  details: string;
  evidence: JsonRecord | null;
  confidence: number;
  repair_command: string | null;
  created_at: string;
  updated_at: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json({ ok: false, error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Dashboard service is not configured");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ ok: false, error: "Invalid session" }, 401);

    const body = await readJson(req);
    const requestedCompanyId = typeof body.companyId === "string" ? body.companyId : null;
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      admin
        .from("profiles")
        .select("company_id,is_active")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      admin.from("user_roles").select("role,company_id").eq("user_id", authData.user.id),
    ]);
    if (profileError) throw profileError;
    if (rolesError) throw rolesError;

    const isSuperAdmin = (roles || []).some((role: { role: string }) => role.role === "super_admin");
    const profileCompanyId = profile?.company_id || null;
    const companyId = requestedCompanyId || profileCompanyId;
    if (!companyId) return json({ ok: false, error: "Company context is required" }, 400);
    if (!isSuperAdmin && (!profileCompanyId || profileCompanyId !== companyId)) {
      return json({ ok: false, error: "Company access denied" }, 403);
    }

    const { data: companyJobRefs, error: companyJobsError } = await admin
      .from("system_agent_jobs")
      .select("run_id,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(350);
    if (companyJobsError) throw companyJobsError;

    const runIds = [...new Set((companyJobRefs || []).map((job: { run_id: string }) => job.run_id))].slice(0, 60);
    if (runIds.length === 0) {
      return json(emptyDashboard(companyId));
    }

    const { data: runRows, error: runsError } = await admin
      .from("system_agent_runs")
      .select("id,requested_domains,mode,status,trigger_source,started_at,finished_at,created_at")
      .in("id", runIds)
      .order("created_at", { ascending: false });
    if (runsError) throw runsError;

    const runs = (runRows || []) as AgentRun[];
    const latestRun = runs[0];
    const latestFullRun = runs.find((run) => isFullAudit(run.requested_domains)) || latestRun;
    const historyRuns = runs.slice(0, 12);
    const historyRunIds = historyRuns.map((run) => run.id);

    const [
      mainJobsResult,
      historyJobsResult,
      findings,
      reviewFindings,
      appliedRepairsResult,
      rolledBackRepairsResult,
      recentRepairsResult,
    ] = await Promise.all([
      admin
        .from("system_agent_jobs")
        .select("run_id,domain,status,processed_batches,attempts,stats,last_error,started_at,finished_at,updated_at")
        .eq("run_id", latestFullRun.id)
        .eq("company_id", companyId)
        .order("priority"),
      admin
        .from("system_agent_jobs")
        .select("run_id,domain,status,processed_batches,attempts,stats,last_error,started_at,finished_at,updated_at")
        .eq("company_id", companyId)
        .in("run_id", historyRunIds),
      loadFindings(admin, latestFullRun.id, companyId),
      loadReviewFindings(admin, latestFullRun.id, companyId),
      admin
        .from("system_agent_repairs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "applied"),
      admin
        .from("system_agent_repairs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "rolled_back"),
      admin
        .from("system_agent_repairs")
        .select("id,run_id,domain,command,entity_table,entity_id,status,applied_at,rolled_back_at")
        .eq("company_id", companyId)
        .in("status", ["applied", "rolled_back"])
        .order("applied_at", { ascending: false })
        .limit(20),
    ]);

    if (mainJobsResult.error) throw mainJobsResult.error;
    if (historyJobsResult.error) throw historyJobsResult.error;
    if (appliedRepairsResult.error) throw appliedRepairsResult.error;
    if (rolledBackRepairsResult.error) throw rolledBackRepairsResult.error;
    if (recentRepairsResult.error) throw recentRepairsResult.error;

    const mainJobs = (mainJobsResult.data || []) as AgentJob[];
    const historyJobs = (historyJobsResult.data || []) as AgentJob[];
    const findingTotals = summarizeFindings(findings);
    const mainTotals = summarizeJobs(mainJobs);
    const latestApplyRun = runs.find((run) => run.mode === "apply") || null;

    return json({
      ok: true,
      companyId,
      generatedAt: new Date().toISOString(),
      dashboardVersion: DASHBOARD_VERSION,
      overview: {
        totalAppliedRepairs: appliedRepairsResult.count || 0,
        rolledBackRepairs: rolledBackRepairsResult.count || 0,
        latestRepairs: findingTotals.status.repaired || 0,
        verifiedNoChange: findingTotals.status.ignored || 0,
        pendingReview: (findingTotals.status.review || 0) + (findingTotals.status.detected || 0),
        automaticRemaining: (findingTotals.status.planned || 0) + (findingTotals.status.repairing || 0),
        failures: (findingTotals.status.failed || 0) + mainJobs.filter((job) => job.status === "failed").length,
        aiDecisions: findingTotals.aiDecisions,
        scanned: mainTotals.scanned,
        findings: findings.length,
      },
      latestRun: compactRun(latestFullRun, mainJobs, mainTotals, findingTotals),
      latestObservedRun: compactRun(latestRun, historyJobs.filter((job) => job.run_id === latestRun.id)),
      latestApplyRun: latestApplyRun
        ? compactRun(latestApplyRun, historyJobs.filter((job) => job.run_id === latestApplyRun.id))
        : null,
      jobs: mainJobs.map((job) => ({
        domain: job.domain,
        status: job.status,
        processedBatches: Number(job.processed_batches || 0),
        attempts: Number(job.attempts || 0),
        stats: numericStats(job.stats),
        hasError: Boolean(job.last_error),
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        updatedAt: job.updated_at,
      })),
      recentRuns: historyRuns.map((run) => {
        const jobs = historyJobs.filter((job) => job.run_id === run.id);
        return compactRun(run, jobs, summarizeJobs(jobs));
      }),
      recentRepairs: (recentRepairsResult.data || []).map((repair: Record<string, string | null>) => ({
        id: repair.id,
        runId: repair.run_id,
        domain: repair.domain,
        command: repair.command,
        entityTable: repair.entity_table,
        entityId: repair.entity_id,
        status: repair.status,
        appliedAt: repair.applied_at,
        rolledBackAt: repair.rolled_back_at,
      })),
      topReviewTypes: findingTotals.topReviewTypes,
      reviewFindings: reviewFindings.map((finding) => ({
        id: finding.id,
        runId: finding.run_id,
        domain: finding.domain,
        code: finding.code,
        severity: finding.severity,
        status: finding.status,
        entityType: finding.entity_type,
        entityId: finding.entity_id,
        title: finding.title,
        details: finding.details,
        evidence: finding.evidence || {},
        confidence: Number(finding.confidence || 0),
        repairCommand: finding.repair_command,
        aiDecision: finding.ai_decision,
        createdAt: finding.created_at,
        updatedAt: finding.updated_at,
      })),
      severityTotals: findingTotals.severity,
      schedule: {
        timezone: "Asia/Riyadh",
        dailyAuditTime: "03:30",
        recoveryWindow: "00:00-05:59 UTC",
        recoveryFrequencyMinutes: 5,
      },
    });
  } catch (error) {
    console.error("[system-audit-dashboard] failed", error);
    return json({ ok: false, error: "Unable to load the audit dashboard" }, 500);
  }
});

async function readJson(req: Request): Promise<JsonRecord> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function loadFindings(admin: SupabaseAdminClient, runId: string, companyId: string): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = [];
  const pageSize = 1_000;
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await admin
      .from("system_agent_findings")
      .select("code,domain,severity,status,ai_decision")
      .eq("run_id", runId)
      .eq("company_id", companyId)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    findings.push(...((data || []) as AgentFinding[]));
    if (!data || data.length < pageSize) break;
  }
  return findings;
}

async function loadReviewFindings(admin: SupabaseAdminClient, runId: string, companyId: string): Promise<AgentReviewFinding[]> {
  const findings: AgentReviewFinding[] = [];
  const pageSize = 1_000;
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await admin
      .from("system_agent_findings")
      .select("id,run_id,domain,code,severity,status,entity_type,entity_id,title,details,evidence,confidence,repair_command,ai_decision,created_at,updated_at")
      .eq("run_id", runId)
      .eq("company_id", companyId)
      .in("status", ["review", "detected"])
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    findings.push(...((data || []) as AgentReviewFinding[]));
    if (!data || data.length < pageSize) break;
  }
  return findings;
}

function summarizeFindings(findings: AgentFinding[]) {
  const status: Record<string, number> = {};
  const severity: Record<string, number> = {};
  const reviewCodes: Record<string, { code: string; domain: string; count: number }> = {};
  let aiDecisions = 0;

  for (const finding of findings) {
    status[finding.status] = (status[finding.status] || 0) + 1;
    severity[finding.severity] = (severity[finding.severity] || 0) + 1;
    if (finding.ai_decision) aiDecisions += 1;
    if (finding.status === "review" || finding.status === "detected") {
      const item = reviewCodes[finding.code] || { code: finding.code, domain: finding.domain, count: 0 };
      item.count += 1;
      reviewCodes[finding.code] = item;
    }
  }

  return {
    status,
    severity,
    aiDecisions,
    topReviewTypes: Object.values(reviewCodes).sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

function summarizeJobs(jobs: AgentJob[]) {
  return jobs.reduce(
    (totals, job) => {
      const stats = numericStats(job.stats);
      totals.scanned += stats.scanned || 0;
      totals.findings += stats.findings || 0;
      totals.repaired += stats.repaired || 0;
      totals.verified += stats.verified || 0;
      totals.repairFailed += stats.repairFailed || 0;
      totals.review += stats.review || 0;
      return totals;
    },
    { scanned: 0, findings: 0, repaired: 0, verified: 0, repairFailed: 0, review: 0 },
  );
}

function compactRun(
  run: AgentRun,
  jobs: AgentJob[],
  totals = summarizeJobs(jobs),
  findingTotals?: ReturnType<typeof summarizeFindings>,
) {
  return {
    id: run.id,
    mode: run.mode,
    status: companyRunStatus(jobs, run.status),
    triggerSource: run.trigger_source,
    requestedDomains: run.requested_domains || [],
    completedDomains: jobs.filter((job) => job.status === "completed").length,
    totalDomains: jobs.length || run.requested_domains?.length || 0,
    scanned: totals.scanned,
    findings: findingTotals ? Object.values(findingTotals.status).reduce((sum, count) => sum + count, 0) : totals.findings,
    repaired: findingTotals?.status.repaired || totals.repaired,
    verified: findingTotals?.status.ignored || totals.verified,
    review: findingTotals
      ? (findingTotals.status.review || 0) + (findingTotals.status.detected || 0)
      : totals.review,
    failed: (findingTotals?.status.failed || totals.repairFailed) + jobs.filter((job) => job.status === "failed").length,
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    createdAt: run.created_at,
  };
}

function numericStats(stats: JsonRecord | null): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(stats || {})) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) result[key] = numericValue;
  }
  return result;
}

function companyRunStatus(jobs: AgentJob[], fallback: string): string {
  if (jobs.some((job) => job.status === "failed")) return "failed";
  if (jobs.some((job) => ["running", "retry"].includes(job.status))) return "running";
  if (jobs.length > 0 && jobs.every((job) => job.status === "completed")) return "completed";
  if (jobs.some((job) => job.status === "completed")) return "partial";
  if (jobs.some((job) => job.status === "queued")) return "queued";
  return fallback;
}

function isFullAudit(requestedDomains: string[]): boolean {
  return DOMAINS.every((domain) => requestedDomains?.includes(domain));
}

function emptyDashboard(companyId: string) {
  return {
    ok: true,
    companyId,
    generatedAt: new Date().toISOString(),
    dashboardVersion: DASHBOARD_VERSION,
    overview: {
      totalAppliedRepairs: 0,
      rolledBackRepairs: 0,
      latestRepairs: 0,
      verifiedNoChange: 0,
      pendingReview: 0,
      automaticRemaining: 0,
      failures: 0,
      aiDecisions: 0,
      scanned: 0,
      findings: 0,
    },
    latestRun: null,
    latestObservedRun: null,
    latestApplyRun: null,
    jobs: [],
    recentRuns: [],
    recentRepairs: [],
    topReviewTypes: [],
    reviewFindings: [],
    severityTotals: {},
    schedule: {
      timezone: "Asia/Riyadh",
      dailyAuditTime: "03:30",
      recoveryWindow: "00:00-05:59 UTC",
      recoveryFrequencyMinutes: 5,
    },
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
