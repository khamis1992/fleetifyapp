/**
 * Collection Message Agent (Kimi K3)
 *
 * Drafts a personalized Arabic WhatsApp collection message and a realistic
 * settlement suggestion based on the customer's actual payment behaviour.
 *
 * Body: { customerId } | { contractId }
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
    if (!body.customerId && !body.contractId) {
      throw new Error("customerId or contractId is required");
    }

    const supabase = createServiceClient();

    let customerId = body.customerId as string | undefined;
    let contractId = body.contractId as string | undefined;
    let contract: Record<string, unknown> | null = null;

    if (contractId) {
      const { data } = await supabase
        .from("contracts")
        .select("id, company_id, customer_id, contract_number, monthly_amount, balance_due, days_overdue")
        .eq("id", contractId)
        .single();
      contract = data;
      customerId = data?.customer_id;
    }
    if (!customerId) throw new Error("Customer not found for this request");

    const { data: customer } = await supabase
      .from("customers")
      .select("id, company_id, first_name_ar, last_name_ar, first_name, last_name, phone")
      .eq("id", customerId)
      .single();
    if (!customer) throw new Error("Customer not found");

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_date, payment_status")
      .eq("company_id", customer.company_id)
      .eq("customer_id", customerId)
      .eq("payment_status", "completed")
      .order("payment_date", { ascending: false })
      .limit(12);

    const { data: openInvoices } = await supabase
      .from("invoices")
      .select("total_amount, balance_due, due_date, status")
      .eq("company_id", customer.company_id)
      .eq("customer_id", customerId)
      .in("payment_status", ["unpaid", "partial", "overdue"]);

    const totalDue = (openInvoices || []).reduce(
      (sum, invoice) => sum + Math.max(Number(invoice.balance_due || 0), 0),
      0,
    );
    const paymentCount = (payments || []).length;
    const recentPayments = (payments || []).slice(0, 4)
      .map((p) => `${p.payment_date}: ${p.amount}`).join("، ");

    const customerName = [
      customer.first_name_ar || customer.first_name,
      customer.last_name_ar || customer.last_name,
    ].filter(Boolean).join(" ") || "العميل";

    const ai = await callKimiJson<{
      message: string;
      settlement: string;
      tone: string;
      best_time: string;
    }>([
      {
        role: "system",
        content:
          "أنت مختص تحصيل في شركة تأجير سيارات قطرية. اكتب رسالة واتساب تحصيل مخصصة بالعربية: مهذبة وحازمة، تذكر المبلغ وتدعو لإجراء واضح. قدّر خطة تسوية واقعية من سجل السداد. أجب JSON فقط: message (نص الرسالة)، settlement (اقتراح تسوية بجملة)، tone (ودي|حازم|أخير)، best_time (أفضل وقت للتواصل).",
      },
      {
        role: "user",
        content: [
          `العميل: ${customerName}`,
          contract ? `العقد: ${contract.contract_number} — المتأخر: ${contract.balance_due} — أيام التأخير: ${contract.days_overdue || 0}` : "",
          `إجمالي مستحق مفتوح: ${totalDue}`,
          paymentCount > 0 ? `سجل السداد الأخير (${paymentCount} دفعة): ${recentPayments}` : "لا يوجد سجل سداد سابق.",
          openInvoices?.length ? `فواتير مفتوحة: ${openInvoices.length}` : "",
        ].filter(Boolean).join("\n"),
      },
    ], { maxTokens: 900 });

    const message = String(ai?.message || "").substring(0, 1200);
    if (!message) throw new Error("تعذر توليد الرسالة");

    const result = {
      verdict: "generated",
      message,
      settlement: String(ai?.settlement || "").substring(0, 300),
      tone: String(ai?.tone || "ودي"),
      bestTime: String(ai?.best_time || ""),
    };

    await storeAgentReview(supabase, {
      companyId: customer.company_id,
      agentType: "collection_message",
      entityType: "customers",
      entityId: customerId,
      verdict: result.verdict,
      summary: `رسالة تحصيل مخصصة لـ ${customerName} (${result.tone})`,
      details: {
        message: result.message,
        settlement: result.settlement,
        best_time: result.bestTime,
        total_due: totalDue,
        contract_id: contractId || null,
      },
      model: KIMI_MODEL,
    });

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
