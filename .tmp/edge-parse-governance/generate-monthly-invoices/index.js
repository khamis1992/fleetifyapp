// supabase/functions/generate-monthly-invoices/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// supabase/functions/_shared/invoice-month.ts
var QATAR_TIME_ZONE = "Asia/Qatar";
var getQatarYearMonth = (now) => {
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("now must be a valid date");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: QATAR_TIME_ZONE,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new RangeError("could not resolve the Qatar calendar month");
  }
  return { year, month };
};
var formatMonth = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
function getDefaultScheduledInvoiceMonth(now = /* @__PURE__ */ new Date()) {
  const { year, month } = getQatarYearMonth(now);
  return month === 12 ? formatMonth(year + 1, 1) : formatMonth(year, month + 1);
}

// supabase/functions/generate-monthly-invoices/invoice-month.ts
var MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/;
function normalizeInvoiceMonth(value) {
  const match = value.match(MONTH_PATTERN);
  if (!match) throw new RangeError("targetMonth must use YYYY-MM format");
  return `${match[1]}-${match[2]}`;
}
function getInvoiceMonthBounds(invoiceMonth) {
  const normalized = normalizeInvoiceMonth(invoiceMonth);
  const [year, month] = normalized.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1e3);
  return {
    monthStart: `${normalized}-01`,
    monthEnd: `${monthEnd.getUTCFullYear()}-${String(monthEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(monthEnd.getUTCDate()).padStart(2, "0")}`
  };
}

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

// supabase/functions/generate-monthly-invoices/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret"
};
var DEFAULT_BATCH_SIZE = 100;
var MAX_BATCH_SIZE = 200;
var HttpError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }
  const supabaseClient = createServiceClient();
  let invocation = null;
  let executionFailed = false;
  let executionSummary = {};
  try {
    const body = await readJson(req);
    if (typeof body.companyId !== "string" || !body.companyId) {
      throw new HttpError("companyId is required", 400);
    }
    invocation = await authorizeScheduledAgent(
      req,
      "generate-monthly-invoices",
      body.companyId
    );
    const invoiceMonth = normalizeInvoiceMonth(
      body.targetMonth || getDefaultScheduledInvoiceMonth()
    );
    const { monthStart } = getInvoiceMonthBounds(invoiceMonth);
    const batchSize = parseBatchSize(body.batchSize);
    const afterContractId = parseCursor(body.afterContractId, "afterContractId");
    const contractBatch = await loadEligibleContracts(
      supabaseClient,
      monthStart,
      body.companyId,
      afterContractId,
      batchSize
    );
    const contracts = contractBatch.contracts;
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      notificationFailed: 0,
      errors: []
    };
    console.log(
      `Generating canonical invoices for ${invoiceMonth}; ${contracts.length} contracts in this bounded batch`
    );
    for (const contract of contracts) {
      try {
        const { data: rawOutcome, error: generationError } = await supabaseClient.rpc(
          "generate_invoice_for_contract_month_outcome",
          {
            p_contract_id: contract.id,
            p_invoice_month: monthStart
          }
        );
        if (generationError) {
          throw generationError;
        }
        const outcome = rawOutcome && typeof rawOutcome === "object" ? rawOutcome : null;
        const invoiceId = typeof outcome?.invoice_id === "string" ? outcome.invoice_id : "";
        if (!invoiceId) {
          throw new Error("Atomic invoice generator returned no invoice id");
        }
        if (outcome?.created !== true) {
          results.skipped += 1;
          continue;
        }
        results.success += 1;
        if (body.sendNotifications !== false) {
          const notificationSent = await notifyCustomer(
            supabaseClient,
            contract,
            invoiceId
          );
          if (!notificationSent) results.notificationFailed += 1;
        }
      } catch (error) {
        const message = errorMessage(error);
        console.error(`Invoice generation failed for ${contract.contract_number}:`, error);
        results.failed += 1;
        results.errors.push(`${contract.contract_number}: ${message}`);
      }
    }
    executionSummary = {
      targetMonth: invoiceMonth,
      contractsProcessed: contracts.length,
      created: results.success,
      failed: results.failed,
      skipped: results.skipped
    };
    return jsonResponse({
      success: results.failed === 0,
      targetMonth: invoiceMonth,
      contractsProcessed: contracts.length,
      results,
      continuation: {
        hasMore: contractBatch.hasMore,
        afterContractId: contractBatch.nextAfterContractId,
        batchSize
      }
    });
  } catch (error) {
    executionFailed = true;
    console.error("generate-monthly-invoices failed:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabaseClient,
          invocation,
          !executionFailed,
          executionSummary,
          executionFailed ? "INVOICE_GENERATION_FAILURE" : null
        );
      } catch (finishError) {
        console.error("Could not close invoice generator execution", finishError);
      }
    }
  }
});
async function readJson(req) {
  const rawBody = await req.text();
  if (!rawBody.trim()) return {};
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError("Request body must be a JSON object", 400);
    }
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Invalid JSON request body", 400);
  }
}
async function loadEligibleContracts(supabase, monthStart, companyId, afterContractId = null, batchSize = DEFAULT_BATCH_SIZE) {
  let query = supabase.from("contracts").select("id, company_id, customer_id, contract_number").in("status", ["active", "under_legal_procedure"]).lt("start_date", monthStart).not("end_date", "is", null).gte("end_date", monthStart).order("id", { ascending: true }).limit(batchSize + 1);
  if (companyId) query = query.eq("company_id", companyId);
  if (afterContractId) query = query.gt("id", afterContractId);
  const { data, error } = await query;
  if (error) throw error;
  const page = data || [];
  const hasMore = page.length > batchSize;
  const contracts = page.slice(0, batchSize);
  const nextAfterContractId = hasMore ? contracts[contracts.length - 1]?.id || null : null;
  if (hasMore && !nextAfterContractId) {
    throw new Error("Contract generation continuation cursor did not advance");
  }
  return { contracts, hasMore, nextAfterContractId };
}
function parseBatchSize(value) {
  if (value === void 0) return DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > MAX_BATCH_SIZE) {
    throw new HttpError(
      `batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`,
      400
    );
  }
  return Number(value);
}
function parseCursor(value, field) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 128) {
    throw new HttpError(`${field} must be a valid cursor`, 400);
  }
  return value;
}
async function notifyCustomer(supabase, contract, invoiceId) {
  const [{ data: invoice, error: invoiceError }, { data: customer, error: customerError }] = await Promise.all([
    supabase.from("invoices").select("invoice_number, total_amount, due_date").eq("id", invoiceId).eq("company_id", contract.company_id).single(),
    supabase.from("customers").select("first_name, last_name, phone").eq("id", contract.customer_id).eq("company_id", contract.company_id).single()
  ]);
  if (invoiceError || customerError || !customer?.phone || !invoice) {
    if (invoiceError || customerError) {
      console.warn("Invoice notification lookup failed", invoiceError || customerError);
    }
    return !invoiceError && !customerError;
  }
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const message = [
    `\u0645\u0631\u062D\u0628\u0627\u064B ${customerName}\u060C`,
    "",
    "\u062A\u0645 \u0625\u0635\u062F\u0627\u0631 \u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0634\u0647\u0631\u064A\u0629:",
    `\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: ${invoice.invoice_number}`,
    `\u0627\u0644\u0645\u0628\u0644\u063A: ${invoice.total_amount} \u0631\u064A\u0627\u0644`,
    `\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642: ${invoice.due_date || "-"}`
  ].join("\n");
  const { data, error } = await supabase.functions.invoke("send-whatsapp-reminders", {
    body: { test: true, phone: customer.phone, message }
  });
  if (error || data?.success !== true) {
    console.warn(
      `Invoice ${invoice.invoice_number} was created but notification failed`,
      error || data?.error || "Provider did not confirm delivery"
    );
    return false;
  }
  return true;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
