import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { session } = await req.json();
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
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    if (!response.ok) {
      console.error("LongCat excel import review error:", response.status, await response.text());
      return jsonResponse(fallback);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    return jsonResponse(normalizeReview(parsed, fallback));
  } catch (error) {
    console.error("excel-import-ai-review failed:", error);
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
