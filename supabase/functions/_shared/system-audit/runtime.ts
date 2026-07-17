import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../longcat.ts";
import type { AuditFinding } from "./types.ts";

const SYSTEM_AUDIT_WORKER_VERSION = "2026-07-16.54";
const SYSTEM_AUDIT_WORKER_FUNCTION = "system-audit-worker-v12";

export class SystemAuditRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SystemAuditRequestError";
  }
}

export const systemAuditCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

export function authorizeSystemAgent(req: Request) {
  const configuredSecret = Deno.env.get("AUDIT_AGENT_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";

  if (configuredSecret && suppliedSecret === configuredSecret) return;
  if (serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`) return;
  throw new SystemAuditRequestError(
    "Unauthorized system audit agent request",
    401
  );
}

export async function readRequestJson<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    return {} as T;
  }
}

export function systemAuditJson(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...systemAuditCorsHeaders, "Content-Type": "application/json" },
  });
}

export function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown system audit error";
  }
}

export function getSystemAuditErrorStatus(error: unknown): number {
  return error instanceof SystemAuditRequestError ? error.status : 500;
}

export function scheduleBackground(promise: Promise<unknown>) {
  const edgeRuntime = (
    globalThis as {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }
  ).EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(promise);
}

export async function invokeSystemWorker(jobId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error("Missing Supabase worker invocation settings");

  const versionQuery = `v=${encodeURIComponent(SYSTEM_AUDIT_WORKER_VERSION)}`;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const workerUrls = [
    `${supabaseUrl}/functions/v1/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`,
    `https://${projectRef}.functions.supabase.co/${SYSTEM_AUDIT_WORKER_FUNCTION}?${versionQuery}`,
  ];
  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId }),
  };

  let lastError = "Unknown worker invocation failure";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(
        workerUrls[attempt % workerUrls.length],
        requestOptions
      );
    } catch (error) {
      lastError = `Worker ${jobId} request failed: ${getErrorMessage(error)}`;
      if (attempt === 11) break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1_500, 200 * 2 ** attempt))
      );
      continue;
    }
    if (response.ok) return;

    lastError = `Worker ${jobId} returned ${response.status}: ${(
      await response.text()
    ).slice(0, 500)}`;
    const retryable =
      response.status === 404 ||
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    if (!retryable || attempt === 11) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(1_500, 200 * 2 ** attempt))
    );
  }
  throw new Error(lastError);
}

export async function triageFindingsWithLongCat(
  findings: AuditFinding[]
): Promise<Map<string, Record<string, unknown>>> {
  const reviewItems = findings
    .filter((finding) => finding.needsAiTriage)
    .slice(0, 30);
  const apiKey = getLongCatApiKey();
  if (!apiKey || reviewItems.length === 0) return new Map();

  const cases = reviewItems.map((finding, index) => ({
    index,
    code: finding.code,
    severity: finding.severity,
    evidence: sanitizeEvidence(finding.evidence),
  }));
  try {
    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(apiKey),
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        temperature: 0,
        max_tokens: 1400,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You triage ERP audit findings. Never propose SQL or a mutation. Return strict JSON: {"decisions":[{"index":0,"priority":1,"category":"accounting|operations|legal|data","reason":"short reason"}]}. Priority is 1 critical through 4 low.',
          },
          { role: "user", content: JSON.stringify({ cases }) },
        ],
      }),
    });
    if (!response.ok) {
      console.warn(
        `[system-audit] LongCat triage returned HTTP ${response.status}`
      );
      return new Map();
    }
    const body = await response.json();
    const content = String(body?.choices?.[0]?.message?.content || "")
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const jsonContent = content.match(/\{[\s\S]*\}/)?.[0] || content;
    const parsed = JSON.parse(jsonContent);
    const decisions = Array.isArray(parsed?.decisions) ? parsed.decisions : [];
    const result = new Map<string, Record<string, unknown>>();
    for (const decision of decisions) {
      const index = Number(decision?.index);
      if (!Number.isInteger(index) || index < 0 || index >= reviewItems.length)
        continue;
      result.set(reviewItems[index].dedupeKey, {
        provider: "longcat",
        priority: clampInteger(decision.priority, 1, 4, 2),
        category: ["accounting", "operations", "legal", "data"].includes(
          String(decision.category)
        )
          ? String(decision.category)
          : "data",
        reason: String(decision.reason || "").slice(0, 500),
      });
    }
    return result;
  } catch (error) {
    console.warn(
      `[system-audit] LongCat triage failed: ${getErrorMessage(error).slice(
        0,
        200
      )}`
    );
    return new Map();
  }
}

function sanitizeEvidence(
  value: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      /name|phone|email|national|plate|reference|notes|description/i.test(key)
    )
      continue;
    if (/id$/i.test(key) || /ids$/i.test(key)) {
      sanitized[key] = Array.isArray(item) ? item.length : Boolean(item);
      continue;
    }
    if (["string", "number", "boolean"].includes(typeof item) || item === null)
      sanitized[key] = item;
  }
  return sanitized;
}
