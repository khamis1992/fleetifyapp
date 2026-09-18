// supabase/functions/ingest-traffic-mail/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient2 } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

// supabase/functions/_shared/traffic-mail-parser.ts
var ARABIC_DIGITS = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9"
};
function normalizeArabicDigits(value) {
  return value.replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit]);
}
function normalizeMoiPlate(value) {
  const digits = normalizeArabicDigits(value).replace(/\D/g, "");
  return digits.length > 0 && digits.length < 6 ? digits.padStart(6, "0") : digits;
}
function cleanText(value) {
  return normalizeArabicDigits(value).replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
}
function isValidIsoDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}
function parseMoiTrafficMail(subject, body) {
  const text = cleanText(`${subject} ${body}`);
  if (text.includes("\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631\u064A\u0629 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0642\u0636\u0627\u064A\u0627")) {
    const qid = text.match(/(?:الرقم الشخصي|رقم شخصي|QID)?\s*[:：-]?\s*(\d{11})/i)?.[1];
    return qid ? { type: "case_transfer", qid } : { type: "unknown", reason: "case_transfer_without_qid" };
  }
  if (/حجز مركبة|Block Vehicle/i.test(text)) {
    const plate = text.match(/(?:المركبة|مركبة)\s*(?:رقم)?\s*[:：-]?\s*(\d{1,8})/i)?.[1];
    return plate ? { type: "block_vehicle", plate: normalizeMoiPlate(plate), location: "street_52" } : { type: "unknown", reason: "block_vehicle_without_plate" };
  }
  if (text.includes("\u062A\u0646\u062A\u0647\u064A \u0645\u062F\u0629 \u0627\u0644\u062E\u0635\u0645")) {
    const details = text.match(/رقم\s*\(\s*([^)-]+?)\s*-\s*(\d{1,8})\s*\).*?بتاريخ\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/i);
    if (!details || !isValidIsoDate(details[3])) {
      return { type: "unknown", reason: "discount_expiry_unparseable" };
    }
    const hours = text.match(/بعد\s*(\d+)\s*ساعة/)?.[1];
    return {
      type: "discount_expiry",
      vehicleClass: details[1].trim(),
      plate: normalizeMoiPlate(details[2]),
      date: details[3],
      hoursRemaining: hours ? Number(hours) : void 0
    };
  }
  if (/تم تسجيل مخالفة (?:ردار|رادار|مرورية)/.test(text)) {
    const plate = text.match(/رقم المركبة\s*[:：]\s*(\d{1,8})/)?.[1];
    const vehicleClass = text.match(/رقم المركبة\s*[:：]\s*\d{1,8}\s*-\s*([^:]+?)\s+التاريخ/)?.[1]?.trim();
    const date = text.match(/التاريخ\s*[:：]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const amount = text.match(/القيمة\s*[:：]\s*([\d,.]+)/)?.[1];
    const numericAmount = amount ? Number(amount.replace(/,/g, "")) : 0;
    if (!plate || !date || !isValidIsoDate(date) || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1e6) {
      return { type: "unknown", reason: "fine_unparseable" };
    }
    const speed = text.match(/السرعة المسجلة\s*[:：]\s*(\d+)/)?.[1];
    const penaltyNumber = text.match(/رقم المخالفة\s*[:：]\s*([\d-]+)/)?.[1];
    return {
      type: "fine",
      fineKind: /ردار|رادار/.test(text) ? "radar" : "traffic",
      plate: normalizeMoiPlate(plate),
      date,
      amount: numericAmount,
      vehicleClass,
      penaltyNumber,
      recordedSpeed: speed ? Number(speed) : void 0
    };
  }
  return { type: "unknown", reason: "unsupported_message" };
}

// supabase/functions/ingest-traffic-mail/index.ts
var GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
var MOI_SENDER = "moiadmin@moi.gov.qa";
var DEFAULT_FOLDER_HINTS = ["traffic", "moi", "\u0645\u062E\u0627\u0644\u0641\u0627\u062A"];
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-id, x-agent-secret, x-request-id"
};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient2(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let invocation = null;
  let executionFailed = true;
  let executionSummary = {};
  try {
    const body = await req.json().catch(() => ({}));
    const machineInvocation = Boolean(
      req.headers.get("x-agent-id") || req.headers.get("x-agent-secret")
    );
    let companyId;
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
        executionFailed ? "traffic_mail_ingest_failed" : null
      ).catch(() => void 0);
    }
  }
});
async function authorizeAndResolveCompany(req, admin, requested) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw new Error("Unauthorized");
  const userClient = createClient2(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authorization } }
  });
  const { data: auth, error } = await userClient.auth.getUser();
  if (error || !auth.user) throw new Error("Unauthorized");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("company_id").eq("user_id", auth.user.id).maybeSingle(),
    admin.from("user_roles").select("role, company_id").eq("user_id", auth.user.id)
  ]);
  const companyId = requested || profile?.company_id;
  const allowed = (roles || []).some(
    (row) => row.role === "super_admin" || row.company_id === companyId && ["admin", "company_admin", "manager"].includes(row.role)
  );
  if (!companyId || !allowed) throw new Error("Admin access required");
  return companyId;
}
async function synchronize(admin, companyId) {
  const { data: syncLease, error: leaseError } = await admin.rpc(
    "claim_traffic_mail_sync_v1",
    { p_company_id: companyId, p_lease_seconds: 1200 }
  );
  if (leaseError) throw leaseError;
  if (!syncLease) {
    return { connected: true, skipped: true, reason: "synchronization_already_running", processed: 0 };
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const state = await loadState(admin, companyId);
    const accessToken = await refreshGraphToken();
    const folder = state?.graph_folder_id ? { id: state.graph_folder_id, displayName: state.graph_folder_name } : await findTrafficFolder(accessToken);
    if (!state?.watermark_received_at) {
      const result2 = { connected: true, initialized: true, folder: folder.displayName, processed: 0 };
      await finishSync(admin, companyId, syncLease, { ...result2, watermark_received_at: startedAt, graph_folder_id: folder.id, graph_folder_name: folder.displayName });
      return result2;
    }
    const messages = await listNewMessages(accessToken, folder.id, state.watermark_received_at);
    let inserted = 0, duplicates = 0, notices = 0, ignored = 0, failed = 0;
    let watermark = state.watermark_received_at;
    for (const message of messages.sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime))) {
      watermark = message.receivedDateTime > watermark ? message.receivedDateTime : watermark;
      const claimed = await claimMessage(admin, companyId, message);
      if (!claimed) {
        duplicates++;
        continue;
      }
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
    await finishSync(admin, companyId, syncLease, { ...result, watermark_received_at: failed > 0 ? state.watermark_received_at : watermark, graph_folder_id: folder.id, graph_folder_name: folder.displayName });
    return result;
  } catch (error) {
    await admin.from("traffic_mail_ingest_state").update({
      last_sync_at: (/* @__PURE__ */ new Date()).toISOString(),
      last_sync_status: "error",
      last_error: safeError(error),
      sync_lease_token: null,
      sync_lease_expires_at: null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("company_id", companyId).eq("sync_lease_token", syncLease);
    throw error;
  }
}
async function applyNotice(admin, companyId, notice, message) {
  if (notice.type === "unknown") return "ignored";
  if (notice.type === "fine") return applyFine(admin, companyId, notice, message);
  if (notice.type === "discount_expiry") {
    const { data: penalty } = await admin.from("penalties").select("id, notes").eq("company_id", companyId).eq("vehicle_plate", notice.plate).eq("penalty_date", notice.date).neq("payment_status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (penalty) {
      const { error } = await admin.from("penalties").update({ notes: appendNote(penalty.notes, `\u0625\u0634\u0639\u0627\u0631 \u0627\u0646\u062A\u0647\u0627\u0621 \u062E\u0635\u0645 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629${notice.hoursRemaining ? ` \u062E\u0644\u0627\u0644 ${notice.hoursRemaining} \u0633\u0627\u0639\u0629` : ""}`) }).eq("id", penalty.id).eq("company_id", companyId);
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
        review_reason: "ambiguous_vehicle_plate"
      });
      return "notice";
    }
    const vehicle = vehicleResolution.vehicle;
    if (vehicle && vehicle.status !== "stolen") {
      const { error } = await admin.from("vehicles").update({ status: "street_52", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", vehicle.id).eq("company_id", companyId).neq("status", "stolen");
      if (error) throw error;
    }
    await logNotice(admin, companyId, notice, message, { vehicle_id: vehicle?.id || null, plate_number: notice.plate });
    return "notice";
  }
  const { data: customer, error: customerError } = await admin.from("customers").select("id").eq("company_id", companyId).eq("national_id", notice.qid).maybeSingle();
  if (customerError) throw customerError;
  if (customer) {
    const { data: penalties, error: penaltiesError } = await admin.from("penalties").select("id,notes").eq("company_id", companyId).eq("customer_id", customer.id).neq("payment_status", "paid").limit(500);
    if (penaltiesError) throw penaltiesError;
    for (const penalty of penalties || []) {
      const { error } = await admin.from("penalties").update({
        case_follow_up: true,
        case_follow_up_at: (/* @__PURE__ */ new Date()).toISOString(),
        case_follow_up_source: "moi_graph_email",
        notes: appendNote(penalty.notes, "\u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631\u064A\u0629 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0642\u0636\u0627\u064A\u0627")
      }).eq("id", penalty.id).eq("company_id", companyId);
      if (error) throw error;
    }
  }
  await logNotice(admin, companyId, notice, message, { customer_id: customer?.id || null, national_id: notice.qid });
  return "notice";
}
async function applyFine(admin, companyId, notice, message) {
  let query = admin.from("penalties").select("id").eq("company_id", companyId);
  query = notice.penaltyNumber ? query.eq("penalty_number", notice.penaltyNumber) : query.eq("vehicle_plate", notice.plate).eq("penalty_date", notice.date).eq("amount", notice.amount);
  const { data: existing, error: existingError } = await query.limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return "duplicate";
  const vehicleResolution = await findVehicle(admin, companyId, notice.plate);
  if (vehicleResolution.ambiguous) {
    await logNotice(admin, companyId, notice, message, {
      plate_number: notice.plate,
      notice_date: notice.date,
      review_reason: "ambiguous_vehicle_plate"
    });
    return "notice";
  }
  const vehicle = vehicleResolution.vehicle;
  let contract = null;
  if (vehicle) {
    const result = await admin.from("contracts").select("id, customer_id, start_date, end_date, status").eq("company_id", companyId).eq("vehicle_id", vehicle.id).lte("start_date", notice.date).or(`end_date.is.null,end_date.gte.${notice.date}`).neq("status", "cancelled").order("start_date", { ascending: false }).limit(2);
    if (result.error) throw result.error;
    if ((result.data || []).length > 1) {
      await logNotice(admin, companyId, notice, message, {
        vehicle_id: vehicle.id,
        plate_number: notice.plate,
        notice_date: notice.date,
        review_reason: "ambiguous_contract_on_violation_date",
        candidate_contract_ids: (result.data || []).map((candidate) => candidate.id)
      });
      return "notice";
    }
    contract = result.data?.[0] || null;
  }
  const penaltyNumber = notice.penaltyNumber || `MOI-${notice.plate}-${notice.date}-${notice.amount}`;
  const reason = notice.fineKind === "radar" ? "\u0645\u062E\u0627\u0644\u0641\u0629 \u0631\u0627\u062F\u0627\u0631" : "\u0645\u062E\u0627\u0644\u0641\u0629 \u0645\u0631\u0648\u0631\u064A\u0629";
  const { data: penalty, error } = await admin.from("penalties").insert({
    company_id: companyId,
    vehicle_id: vehicle?.id || null,
    contract_id: contract?.id || null,
    customer_id: contract?.customer_id || null,
    penalty_number: penaltyNumber,
    violation_type: reason,
    penalty_date: notice.date,
    amount: notice.amount,
    location: null,
    vehicle_plate: notice.plate,
    reason,
    status: "pending",
    payment_status: "unpaid",
    notes: `\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u062A\u0644\u0642\u0627\u0626\u064A \u0645\u0646 \u0628\u0631\u064A\u062F \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0639\u0628\u0631 Microsoft Graph${notice.recordedSpeed ? ` | \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0645\u0633\u062C\u0644\u0629: ${notice.recordedSpeed} \u0643\u0644\u0645/\u0633\u0627\u0639\u0629` : ""}`
  }).select("id").single();
  if (error) throw error;
  await logNotice(admin, companyId, notice, message, { penalty_id: penalty.id, vehicle_id: vehicle?.id || null, plate_number: notice.plate, notice_date: notice.date });
  return "inserted";
}
async function findVehicle(admin, companyId, plate) {
  const normalized = normalizeMoiPlate(plate);
  const withoutZeros = normalized.replace(/^0+/, "");
  const variants = [.../* @__PURE__ */ new Set([
    normalized,
    withoutZeros,
    withoutZeros.padStart(6, "0"),
    withoutZeros.padStart(7, "0"),
    withoutZeros.padStart(8, "0")
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
async function refreshGraphToken() {
  const tenant = Deno.env.get("GRAPH_TENANT_ID") || "consumers";
  const clientId = requiredEnv("GRAPH_CLIENT_ID"), clientSecret = requiredEnv("GRAPH_CLIENT_SECRET"), refreshToken = requiredEnv("GRAPH_REFRESH_TOKEN");
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token", scope: "offline_access Mail.Read" })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`Microsoft authorization failed (${response.status})`);
  return payload.access_token;
}
async function graphGet(token, url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(`Microsoft Graph request failed (${response.status})`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(Number(response.headers.get("Retry-After") || 2) * 1e3, 1e4)));
  }
  throw new Error("Microsoft Graph request failed");
}
async function findTrafficFolder(token) {
  const configured = Deno.env.get("GRAPH_FOLDER_NAME")?.toLocaleLowerCase();
  const mailbox = Deno.env.get("GRAPH_MAILBOX");
  const owner = mailbox ? `/users/${encodeURIComponent(mailbox)}` : "/me";
  const pending = [`${GRAPH_ROOT}${owner}/mailFolders?$select=id,displayName,childFolderCount&$top=100&includeHiddenFolders=true`];
  while (pending.length) {
    let url = pending.shift();
    while (url) {
      const page = await graphGet(token, url);
      const match = page.value.find((folder) => configured ? folder.displayName.toLocaleLowerCase().includes(configured) : DEFAULT_FOLDER_HINTS.some((hint) => folder.displayName.toLocaleLowerCase().includes(hint)));
      if (match) return match;
      for (const folder of page.value) if (folder.childFolderCount) pending.push(`${GRAPH_ROOT}${owner}/mailFolders/${encodeURIComponent(folder.id)}/childFolders?$select=id,displayName,childFolderCount&$top=100&includeHiddenFolders=true`);
      url = page["@odata.nextLink"];
    }
  }
  throw new Error("\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u062C\u0644\u062F \u0628\u0631\u064A\u062F \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u062D\u062F\u062F");
}
async function listNewMessages(token, folderId, watermark) {
  const mailbox = Deno.env.get("GRAPH_MAILBOX");
  const owner = mailbox ? `/users/${encodeURIComponent(mailbox)}` : "/me";
  const filter = `receivedDateTime gt ${new Date(watermark).toISOString()} and from/emailAddress/address eq '${MOI_SENDER}'`;
  let url = `${GRAPH_ROOT}${owner}/mailFolders/${encodeURIComponent(folderId)}/messages?$select=id,internetMessageId,subject,receivedDateTime,from,body,bodyPreview&$top=50&$filter=${encodeURIComponent(filter)}`;
  const messages = [];
  while (url) {
    const page = await graphGet(token, url);
    messages.push(...page.value.filter((m) => m.from?.emailAddress?.address?.toLowerCase() === MOI_SENDER));
    url = page["@odata.nextLink"];
  }
  return messages;
}
async function loadState(admin, companyId) {
  const { data, error } = await admin.from("traffic_mail_ingest_state").select("*").eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  return data;
}
async function getStatus(admin, companyId) {
  const state = await loadState(admin, companyId);
  return { configured: ["GRAPH_CLIENT_ID", "GRAPH_CLIENT_SECRET", "GRAPH_REFRESH_TOKEN"].every((key) => Boolean(Deno.env.get(key))), state };
}
async function finishSync(admin, companyId, syncLease, result) {
  const { watermark_received_at, graph_folder_id, graph_folder_name, ...summary } = result;
  const { data, error } = await admin.from("traffic_mail_ingest_state").update({ watermark_received_at, graph_folder_id, graph_folder_name, last_sync_at: (/* @__PURE__ */ new Date()).toISOString(), last_sync_status: "success", last_error: null, last_result: summary, sync_lease_token: null, sync_lease_expires_at: null, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("company_id", companyId).eq("sync_lease_token", syncLease).select("company_id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Traffic mail synchronization lease expired");
}
async function claimMessage(admin, companyId, message) {
  const { data, error } = await admin.from("traffic_mail_processed_messages").insert({ company_id: companyId, graph_message_id: message.id, internet_message_id: message.internetMessageId, received_at: message.receivedDateTime, subject: message.subject, processing_status: "processing" }).select("id").single();
  if (!error) return data.id;
  if (error.code !== "23505") throw error;
  const { data: failed, error: failedLookupError } = await admin.from("traffic_mail_processed_messages").select("id").eq("company_id", companyId).eq("graph_message_id", message.id).eq("processing_status", "failed").maybeSingle();
  if (failedLookupError) throw failedLookupError;
  if (!failed) return null;
  const { data: reclaimed, error: reclaimError } = await admin.from("traffic_mail_processed_messages").update({ processing_status: "processing", error_message: null }).eq("id", failed.id).eq("processing_status", "failed").select("id").maybeSingle();
  if (reclaimError) throw reclaimError;
  return reclaimed?.id || null;
}
async function finalizeMessage(admin, id, type, status, result, error) {
  const response = await admin.from("traffic_mail_processed_messages").update({ notice_type: type, processing_status: status, result, error_message: error, processed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
  if (response.error) throw response.error;
}
async function logNotice(admin, companyId, notice, message, links) {
  const { data: processed } = await admin.from("traffic_mail_processed_messages").select("id").eq("company_id", companyId).eq("graph_message_id", message.id).maybeSingle();
  const { error } = await admin.from("traffic_mail_notices").insert({ company_id: companyId, processed_message_id: processed?.id || null, notice_type: notice.type, details: notice, ...links });
  if (error) throw error;
}
function appendNote(current, next) {
  return current?.includes(next) ? current : [current, next].filter(Boolean).join(" | ");
}
function safeError(error) {
  return (error instanceof Error ? error.message : String(error)).replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]").slice(0, 1e3);
}
function requiredEnv(name) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
}
