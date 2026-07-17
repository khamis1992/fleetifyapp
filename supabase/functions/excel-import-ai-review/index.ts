import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tone = "success" | "warning" | "danger" | "info";

interface AiInsight {
  tone: Tone;
  title: string;
  description: string;
}

interface FileReview {
  fileId: string;
  title: string;
  explanation: string;
  recommendedAction: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    if (body?.action === "plan") {
      return jsonResponse(await planExcelImport(req, body));
    }
    if (body?.action === "complete") {
      return jsonResponse(await completeExcelImport(req, body));
    }

    const { session } = body;
    if (!session) return jsonResponse({ error: "session is required" }, 400);

    const fallback = buildFallbackReview(session);
    const longCatApiKey = getLongCatApiKey();

    if (!longCatApiKey) {
      return jsonResponse(fallback);
    }

    const prompt = `
You are an Arabic AI assistant for bulk Excel payment import in a Qatar car rental ERP.
Return ONLY valid JSON:
{
  "summary": "Arabic one sentence",
  "insights": [
    {"tone": "success|warning|danger|info", "title": "Arabic", "description": "Arabic"}
  ],
  "fileReviews": [
    {
      "fileId": "same id from input",
      "title": "Arabic short title",
      "explanation": "Arabic explanation of why this customer failed/needs review/is ready",
      "recommendedAction": "Arabic next action",
      "confidence": 0-100,
      "riskLevel": "low|medium|high"
    }
  ]
}

Rules:
- Arabic only.
- Explain failure causes in business language, not raw database errors.
- Matching priority must be: personal ID first, then phone, then vehicle plate.
- Mention duplicate invoice/payment risk before approval when present.
- Mention contract-overpayment risk when projected total exceeds the contract amount or the provided message indicates it.
- Give confidence for each reviewed file.
- Do not invent contracts. Use only candidates and matched contracts provided in the input.
- Maximum 4 insights and maximum 12 fileReviews.

Session JSON:
${JSON.stringify(session)}
`;

    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(longCatApiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a concise Arabic operations assistant. You review bulk payment imports and return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
        thinking: { type: "disabled" },
      }),
    });

    if (!response.ok) {
      console.error("LongCat excel import review error:", response.status, await response.text());
      return jsonResponse(fallback);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = content ? parseLongCatJson(content) : {};
    return jsonResponse(normalizeReview(parsed, fallback));
  } catch (error) {
    console.error("excel-import-ai-review failed:", error);
    return jsonResponse(
      {
        error: describeError(error),
        fallback: true,
      },
      500,
    );
  }
});

function describeError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.message, value.details, value.hint, value.code]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    if (parts.length) return Array.from(new Set(parts)).join(" | ").slice(0, 4000);
  }
  return String(error || "Unknown error").slice(0, 4000);
}

type ImportRow = {
  key: string;
  rowNumber: number;
  month: string;
  monthKey: string | null;
  paymentAmount: number;
  remainingAmount: number;
  maintenanceAmount: number;
  delayDays: number;
  delayValue: number;
  trafficAmount: number;
  unclassifiedAmount: number;
  sourceText: string;
};

type TextClassification = {
  category: "payment" | "maintenance" | "late_fee" | "traffic_violation" | "note";
  amount: number;
  days: number;
  confidence: number;
  explanation: string;
};

type PlannedAction = {
  id: string;
  rowId: string | null;
  rowKey: string;
  command: string;
  field: "paymentAmount" | "maintenanceAmount" | "delayValue" | "trafficAmount" | "none";
  delta: number;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  confidence: number;
  beforeState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
  status: "planned" | "review" | "skipped";
};

async function authorize(req: Request, requestedCompanyId: string) {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Authentication required");

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) throw new Error("Excel import agent is not configured");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Invalid session");

  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
    admin.from("profiles").select("company_id,is_active").eq("user_id", authData.user.id).eq("is_active", true).limit(1).maybeSingle(),
    admin.from("user_roles").select("role,company_id").eq("user_id", authData.user.id),
  ]);
  if (profileError) throw profileError;
  if (rolesError) throw rolesError;
  const isSuperAdmin = (roles || []).some((role: { role: string }) => role.role === "super_admin");
  if (!isSuperAdmin && profile?.company_id !== requestedCompanyId) throw new Error("Company access denied");

  return { admin, userId: authData.user.id };
}

async function planExcelImport(req: Request, body: any) {
  const companyId = String(body?.companyId || "");
  const contractId = String(body?.contractId || "");
  const file = body?.file || {};
  const contentHash = String(file?.contentHash || "").toLowerCase();
  if (!companyId || !contractId || !/^[0-9a-f]{64}$/.test(contentHash)) {
    throw new Error("A valid company, contract, and content hash are required");
  }

  const { admin, userId } = await authorize(req, companyId);
  const { data: contract, error: contractError } = await admin
    .from("contracts")
    .select("id,contract_number,company_id")
    .eq("id", contractId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (contractError) throw contractError;
  if (!contract) throw new Error("Contract was not found in the active company");

  const { data: exactVersion, error: exactError } = await admin
    .from("excel_import_versions")
    .select("id,contract_id,status,approved_at,summary")
    .eq("company_id", companyId)
    .eq("content_hash", contentHash)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exactVersion) {
    if (exactVersion.contract_id !== contractId) {
      throw new Error("This workbook was already approved for a different contract. Verify the customer and vehicle plate before importing it again.");
    }
    return {
      ok: true,
      exactDuplicate: true,
      versionId: exactVersion.id,
      previousApprovedAt: exactVersion.approved_at,
      summary: { unchanged: true, executable: 0, review: 0, actions: 0 },
      actions: [],
      effectiveRows: [],
    };
  }

  const { data: previousVersion, error: previousVersionError } = await admin
    .from("excel_import_versions")
    .select("id,approved_at")
    .eq("company_id", companyId)
    .eq("contract_id", contractId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousVersionError) throw previousVersionError;

  const rawRows = Array.isArray(file?.rows) ? file.rows.slice(0, 600) : [];
  const rows = normalizeImportRows(rawRows);
  if (rows.length === 0) throw new Error("The workbook has no importable monthly rows");

  const classifications = await classifyImportTexts(rows);
  const classifiedRows = rows.map((row) => applyTextClassification(row, classifications.get(rowKey(row))));

  let previousRows: any[] = [];
  if (previousVersion?.id) {
    const { data, error } = await admin
      .from("excel_import_version_rows")
      .select("id,row_key,source_row_number,month_label,month_key,payment_amount,remaining_amount,maintenance_amount,delay_days,delay_value,traffic_amount,source_text,classification")
      .eq("version_id", previousVersion.id);
    if (error) throw error;
    previousRows = data || [];
  }
  const previousByKey = new Map(previousRows.map((row) => [String(row.row_key), row]));

  const { data: version, error: versionError } = await admin
    .from("excel_import_versions")
    .upsert({
      company_id: companyId,
      contract_id: contractId,
      content_hash: contentHash,
      file_name: String(file?.fileName || "workbook.xlsx").slice(0, 500),
      status: "analyzed",
      previous_version_id: previousVersion?.id || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,contract_id,content_hash" })
    .select("id,system_agent_run_id")
    .single();
  if (versionError) throw versionError;

  await admin.from("excel_import_agent_actions").delete().eq("version_id", version.id);
  await admin.from("excel_import_version_rows").delete().eq("version_id", version.id);
  if (version.system_agent_run_id) {
    await admin.from("excel_import_versions").update({
      system_agent_run_id: null,
      system_agent_job_id: null,
    }).eq("id", version.id);
    await admin.from("system_agent_runs").delete().eq("id", version.system_agent_run_id);
  }

  const snapshots = classifiedRows.map((row) => {
    const key = rowKey(row);
    const previous = previousByKey.get(key);
    previousByKey.delete(key);
    return {
      id: crypto.randomUUID(),
      version_id: version.id,
      company_id: companyId,
      row_key: key,
      source_row_number: row.rowNumber,
      month_label: row.month,
      month_key: row.monthKey,
      payment_amount: row.paymentAmount,
      remaining_amount: row.remainingAmount,
      maintenance_amount: row.maintenanceAmount,
      delay_days: row.delayDays,
      delay_value: row.delayValue,
      traffic_amount: row.trafficAmount,
      source_text: row.sourceText.slice(0, 4000) || null,
      classification: classifications.get(key) || {},
      diff_type: diffType(row, previous),
      previous_row_id: previous?.id || null,
    };
  });
  for (const previous of previousByKey.values()) {
    snapshots.push({
      id: crypto.randomUUID(),
      version_id: version.id,
      company_id: companyId,
      row_key: `removed:${previous.row_key}`,
      source_row_number: Number(previous.source_row_number || 0),
      month_label: String(previous.month_label || ""),
      month_key: previous.month_key,
      payment_amount: 0,
      remaining_amount: 0,
      maintenance_amount: 0,
      delay_days: 0,
      delay_value: 0,
      traffic_amount: 0,
      source_text: null,
      classification: {},
      diff_type: "removed",
      previous_row_id: previous.id,
    });
  }
  const { error: rowsError } = await admin.from("excel_import_version_rows").insert(snapshots);
  if (rowsError) throw rowsError;

  const previousRowsForActions = new Map(previousRows.map((row) => [String(row.row_key), row]));
  const actions = buildActions(classifiedRows, snapshots, previousRowsForActions);
  for (const previous of previousByKey.values()) {
    actions.push({
      id: crypto.randomUUID(), rowId: null, rowKey: String(previous.row_key), command: "excel_import.reverse_payment",
      field: "none", delta: 0, riskLevel: "high", approvalRequired: true, confidence: 1,
      beforeState: rowStateFromDb(previous), proposedState: { removed: true }, status: "review",
    });
  }

  const runId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  const reviewCount = actions.filter((action) => action.status === "review").length;
  const executableCount = actions.filter((action) => action.status === "planned").length;
  const summary = {
    unchanged: actions.every((action) => action.command === "excel_import.no_change"),
    executable: executableCount,
    review: reviewCount,
    actions: actions.length,
    previousVersionId: previousVersion?.id || null,
    previousApprovedAt: previousVersion?.approved_at || null,
  };

  const { error: runError } = await admin.from("system_agent_runs").insert({
    id: runId,
    requested_company_id: companyId,
    requested_domains: ["accounting"],
    mode: "apply",
    status: reviewCount > 0 ? "partial" : "running",
    trigger_source: "excel_import",
    idempotency_key: `excel-import:${companyId}:${contractId}:${contentHash}`,
    settings: { versionId: version.id, contractId, fileName: file?.fileName || null },
    summary,
    initiated_by: userId,
    started_at: now,
  });
  if (runError) throw runError;
  const { error: jobError } = await admin.from("system_agent_jobs").insert({
    id: jobId,
    run_id: runId,
    company_id: companyId,
    domain: "accounting",
    mode: "apply",
    status: reviewCount > 0 ? "completed" : "running",
    batch_size: Math.min(500, Math.max(1, rows.length)),
    stats: { scanned: rows.length, findings: actions.length, repaired: 0, verified: 0, review: reviewCount },
    started_at: now,
    finished_at: reviewCount > 0 ? now : null,
  });
  if (jobError) throw jobError;

  const findings = actions.map((action) => ({
    id: crypto.randomUUID(),
    run_id: runId,
    job_id: jobId,
    company_id: companyId,
    domain: action.command === "excel_import.create_maintenance" ? "fleet" : "accounting",
    dedupe_key: `${version.id}:${action.id}`,
    code: action.command,
    severity: action.riskLevel === "high" ? "high" : action.riskLevel === "medium" ? "medium" : "low",
    entity_type: "excel_import_row",
    entity_id: action.rowKey,
    title: actionTitle(action.command),
    details: actionDetails(action),
    evidence: { actionId: action.id, versionId: version.id, before: action.beforeState, proposed: action.proposedState },
    confidence: action.confidence,
    repair_command: action.command,
    repair_payload: action.proposedState,
    status: action.status === "review" ? "review" : action.command === "excel_import.no_change" ? "ignored" : "planned",
    ai_decision: classifications.get(action.rowKey) || null,
  }));
  if (findings.length) {
    const { error } = await admin.from("system_agent_findings").insert(findings);
    if (error) throw error;
  }
  const findingByActionId = new Map(findings.map((finding) => [String((finding.evidence as any).actionId), finding.id]));
  if (actions.length) {
    const { error } = await admin.from("excel_import_agent_actions").insert(actions.map((action) => ({
      id: action.id,
      version_id: version.id,
      row_id: action.rowId,
      company_id: companyId,
      finding_id: findingByActionId.get(action.id) || null,
      command: action.command,
      risk_level: action.riskLevel,
      approval_required: action.approvalRequired,
      confidence: action.confidence,
      status: action.status,
      before_state: action.beforeState,
      proposed_state: action.proposedState,
    })));
    if (error) throw error;
  }
  const { error: versionUpdateError } = await admin.from("excel_import_versions").update({
    system_agent_run_id: runId,
    system_agent_job_id: jobId,
    status: reviewCount > 0 ? "review" : "analyzed",
    summary,
    updated_at: now,
  }).eq("id", version.id);
  if (versionUpdateError) throw versionUpdateError;

  return {
    ok: true,
    exactDuplicate: false,
    versionId: version.id,
    runId,
    summary,
    actions,
    effectiveRows: buildEffectiveRows(classifiedRows, actions),
  };
}

async function completeExcelImport(req: Request, body: any) {
  const companyId = String(body?.companyId || "");
  const versionId = String(body?.versionId || "");
  const success = body?.success === true;
  if (!companyId || !versionId) throw new Error("companyId and versionId are required");
  const { admin, userId } = await authorize(req, companyId);
  const { data: version, error } = await admin.from("excel_import_versions")
    .select("id,system_agent_run_id,system_agent_job_id")
    .eq("id", versionId).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  if (!version) throw new Error("Excel import version was not found");

  const now = new Date().toISOString();
  const executionResult = body?.result && typeof body.result === "object" ? body.result : {};
  await admin.from("excel_import_versions").update({
    status: success ? "approved" : "failed",
    approved_at: success ? now : null,
    summary: executionResult,
    updated_at: now,
  }).eq("id", versionId).eq("company_id", companyId);

  const { data: actions } = await admin.from("excel_import_agent_actions")
    .select("id,finding_id,status")
    .eq("version_id", versionId).eq("company_id", companyId);
  const executable = (actions || []).filter((action: any) => action.status === "planned");
  const findingIds = executable.map((action: any) => action.finding_id).filter(Boolean);
  if (executable.length) {
    await admin.from("excel_import_agent_actions").update({
      status: success ? "applied" : "failed",
      execution_result: executionResult,
      executed_by: userId,
      executed_at: now,
      error: success ? null : String(body?.error || "Excel import failed").slice(0, 2000),
      updated_at: now,
    }).in("id", executable.map((action: any) => action.id));
  }
  if (findingIds.length) {
    await admin.from("system_agent_findings").update({
      status: success ? "repaired" : "failed",
      error: success ? null : String(body?.error || "Excel import failed").slice(0, 2000),
      updated_at: now,
    }).in("id", findingIds);
  }
  if (version.system_agent_job_id) {
    await admin.from("system_agent_jobs").update({
      status: success ? "completed" : "failed",
      stats: { repaired: success ? executable.length : 0, repairFailed: success ? 0 : executable.length },
      last_error: success ? null : String(body?.error || "Excel import failed").slice(0, 2000),
      finished_at: now,
      updated_at: now,
    }).eq("id", version.system_agent_job_id);
  }
  if (version.system_agent_run_id) {
    await admin.from("system_agent_runs").update({
      status: success ? "completed" : "failed",
      summary: executionResult,
      error: success ? null : String(body?.error || "Excel import failed").slice(0, 2000),
      finished_at: now,
      updated_at: now,
    }).eq("id", version.system_agent_run_id);
  }
  return { ok: true, versionId, status: success ? "approved" : "failed" };
}

function normalizeImportRows(rows: any[]): ImportRow[] {
  const normalized = rows.map((row, index) => ({
    key: "",
    rowNumber: Math.max(1, Math.trunc(Number(row?.rowNumber || index + 1))),
    month: String(row?.month || "").trim(),
    monthKey: typeof row?.monthKey === "string" && /^\d{4}-\d{2}$/.test(row.monthKey) ? row.monthKey : null,
    paymentAmount: nonNegative(row?.paymentAmount),
    remainingAmount: nonNegative(row?.remainingAmount),
    maintenanceAmount: nonNegative(row?.maintenanceAmount),
    delayDays: Math.max(0, Math.trunc(Number(row?.delayDays || 0))),
    delayValue: nonNegative(row?.delayValue),
    trafficAmount: nonNegative(row?.trafficAmount),
    unclassifiedAmount: nonNegative(row?.unclassifiedAmount),
    sourceText: String(row?.sourceText || "").trim(),
  })).filter((row) => row.month);

  const totals = new Map<string, number>();
  for (const row of normalized) {
    const base = baseRowKey(row);
    totals.set(base, (totals.get(base) || 0) + 1);
  }
  const occurrences = new Map<string, number>();
  for (const row of normalized) {
    const base = baseRowKey(row);
    const occurrence = (occurrences.get(base) || 0) + 1;
    occurrences.set(base, occurrence);
    row.key = (totals.get(base) || 0) > 1 ? `${base}#${occurrence}` : base;
  }
  return normalized;
}

function baseRowKey(row: Pick<ImportRow, "month" | "monthKey">) {
  return row.monthKey || `month:${row.month.replace(/\s+/g, "-").toLowerCase()}`;
}

function rowKey(row: ImportRow) {
  return row.key;
}

function nonNegative(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 1000) / 1000) : 0;
}

function rowState(row: ImportRow) {
  return {
    paymentAmount: row.paymentAmount,
    remainingAmount: row.remainingAmount,
    maintenanceAmount: row.maintenanceAmount,
    delayDays: row.delayDays,
    delayValue: row.delayValue,
    trafficAmount: row.trafficAmount,
  };
}

function rowStateFromDb(row: any) {
  return {
    paymentAmount: nonNegative(row?.payment_amount),
    remainingAmount: nonNegative(row?.remaining_amount),
    maintenanceAmount: nonNegative(row?.maintenance_amount),
    delayDays: Math.max(0, Math.trunc(Number(row?.delay_days || 0))),
    delayValue: nonNegative(row?.delay_value),
    trafficAmount: nonNegative(row?.traffic_amount),
  };
}

function diffType(row: ImportRow, previous: any) {
  if (!previous) return "new";
  const before = rowStateFromDb(previous);
  const after = rowState(row);
  const fields = ["paymentAmount", "maintenanceAmount", "delayValue", "trafficAmount"] as const;
  if (fields.every((field) => before[field] === after[field])) return "unchanged";
  if (fields.some((field) => after[field] < before[field])) return "decreased";
  return "increased";
}

function buildActions(rows: ImportRow[], snapshots: any[], previousByKey: Map<string, any>): PlannedAction[] {
  const snapshotByKey = new Map(snapshots.map((snapshot) => [snapshot.row_key, snapshot]));
  const fieldCommands = [
    ["paymentAmount", "payment_amount", "excel_import.create_payment", "excel_import.increase_payment", "excel_import.reverse_payment"],
    ["maintenanceAmount", "maintenance_amount", "excel_import.create_maintenance", "excel_import.adjust_maintenance", "excel_import.adjust_maintenance"],
    ["delayValue", "delay_value", "excel_import.create_late_fee", "excel_import.adjust_late_fee", "excel_import.adjust_late_fee"],
    ["trafficAmount", "traffic_amount", "excel_import.create_traffic_violation", "excel_import.adjust_traffic_violation", "excel_import.adjust_traffic_violation"],
  ] as const;
  const actions: PlannedAction[] = [];

  for (const row of rows) {
    const key = rowKey(row);
    const snapshot = snapshotByKey.get(key);
    const previous = previousByKey.get(key);
    const before = rowStateFromDb(previous);
    const after = rowState(row);
    let hasChange = false;
    for (const [field, dbField, createCommand, increaseCommand, decreaseCommand] of fieldCommands) {
      const oldValue = Number(before[field] || 0);
      const newValue = Number(after[field] || 0);
      const delta = Math.round((newValue - oldValue) * 1000) / 1000;
      if (Math.abs(delta) < 0.001) continue;
      hasChange = true;
      const decrease = delta < 0;
      const increase = oldValue > 0 && delta > 0;
      actions.push({
        id: crypto.randomUUID(),
        rowId: snapshot?.id || null,
        rowKey: key,
        command: decrease ? decreaseCommand : increase ? increaseCommand : createCommand,
        field,
        delta,
        riskLevel: decrease ? "high" : increase ? "medium" : "low",
        approvalRequired: decrease || increase,
        confidence: 1,
        beforeState: { [dbField]: oldValue },
        proposedState: { [dbField]: newValue, delta, month: row.month, monthKey: row.monthKey },
        status: decrease ? "review" : "planned",
      });
    }
    if (!hasChange) {
      actions.push({
        id: crypto.randomUUID(), rowId: snapshot?.id || null, rowKey: key,
        command: "excel_import.no_change", field: "none", delta: 0,
        riskLevel: "low", approvalRequired: false, confidence: 1,
        beforeState: before, proposedState: after, status: "skipped",
      });
    }
  }
  return actions;
}

function buildEffectiveRows(rows: ImportRow[], actions: PlannedAction[]) {
  const actionsByRow = new Map<string, PlannedAction[]>();
  for (const action of actions) {
    if (action.status !== "planned") continue;
    const list = actionsByRow.get(action.rowKey) || [];
    list.push(action);
    actionsByRow.set(action.rowKey, list);
  }
  return rows.map((row) => {
    const effective = { ...row, paymentAmount: 0, maintenanceAmount: 0, delayValue: 0, trafficAmount: 0 };
    for (const action of actionsByRow.get(rowKey(row)) || []) {
      if (action.field !== "none") (effective as any)[action.field] = Math.max(0, action.delta);
    }
    return effective;
  }).filter((row) => row.paymentAmount > 0 || row.maintenanceAmount > 0 || row.delayValue > 0 || row.trafficAmount > 0);
}

async function classifyImportTexts(rows: ImportRow[]) {
  const candidates = rows.filter((row) => row.sourceText && /[\p{L}]/u.test(row.sourceText)).slice(0, 100);
  const result = new Map<string, TextClassification>();
  if (!candidates.length) return result;
  const apiKey = getLongCatApiKey();
  if (!apiKey) return result;

  const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: buildLongCatHeaders(apiKey),
    body: JSON.stringify({
      model: LONGCAT_MODEL,
      messages: [
        { role: "system", content: "You classify Arabic Excel accounting notes. Return strict JSON only. Never invent an amount or reclassify an existing structured payment." },
        { role: "user", content: `Classify only the unstructured or ambiguous amount in each row as payment, maintenance, late_fee, traffic_violation, or note. Existing structured fields are authoritative. If paymentAmount is already positive, commentary about cumulative payments or paying all installments is a note and must not create another payment. If unclassifiedAmount is positive, use that exact amount only when the adjacent words clearly identify one category; otherwise return note with amount 0. Never use remainingAmount as an action. Return {"rows":[{"rowKey":"","category":"note","amount":0,"days":0,"confidence":0.0,"explanation":"Arabic"}]}. Rows: ${JSON.stringify(candidates.map((row) => ({ rowKey: rowKey(row), text: row.sourceText.slice(0, 1200), paymentAmount: row.paymentAmount, maintenanceAmount: row.maintenanceAmount, delayValue: row.delayValue, trafficAmount: row.trafficAmount, unclassifiedAmount: row.unclassifiedAmount })))}` },
      ],
      temperature: 0,
      max_tokens: 2400,
      thinking: { type: "disabled" },
    }),
  });
  if (!response.ok) {
    console.error("LongCat Excel text classification error:", response.status, await response.text());
    return result;
  }
  try {
    const payload = await response.json();
    const parsed = parseLongCatJson(payload?.choices?.[0]?.message?.content || "{}");
    for (const item of Array.isArray(parsed?.rows) ? parsed.rows : []) {
      const category = ["payment", "maintenance", "late_fee", "traffic_violation", "note"].includes(item?.category) ? item.category : "note";
      result.set(String(item?.rowKey || ""), {
        category,
        amount: nonNegative(item?.amount),
        days: Math.max(0, Math.trunc(Number(item?.days || 0))),
        confidence: Math.min(1, Math.max(0, Number(item?.confidence || 0))),
        explanation: String(item?.explanation || "").slice(0, 1000),
      });
    }
  } catch (error) {
    console.warn("LongCat Excel text classification returned invalid JSON", error);
  }
  return result;
}

function parseLongCatJson(content: string) {
  const trimmed = String(content || "").trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;
  return JSON.parse(candidate || "{}");
}

function applyTextClassification(row: ImportRow, classification?: TextClassification) {
  if (!classification || classification.confidence < 0.95 || classification.amount <= 0) return row;
  if (classification.category === "payment" && row.paymentAmount <= 0) return { ...row, paymentAmount: classification.amount };
  if (classification.category === "maintenance" && row.maintenanceAmount <= 0) return { ...row, maintenanceAmount: classification.amount };
  if (classification.category === "late_fee" && row.delayValue <= 0) return { ...row, delayValue: classification.amount, delayDays: classification.days };
  if (classification.category === "traffic_violation" && row.trafficAmount <= 0) return { ...row, trafficAmount: classification.amount };
  return row;
}

function actionTitle(command: string) {
  const titles: Record<string, string> = {
    "excel_import.create_payment": "دفعة جديدة من ملف Excel",
    "excel_import.increase_payment": "زيادة مبلغ دفعة سابقة",
    "excel_import.reverse_payment": "تخفيض أو حذف دفعة سابقة",
    "excel_import.create_late_fee": "غرامة تأخير جديدة",
    "excel_import.adjust_late_fee": "تعديل غرامة تأخير",
    "excel_import.create_traffic_violation": "مخالفة مرورية جديدة",
    "excel_import.adjust_traffic_violation": "تعديل مخالفة مرورية",
    "excel_import.create_maintenance": "مصروف صيانة جديد",
    "excel_import.adjust_maintenance": "تعديل مصروف صيانة",
    "excel_import.no_change": "صف مطابق دون تغيير",
  };
  return titles[command] || "إجراء استيراد Excel";
}

function actionDetails(action: PlannedAction) {
  if (action.command === "excel_import.no_change") return `تحقق الوكيل من أن صف ${action.rowKey} لم يتغير.`;
  return `خطط الوكيل لتنفيذ ${action.command} على صف ${action.rowKey} بقيمة فرق ${action.delta}.`;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeReview(payload: any, fallback: any) {
  return {
    summary: typeof payload?.summary === "string" ? payload.summary : fallback.summary,
    source: "longcat",
    generatedAt: new Date().toISOString(),
    insights: Array.isArray(payload?.insights) && payload.insights.length
      ? payload.insights.slice(0, 4).map((item: any) => ({
          tone: normalizeTone(item?.tone),
          title: String(item?.title || "مراجعة الرفع"),
          description: String(item?.description || "راجع الملفات قبل الاعتماد."),
        }))
      : fallback.insights,
    fileReviews: Array.isArray(payload?.fileReviews) && payload.fileReviews.length
      ? payload.fileReviews.slice(0, 12).map((item: any) => ({
          fileId: String(item?.fileId || ""),
          title: String(item?.title || "مراجعة الملف"),
          explanation: String(item?.explanation || "يحتاج هذا الملف مراجعة قبل الاعتماد."),
          recommendedAction: String(item?.recommendedAction || "راجع المطابقة والبيانات."),
          confidence: clampNumber(item?.confidence, 0, 100, 60),
          riskLevel: normalizeRisk(item?.riskLevel),
        })).filter((item: FileReview) => item.fileId)
      : fallback.fileReviews,
  };
}

function buildFallbackReview(session: any) {
  const files = Array.isArray(session?.files) ? session.files : [];
  const failed = files.filter((file: any) => file.status === "failed");
  const review = files.filter((file: any) => file.status === "review_required");
  const duplicate = files.filter((file: any) => String(file.reason || "").toLowerCase().includes("duplicate"));
  const overpayment = files.filter((file: any) => String(file.reason || "").toLowerCase().includes("exceed"));

  const insights: AiInsight[] = [];
  if (failed.length) {
    insights.push({
      tone: "danger",
      title: `${failed.length} ملف فشل أثناء الاعتماد`,
      description: "راجع سبب كل ملف ثم أعد محاولة الملفات الفاشلة فقط بعد تصحيح السبب.",
    });
  }
  if (review.length) {
    insights.push({
      tone: "warning",
      title: `${review.length} ملف يحتاج مراجعة`,
      description: "الأولوية للمطابقة بالرقم الشخصي، ثم الجوال، ثم رقم المركبة.",
    });
  }
  if (duplicate.length) {
    insights.push({
      tone: "warning",
      title: "يوجد احتمال تكرار",
      description: "تأكد من عدم وجود فاتورة أو دفعة سابقة لنفس العقد والشهر قبل الاعتماد.",
    });
  }
  if (overpayment.length) {
    insights.push({
      tone: "danger",
      title: "يوجد تجاوز محتمل لقيمة عقد",
      description: "راجع إجمالي المدفوعات الحالية والمتوقعة قبل إضافة دفعات جديدة.",
    });
  }
  if (!insights.length) {
    insights.push({
      tone: "info",
      title: "تحليل الرفع جاهز",
      description: "راجع نسب الثقة والمطابقة قبل تنفيذ الاعتماد النهائي.",
    });
  }

  return {
    summary: "تم تجهيز مراجعة ذكية محلية لجلسة الرفع.",
    source: "local",
    generatedAt: new Date().toISOString(),
    insights: insights.slice(0, 4),
    fileReviews: files.slice(0, 12).map((file: any) => ({
      fileId: String(file.fileId || ""),
      title: file.status === "failed" ? "فشل الاعتماد" : file.status === "review_required" ? "يحتاج مراجعة" : "جاهز للمراجعة",
      explanation: String(file.reason || file.matchReason || "راجع بيانات الملف والمطابقة قبل الاعتماد."),
      recommendedAction: file.hasMatchedContract
        ? "راجع التكرار وسقف العقد ثم اعتمد الملف."
        : "ابحث عن العقد بالرقم الشخصي أولًا، ثم الجوال، ثم رقم المركبة.",
      confidence: clampNumber(file.matchConfidence ?? file.readConfidence, 0, 100, 50),
      riskLevel: file.status === "failed" ? "high" : file.status === "review_required" ? "medium" : "low",
    })),
  };
}

function normalizeTone(value: unknown): Tone {
  return value === "success" || value === "warning" || value === "danger" || value === "info" ? value : "info";
}

function normalizeRisk(value: unknown): FileReview["riskLevel"] {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
