export const KIMI_CHAT_COMPLETIONS_URL =
  Deno.env.get("KIMI_CHAT_COMPLETIONS_URL") ||
  "https://api.moonshot.ai/v1/chat/completions";

export const KIMI_MODEL = Deno.env.get("KIMI_MODEL") || "kimi-k3";

// Vision-capable model used when evidence images are attached.
export const KIMI_VISION_MODEL = Deno.env.get("KIMI_VISION_MODEL") || "kimi-latest";

// Preferred model order — accounts differ in which Kimi models are enabled,
// so the caller falls back through the list on "model not found" errors.
const TEXT_MODEL_CANDIDATES = [
  KIMI_MODEL,
  "kimi-k2-0905-preview",
  "kimi-k2-0711-preview",
  "moonshot-v1-32k",
];

const VISION_MODEL_CANDIDATES = [
  KIMI_VISION_MODEL,
  "moonshot-v1-128k-vision-preview",
  "moonshot-v1-32k-vision-preview",
  "moonshot-v1-8k-vision-preview",
];

class KimiModelNotFoundError extends Error {
  constructor(model: string, detail: string) {
    super(`Model ${model} unavailable: ${detail}`);
    this.name = "KimiModelNotFoundError";
  }
}

export function getKimiApiKey(): string {
  return Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY") || "";
}

export interface KimiJsonMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

async function callKimiOnce(
  messages: KimiJsonMessage[],
  model: string,
  options: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const apiKey = getKimiApiKey();
  if (!apiKey) throw new Error("Kimi API key not configured");

  const response = await fetch(KIMI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404 || errorText.includes("resource_not_found")) {
      throw new KimiModelNotFoundError(model, errorText.substring(0, 200));
    }
    throw new Error(`Kimi API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

/**
 * Call Kimi (Moonshot) chat completions with a strict-JSON instruction,
 * falling back through the known model list when one is unavailable.
 * Returns the parsed JSON object or null when the answer is unusable.
 */
export async function callKimiJson<T>(
  messages: KimiJsonMessage[],
  options: { temperature?: number; maxTokens?: number; vision?: boolean } = {},
): Promise<T | null> {
  const candidates = options.vision ? VISION_MODEL_CANDIDATES : TEXT_MODEL_CANDIDATES;

  let content = "";
  let lastError: unknown = null;
  for (const model of [...new Set(candidates)]) {
    try {
      content = await callKimiOnce(messages, model, options);
      break;
    } catch (error) {
      if (error instanceof KimiModelNotFoundError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (!content && lastError) throw lastError;
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
