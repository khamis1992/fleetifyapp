export const LONGCAT_CHAT_COMPLETIONS_URL =
  Deno.env.get("LONGCAT_CHAT_COMPLETIONS_URL") ||
  "https://api.longcat.chat/openai/v1/chat/completions";

export const LONGCAT_MODEL = Deno.env.get("LONGCAT_MODEL") || "LongCat-2.0";

export function getLongCatApiKey(): string {
  return Deno.env.get("LONGCAT_API_KEY") || "";
}

export function buildLongCatHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}
