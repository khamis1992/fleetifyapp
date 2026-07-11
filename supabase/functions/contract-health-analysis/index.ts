import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

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
  source: "longcat" | "local";
  issues: HealthIssue[];
}

type RepairTool =
  | "repair_linked_invoice_contracts"
  | "cancel_duplicate_schedules"
  | "repair_outside_invoices"
  | "create_missing_invoices"
  | "repair_out_of_period_payments"
  | "reconcile_invoice_amounts"
  | "reconcile_schedule_invoices"
  | "recalculate_invoice_balances"
  | "final_balance_audit";

interface RepairAction {
  tool: RepairTool;
  priority: number;
  reason: string;
}

interface ContractRepairPlan {
  source: "longcat" | "local";
  summary: string;
  actions: RepairAction[];
  requiresReview: string[];
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

    if (body?.mode === "repair_plan") {
      return jsonResponse(await buildRepairPlan({
        contract,
        metrics,
        allowedTools: body?.allowedTools,
        allowExternalAI: body?.allowExternalAI === true,
      }));
    }

    const fallback = buildFallback(metrics);
    const longCatApiKey = getLongCatApiKey();

    if (!longCatApiKey) {
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

    const longCatResponse = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(longCatApiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
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

    if (!longCatResponse.ok) {
      console.error("LongCat contract health error:", longCatResponse.status, await longCatResponse.text());
      return jsonResponse(fallback);
    }

    const aiPayload = await longCatResponse.json();
    const content = aiPayload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(stripJsonFences(content)) : {};
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

async function buildRepairPlan({
  contract,
  metrics,
  allowedTools,
  allowExternalAI,
}: {
  contract: any;
  metrics: any;
  allowedTools?: unknown;
  allowExternalAI?: boolean;
}): Promise<ContractRepairPlan> {
  const fallback = buildFallbackRepairPlan(metrics);
  const longCatApiKey = getLongCatApiKey();
  const externalAIEnabled = Deno.env.get("CONTRACT_REPAIR_EXTERNAL_AI_ENABLED") === "true";

  if (!allowExternalAI || !externalAIEnabled || !longCatApiKey) {
    return fallback;
  }

  const tools = Array.isArray(allowedTools) && allowedTools.length > 0
    ? allowedTools
    : [
        "repair_linked_invoice_contracts",
        "cancel_duplicate_schedules",
        "repair_outside_invoices",
        "create_missing_invoices",
        "repair_out_of_period_payments",
        "reconcile_invoice_amounts",
        "reconcile_schedule_invoices",
        "recalculate_invoice_balances",
        "final_balance_audit",
      ];

  const prompt = `
You are an AI repair agent for a car rental ERP contract in Qatar.
You DO NOT write SQL. You choose from allowed repair tools only.
Return ONLY valid JSON:
{
  "summary": "Arabic short explanation of the repair strategy",
  "actions": [
    {"tool": "one allowed tool", "priority": 1, "reason": "Arabic reason grounded in metrics"}
  ],
  "requiresReview": ["Arabic review note if a financial audit-sensitive item should not be auto-mutated"]
}

Allowed tools:
${JSON.stringify(tools)}

Rules:
- Arabic explanations only.
- Use only the provided tool names.
- Prioritize fixing links/dates before creating or cancelling invoices.
- Include final_balance_audit whenever any action exists.
- Do not invent data not present in metrics.
- Do not ask for manual review unless the metrics show paid invoices, journal entries, immutable payments, or unresolved contradictions.

Contract JSON:
${JSON.stringify(contract)}

Metrics JSON:
${JSON.stringify(metrics)}
`;

  try {
    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(longCatApiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a cautious ERP repair-planning agent. Return strict JSON only and choose only allowed tools.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.05,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("LongCat contract repair plan error:", response.status, await response.text());
      return fallback;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    const allowed = new Set(tools.map(String));
    const actions = Array.isArray(parsed?.actions)
      ? parsed.actions
          .filter((action: any) => allowed.has(String(action?.tool)))
          .map((action: any, index: number) => ({
            tool: String(action.tool) as RepairTool,
            priority: Number.isFinite(Number(action?.priority)) ? Number(action.priority) : index + 1,
            reason: String(action?.reason || "اختار الوكيل هذه الأداة بناءً على مؤشرات العقد."),
          }))
          .sort((left: RepairAction, right: RepairAction) => left.priority - right.priority)
      : [];

    if (actions.length === 0) {
      return fallback;
    }

    const mergedActions = mergeRepairActions(actions, fallback.actions);

    return {
      source: "longcat",
      summary: typeof parsed?.summary === "string" ? parsed.summary : fallback.summary,
      actions: mergedActions,
      requiresReview: Array.isArray(parsed?.requiresReview)
        ? parsed.requiresReview.map((item: unknown) => String(item)).slice(0, 6)
        : [],
    };
  } catch (error) {
    console.error("contract repair plan failed:", error);
    return fallback;
  }
}

function mergeRepairActions(primary: RepairAction[], safetyNet: RepairAction[]) {
  const merged = [...primary];
  for (const action of safetyNet) {
    if (merged.some((item) => item.tool === action.tool)) continue;
    merged.push({
      ...action,
      priority: merged.length + 1,
      reason: `شبكة الأمان المحلية: ${action.reason}`,
    });
  }

  return merged.map((action, index) => ({
    ...action,
    priority: index + 1,
  }));
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripJsonFences(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeResult(payload: any, fallback: ContractHealthResult): ContractHealthResult {
  return {
    score: clampScore(payload?.score, fallback.score),
    summary: typeof payload?.summary === "string" ? payload.summary : fallback.summary,
    recommendation: typeof payload?.recommendation === "string" ? payload.recommendation : fallback.recommendation,
    source: "longcat",
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

function buildFallbackRepairPlan(metrics: any): ContractRepairPlan {
  const actions: RepairAction[] = [];
  const review: string[] = [];
  const pushAction = (tool: RepairTool, reason: string) => {
    if (actions.some((action) => action.tool === tool)) return;
    actions.push({ tool, priority: actions.length + 1, reason });
  };

  if (toNumber(metrics?.scheduleInvoiceMismatchItems?.length, 0) > 0) {
    pushAction("repair_linked_invoice_contracts", "توجد روابط أو تواريخ غير متطابقة بين الأقساط والفواتير.");
    pushAction("reconcile_schedule_invoices", "تحتاج الأقساط والفواتير إلى مصالحة حسب شهر الاستحقاق والمبلغ.");
  }

  if (toNumber(metrics?.invoicesOutsideContract, 0) > 0 || Array.isArray(metrics?.outsideInvoices) && metrics.outsideInvoices.length > 0) {
    pushAction("repair_outside_invoices", "توجد فواتير خارج فترة العقد.");
    if ((metrics?.outsideInvoices || []).some((invoice: any) => invoice?.has_journal_entry || invoice?.has_linked_payments)) {
      review.push("بعض الفواتير الخارجة مرتبطة بقيود أو دفعات، لذلك يجب استخدام مسار الإلغاء الآمن.");
    }
  }

  if (toNumber(metrics?.missingInvoices, 0) > 0) {
    pushAction("create_missing_invoices", "توجد أشهر أو أقساط بدون فاتورة نشطة.");
  }

  if (toNumber(metrics?.paymentsBeforeStart, 0) > 0 || toNumber(metrics?.paymentsAfterEnd, 0) > 0) {
    pushAction("repair_out_of_period_payments", "توجد دفعات خارج فترة العقد.");
  }

  if (Math.abs(toNumber(metrics?.scheduleInvoiceDifference, 0)) > 1) {
    pushAction("reconcile_invoice_amounts", "يوجد فرق مالي بين جدول الدفعات ومجموع الفواتير.");
    pushAction("reconcile_schedule_invoices", "يلزم ربط ومصالحة الفواتير مع جدول الدفعات.");
  }

  if (toNumber(metrics?.invoicePaymentCorrections?.length, 0) > 0) {
    pushAction("recalculate_invoice_balances", "توجد أرصدة فواتير أو حالات دفع تحتاج إعادة احتساب.");
  }

  if (actions.length > 0) {
    pushAction("final_balance_audit", "مراجعة نهائية بعد الإصلاح للتأكد من ثبات الأرصدة.");
  }

  return {
    source: "local",
    summary: actions.length > 0
      ? "تم إعداد خطة إصلاح تلقائية بناءً على مؤشرات صحة العقد."
      : "لا توجد أدوات إصلاح مطلوبة حاليًا.",
    actions,
    requiresReview: review,
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
