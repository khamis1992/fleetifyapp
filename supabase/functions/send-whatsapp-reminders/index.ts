import { createServiceClient } from "../_shared/agent.ts";
import {
  authorizePrivilegedCompanyActor,
  PrivilegedAuthError,
} from "../_shared/privileged-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID") || "";
const providerToken = Deno.env.get("ULTRAMSG_TOKEN") || "";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const purposePolicy = {
  legal_case_notice: { entityType: "legal_case", table: "legal_cases", roles: ["company_admin", "manager"] },
  traffic_violation_reminder: { entityType: "customer", table: "customers", roles: ["company_admin", "manager", "fleet_manager"] },
  verification_task: { entityType: "employee", table: "employees", roles: ["company_admin", "manager"] },
  verification_complete: { entityType: "verification_task", table: "customer_verification_tasks", roles: ["company_admin", "manager"] },
  payment_reminder_manual: { entityType: "contract", table: "contracts", roles: ["company_admin", "manager", "accountant"] },
  payment_reminder_test: { entityType: "company", table: "companies", roles: ["company_admin", "manager", "accountant"] },
} as const;

type Purpose = keyof typeof purposePolicy;

class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly code = "request_failed") {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const body = await readJson(req);
    if (isServiceRoleRequest(req)) {
      if (body.test !== true) {
        return json({
          success: false,
          retired: true,
          error: "Legacy bulk sender disabled; use process-payment-reminders",
        }, 410);
      }
      return await sendProviderMessage(
        normalizeQatarPhone(body.phone),
        requireMessage(body.message),
      );
    }
    return await sendAuditedManualMessage(req, body);
  } catch (error) {
    const status = error instanceof HttpError || error instanceof PrivilegedAuthError
      ? error.status
      : 500;
    const code = error instanceof HttpError ? error.code : "unexpected_failure";
    console.error("WhatsApp adapter failed", code, errorMessage(error));
    return json({ success: false, error: errorMessage(error), code }, status);
  }
});

async function sendAuditedManualMessage(
  req: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const companyId = requireUuid(body.companyId, "companyId");
  const requestId = requireUuid(body.requestId, "requestId");
  const purpose = String(body.purpose || "") as Purpose;
  const policy = purposePolicy[purpose];
  if (!policy) throw new HttpError("Unsupported WhatsApp purpose", 400, "invalid_purpose");
  const entityType = String(body.entityType || "");
  const entityId = requireEntityId(body.entityId);
  if (entityType !== policy.entityType) {
    throw new HttpError("Entity type does not match message purpose", 400, "entity_type_mismatch");
  }

  const admin = createServiceClient();
  const actor = await authorizePrivilegedCompanyActor(req, companyId, policy.roles, admin);
  await assertEntityOwnership(admin, policy.table, entityId, companyId);

  const phone = normalizeQatarPhone(body.phone);
  const message = requireMessage(body.message);
  const recipientHash = await sha256(phone);
  const messageHash = await sha256(message);
  const fiveMinuteBucket = Math.floor(Date.now() / 300_000);
  const dedupeKey = await sha256(
    `${companyId}:${purpose}:${entityType}:${entityId}:${recipientHash}:${messageHash}:${fiveMinuteBucket}`,
  );

  const { data: inserted, error: insertError } = await admin
    .from("outbound_whatsapp_commands")
    .insert({
      company_id: companyId,
      requested_by: actor.userId,
      purpose,
      entity_type: entityType,
      entity_id: entityId,
      recipient_last4: phone.slice(-4),
      recipient_hash: recipientHash,
      message_hash: messageHash,
      idempotency_key: requestId,
      dedupe_key: dedupeKey,
      status: "pending",
    })
    .select("id,status,provider_message_id")
    .single();

  if (insertError?.code === "23505") {
    const { data: keyedExisting, error: keyedExistingError } = await admin
      .from("outbound_whatsapp_commands")
      .select("id,status,provider_message_id")
      .eq("company_id", companyId)
      .or(`idempotency_key.eq.${requestId},dedupe_key.eq.${dedupeKey}`)
      .maybeSingle();
    if (keyedExistingError) {
      throw new HttpError("Unable to resolve duplicate command", 409, "dedupe_lookup_failed");
    }
    let existing = keyedExisting;
    if (!existing) {
      const { data: pendingExisting, error: pendingExistingError } = await admin
        .from("outbound_whatsapp_commands")
        .select("id,status,provider_message_id")
        .eq("company_id", companyId)
        .eq("purpose", purpose)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("recipient_hash", recipientHash)
        .eq("message_hash", messageHash)
        .eq("status", "pending")
        .maybeSingle();
      if (pendingExistingError) {
        throw new HttpError("Unable to resolve duplicate command", 409, "dedupe_lookup_failed");
      }
      existing = pendingExisting;
    }
    if (!existing) {
      throw new HttpError("Unable to resolve duplicate command", 409, "dedupe_lookup_failed");
    }
    return json({
      success: existing.status === "sent",
      duplicate: true,
      pending: existing.status === "pending",
      messageId: existing.provider_message_id || undefined,
      commandId: existing.id,
    }, existing.status === "pending" ? 409 : 200);
  }
  if (insertError || !inserted) {
    throw new HttpError("Unable to create outbound audit command", 503, "audit_insert_failed");
  }

  let providerResponse: Response;
  try {
    providerResponse = await sendProviderMessage(phone, message);
  } catch (error) {
    await completeCommand(admin, inserted.id, "failed", null, "provider_exception")
      .catch((finalizeError) => console.error(
        "Could not record provider exception",
        errorMessage(finalizeError),
      ));
    throw error;
  }
  const providerPayload = await providerResponse.clone().json().catch(() => ({}));
  if (!providerResponse.ok || providerPayload?.success !== true) {
    await completeCommand(admin, inserted.id, "failed", null, "provider_rejected");
    return providerResponse;
  }

  // Do not mark an accepted provider message as failed if this update fails.
  // Leaving it pending activates the partial unique index and blocks blind resend.
  await completeCommand(admin, inserted.id, "sent", providerPayload.messageId || null, null);
  return json({ ...providerPayload, commandId: inserted.id });
}

async function assertEntityOwnership(
  admin: ReturnType<typeof createServiceClient>,
  table: string,
  entityId: string,
  companyId: string,
): Promise<void> {
  if (table === "companies") {
    if (entityId !== companyId) {
      throw new HttpError("Company entity mismatch", 403, "entity_company_mismatch");
    }
    return;
  }
  if (!uuidPattern.test(entityId)) {
    throw new HttpError("Entity ID must be a UUID", 400, "invalid_entity_id");
  }
  const { data, error } = await admin
    .from(table)
    .select("id")
    .eq("id", entityId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new HttpError("Entity ownership lookup failed", 503, "entity_lookup_failed");
  if (!data) throw new HttpError("Message entity is outside the active company", 403, "entity_company_mismatch");
}

async function completeCommand(
  admin: ReturnType<typeof createServiceClient>,
  id: string,
  status: "sent" | "failed",
  providerMessageId: string | null,
  errorCode: string | null,
): Promise<void> {
  const { error } = await admin
    .from("outbound_whatsapp_commands")
    .update({
      status,
      provider_message_id: providerMessageId,
      error_code: errorCode,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new HttpError("Unable to finalize outbound audit command", 503, "audit_finalize_failed");
}

async function sendProviderMessage(phone: string, message: string): Promise<Response> {
  if (!instanceId || !providerToken) {
    throw new HttpError("WhatsApp provider credentials are not configured", 503, "provider_not_configured");
  }
  const response = await fetch(
    `https://api.ultramsg.com/${encodeURIComponent(instanceId)}/messages/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: providerToken, to: phone, body: message }),
    },
  );
  const provider = await response.json().catch(() => ({}));
  const messageId = typeof provider?.id === "string" ? provider.id : "";
  const accepted = response.ok &&
    (provider?.sent === true || provider?.sent === "true" || Boolean(messageId));
  if (!accepted) {
    return json({
      success: false,
      error: String(provider?.error || provider?.message || `Provider HTTP ${response.status}`),
      code: "provider_rejected",
    }, 502);
  }
  return json({ success: true, messageId });
}

function isServiceRoleRequest(req: Request): boolean {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return Boolean(serviceRoleKey) && req.headers.get("Authorization") === `Bearer ${serviceRoleKey}`;
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError("Request body must be a JSON object", 400, "invalid_json");
  }
}

function requireUuid(value: unknown, field: string): string {
  const uuid = String(value || "").trim();
  if (!uuidPattern.test(uuid)) throw new HttpError(`${field} must be a UUID`, 400, `invalid_${field}`);
  return uuid;
}

function requireEntityId(value: unknown): string {
  const entityId = String(value || "").trim();
  if (!entityId || entityId.length > 100) {
    throw new HttpError("A valid entityId is required", 400, "invalid_entity_id");
  }
  return entityId;
}

function normalizeQatarPhone(value: unknown): string {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.length === 8) phone = `974${phone}`;
  if (!/^974[3-7]\d{7}$/.test(phone)) {
    throw new HttpError("A valid Qatar WhatsApp number is required", 400, "invalid_phone");
  }
  return phone;
}

function requireMessage(value: unknown): string {
  const message = String(value || "").trim();
  if (!message || message.length > 4096) {
    throw new HttpError("Message must contain between 1 and 4096 characters", 400, "invalid_message");
  }
  return message;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected WhatsApp provider failure";
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
