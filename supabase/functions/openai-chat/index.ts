import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestId = crypto.randomUUID();
  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "Authentication required", requestId }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const longCatApiKey = getLongCatApiKey();
    if (!supabaseUrl || !serviceRoleKey || !longCatApiKey) {
      console.error(`[${requestId}] AI proxy is missing server configuration`);
      return json({ error: "AI service is not configured", requestId }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Invalid session", requestId }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,is_active,company_id")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "Active user profile required", requestId }, 403);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const messages = validateMessages(body?.messages);
    if (!messages.ok) return json({ error: messages.error, requestId }, 400);

    const stream = body?.stream === true;
    const temperature = clampNumber(body?.temperature, 0, 1, 0.4);
    const maxTokens = Math.round(clampNumber(
      body?.max_completion_tokens ?? body?.max_tokens,
      64,
      4096,
      1024,
    ));

    const upstream = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(longCatApiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: messages.value,
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!upstream.ok) {
      console.error(`[${requestId}] LongCat request failed with status ${upstream.status}`);
      return json({ error: "AI provider request failed", requestId }, 502);
    }

    if (stream) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          "X-Request-Id": requestId,
        },
      });
    }

    const payload = await upstream.text();
    return new Response(payload, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] AI proxy failed:`, error instanceof Error ? error.message : "unknown error");
    return json({ error: "AI proxy failed", requestId }, 500);
  }
});

function validateMessages(input: unknown):
  | { ok: true; value: ChatMessage[] }
  | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0 || input.length > 40) {
    return { ok: false, error: "messages must contain between 1 and 40 items" };
  }

  let totalLength = 0;
  const messages: ChatMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { ok: false, error: "Invalid message" };
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if (!(["system", "user", "assistant"] as unknown[]).includes(role) || typeof content !== "string") {
      return { ok: false, error: "Every message requires a supported role and text content" };
    }
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 20_000) {
      return { ok: false, error: "Message content is empty or too long" };
    }
    totalLength += trimmed.length;
    messages.push({ role: role as ChatMessage["role"], content: trimmed });
  }
  if (totalLength > 80_000) return { ok: false, error: "Conversation is too long" };
  return { ok: true, value: messages };
}

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
