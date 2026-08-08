export const KIMI_CHAT_COMPLETIONS_URL =
  Deno.env.get("KIMI_CHAT_COMPLETIONS_URL") ||
  "https://api.moonshot.ai/v1/chat/completions";

export const KIMI_MODEL = Deno.env.get("KIMI_MODEL") || "kimi-k3";

// Vision-capable model used when evidence images are attached.
export const KIMI_VISION_MODEL = Deno.env.get("KIMI_VISION_MODEL") || "kimi-latest";

export function getKimiApiKey(): string {
  return Deno.env.get("KIMI_API_KEY") || Deno.env.get("MOONSHOT_API_KEY") || "";
}

export interface KimiJsonMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

/**
 * Call Kimi (Moonshot) chat completions with a strict-JSON instruction.
 * Returns the parsed JSON object or null when the answer is unusable.
 */
export async function callKimiJson<T>(
  messages: KimiJsonMessage[],
  options: { temperature?: number; maxTokens?: number; vision?: boolean } = {},
): Promise<T | null> {
  const apiKey = getKimiApiKey();
  if (!apiKey) throw new Error("Kimi API key not configured");

  const response = await fetch(KIMI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.vision ? KIMI_VISION_MODEL : KIMI_MODEL,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content || "";
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
