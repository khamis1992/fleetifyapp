/**
 * Correction Verifier Agent (Kimi K3)
 *
 * Verifies an employee's corrections from the legal-transfer review against
 * the strongest OCR evidence stored for that customer — "verify the verifier"
 * before the legal team relies on the correction.
 *
 * Body: { reviewId }  (legal_transfer_employee_reviews.id)
 */

import { callKimiJson, KIMI_MODEL } from "../_shared/kimi.ts";
import {
  agentCorsHeaders,
  authorizeGovernedAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  storeAgentReview,
  type AgentInvocationContext,
} from "../_shared/agent.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  let invocation: AgentInvocationContext | null = null;
  const supabase = createServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.companyId || !body.reviewId) throw new Error("companyId and reviewId are required");
    invocation = await authorizeGovernedAgent(req, "correction-verifier-agent", body.companyId);

    const { data: review, error } = await supabase
      .from("legal_transfer_employee_reviews")
      .select("id, company_id, contract_id, customer_id, corrected_fields, employee_decision")
      .eq("id", body.reviewId)
      .eq("company_id", body.companyId)
      .single();
    if (error || !review) throw new Error("Review not found");

    const corrected = (review.corrected_fields || {}) as Record<string, any>;
    const customerUpdates = (corrected.customer || {}) as Record<string, string>;
    if (Object.keys(customerUpdates).length === 0) {
      await finishAgentExecution(supabase, invocation, true, { verdict: "nothing_to_verify" });
      return jsonResponse({ success: true, verdict: "nothing_to_verify", summary: "لا توجد تصحيحات بيانات للتحقق منها" });
    }

    // Strongest OCR evidence for this customer across their contracts.
    const { data: proposals } = await supabase
      .from("customer_id_scan_proposals")
      .select("raw_text, extracted_data")
      .eq("company_id", review.company_id)
      .eq("customer_id", review.customer_id)
      .order("created_at", { ascending: false })
      .limit(5);

    const evidenceText = (proposals || [])
      .map((p) => (p.raw_text || "").substring(0, 1500))
      .filter(Boolean)
      .join("\n---\n")
      .substring(0, 4000);

    const correctionsText = Object.entries(customerUpdates)
      .map(([field, value]) => `- ${field}: «${value}»`)
      .join("\n");

    const ai = await callKimiJson<{
      verdict: "verified" | "contradicted" | "uncertain";
      confidence: number;
      summary: string;
      conflicts: string[];
    }>([
      {
        role: "system",
        content:
          "أنت مدقق بيانات. موظف صحح بيانات عميل يدوياً، ومهمتك التحقق من أن التصحيح لا يتعارض مع نصوص المستندات الممسوحة. تذكر تطبيع العربية (ة/ه، ى/ي، أ/إ) وصيغ التواريخ. أجب JSON فقط: verdict (verified|contradicted|uncertain)، confidence (0-1)، summary (جملة عربية)، conflicts (مصفوفة تعارضات قصيرة).",
      },
      {
        role: "user",
        content: [
          "تصحيحات الموظف:",
          correctionsText,
          "",
          "نصوص المستندات الممسوحة (الدليل):",
          evidenceText || "(لا يوجد دليل نصي مخزن)",
        ].join("\n"),
      },
    ], { maxTokens: 700 });

    const verdict = ai?.verdict === "verified" || ai?.verdict === "contradicted" ? ai.verdict : "uncertain";
    const result = {
      verdict,
      confidence: Math.min(Math.max(Number(ai?.confidence) || 0.5, 0), 1),
      summary: String(ai?.summary || "").substring(0, 400),
      details: {
        conflicts: Array.isArray(ai?.conflicts) ? ai.conflicts.slice(0, 6) : [],
        corrected_fields: customerUpdates,
      },
    };

    await storeAgentReview(supabase, {
      companyId: review.company_id,
      agentType: "correction_verify",
      entityType: "legal_transfer_employee_reviews",
      entityId: review.id,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      details: result.details,
      model: KIMI_MODEL,
    });

    await finishAgentExecution(supabase, invocation, true, { verdict: result.verdict });
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (invocation) {
      await finishAgentExecution(supabase, invocation, false, {}, "correction_verification_failed")
        .catch(() => undefined);
    }
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
