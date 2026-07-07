import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type HealthSeverity = "critical" | "warning" | "info" | "good";

interface HealthIssue {
  title: string;
  detail: string;
  severity: HealthSeverity;
  count?: number;
}

interface ContractHealthResult {
  score: number;
  summary: string;
  recommendation: string;
  source: "openai" | "local";
  issues: HealthIssue[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const contract = body?.contract;
    const metrics = body?.metrics;

    if (!contract || !metrics) {
      return jsonResponse({ error: "contract and metrics are required" }, 400);
    }

    const fallback = buildFallback(metrics);
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAIApiKey) {
      return jsonResponse(fallback);
    }

    const prompt = `
You are a contract health auditor for a car rental ERP in Qatar.
Return ONLY valid JSON matching this shape:
{
  "score": number from 0 to 100,
  "summary": "Arabic one-sentence contract health summary",
  "recommendation": "Arabic recommended decision: renew, close, continue, or fix before action",
  "issues": [
    {"title": "Arabic issue title", "detail": "Arabic detail", "severity": "critical|warning|info|good", "count": number}
  ]
}

Rules:
- Arabic only.
- Maximum 6 issues.
- Focus on payments before contract start, missing invoices, paid amount exceeding contract amount, date conflicts between contract/invoices/payments, and renewal/closure readiness.
- Do not invent facts not present in metrics.
- If there are critical issues, recommendation must say not to renew or close before fixing them.

Contract JSON:
${JSON.stringify(contract)}

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
              "You produce concise Arabic contract health analysis for a car rental ERP. Return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.15,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!openAIResponse.ok) {
      console.error("OpenAI contract health error:", openAIResponse.status, await openAIResponse.text());
      return jsonResponse(fallback);
    }

    const aiPayload = await openAIResponse.json();
    const content = aiPayload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    const result = normalizeResult(parsed, fallback);

    return jsonResponse(result);
  } catch (error) {
    console.error("contract-health-analysis failed:", error);
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

function normalizeResult(payload: any, fallback: ContractHealthResult): ContractHealthResult {
  return {
    score: clampScore(payload?.score, fallback.score),
    summary: typeof payload?.summary === "string" ? payload.summary : fallback.summary,
    recommendation: typeof payload?.recommendation === "string" ? payload.recommendation : fallback.recommendation,
    source: "openai",
    issues: Array.isArray(payload?.issues) && payload.issues.length > 0
      ? payload.issues.slice(0, 6).map((issue: any) => ({
          title: String(issue?.title || "ملاحظة على العقد"),
          detail: String(issue?.detail || "توجد نقطة تحتاج مراجعة."),
          severity: normalizeSeverity(issue?.severity),
          count: typeof issue?.count === "number" ? issue.count : undefined,
        }))
      : fallback.issues,
  };
}

function buildFallback(metrics: any): ContractHealthResult {
  const issues: HealthIssue[] = [];
  const paymentsBeforeStart = toNumber(metrics?.paymentsBeforeStart, 0);
  const missingInvoices = toNumber(metrics?.missingInvoices, 0);
  const overpaidAmount = toNumber(metrics?.overpaidAmount, 0);
  const invoicesOutsideContract = toNumber(metrics?.invoicesOutsideContract, 0);
  const paymentsAfterEnd = toNumber(metrics?.paymentsAfterEnd, 0);
  const scheduleInvoiceDifference = toNumber(metrics?.scheduleInvoiceDifference, 0);

  if (paymentsBeforeStart > 0) {
    issues.push({
      title: "توجد دفعات قبل بداية العقد",
      detail: `يوجد ${paymentsBeforeStart} دفعة بتاريخ أقدم من بداية العقد.`,
      severity: "critical",
      count: paymentsBeforeStart,
    });
  }

  if (missingInvoices > 0) {
    issues.push({
      title: "توجد فواتير ناقصة",
      detail: `المتوقع ${toNumber(metrics?.expectedInvoices, 0)} فاتورة، والموجود ${toNumber(metrics?.activeInvoices, 0)} فقط.`,
      severity: "warning",
      count: missingInvoices,
    });
  }

  if (overpaidAmount > 0) {
    issues.push({
      title: "المدفوع أكبر من قيمة العقد",
      detail: `يوجد تجاوز في المدفوعات بقيمة ${overpaidAmount.toLocaleString("ar-QA")} ر.ق.`,
      severity: "critical",
      count: 1,
    });
  }

  if (invoicesOutsideContract > 0 || paymentsAfterEnd > 0) {
    issues.push({
      title: "تعارض في تواريخ العقد",
      detail: `يوجد ${invoicesOutsideContract} فاتورة خارج مدة العقد و${paymentsAfterEnd} دفعة بعد نهاية العقد.`,
      severity: "warning",
      count: invoicesOutsideContract + paymentsAfterEnd,
    });
  }

  if (scheduleInvoiceDifference > 1) {
    issues.push({
      title: "فرق بين جدول الدفعات والفواتير",
      detail: `يوجد فرق بقيمة ${scheduleInvoiceDifference.toLocaleString("ar-QA")} ر.ق.`,
      severity: "warning",
      count: 1,
    });
  }

  if (issues.length === 0) {
    issues.push({
      title: "العقد متوازن ماليًا",
      detail: "لا توجد مشاكل واضحة في الفواتير أو الدفعات أو التواريخ.",
      severity: "good",
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, 100 - criticalCount * 28 - warningCount * 12);

  return {
    score,
    summary: criticalCount > 0
      ? "يوجد خلل مهم في صحة العقد ويحتاج مراجعة قبل أي قرار مالي."
      : warningCount > 0
      ? "العقد قابل للمتابعة لكن توجد ملاحظات يجب معالجتها."
      : "العقد يبدو سليمًا من ناحية الفواتير والدفعات والتواريخ.",
    recommendation: criticalCount > 0
      ? "لا يفضل تجديد أو إغلاق العقد قبل معالجة المشاكل الحرجة."
      : "يمكن متابعة العقد أو اتخاذ قرار التجديد/الإغلاق حسب حالة المركبة والتحصيل.",
    source: "local",
    issues,
  };
}

function normalizeSeverity(value: unknown): HealthSeverity {
  return value === "critical" || value === "warning" || value === "info" || value === "good"
    ? value
    : "warning";
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
