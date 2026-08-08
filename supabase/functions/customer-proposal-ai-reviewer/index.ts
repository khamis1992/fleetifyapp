/**
 * Customer Proposal AI Reviewer (Kimi K3 + vision)
 *
 * Reviews pending customer-data proposals (from the contract/ID scanner):
 *   1) Deterministic validators run first (free, instant): obvious passes are
 *      auto-confirmed, obvious failures are rejected without calling the model.
 *   2) Recent human decisions are injected as few-shot examples so the agent
 *      learns the review team's corrections over time.
 *   3) When an evidence image exists, it is sent to the vision model so the
 *      agent compares values against the document itself, not only OCR text.
 *   4) Conflicting proposals for the same customer/field across documents are
 *      flagged as conflicts and left for a human.
 *   5) A proposal is auto-approved only when the agent says "correct" AND
 *      every change has OCR confidence >= 95% AND the identity is confirmed
 *      by national ID when identity fields are involved.
 *
 * Modes:
 *   - batch:    { mode: "batch", companyId, limit? }
 *   - proposal: { mode: "proposal", proposalId }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callKimiJson, KIMI_MODEL, KIMI_VISION_MODEL } from "../_shared/kimi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-reviewer-secret",
};

const MAX_OCR_CHARS = 3500;
const AUTO_APPROVE_CONFIDENCE = 0.95;
const FEW_SHOT_LIMIT = 8;

const IDENTITY_FIELDS = new Set([
  "first_name_ar",
  "last_name_ar",
  "first_name",
  "last_name",
  "national_id",
]);

interface ProposedChange {
  field: string;
  current_value: string | null;
  proposed_value: string;
  confidence: number;
  method: string;
}

interface ProposalRow {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  status: string;
  proposed_changes: ProposedChange[];
  extracted_data: Record<string, unknown> | null;
  raw_text: string | null;
  evidence_label: string | null;
  evidence_image_path: string | null;
  evidence_image_bucket: string | null;
  overall_confidence: number | null;
}

interface AiVerdict {
  verdict: "correct" | "incorrect" | "uncertain";
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorize(req);

    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let result: unknown;
    if (body.mode === "proposal") {
      if (!body.proposalId) throw new Error("proposal mode requires proposalId");
      result = await reviewSingle(supabase, body.proposalId);
    } else {
      if (!body.companyId) throw new Error("batch mode requires companyId");
      result = await reviewBatch(
        supabase,
        body.companyId,
        Math.min(Number(body.limit) || 25, 50),
      );
    }

    return new Response(JSON.stringify({ success: true, ...result as object }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Proposal AI reviewer error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function authorize(req: Request): Promise<void> {
  const secret = req.headers.get("x-reviewer-secret");
  const expected = Deno.env.get("CONTRACT_SCANNER_SECRET");
  if (expected && secret === expected) return;

  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;

  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) return;
  }

  throw new Error("Unauthorized");
}

// ---------------------------------------------------------------------------
// Batch / single entry points
// ---------------------------------------------------------------------------

const PROPOSAL_SELECT =
  "id, company_id, contract_id, customer_id, status, proposed_changes, extracted_data, raw_text, evidence_label, evidence_image_path, evidence_image_bucket, overall_confidence";

async function reviewBatch(supabase: SupabaseClient, companyId: string, limit: number) {
  const { data: proposals, error } = await supabase
    .from("customer_id_scan_proposals")
    .select(PROPOSAL_SELECT)
    .eq("company_id", companyId)
    .in("status", ["pending", "partial"])
    .order("overall_confidence", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (proposals || []) as ProposalRow[];
  const fewShotExamples = await loadFewShotExamples(supabase, companyId);
  const conflicts = findCrossDocumentConflicts(rows);

  const summary = {
    reviewed: 0,
    ready: 0,
    uncertain: 0,
    incorrect: 0,
    conflicts: 0,
    autoApproved: 0,
    failed: 0,
  };

  for (const proposal of rows) {
    try {
      const conflict = conflicts.get(proposal.id);
      if (conflict) {
        await storeVerdict(supabase, proposal, {
          verdict: "uncertain",
          confidence: 0,
          reasoning: conflict,
        }, { conflict: true });
        summary.reviewed++;
        summary.conflicts++;
        continue;
      }

      const outcome = await reviewAndStore(supabase, proposal, fewShotExamples);
      summary.reviewed++;
      if (outcome.verdict === "correct") summary.ready++;
      else if (outcome.verdict === "incorrect") summary.incorrect++;
      else summary.uncertain++;
      if (outcome.autoApproved) summary.autoApproved++;
    } catch (error) {
      summary.failed++;
      console.error(`AI review failed for proposal ${proposal.id}:`, error);
    }
  }
  return summary;
}

async function reviewSingle(supabase: SupabaseClient, proposalId: string) {
  const { data: proposal, error } = await supabase
    .from("customer_id_scan_proposals")
    .select(PROPOSAL_SELECT)
    .eq("id", proposalId)
    .in("status", ["pending", "partial"])
    .single();
  if (error || !proposal) throw new Error("Open proposal not found");
  const fewShotExamples = await loadFewShotExamples(
    supabase,
    (proposal as ProposalRow).company_id,
  );
  const outcome = await reviewAndStore(supabase, proposal as ProposalRow, fewShotExamples);
  return { reviewed: 1, ...outcome };
}

// ---------------------------------------------------------------------------
// Deterministic validators — run before any model call
// ---------------------------------------------------------------------------

type DeterministicResult = "pass" | "fail" | "unknown";

function checkChange(
  change: ProposedChange,
  contractAmount: number,
): DeterministicResult {
  const value = change.proposed_value.trim();

  if (change.field === "national_id") {
    return /^\d{11}$/.test(value) ? "pass" : "fail";
  }

  if (change.field === "date_of_birth" || change.field === "national_id_expiry") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "fail";
    const year = date.getFullYear();
    if (change.field === "date_of_birth") {
      return year >= 1920 && year <= 2015 ? "pass" : "fail";
    }
    return year >= 2010 && year <= 2100 ? "pass" : "fail";
  }

  if (change.field === "monthly_amount") {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 100 || amount > 100000) return "fail";
    if (contractAmount > 0) {
      const months = contractAmount / amount;
      if (months >= 2 && months <= 60 && Math.abs(months - Math.round(months)) < 0.01) {
        return "pass";
      }
    }
    return "unknown";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Learning loop — few-shot examples from recent human decisions
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  first_name_ar: "الاسم الأول بالعربي",
  last_name_ar: "اسم العائلة بالعربي",
  national_id: "الرقم الشخصي",
  national_id_expiry: "تاريخ انتهاء البطاقة",
  nationality: "الجنسية",
  date_of_birth: "تاريخ الميلاد",
  monthly_amount: "الإيجار الشهري للعقد",
};

async function loadFewShotExamples(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("customer_id_scan_proposals")
    .select("status, proposed_changes")
    .eq("company_id", companyId)
    .in("status", ["accepted", "rejected", "partial"])
    .not("reviewed_at", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(FEW_SHOT_LIMIT);

  if (error || !data?.length) return "";

  const lines: string[] = [];
  for (const row of data) {
    const changes = Array.isArray(row.proposed_changes) ? row.proposed_changes : [];
    for (const change of changes.slice(0, 2)) {
      const label = FIELD_LABELS[change.field] || change.field;
      const decision = row.status === "rejected"
        ? "رفض المراجع المقترح"
        : change.method === "manual"
        ? `عدّله المراجع يدوياً إلى «${change.proposed_value}»`
        : "قبل المراجع المقترح";
      lines.push(`- ${label}: المقترح كان «${change.proposed_value}» → ${decision}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Cross-document conflict detection
// ---------------------------------------------------------------------------

function normalizeValue(value: string): string {
  return value
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function findCrossDocumentConflicts(rows: ProposalRow[]): Map<string, string> {
  const byCustomerField = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    for (const change of row.proposed_changes || []) {
      const key = `${row.customer_id}:${change.field}`;
      const bucket = byCustomerField.get(key) || new Map<string, string[]>();
      const normalized = normalizeValue(change.proposed_value);
      const ids = bucket.get(normalized) || [];
      ids.push(row.id);
      bucket.set(normalized, ids);
      byCustomerField.set(key, bucket);
    }
  }

  const conflicts = new Map<string, string>();
  for (const [key, bucket] of byCustomerField) {
    if (bucket.size <= 1) continue;
    const field = key.split(":")[1];
    const values = [...bucket.keys()];
    for (const ids of bucket.values()) {
      for (const id of ids) {
        conflicts.set(
          id,
          `تعارض بين المستندات: حقل «${FIELD_LABELS[field] || field}» له قراءات مختلفة (${values.join(" / ")}). يحتاج حسمًا بشريًا.`,
        );
      }
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------
// Core review
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadEvidenceImage(
  supabase: SupabaseClient,
  proposal: ProposalRow,
): Promise<string | null> {
  if (!proposal.evidence_image_path) return null;
  const bucket = proposal.evidence_image_bucket || "contract-documents";
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(proposal.evidence_image_path);
  if (error || !data) return null;
  const base64 = arrayBufferToBase64(await data.arrayBuffer());
  const mime = data.type || "image/png";
  return `data:${mime};base64,${base64}`;
}

function identityConfirmed(
  proposal: ProposalRow,
  customer: { national_id: string | null },
): boolean {
  const extracted = (proposal.extracted_data || {}) as Record<string, unknown>;
  const scannedId = typeof extracted.nationalId === "string" ? extracted.nationalId : null;
  if (scannedId && customer.national_id) {
    return scannedId === customer.national_id;
  }
  return false;
}

async function reviewAndStore(
  supabase: SupabaseClient,
  proposal: ProposalRow,
  fewShotExamples: string,
): Promise<AiVerdict & { autoApproved: boolean }> {
  const { data: customer } = await supabase
    .from("customers")
    .select("first_name_ar, last_name_ar, first_name, last_name, national_id, nationality")
    .eq("id", proposal.customer_id)
    .single();

  const { data: contract } = await supabase
    .from("contracts")
    .select("contract_number, monthly_amount, contract_amount")
    .eq("id", proposal.contract_id)
    .single();

  const changes = proposal.proposed_changes || [];
  const contractAmount = Number(contract?.contract_amount || 0);

  // 1) Deterministic layer: instant fail on impossible values, instant pass
  //    when every change is provably valid with high OCR confidence.
  const checks = changes.map((change) => checkChange(change, contractAmount));
  if (checks.includes("fail")) {
    const verdict: AiVerdict = {
      verdict: "incorrect",
      confidence: 0.99,
      reasoning: "قيمة مقترحة غير صالحة شكلياً (رقم شخصي/تاريخ/مبلغ خارج النطاق المقبول).",
    };
    await storeVerdict(supabase, proposal, verdict);
    return { ...verdict, autoApproved: false };
  }

  const allHighConfidence = changes.every((c) => c.confidence >= AUTO_APPROVE_CONFIDENCE);
  const involvesIdentity = changes.some((c) => IDENTITY_FIELDS.has(c.field));
  const identityOk = !involvesIdentity || identityConfirmed(proposal, customer || { national_id: null });

  let verdict: AiVerdict;
  let usedVision = false;

  if (checks.length > 0 && checks.every((c) => c === "pass") && allHighConfidence && identityOk) {
    verdict = {
      verdict: "correct",
      confidence: 0.99,
      reasoning: "اجتاز المقترح الفحوصات الحتمية بثقة عالية دون الحاجة للنموذج.",
    };
  } else {
    // 2) Model layer — with the evidence image when available.
    const imageDataUrl = await loadEvidenceImage(supabase, proposal);
    usedVision = imageDataUrl !== null;

    const changesText = changes.map((change) =>
      `- ${FIELD_LABELS[change.field] || change.field}: الحالي «${change.current_value ?? "فارغ"}» → المقترح «${change.proposed_value}» (ثقة ${Math.round(change.confidence * 100)}%)`
    ).join("\n");

    const userParts: Array<Record<string, unknown>> = [{
      type: "text",
      text: [
        `بيانات العميل الحالية: الاسم «${customer?.first_name_ar || ""} ${customer?.last_name_ar || ""}»، الرقم الشخصي «${customer?.national_id || "-"}»، الجنسية «${customer?.nationality || "-"}».`,
        `العقد: ${contract?.contract_number || "-"}، الإيجار الشهري المسجل: ${contract?.monthly_amount ?? "-"}، إجمالي العقد: ${contract?.contract_amount ?? "-"}.`,
        `التسمية المستخرجة من المستند: «${proposal.evidence_label || "-"}».`,
        "",
        "المقترحات:",
        changesText || "(لا توجد)",
        "",
        "النص الممسوح من المستند:",
        (proposal.raw_text || "").substring(0, MAX_OCR_CHARS) || "(لا يوجد نص)",
        usedVision ? "" : "",
        usedVision ? "مرفقة صورة الدليل من المستند — قارن القيم بالصورة مباشرة." : "",
        fewShotExamples ? `\nقرارات سابقة لفريق المراجعة (تعلّم منها):\n${fewShotExamples}` : "",
      ].filter(Boolean).join("\n"),
    }];
    if (imageDataUrl) {
      userParts.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    const raw = await callKimiJson<AiVerdict>([
      {
        role: "system",
        content:
          "أنت مدقق بيانات في نظام إدارة تأجير سيارات قطري. مهمتك الحكم على مقترحات تعديل بيانات مستخرجة بالـ OCR من عقود وبطاقات شخصية. عند إرفاق صورة، قارن القيم بالصورة مباشرة ولا تعتمد على نص OCR وحده. أجب بصيغة JSON فقط بالمفاتيح: verdict (correct|incorrect|uncertain)، confidence (0-1)، reasoning (جملة عربية قصيرة). اعتبر المقترح correct فقط إذا كان الدليل يؤكد القيمة المقترحة بوضوح. إذا كان الدليل غامضاً اختر uncertain. إذا أثبت الدليل قيمة مختلفة اختر incorrect.",
      },
      { role: "user", content: userParts },
    ], { vision: usedVision });

    verdict = {
      verdict: raw?.verdict === "correct" || raw?.verdict === "incorrect" ? raw.verdict : "uncertain",
      confidence: Math.min(Math.max(Number(raw?.confidence) || 0, 0), 1),
      reasoning: String(raw?.reasoning || "").substring(0, 500),
    };
  }

  // 3) Conditional auto-approval: agent says correct + OCR >= 95% per change
  //    + identity confirmed by national ID when identity fields are involved.
  const canAutoApprove = verdict.verdict === "correct" && allHighConfidence && identityOk;
  let autoApproved = false;
  if (canAutoApprove) {
    autoApproved = await applyProposal(supabase, proposal, changes);
  }

  await storeVerdict(supabase, proposal, verdict, { usedVision, autoApproved });
  return { ...verdict, autoApproved };
}

// ---------------------------------------------------------------------------
// Apply + store
// ---------------------------------------------------------------------------

async function applyProposal(
  supabase: SupabaseClient,
  proposal: ProposalRow,
  changes: ProposedChange[],
): Promise<boolean> {
  const customerUpdates: Record<string, unknown> = {};
  const contractUpdates: Record<string, unknown> = {};

  for (const change of changes) {
    if (change.field === "monthly_amount") {
      contractUpdates.monthly_amount = Number(change.proposed_value);
    } else {
      customerUpdates[change.field] = change.proposed_value;
    }
  }
  if (customerUpdates.first_name_ar) customerUpdates.first_name = customerUpdates.first_name_ar;
  if (customerUpdates.last_name_ar) customerUpdates.last_name = customerUpdates.last_name_ar;

  if (Object.keys(customerUpdates).length > 0) {
    const { error } = await supabase
      .from("customers")
      .update(customerUpdates)
      .eq("id", proposal.customer_id)
      .eq("company_id", proposal.company_id);
    if (error) {
      console.error(`Auto-approval customer update failed for ${proposal.id}:`, error);
      return false;
    }
  }

  if (Object.keys(contractUpdates).length > 0) {
    const { error } = await supabase
      .from("contracts")
      .update(contractUpdates)
      .eq("id", proposal.contract_id)
      .eq("company_id", proposal.company_id);
    if (error) {
      console.error(`Auto-approval contract update failed for ${proposal.id}:`, error);
      return false;
    }

    await supabase.from("contract_operations_log").insert({
      contract_id: proposal.contract_id,
      company_id: proposal.company_id,
      operation_type: "contract_fields_updated_from_id_review",
      operation_details: {
        proposal_id: proposal.id,
        auto_approved: true,
        applied_fields: changes.map((change) => ({
          field: change.field,
          from: change.current_value,
          to: change.proposed_value,
        })),
      },
      notes: "اعتمد وكيل Kimi تلقائياً قيماً مؤكدة من مستند العقد (ثقة 95%+ وهوية متحققة)",
      performed_by: null,
    });
  }

  const { error: statusError } = await supabase
    .from("customer_id_scan_proposals")
    .update({
      status: "accepted",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);
  if (statusError) {
    console.error(`Auto-approval status update failed for ${proposal.id}:`, statusError);
    return false;
  }
  return true;
}

async function storeVerdict(
  supabase: SupabaseClient,
  proposal: ProposalRow,
  verdict: AiVerdict,
  extras: { conflict?: boolean; usedVision?: boolean; autoApproved?: boolean } = {},
) {
  const { error } = await supabase
    .from("customer_id_scan_proposals")
    .update({
      extracted_data: {
        ...(proposal.extracted_data || {}),
        ai_review: {
          ...verdict,
          model: extras.usedVision ? KIMI_VISION_MODEL : KIMI_MODEL,
          used_vision: extras.usedVision === true,
          conflict: extras.conflict === true,
          auto_approved: extras.autoApproved === true,
          reviewed_at: new Date().toISOString(),
          label: extras.autoApproved
            ? "اعتمد آلياً — تحقق مؤكد"
            : extras.conflict
            ? "تعارض بين المستندات — يحتاج حسمًا"
            : verdict.verdict === "correct"
            ? "تم التدقيق — مقترح جاهز للاعتماد"
            : verdict.verdict === "incorrect"
            ? "الوكيل يرى المقترح غير صحيح"
            : "الوكيل غير متأكد — يحتاج مراجعة",
        },
      },
    })
    .eq("id", proposal.id);
  if (error) throw error;
}
