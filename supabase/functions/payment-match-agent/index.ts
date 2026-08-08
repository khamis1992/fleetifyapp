/**
 * Payment Match Agent (Kimi K3)
 *
 * Suggests the best open invoice for an ambiguous incoming payment (name
 * variants, missing contract number, amount mismatch) with a confidence score.
 *
 * Body: { companyId, amount, payerName?, paymentDate?, notes?, limit? }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    if (!body.companyId || !body.amount) throw new Error("companyId and amount are required");

    const supabase = createServiceClient();
    const amount = Number(body.amount);
    const payerName = String(body.payerName || "").trim();

    // Candidate invoices: open, amount within a sane window.
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, total_amount, balance_due, due_date,
        contract_id, customer_id,
        customers(first_name_ar, last_name_ar, first_name, last_name),
        contracts(contract_number)
      `)
      .eq("company_id", body.companyId)
      .in("payment_status", ["unpaid", "partial", "overdue"])
      .gte("balance_due", Math.max(amount * 0.5, 1))
      .lte("balance_due", amount * 2.5)
      .order("due_date", { ascending: true })
      .limit(Math.min(Number(body.limit) || 15, 25));
    if (error) throw error;

    const candidates = (invoices || []) as Array<Record<string, any>>;
    if (candidates.length === 0) {
      return jsonResponse({ success: true, matched: false, reason: "لا توجد فواتير مفتوحة قريبة من المبلغ" });
    }

    const candidateLines = candidates.map((invoice, index) => {
      const customer = invoice.customers || {};
      const name = [customer.first_name_ar || customer.first_name, customer.last_name_ar || customer.last_name]
        .filter(Boolean).join(" ");
      return `${index + 1}) فاتورة ${invoice.invoice_number} — العميل: ${name} — المتبقي: ${invoice.balance_due} — الاستحقاق: ${invoice.due_date} — العقد: ${invoice.contracts?.contract_number || "-"}`;
    }).join("\n");

    const ai = await callKimiJson<{
      candidate_index?: number;
      confidence?: number;
      reasoning?: string;
    }>([
      {
        role: "system",
        content:
          "أنت مختص مطابقة دفعات في شركة تأجير سيارات. اختر أفضل فاتورة مرشحة للدفعة الواردة، أو لا تختر إذا لم يوجد تطابق معقول. قارن الاسم (مع اختلافات الكتابة العربية) والمبلغ والاستحقاق. أجب JSON فقط: candidate_index (رقم المرشح من القائمة أو 0 لعدم التطابق)، confidence (0-1)، reasoning (جملة عربية قصيرة).",
      },
      {
        role: "user",
        content: [
          `دفعة واردة: المبلغ ${amount}${payerName ? ` — باسم: ${payerName}` : ""}${body.paymentDate ? ` — التاريخ: ${body.paymentDate}` : ""}`,
          body.notes ? `ملاحظات الدفعة: ${body.notes}` : "",
          "المرشحون:",
          candidateLines,
        ].filter(Boolean).join("\n"),
      },
    ], { maxTokens: 500 });

    const index = Number(ai?.candidate_index || 0);
    const confidence = Math.min(Math.max(Number(ai?.confidence) || 0, 0), 1);
    const chosen = index >= 1 && index <= candidates.length ? candidates[index - 1] : null;

    if (chosen && confidence >= 0.6) {
      await storeAgentReview(supabase, {
        companyId: body.companyId,
        agentType: "payment_match",
        entityType: "invoices",
        entityId: chosen.id,
        verdict: confidence >= 0.85 ? "suggested" : "possible",
        confidence,
        summary: String(ai?.reasoning || "").substring(0, 300),
        details: {
          amount,
          payer_name: payerName,
          invoice_number: chosen.invoice_number,
          contract_id: chosen.contract_id,
          customer_id: chosen.customer_id,
        },
        model: KIMI_MODEL,
      });
    }

    return jsonResponse({
      success: true,
      matched: Boolean(chosen && confidence >= 0.6),
      invoiceId: chosen?.id || null,
      invoiceNumber: chosen?.invoice_number || null,
      contractId: chosen?.contract_id || null,
      customerId: chosen?.customer_id || null,
      confidence,
      reasoning: String(ai?.reasoning || ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
