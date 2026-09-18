import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agentCorsHeaders,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  recordAgentMutation,
  type AgentInvocationContext,
} from "../_shared/agent.ts";
import {
  buildMissingContractPdfMessage,
  normalizeStaffWhatsAppPhone,
} from "./message.ts";

const AGENT_ID = "missing-contract-pdf-agent";
const MAX_DELIVERY_ATTEMPTS = 5;

// WhatsApp dispatch rate controls. The sending number was banned after a
// bulk burst; these limits keep outbound traffic human-paced. Adjust the
// persisted values per company in missing_contract_pdf_dispatch_guards.
const SEND_GUARDS = {
  // Hard cap per sender number per Qatar calendar day.
  dailySendCap: 24,
  // Minimum gap between two sends from the same sender number.
  minSecondsBetweenSends: 180,
  // Max successful sends per cron run (batch pacing across cycles).
  perRunMaxDeliveries: 6,
};

type SendWindow = {
  allowed: boolean;
  sent_today: number;
  daily_cap: number;
  wait_seconds: number;
};

type RequestBody = {
  action?: "scan_and_send" | "healthcheck";
  companyId?: string;
  maxRequests?: number;
};

type PdfRequest = {
  id: string;
  company_id: string;
  contract_id: string;
  reason: "missing" | "identity_mismatch";
  status: string;
  contract_number: string;
  customer_name: string;
  vehicle_plate: string | null;
};

type Delivery = {
  id: string;
  request_id: string;
  phone_e164: string;
  status: string;
  attempts: number;
  provider_message_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabase = createServiceClient();
  let invocation: AgentInvocationContext | null = null;
  try {
    const body = await readJson<RequestBody>(req);
    const companyId = requireUuid(body.companyId, "companyId");
    invocation = await authorizeScheduledAgent(req, AGENT_ID, companyId);
    const action = body.action || "scan_and_send";
    if (action === "healthcheck") {
      await finishAgentExecution(supabase, invocation, true, { action: "healthcheck" });
      return jsonResponse({
        success: true,
        agent: AGENT_ID,
        dispatch: "not_requested",
        provider: "send-whatsapp-reminders",
      });
    }
    if (action !== "scan_and_send") throw new HttpError("Unsupported action", 400);

    const maxRequests = boundedInteger(body.maxRequests, 10, 1, 50);
    await releaseStaleClaims(supabase, companyId);

    const { data, error } = await supabase
      .from("missing_contract_pdf_requests")
      .select("id,company_id,contract_id,reason,status,contract_number,customer_name,vehicle_plate")
      .eq("company_id", companyId)
      .in("status", ["pending", "sending", "partial", "failed"])
      .or(`review_cooldown_until.is.null,review_cooldown_until.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(maxRequests);
    if (error) throw error;

    const summary = {
      requests: (data || []).length,
      sent: 0,
      partial: 0,
      fulfilled: 0,
      failed: 0,
      deliveriesSent: 0,
      errors: [] as string[],
    };

    // Per-run delivery budget: spread bulk backlogs across cron cycles
    // instead of one blast (the burst that got the number banned).
    let runDeliveriesSent = 0;

    for (const pdfRequest of (data || []) as PdfRequest[]) {
      if (runDeliveriesSent >= SEND_GUARDS.perRunMaxDeliveries) break;
      try {
        const result = await processRequest(supabase, pdfRequest, invocation);
        summary[result.status] += 1;
        summary.deliveriesSent += result.deliveriesSent;
        runDeliveriesSent += result.deliveriesSent;
      } catch (error) {
        summary.failed += 1;
        summary.errors.push(`${pdfRequest.contract_number}: ${errorMessage(error)}`);
        await supabase
          .from("missing_contract_pdf_requests")
          .update({ status: "failed", last_error: errorMessage(error), updated_at: new Date().toISOString() })
          .eq("id", pdfRequest.id)
          .neq("status", "fulfilled");
      }
    }

    await finishAgentExecution(supabase, invocation, summary.failed === 0, summary, summary.failed > 0 ? "delivery_failure" : null);
    return jsonResponse({
      success: summary.failed === 0,
      agent: AGENT_ID,
      ...summary,
    }, summary.failed > 0 ? 207 : 200);
  } catch (error) {
    const status = error instanceof HttpError
      ? error.status
      : errorMessage(error) === "Unauthorized"
      ? 401
      : 500;
    console.error("missing-contract-pdf-agent failed", error);
    if (invocation) {
      try {
        await finishAgentExecution(supabase, invocation, false, {
          error: errorMessage(error).slice(0, 500),
        }, "PDF_REQUEST_AGENT_FAILURE");
      } catch (finishError) {
        console.error("Could not close missing PDF execution run", finishError);
      }
    }
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  }
});

async function processRequest(
  supabase: SupabaseClient,
  pdfRequest: PdfRequest,
  invocation: Awaited<ReturnType<typeof authorizeScheduledAgent>>,
): Promise<{ status: "sent" | "partial" | "fulfilled" | "failed"; deliveriesSent: number }> {
  const { data: matchedDocument, error: documentError } = await supabase
    .from("contract_documents")
    .select("id")
    .eq("company_id", pdfRequest.company_id)
    .eq("contract_id", pdfRequest.contract_id)
    .in("document_type", ["signed_contract", "signed_contract_image"])
    .eq("legal_identity_match_status", "matched")
    .eq("legal_evidence_state", "active")
    .not("file_path", "is", null)
    .limit(1)
    .maybeSingle();
  if (documentError) throw documentError;

  if (matchedDocument) {
    await supabase
      .from("missing_contract_pdf_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pdfRequest.id)
      .not("status", "in", "(fulfilled,cancelled)");
    await supabase
      .from("missing_contract_pdf_deliveries")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("request_id", pdfRequest.id)
      .in("status", ["pending", "failed"]);
    return { status: "fulfilled", deliveriesSent: 0 };
  }

  const { data: deliveryRows, error: deliveryError } = await supabase
    .from("missing_contract_pdf_deliveries")
    .select("id,request_id,phone_e164,status,attempts,provider_message_id")
    .eq("request_id", pdfRequest.id)
    .order("created_at", { ascending: true });
  if (deliveryError) throw deliveryError;

  const appUrl = String(Deno.env.get("FLEETIFY_APP_URL") || "https://www.alaraf.online")
    .replace(/\/$/, "");
  const { data: tokenData, error: tokenError } = await supabase.rpc(
    "issue_missing_contract_pdf_upload_token_v1",
    { p_request_id: pdfRequest.id, p_ttl: "10 days" },
  );
  if (tokenError) throw tokenError;
  const rawToken = String(tokenData?.token || "");
  if (!rawToken) throw new Error("Secure upload token was not issued");
  const message = buildMissingContractPdfMessage({
    contractNumber: pdfRequest.contract_number,
    reason: pdfRequest.reason,
    uploadUrl: `${appUrl}/contract-upload?token=${encodeURIComponent(rawToken)}`,
  });

  await supabase
    .from("missing_contract_pdf_requests")
    .update({ status: "sending", last_error: null, updated_at: new Date().toISOString() })
    .eq("id", pdfRequest.id)
    .in("status", ["pending", "partial", "failed", "sending"]);

  let deliveriesSent = 0;
  let stoppedForDailyCap = false;
  for (const delivery of (deliveryRows || []) as Delivery[]) {
    if (delivery.status === "sent" || delivery.status === "cancelled") continue;
    if (delivery.attempts >= MAX_DELIVERY_ATTEMPTS && !delivery.provider_message_id) continue;
    if (deliveriesSent >= SEND_GUARDS.perRunMaxDeliveries) break;

    const sender = normalizeStaffWhatsAppPhone(delivery.phone_e164);
    if (!sender) {
      await markDeliveryFailed(supabase, delivery.id, "Invalid staff WhatsApp number");
      continue;
    }

    // Rate guard: daily cap + minimum interval per sender number.
    const { data: windowData, error: windowError } = await supabase.rpc(
      "check_missing_contract_pdf_send_window_v1",
      { p_company_id: pdfRequest.company_id, p_phone: sender },
    );
    if (windowError) throw windowError;
    const sendWindow = (isRecord(windowData) ? windowData : {}) as unknown as SendWindow;
    if (sendWindow.allowed !== true) {
      stoppedForDailyCap = (sendWindow.sent_today ?? 0) >= (sendWindow.daily_cap ?? SEND_GUARDS.dailySendCap);
      break;
    }

    if (await sendDelivery(supabase, pdfRequest, delivery, message)) deliveriesSent += 1;
  }

  // Backpressure: if the daily cap or per-run budget stopped this dispatch,
  // park the request back to pending so the next cron cycle resumes pacing.
  if (stoppedForDailyCap && deliveriesSent === 0) {
    await supabase
      .from("missing_contract_pdf_requests")
      .update({
        status: pdfRequest.status === "sending" ? "pending" : pdfRequest.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pdfRequest.id)
      .in("status", ["sending"]);
    return { status: "partial", deliveriesSent: 0 };
  }

  const { data: finalRows, error: finalError } = await supabase
    .from("missing_contract_pdf_deliveries")
    .select("id,phone_e164,status,attempts,last_error,provider_message_id")
    .eq("request_id", pdfRequest.id);
  if (finalError) throw finalError;

  const sent = (finalRows || []).filter((row) => row.status === "sent");
  const unfinished = (finalRows || []).filter((row) => !["sent", "cancelled"].includes(row.status));
  const nextStatus = unfinished.length === 0 && sent.length > 0
    ? "sent"
    : sent.length > 0
    ? "partial"
    : "failed";
  const lastError = nextStatus === "failed"
    ? String((finalRows || []).find((row) => row.last_error)?.last_error || "All deliveries failed")
    : null;

  const { data: updatedRequest, error: requestError } = await supabase
    .from("missing_contract_pdf_requests")
    .update({
      status: nextStatus,
      sent_at: nextStatus === "sent" ? new Date().toISOString() : null,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pdfRequest.id)
    .neq("status", "fulfilled")
    .select("id,status")
    .maybeSingle();
  if (requestError) throw requestError;

  if (updatedRequest?.status === "sent" && pdfRequest.status !== "sent") {
    const { error: operationError } = await supabase.from("contract_operations_log").insert({
      contract_id: pdfRequest.contract_id,
      company_id: pdfRequest.company_id,
      operation_type: "signed_contract_pdf_request_sent",
      operation_details: {
        request_id: pdfRequest.id,
        recipients: sent.map((row) => row.phone_e164),
        provider_message_ids: sent.map((row) => row.provider_message_id).filter(Boolean),
        source: AGENT_ID,
      },
      notes: "أرسل الوكيل طلب نسخة العقد PDF تلقائياً عبر واتساب إلى مسؤولي العقود.",
      performed_by: null,
    });
    if (operationError) throw operationError;
  }

  await recordAgentMutation(supabase, invocation, {
    operation: "dispatch_missing_contract_pdf_request",
    entityType: "missing_contract_pdf_request",
    entityId: pdfRequest.id,
    idempotencyKey: `${pdfRequest.id}:${nextStatus}:${sent.map((row) => row.provider_message_id).filter(Boolean).sort().join(",")}`,
    beforeState: { status: pdfRequest.status },
    afterState: { status: nextStatus, sentDeliveries: sent.length },
    postcondition: {
      requestPersisted: updatedRequest?.status === nextStatus,
      providerMessageIdsPersisted: sent.every((row) => Boolean(row.provider_message_id)),
      unfinishedDeliveries: unfinished.length,
    },
    verified: updatedRequest?.status === nextStatus
      && sent.every((row) => Boolean(row.provider_message_id)),
  });

  return {
    status: nextStatus as "sent" | "partial" | "failed",
    deliveriesSent,
  };
}

async function sendDelivery(
  supabase: SupabaseClient,
  pdfRequest: PdfRequest,
  delivery: Delivery,
  message: string,
): Promise<boolean> {
  const phone = normalizeStaffWhatsAppPhone(delivery.phone_e164);
  if (!phone) {
    await markDeliveryFailed(supabase, delivery.id, "Invalid staff WhatsApp number");
    return false;
  }

  let providerMessageId = String(delivery.provider_message_id || "").trim();
  if (!providerMessageId) {
    const nextAttempt = Number(delivery.attempts || 0) + 1;
    const { data: claimed, error: claimError } = await supabase
      .from("missing_contract_pdf_deliveries")
      .update({
        status: "sending",
        attempts: nextAttempt,
        claimed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .in("status", ["pending", "failed"])
      .lt("attempts", MAX_DELIVERY_ATTEMPTS)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return false;

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-reminders", {
        body: { test: true, phone, message },
      });
      if (error) throw error;
      const provider = isRecord(data) ? data : { value: data };
      providerMessageId = String(provider.messageId || provider.id || "").trim();
      if (provider.success !== true || !providerMessageId) {
        throw new Error(String(provider.error || "WhatsApp provider did not return a message id"));
      }

      const { error: persistError } = await supabase
        .from("missing_contract_pdf_deliveries")
        .update({
          provider_message_id: providerMessageId,
          provider_payload: provider,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
        .eq("status", "sending");
      if (persistError) throw persistError;
    } catch (error) {
      await markDeliveryFailed(supabase, delivery.id, errorMessage(error));
      return false;
    }
  }

  const sentAt = new Date().toISOString();
  const { data: finalized, error: finalizeError } = await supabase
    .from("missing_contract_pdf_deliveries")
    .update({ status: "sent", sent_at: sentAt, last_error: null, updated_at: sentAt })
    .eq("id", delivery.id)
    .neq("status", "sent")
    .select("id")
    .maybeSingle();
  if (finalizeError) throw finalizeError;
  if (!finalized) return false;

  const { error: logError } = await supabase.from("whatsapp_message_logs").insert({
    company_id: pdfRequest.company_id,
    recipient_id: phone,
    message_type: "missing_contract_pdf_request",
    status: "sent",
    content: message,
    sent_at: sentAt,
    error_message: null,
  });
  if (logError) throw logError;

  // Feed the rate guard ledger so daily caps and intervals apply.
  const { error: sendLogError } = await supabase
    .from("missing_contract_pdf_send_log")
    .insert({
      company_id: pdfRequest.company_id,
      phone_e164: delivery.phone_e164,
      delivery_id: delivery.id,
      request_id: pdfRequest.id,
      sent_at: sentAt,
      provider_message_id: providerMessageId || null,
    });
  if (sendLogError) throw sendLogError;
  return true;
}

async function releaseStaleClaims(supabase: SupabaseClient, companyId: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("missing_contract_pdf_deliveries")
    .update({
      status: "failed",
      last_error: "Recovered a stale delivery claim",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("status", "sending")
    .is("provider_message_id", null)
    .lt("claimed_at", cutoff);
  if (error) throw error;
}

async function markDeliveryFailed(
  supabase: SupabaseClient,
  deliveryId: string,
  error: string,
) {
  const { error: updateError } = await supabase
    .from("missing_contract_pdf_deliveries")
    .update({ status: "failed", last_error: error.slice(0, 1000), updated_at: new Date().toISOString() })
    .eq("id", deliveryId)
    .neq("status", "sent");
  if (updateError) throw updateError;
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function requireUuid(value: unknown, field: string): string {
  const text = String(value || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new HttpError(`${field} must be a UUID`, 400);
  }
  return text;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
