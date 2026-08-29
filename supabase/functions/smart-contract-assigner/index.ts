/**
 * Smart Contract Assigner
 *
 * assign_new: assigns unassigned active contracts to the best employee —
 * lowest current workload, weighted by collection performance.
 * rebalance (nightly): moves "cold" contracts (no payment/communication in
 * 14 days) from overloaded to underloaded employees, capped per run, with a
 * full audit trail in contract_operations_log.
 *
 * Body: { companyId, mode?: "assign_new" | "rebalance", limit? }
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agentCorsHeaders,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  recordAgentMutation,
  type AgentInvocationContext,
} from "../_shared/agent.ts";

const COLD_DAYS = 14;
const REBALANCE_CAP = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  const supabase = createServiceClient();
  let invocation: AgentInvocationContext | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.companyId) throw new Error("companyId is required");
    invocation = await authorizeScheduledAgent(req, "smart-contract-assigner", body.companyId);

    const mode = body.mode === "rebalance" ? "rebalance" : "assign_new";

    const employees = await loadEligibleEmployees(supabase, body.companyId);
    if (employees.length === 0) {
      await finishAgentExecution(supabase, invocation, true, { assigned: 0, reason: "no_eligible_employees" });
      return jsonResponse({ success: true, assigned: 0, note: "no eligible employees" });
    }

    const result = mode === "rebalance"
      ? await rebalance(supabase, body.companyId, employees, clampLimit(body.limit, REBALANCE_CAP), invocation)
      : await assignNew(supabase, body.companyId, employees, clampLimit(body.limit, 25), invocation);

    await finishAgentExecution(supabase, invocation, true, { mode, ...result });
    return jsonResponse({ success: true, mode, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (invocation) {
      try {
        await finishAgentExecution(supabase, invocation, false, {
          error: message.slice(0, 500),
        }, "CONTRACT_ASSIGNMENT_FAILURE");
      } catch (finishError) {
        console.error("Could not close contract assignment execution run", finishError);
      }
    }
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

interface EmployeeScore {
  profileId: string;
  workload: number;
  collectionRate: number;
  score: number;
}

async function loadEligibleEmployees(
  supabase: SupabaseClient,
  companyId: string,
): Promise<EmployeeScore[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, role")
    .eq("company_id", companyId)
    .eq("is_active", true);
  const { data: employees } = await supabase
    .from("employees")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .not("user_id", "is", null);

  const employeeUserIds = new Set((employees || []).map((e) => e.user_id));
  const eligible = (profiles || []).filter((profile) =>
    ["employee", "collection_agent"].includes(profile.role || "") ||
    (profile.user_id && employeeUserIds.has(profile.user_id))
  );

  const scores: EmployeeScore[] = [];
  for (const profile of eligible) {
    const { count: workload } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("assigned_to_profile_id", profile.id)
      .eq("status", "active");

    const { data: performance } = await supabase
      .from("employee_performance")
      .select("collection_rate")
      .eq("company_id", companyId)
      .eq("employee_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const collectionRate = Number(performance?.collection_rate ?? 50);
    scores.push({
      profileId: profile.id,
      workload: workload || 0,
      collectionRate,
      score: 0,
    });
  }

  // Score = workload penalty − collection bonus; lower is better.
  for (const score of scores) {
    score.score = score.workload * 10 - score.collectionRate / 10;
  }
  return scores.sort((a, b) => a.score - b.score);
}

async function logAssignment(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  fromProfile: string | null,
  toProfile: string,
  reason: string,
) {
  await supabase.from("contract_operations_log").insert({
    contract_id: contractId,
    company_id: companyId,
    operation_type: "smart_assignment",
    operation_details: { from: fromProfile, to: toProfile, reason },
    notes: reason,
    performed_by: null,
  });
}

async function assignNew(
  supabase: SupabaseClient,
  companyId: string,
  employees: EmployeeScore[],
  limit: number,
  invocation: AgentInvocationContext,
) {
  const { data: unassigned, error } = await supabase
    .from("contracts")
    .select("id, contract_number")
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("assigned_to_profile_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let assigned = 0;
  const workload = new Map(employees.map((e) => [e.profileId, e.workload]));

  for (const contract of unassigned || []) {
    const best = employees
      .map((e) => ({ ...e, liveWorkload: workload.get(e.profileId) || 0 }))
      .sort((a, b) => (a.liveWorkload * 10 - a.collectionRate / 10) - (b.liveWorkload * 10 - b.collectionRate / 10))[0];
    if (!best) break;

    const { data: updated, error: updateError } = await supabase
      .from("contracts")
      .update({ assigned_to_profile_id: best.profileId, updated_at: new Date().toISOString() })
      .eq("id", contract.id)
      .eq("company_id", companyId)
      .is("assigned_to_profile_id", null)
      .select("id,assigned_to_profile_id")
      .maybeSingle();
    if (updateError || !updated) continue;

    workload.set(best.profileId, (workload.get(best.profileId) || 0) + 1);
    await logAssignment(
      supabase, companyId, contract.id, null, best.profileId,
      `إسناد تلقائي للعقد ${contract.contract_number} حسب العبء ونسبة التحصيل`,
    );
    await recordAgentMutation(supabase, invocation, {
      operation: "assign_contract_owner",
      entityType: "contract",
      entityId: contract.id,
      idempotencyKey: `assign:${contract.id}:${best.profileId}`,
      beforeState: { assigned_to_profile_id: null },
      afterState: { assigned_to_profile_id: updated.assigned_to_profile_id },
      postcondition: { persisted: updated.assigned_to_profile_id === best.profileId },
      verified: updated.assigned_to_profile_id === best.profileId,
    });
    assigned++;
  }

  return { assigned, candidates: (unassigned || []).length };
}

async function rebalance(
  supabase: SupabaseClient,
  companyId: string,
  employees: EmployeeScore[],
  limit: number,
  invocation: AgentInvocationContext,
) {
  if (employees.length < 2) return { moved: 0 };

  const totalWorkload = employees.reduce((sum, e) => sum + e.workload, 0);
  const average = totalWorkload / employees.length;
  const overloaded = employees.filter((e) => e.workload > average * 1.5 && e.workload >= 4);
  const underloaded = employees.filter((e) => e.workload < average * 0.75);
  if (overloaded.length === 0 || underloaded.length === 0) return { moved: 0 };

  const coldSince = new Date(Date.now() - COLD_DAYS * 86400000).toISOString().slice(0, 10);
  let moved = 0;

  for (const source of overloaded) {
    if (moved >= limit) break;

    // Cold contracts: no completed payment and no communication recently.
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, contract_number, customer_id")
      .eq("company_id", companyId)
      .eq("assigned_to_profile_id", source.profileId)
      .eq("status", "active")
      .order("updated_at", { ascending: true })
      .limit(20);

    for (const contract of contracts || []) {
      if (moved >= limit) break;

      const { count: recentPayments } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("contract_id", contract.id)
        .gte("payment_date", coldSince);
      if ((recentPayments || 0) > 0) continue;

      const { count: recentComms } = await supabase
        .from("customer_communications")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("customer_id", contract.customer_id)
        .gte("communication_date", coldSince);
      if ((recentComms || 0) > 0) continue;

      const target = underloaded.sort((a, b) => a.workload - b.workload)[0];
      const { data: updated, error: updateError } = await supabase
        .from("contracts")
        .update({ assigned_to_profile_id: target.profileId, updated_at: new Date().toISOString() })
        .eq("id", contract.id)
        .eq("company_id", companyId)
        .eq("assigned_to_profile_id", source.profileId)
        .select("id,assigned_to_profile_id")
        .maybeSingle();
      if (updateError || !updated) continue;

      target.workload++;
      source.workload--;
      await logAssignment(
        supabase, companyId, contract.id, source.profileId, target.profileId,
        `إعادة توازن ليلية: نقل العقد البارد ${contract.contract_number} (لا نشاط منذ ${COLD_DAYS} يوم)`,
      );
      await recordAgentMutation(supabase, invocation, {
        operation: "rebalance_contract_owner",
        entityType: "contract",
        entityId: contract.id,
        idempotencyKey: `rebalance:${contract.id}:${source.profileId}:${target.profileId}`,
        beforeState: { assigned_to_profile_id: source.profileId },
        afterState: { assigned_to_profile_id: updated.assigned_to_profile_id },
        postcondition: { persisted: updated.assigned_to_profile_id === target.profileId },
        verified: updated.assigned_to_profile_id === target.profileId,
      });
      moved++;
    }
  }

  return { moved };
}

function clampLimit(value: unknown, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return maximum;
  return Math.min(maximum, Math.max(1, Math.trunc(parsed)));
}
