import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { authorizeActiveCompanyUser } from "../_shared/privileged-admin.ts";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecisionPriority = "high" | "medium" | "low";
type RiskSeverity = "critical" | "high" | "medium" | "low";

interface DecisionAction {
  title: string;
  reason: string;
  priority: DecisionPriority;
  route?: string;
}

interface DecisionRisk {
  title: string;
  impact: string;
  severity: RiskSeverity;
}

interface DecisionCenterResult {
  summary: string;
  actions: DecisionAction[];
  risks: DecisionRisk[];
  cashflow: {
    next7Days: number;
    next30Days: number;
    note: string;
  };
  generatedAt: string;
  source: "longcat" | "local";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorizeActiveCompanyUser(req);
    const body = await req.json();
    const metrics = body?.metrics;

    if (!metrics) {
      return jsonResponse({ error: "metrics is required" }, 400);
    }

    const fallback = buildFallbackDecision(metrics);
    const longCatApiKey = getLongCatApiKey();

    if (!longCatApiKey) {
      return jsonResponse(fallback);
    }

    const prompt = `
You are an operations and finance decision assistant for a car rental ERP in Qatar.
Return ONLY valid JSON matching this shape:
{
  "summary": "Arabic executive summary, one sentence",
  "actions": [
    {"title": "Arabic action title", "reason": "Arabic reason", "priority": "high|medium|low", "route": "/optional-route"}
  ],
  "risks": [
    {"title": "Arabic risk title", "impact": "Arabic impact", "severity": "critical|high|medium|low"}
  ],
  "cashflow": {"next7Days": number, "next30Days": number, "note": "Arabic note"}
}

Rules:
- Arabic only.
- Maximum 5 actions and 5 risks.
- Prioritize customers needing follow-up today, overdue/ending contracts, unreliable or idle vehicles, expected collection in 7/30 days, and financial/operational risks.
- Use the provided route when the action clearly maps to a module.
- Do not invent exact names or amounts not present in metrics.

Metrics JSON:
${JSON.stringify(metrics)}
`;

    const longCatResponse = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(longCatApiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You produce concise Arabic operational recommendations for a car rental ERP. Return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1400,
        response_format: { type: "json_object" },
      }),
    });

    if (!longCatResponse.ok) {
      console.error("LongCat daily decision error:", longCatResponse.status, await longCatResponse.text());
      return jsonResponse(fallback);
    }

    const aiPayload = await longCatResponse.json();
    const content = aiPayload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    const result: DecisionCenterResult = normalizeDecisionResult(parsed, metrics);

    return jsonResponse(result);
  } catch (error) {
    console.error("daily-decision-center failed:", error);
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

function normalizeDecisionResult(payload: any, metrics: any): DecisionCenterResult {
  const fallback = buildFallbackDecision(metrics);

  return {
    summary: typeof payload?.summary === "string" ? payload.summary : fallback.summary,
    actions: Array.isArray(payload?.actions) && payload.actions.length > 0
      ? payload.actions.slice(0, 5).map((action: any) => ({
          title: String(action?.title || "متابعة مطلوبة"),
          reason: String(action?.reason || "يوجد مؤشر يحتاج مراجعة"),
          priority: normalizePriority(action?.priority),
          route: typeof action?.route === "string" ? action.route : undefined,
        }))
      : fallback.actions,
    risks: Array.isArray(payload?.risks) && payload.risks.length > 0
      ? payload.risks.slice(0, 5).map((risk: any) => ({
          title: String(risk?.title || "مخاطر تشغيلية"),
          impact: String(risk?.impact || "قد تؤثر على التحصيل أو التشغيل"),
          severity: normalizeSeverity(risk?.severity),
        }))
      : fallback.risks,
    cashflow: {
      next7Days: toNumber(payload?.cashflow?.next7Days, fallback.cashflow.next7Days),
      next30Days: toNumber(payload?.cashflow?.next30Days, fallback.cashflow.next30Days),
      note: typeof payload?.cashflow?.note === "string" ? payload.cashflow.note : fallback.cashflow.note,
    },
    generatedAt: new Date().toISOString(),
    source: "longcat",
  };
}

function buildFallbackDecision(metrics: any): DecisionCenterResult {
  const actions: DecisionAction[] = [];
  const risks: DecisionRisk[] = [];
  const overdueAmount = toNumber(metrics?.collections?.overdueAmount, 0);
  const overdueInvoices = toNumber(metrics?.collections?.overdueInvoices, 0);
  const endingContracts = toNumber(metrics?.contracts?.endingSoonCount, 0);
  const unpaidViolations = toNumber(metrics?.traffic?.unpaidCount, 0);
  const idleVehicles = toNumber(metrics?.fleet?.idleVehiclesCount, 0);

  if (overdueInvoices > 0) {
    actions.push({
      title: `متابعة ${overdueInvoices} فاتورة متأخرة`,
      reason: `إجمالي المتأخرات الحالية ${overdueAmount.toLocaleString("ar-QA")} ر.ق`,
      priority: overdueAmount > 50000 ? "high" : "medium",
      route: "/legal/delinquency",
    });
    risks.push({
      title: "ارتفاع المتأخرات",
      impact: "قد يؤثر على التدفق النقدي خلال الشهر الحالي",
      severity: overdueAmount > 100000 ? "critical" : "high",
    });
  }

  if (endingContracts > 0) {
    actions.push({
      title: `مراجعة ${endingContracts} عقد قريب من الانتهاء`,
      reason: "تجديد العقود مبكرًا يقلل فجوات الإشغال والتحصيل",
      priority: "medium",
      route: "/contracts",
    });
  }

  if (unpaidViolations > 0) {
    actions.push({
      title: `معالجة ${unpaidViolations} مخالفة مرورية غير مدفوعة`,
      reason: "المخالفات غير المحصلة تزيد مخاطر العميل والعقد",
      priority: unpaidViolations > 10 ? "high" : "medium",
      route: "/legal/delinquency",
    });
    risks.push({
      title: "مخالفات غير محصلة",
      impact: "قد تتحول إلى عبء مالي إذا لم يتم ربطها وتحصيلها",
      severity: unpaidViolations > 10 ? "high" : "medium",
    });
  }

  if (idleVehicles > 0) {
    actions.push({
      title: `تحريك ${idleVehicles} مركبة قليلة الاستخدام`,
      reason: "المركبات غير المستغلة تخفض العائد اليومي للأسطول",
      priority: "medium",
      route: "/fleet",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "لا توجد إجراءات حرجة اليوم",
      reason: "المؤشرات الأساسية لا تظهر مخاطر عاجلة حاليًا",
      priority: "low",
      route: "/dashboard",
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "مخاطر منخفضة اليوم",
      impact: "استمر في متابعة العقود والتحصيل بشكل يومي",
      severity: "low",
    });
  }

  return {
    summary: "ملخص اليوم مبني على مؤشرات التحصيل والعقود والأسطول المتاحة حاليًا.",
    actions: actions.slice(0, 5),
    risks: risks.slice(0, 5),
    cashflow: {
      next7Days: toNumber(metrics?.collections?.expected7Days, 0),
      next30Days: toNumber(metrics?.collections?.expected30Days, 0),
      note: "التوقع مبني على الفواتير المفتوحة وتواريخ الاستحقاق المسجلة.",
    },
    generatedAt: new Date().toISOString(),
    source: "local",
  };
}

function normalizePriority(value: unknown): DecisionPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeSeverity(value: unknown): RiskSeverity {
  return value === "critical" || value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


