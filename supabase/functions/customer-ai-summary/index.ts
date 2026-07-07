import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RiskLevel = "low" | "medium" | "high" | "critical";
type Recommendation = "accept" | "guarantee" | "temporary_reject";

interface CustomerAISummary {
  summary: string;
  paymentBehavior: string;
  riskLevel: RiskLevel;
  riskScore: number;
  bestContactMethod: string;
  repeatedIssues: string[];
  recommendation: Recommendation;
  recommendationReason: string;
  source: "openai" | "local";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const customer = body?.customer;
    const metrics = body?.metrics;

    if (!customer || !metrics) {
      return jsonResponse({ error: "customer and metrics are required" }, 400);
    }

    const fallback = buildFallback(metrics);
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAIApiKey) {
      return jsonResponse(fallback);
    }

    const prompt = `
You are a CRM risk assistant for a car rental ERP in Qatar.
Return ONLY valid JSON matching this shape:
{
  "summary": "Arabic one-sentence executive summary",
  "paymentBehavior": "Arabic description of payment behavior",
  "riskLevel": "low|medium|high|critical",
  "riskScore": number from 0 to 100,
  "bestContactMethod": "Arabic best contact method",
  "repeatedIssues": ["Arabic issue"],
  "recommendation": "accept|guarantee|temporary_reject",
  "recommendationReason": "Arabic reason"
}

Rules:
- Arabic only.
- Maximum 5 repeated issues.
- Recommendation means:
  accept = accept new contract
  guarantee = request guarantee or advance payment
  temporary_reject = temporarily reject until settlement
- Base the answer only on the provided metrics. Do not invent facts.
- If overdue amount is high or repeated unpaid violations exist, prefer guarantee or temporary_reject.

Customer JSON:
${JSON.stringify(customer)}

Metrics JSON:
${JSON.stringify(metrics)}
`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You produce concise Arabic CRM customer risk summaries for a car rental ERP. Return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.15,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!openAIResponse.ok) {
      console.error("OpenAI customer summary error:", openAIResponse.status, await openAIResponse.text());
      return jsonResponse(fallback);
    }

    const aiPayload = await openAIResponse.json();
    const content = aiPayload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    const result = normalizeResult(parsed, fallback);

    return jsonResponse(result);
  } catch (error) {
    console.error("customer-ai-summary failed:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      },
      500,
    );
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeResult(payload: any, fallback: CustomerAISummary): CustomerAISummary {
  return {
    summary: typeof payload?.summary === "string" ? payload.summary : fallback.summary,
    paymentBehavior: typeof payload?.paymentBehavior === "string" ? payload.paymentBehavior : fallback.paymentBehavior,
    riskLevel: normalizeRiskLevel(payload?.riskLevel, fallback.riskLevel),
    riskScore: clampScore(payload?.riskScore, fallback.riskScore),
    bestContactMethod: typeof payload?.bestContactMethod === "string" ? payload.bestContactMethod : fallback.bestContactMethod,
    repeatedIssues: Array.isArray(payload?.repeatedIssues) && payload.repeatedIssues.length > 0
      ? payload.repeatedIssues.slice(0, 5).map((issue: unknown) => String(issue))
      : fallback.repeatedIssues,
    recommendation: normalizeRecommendation(payload?.recommendation, fallback.recommendation),
    recommendationReason: typeof payload?.recommendationReason === "string"
      ? payload.recommendationReason
      : fallback.recommendationReason,
    source: "openai",
  };
}

function buildFallback(metrics: any): CustomerAISummary {
  const overdueAmount = toNumber(metrics?.overdueAmount, 0);
  const overdueInvoices = toNumber(metrics?.overdueInvoices, 0);
  const unpaidViolations = toNumber(metrics?.unpaidViolations, 0);
  const openFollowups = toNumber(metrics?.openFollowups, 0);
  const cancelledPayments = toNumber(metrics?.cancelledPayments, 0);
  const riskScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(45, overdueAmount / 1000) +
          Math.min(20, unpaidViolations * 4) +
          Math.min(15, openFollowups * 3) +
          Math.min(10, cancelledPayments * 5),
      ),
    ),
  );
  const riskLevel: RiskLevel = riskScore >= 75 ? "critical" : riskScore >= 55 ? "high" : riskScore >= 30 ? "medium" : "low";
  const repeatedIssues: string[] = [];

  if (overdueInvoices > 0) repeatedIssues.push(`تأخر في سداد ${overdueInvoices} فاتورة`);
  if (unpaidViolations > 0) repeatedIssues.push(`مخالفات غير مدفوعة بعدد ${unpaidViolations}`);
  if (openFollowups > 0) repeatedIssues.push(`متابعات مفتوحة بعدد ${openFollowups}`);
  if (cancelledPayments > 0) repeatedIssues.push("يوجد سجل دفعات ملغاة أو مرتجعة");
  if (repeatedIssues.length === 0) repeatedIssues.push("لا توجد مشاكل متكررة واضحة");

  let recommendation: Recommendation = "accept";
  let recommendationReason = "يمكن قبول عقد جديد مع المتابعة المعتادة لأن المخاطر الحالية منخفضة.";

  if (riskLevel === "critical" || overdueAmount > 10000) {
    recommendation = "temporary_reject";
    recommendationReason = "يفضل الرفض المؤقت حتى تسوية المتأخرات والمخالفات المفتوحة.";
  } else if (riskLevel === "high" || overdueAmount > 0 || unpaidViolations > 0) {
    recommendation = "guarantee";
    recommendationReason = "يمكن قبول عقد جديد بشرط طلب ضمان أو دفعة مقدمة بسبب وجود ملاحظات مالية.";
  }

  return {
    summary: `العميل لديه ${toNumber(metrics?.totalContracts, 0)} عقد و${overdueInvoices} فاتورة متأخرة، ومستوى المخاطر ${riskLabel(riskLevel)}.`,
    paymentBehavior: overdueAmount > 0
      ? `يوجد تأخر حالي بقيمة ${overdueAmount.toLocaleString("ar-QA")} ر.ق.`
      : "لا تظهر متأخرات واضحة في البيانات الحالية.",
    riskLevel,
    riskScore,
    bestContactMethod: toNumber(metrics?.successfulCalls, 0) > 0 ? "الاتصال المباشر" : "واتساب أو الرسائل",
    repeatedIssues,
    recommendation,
    recommendationReason,
    source: "local",
  };
}

function normalizeRiskLevel(value: unknown, fallback: RiskLevel): RiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : fallback;
}

function normalizeRecommendation(value: unknown, fallback: Recommendation): Recommendation {
  return value === "accept" || value === "guarantee" || value === "temporary_reject" ? value : fallback;
}

function riskLabel(level: RiskLevel) {
  return level === "critical" ? "حرج" : level === "high" ? "مرتفع" : level === "medium" ? "متوسط" : "منخفض";
}

function clampScore(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
