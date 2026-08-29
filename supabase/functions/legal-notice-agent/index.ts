import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agentCorsHeaders,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  recordAgentMutation,
  storeAgentReview,
  type AgentInvocationContext,
} from "../_shared/agent.ts";
import {
  buildFormalPaymentNotice,
  getCycleKey,
  getInvoiceBalance,
  normalizeWhatsAppPhone,
  type NoticeInvoice,
  sha256Hex,
} from "./notice.ts";

const AGENT_ID = "legal-notice-agent";
const ACTIVE_INVOICE_STATUSES = ["approved", "sent", "overdue", "pending", "unpaid"];

type RequestBody = {
  action?: "scan_and_send" | "healthcheck";
  companyId?: string;
  minDaysOverdue?: number;
  gracePeriodDays?: number;
  maxNotices?: number;
};

type InvoiceRow = NoticeInvoice & {
  company_id: string;
  contract_id: string | null;
  customer_id: string | null;
};

type ContractRow = {
  id: string;
  company_id: string;
  customer_id: string;
  contract_number: string;
  status: string | null;
};

type CustomerRow = {
  id: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type Candidate = {
  contract: ContractRow;
  customer: CustomerRow;
  invoices: InvoiceRow[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  const supabase = createServiceClient();
  let invocation: AgentInvocationContext | null = null;
  try {
    const body = await readJson<RequestBody>(req);
    const companyId = requireUuid(body.companyId, "companyId");
    invocation = await authorizeScheduledAgent(req, AGENT_ID, companyId);
    const action = body.action || "scan_and_send";
    if (!(["scan_and_send", "healthcheck"] as const).includes(action)) {
      throw new HttpError("Unsupported action", 400);
    }

    const minDaysOverdue = boundedInteger(body.minDaysOverdue, 10, 1, 120);
    const gracePeriodDays = boundedInteger(body.gracePeriodDays, 7, 1, 30);
    // Must never exceed the central max_mutations_per_run policy. The external
    // send happens before its postcondition can be recorded, so the batch cap
    // is also a pre-mutation safety boundary.
    const maxNotices = boundedInteger(body.maxNotices, 25, 1, 50);
    await ensureAcknowledgementWebhook(supabase);

    if (action === "healthcheck") {
      await finishAgentExecution(supabase, invocation, true, {
        action,
        provider: "ultramsg",
        acknowledgementWebhook: "configured",
      });
      return jsonResponse({
        success: true,
        agent: AGENT_ID,
        provider: "ultramsg",
        acknowledgementWebhook: "configured",
        dispatch: "not_requested",
      });
    }

    const today = qatarDateOnly(new Date());
    const cutoff = addCalendarDays(today, -minDaysOverdue);
    const candidates = await loadCandidates(
      supabase,
      companyId,
      cutoff,
      Math.min(maxNotices * 10, 1000),
    );
    const summary = {
      candidates: candidates.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const candidate of candidates) {
      if (summary.sent >= maxNotices) break;
      try {
        const result = await prepareAndSend(
          supabase,
          candidate,
          gracePeriodDays,
          today,
          invocation,
        );
        if (result === "sent") summary.sent += 1;
        else summary.skipped += 1;
      } catch (error) {
        summary.failed += 1;
        summary.errors.push(
          `${candidate.contract.contract_number}: ${errorMessage(error)}`,
        );
      }
    }

    await finishAgentExecution(supabase, invocation, summary.failed === 0, {
      action,
      ...summary,
    }, summary.failed > 0 ? "NOTICE_PARTIAL_FAILURE" : null);
    return jsonResponse({
      success: summary.failed === 0,
      agent: AGENT_ID,
      minDaysOverdue,
      gracePeriodDays,
      ...summary,
    }, summary.failed > 0 ? 207 : 200);
  } catch (error) {
    const status = error instanceof HttpError
      ? error.status
      : errorMessage(error) === "Unauthorized"
      ? 401
      : 500;
    console.error("legal-notice-agent failed", error);
    if (invocation) {
      try {
        await finishAgentExecution(supabase, invocation, false, {
          error: errorMessage(error).slice(0, 500),
        }, "NOTICE_AGENT_FAILURE");
      } catch (finishError) {
        console.error("Could not close legal notice execution run", finishError);
      }
    }
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  }
});

async function loadCandidates(
  supabase: SupabaseClient,
  companyId: string,
  cutoffDate: string,
  limit: number,
): Promise<Candidate[]> {
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,company_id,contract_id,customer_id,invoice_number,due_date,balance_due,total_amount")
    .eq("company_id", companyId)
    .in("status", ACTIVE_INVOICE_STATUSES)
    .lte("due_date", cutoffDate)
    .not("contract_id", "is", null)
    .order("due_date", { ascending: true })
    .limit(1000);
  if (invoiceError) throw invoiceError;

  const invoices = ((invoiceData || []) as InvoiceRow[])
    .filter((invoice) => invoice.contract_id && invoice.due_date && getInvoiceBalance(invoice) > 0.01);
  const contractIds = [...new Set(invoices.map((invoice) => invoice.contract_id as string))];
  if (contractIds.length === 0) return [];

  const { data: contractData, error: contractError } = await supabase
    .from("contracts")
    .select("id,company_id,customer_id,contract_number,status")
    .eq("company_id", companyId)
    .in("id", contractIds);
  if (contractError) throw contractError;

  const contracts = ((contractData || []) as ContractRow[]).filter((contract) =>
    !["cancelled", "canceled", "closed", "completed", "draft"].includes(
      String(contract.status || "").toLowerCase(),
    )
  );
  const customerIds = [...new Set(contracts.map((contract) => contract.customer_id))];
  if (customerIds.length === 0) return [];

  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("id,first_name_ar,last_name_ar,first_name,last_name,phone")
    .eq("company_id", companyId)
    .in("id", customerIds);
  if (customerError) throw customerError;

  const customerById = new Map(
    ((customerData || []) as CustomerRow[]).map((customer) => [customer.id, customer]),
  );
  const invoicesByContract = new Map<string, InvoiceRow[]>();
  for (const invoice of invoices) {
    const rows = invoicesByContract.get(invoice.contract_id as string) || [];
    rows.push(invoice);
    invoicesByContract.set(invoice.contract_id as string, rows);
  }

  return contracts
    .map((contract) => ({
      contract,
      customer: customerById.get(contract.customer_id),
      invoices: invoicesByContract.get(contract.id) || [],
    }))
    .filter((candidate): candidate is Candidate =>
      Boolean(
        candidate.customer
        && normalizeWhatsAppPhone(candidate.customer.phone)
        && candidate.invoices.length > 0,
      )
    )
    .sort((a, b) => a.invoices[0].due_date.localeCompare(b.invoices[0].due_date))
    .slice(0, limit);
}

async function prepareAndSend(
  supabase: SupabaseClient,
  candidate: Candidate,
  gracePeriodDays: number,
  today: string,
  invocation: AgentInvocationContext,
): Promise<"sent" | "skipped"> {
  const invoices = await loadLiveInvoices(
    supabase,
    candidate.contract.company_id,
    candidate.contract.id,
    candidate.customer.id,
    candidate.invoices.map((invoice) => invoice.id),
  );
  const amountDue = roundMoney(
    invoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0),
  );
  if (amountDue <= 0.01) return "skipped";

  const phone = normalizeWhatsAppPhone(candidate.customer.phone);
  if (!phone) return "skipped";
  const customerName = [
    candidate.customer.first_name_ar || candidate.customer.first_name,
    candidate.customer.last_name_ar || candidate.customer.last_name,
  ].filter(Boolean).join(" ") || "العميل";
  const oldestDueDate = invoices[0].due_date;
  const cycleKey = getCycleKey(oldestDueDate);
  const message = buildFormalPaymentNotice({
    customerName,
    contractNumber: candidate.contract.contract_number,
    invoices,
    amountDue,
    gracePeriodDays,
    noticeDate: today,
  });
  const messageHash = await sha256Hex(message);

  const { data: existing, error: existingError } = await supabase
    .from("legal_notice_agent_jobs")
    .select("*")
    .eq("contract_id", candidate.contract.id)
    .eq("notice_type", "payment_demand")
    .eq("cycle_key", cycleKey)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing && !["draft", "failed"].includes(existing.status)) return "skipped";
  if (existing && Number(existing.attempts || 0) >= 3) return "skipped";

  let job = existing;
  if (!job) {
    const { data, error } = await supabase
      .from("legal_notice_agent_jobs")
      .insert({
        company_id: candidate.contract.company_id,
        contract_id: candidate.contract.id,
        customer_id: candidate.customer.id,
        notice_type: "payment_demand",
        cycle_key: cycleKey,
        status: "draft",
        phone_e164: phone,
        customer_name: customerName,
        contract_number: candidate.contract.contract_number,
        oldest_due_date: oldestDueDate,
        source_invoice_ids: invoices.map((invoice) => invoice.id),
        amount_due: amountDue,
        grace_period_days: gracePeriodDays,
        message_body: message,
        message_sha256: messageHash,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return "skipped";
      throw error;
    }
    job = data;
  } else if (!existing.provider_message_id) {
    const { data, error } = await supabase
      .from("legal_notice_agent_jobs")
      .update({
        phone_e164: phone,
        source_invoice_ids: invoices.map((invoice) => invoice.id),
        amount_due: amountDue,
        grace_period_days: gracePeriodDays,
        message_body: message,
        message_sha256: messageHash,
        last_error: null,
      })
      .eq("id", job.id)
      .in("status", ["draft", "failed"])
      .select("*")
      .single();
    if (error) throw error;
    job = data;
  }

  if (!job.provider_message_id) {
    const latestInvoices = await loadLiveInvoices(
      supabase,
      candidate.contract.company_id,
      candidate.contract.id,
      candidate.customer.id,
      job.source_invoice_ids as string[],
    );
    const liveAmount = roundMoney(
      latestInvoices.reduce(
        (sum, invoice) => sum + getInvoiceBalance(invoice),
        0,
      ),
    );
    if (liveAmount <= 0.01) {
      await supabase
        .from("legal_notice_agent_jobs")
        .update({
          status: "cancelled",
          last_error: "Balance was settled before dispatch",
        })
        .eq("id", job.id)
        .in("status", ["draft", "failed"]);
      return "skipped";
    }
    if (Math.abs(liveAmount - amountDue) > 0.01) {
      await supabase
        .from("legal_notice_agent_jobs")
        .update({
          status: "failed",
          last_error: "Live balance changed before dispatch; the next run will refresh the notice",
        })
        .eq("id", job.id)
        .in("status", ["draft", "failed"]);
      return "skipped";
    }
  }

  const nextAttempt = Number(job.attempts || 0) + 1;
  const { data: claimed, error: claimError } = await supabase
    .from("legal_notice_agent_jobs")
    .update({ status: "sending", attempts: nextAttempt, last_error: null })
    .eq("id", job.id)
    .in("status", ["draft", "failed"])
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return "skipped";

  try {
    let providerData = job.provider_payload as Record<string, unknown> | null;
    let providerMessageId = String(job.provider_message_id || "").trim();
    if (!providerMessageId) {
      const { data, error: providerError } = await supabase.functions.invoke(
        "send-whatsapp-reminders",
        { body: { test: true, phone, message } },
      );
      if (providerError) throw providerError;
      providerData = isRecord(data) ? data : { value: data };
      providerMessageId = String(providerData.messageId || providerData.id || "").trim();
      if (providerData.success !== true || !providerMessageId) {
        throw new Error(
          String(providerData.error || "WhatsApp provider did not return a message id"),
        );
      }

      // Persist the external id before finalizing the database transaction. If
      // the RPC call below is interrupted, the next run resumes this message
      // instead of sending a duplicate legal notice.
      const { error: persistProviderError } = await supabase
        .from("legal_notice_agent_jobs")
        .update({
          provider_message_id: providerMessageId,
          provider_status: "accepted",
          provider_payload: providerData,
        })
        .eq("id", job.id)
        .eq("status", "sending");
      if (persistProviderError) throw persistProviderError;
    }

    const { error: finalizeError } = await supabase.rpc(
      "finalize_automatic_formal_notice_dispatch_v1",
      {
        p_job_id: job.id,
        p_provider_message_id: providerMessageId,
        p_provider_payload: providerData || {},
      },
    );
    if (finalizeError) throw finalizeError;

    await storeAgentReview(supabase, {
      companyId: candidate.contract.company_id,
      agentType: "formal_notice",
      entityType: "contracts",
      entityId: candidate.contract.id,
      verdict: "sent",
      confidence: 1,
      summary: `أُرسل إعذار واتساب تلقائي للعقد ${candidate.contract.contract_number} بانتظار إثبات الوصول`,
      details: {
        job_id: job.id,
        amount_due: amountDue,
        cycle_key: cycleKey,
        provider_message_id: providerMessageId,
      },
      model: "deterministic",
    });
    await recordAgentMutation(supabase, invocation, {
      operation: "dispatch_formal_payment_notice",
      entityType: "legal_notice_agent_job",
      entityId: job.id,
      idempotencyKey: `formal-notice:${job.id}:${providerMessageId}`,
      beforeState: {
        status: "sending",
        attempts: nextAttempt,
        provider_message_id: job.provider_message_id || null,
      },
      afterState: {
        status: "sent",
        provider_message_id: providerMessageId,
      },
      postcondition: {
        providerAccepted: true,
        dispatchFinalized: true,
        cycleKey,
      },
      verified: true,
    });
    return "sent";
  } catch (error) {
    await supabase
      .from("legal_notice_agent_jobs")
      .update({
        status: "failed",
        last_error: errorMessage(error).slice(0, 2000),
      })
      .eq("id", job.id)
      .eq("status", "sending");
    throw error;
  }
}

async function loadLiveInvoices(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  customerId: string,
  invoiceIds: string[],
): Promise<NoticeInvoice[]> {
  const { data, error } = await supabase.rpc(
    "get_automatic_formal_notice_live_invoices_v1",
    {
      p_company_id: companyId,
      p_contract_id: contractId,
      p_customer_id: customerId,
      p_invoice_ids: invoiceIds,
    },
  );
  if (error) throw error;
  return ((data || []) as NoticeInvoice[]).filter(
    (invoice) => invoice.due_date && getInvoiceBalance(invoice) > 0.01,
  );
}

async function ensureAcknowledgementWebhook(supabase: SupabaseClient): Promise<void> {
  const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID") || "";
  const token = Deno.env.get("ULTRAMSG_TOKEN") || "";
  if (!instanceId || !token) {
    throw new Error("Ultramsg credentials are not configured");
  }

  const { data: rows, error: configError } = await supabase.rpc(
    "get_legal_notice_webhook_configuration_v1",
  );
  if (configError) throw configError;
  const desiredUrl = String(rows?.[0]?.webhook_url || "");
  if (!desiredUrl) throw new Error("Legal notice webhook configuration is missing");

  const settingsResponse = await fetch(
    `https://api.ultramsg.com/${instanceId}/instance/settings?token=${encodeURIComponent(token)}`,
  );
  if (!settingsResponse.ok) {
    throw new Error(`Could not read Ultramsg settings (${settingsResponse.status})`);
  }
  const settingsPayload = await settingsResponse.json() as Record<string, unknown>;
  const current = isRecord(settingsPayload.data)
    ? settingsPayload.data
    : settingsPayload;
  const currentUrl = String(current.webhook_url || "").trim();
  if (currentUrl && normalizeUrl(currentUrl) !== normalizeUrl(desiredUrl)) {
    throw new Error("Ultramsg already has a different webhook; automatic notices paused");
  }
  const ackEnabled = ["true", "1", "on", "yes"].includes(
    String(current.webhook_message_ack || "").toLowerCase(),
  );
  if (currentUrl && ackEnabled) return;

  const body = new URLSearchParams({
    token,
    sendDelay: String(current.sendDelay || current.send_delay || 1),
    sendDelayMax: String(current.sendDelayMax || current.send_delay_max || 15),
    webhook_url: desiredUrl,
    webhook_message_received: String(current.webhook_message_received || false),
    webhook_message_create: String(current.webhook_message_create || false),
    webhook_message_ack: "true",
    webhook_message_download_media: String(
      current.webhook_message_download_media || false,
    ),
  });
  const updateResponse = await fetch(
    `https://api.ultramsg.com/${instanceId}/instance/settings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!updateResponse.ok) {
    throw new Error(`Could not configure Ultramsg acknowledgement webhook (${updateResponse.status})`);
  }

  const verificationResponse = await fetch(
    `https://api.ultramsg.com/${instanceId}/instance/settings?token=${encodeURIComponent(token)}`,
  );
  if (!verificationResponse.ok) {
    throw new Error(
      `Could not verify Ultramsg acknowledgement webhook (${verificationResponse.status})`,
    );
  }
  const verificationPayload = await verificationResponse.json() as Record<string, unknown>;
  const verified = isRecord(verificationPayload.data)
    ? verificationPayload.data
    : verificationPayload;
  const verifiedUrl = String(verified.webhook_url || "").trim();
  const verifiedAck = ["true", "1", "on", "yes"].includes(
    String(verified.webhook_message_ack || "").toLowerCase(),
  );
  if (normalizeUrl(verifiedUrl) !== normalizeUrl(desiredUrl) || !verifiedAck) {
    throw new Error("Ultramsg acknowledgement webhook did not persist");
  }
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function qatarDateOnly(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Qatar",
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Could not resolve Qatar date");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new HttpError(`Expected an integer between ${min} and ${max}`, 400);
  }
  return Number(value);
}

function requireUuid(value: unknown, field: string): string {
  const text = String(value || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new HttpError(`${field} must be a UUID`, 400);
  }
  return text;
}

async function readJson<T>(req: Request): Promise<T> {
  const raw = await req.text();
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const payload = error as { message?: string; details?: string; code?: string } | null;
  return payload?.message || payload?.details || payload?.code || String(error);
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
