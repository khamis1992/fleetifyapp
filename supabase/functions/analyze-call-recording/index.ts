import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RecordingAttachment = {
  type?: string;
  bucket?: string;
  path?: string;
  mime_type?: string;
};

type CallAnalysis = {
  summary: string;
  outcome: "answered" | "no_answer" | "busy" | "payment_promise" | "dispute" | "follow_up" | "other";
  sentiment: "positive" | "neutral" | "negative";
  customer_intent: string;
  payment_promise: { mentioned: boolean; amount: number | null; date: string | null };
  follow_up_required: boolean;
  follow_up_date: string | null;
  action_items: string[];
  risks: string[];
};

class FunctionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "FunctionError";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestId = crypto.randomUUID();
  let communicationId = "";

  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "Authentication required", requestId }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase function is not configured", requestId }, 503);

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Invalid session", requestId }, 401);

    const openAIKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!openAIKey) {
      throw new FunctionError("مفتاح OpenAI غير مُعد في أسرار Supabase", 503, "OPENAI_KEY_MISSING");
    }

    const contentType = req.headers.get("Content-Type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audio = formData.get("audio");
      if (!(audio instanceof File) || audio.size === 0) {
        return json({ error: "A non-empty audio file is required", requestId }, 400);
      }
      if (audio.size > 25 * 1024 * 1024) {
        return json({ error: "Call recording exceeds the 25 MB transcription limit", requestId }, 413);
      }

      const contextValue = formData.get("context");
      const context = typeof contextValue === "string" ? contextValue.slice(0, 4000) : "";
      const result = await transcribeAndAnalyze(
        audio,
        audio.name || "call-recording.webm",
        normalizeAudioMimeType(audio.type),
        context,
        openAIKey,
        requestId,
      );
      return json({ ...result, requestId });
    }

    const body = await req.json().catch(() => null) as { communicationId?: unknown } | null;
    communicationId = typeof body?.communicationId === "string" ? body.communicationId.trim() : "";
    if (!communicationId) return json({ error: "communicationId is required", requestId }, 400);

    const { data: communication, error: communicationError } = await client
      .from("customer_communications")
      .select("id,company_id,contract_id,customer_id,employee_id,attachments,notes")
      .eq("id", communicationId)
      .eq("employee_id", authData.user.id)
      .single();
    if (communicationError || !communication) {
      return json({ error: "Call record not found or access denied", requestId }, 404);
    }

    const { error: processingStatusError } = await client
      .from("customer_communications")
      .update({ transcription_status: "processing", transcription_error: null })
      .eq("id", communicationId)
      .eq("employee_id", authData.user.id);
    if (processingStatusError) throw processingStatusError;

    const attachments = Array.isArray(communication.attachments)
      ? communication.attachments as RecordingAttachment[]
      : [];
    const recording = attachments.find((item) => item?.type === "call_recording" && item.bucket && item.path);
    if (!recording?.bucket || !recording.path) throw new Error("Call recording attachment is missing");

    const { data: audioBlob, error: downloadError } = await client.storage
      .from(recording.bucket)
      .download(recording.path);
    if (downloadError || !audioBlob) throw new Error("Unable to download the call recording");
    if (audioBlob.size > 25 * 1024 * 1024) throw new Error("Call recording exceeds the 25 MB transcription limit");

    const result = await transcribeAndAnalyze(
      audioBlob,
      recording.path.split("/").pop() || "call-recording.webm",
      normalizeAudioMimeType(recording.mime_type || audioBlob.type),
      communication.notes || "",
      openAIKey,
      requestId,
    );

    const { error: updateError } = await client
      .from("customer_communications")
      .update({
        transcription_status: "completed",
        transcript_text: result.transcript,
        ai_summary: result.analysis.summary,
        ai_analysis: result.analysis,
        transcription_error: null,
        transcription_completed_at: result.completedAt,
      })
      .eq("id", communicationId)
      .eq("employee_id", authData.user.id);
    if (updateError) throw updateError;

    return json({ ...result, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Call analysis failed";
    console.error(`[${requestId}] analyze-call-recording failed`, message);

    if (communicationId) {
      try {
        const authorization = req.headers.get("Authorization") || "";
        const client = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_ANON_KEY") || "",
          { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
        );
        await client
          .from("customer_communications")
          .update({ transcription_status: "failed", transcription_error: message })
          .eq("id", communicationId);
      } catch {
        // Preserve the original error response if status persistence also fails.
      }
    }

    const status = error instanceof FunctionError ? error.status : 500;
    const code = error instanceof FunctionError ? error.code : "CALL_ANALYSIS_FAILED";
    return json({ error: message, code, requestId }, status);
  }
});

function normalizeAudioMimeType(value: string | null | undefined) {
  const baseType = String(value || "audio/webm").split(";")[0].trim().toLowerCase();
  return baseType || "audio/webm";
}

async function transcribeAndAnalyze(
  audioBlob: Blob,
  filename: string,
  mimeType: string,
  context: string,
  openAIKey: string,
  requestId: string,
) {
  const form = new FormData();
  form.append("model", Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") || "gpt-4o-mini-transcribe");
  form.append("file", new File([audioBlob], filename, { type: mimeType }));
  form.append(
    "prompt",
    "مكالمة خدمة عملاء وتحصيل لشركة تأجير سيارات في قطر. حافظ على أسماء العملاء وأرقام العقود والمبالغ والتواريخ كما نُطقت.",
  );

  const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey}` },
    body: form,
  });
  if (!transcriptionResponse.ok) {
    console.error(`[${requestId}] transcription failed`, transcriptionResponse.status, await transcriptionResponse.text());
    throw new FunctionError("تعذر تحويل التسجيل إلى نص عبر OpenAI", 502, "TRANSCRIPTION_PROVIDER_ERROR");
  }

  const transcriptionPayload = await transcriptionResponse.json() as { text?: unknown };
  const transcript = typeof transcriptionPayload.text === "string" ? transcriptionPayload.text.trim() : "";
  if (!transcript) {
    throw new FunctionError(
      "لم يتم اكتشاف كلام واضح في التسجيل. أعد التسجيل وتحدث بصوت مسموع بالقرب من الميكروفون.",
      422,
      "NO_SPEECH_DETECTED",
    );
  }

  const analysisResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_CALL_ANALYSIS_MODEL") || "gpt-4.1-mini",
      instructions: [
        "أنت محلل مكالمات لنظام تأجير سيارات في قطر.",
        "حلل النص فقط ولا تخترع معلومات غير مذكورة.",
        "اكتب جميع الحقول النصية بالعربية، وحافظ على المبالغ والتواريخ بدقة.",
        "إذا لم يُذكر تاريخ أو مبلغ فأعد null بدلًا من التخمين.",
      ].join(" "),
      input: `سياق المكالمة وملاحظات الموظف:\n${context || "لا يوجد"}\n\nنص المكالمة:\n${transcript}`,
      text: {
        format: { type: "json_schema", name: "call_analysis", strict: true, schema: callAnalysisSchema },
      },
    }),
  });
  if (!analysisResponse.ok) {
    console.error(`[${requestId}] analysis failed`, analysisResponse.status, await analysisResponse.text());
    throw new FunctionError("تعذر تحليل نص المكالمة عبر OpenAI", 502, "ANALYSIS_PROVIDER_ERROR");
  }

  const analysisPayload = await analysisResponse.json() as Record<string, unknown>;
  const analysisText = extractOutputText(analysisPayload);
  const analysis = normalizeAnalysis(JSON.parse(stripCodeFence(analysisText)));
  return { transcript, analysis, completedAt: new Date().toISOString() };
}

const callAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    outcome: {
      type: "string",
      enum: ["answered", "no_answer", "busy", "payment_promise", "dispute", "follow_up", "other"],
    },
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    customer_intent: { type: "string" },
    payment_promise: {
      type: "object",
      additionalProperties: false,
      properties: {
        mentioned: { type: "boolean" },
        amount: { type: ["number", "null"] },
        date: { type: ["string", "null"] },
      },
      required: ["mentioned", "amount", "date"],
    },
    follow_up_required: { type: "boolean" },
    follow_up_date: { type: ["string", "null"] },
    action_items: { type: "array", items: { type: "string" }, maxItems: 8 },
    risks: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
  required: [
    "summary",
    "outcome",
    "sentiment",
    "customer_intent",
    "payment_promise",
    "follow_up_required",
    "follow_up_date",
    "action_items",
    "risks",
  ],
};

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }
  throw new Error("The AI analysis response did not contain text");
}

function stripCodeFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function normalizeAnalysis(value: unknown): CallAnalysis {
  if (!value || typeof value !== "object") throw new Error("The AI analysis result is invalid");
  const data = value as Record<string, unknown>;
  const paymentPromise = data.payment_promise && typeof data.payment_promise === "object"
    ? data.payment_promise as Record<string, unknown>
    : {};
  const validOutcomes = ["answered", "no_answer", "busy", "payment_promise", "dispute", "follow_up", "other"];
  const validSentiments = ["positive", "neutral", "negative"];

  if (typeof data.summary !== "string" || !data.summary.trim()) {
    throw new Error("The AI analysis summary is missing");
  }

  return {
    summary: data.summary.trim(),
    outcome: validOutcomes.includes(String(data.outcome)) ? data.outcome as CallAnalysis["outcome"] : "other",
    sentiment: validSentiments.includes(String(data.sentiment)) ? data.sentiment as CallAnalysis["sentiment"] : "neutral",
    customer_intent: typeof data.customer_intent === "string" ? data.customer_intent.trim() : "",
    payment_promise: {
      mentioned: paymentPromise.mentioned === true,
      amount: typeof paymentPromise.amount === "number" ? paymentPromise.amount : null,
      date: typeof paymentPromise.date === "string" ? paymentPromise.date : null,
    },
    follow_up_required: data.follow_up_required === true,
    follow_up_date: typeof data.follow_up_date === "string" ? data.follow_up_date : null,
    action_items: Array.isArray(data.action_items) ? data.action_items.slice(0, 8).map(String) : [],
    risks: Array.isArray(data.risks) ? data.risks.slice(0, 8).map(String) : [],
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
