// supabase/functions/system-audit-orchestrator/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient as createClient2
} from "https://esm.sh/@supabase/supabase-js@2.57.4";

// supabase/functions/_shared/system-audit/types.ts
var SYSTEM_AUDIT_DOMAINS = [
  "contracts",
  "accounting",
  "fleet",
  "customers",
  "inventory",
  "legal",
  "employees"
];
function isSystemAuditDomain(value) {
  return SYSTEM_AUDIT_DOMAINS.includes(value);
}

// supabase/functions/_shared/longcat.ts
var LONGCAT_CHAT_COMPLETIONS_URL = Deno.env.get("LONGCAT_CHAT_COMPLETIONS_URL") || "https://api.longcat.chat/openai/v1/chat/completions";
var LONGCAT_MODEL = Deno.env.get("LONGCAT_MODEL") || "LongCat-2.0";

// supabase/functions/_shared/agent.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}
async function authorizeAgent(req, companyId, requireCompanyScope = false) {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { userId: null, serviceRole: true };
  }
  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) {
      if (!companyId) {
        if (requireCompanyScope) throw new Error("Unauthorized");
        return { userId: data.user.id, serviceRole: false };
      }
      const admin = createServiceClient();
      const [{ data: profile }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("company_id,is_active").eq("user_id", data.user.id).maybeSingle(),
        admin.from("user_roles").select("role,company_id").eq("user_id", data.user.id)
      ]);
      const isSuperAdmin = (roles || []).some(
        (role) => role.role === "super_admin"
      );
      const isActiveCompanyMember = profile?.is_active === true && profile.company_id === companyId;
      if (isSuperAdmin || isActiveCompanyMember) {
        return { userId: data.user.id, serviceRole: false };
      }
    }
  }
  throw new Error("Unauthorized");
}
async function authorizeGovernedAgent(req, agentId, companyId) {
  const caller = await authorizeAgent(req, companyId, true);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("begin_trusted_agent_invocation_v1", {
    p_agent_id: agentId,
    p_company_id: companyId,
    p_request_id: requestId,
    p_actor_id: caller.userId
  });
  if (error) {
    console.error("Trusted agent policy verification failed", {
      agentId,
      code: error.code || null
    });
    throw new Error("Agent policy verification unavailable");
  }
  if (data !== true) throw new Error("Agent disabled or busy");
  return {
    agentId,
    companyId,
    requestId,
    machine: false,
    governed: true
  };
}
async function authorizeScheduledAgent(req, agentId, companyId) {
  const suppliedAgentId = req.headers.get("x-agent-id") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";
  if (suppliedAgentId || suppliedSecret) {
    if (suppliedAgentId !== agentId || !suppliedSecret) {
      throw new Error("Unauthorized");
    }
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const admin = createServiceClient();
    const { data, error } = await admin.rpc(
      "verify_scheduled_agent_invocation_v2",
      {
        p_agent_id: agentId,
        p_company_id: companyId || null,
        p_supplied_secret: suppliedSecret,
        p_request_id: requestId
      }
    );
    if (error) {
      console.error("Scheduled agent identity verification failed", {
        agentId,
        code: error.code || null
      });
      throw new Error("Agent identity verification unavailable");
    }
    if (data === true) {
      return {
        agentId,
        companyId: companyId || null,
        requestId,
        machine: true,
        governed: true
      };
    }
    throw new Error("Unauthorized");
  }
  if (!companyId) throw new Error("Unauthorized");
  return authorizeGovernedAgent(req, agentId, companyId);
}
async function finishAgentExecution(supabase, invocation, success, summary, failureCode) {
  if (!invocation.governed || !invocation.companyId) return;
  const { error } = await supabase.rpc("finish_agent_execution_v1", {
    p_company_id: invocation.companyId,
    p_agent_id: invocation.agentId,
    p_request_id: invocation.requestId,
    p_success: success,
    p_summary: summary,
    p_failure_code: failureCode || null
  });
  if (error) throw error;
}

// supabase/functions/_shared/system-audit/runtime.ts
var SYSTEM_AUDIT_WORKER_VERSION = "2026-08-27.55";
var SYSTEM_AUDIT_WORKER_FUNCTION = "system-audit-worker-v12";
var SystemAuditRequestError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "SystemAuditRequestError";
  }
};
var systemAuditCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret"
};
async function authorizeSystemAgent(req, companyId) {
  if (req.headers.get("x-agent-id") || req.headers.get("x-agent-secret")) {
    if (!companyId) {
      throw new SystemAuditRequestError("companyId is required", 400);
    }
    try {
      return await authorizeScheduledAgent(
        req,
        "system-audit-orchestrator",
        companyId
      );
    } catch {
      throw new SystemAuditRequestError(
        "Unauthorized system audit agent request",
        401
      );
    }
  }
  const configuredSecret = Deno.env.get("AUDIT_AGENT_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";
  if (configuredSecret && suppliedSecret === configuredSecret) return null;
  if (serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`) return null;
  throw new SystemAuditRequestError(
    "Unauthorized system audit agent request",
    401
  );
}
async function readRequestJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
function systemAuditJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...systemAuditCorsHeaders, "Content-Type": "application/json" }
  });
}
function clampInteger(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown system audit error";
  }
}
function getSystemAuditErrorStatus(error) {
  return error instanceof SystemAuditRequestError ? error.status : 500;
}
function scheduleBackground(promise) {
  const edgeRuntime = globalThis.EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(promise);
}
async function invokeSystemWorker(jobId) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error("Missing Supabase worker invocation settings");
  const versionQuery = `v=${encodeURIComponent(SYSTEM_AUDIT_WORKER_VERSION)}`;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const workerUrls = [
    `${supabaseUrl}/functions/v1/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`,
    `https://${projectRef}.functions.supabase.co/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`
  ];
  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jobId })
  };
  let lastError = "Unknown worker invocation failure";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let response;
    try {
      response = await fetch(
        workerUrls[attempt % workerUrls.length],
        requestOptions
      );
    } catch (error) {
      lastError = `Worker ${jobId} request failed: ${getErrorMessage(error)}`;
      if (attempt === 11) break;
      await new Promise(
        (resolve) => setTimeout(resolve, Math.min(1500, 200 * 2 ** attempt))
      );
      continue;
    }
    if (response.ok) return;
    lastError = `Worker ${jobId} returned ${response.status}: ${(await response.text()).slice(0, 500)}`;
    const retryable = response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 11) break;
    await new Promise(
      (resolve) => setTimeout(resolve, Math.min(1500, 200 * 2 ** attempt))
    );
  }
  throw new Error(lastError);
}

// supabase/functions/system-audit-orchestrator/index.ts
var ORCHESTRATOR_VERSION = "2026-08-27.32";
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: systemAuditCorsHeaders });
  const supabase = createClient2(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  let invocation = null;
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
          orchestratorVersion: ORCHESTRATOR_VERSION
        },
        405
      );
    }
    const body = await readRequestJson(req);
    if (!body.companyId) {
      return systemAuditJson({ ok: false, error: "companyId is required" }, 400);
    }
    invocation = await authorizeSystemAgent(req, body.companyId);
    const mode = body.mode || (body.dryRun === false ? "apply" : "dry_run");
    if (!["dry_run", "apply"].includes(mode)) {
      return systemAuditJson({ ok: false, error: "Unsupported mode" }, 400);
    }
    const domains = [
      ...new Set(body.domains?.length ? body.domains : SYSTEM_AUDIT_DOMAINS)
    ];
    if (domains.some((domain) => !isSystemAuditDomain(domain))) {
      return systemAuditJson({ ok: false, error: "Unsupported domain" }, 400);
    }
    const triggerSource = body.triggerSource || "manual";
    const idempotencyKey = body.idempotencyKey || (triggerSource === "cron" ? `system-audit:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}:${body.companyId || "all"}:${mode}:${domains.join(",")}` : null);
    const settings = {
      includeAiTriage: body.includeAiTriage !== false,
      maxBatches: clampInteger(body.maxBatchesPerJob, 0, 1e4, 0)
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
      const { data: existingRuns, error: existingRunError } = await supabase.from("system_agent_runs").select("id,mode,status").eq("idempotency_key", idempotencyKey).limit(1);
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
          orchestratorVersion: ORCHESTRATOR_VERSION
        });
      }
      const jobIds2 = await loadDispatchableJobs(
        supabase,
        String(existingRun.id),
        body.resumeStale !== false
      );
      const dispatch2 = dispatchJobs(jobIds2);
      if (body.waitForDispatch) await dispatch2;
      else scheduleBackground(dispatch2);
      executionSucceeded = true;
      return systemAuditJson(
        {
          ok: true,
          runId: existingRun.id,
          mode: existingRun.mode,
          domains,
          jobsCreated: 0,
          jobsDispatched: jobIds2.length,
          existingRun: true,
          resumeOnly: true,
          status: existingRun.status,
          orchestratorVersion: ORCHESTRATOR_VERSION
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
      p_settings: settings
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
        orchestratorVersion: ORCHESTRATOR_VERSION
      },
      202
    );
  } catch (error) {
    return systemAuditJson(
      {
        ok: false,
        error: getErrorMessage(error),
        orchestratorVersion: ORCHESTRATOR_VERSION
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
          executionSucceeded ? null : "SYSTEM_AUDIT_ORCHESTRATOR_FAILURE"
        );
      } catch (finishError) {
        console.error("Could not close system audit orchestrator invocation", finishError);
      }
    }
  }
});
async function getBlockedCompanyResponse(supabase, companyId) {
  const { data, error } = await supabase.rpc(
    "system_agent_get_company_control_v1",
    { p_company_id: companyId }
  );
  if (error) throw error;
  const control = data || {};
  const blocked = control.enabled === false || control.paused === true || control.killSwitch === true;
  if (!blocked) return null;
  return systemAuditJson(
    {
      ok: false,
      error: "System audit agent is disabled or paused for this company",
      control,
      orchestratorVersion: ORCHESTRATOR_VERSION
    },
    423
  );
}
async function loadDispatchableJobs(supabase, runId, includeStale) {
  const ids = /* @__PURE__ */ new Set();
  const { data: runJobs, error: runError } = await supabase.from("system_agent_jobs").select("id").eq("run_id", runId).in("status", ["queued", "retry"]).limit(700);
  if (runError) throw runError;
  for (const job of runJobs || []) ids.add(job.id);
  if (includeStale) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const [
      { data: retryJobs, error: retryError },
      { data: expiredJobs, error: expiredError }
    ] = await Promise.all([
      supabase.from("system_agent_jobs").select("id").eq("run_id", runId).in("status", ["queued", "retry"]).lte("next_attempt_at", now).limit(100),
      supabase.from("system_agent_jobs").select("id").eq("run_id", runId).eq("status", "running").lt("lease_expires_at", now).limit(100)
    ]);
    if (retryError) throw retryError;
    if (expiredError) throw expiredError;
    for (const job of [...retryJobs || [], ...expiredJobs || []])
      ids.add(job.id);
  }
  return [...ids];
}
async function dispatchJobs(jobIds) {
  for (let index = 0; index < jobIds.length; index += 3) {
    await Promise.allSettled(
      jobIds.slice(index, index + 3).map((jobId) => invokeSystemWorker(jobId))
    );
  }
}
async function getRunStatus(req, supabase) {
  const requestedRunId = new URL(req.url).searchParams.get("runId");
  let runQuery = supabase.from("system_agent_runs").select("*").order("created_at", { ascending: false }).limit(1);
  if (requestedRunId) runQuery = runQuery.eq("id", requestedRunId);
  const { data: runs, error: runError } = await runQuery;
  if (runError) throw runError;
  const run = runs?.[0];
  if (!run) return systemAuditJson({ ok: false, error: "Run not found" }, 404);
  const [{ data: jobs, error: jobsError }, findings] = await Promise.all([
    supabase.from("system_agent_jobs").select(
      "id,company_id,domain,status,processed_batches,attempts,stats,last_error,updated_at"
    ).eq("run_id", run.id).order("priority"),
    loadRunFindings(supabase, run.id)
  ]);
  if (jobsError) throw jobsError;
  return systemAuditJson({
    ok: true,
    run,
    jobs: jobs || [],
    findingTotals: summarizeFindings(findings),
    orchestratorVersion: ORCHESTRATOR_VERSION
  });
}
async function loadRunFindings(supabase, runId) {
  const findings = [];
  const pageSize = 1e3;
  for (let offset = 0; offset < 1e5; offset += pageSize) {
    const { data, error } = await supabase.from("system_agent_findings").select("domain,severity,status,code").eq("run_id", runId).order("id", { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    findings.push(...data || []);
    if (!data || data.length < pageSize) break;
  }
  return findings;
}
function summarizeFindings(findings) {
  const totals = { total: findings.length };
  for (const finding of findings) {
    totals[`status:${finding.status}`] = (totals[`status:${finding.status}`] || 0) + 1;
    totals[`domain:${finding.domain}`] = (totals[`domain:${finding.domain}`] || 0) + 1;
    totals[`severity:${finding.severity}`] = (totals[`severity:${finding.severity}`] || 0) + 1;
  }
  return totals;
}
