import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  type AgentInvocationContext,
  authorizeScheduledAgent,
  finishAgentExecution,
} from "../_shared/agent.ts";
import { normalizeMoiPlate, parseMoiTrafficMail, type TrafficMailNotice } from "../_shared/traffic-mail-parser.ts";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const MOI_SENDER = "moiadmin@moi.gov.qa";
const DEFAULT_FOLDER_HINTS = ["traffic", "moi", "مخالفات"];
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-id, x-agent-secret, x-request-id",
};

interface SyncRequest { companyId?: string; action?: "sync" | "status" }
interface GraphMessage {
  id: string; internetMessageId?: string; subject?: string; receivedDateTime: string;
  from?: { emailAddress?: { address?: string } };
  body?: { content?: string; contentType?: string }; bodyPreview?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let invocation: AgentInvocationContext | null = null;
  let executionFailed = true;
  let executionSummary: Record<string, unknown> = {};
  try {
    const body: SyncRequest = await req.json().catch(() => ({}));
    const machineInvocation = Boolean(
      req.headers.get("x-agent-id") || req.headers.get("x-agent-secret"),
    );
    let companyId: string;
    if (machineInvocation) {
      if (!body.companyId) throw new Error("companyId is required for scheduled synchronization");
      invocation = await authorizeScheduledAgent(req, "traffic-mail-ingest", body.companyId);
      companyId = body.companyId;
    } else {
      companyId = await authorizeAndResolveCompany(req, admin, body.companyId);
    }
    if (body.action === "status") {
      const statusResult = await getStatus(admin, companyId);
      executionSummary = { action: "status" };
      executionFailed = false;
      return json(statusResult);
    }
    const result = await synchronize(admin, companyId);
    executionSummary = result;
    executionFailed = false;
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /Unauthorized|disabled or busy/.test(message) ? 401 : /Admin access/.test(message) ? 403 : 500;
    return json({ error: message }, status);
  } finally {
    if (invocation) {
      await finishAgentExecution(
        admin,
        invocation,
        !executionFailed,
        executionSummary,
        executionFailed ? "traffic_mail_ingest_failed" : null,
      ).catch(() => undefined);
    }
  }
});

async function authorizeAndResolveCompany(req: Request, admin: SupabaseClient, requested?: string): Promise<string> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw new Error("Unauthorized");
  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error } = await userClient.auth.getUser();
  if (error || !auth.user) throw new Error("Unauthorized");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("company_id").eq("user_id", auth.user.id).maybeSingle(),
    admin.from("user_roles").select("role, company_id").eq("user_id", auth.user.id),
  ]);
  const companyId = requested || profile?.company_id;
  const allowed = (roles || []).some((row: { role: string; company_id: string | null }) =>
    row.role === "super_admin" || (row.company_id === companyId && ["admin", "company_admin", "manager"].includes(row.role))
  );
  if (!companyId || !allowed) throw new Error("Admin access required");
  return companyId;
}

async function synchronize(admin: SupabaseClient, companyId: string) {
  const { data: syncLease, error: leaseError } = await admin.rpc(
    "claim_traffic_mail_sync_v1",
    { p_company_id: companyId, p_lease_seconds: 1200 },
  );
  if (leaseError) throw leaseError;
  if (!syncLease) {
    return { connected: true, skipped: true, reason: "synchronization_already_running", processed: 0 };
  }
  const startedAt = new Date().toISOString();
  try {
    const state = await loadState(admin, companyId);
    const accessToken = await refreshGraphToken();
    const folder = state?.graph_folder_id
      ? { id: state.graph_folder_id, displayName: state.graph_folder_name }
      : await findTrafficFolder(accessToken);

    // First connection establishes a current watermark so historical email is never imported.
    if (!state?.watermark_received_at) {
      const result = { connected: true, initialized: true, folder: folder.displayName, processed: 0 };
      await finishSync(admin, companyId, syncLease, { ...result, watermark_received_at: startedAt, graph_folder_id: folder.id, graph_folder_name: folder.displayName });
      return result;
    }

    const messages = await listNewMessages(accessToken, folder.id, state.watermark_received_at);
    let inserted = 0, duplicates = 0, notices = 0, ignored = 0, failed = 0;
    let watermark = state.watermark_received_at;
    for (const message of messages.sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime))) {
      watermark = message.receivedDateTime > watermark ? message.receivedDateTime : watermark;
      const claimed = await claimMessage(admin, companyId, message);
      if (!claimed) { duplicates++; continue; }
      const parsed = parseMoiTrafficMail(message.subject || "", message.body?.content || message.bodyPreview || "");
      try {
        const applied = await applyNotice(admin, companyId, parsed, message);
        inserted += applied === "inserted" ? 1 : 0;
        duplicates += applied === "duplicate" ? 1 : 0;
        notices += applied === "notice" ? 1 : 0;
        ignored += applied === "ignored" ? 1 : 0;
        await finalizeMessage(admin, claimed, parsed.type, applied === "ignored" ? "ignored" : "processed", { outcome: applied });
      } catch (error) {
        failed++;
        await finalizeMessage(admin, claimed, parsed.type, "failed", {}, error instanceof Error ? error.message : String(error));
      }
    }
    const result = { connected: true, folder: folder.displayName, processed: messages.length, inserted, duplicates, notices, ignored, failed };
    // Retain the prior watermark when any application failed. The next run will
    // refetch the window, skip completed claims, and retry failed claims.
    await finishSync(admin, companyId, syncLease, { ...result, watermark_received_at: failed > 0 ? state.watermark_received_at : watermark, graph_folder_id: folder.id, graph_folder_name: folder.displayName });
    return result;
  } catch (error) {
    await admin
      .from("traffic_mail_ingest_state")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "error",
        last_error: safeError(error),
        sync_lease_token: null,
        sync_lease_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("sync_lease_token", syncLease);
    throw error;
  }
}

async function applyNotice(admin: SupabaseClient, companyId: string, notice: TrafficMailNotice, message: GraphMessage): Promise<"inserted" | "duplicate" | "notice" | "ignored"> {
  if (notice.type === "unknown") return "ignored";
  if (notice.type === "fine") return applyFine(admin, companyId, notice, message);
  if (notice.type === "discount_expiry") {
    const { data: penalty } = await admin.from("penalties").select("id, notes").eq("company_id", companyId).eq("vehicle_plate", notice.plate).eq("penalty_date", notice.date).neq("payment_status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (penalty) {
      const { error } = await admin.from("penalties").update({ notes: appendNote(penalty.notes, `إشعار انتهاء خصم وزارة الداخلية${notice.hoursRemaining ? ` خلال ${notice.hoursRemaining} ساعة` : ""}`) }).eq("id", penalty.id).eq("company_id", companyId);
      if (error) throw error;
    }
    await logNotice(admin, companyId, notice, message, { penalty_id: penalty?.id || null, plate_number: notice.plate, notice_date: notice.date });
    return "notice";
  }
  if (notice.type === "block_vehicle") {
    const vehicleResolution = await findVehicle(admin, companyId, notice.plate);
    if (vehicleResolution.ambiguous) {
      await logNotice(admin, companyId, notice, message, {
        plate_number: notice.plate,
        review_reason: "ambiguous_vehicle_plate",
      });
      return "notice";
    }
    const vehicle = vehicleResolution.vehicle;
    if (vehicle && vehicle.status !== "stolen") {
      const { error } = await admin.from("vehicles").update({ status: "street_52", updated_at: new Date().toISOString() }).eq("id", vehicle.id).eq("company_id", companyId).neq("status", "stolen");
      if (error) throw error;
    }
    await logNotice(admin, companyId, notice, message, { vehicle_id: vehicle?.id || null, plate_number: notice.plate });
    return "notice";
  }
  const { data: customer, error: customerError } = await admin.from("customers").select("id").eq("company_id", companyId).eq("national_id", notice.qid).maybeSingle();
  if (customerError) throw customerError;
  if (customer) {
    const { data: penalties, error: penaltiesError } = await admin
      .from("penalties")
      .select("id,notes")
      .eq("company_id", companyId)
      .eq("customer_id", customer.id)
      .neq("payment_status", "paid")
      .limit(500);
    if (penaltiesError) throw penaltiesError;
    for (const penalty of penalties || []) {
      const { error } = await admin
        .from("penalties")
        .update({
          case_follow_up: true,
          case_follow_up_at: new Date().toISOString(),
          case_follow_up_source: "moi_graph_email",
          notes: appendNote(penalty.notes, "تحويل المخالفات المرورية لمتابعة القضايا"),
        })
        .eq("id", penalty.id)
        .eq("company_id", companyId);
      if (error) throw error;
    }
  }
  await logNotice(admin, companyId, notice, message, { customer_id: customer?.id || null, national_id: notice.qid });
  return "notice";
}

async function applyFine(admin: SupabaseClient, companyId: string, notice: Extract<TrafficMailNotice, { type: "fine" }>, message: GraphMessage) {
  let query = admin.from("penalties").select("id").eq("company_id", companyId);
  query = notice.penaltyNumber
    ? query.eq("penalty_number", notice.penaltyNumber)
    : query.eq("vehicle_plate", notice.plate).eq("penalty_date", notice.date).eq("amount", notice.amount);
  const { data: existing, error: existingError } = await query.limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return "duplicate" as const;
  const vehicleResolution = await findVehicle(admin, companyId, notice.plate);
  if (vehicleResolution.ambiguous) {
    await logNotice(admin, companyId, notice, message, {
      plate_number: notice.plate,
      notice_date: notice.date,
      review_reason: "ambiguous_vehicle_plate",
    });
    return "notice" as const;
  }
  const vehicle = vehicleResolution.vehicle;
  let contract: { id: string; customer_id: string | null } | null = null;
  if (vehicle) {
    const result = await admin.from("contracts").select("id, customer_id, start_date, end_date, status").eq("company_id", companyId).eq("vehicle_id", vehicle.id).lte("start_date", notice.date).or(`end_date.is.null,end_date.gte.${notice.date}`).neq("status", "cancelled").order("start_date", { ascending: false }).limit(2);
    if (result.error) throw result.error;
    if ((result.data || []).length > 1) {
      await logNotice(admin, companyId, notice, message, {
        vehicle_id: vehicle.id,
        plate_number: notice.plate,
        notice_date: notice.date,
        review_reason: "ambiguous_contract_on_violation_date",
        candidate_contract_ids: (result.data || []).map((candidate) => candidate.id),
      });
      return "notice" as const;
    }
    contract = result.data?.[0] || null;
  }
  const penaltyNumber = notice.penaltyNumber || `MOI-${notice.plate}-${notice.date}-${notice.amount}`;
  const reason = notice.fineKind === "radar" ? "مخالفة رادار" : "مخالفة مرورية";
  const { data: penalty, error } = await admin.from("penalties").insert({
    company_id: companyId, vehicle_id: vehicle?.id || null, contract_id: contract?.id || null,
    customer_id: contract?.customer_id || null, penalty_number: penaltyNumber, violation_type: reason,
    penalty_date: notice.date, amount: notice.amount, location: null, vehicle_plate: notice.plate,
    reason, status: "pending", payment_status: "unpaid",
    notes: `استيراد تلقائي من بريد وزارة الداخلية عبر Microsoft Graph${notice.recordedSpeed ? ` | السرعة المسجلة: ${notice.recordedSpeed} كلم/ساعة` : ""}`,
  }).select("id").single();
  if (error) throw error;
  await logNotice(admin, companyId, notice, message, { penalty_id: penalty.id, vehicle_id: vehicle?.id || null, plate_number: notice.plate, notice_date: notice.date });
  return "inserted" as const;
}

async function findVehicle(
  admin: SupabaseClient,
  companyId: string,
  plate: string,
): Promise<{
  vehicle: { id: string; status: string | null; plate_number: string | null } | null;
  ambiguous: boolean;
}> {
  const normalized = normalizeMoiPlate(plate);
  const withoutZeros = normalized.replace(/^0+/, "");
  const variants = [...new Set([
    normalized, withoutZeros,
    withoutZeros.padStart(6, "0"), withoutZeros.padStart(7, "0"), withoutZeros.padStart(8, "0"),
  ])].filter(Boolean);
  const { data, error } = await admin.from("vehicles").select("id, status, plate_number").eq("company_id", companyId).in("plate_number", variants).limit(2);
  if (error) throw error;
  if ((data || []).length > 1) return { vehicle: null, ambiguous: true };
  if (data?.[0]) return { vehicle: data[0], ambiguous: false };
  const { data: history, error: historyError } = await admin.from("vehicle_plate_history").select("vehicle_id").eq("company_id", companyId).in("old_plate_normalized", variants).order("changed_at", { ascending: false }).limit(10);
  if (historyError) throw historyError;
  const historicalVehicleIds = [...new Set((history || []).map((row) => row.vehicle_id).filter(Boolean))];
  if (historicalVehicleIds.length > 1) return { vehicle: null, ambiguous: true };
  if (historicalVehicleIds.length === 0) return { vehicle: null, ambiguous: false };
  const { data: historicalVehicle, error: vehicleError } = await admin.from("vehicles").select("id, status, plate_number").eq("company_id", companyId).eq("id", historicalVehicleIds[0]).maybeSingle();
  if (vehicleError) throw vehicleError;
  return { vehicle: historicalVehicle || null, ambiguous: false };
}

async function refreshGraphToken(): Promise<string> {
  const tenant = Deno.env.get("GRAPH_TENANT_ID") || "consumers";
  const clientId = requiredEnv("GRAPH_CLIENT_ID"), clientSecret = requiredEnv("GRAPH_CLIENT_SECRET"), refreshToken = requiredEnv("GRAPH_REFRESH_TOKEN");
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token", scope: "offline_access Mail.Read" }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`Microsoft authorization failed (${response.status})`);
  return payload.access_token;
}

async function graphGet<T>(token: string, url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(`Microsoft Graph request failed (${response.status})`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(Number(response.headers.get("Retry-After") || 2) * 1000, 10000)));
  }
  throw new Error("Microsoft Graph request failed");
}

async function findTrafficFolder(token: string): Promise<{ id: string; displayName: string }> {
  const configured = Deno.env.get("GRAPH_FOLDER_NAME")?.toLocaleLowerCase();
  const mailbox = Deno.env.get("GRAPH_MAILBOX");
  const owner = mailbox ? `/users/${encodeURIComponent(mailbox)}` : "/me";
  const pending = [`${GRAPH_ROOT}${owner}/mailFolders?$select=id,displayName,childFolderCount&$top=100&includeHiddenFolders=true`];
  while (pending.length) {
    let url: string | undefined = pending.shift();
    while (url) {
      const page = await graphGet<{ value: Array<{ id: string; displayName: string; childFolderCount?: number }>; "@odata.nextLink"?: string }>(token, url);
      const match = page.value.find((folder) => configured ? folder.displayName.toLocaleLowerCase().includes(configured) : DEFAULT_FOLDER_HINTS.some((hint) => folder.displayName.toLocaleLowerCase().includes(hint)));
      if (match) return match;
      for (const folder of page.value) if (folder.childFolderCount) pending.push(`${GRAPH_ROOT}${owner}/mailFolders/${encodeURIComponent(folder.id)}/childFolders?$select=id,displayName,childFolderCount&$top=100&includeHiddenFolders=true`);
      url = page["@odata.nextLink"];
    }
  }
  throw new Error("لم يتم العثور على مجلد بريد المخالفات المحدد");
}

async function listNewMessages(token: string, folderId: string, watermark: string): Promise<GraphMessage[]> {
  const mailbox = Deno.env.get("GRAPH_MAILBOX");
  const owner = mailbox ? `/users/${encodeURIComponent(mailbox)}` : "/me";
  const filter = `receivedDateTime gt ${new Date(watermark).toISOString()} and from/emailAddress/address eq '${MOI_SENDER}'`;
  let url: string | undefined = `${GRAPH_ROOT}${owner}/mailFolders/${encodeURIComponent(folderId)}/messages?$select=id,internetMessageId,subject,receivedDateTime,from,body,bodyPreview&$top=50&$filter=${encodeURIComponent(filter)}`;
  const messages: GraphMessage[] = [];
  while (url) { const page = await graphGet<{ value: GraphMessage[]; "@odata.nextLink"?: string }>(token, url); messages.push(...page.value.filter((m) => m.from?.emailAddress?.address?.toLowerCase() === MOI_SENDER)); url = page["@odata.nextLink"]; }
  return messages;
}

async function loadState(admin: SupabaseClient, companyId: string) { const { data, error } = await admin.from("traffic_mail_ingest_state").select("*").eq("company_id", companyId).maybeSingle(); if (error) throw error; return data; }
async function getStatus(admin: SupabaseClient, companyId: string) { const state = await loadState(admin, companyId); return { configured: ["GRAPH_CLIENT_ID", "GRAPH_CLIENT_SECRET", "GRAPH_REFRESH_TOKEN"].every((key) => Boolean(Deno.env.get(key))), state }; }
async function finishSync(admin: SupabaseClient, companyId: string, syncLease: string, result: Record<string, unknown>) { const { watermark_received_at, graph_folder_id, graph_folder_name, ...summary } = result; const { data, error } = await admin.from("traffic_mail_ingest_state").update({ watermark_received_at, graph_folder_id, graph_folder_name, last_sync_at: new Date().toISOString(), last_sync_status: "success", last_error: null, last_result: summary, sync_lease_token: null, sync_lease_expires_at: null, updated_at: new Date().toISOString() }).eq("company_id", companyId).eq("sync_lease_token", syncLease).select("company_id").maybeSingle(); if (error) throw error; if (!data) throw new Error("Traffic mail synchronization lease expired"); }
async function claimMessage(admin: SupabaseClient, companyId: string, message: GraphMessage): Promise<string | null> { const { data, error } = await admin.from("traffic_mail_processed_messages").insert({ company_id: companyId, graph_message_id: message.id, internet_message_id: message.internetMessageId, received_at: message.receivedDateTime, subject: message.subject, processing_status: "processing" }).select("id").single(); if (!error) return data.id; if (error.code !== "23505") throw error; const { data: failed, error: failedLookupError } = await admin.from("traffic_mail_processed_messages").select("id").eq("company_id", companyId).eq("graph_message_id", message.id).eq("processing_status", "failed").maybeSingle(); if (failedLookupError) throw failedLookupError; if (!failed) return null; const { data: reclaimed, error: reclaimError } = await admin.from("traffic_mail_processed_messages").update({ processing_status: "processing", error_message: null }).eq("id", failed.id).eq("processing_status", "failed").select("id").maybeSingle(); if (reclaimError) throw reclaimError; return reclaimed?.id || null; }
async function finalizeMessage(admin: SupabaseClient, id: string, type: string, status: string, result: Record<string, unknown>, error?: string) { const response = await admin.from("traffic_mail_processed_messages").update({ notice_type: type, processing_status: status, result, error_message: error, processed_at: new Date().toISOString() }).eq("id", id); if (response.error) throw response.error; }
async function logNotice(admin: SupabaseClient, companyId: string, notice: TrafficMailNotice, message: GraphMessage, links: Record<string, unknown>) { const { data: processed } = await admin.from("traffic_mail_processed_messages").select("id").eq("company_id", companyId).eq("graph_message_id", message.id).maybeSingle(); const { error } = await admin.from("traffic_mail_notices").insert({ company_id: companyId, processed_message_id: processed?.id || null, notice_type: notice.type, details: notice, ...links }); if (error) throw error; }
function appendNote(current: string | null, next: string) { return current?.includes(next) ? current : [current, next].filter(Boolean).join(" | "); }
function safeError(error: unknown) { return (error instanceof Error ? error.message : String(error)).replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]").slice(0, 1000); }
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } }); }
