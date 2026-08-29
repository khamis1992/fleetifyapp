import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  SYSTEM_AUDIT_DOMAINS,
  isSystemAuditDomain,
  type SystemAuditDomain,
  type SystemAuditMode,
} from "../_shared/system-audit/types.ts";
import {
  authorizeSystemAgent,
  clampInteger,
  getErrorMessage,
  getSystemAuditErrorStatus,
  invokeSystemWorker,
  readRequestJson,
  scheduleBackground,
  systemAuditCorsHeaders,
  systemAuditJson,
} from "../_shared/system-audit/runtime.ts";
import {
  type AgentInvocationContext,
  finishAgentExecution,
} from "../_shared/agent.ts";

type OrchestratorRequest = {
  mode?: SystemAuditMode;
  dryRun?: boolean;
  companyId?: string;
  domains?: SystemAuditDomain[];
  batchSize?: number;
  maxCompanies?: number;
  triggerSource?: "manual" | "cron" | "api";
  idempotencyKey?: string;
  includeAiTriage?: boolean;
  maxBatchesPerJob?: number;
  resumeStale?: boolean;
  resumeOnly?: boolean;
  waitForDispatch?: boolean;
};

const ORCHESTRATOR_VERSION = "2026-08-27.32";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: systemAuditCorsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  let invocation: AgentInvocationContext | null = null;
  let executionSucceeded = false;

  try {

    if (req.method === "GET") {
      await authorizeSystemAgent(req);
      return await getRunStatus(req, supabase);
    }
    if (req.method !== "POST") {
      return systemAuditJson(
        {
          ok: false,
          error: "Method not allowed",
          orchestratorVersion: ORCHESTRATOR_VERSION,
        },
        405
      );
    }

    const body = await readRequestJson<OrchestratorRequest>(req);
    if (!body.companyId) {
      return systemAuditJson({ ok: false, error: "companyId is required" }, 400);
    }
    invocation = await authorizeSystemAgent(req, body.companyId);
    const mode: SystemAuditMode =
      body.mode || (body.dryRun === false ? "apply" : "dry_run");
    if (!(["dry_run", "apply"] as string[]).includes(mode)) {
      return systemAuditJson({ ok: false, error: "Unsupported mode" }, 400);
    }

    const domains = [
      ...new Set(body.domains?.length ? body.domains : SYSTEM_AUDIT_DOMAINS),
    ];
    if (domains.some((domain) => !isSystemAuditDomain(domain))) {
      return systemAuditJson({ ok: false, error: "Unsupported domain" }, 400);
    }

    const triggerSource = body.triggerSource || "manual";
    const idempotencyKey =
      body.idempotencyKey ||
      (triggerSource === "cron"
        ? `system-audit:${new Date().toISOString().slice(0, 10)}:${
            body.companyId || "all"
          }:${mode}:${domains.join(",")}`
        : null);
    const settings = {
      includeAiTriage: body.includeAiTriage !== false,
      maxBatches: clampInteger(body.maxBatchesPerJob, 0, 10_000, 0),
    };

    if (body.companyId) {
      const blockedResponse = await getBlockedCompanyResponse(
        supabase,
        body.companyId
      );
      if (blockedResponse) return blockedResponse;
    }

    if (body.resumeOnly) {
      if (!idempotencyKey) {
        return systemAuditJson(
          { ok: false, error: "resumeOnly requires an idempotency key" },
          400
        );
      }
      const { data: existingRuns, error: existingRunError } = await supabase
        .from("system_agent_runs")
        .select("id,mode,status")
        .eq("idempotency_key", idempotencyKey)
        .limit(1);
      if (existingRunError) throw existingRunError;
      const existingRun = existingRuns?.[0];
      if (!existingRun) {
        executionSucceeded = true;
        return systemAuditJson({
          ok: true,
          resumeOnly: true,
          existingRun: false,
          jobsDispatched: 0,
          status: "not_started",
          orchestratorVersion: ORCHESTRATOR_VERSION,
        });
      }

      const jobIds = await loadDispatchableJobs(
        supabase,
        String(existingRun.id),
        body.resumeStale !== false
      );
      const dispatch = dispatchJobs(jobIds);
      if (body.waitForDispatch) await dispatch;
      else scheduleBackground(dispatch);
      executionSucceeded = true;
      return systemAuditJson(
        {
          ok: true,
          runId: existingRun.id,
          mode: existingRun.mode,
          domains,
          jobsCreated: 0,
          jobsDispatched: jobIds.length,
          existingRun: true,
          resumeOnly: true,
          status: existingRun.status,
          orchestratorVersion: ORCHESTRATOR_VERSION,
        },
        202
      );
    }

    const { data, error } = await supabase.rpc("system_agent_create_run", {
      p_mode: mode,
      p_domains: domains,
      p_company_id: body.companyId || null,
      p_batch_size: clampInteger(body.batchSize, 10, 500, 100),
      p_max_companies: clampInteger(body.maxCompanies, 1, 100, 20),
      p_trigger_source: triggerSource,
      p_idempotency_key: idempotencyKey,
      p_settings: settings,
    });
    if (error) throw error;

    const runId = String(data?.run_id || "");
    if (!runId) throw new Error("Run creation did not return a run ID");

    const jobIds = await loadDispatchableJobs(
      supabase,
      runId,
      body.resumeStale !== false
    );
    const dispatch = dispatchJobs(jobIds);
    if (body.waitForDispatch) await dispatch;
    else scheduleBackground(dispatch);
    executionSucceeded = true;

    return systemAuditJson(
      {
        ok: true,
        runId,
        mode,
        domains,
        jobsCreated: Number(data?.jobs || 0),
        jobsDispatched: jobIds.length,
        existingRun: Boolean(data?.existing),
        status: "running",
        orchestratorVersion: ORCHESTRATOR_VERSION,
      },
      202
    );
  } catch (error) {
    return systemAuditJson(
      {
        ok: false,
        error: getErrorMessage(error),
        orchestratorVersion: ORCHESTRATOR_VERSION,
      },
      getSystemAuditErrorStatus(error)
    );
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabase,
          invocation,
          executionSucceeded,
          { phase: "orchestrator_dispatch", completed: executionSucceeded },
          executionSucceeded ? null : "SYSTEM_AUDIT_ORCHESTRATOR_FAILURE",
        );
      } catch (finishError) {
        console.error("Could not close system audit orchestrator invocation", finishError);
      }
    }
  }
});

async function getBlockedCompanyResponse(
  supabase: SupabaseClient,
  companyId: string
): Promise<Response | null> {
  const { data, error } = await supabase.rpc(
    "system_agent_get_company_control_v1",
    { p_company_id: companyId }
  );
  if (error) throw error;

  const control = (data || {}) as Record<string, unknown>;
  const blocked =
    control.enabled === false ||
    control.paused === true ||
    control.killSwitch === true;
  if (!blocked) return null;

  return systemAuditJson(
    {
      ok: false,
      error: "System audit agent is disabled or paused for this company",
      control,
      orchestratorVersion: ORCHESTRATOR_VERSION,
    },
    423
  );
}

async function loadDispatchableJobs(
  supabase: SupabaseClient,
  runId: string,
  includeStale: boolean
): Promise<string[]> {
  const ids = new Set<string>();
  const { data: runJobs, error: runError } = await supabase
    .from("system_agent_jobs")
    .select("id")
    .eq("run_id", runId)
    .in("status", ["queued", "retry"])
    .limit(700);
  if (runError) throw runError;
  for (const job of runJobs || []) ids.add(job.id);

  if (includeStale) {
    const now = new Date().toISOString();
    const [
      { data: retryJobs, error: retryError },
      { data: expiredJobs, error: expiredError },
    ] = await Promise.all([
      supabase
        .from("system_agent_jobs")
        .select("id")
        .eq("run_id", runId)
        .in("status", ["queued", "retry"])
        .lte("next_attempt_at", now)
        .limit(100),
      supabase
        .from("system_agent_jobs")
        .select("id")
        .eq("run_id", runId)
        .eq("status", "running")
        .lt("lease_expires_at", now)
        .limit(100),
    ]);
    if (retryError) throw retryError;
    if (expiredError) throw expiredError;
    for (const job of [...(retryJobs || []), ...(expiredJobs || [])])
      ids.add(job.id);
  }
  return [...ids];
}

async function dispatchJobs(jobIds: string[]): Promise<void> {
  for (let index = 0; index < jobIds.length; index += 3) {
    await Promise.allSettled(
      jobIds.slice(index, index + 3).map((jobId) => invokeSystemWorker(jobId))
    );
  }
}

async function getRunStatus(
  req: Request,
  supabase: SupabaseClient
): Promise<Response> {
  const requestedRunId = new URL(req.url).searchParams.get("runId");
  let runQuery = supabase
    .from("system_agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  if (requestedRunId) runQuery = runQuery.eq("id", requestedRunId);
  const { data: runs, error: runError } = await runQuery;
  if (runError) throw runError;
  const run = runs?.[0];
  if (!run) return systemAuditJson({ ok: false, error: "Run not found" }, 404);

  const [{ data: jobs, error: jobsError }, findings] = await Promise.all([
    supabase
      .from("system_agent_jobs")
      .select(
        "id,company_id,domain,status,processed_batches,attempts,stats,last_error,updated_at"
      )
      .eq("run_id", run.id)
      .order("priority"),
    loadRunFindings(supabase, run.id),
  ]);
  if (jobsError) throw jobsError;

  return systemAuditJson({
    ok: true,
    run,
    jobs: jobs || [],
    findingTotals: summarizeFindings(findings),
    orchestratorVersion: ORCHESTRATOR_VERSION,
  });
}

async function loadRunFindings(
  supabase: SupabaseClient,
  runId: string
): Promise<Array<Record<string, string>>> {
  const findings: Array<Record<string, string>> = [];
  const pageSize = 1_000;
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await supabase
      .from("system_agent_findings")
      .select("domain,severity,status,code")
      .eq("run_id", runId)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    findings.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return findings;
}

function summarizeFindings(findings: Array<Record<string, string>>) {
  const totals: Record<string, number> = { total: findings.length };
  for (const finding of findings) {
    totals[`status:${finding.status}`] =
      (totals[`status:${finding.status}`] || 0) + 1;
    totals[`domain:${finding.domain}`] =
      (totals[`domain:${finding.domain}`] || 0) + 1;
    totals[`severity:${finding.severity}`] =
      (totals[`severity:${finding.severity}`] || 0) + 1;
  }
  return totals;
}
