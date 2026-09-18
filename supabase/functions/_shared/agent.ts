import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const agentCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-id, x-agent-secret",
};

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function authorizeAgent(
  req: Request,
  companyId?: string | null,
  requireCompanyScope = false,
): Promise<AgentCallerAuthorization> {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { userId: null, serviceRole: true };
  }

  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) {
      if (!companyId) {
        if (requireCompanyScope) throw new Error("Unauthorized");
        return { userId: data.user.id, serviceRole: false };
      }

      const admin = createServiceClient();
      const [{ data: profile }, { data: roles }] = await Promise.all([
        admin
          .from("profiles")
          .select("company_id,is_active")
          .eq("user_id", data.user.id)
          .maybeSingle(),
        admin
          .from("user_roles")
          .select("role,company_id")
          .eq("user_id", data.user.id),
      ]);
      const isSuperAdmin = (roles || []).some(
        (role: { role: string }) => role.role === "super_admin",
      );
      const isActiveCompanyMember = profile?.is_active === true &&
        profile.company_id === companyId;
      if (isSuperAdmin || isActiveCompanyMember) {
        return { userId: data.user.id, serviceRole: false };
      }
    }
  }

  throw new Error("Unauthorized");
}

export interface AgentCallerAuthorization {
  userId: string | null;
  serviceRole: boolean;
}

/**
 * Apply policy/kill-switch/conflict leasing to authenticated and trusted
 * service-role invocations. Scheduled calls use the stronger per-agent secret
 * path below, while manual calls still fail closed when policy is unavailable.
 */
export async function authorizeGovernedAgent(
  req: Request,
  agentId: string,
  companyId: string,
): Promise<AgentInvocationContext> {
  const caller = await authorizeAgent(req, companyId, true);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("begin_trusted_agent_invocation_v1", {
    p_agent_id: agentId,
    p_company_id: companyId,
    p_request_id: requestId,
    p_actor_id: caller.userId,
  });
  if (error) {
    console.error("Trusted agent policy verification failed", {
      agentId,
      code: error.code || null,
    });
    throw new Error("Agent policy verification unavailable");
  }
  if (data !== true) throw new Error("Agent disabled or busy");
  return {
    agentId,
    companyId,
    requestId,
    machine: false,
    governed: true,
  };
}

/**
 * Authenticate a scheduled Edge invocation against a function-specific secret
 * stored in Postgres Vault. The Edge runtime never stores a second plaintext
 * copy of that secret. Interactive callers continue through the normal
 * authenticated-user/service-role path when no machine headers are supplied.
 */
export async function authorizeScheduledAgent(
  req: Request,
  agentId: string,
  companyId?: string | null,
): Promise<AgentInvocationContext> {
  const suppliedAgentId = req.headers.get("x-agent-id") || "";
  const suppliedSecret = req.headers.get("x-agent-secret") || "";

  if (suppliedAgentId || suppliedSecret) {
    if (suppliedAgentId !== agentId || !suppliedSecret) {
      throw new Error("Unauthorized");
    }

    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const admin = createServiceClient();
    const { data, error } = await admin.rpc(
      "verify_scheduled_agent_invocation_v2",
      {
        p_agent_id: agentId,
        p_company_id: companyId || null,
        p_supplied_secret: suppliedSecret,
        p_request_id: requestId,
      },
    );
    if (error) {
      console.error("Scheduled agent identity verification failed", {
        agentId,
        code: error.code || null,
      });
      throw new Error("Agent identity verification unavailable");
    }
    if (data === true) {
      return {
        agentId,
        companyId: companyId || null,
        requestId,
        machine: true,
        governed: true,
      };
    }
    throw new Error("Unauthorized");
  }

  if (!companyId) throw new Error("Unauthorized");
  return authorizeGovernedAgent(req, agentId, companyId);
}

export interface AgentInvocationContext {
  agentId: string;
  companyId: string | null;
  requestId: string;
  machine: boolean;
  governed: boolean;
}

export async function recordAgentMutation(
  supabase: SupabaseClient,
  invocation: AgentInvocationContext,
  input: {
    operation: string;
    entityType: string;
    entityId: string;
    idempotencyKey: string;
    beforeState: Record<string, unknown>;
    afterState: Record<string, unknown>;
    postcondition: Record<string, unknown>;
    verified: boolean;
  },
): Promise<void> {
  if (!invocation.governed || !invocation.companyId) return;
  const { data, error } = await supabase.rpc("record_agent_mutation_v1", {
    p_company_id: invocation.companyId,
    p_agent_id: invocation.agentId,
    p_request_id: invocation.requestId,
    p_operation: input.operation,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_idempotency_key: input.idempotencyKey,
    p_before_state: input.beforeState,
    p_after_state: input.afterState,
    p_postcondition: input.postcondition,
    p_verified: input.verified,
  });
  if (error) throw error;
  if (data?.blocked === true) {
    throw new Error(String(data.reason || "AGENT_MUTATION_BUDGET_EXHAUSTED"));
  }
}

export async function finishAgentExecution(
  supabase: SupabaseClient,
  invocation: AgentInvocationContext,
  success: boolean,
  summary: Record<string, unknown>,
  failureCode?: string | null,
): Promise<void> {
  if (!invocation.governed || !invocation.companyId) return;
  const { error } = await supabase.rpc("finish_agent_execution_v1", {
    p_company_id: invocation.companyId,
    p_agent_id: invocation.agentId,
    p_request_id: invocation.requestId,
    p_success: success,
    p_summary: summary,
    p_failure_code: failureCode || null,
  });
  if (error) throw error;
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
    | "correction_verify"
    | "formal_notice";
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
