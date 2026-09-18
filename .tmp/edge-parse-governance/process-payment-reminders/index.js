// supabase/functions/process-payment-reminders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// supabase/functions/process-payment-reminders/reminder-cadence.ts
function getOverdueReminderType(daysOverdue) {
  if (!Number.isInteger(daysOverdue) || daysOverdue < 1) return null;
  if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7) {
    return `overdue_day_${daysOverdue}`;
  }
  if (daysOverdue > 7 && daysOverdue % 7 === 0) {
    return `overdue_week_${daysOverdue / 7}`;
  }
  return null;
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

// supabase/functions/process-payment-reminders/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret"
};
var ACTIVE_INVOICE_STATUSES = [
  "approved",
  "sent",
  "overdue",
  "pending",
  "unpaid"
];
var COLLECTIBLE_PAYMENT_STATUSES = [
  "unpaid",
  "partial",
  "partial_paid",
  "partially_paid"
];
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
      "payment-reminder-agent",
      body.companyId
    );
    const batchSize = parseBatchSize(body.batchSize);
    const processUpcoming = parseProcessFlag(body.processUpcoming, "processUpcoming");
    const processOverdue = parseProcessFlag(body.processOverdue, "processOverdue");
    const upcomingAfterInvoiceId = parseCursor(
      body.upcomingAfterInvoiceId,
      "upcomingAfterInvoiceId"
    );
    const overdueAfterInvoiceId = parseCursor(
      body.overdueAfterInvoiceId,
      "overdueAfterInvoiceId"
    );
    const today = getQatarDateOnly(/* @__PURE__ */ new Date());
    const threeDaysDate = addCalendarDays(today, 3);
    const results = {
      upcoming_invoices_found: 0,
      overdue_invoices_found: 0,
      reminders_sent: 0,
      overdue_notices_sent: 0,
      late_fee_candidates: 0,
      skipped_no_phone: 0,
      skipped_zero_balance: 0,
      skipped_cadence: 0,
      skipped_already_claimed: 0,
      errors: []
    };
    let upcomingBatch = emptyReminderBatch();
    if (processUpcoming) {
      try {
        upcomingBatch = await loadReminderInvoiceBatch(
          supabaseClient,
          body.companyId,
          "eq",
          threeDaysDate,
          upcomingAfterInvoiceId,
          batchSize
        );
        results.upcoming_invoices_found = upcomingBatch.invoices.length;
      } catch (error) {
        results.errors.push(`upcoming_query: ${errorMessage(error)}`);
      }
    }
    let overdueBatch = emptyReminderBatch();
    if (processOverdue) {
      try {
        overdueBatch = await loadReminderInvoiceBatch(
          supabaseClient,
          body.companyId,
          "lt",
          today,
          overdueAfterInvoiceId,
          batchSize
        );
        results.overdue_invoices_found = overdueBatch.invoices.length;
      } catch (error) {
        results.errors.push(`overdue_query: ${errorMessage(error)}`);
      }
    }
    for (const invoice of upcomingBatch.invoices) {
      const outstandingAmount = getOutstandingAmount(invoice);
      if (outstandingAmount <= 0.01) {
        results.skipped_zero_balance += 1;
        continue;
      }
      const customer = invoice.customers;
      if (!customer?.phone) {
        results.skipped_no_phone += 1;
        continue;
      }
      try {
        const customerName = formatCustomerName(customer);
        const sent = await sendClaimedReminder(
          supabaseClient,
          invoice,
          "pre_due_3d",
          today,
          customer.phone,
          [
            "\u062A\u0630\u0643\u064A\u0631 \u0628\u0627\u0644\u062F\u0641\u0639 \u{1F4E2}",
            "",
            `\u0639\u0632\u064A\u0632\u064A ${customerName}\u060C`,
            "",
            "\u0644\u062F\u064A\u0643 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0633\u062A\u062D\u0642\u0629 \u062E\u0644\u0627\u0644 3 \u0623\u064A\u0627\u0645:",
            `\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: ${invoice.invoice_number || "-"}`,
            `\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0633\u062A\u062D\u0642: ${outstandingAmount.toFixed(2)} \u0631\u064A\u0627\u0644`,
            `\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642: ${invoice.due_date || "-"}`,
            "",
            "\u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u062F\u0627\u062F \u0642\u0628\u0644 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642. \u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0639\u0627\u0648\u0646\u0643\u0645."
          ].join("\n")
        );
        if (!sent) {
          results.skipped_already_claimed += 1;
          continue;
        }
        results.reminders_sent += 1;
      } catch (error) {
        results.errors.push(
          `reminder ${invoice.invoice_number || invoice.id}: ${errorMessage(error)}`
        );
      }
    }
    for (const invoice of overdueBatch.invoices) {
      const outstandingAmount = getOutstandingAmount(invoice);
      if (outstandingAmount <= 0.01) {
        results.skipped_zero_balance += 1;
        continue;
      }
      results.late_fee_candidates += 1;
      const customer = invoice.customers;
      if (!customer?.phone) {
        results.skipped_no_phone += 1;
        continue;
      }
      try {
        const customerName = formatCustomerName(customer);
        const daysOverdue = getDaysBetween(invoice.due_date, today);
        const reminderType = getOverdueReminderType(daysOverdue);
        if (!reminderType) {
          results.skipped_cadence += 1;
          continue;
        }
        const sent = await sendClaimedReminder(
          supabaseClient,
          invoice,
          reminderType,
          today,
          customer.phone,
          [
            "\u062A\u0646\u0628\u064A\u0647: \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 \u26A0\uFE0F",
            "",
            `\u0639\u0632\u064A\u0632\u064A ${customerName}\u060C`,
            "",
            "\u0644\u062F\u064A\u0643 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 \u0639\u0646 \u0627\u0644\u0633\u062F\u0627\u062F:",
            `\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: ${invoice.invoice_number || "-"}`,
            `\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0633\u062A\u062D\u0642: ${outstandingAmount.toFixed(2)} \u0631\u064A\u0627\u0644`,
            `\u0639\u062F\u062F \u0623\u064A\u0627\u0645 \u0627\u0644\u062A\u0623\u062E\u064A\u0631: ${daysOverdue} \u064A\u0648\u0645`,
            "",
            "\u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u062F\u0627\u062F \u0623\u0648 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062D\u0633\u0627\u0628."
          ].join("\n")
        );
        if (!sent) {
          results.skipped_already_claimed += 1;
          continue;
        }
        results.overdue_notices_sent += 1;
      } catch (error) {
        results.errors.push(
          `overdue ${invoice.invoice_number || invoice.id}: ${errorMessage(error)}`
        );
      }
    }
    const hasErrors = results.errors.length > 0;
    executionSummary = {
      remindersSent: results.reminders_sent,
      overdueNoticesSent: results.overdue_notices_sent,
      errors: results.errors.length
    };
    return jsonResponse({
      success: !hasErrors,
      message: hasErrors ? "Payment reminders completed with partial errors" : "Payment reminders processed successfully",
      results,
      continuation: {
        batchSize,
        upcoming: {
          hasMore: upcomingBatch.hasMore,
          afterInvoiceId: upcomingBatch.nextAfterInvoiceId
        },
        overdue: {
          hasMore: overdueBatch.hasMore,
          afterInvoiceId: overdueBatch.nextAfterInvoiceId
        }
      }
    }, hasErrors ? 207 : 200);
  } catch (error) {
    executionFailed = true;
    const status = error instanceof HttpError ? error.status : 500;
    console.error("process-payment-reminders failed", error);
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabaseClient,
          invocation,
          !executionFailed,
          executionSummary,
          executionFailed ? "PAYMENT_REMINDER_FAILURE" : null
        );
      } catch (finishError) {
        console.error("Could not close payment reminder execution", finishError);
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
async function loadReminderInvoiceBatch(supabase, companyId, dueOperator, dueDate, afterInvoiceId, batchSize) {
  let query = supabase.from("invoices").select(`
      id,
      company_id,
      invoice_number,
      due_date,
      total_amount,
      balance_due,
      customers (first_name, last_name, phone)
    `).in("payment_status", COLLECTIBLE_PAYMENT_STATUSES).in("status", ACTIVE_INVOICE_STATUSES).eq("company_id", companyId).order("id", { ascending: true }).limit(batchSize + 1);
  query = dueOperator === "eq" ? query.eq("due_date", dueDate) : query.lt("due_date", dueDate);
  if (afterInvoiceId) query = query.gt("id", afterInvoiceId);
  const { data, error } = await query;
  if (error) throw error;
  const page = data || [];
  const hasMore = page.length > batchSize;
  const invoices = page.slice(0, batchSize);
  const nextAfterInvoiceId = hasMore ? invoices[invoices.length - 1]?.id || null : null;
  if (hasMore && !nextAfterInvoiceId) {
    throw new Error("Invoice reminder continuation cursor did not advance");
  }
  return { invoices, hasMore, nextAfterInvoiceId };
}
function emptyReminderBatch() {
  return { invoices: [], hasMore: false, nextAfterInvoiceId: null };
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
function parseProcessFlag(value, field) {
  if (value === void 0) return true;
  if (typeof value !== "boolean") {
    throw new HttpError(`${field} must be a boolean`, 400);
  }
  return value;
}
function parseCursor(value, field) {
  if (value === void 0 || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 128) {
    throw new HttpError(`${field} must be a valid cursor`, 400);
  }
  return value;
}
async function sendWhatsAppReminder(supabase, phone, message) {
  const { data, error } = await supabase.functions.invoke("send-whatsapp-reminders", {
    body: { test: true, phone, message }
  });
  if (error) throw error;
  if (data?.success !== true) {
    throw new Error(
      data?.error || "WhatsApp reminder provider did not confirm delivery"
    );
  }
}
async function sendClaimedReminder(supabase, invoice, reminderType, cadenceDate, phone, message) {
  const { data: claimedId, error: claimError } = await supabase.rpc(
    "claim_automated_invoice_reminder_delivery",
    {
      p_company_id: invoice.company_id,
      p_invoice_id: invoice.id,
      p_reminder_type: reminderType,
      p_cadence_date: cadenceDate
    }
  );
  if (claimError) throw claimError;
  if (typeof claimedId !== "string" || !claimedId) return false;
  try {
    await sendWhatsAppReminder(supabase, phone, message);
  } catch (error) {
    try {
      await completeReminderDelivery(
        supabase,
        claimedId,
        false,
        errorMessage(error)
      );
    } catch (completionError) {
      throw new Error(
        `${errorMessage(error)}; delivery logging failed: ${errorMessage(completionError)}`
      );
    }
    throw error;
  }
  try {
    await completeReminderDelivery(supabase, claimedId, true, null);
  } catch (completionError) {
    throw new Error(
      `WhatsApp delivery was confirmed, but the idempotency ledger could not be marked sent: ${errorMessage(completionError)}`
    );
  }
  return true;
}
async function completeReminderDelivery(supabase, deliveryId, success, error) {
  const { error: completionError } = await supabase.rpc(
    "complete_automated_invoice_reminder_delivery",
    {
      p_delivery_id: deliveryId,
      p_success: success,
      p_error: error
    }
  );
  if (completionError) throw completionError;
}
function getOutstandingAmount(invoice) {
  const value = invoice.balance_due == null ? Number(invoice.total_amount || 0) : Number(invoice.balance_due);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function formatCustomerName(customer) {
  return [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "\u0627\u0644\u0639\u0645\u064A\u0644";
}
function getQatarDateOnly(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Qatar",
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Could not resolve Qatar calendar date");
  return `${year}-${month}-${day}`;
}
function addCalendarDays(dateOnly, days) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function getDaysBetween(fromDate, toDate) {
  if (!fromDate) return 0;
  const from = Date.parse(`${fromDate.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 864e5));
}
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  const payload = error;
  return payload?.message || payload?.details || payload?.code || String(error);
}
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
