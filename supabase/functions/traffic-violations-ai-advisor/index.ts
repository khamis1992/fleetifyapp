import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { authorizeActiveCompanyUser } from "../_shared/privileged-admin.ts";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorizeActiveCompanyUser(req);
    const body = await req.json();
    const summary = body?.summary;
    const ranked = body?.ranked;

    if (!summary || !Array.isArray(ranked)) {
      return jsonResponse({ error: "summary and ranked violations are required" }, 400);
    }

    const fallback = buildFallback(summary, ranked);
    const longCatApiKey = getLongCatApiKey();

    if (!longCatApiKey) {
      return jsonResponse(fallback);
    }

    const prompt = `
You are a traffic violations operations assistant for a car rental ERP in Qatar.
Return ONLY valid JSON matching this shape:
{
  "summary": "Arabic concise operational summary"
}

Rules:
- Arabic only.
- Mention priority, duplicate risk, unlinked violations, contract matching, responsible party, and claim follow-up when relevant.
- Do not invent facts not present in the payload.
- Keep summary within 2 short sentences.

Summary JSON:
${JSON.stringify(summary)}

Top ranked violations JSON:
${JSON.stringify(ranked)}
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
              "You produce concise Arabic traffic violation operational recommendations for a car rental ERP. Return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.15,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!longCatResponse.ok) {
      console.error("LongCat traffic violations advisor error:", longCatResponse.status, await longCatResponse.text());
      return jsonResponse(fallback);
    }

    const aiPayload = await longCatResponse.json();
    const content = aiPayload?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};

    return jsonResponse({
      summary: typeof parsed?.summary === "string" ? parsed.summary : fallback.summary,
      source: "longcat",
    });
  } catch (error) {
    console.error("traffic-violations-ai-advisor failed:", error);
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

function buildFallback(summary: any, ranked: any[]) {
  const highPriority = ranked.filter((item) => Number(item.priorityScore || 0) >= 75).length;
  const duplicated = ranked.filter((item) => Number(item.duplicateCount || 0) > 1).length;
  const unlinked = Number(summary?.unlinked || 0);
  return {
    summary: `يوجد ${highPriority} مخالفة عالية الأولوية و${unlinked} مخالفة تحتاج ربط عقد أو عميل. راجع ${duplicated} مخالفة يشتبه بتكرارها وجهز رسائل المطالبة للمخالفات غير المسددة.`,
    source: "local",
  };
}


