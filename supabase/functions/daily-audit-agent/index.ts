import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";
import {
  invoiceContractBillingMonthKey,
  isInvoiceOutsideContractBillingMonths,
} from "./invoice-month.ts";
import {
  buildDailyRotatingRanges,
  getUtcDayNumber,
} from "./daily-rotation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

type AuditRequest = {
  dryRun?: boolean;
  companyId?: string;
  contractId?: string;
  contractNumber?: string;
  maxCompanies?: number;
  maxContractsPerCompany?: number;
  maxInvoicesPerCompany?: number;
  maxJournalRepairBatch?: number;
  includeAiSummary?: boolean;
};

type CompanyResult = {
  companyId: string;
  companyName: string | null;
  invoices: {
    scanned: number;
    fixedBalances: number;
  };
  contracts: {
    scanned: number;
    fixedTotals: number;
    invoiceBackfillRuns: number;
    invoiceBackfillCreated: number;
    invoiceBackfillSkipped: number;
    cancelledZeroInvoicesCancelled: number;
    scheduleLinksRepaired: number;
    scheduleStatesSynced: number;
    invoiceAmountsReconciled: number;
    duplicateInvoicesCancelled: number;
    outsideInvoicesCancelled: number;
    unlinkedPaymentsLinked: number;
    outOfPeriodPaymentsRepaired: number;
  };
  accounting: {
    paymentJournalNeedsCreate: number;
    paymentJournalNeedsRelink: number;
    paymentJournalCreated: number;
    paymentJournalRelinked: number;
    paymentJournalFailed: number;
    unbalancedJournalEntries: number;
  };
  reviewItems: string[];
  errors: string[];
};

type AgentResult = {
  ok: boolean;
  status: "completed" | "partial";
  mode: "dry_run" | "apply";
  source: "longcat" | "local";
  startedAt: string;
  finishedAt: string;
  summary: string;
  companiesProcessed: number;
  totals: {
    invoicesFixed: number;
    contractsFixed: number;
    invoiceBackfillCreated: number;
    cancelledZeroInvoicesCancelled: number;
    scheduleLinksRepaired: number;
    scheduleStatesSynced: number;
    invoiceAmountsReconciled: number;
    duplicateInvoicesCancelled: number;
    outsideInvoicesCancelled: number;
    unlinkedPaymentsLinked: number;
    outOfPeriodPaymentsRepaired: number;
    paymentJournalsCreated: number;
    paymentJournalsRelinked: number;
    paymentJournalFailures: number;
    unbalancedJournalEntries: number;
    errors: number;
  };
  companies: CompanyResult[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();

  try {
    authorizeAgent(req);

    const body = await readJson<AuditRequest>(req);
    const dryRun = body.dryRun !== false;
    const maxCompanies = clampInt(body.maxCompanies, 1, 50, 10);
    const maxContractsPerCompany = clampInt(body.maxContractsPerCompany, 1, 500, 80);
    const maxInvoicesPerCompany = clampInt(body.maxInvoicesPerCompany, 1, 2000, 600);
    const maxJournalRepairBatch = clampInt(body.maxJournalRepairBatch, 1, 1000, 150);
    const includeAiSummary = body.includeAiSummary !== false;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const hasContractSelector = Boolean(body.contractId || body.contractNumber);
    const targetContracts = await loadTargetContracts(supabase, body);
    if (hasContractSelector && targetContracts.length === 0) {
      throw new Error("Requested contract selector did not match any contract");
    }
    if (hasContractSelector && targetContracts.length !== 1) {
      throw new Error("Requested contract selector is ambiguous; include companyId or contractId");
    }
    const targetCompanyId = hasContractSelector
      ? targetContracts[0].company_id
      : body.companyId;
    const companies = await loadCompanies(supabase, targetCompanyId, maxCompanies);
    const results: CompanyResult[] = [];

    for (const company of companies) {
      const targetContractIds = targetContracts
        .filter((contract: any) => contract.company_id === company.id)
        .map((contract: any) => contract.id);

      results.push(await auditCompany({
        supabase,
        company,
        dryRun,
        maxContractsPerCompany,
        maxInvoicesPerCompany,
        maxJournalRepairBatch,
        targetContractIds: hasContractSelector ? targetContractIds : null,
      }));
    }

    const totals = summarizeTotals(results);
    const localSummary = buildLocalSummary(dryRun, results, totals);
    const aiSummary = includeAiSummary ? await buildAiSummary(localSummary, totals, results) : null;

    const finishedAt = new Date().toISOString();
    const response: AgentResult = {
      ok: totals.errors === 0,
      status: totals.errors === 0 ? "completed" : "partial",
      mode: dryRun ? "dry_run" : "apply",
      source: aiSummary ? "longcat" : "local",
      startedAt,
      finishedAt,
      summary: aiSummary || localSummary,
      companiesProcessed: results.length,
      totals,
      companies: results,
    };

    await writeAgentAuditLog(supabase, response);

    return jsonResponse(response, response.status === "partial" ? 207 : 200);
  } catch (error) {
    const finishedAt = new Date().toISOString();
    return jsonResponse({
      ok: false,
      status: "partial",
      mode: "dry_run",
      source: "local",
      startedAt,
      finishedAt,
      error: getErrorMessage(error),
    }, 500);
  }
});

function authorizeAgent(req: Request) {
  const configuredSecret = Deno.env.get("AUDIT_AGENT_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("authorization") || "";
  const agentSecret = req.headers.get("x-agent-secret") || "";

  if (configuredSecret && agentSecret === configuredSecret) return;
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;

  throw new Error("Unauthorized daily audit agent request");
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    return {} as T;
  }
}

async function loadCompanies(supabase: any, companyId: string | undefined, limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const isEligible = (company: any) => {
    const status = String(company.subscription_status || "active").toLowerCase();
    if (status && !["active", "trial", ""].includes(status)) return false;
    if (company.subscription_expires_at && String(company.subscription_expires_at).slice(0, 10) < today) return false;
    return true;
  };

  if (companyId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, name_ar, subscription_status, subscription_expires_at")
      .eq("id", companyId)
      .limit(1);
    if (error) throw error;
    return (data || []).filter(isEligible);
  }

  // Load every eligible company with stable keyset pagination, then rotate the
  // bounded daily slice. A fixed `created_at ASC LIMIT 20` permanently starved
  // every company after the first page.
  const eligibleCompanies: any[] = [];
  let afterId: string | null = null;
  const pageSize = 500;
  while (true) {
    let query = supabase
      .from("companies")
      .select("id, name, name_ar, subscription_status, subscription_expires_at")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (afterId) query = query.gt("id", afterId);

    const { data, error } = await query;
    if (error) throw error;
    const page = data || [];
    eligibleCompanies.push(...page.filter(isEligible));
    if (page.length < pageSize) break;

    const nextAfterId = page[page.length - 1]?.id;
    if (!nextAfterId || nextAfterId === afterId) {
      throw new Error("Company keyset pagination did not advance");
    }
    afterId = nextAfterId;
  }

  const ranges = buildDailyRotatingRanges(
    eligibleCompanies.length,
    limit,
    getUtcDayNumber(),
  );
  return ranges.flatMap((range) =>
    eligibleCompanies.slice(range.from, range.to + 1)
  );
}

async function loadTargetContracts(supabase: any, body: AuditRequest) {
  if (!body.contractId && !body.contractNumber) return [];

  let query = supabase
    .from("contracts")
    .select("id, company_id, contract_number, status")
    .limit(20);

  if (body.contractId) query = query.eq("id", body.contractId);
  if (body.contractNumber) query = query.eq("contract_number", body.contractNumber);
  if (body.companyId) query = query.eq("company_id", body.companyId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function auditCompany({
  supabase,
  company,
  dryRun,
  maxContractsPerCompany,
  maxInvoicesPerCompany,
  maxJournalRepairBatch,
  targetContractIds,
}: {
  supabase: any;
  company: any;
  dryRun: boolean;
  maxContractsPerCompany: number;
  maxInvoicesPerCompany: number;
  maxJournalRepairBatch: number;
  targetContractIds: string[] | null;
}): Promise<CompanyResult> {
  const result: CompanyResult = {
    companyId: company.id,
    companyName: company.name_ar || company.name || null,
    invoices: { scanned: 0, fixedBalances: 0 },
    contracts: {
      scanned: 0,
      fixedTotals: 0,
      invoiceBackfillRuns: 0,
      invoiceBackfillCreated: 0,
      invoiceBackfillSkipped: 0,
      cancelledZeroInvoicesCancelled: 0,
      scheduleLinksRepaired: 0,
      scheduleStatesSynced: 0,
      invoiceAmountsReconciled: 0,
      duplicateInvoicesCancelled: 0,
      outsideInvoicesCancelled: 0,
      unlinkedPaymentsLinked: 0,
      outOfPeriodPaymentsRepaired: 0,
    },
    accounting: {
      paymentJournalNeedsCreate: 0,
      paymentJournalNeedsRelink: 0,
      paymentJournalCreated: 0,
      paymentJournalRelinked: 0,
      paymentJournalFailed: 0,
      unbalancedJournalEntries: 0,
    },
    reviewItems: [],
    errors: [],
  };

  await safeStep(result, "backfill_missing_contract_invoices", async () => {
    // Missing links and zero-row graphs go through the canonical generator.
    // Ambiguous/wrong existing links remain review findings for the system
    // audit gateway; this agent never rewires them with a direct UPDATE.
    const backfill = await backfillContractInvoices(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds);
    result.contracts.invoiceBackfillRuns = backfill.runs;
    result.contracts.invoiceBackfillCreated = backfill.created;
    result.contracts.invoiceBackfillSkipped = backfill.skipped;
    const backfillFailures = backfill.errors.map(
      (error) => `backfill_missing_contract_invoices: ${error}`,
    );
    result.errors.push(...backfillFailures);
    result.reviewItems.push(...backfillFailures.map(
      (error) => `فشل إصلاح فوترة تلقائي ويتطلب مراجعة المشرف: ${error}`,
    ));
  });

  // Missing invoice graphs are the primary repair objective and must run
  // before any secondary balance maintenance can consume the Edge deadline.
  await safeStep(result, "recalculate_invoice_balances", async () => {
    result.invoices = await recalculateInvoiceBalances(supabase, company.id, dryRun, maxInvoicesPerCompany, targetContractIds);
  });

  await safeStep(result, "recalculate_contract_totals", async () => {
    result.contracts = {
      ...result.contracts,
      ...(await recalculateContractTotals(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds)),
    };
  });

  await safeStep(result, "reconcile_invoice_amounts_with_schedules", async () => {
    result.contracts.invoiceAmountsReconciled = await reconcileInvoiceAmountsWithSchedules(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "cleanup_duplicate_contract_month_invoices", async () => {
    result.contracts.duplicateInvoicesCancelled = await cleanupDuplicateContractMonthInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "cleanup_outside_contract_invoices", async () => {
    result.contracts.outsideInvoicesCancelled = await cleanupOutsideContractInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "cleanup_cancelled_contract_zero_invoices", async () => {
    result.contracts.cancelledZeroInvoicesCancelled = await cleanupCancelledContractZeroInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "link_unlinked_payments_to_invoices", async () => {
    result.contracts.unlinkedPaymentsLinked = await linkUnlinkedPaymentsToClearInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "sync_schedule_payment_states", async () => {
    result.contracts.scheduleStatesSynced = await syncSchedulePaymentStates(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
    );
  });

  await safeStep(result, "repair_out_of_period_payments", async () => {
    result.contracts.outOfPeriodPaymentsRepaired = await repairOutOfPeriodPayments(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems,
    );
  });

  await safeStep(result, "detect_contract_overpayments", async () => {
    const overpaidContracts = await detectContractOverpayments(supabase, company.id, maxContractsPerCompany, targetContractIds);
    if (overpaidContracts > 0) {
      result.reviewItems.push(`${overpaidContracts} contracts have completed payments greater than contract amount and need credit/refund review.`);
    }
  });

  await safeStep(result, "detect_duplicate_payments", async () => {
    const duplicatePayments = await detectDuplicatePayments(supabase, company.id, maxContractsPerCompany, targetContractIds);
    if (duplicatePayments > 0) {
      result.reviewItems.push(`${duplicatePayments} possible duplicate payments need receipt/bank reference review.`);
    }
  });

  await safeStep(result, "repair_payment_journal_integrity", async () => {
    const journal = await repairPaymentJournalIntegrity(supabase, company.id, !dryRun, maxJournalRepairBatch);
    result.accounting.paymentJournalNeedsCreate = journal.needsCreate;
    result.accounting.paymentJournalNeedsRelink = journal.needsRelink;
    result.accounting.paymentJournalCreated = journal.created;
    result.accounting.paymentJournalRelinked = journal.relinked;
    result.accounting.paymentJournalFailed = journal.failed;
  });

  await safeStep(result, "detect_unbalanced_journal_entries", async () => {
    result.accounting.unbalancedJournalEntries = await countUnbalancedJournalEntries(supabase, company.id);
    if (result.accounting.unbalancedJournalEntries > 0) {
      result.reviewItems.push(`${result.accounting.unbalancedJournalEntries} unbalanced journal entries need accounting review.`);
    }
  });

  await safeStep(result, "surface_review_items_task", async () => {
    // A contract-targeted run is not a complete company snapshot. It must never replace or close the company-wide review task because doing so
    // would hide findings from contracts that this invocation did not scan.
    if (!dryRun && targetContractIds === null) {
      await reconcileDailyAuditReviewTask(supabase, company.id, result.reviewItems);
    }
  });

  return result;
}

async function reconcileDailyAuditReviewTask(supabase: any, companyId: string, reviewItems: string[]) {
  // Daily runs intentionally inspect bounded, rotating windows. An empty
  // window is therefore not proof that findings from another window were
  // resolved. Daily tasks are additive-only and are closed by a human or by
  // a separate audit that can prove it inspected a complete snapshot.
  if (reviewItems.length === 0) return;

  const now = new Date().toISOString();
  const lifecycleKey = `daily-audit-agent:${companyId}`;
  const title = `مراجعة ${reviewItems.length} عنصرًا ماليًا رصده وكيل التدقيق اليومي`;
  const shown = reviewItems.slice(0, 20).map((item) => `- ${item}`).join("\n");
  const description = `وكيل التدقيق اليومي رصد ${reviewItems.length} عنصرًا يحتاج قرارًا بشريًا:\n${shown}${
    reviewItems.length > 20 ? `\n- ... و ${reviewItems.length - 20} عنصرًا إضافيًا في سجل التدقيق` : ""
  }`;

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("id,status,metadata,description,assigned_to,created_by,created_at")
    .eq("company_id", companyId)
    .eq("category", "system_audit_review")
    .in("status", ["pending", "in_progress", "on_hold"])
    .eq("metadata->>source", "daily_audit_agent")
    .order("created_at", { ascending: true });
  if (existingError) throw existingError;

  const openTasks = existing || [];
  if (openTasks.length > 0) {
    const [currentTask] = openTasks;
    const currentMetadata = currentTask.metadata && typeof currentTask.metadata === "object"
      ? currentTask.metadata
      : {};
    const previousReviewItems = Array.isArray(currentMetadata.reviewItems)
      ? currentMetadata.reviewItems.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const accumulatedReviewItems = Array.from(new Set([
      ...previousReviewItems,
      ...reviewItems,
    ]));
    const newReviewItems = reviewItems.filter((item) => !previousReviewItems.includes(item));
    const taskUpdate: Record<string, unknown> = {
      metadata: {
        ...currentMetadata,
        source: "daily_audit_agent",
        dailyAuditTaskKey: lifecycleKey,
        lifecycleMode: "additive_only",
        snapshotComplete: false,
        reviewItems: accumulatedReviewItems,
        reviewItemCount: accumulatedReviewItems.length,
        latestReviewItemCount: reviewItems.length,
        syncedAt: now,
      },
      updated_at: now,
    };
    // Preserve every prior finding. Pending tasks may append newly observed
    // items, while tasks already being worked remain textually untouched.
    if (currentTask.status === "pending" && newReviewItems.length > 0) {
      const additionalShown = newReviewItems
        .slice(0, 20)
        .map((item) => `- ${item}`)
        .join("\n");
      const additionalDescription = `Additional findings from the latest rotating audit window:\n${additionalShown}${
        newReviewItems.length > 20
          ? `\n- ... and ${newReviewItems.length - 20} more findings retained in task metadata and the audit log`
          : ""
      }`;
      taskUpdate.description = [currentTask.description, additionalDescription]
        .filter(Boolean)
        .join("\n\n");
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update(taskUpdate)
      .eq("company_id", companyId)
      .eq("id", currentTask.id);
    if (updateError) throw updateError;

    const actorId = currentTask.assigned_to || currentTask.created_by;
    if (actorId) {
      const { error: activityError } = await supabase.from("task_activity_log").insert({
        task_id: currentTask.id,
        user_id: actorId,
        action: "updated",
        description: currentTask.status === "pending"
          ? "حدّث وكيل التدقيق اليومي عناصر المراجعة المعلقة."
          : "أرفق وكيل التدقيق اليومي نتيجة الفحص الأحدث دون استبدال تفاصيل المهمة الجارية.",
        new_value: {
          lifecycleKey,
          lifecycleMode: "additive_only",
          snapshotComplete: false,
          reviewItemCount: accumulatedReviewItems.length,
          latestReviewItemCount: reviewItems.length,
          syncedAt: now,
        },
      });
      if (activityError) console.warn("[daily-audit-agent] update task activity log failed", activityError.message);
    }
    return;
  }

  // tasks.created_by references profiles.id, so pick an active privileged
  // profile of this company directly only when a new task is needed.
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .in("role", ["admin", "manager", "accountant", "super_admin", "company_admin"])
    .limit(1);
  if (profileError) throw profileError;

  const assignee = profileRows?.[0]?.id;
  if (!assignee) {
    throw new Error("No active manager profile is available for the daily audit review task");
  }

  const { error: insertError } = await supabase.from("tasks").insert({
    company_id: companyId,
    created_by: assignee,
    assigned_to: assignee,
    title,
    description,
    status: "pending",
    priority: "high",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    category: "system_audit_review",
    tags: ["system-audit", "daily-audit-agent", "human-decision"],
    metadata: {
      source: "daily_audit_agent",
      dailyAuditTaskKey: lifecycleKey,
      lifecycleMode: "additive_only",
      snapshotComplete: false,
      reviewItems,
      reviewItemCount: reviewItems.length,
      syncedAt: now,
    },
  });
  if (insertError) throw insertError;
}

async function recalculateInvoiceBalances(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  // Allocation-aware canonical drift detection: one set-based report instead
  // of a naive payment scan that cannot see payment_allocations.
  const { data: driftRows, error: driftError } = await supabase.rpc("invoice_balance_drift_report", {
    p_company_id: companyId,
    p_contract_ids: targetContractIds?.length ? targetContractIds : null,
  });
  if (driftError) throw driftError;

  const drift = (driftRows || []).slice(0, Math.max(1, limit));

  let countQuery = supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("status", "eq", "cancelled");
  if (targetContractIds?.length) countQuery = countQuery.in("contract_id", targetContractIds);
  const { count: scanned } = await countQuery;

  if (dryRun) {
    return { scanned: scanned ?? drift.length, fixedBalances: drift.length };
  }

  let fixedBalances = 0;
  const batchErrors: unknown[] = [];
  for (const invoiceIds of chunk(drift.map((row: any) => row.invoice_id), 500)) {
    const { data: batchResult, error: batchError } = await supabase.rpc(
      "recalculate_invoice_financial_states_batch",
      {
        p_company_id: companyId,
        p_invoice_ids: invoiceIds,
      },
    );
    if (batchError) throw batchError;
    fixedBalances += Number(batchResult?.fixed || 0);
    if (Array.isArray(batchResult?.errors)) batchErrors.push(...batchResult.errors);
  }
  if (batchErrors.length > 0) {
    throw new Error(`Canonical invoice recalculation failed for ${batchErrors.length} rows: ${JSON.stringify(batchErrors.slice(0, 5))}`);
  }

  return {
    scanned: scanned ?? 0,
    fixedBalances,
  };
}

async function recalculateContractTotals(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  let query = supabase
    .from("contracts")
    .select("id, contract_amount, total_paid, balance_due, payment_status, status")
    .eq("company_id", companyId)
    .in("status", targetContractIds?.length ? ["active", "under_legal_procedure", "pending", "draft", "cancelled", "canceled"] : ["active", "under_legal_procedure", "pending", "draft"])
    .order("updated_at", { ascending: true });

  if (targetContractIds?.length) query = query.in("id", targetContractIds);
  query = query.limit(limit);

  const { data: contracts, error } = await query;
  if (error) throw error;
  const contractRows = contracts || [];

  if (!dryRun) {
    const { data: batchResult, error: batchError } = await supabase.rpc(
      "recalculate_contract_financial_states_batch",
      {
        p_company_id: companyId,
        p_contract_ids: contractRows.map((contract: any) => contract.id),
      },
    );
    if (batchError) throw batchError;

    const batchErrors = Array.isArray(batchResult?.errors) ? batchResult.errors : [];
    if (batchErrors.length > 0) {
      throw new Error(`Canonical contract recalculation failed for ${batchErrors.length} rows: ${JSON.stringify(batchErrors.slice(0, 5))}`);
    }

    return {
      scanned: contractRows.length,
      fixedTotals: Number(batchResult?.fixed || 0),
    };
  }

  const contractIds = contractRows.map((contract: any) => contract.id);
  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  const paidByContract = new Map<string, number>();

  for (const payment of payments) {
    if (!isCompletedPayment(payment.payment_status)) continue;
    paidByContract.set(payment.contract_id, (paidByContract.get(payment.contract_id) || 0) + Number(payment.amount || 0));
  }

  let fixedTotals = 0;
  const now = new Date().toISOString();

  for (const contract of contractRows) {
    const paid = roundMoney(paidByContract.get(contract.id) || 0);
    const amount = roundMoney(Number(contract.contract_amount || 0));
    const balance = roundMoney(Math.max(0, amount - paid));
    const paymentStatus = balance <= 1 ? "paid" : paid > 0 ? "partial" : "unpaid";
    const changed =
      Math.abs(Number(contract.total_paid || 0) - paid) > 0.01 ||
      Math.abs(Number(contract.balance_due || 0) - balance) > 0.01 ||
      String(contract.payment_status || "").toLowerCase() !== paymentStatus;

    if (!changed) continue;
    fixedTotals += 1;

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          total_paid: paid,
          balance_due: balance,
          payment_status: paymentStatus,
          updated_at: now,
        })
        .eq("id", contract.id)
        .eq("company_id", companyId);

      if (updateError) throw updateError;
    }
  }

  return { scanned: contractRows.length, fixedTotals };
}

async function backfillContractInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  if (!targetContractIds?.length) {
    return backfillContractInvoicesWithDurableCursor(
      supabase,
      companyId,
      dryRun,
      limit,
    );
  }

  // Begin with the rotating contract batch. Contracts with no schedules or
  // invoices are the highest-priority cases and must not wait behind thousands
  // of sequential schedule-row calls.
  const auditedContracts = await loadContractsForAudit(
    supabase,
    companyId,
    limit,
    targetContractIds,
    false,
  );
  const contractIds = Array.from(new Set(
    auditedContracts
      .filter((contract: any) => [
        "active",
        "under_legal_procedure",
      ].includes(String(contract.status || "").toLowerCase()))
      .map((contract: any) => contract.id)
      .filter(Boolean),
  )).slice(0, limit);

  if (dryRun) {
    return {
      runs: contractIds.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };
  }

  const summary = {
    runs: contractIds.length,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Delegate graph convention, installment count, amounts and idempotency to
  // the hardened database command. Small concurrent batches keep the edge
  // invocation bounded while every contract remains transactionally isolated.
  for (const contractBatch of chunk(contractIds, 5)) {
    const outcomes = await Promise.all(contractBatch.map(async (contractId) => {
      try {
        const { data: createdCount, error } = await supabase.rpc(
          "generate_invoices_from_payment_schedule",
          { p_contract_id: contractId },
        );
        if (error) throw error;
        return { contractId, created: Number(createdCount || 0), error: null };
      } catch (error) {
        return { contractId, created: 0, error: getErrorMessage(error) };
      }
    }));

    for (const outcome of outcomes) {
      summary.created += outcome.created;
      if (outcome.error) {
        console.error("[daily-audit-agent] canonical billing graph backfill failed", {
          companyId,
          contractId: outcome.contractId,
          error: outcome.error,
        });
        summary.errors.push(`contract ${outcome.contractId}: ${outcome.error}`);
        summary.skipped += 1;
      } else if (outcome.created === 0) {
        summary.skipped += 1;
      }
    }
  }

  return summary;
}

async function backfillContractInvoicesWithDurableCursor(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
) {
  const summary = {
    runs: 0,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  let { data: cursorRow, error: cursorReadError } = await supabase
    .from("daily_invoice_repair_cursors")
    .select("last_contract_id, version, cycle_count")
    .eq("company_id", companyId)
    .maybeSingle();
  if (cursorReadError) throw cursorReadError;

  if (!cursorRow && !dryRun) {
    const { error: cursorCreateError } = await supabase
      .from("daily_invoice_repair_cursors")
      .upsert({ company_id: companyId }, {
        onConflict: "company_id",
        ignoreDuplicates: true,
      });
    if (cursorCreateError) throw cursorCreateError;

    const reread = await supabase
      .from("daily_invoice_repair_cursors")
      .select("last_contract_id, version, cycle_count")
      .eq("company_id", companyId)
      .single();
    if (reread.error) throw reread.error;
    cursorRow = reread.data;
  }

  let currentCursor: string | null = cursorRow?.last_contract_id || null;
  let cursorVersion = Number(cursorRow?.version || 0);
  let cycleCount = Number(cursorRow?.cycle_count || 0);
  let wrappedSinceCheckpoint = false;
  const seenContractIds = new Set<string>();

  while (summary.runs < limit) {
    const batchLimit = Math.min(5, limit - summary.runs);
    let query = supabase
      .from("contracts")
      .select("id")
      .eq("company_id", companyId)
      .in("status", ["active", "under_legal_procedure"])
      .order("id", { ascending: true })
      .limit(batchLimit);
    if (currentCursor) query = query.gt("id", currentCursor);

    const { data: rows, error: rowsError } = await query;
    if (rowsError) throw rowsError;
    const batch = (rows || []).filter((row: any) =>
      row.id && !seenContractIds.has(row.id)
    );

    if (batch.length === 0) {
      if (currentCursor && !wrappedSinceCheckpoint) {
        currentCursor = null;
        wrappedSinceCheckpoint = true;
        continue;
      }
      break;
    }

    for (const row of batch) seenContractIds.add(row.id);
    summary.runs += batch.length;

    if (!dryRun) {
      const outcomes = await Promise.all(batch.map(async (row: any) => {
        try {
          const { data: createdCount, error } = await supabase.rpc(
            "generate_invoices_from_payment_schedule",
            { p_contract_id: row.id },
          );
          if (error) throw error;
          return { contractId: row.id, created: Number(createdCount || 0), error: null };
        } catch (error) {
          return { contractId: row.id, created: 0, error: getErrorMessage(error) };
        }
      }));

      for (const outcome of outcomes) {
        summary.created += outcome.created;
        if (outcome.error) {
          summary.errors.push(`contract ${outcome.contractId}: ${outcome.error}`);
          summary.skipped += 1;
        } else if (outcome.created === 0) {
          summary.skipped += 1;
        }
      }

      const batchLastContractId = batch[batch.length - 1].id;
      const nextVersion = cursorVersion + 1;
      const nextCycleCount = cycleCount + (wrappedSinceCheckpoint ? 1 : 0);
      const { data: checkpoint, error: checkpointError } = await supabase
        .from("daily_invoice_repair_cursors")
        .update({
          last_contract_id: batchLastContractId,
          version: nextVersion,
          cycle_count: nextCycleCount,
          last_error_count: outcomes.filter((outcome) => outcome.error).length,
          last_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("version", cursorVersion)
        .select("version")
        .maybeSingle();
      if (checkpointError) throw checkpointError;
      if (!checkpoint) {
        throw new Error("Daily invoice repair cursor changed concurrently; retry safely");
      }
      cursorVersion = nextVersion;
      cycleCount = nextCycleCount;
    }

    currentCursor = batch[batch.length - 1].id;
    wrappedSinceCheckpoint = false;
  }

  return summary;
}

async function reconcileInvoiceAmountsWithSchedules(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  const schedules = await loadSchedules(supabase, companyId, limit, targetContractIds);
  const activeSchedules = schedules.filter((schedule: any) => !isCancelledStatus(schedule.status) && schedule.invoice_id);
  const scheduleAmountsByInvoiceId = new Map<string, number>();

  for (const schedule of activeSchedules) {
    scheduleAmountsByInvoiceId.set(
      schedule.invoice_id,
      roundMoney((scheduleAmountsByInvoiceId.get(schedule.invoice_id) || 0) + Number(schedule.amount || 0)),
    );
  }

  const invoiceIds = Array.from(scheduleAmountsByInvoiceId.keys());
  if (invoiceIds.length === 0) return 0;

  const invoices = await loadInvoicesByIds(supabase, companyId, invoiceIds);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments
      .filter((payment: any) => !isInactivePaymentStatus(payment.payment_status))
      .map((payment: any) => payment.invoice_id)
      .filter(Boolean),
  );

  for (const invoice of invoices) {
    if (isCancelledStatus(invoice.status) || isCancelledStatus(invoice.payment_status)) continue;

    const scheduleAmount = roundMoney(scheduleAmountsByInvoiceId.get(invoice.id) || 0);
    const invoiceAmount = roundMoney(Number(invoice.total_amount || 0));
    if (Math.abs(scheduleAmount - invoiceAmount) <= 1) continue;

    reviewItems.push(
      `Invoice ${invoice.invoice_number || invoice.id} differs from its payment schedule (${invoiceAmount} vs ${scheduleAmount}). `
        + `It was not repriced automatically${
          invoice.journal_entry_id || invoicesWithActivePayments.has(invoice.id)
            ? " because it has recorded financial history"
            : " because a reference journal may exist even when journal_entry_id is null"
        }.`,
    );
  }

  // Invoice amounts are accounting source documents. The agent records review
  // items and uses canonical cancel/reissue or adjustment commands instead of
  // mutating source amounts in place.
  void dryRun;
  return 0;
}

async function cleanupDuplicateContractMonthInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, true);
  const contractIds = contracts.map((contract: any) => contract.id);
  if (contractIds.length === 0) return 0;

  const invoices = await loadInvoicesForContracts(supabase, companyId, contractIds, [], limit * 80);
  const activeInvoices = invoices.filter((invoice: any) => !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status));
  const invoiceIds = activeInvoices.map((invoice: any) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments
      .filter((payment: any) => !isInactivePaymentStatus(payment.payment_status))
      .map((payment: any) => payment.invoice_id)
      .filter(Boolean),
  );
  const grouped = new Map<string, any[]>();

  for (const invoice of activeInvoices) {
    const key = invoiceContractBillingMonthKey(invoice);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), invoice]);
  }

  for (const group of grouped.values()) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort((left, right) => invoiceKeepScore(right, invoicesWithActivePayments) - invoiceKeepScore(left, invoicesWithActivePayments));
    const [, ...duplicates] = sorted;

    for (const invoice of duplicates) {
      reviewItems.push(
        `Duplicate invoice ${invoice.invoice_number || invoice.id} requires canonical reversal/manual review; `
          + `the daily agent never soft-cancels invoice source documents.`,
      );
    }
  }

  void dryRun;
  void invoicesWithActivePayments;
  return 0;
}

async function cleanupOutsideContractInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  const contractsById = new Map(contracts.map((contract: any) => [contract.id, contract]));
  const contractIds: string[] = Array.from(contractsById.keys()) as string[];
  if (contractIds.length === 0) return 0;

  const invoices = await loadInvoicesForContracts(supabase, companyId, contractIds, [], limit * 80);
  const activeInvoices = invoices.filter((invoice: any) => !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status));
  const invoiceIds = activeInvoices.map((invoice: any) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments
      .filter((payment: any) => !isInactivePaymentStatus(payment.payment_status))
      .map((payment: any) => payment.invoice_id)
      .filter(Boolean),
  );

  for (const invoice of activeInvoices) {
    const contract: any = contractsById.get(invoice.contract_id);
    if (!contract?.start_date || !contract?.end_date) continue;

    if (!isInvoiceOutsideContractBillingMonths(
      invoice,
      contract.start_date,
      contract.end_date,
    )) continue;

    reviewItems.push(
      `Outside-period invoice ${invoice.invoice_number || invoice.id} requires canonical reversal/manual review; `
        + `it was not soft-cancelled automatically.`,
    );
  }

  void dryRun;
  void invoicesWithActivePayments;
  return 0;
}

async function linkUnlinkedPaymentsToClearInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  // Set-based FIFO allocation executed inside the database with allocation
  // batch mode: one RPC instead of hundreds of round-trips and per-row
  // trigger fan-out. Completed payments are never mutated; the allocation
  // triggers sync payment state and recalculate invoice/contract totals.
  const { data, error } = await supabase.rpc("allocate_contract_receipts_fifo", {
    p_company_id: companyId,
    p_contract_id: targetContractIds?.length === 1 ? targetContractIds[0] : null,
    p_dry_run: dryRun,
    p_max_payments: Math.max(1, limit * 10),
  });
  if (error) throw error;

  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  for (const warning of warnings) {
    reviewItems.push(String(warning));
  }

  return Number(data?.payments_processed || 0);
}

async function syncSchedulePaymentStates(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  let synced = 0;

  for (const contract of contracts) {
    const { data, error } = await supabase.rpc("sync_contract_schedule_payment_state", {
      p_contract_id: contract.id,
      p_dry_run: dryRun,
    });

    if (error) {
      console.warn("[daily-audit-agent] schedule payment state sync skipped", {
        contractId: contract.id,
        message: error.message,
      });
      continue;
    }

    synced += Number(data || 0);
  }

  return synced;
}

async function detectDuplicatePayments(
  supabase: any,
  companyId: string,
  limit: number,
  targetContractIds: string[] | null,
) {
  let query = supabase
    .from("payments")
    .select("id, contract_id, payment_date, amount, payment_status, reference_number")
    .eq("company_id", companyId)
    .limit(limit * 20);

  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);

  const { data, error } = await query;
  if (error) throw error;

  const seen = new Set<string>();
  let duplicates = 0;

  for (const payment of data || []) {
    if (isInactivePaymentStatus(payment.payment_status)) continue;
    const key = `${payment.contract_id || ""}:${payment.payment_date || ""}:${roundMoney(Number(payment.amount || 0))}:${payment.reference_number || ""}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }

  return duplicates;
}

async function repairOutOfPeriodPayments(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  const contractsById = new Map(contracts.map((contract: any) => [contract.id, contract]));
  const contractIds: string[] = Array.from(contractsById.keys()) as string[];
  if (contractIds.length === 0) return 0;

  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  let repaired = 0;
  const now = new Date().toISOString();

  for (const payment of payments) {
    if (isInactivePaymentStatus(payment.payment_status) || !payment.payment_date || !payment.contract_id) continue;
    const contract: any = contractsById.get(payment.contract_id);
    if (!contract?.start_date || !contract?.end_date) continue;

    const paymentDate = String(payment.payment_date).slice(0, 10);
    if (paymentDate >= contract.start_date && paymentDate <= contract.end_date) continue;

    const nextDate = paymentDate < contract.start_date ? contract.start_date : contract.end_date;
    if (isCompletedPayment(payment.payment_status)) {
      reviewItems.push(`Completed payment ${payment.payment_number || payment.reference_number || payment.id} is outside contract period and needs reversal/manual approval.`);
      continue;
    }

    if (!dryRun) {
      const { error } = await supabase
        .from("payments")
        .update({ payment_date: nextDate, updated_at: now })
        .eq("id", payment.id)
        .eq("company_id", companyId);

      if (error) throw error;
    }

    repaired += 1;
  }

  return repaired;
}

async function detectContractOverpayments(
  supabase: any,
  companyId: string,
  limit: number,
  targetContractIds: string[] | null,
) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, true);
  const contractIds = contracts.map((contract: any) => contract.id);
  if (contractIds.length === 0) return 0;

  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  const paidByContract = new Map<string, number>();

  for (const payment of payments) {
    if (!isCompletedPayment(payment.payment_status) || !payment.contract_id) continue;
    paidByContract.set(payment.contract_id, roundMoney((paidByContract.get(payment.contract_id) || 0) + Number(payment.amount || 0)));
  }

  return contracts.filter((contract: any) => {
    const amount = roundMoney(Number(contract.contract_amount || 0));
    const paid = roundMoney(paidByContract.get(contract.id) || 0);
    return amount > 0 && paid - amount > 1;
  }).length;
}

async function cleanupCancelledContractZeroInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
  reviewItems: string[],
) {
  let contractQuery = supabase
    .from("contracts")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["cancelled", "canceled"])
    .limit(limit);

  if (targetContractIds?.length) contractQuery = contractQuery.in("id", targetContractIds);

  const { data: contracts, error: contractError } = await contractQuery;
  if (contractError) throw contractError;

  const contractIds = (contracts || []).map((contract: any) => contract.id);
  if (contractIds.length === 0) return 0;

  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, total_amount, paid_amount, balance_due, payment_status, status")
    .eq("company_id", companyId)
    .in("contract_id", contractIds)
    .not("status", "eq", "cancelled")
    .limit(limit * 50);

  if (invoiceError) throw invoiceError;

  const zeroInvoices = (invoices || []).filter((invoice: any) =>
    Math.abs(Number(invoice.total_amount || 0)) <= 0.01 &&
    Math.abs(Number(invoice.paid_amount || 0)) <= 0.01 &&
    Math.abs(Number(invoice.balance_due || 0)) <= 0.01
  );

  for (const invoice of zeroInvoices) {
    reviewItems.push(
      `Zero invoice ${invoice.id} belongs to a cancelled contract and requires canonical cancellation review; `
        + `the daily agent did not mutate the source document.`,
    );
  }

  void dryRun;
  return 0;
}

async function loadContractsForAudit(
  supabase: any,
  companyId: string,
  limit: number,
  targetContractIds: string[] | null,
  includeCancelled: boolean,
) {
  if (targetContractIds?.length) {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, start_date, end_date, monthly_amount, contract_amount, status")
      .eq("company_id", companyId)
      .in("id", targetContractIds)
      .order("id", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  const statuses = includeCancelled
    ? ["active", "under_legal_procedure", "pending", "draft", "cancelled", "canceled"]
    : ["active", "under_legal_procedure", "pending", "draft"];

  const { count, error: countError } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", statuses);
  if (countError) throw countError;

  const ranges = buildDailyRotatingRanges(count || 0, limit, getUtcDayNumber());
  const contracts: any[] = [];

  for (const range of ranges) {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, start_date, end_date, monthly_amount, contract_amount, status")
      .eq("company_id", companyId)
      .in("status", statuses)
      .order("id", { ascending: true })
      .range(range.from, range.to);

    if (error) throw error;
    contracts.push(...(data || []));
  }

  return contracts;
}

async function loadSchedules(supabase: any, companyId: string, limit: number, targetContractIds: string[] | null) {
  let query = supabase
    .from("contract_payment_schedules")
    .select("id, contract_id, installment_number, due_date, amount, status, invoice_id")
    .eq("company_id", companyId)
    .limit(limit * 60);

  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadInvoicesForContracts(
  supabase: any,
  companyId: string,
  contractIds: string[],
  extraInvoiceIds: string[],
  limit: number,
) {
  const rows: any[] = [];
  const cleanContractIds = Array.from(new Set(contractIds.filter(Boolean)));
  const cleanInvoiceIds = Array.from(new Set(extraInvoiceIds.filter(Boolean)));

  for (const ids of chunk(cleanContractIds, 100)) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at")
      .eq("company_id", companyId)
      .in("contract_id", ids)
      .limit(limit);

    if (error) throw error;
    rows.push(...(data || []));
  }

  for (const ids of chunk(cleanInvoiceIds, 100)) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at")
      .eq("company_id", companyId)
      .in("id", ids)
      .limit(limit);

    if (error) throw error;
    rows.push(...(data || []));
  }

  const byId = new Map<string, any>();
  for (const row of rows) byId.set(row.id, row);
  return Array.from(byId.values());
}

async function loadInvoicesByIds(supabase: any, companyId: string, invoiceIds: string[]) {
  const rows: any[] = [];

  for (const ids of chunk(Array.from(new Set(invoiceIds.filter(Boolean))), 100)) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at")
      .eq("company_id", companyId)
      .in("id", ids);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows;
}

async function repairPaymentJournalIntegrity(supabase: any, companyId: string, apply: boolean, limit: number) {
  const { data, error } = await supabase.rpc("repair_payment_journal_integrity", {
    p_company_id: companyId,
    p_apply: apply,
    p_limit: limit,
  });

  if (error) throw error;

  return {
    needsCreate: Number(data?.needs_create || 0),
    needsRelink: Number(data?.needs_relink || 0),
    created: Number(data?.created || 0),
    relinked: Number(data?.relinked || 0),
    failed: Number(data?.failed || 0),
  };
}

async function countUnbalancedJournalEntries(supabase: any, companyId: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, total_debit, total_credit")
    .eq("company_id", companyId)
    .limit(1000);

  if (error) throw error;

  return (data || []).filter((entry: any) =>
    Math.abs(Number(entry.total_debit || 0) - Number(entry.total_credit || 0)) > 0.01
  ).length;
}

async function fetchPaymentsForInvoices(supabase: any, companyId: string, invoiceIds: string[]) {
  if (invoiceIds.length === 0) return [];
  const chunks = chunk(invoiceIds, 200);
  const rows: any[] = [];

  for (const ids of chunks) {
    const { data, error } = await supabase
      .from("payments")
      .select("invoice_id, amount, payment_status")
      .eq("company_id", companyId)
      .in("invoice_id", ids);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows.filter((row) => row.invoice_id);
}

async function fetchPaymentsForContracts(supabase: any, companyId: string, contractIds: string[]) {
  if (contractIds.length === 0) return [];
  const chunks = chunk(contractIds, 200);
  const rows: any[] = [];

  for (const ids of chunks) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, contract_id, invoice_id, amount, payment_date, payment_status, reference_number, payment_number")
      .eq("company_id", companyId)
      .in("contract_id", ids);

    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows.filter((row) => row.contract_id);
}

async function safeStep(result: CompanyResult, label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    const failure = `${label}: ${getErrorMessage(error)}`;
    result.errors.push(failure);
    result.reviewItems.push(
      `فشلت خطوة الوكيل ${label} وتتطلب مراجعة المشرف: ${failure}`,
    );
  }
}

async function buildAiSummary(
  localSummary: string,
  totals: AgentResult["totals"],
  companies: CompanyResult[],
) {
  const apiKey = getLongCatApiKey();
  if (!apiKey) return null;

  const compactCompanies = companies.map((company, index) => ({
    companyIndex: index + 1,
    invoicesFixed: company.invoices.fixedBalances,
    contractsFixed: company.contracts.fixedTotals,
    invoiceBackfillCreated: company.contracts.invoiceBackfillCreated,
    cancelledZeroInvoicesCancelled: company.contracts.cancelledZeroInvoicesCancelled,
    scheduleLinksRepaired: company.contracts.scheduleLinksRepaired,
    invoiceAmountsReconciled: company.contracts.invoiceAmountsReconciled,
    duplicateInvoicesCancelled: company.contracts.duplicateInvoicesCancelled,
    outsideInvoicesCancelled: company.contracts.outsideInvoicesCancelled,
    unlinkedPaymentsLinked: company.contracts.unlinkedPaymentsLinked,
    outOfPeriodPaymentsRepaired: company.contracts.outOfPeriodPaymentsRepaired,
    paymentJournalsCreated: company.accounting.paymentJournalCreated,
    paymentJournalsRelinked: company.accounting.paymentJournalRelinked,
    unbalancedJournalEntries: company.accounting.unbalancedJournalEntries,
    errors: company.errors.length,
  }));

  try {
    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(apiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You summarize ERP audit agent results in Arabic. Use only aggregate counts. Do not invent names, IDs, or financial details.",
          },
          {
            role: "user",
            content: JSON.stringify({ localSummary, totals, companies: compactCompanies }),
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;
    const payload = await response.json();
    return String(payload?.choices?.[0]?.message?.content || "").trim() || null;
  } catch {
    return null;
  }
}

async function writeAgentAuditLog(supabase: any, response: AgentResult) {
  for (const company of response.companies) {
    const { error } = await supabase.from("audit_logs").insert({
      company_id: company.companyId,
      action: "daily_audit_agent_run",
      resource_type: "system",
      resource_id: company.companyId,
      entity_name: "Daily Audit Agent",
      severity: company.errors.length > 0 ? "warning" : "info",
      status: response.status,
      changes_summary: response.summary.slice(0, 500),
      metadata: {
        mode: response.mode,
        source: response.source,
        startedAt: response.startedAt,
        finishedAt: response.finishedAt,
        company,
      },
    });
    if (error) throw error;
  }
}

function summarizeTotals(results: CompanyResult[]): AgentResult["totals"] {
  return results.reduce((totals, company) => {
    totals.invoicesFixed += company.invoices.fixedBalances;
    totals.contractsFixed += company.contracts.fixedTotals;
    totals.invoiceBackfillCreated += company.contracts.invoiceBackfillCreated;
    totals.cancelledZeroInvoicesCancelled += company.contracts.cancelledZeroInvoicesCancelled;
    totals.scheduleLinksRepaired += company.contracts.scheduleLinksRepaired;
    totals.scheduleStatesSynced += company.contracts.scheduleStatesSynced;
    totals.invoiceAmountsReconciled += company.contracts.invoiceAmountsReconciled;
    totals.duplicateInvoicesCancelled += company.contracts.duplicateInvoicesCancelled;
    totals.outsideInvoicesCancelled += company.contracts.outsideInvoicesCancelled;
    totals.unlinkedPaymentsLinked += company.contracts.unlinkedPaymentsLinked;
    totals.outOfPeriodPaymentsRepaired += company.contracts.outOfPeriodPaymentsRepaired;
    totals.paymentJournalsCreated += company.accounting.paymentJournalCreated;
    totals.paymentJournalsRelinked += company.accounting.paymentJournalRelinked;
    totals.paymentJournalFailures += company.accounting.paymentJournalFailed;
    totals.unbalancedJournalEntries += company.accounting.unbalancedJournalEntries;
    totals.errors += company.errors.length;
    return totals;
  }, {
    invoicesFixed: 0,
    contractsFixed: 0,
    invoiceBackfillCreated: 0,
    cancelledZeroInvoicesCancelled: 0,
    scheduleLinksRepaired: 0,
    scheduleStatesSynced: 0,
    invoiceAmountsReconciled: 0,
    duplicateInvoicesCancelled: 0,
    outsideInvoicesCancelled: 0,
    unlinkedPaymentsLinked: 0,
    outOfPeriodPaymentsRepaired: 0,
    paymentJournalsCreated: 0,
    paymentJournalsRelinked: 0,
    paymentJournalFailures: 0,
    unbalancedJournalEntries: 0,
    errors: 0,
  });
}

function buildLocalSummary(dryRun: boolean, results: CompanyResult[], totals: AgentResult["totals"]) {
  const mode = dryRun ? "dry run" : "apply";
  return `${mode}: reviewed ${results.length} companies. invoice balances: ${totals.invoicesFixed}, contract totals: ${totals.contractsFixed}, schedule links: ${totals.scheduleLinksRepaired}, schedule states synced: ${totals.scheduleStatesSynced}, missing invoices created: ${totals.invoiceBackfillCreated}, invoice amounts: ${totals.invoiceAmountsReconciled}, duplicate invoices cancelled: ${totals.duplicateInvoicesCancelled}, outside invoices cancelled: ${totals.outsideInvoicesCancelled}, cancelled zero invoices: ${totals.cancelledZeroInvoicesCancelled}, unlinked payments linked: ${totals.unlinkedPaymentsLinked}, out-of-period payments repaired: ${totals.outOfPeriodPaymentsRepaired}, payment journal fixes: ${totals.paymentJournalsCreated + totals.paymentJournalsRelinked}.`;
}

function isCompletedPayment(status: unknown) {
  return ["completed", "paid", "success", "succeeded"].includes(String(status || "").toLowerCase());
}

function isCancelledStatus(status: unknown) {
  return ["cancelled", "canceled", "void", "voided", "deleted", "inactive"].includes(String(status || "").toLowerCase());
}

function isInactivePaymentStatus(status: unknown) {
  return ["cancelled", "canceled", "void", "voided", "deleted", "failed", "reversed", "refunded"].includes(String(status || "").toLowerCase());
}

function invoiceKeepScore(invoice: any, invoicesWithActivePayments: Set<string>) {
  let score = 0;
  if (invoicesWithActivePayments.has(invoice.id)) score += 1000;
  if (invoice.journal_entry_id) score += 500;
  score += Number(invoice.total_amount || 0) > 0 ? 100 : 0;
  score += Number(invoice.paid_amount || 0) > 0 ? 50 : 0;
  score += Number(invoice.balance_due || 0) > 0 ? 20 : 0;
  return score;
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const payload = error as { message?: string; details?: string; code?: string };
  return [payload?.message, payload?.details, payload?.code].filter(Boolean).join(" - ") || String(error);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
