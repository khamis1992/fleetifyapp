import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { runDomainWorker } from "../_shared/system-audit/workers.ts";
import type { AuditFinding, AuditJob } from "../_shared/system-audit/types.ts";
import {
  authorizeSystemAgent,
  getErrorMessage,
  getSystemAuditErrorStatus,
  invokeSystemWorker,
  readRequestJson,
  scheduleBackground,
  systemAuditCorsHeaders,
  systemAuditJson,
  triageFindingsWithLongCat,
} from "../_shared/system-audit/runtime.ts";

const WORKER_VERSION = "2026-08-27.55";
type SupabaseClient = ReturnType<typeof createClient>;

type JobControlAction = "pause" | "cancel" | "lease_invalid";

class JobControlStop extends Error {
  constructor(
    readonly action: JobControlAction,
    readonly controlReason: string
  ) {
    super(controlReason);
    this.name = "JobControlStop";
  }
}

const CANONICAL_FINANCE_COMMANDS = new Set([
  "contract.recalculate_totals",
  "invoice.recalculate_balance",
  "invoice.cancel_zero_safe",
  "schedule.sync_payment_state",
  "payment.correct_uncompleted_date",
  "payment.link_clear_invoice",
  "accounting.sync_draft_journal_totals",
]);

const CANONICAL_OPERATIONAL_COMMANDS = new Set([
  "vehicle.sync_status",
  "vehicle.sync_mileage",
  "customer.sync_balance",
  "inventory.sync_stock_level",
  "inventory.create_stock_level",
  "legal.sync_case_costs",
  "employee.sync_active_status",
  "employee.sync_attendance_hours",
  "employee.sync_leave_balance",
  "employee.sync_payroll_net",
]);

const CONTRACT_SCHEDULE_COMMANDS = new Set([
  "schedule.repair_invoice_link",
  "schedule.sync_amount_from_invoice",
]);

const CONTRACT_SCHEDULE_GRAPH_COMMANDS = new Set([
  "schedule.realign_contract_invoice_links",
]);

const CONTRACT_SCHEDULE_MATCHING_COMMANDS = new Set([
  "schedule.realign_contract_invoice_links_v2",
  "schedule.realign_contract_invoice_links_v3",
]);

const SCHEDULE_INVOICE_LINK_COMMANDS = new Set([
  "schedule.link_invoice_by_billing_month",
]);

const PAYMENT_CLASSIFICATION_COMMANDS = new Set([
  "payment.classify_customer_advance",
  "payment.link_clear_invoice",
]);

const LEGACY_OVERPAYMENT_COMMANDS = new Set([
  "invoice.normalize_legacy_overpayment",
]);

const TRAFFIC_VIOLATION_PAYMENT_COMMANDS = new Set([
  "traffic_violation_payment.post_missing_journal",
]);

const PAYROLL_ACCOUNTING_COMMANDS = new Set([
  "payroll.ensure_accrual",
  "payroll.ensure_payment",
]);

const PURCHASE_ORDER_COMMANDS = new Set([
  "purchase_order.sync_totals",
  "purchase_order.sync_receipt_status",
]);

const MONTHLY_OBLIGATION_COMMANDS = new Set([
  "monthly_obligation.sync_payment_state",
]);

const RENTAL_RECEIPT_COMMANDS = new Set([
  "rental_receipt.sync_payment_state",
]);

const LEGAL_INTEGRITY_COMMANDS = new Set([
  "legal.sync_contract_state",
  "legal.reset_unsupported_repayment",
]);

const MAINTENANCE_INTEGRITY_COMMANDS = new Set([
  "maintenance.sync_accounting_link",
]);

const BANK_PAYMENT_INTEGRITY_COMMANDS = new Set([
  "accounting.assign_single_active_bank",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: systemAuditCorsHeaders });

  let supabase: SupabaseClient | null = null;
  let job: AuditJob | null = null;
  try {
    await authorizeSystemAgent(req);
    const body = await readRequestJson<{ jobId?: string }>(req);
    if (!body.jobId)
      return systemAuditJson({ ok: false, error: "jobId is required" }, 400);

    supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: claimedJob, error: claimError } = await supabase.rpc(
      "system_agent_claim_job",
      {
        p_job_id: body.jobId,
        p_lease_seconds: 300,
      }
    );
    if (claimError) throw claimError;
    if (!claimedJob) {
      return systemAuditJson(
        {
          ok: true,
          skipped: true,
          reason: "Job is not dispatchable",
          workerVersion: WORKER_VERSION,
        },
        202
      );
    }
    job = claimedJob as AuditJob;

    await assertJobMayContinue(supabase, job);

    const batch = await runDomainWorker({ supabase, job, now: new Date() });
    await assertJobMayContinue(supabase, job);
    const findings = dedupeFindings(batch.findings);
    const aiDecisions =
      job.settings?.includeAiTriage === false ||
      Number(job.processed_batches || 0) > 1
        ? new Map<string, Record<string, unknown>>()
        : await triageFindingsWithLongCat(findings);
    await assertJobMayContinue(supabase, job);
    const outcome = await persistAndRepairFindings(
      supabase,
      job,
      findings,
      aiDecisions,
      () => assertJobMayContinue(supabase as SupabaseClient, job as AuditJob)
    );
    await assertJobMayContinue(supabase, job);
    const maxBatches = Number(job.settings?.maxBatches || 0);
    const hasMore =
      batch.hasMore &&
      (maxBatches <= 0 || Number(job.processed_batches || 0) < maxBatches);
    const stats = accumulateStats(job.stats || {}, {
      scanned: batch.scanned,
      findings: findings.length,
      repaired: outcome.repaired,
      verified: outcome.verified,
      repairFailed: outcome.failed,
      review: outcome.review,
      ...(batch.stats || {}),
    });

    const { error: finishError } = await supabase.rpc(
      "system_agent_finish_job",
      {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_success: true,
        p_has_more: hasMore,
        p_cursor: batch.cursor,
        p_stats: stats,
        p_error: null,
      }
    );
    if (finishError) throw finishError;

    if (hasMore) scheduleBackground(invokeSystemWorker(job.id));
    return systemAuditJson({
      ok: true,
      jobId: job.id,
      domain: job.domain,
      scanned: batch.scanned,
      findings: findings.length,
      repaired: outcome.repaired,
      verified: outcome.verified,
      repairFailed: outcome.failed,
      review: outcome.review,
      hasMore,
      workerVersion: WORKER_VERSION,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    if (error instanceof JobControlStop && supabase && job?.id && job.lease_token) {
      const cleanup =
        error.action === "pause"
          ? await supabase.rpc("system_agent_finish_job", {
              p_job_id: job.id,
              p_lease_token: job.lease_token,
              p_success: true,
              p_has_more: true,
              p_cursor: job.cursor || {},
              p_stats: job.stats || {},
              p_error: null,
            })
          : error.action === "cancel"
          ? await supabase.rpc("system_agent_cancel_claimed_job_v1", {
              p_job_id: job.id,
              p_lease_token: job.lease_token,
              p_reason: error.controlReason,
            })
          : { error: null };

      return systemAuditJson(
        {
          ok: true,
          skipped: true,
          jobId: job.id,
          reason: error.controlReason,
          controlAction: error.action,
          cleanupError: cleanup.error?.message || null,
          workerVersion: WORKER_VERSION,
        },
        202
      );
    }
    if (supabase && job?.id && job.lease_token) {
      await supabase.rpc("system_agent_finish_job", {
        p_job_id: job.id,
        p_lease_token: job.lease_token,
        p_success: false,
        p_has_more: true,
        p_cursor: job.cursor || {},
        p_stats: job.stats || {},
        p_error: message,
      });
    }
    return systemAuditJson(
      {
        ok: false,
        jobId: job?.id || null,
        error: message,
        workerVersion: WORKER_VERSION,
      },
      getSystemAuditErrorStatus(error)
    );
  }
});

async function persistAndRepairFindings(
  supabase: SupabaseClient,
  job: AuditJob,
  findings: AuditFinding[],
  aiDecisions: Map<string, Record<string, unknown>>,
  assertMayContinue: () => Promise<void>
) {
  let repaired = 0;
  let verified = 0;
  let failed = 0;
  const review = findings.filter((finding) => !finding.repair).length;
  const findingRows = findings.map((finding) => {
    const aiDecision = aiDecisions.get(finding.dedupeKey) || null;
    return {
      run_id: job.run_id,
      job_id: job.id,
      company_id: job.company_id,
      domain: job.domain,
      dedupe_key: finding.dedupeKey,
      code: finding.code,
      severity: finding.severity,
      entity_type: finding.entityType,
      entity_id: finding.entityId,
      title: finding.title,
      details: finding.details,
      evidence: finding.evidence,
      confidence: finding.confidence,
      repair_command: finding.repair?.command || null,
      repair_payload: finding.repair
        ? {
            expectedBefore: finding.repair.expectedBefore,
            values: finding.repair.values,
          }
        : null,
      status: finding.repair ? "planned" : "review",
      ai_decision: aiDecision,
    };
  });
  const savedByKey = await persistFindingRows(
    supabase,
    job.run_id,
    findingRows,
    assertMayContinue
  );

  for (const finding of findings) {
    await assertMayContinue();
    const saved = savedByKey.get(finding.dedupeKey);
    if (!saved)
      throw new Error(`Persisted finding was not found: ${finding.dedupeKey}`);
    if (["repaired", "rolled_back", "ignored"].includes(saved.status)) continue;

    if (
      !finding.repair ||
      !finding.repair.autoApply ||
      job.mode === "dry_run"
    ) {
      continue;
    }

    const { error: repairingError } = await supabase
      .from("system_agent_findings")
      .update({
        status: "repairing",
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", saved.id);
    if (repairingError) throw repairingError;
    const repairRpc =
      finding.repair.command === "customer.create_balance"
        ? "system_agent_apply_customer_balance_create_repair"
        : [
            "schedule.repair_invoice_link",
            "schedule.link_invoice_by_billing_month",
            "contract.generate_missing_invoice",
          ].includes(finding.repair.command)
        ? "system_agent_apply_contract_invoice_billing_month_repair_v9"
        : finding.repair.command === "schedule.consolidate_duplicate_rows"
        ? "system_agent_apply_schedule_duplicate_rows_repair_v2"
        : finding.repair.command ===
          "schedule.realign_contract_invoice_links_v3"
        ? "system_agent_apply_contract_schedule_matching_repair_v3"
        : CONTRACT_SCHEDULE_MATCHING_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_contract_schedule_matching_repair_v2"
        : CONTRACT_SCHEDULE_GRAPH_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_contract_schedule_graph_repair_v1"
        : SCHEDULE_INVOICE_LINK_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_schedule_invoice_link_repair_v1"
        : CONTRACT_SCHEDULE_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_contract_schedule_repair_v1"
        : PAYMENT_CLASSIFICATION_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_payment_classification_repair_v1"
        : LEGACY_OVERPAYMENT_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_legacy_overpayment_repair_v1"
        : TRAFFIC_VIOLATION_PAYMENT_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_traffic_violation_payment_repair_v1"
        : PAYROLL_ACCOUNTING_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_payroll_repair_v1"
        : PURCHASE_ORDER_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_purchase_order_repair_v1"
        : MONTHLY_OBLIGATION_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_monthly_obligation_repair_v1"
        : RENTAL_RECEIPT_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_rental_receipt_repair_v1"
        : LEGAL_INTEGRITY_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_legal_integrity_repair_v1"
        : MAINTENANCE_INTEGRITY_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_maintenance_integrity_repair_v1"
        : BANK_PAYMENT_INTEGRITY_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_bank_payment_integrity_repair_v1"
        : finding.repair.command === "schedule.link_invoice"
        ? "system_agent_apply_contract_invoice_repair_v3"
        : CANONICAL_FINANCE_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_finance_repair"
        : CANONICAL_OPERATIONAL_COMMANDS.has(finding.repair.command)
        ? "system_agent_apply_operational_repair"
        : null;
    if (!repairRpc) {
      failed += 1;
      await supabase
        .from("system_agent_findings")
        .update({
          status: "failed",
          error: "No canonical repair gateway is registered for this command",
          updated_at: new Date().toISOString(),
        })
        .eq("id", saved.id);
      continue;
    }
    await assertMayContinue();
    const { data: repairResult, error: repairError } = await supabase.rpc(
      repairRpc,
      {
        p_run_id: job.run_id,
        p_job_id: job.id,
        p_finding_id: saved.id,
        p_command: finding.repair.command,
        p_company_id: job.company_id,
        p_entity_id: finding.repair.entityId,
        p_expected_before: finding.repair.expectedBefore,
        p_values: finding.repair.values,
        p_metadata: { workerDomain: job.domain },
      }
    );
    if (repairError) {
      failed += 1;
      await supabase
        .from("system_agent_findings")
        .update({
          status: "failed",
          error: String(repairError.message || repairError).slice(0, 4000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", saved.id);
    } else if (repairResult?.status === "verified_no_change") {
      verified += 1;
    } else if (repairResult?.status === "repaired" || repairResult?.repair_id) {
      repaired += 1;
    } else {
      failed += 1;
      await supabase
        .from("system_agent_findings")
        .update({
          status: "failed",
          error: "Repair gateway returned no verified outcome",
          updated_at: new Date().toISOString(),
        })
        .eq("id", saved.id);
    }
  }

  return { repaired, verified, failed, review };
}

async function persistFindingRows(
  supabase: SupabaseClient,
  runId: string,
  rows: Array<Record<string, unknown>>,
  assertMayContinue: () => Promise<void>
): Promise<Map<string, { id: string; status: string }>> {
  const savedByKey = new Map<string, { id: string; status: string }>();
  for (let index = 0; index < rows.length; index += 50) {
    await assertMayContinue();
    const chunk = rows.slice(index, index + 50);
    const { error: insertError } = await supabase
      .from("system_agent_findings")
      .upsert(chunk, {
        onConflict: "run_id,dedupe_key",
        ignoreDuplicates: true,
      });
    if (insertError) throw insertError;

    const keys = chunk.map((row) => String(row.dedupe_key));
    const { data, error: loadError } = await supabase
      .from("system_agent_findings")
      .select("id,dedupe_key,status")
      .eq("run_id", runId)
      .in("dedupe_key", keys);
    if (loadError) throw loadError;
    for (const saved of data || []) {
      savedByKey.set(saved.dedupe_key, { id: saved.id, status: saved.status });
    }
  }
  return savedByKey;
}

async function assertJobMayContinue(
  supabase: SupabaseClient,
  job: AuditJob
): Promise<void> {
  const { data, error } = await supabase.rpc(
    "system_agent_get_job_execution_control_v1",
    {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
    }
  );
  if (error) throw error;

  const control = (data || {}) as Record<string, unknown>;
  if (control.leaseValid !== true) {
    throw new JobControlStop("lease_invalid", "job_lease_is_no_longer_valid");
  }
  if (control.cancelRequested === true || control.killSwitch === true) {
    throw new JobControlStop(
      "cancel",
      String(control.cancelReason || (control.killSwitch ? "company_kill_switch" : "manual_cancel"))
    );
  }
  if (control.enabled === false || control.paused === true) {
    throw new JobControlStop(
      "pause",
      control.enabled === false ? "company_agent_disabled" : "company_agent_paused"
    );
  }
}

function dedupeFindings(findings: AuditFinding[]): AuditFinding[] {
  const unique = new Map<string, AuditFinding>();
  for (const finding of findings) {
    if (!unique.has(finding.dedupeKey)) unique.set(finding.dedupeKey, finding);
  }
  return [...unique.values()];
}

function accumulateStats(
  current: Record<string, number>,
  additions: Record<string, number>
) {
  const result = { ...current };
  for (const [key, value] of Object.entries(additions))
    result[key] = Number(result[key] || 0) + Number(value || 0);
  return result;
}
