/**
 * Customer ID Autofill Agent (Kimi K3 vision)
 *
 * Reads a Qatari ID / residence-permit image and returns structured customer
 * fields for the customer-creation form, so staff never type them manually.
 *
 * Body: { imageBase64 }  (data-url or raw base64)
 */

import { callKimiJson, KIMI_VISION_MODEL } from "../_shared/kimi.ts";
import {
  agentCorsHeaders,
  authorizeGovernedAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  type AgentInvocationContext,
} from "../_shared/agent.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  let invocation: AgentInvocationContext | null = null;
  const supabase = createServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.companyId) throw new Error("companyId is required");
    invocation = await authorizeGovernedAgent(req, "customer-id-autofill-agent", body.companyId);
    const imageBase64 = String(body.imageBase64 || "");
    if (!imageBase64) throw new Error("imageBase64 is required");

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const ai = await callKimiJson<{
      name_arabic?: string;
      national_id?: string;
      nationality?: string;
      date_of_birth?: string;
      id_expiry?: string;
      confidence?: number;
    }>([
      {
        role: "system",
        content:
          "أنت قارئ بطاقات هوية قطرية. استخرج من الصورة: الاسم العربي الكامل، الرقم الشخصي (11 رقماً)، الجنسية بالعربية، تاريخ الميلاد وتاريخ انتهاء البطاقة بصيغة ISO (YYYY-MM-DD). أجب JSON فقط بالمفاتيح: name_arabic, national_id, nationality, date_of_birth, id_expiry, confidence (0-1). إذا لم تكن متأكداً من حقل اتركه فارغاً ولا تخمن.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "اقرأ بيانات هذه البطاقة بدقة:" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ], { vision: true, maxTokens: 600 });

    const nationalId = String(ai?.national_id || "").replace(/\D/g, "");
    const result = {
      success: true,
      nameArabic: String(ai?.name_arabic || "").trim(),
      nationalId: /^\d{11}$/.test(nationalId) ? nationalId : "",
      nationality: String(ai?.nationality || "").trim(),
      dateOfBirth: String(ai?.date_of_birth || "").trim(),
      idExpiry: String(ai?.id_expiry || "").trim(),
      confidence: Math.min(Math.max(Number(ai?.confidence) || 0.5, 0), 1),
      model: KIMI_VISION_MODEL,
    };

    await finishAgentExecution(supabase, invocation, true, {
      confidence: result.confidence,
      nationalIdAccepted: Boolean(result.nationalId),
    });
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (invocation) {
      await finishAgentExecution(supabase, invocation, false, {}, "customer_id_autofill_failed")
        .catch(() => undefined);
    }
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});
