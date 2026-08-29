/**
 * Safe Auto-Repair
 *
 * Applies ONLY fully-safe, deterministic repairs nightly, storing before/after
 * state for rollback:
 *   - invoice balance_due drift where the invoice has no payments/journal
 *     (derived display state only)
 *   - contract financial state re-derivation through the canonical
 *     recalculate_contract_financial_state() when stored totals drift
 * Anything outside these classes is escalated as a task, never touched.
 *
 * Body: { companyId } | { mode: "rollback", repairId, actorId? }
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agentCorsHeaders,
  authorizeScheduledAgent,
  createServiceClient,
  jsonResponse,
  storeAgentReview,
} from "../_shared/agent.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createServiceClient();
    let authorizationCompanyId = typeof body.companyId === "string"
      ? body.companyId
      : null;
    if (!authorizationCompanyId && body.mode === "rollback" && body.repairId) {
      const { data: repair, error: repairError } = await supabase
        .from("safe_auto_repairs")
        .select("company_id")
        .eq("id", body.repairId)
        .maybeSingle();
      if (repairError) throw repairError;
      authorizationCompanyId = repair?.company_id || null;
    }
    await authorizeScheduledAgent(
      req,
      "safe-auto-repair",
      authorizationCompanyId,
    );

    // This writer was replaced by the versioned system-audit control plane.
    // Retain only the explicit rollback path for historical repairs; accepting
    // new repair runs here would reintroduce two autonomous writers over the
    // same financial rows.
    if (body.mode !== "rollback") {
      return jsonResponse({
        success: false,
        retired: true,
        replacement: "system-audit-orchestrator",
        error: "safe-auto-repair no longer accepts new repair runs",
      }, 410);
    }

    if (body.mode === "rollback") {
      if (!body.repairId) throw new Error("repairId is required");
      const result = await rollbackRepair(supabase, body.repairId);
      return jsonResponse({ success: true, ...result });
    }

    if (!body.companyId) throw new Error("companyId is required");
    const result = await runSafeRepairs(supabase, body.companyId);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

async function runSafeRepairs(supabase: SupabaseClient, companyId: string) {
  let invoiceFixes = 0;
  let contractRecalcs = 0;
  let escalated = 0;

  // 1) Invoice balance_due drift — only when nothing financial is attached.
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, paid_amount, balance_due, status, journal_entry_id")
    .eq("company_id", companyId)
    .not("status", "in", '("cancelled","canceled","void","voided","deleted")')
    .order("updated_at", { ascending: false })
    .limit(400);

  for (const invoice of invoices || []) {
    const expected = Math.max(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0), 0);
    const drift = Math.abs(Number(invoice.balance_due || 0) - expected);
    if (drift <= 0.02) continue;

    const { count: paymentCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoice.id);

    const safe = !invoice.journal_entry_id && (paymentCount || 0) === 0;
    if (!safe) {
      escalated++; // has financial history — the nightly auditor opens a task
      continue;
    }

    const before = { balance_due: invoice.balance_due };
    const { error } = await supabase
      .from("invoices")
      .update({ balance_due: expected, updated_at: new Date().toISOString() })
      .eq("id", invoice.id)
      .eq("company_id", companyId);
    if (error) continue;

    await supabase.from("safe_auto_repairs").insert({
      company_id: companyId,
      entity_type: "invoices",
      entity_id: invoice.id,
      repair_type: "invoice_balance_drift",
      before_state: before,
      after_state: { balance_due: expected },
    });
    invoiceFixes++;
  }

  // 2) Contract stored totals drift — re-derive through the canonical function.
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_number, balance_due, total_paid")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(300);

  for (const contract of contracts || []) {
    const { data: contractInvoices } = await supabase
      .from("invoices")
      .select("balance_due, status")
      .eq("company_id", companyId)
      .eq("contract_id", contract.id);
    const computed = (contractInvoices || [])
      .filter((i) => !["cancelled", "canceled", "void", "voided", "deleted"].includes(String(i.status || "").toLowerCase()))
      .reduce((sum, i) => sum + Math.max(Number(i.balance_due || 0), 0), 0);

    if (Math.abs(Number(contract.balance_due || 0) - computed) <= 0.02) continue;

    const before = {
      balance_due: contract.balance_due,
      total_paid: contract.total_paid,
    };
    const { error } = await supabase.rpc("recalculate_contract_financial_state", {
      p_contract_id: contract.id,
    });
    if (error) {
      escalated++;
      continue;
    }

    const { data: afterRow } = await supabase
      .from("contracts")
      .select("balance_due, total_paid")
      .eq("id", contract.id)
      .single();

    await supabase.from("safe_auto_repairs").insert({
      company_id: companyId,
      entity_type: "contracts",
      entity_id: contract.id,
      repair_type: "contract_state_recalc",
      before_state: before,
      after_state: afterRow || {},
    });
    contractRecalcs++;
  }

  await storeAgentReview(supabase, {
    companyId,
    agentType: "auto_repair",
    entityType: "companies",
    entityId: companyId,
    verdict: invoiceFixes + contractRecalcs > 0 ? "repaired" : "clean",
    summary: `الإصلاح الذاتي الليلي: ${invoiceFixes} فاتورة، ${contractRecalcs} عقد أعيد اشتقاقه، ${escalated} صعّد للمراجعة`,
    details: { invoice_fixes: invoiceFixes, contract_recalcs: contractRecalcs, escalated },
  });

  return { invoiceFixes, contractRecalcs, escalated };
}

async function rollbackRepair(supabase: SupabaseClient, repairId: string) {
  const { data: repair, error } = await supabase
    .from("safe_auto_repairs")
    .select("*")
    .eq("id", repairId)
    .is("rolled_back_at", null)
    .single();
  if (error || !repair) throw new Error("Repair not found or already rolled back");

  if (repair.repair_type !== "invoice_balance_drift") {
    throw new Error("Only invoice balance repairs support direct rollback; contract recalcs are re-derived on demand");
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      balance_due: Number((repair.before_state as Record<string, unknown>).balance_due || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", repair.entity_id)
    .eq("company_id", repair.company_id);
  if (updateError) throw updateError;

  await supabase
    .from("safe_auto_repairs")
    .update({ rolled_back_at: new Date().toISOString() })
    .eq("id", repairId);

  return { rolledBack: true };
}
