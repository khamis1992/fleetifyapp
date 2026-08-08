/**
 * Legal Case AI Reviewer (Kimi K3)
 *
 * Pre-filing gate for a legal case packet:
 *   1) Deterministic checks: claim amount vs open invoice balance + late fees,
 *      signed contract presence, traffic-proof presence when violations exist,
 *      customer national ID present.
 *   2) Kimi summarizes readiness and missing items in Arabic.
 * Stores the verdict in ai_agent_reviews (agent_type = legal_case).
 *
 * Body: { legalCaseId } | { companyId, limit? }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callKimiJson, KIMI_MODEL } from "../_shared/kimi.ts";
import {
  agentCorsHeaders,
  authorizeAgent,
  createServiceClient,
  jsonResponse,
  storeAgentReview,
} from "../_shared/agent.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  try {
    await authorizeAgent(req);
    const body = await req.json().catch(() => ({}));
    const supabase = createServiceClient();

    if (body.legalCaseId) {
      const result = await reviewCase(supabase, body.legalCaseId);
      return jsonResponse({ success: true, ...result });
    }

    if (!body.companyId) throw new Error("companyId is required");
    const { data: cases, error } = await supabase
      .from("legal_cases")
      .select("id")
      .eq("company_id", body.companyId)
      .in("case_status", ["open", "active", "pending", "under_review"])
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(body.limit) || 10, 20));
    if (error) throw error;

    const summary = { reviewed: 0, ready: 0, warnings: 0, notReady: 0, errors: 0 };
    for (const legalCase of cases || []) {
      try {
        const result = await reviewCase(supabase, legalCase.id);
        summary.reviewed++;
        if (result.verdict === "ready") summary.ready++;
        else if (result.verdict === "warning") summary.warnings++;
        else summary.notReady++;
      } catch (caseError) {
        summary.errors++;
        console.error(`Legal case review failed for ${legalCase.id}:`, caseError);
      }
    }
    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

async function reviewCase(supabase: SupabaseClient, legalCaseId: string) {
  const { data: legalCase, error } = await supabase
    .from("legal_cases")
    .select("id, company_id, contract_id, client_id, case_number, case_value, client_name, case_status")
    .eq("id", legalCaseId)
    .single();
  if (error || !legalCase) throw new Error("Legal case not found");

  const missing: string[] = [];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount, paid_amount, balance_due, status")
    .eq("company_id", legalCase.company_id)
    .eq("contract_id", legalCase.contract_id);
  const activeInvoices = (invoices || []).filter((invoice) =>
    !["cancelled", "canceled", "void", "voided", "deleted"].includes(
      String(invoice.status || "").toLowerCase(),
    )
  );
  const invoiceBalance = activeInvoices.reduce(
    (sum, invoice) => sum + Math.max(Number(invoice.balance_due || 0), 0),
    0,
  );

  const { data: contract } = await supabase
    .from("contracts")
    .select("contract_number, late_fine_amount, customer_id")
    .eq("id", legalCase.contract_id)
    .single();

  const expectedClaim = invoiceBalance + Number(contract?.late_fine_amount || 0);
  const claimAmount = Number(legalCase.case_value || 0);
  const claimDelta = Math.abs(expectedClaim - claimAmount);
  if (expectedClaim > 0 && claimDelta > Math.max(expectedClaim * 0.05, 50)) {
    missing.push(
      `مبلغ المطالبة (${claimAmount}) يختلف عن رصيد الفواتير + الغرامات (${expectedClaim}) بفارق ${claimDelta.toFixed(2)}`,
    );
  }

  const { data: documents } = await supabase
    .from("contract_documents")
    .select("document_type")
    .eq("company_id", legalCase.company_id)
    .eq("contract_id", legalCase.contract_id)
    .not("file_path", "is", null);
  const docTypes = new Set((documents || []).map((d) => d.document_type));
  if (!docTypes.has("signed_contract") && !docTypes.has("signed_contract_image")) {
    missing.push("نسخة العقد الموقعة غير موجودة");
  }

  const { count: violationCount } = await supabase
    .from("traffic_violations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", legalCase.company_id)
    .eq("contract_id", legalCase.contract_id);
  if ((violationCount || 0) > 0 && !docTypes.has("violations_proof")) {
    missing.push("يوجد مخالفات مرورية دون إثبات وزارة الداخلية/مطراش");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("national_id, first_name_ar, last_name_ar")
    .eq("id", legalCase.client_id || contract?.customer_id || "")
    .maybeSingle();
  if (!customer?.national_id) missing.push("الرقم الشخصي للعميل غير مسجل");

  const deterministicReady = missing.length === 0;

  const ai = await callKimiJson<{
    verdict: "ready" | "warning" | "not_ready";
    confidence: number;
    summary: string;
    missing: string[];
  }>([
    {
      role: "system",
      content:
        "أنت مراجع ملفات قانونية في شركة تأجير سيارات قطرية. قيّم جاهزية ملف الدعوى للرفع أمام المحكمة. أجب JSON فقط: verdict (ready|warning|not_ready)، confidence (0-1)، summary (جملة عربية)، missing (مصفوفة نواقص قصيرة).",
    },
    {
      role: "user",
      content: [
        `قضية ${legalCase.case_number} — العميل: ${legalCase.client_name} — مبلغ المطالبة: ${claimAmount}`,
        `رصيد الفواتير: ${invoiceBalance} — غرامات التأخير: ${contract?.late_fine_amount || 0} — مخالفات: ${violationCount || 0}`,
        missing.length > 0 ? `الفحوصات الشكلية رصدت: ${missing.join("؛ ")}` : "الفحوصات الشكلية سليمة.",
      ].join("\n"),
    },
  ]);

  const verdict = !deterministicReady
    ? "not_ready"
    : ai?.verdict === "ready" || ai?.verdict === "warning" || ai?.verdict === "not_ready"
    ? ai.verdict
    : "warning";

  const result = {
    verdict,
    confidence: Math.min(Math.max(Number(ai?.confidence) || 0.5, 0), 1),
    summary: ai?.summary?.substring(0, 400) ||
      (deterministicReady ? "الملف مكتمل شكلياً" : `ينقص الملف: ${missing[0]}`),
    details: {
      deterministic_missing: missing,
      ai_missing: Array.isArray(ai?.missing) ? ai.missing.slice(0, 6) : [],
      claim_amount: claimAmount,
      invoice_balance: invoiceBalance,
      late_fees: Number(contract?.late_fine_amount || 0),
    },
  };

  await storeAgentReview(supabase, {
    companyId: legalCase.company_id,
    agentType: "legal_case",
    entityType: "legal_cases",
    entityId: legalCase.id,
    verdict: result.verdict,
    confidence: result.confidence,
    summary: result.summary,
    details: result.details,
    model: deterministicReady ? KIMI_MODEL : "deterministic",
  });
  return result;
}
