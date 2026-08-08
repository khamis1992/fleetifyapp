import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const agentCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function authorizeAgent(req: Request): Promise<void> {
  const secret = req.headers.get("x-agent-secret");
  const expected = Deno.env.get("CONTRACT_SCANNER_SECRET");
  if (expected && secret === expected) return;

  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;

  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) return;
  }

  throw new Error("Unauthorized");
}

export interface AgentReviewInput {
  companyId: string;
  agentType:
    | "journal_entry"
    | "legal_case"
    | "daily_closeout"
    | "collection_message"
    | "customer_autofill"
    | "payment_match"
    | "correction_verify";
  entityType: string;
  entityId?: string | null;
  verdict: string;
  confidence?: number | null;
  summary: string;
  details?: Record<string, unknown>;
  model?: string;
}

export async function storeAgentReview(
  supabase: SupabaseClient,
  review: AgentReviewInput,
): Promise<void> {
  const { error } = await supabase.from("ai_agent_reviews").insert({
    company_id: review.companyId,
    agent_type: review.agentType,
    entity_type: review.entityType,
    entity_id: review.entityId || null,
    verdict: review.verdict,
    confidence: review.confidence ?? null,
    summary: review.summary,
    details: review.details || {},
    model: review.model || null,
  });
  if (error) throw error;
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...agentCorsHeaders, "Content-Type": "application/json" },
  });
}
