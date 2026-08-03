import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";
import {
  invoiceBillingMonth,
  invoiceContractBillingMonthKey,
  isInvoiceOutsideContractBillingMonths,
  selectExistingInvoiceForMonth,
} from "./invoice-month.ts";

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

    const targetContracts = await loadTargetContracts(supabase, body);
    const targetCompanyId = targetContracts.length === 1 ? targetContracts[0].company_id : body.companyId;
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
        targetContractIds: targetContractIds.length > 0 ? targetContractIds : null,
      }));
    }

    const totals = summarizeTotals(results);
    const localSummary = buildLocalSummary(dryRun, results, totals);
    const aiSummary = includeAiSummary ? await buildAiSummary(localSummary, totals, results) : null;

    const finishedAt = new Date().toISOString();
    const response: AgentResult = {
      ok: true,
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

    return jsonResponse(response);
  } catch (error) {
    const finishedAt = new Date().toISOString();
    return jsonResponse({
      ok: false,
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
  let query = supabase
    .from("companies")
    .select("id, name, name_ar, subscription_status, subscription_expires_at")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (companyId) query = query.eq("id", companyId);

  const { data, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  return (data || []).filter((company: any) => {
    const status = String(company.subscription_status || "active").toLowerCase();
    if (status && !["active", "trial", ""].includes(status)) return false;
    if (company.subscription_expires_at && String(company.subscription_expires_at).slice(0, 10) < today) return false;
    return true;
  });
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

  await safeStep(result, "recalculate_invoice_balances", async () => {
    result.invoices = await recalculateInvoiceBalances(supabase, company.id, dryRun, maxInvoicesPerCompany, targetContractIds);
  });

  await safeStep(result, "recalculate_contract_totals", async () => {
    result.contracts = {
      ...result.contracts,
      ...(await recalculateContractTotals(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds)),
    };
  });

  await safeStep(result, "repair_schedule_invoice_links", async () => {
    result.contracts.scheduleLinksRepaired = await repairScheduleInvoiceLinks(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
    );
  });

  await safeStep(result, "backfill_missing_contract_invoices", async () => {
    const backfill = await backfillContractInvoices(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds);
    result.contracts.invoiceBackfillRuns = backfill.runs;
    result.contracts.invoiceBackfillCreated = backfill.created;
    result.contracts.invoiceBackfillSkipped = backfill.skipped;
  });

  await safeStep(result, "reconcile_invoice_amounts_with_schedules", async () => {
    result.contracts.invoiceAmountsReconciled = await reconcileInvoiceAmountsWithSchedules(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
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
    if (!dryRun && result.reviewItems.length > 0) {
      await upsertDailyAuditReviewTask(supabase, company.id, result.reviewItems);
    }
  });

  return result;
}

async function upsertDailyAuditReviewTask(supabase: any, companyId: string, reviewItems: string[]) {
  // tasks.created_by references profiles.id, so pick an active privileged
  // profile of this company directly.
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .in("role", ["admin", "manager", "accountant", "super_admin", "company_admin"])
    .limit(1);
  if (profileError) throw profileError;

  const assignee = profileRows?.[0]?.id;
  if (!assignee) return;

  const now = new Date().toISOString();
  const title = `مراجعة ${reviewItems.length} عنصرًا ماليًا رصده وكيل التدقيق اليومي`;
  const shown = reviewItems.slice(0, 20).map((item) => `- ${item}`).join("\n");
  const description = `وكيل التدقيق اليومي رصد ${reviewItems.length} عنصرًا يحتاج قرارًا بشريًا:\n${shown}${
    reviewItems.length > 20 ? `\n- ... و ${reviewItems.length - 20} عنصرًا إضافيًا في سجل التدقيق` : ""
  }`;

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("id")
    .eq("company_id", companyId)
    .eq("category", "system_audit_review")
    .eq("status", "pending")
    .eq("metadata->>source", "daily_audit_agent")
    .limit(1);
  if (existingError) throw existingError;

  if (existing?.length) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ title, description, updated_at: now })
      .eq("id", existing[0].id);
    if (updateError) throw updateError;
    return;
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
  for (const row of drift) {
    const { error: recalcError } = await supabase.rpc("recalculate_invoice_financial_state", {
      p_invoice_id: row.invoice_id,
    });

    if (recalcError) {
      console.warn("daily-audit-agent canonical invoice recalculation skipped", {
        invoiceId: row.invoice_id,
        code: recalcError.code,
        message: recalcError.message,
      });
      continue;
    }

    fixedBalances += 1;
  }

  return { scanned: scanned ?? 0, fixedBalances };
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
    let fixedTotals = 0;

    for (const contract of contractRows) {
      const { data: canonicalPaid, error: recalcError } = await supabase.rpc("recalculate_contract_financial_state", {
        p_contract_id: contract.id,
      });

      if (recalcError) {
        console.warn("daily-audit-agent canonical contract recalculation skipped", {
          contractId: contract.id,
          code: recalcError.code,
          message: recalcError.message,
        });
        continue;
      }

      const paid = roundMoney(Number(canonicalPaid || 0));
      const amount = roundMoney(Number(contract.contract_amount || 0));
      const balance = roundMoney(Math.max(0, amount - paid));
      const paymentStatus = balance <= 1 ? "paid" : paid > 0 ? "partial" : "unpaid";
      const changed =
        Math.abs(Number(contract.total_paid || 0) - paid) > 0.01 ||
        Math.abs(Number(contract.balance_due || 0) - balance) > 0.01 ||
        String(contract.payment_status || "").toLowerCase() !== paymentStatus;

      if (changed) fixedTotals += 1;
    }

    return { scanned: contractRows.length, fixedTotals };
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
  let query = supabase
    .from("contract_payment_schedules")
    .select("id, contract_id, due_date")
    .eq("company_id", companyId)
    .is("invoice_id", null)
    .not("status", "eq", "cancelled")
    .order("due_date", { ascending: true });

  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);
  // A row-level limit starved contracts that appeared later in the table.
  query = query.limit(Math.max(limit, limit * 60));

  const { data: missingRows, error: missingError } = await query;
  if (missingError) throw missingError;

  const rows = (missingRows || []).filter((row: any) => row.contract_id && row.due_date);
  const contractIds = Array.from(
    new Set([
      ...(targetContractIds || []),
      ...(missingRows || []).map((row: any) => row.contract_id).filter(Boolean),
    ])
  ).slice(0, limit);

  if (dryRun) {
    return { runs: contractIds.length, created: 0, skipped: Math.max(0, (missingRows || []).length - rows.length) };
  }

  const summary = { runs: 0, created: 0, skipped: 0 };

  for (const row of rows) {
    summary.runs += 1;
    try {
      const invoiceMonth = toMonthStart(String(row.due_date));
      const existingInvoiceId = await findExistingInvoiceForMonth(supabase, companyId, row.contract_id, invoiceMonth);
      if (existingInvoiceId) {
        await linkScheduleInvoice(supabase, companyId, row.id, existingInvoiceId);
        summary.skipped += 1;
        continue;
      }

      const { data: invoiceId, error } = await supabase.rpc("generate_invoice_for_contract_month", {
        p_contract_id: row.contract_id,
        p_invoice_month: invoiceMonth,
      });

      if (error) {
        if (error.code === "23505") {
          const duplicateInvoiceId = await findExistingInvoiceForMonth(supabase, companyId, row.contract_id, invoiceMonth);
          if (duplicateInvoiceId) {
            await linkScheduleInvoice(supabase, companyId, row.id, duplicateInvoiceId);
          }
          summary.skipped += 1;
          continue;
        }
        throw error;
      }

      if (!invoiceId) {
        summary.skipped += 1;
        continue;
      }

      await linkScheduleInvoice(supabase, companyId, row.id, invoiceId);
      summary.created += 1;
    } catch (error) {
      // One malformed contract must not block every contract behind it.
      console.error("[daily-audit-agent] invoice backfill row failed", {
        companyId,
        contractId: row.contract_id,
        scheduleId: row.id,
        error: getErrorMessage(error),
      });
      summary.skipped += 1;
    }
  }

  // A month can be absent from both invoices and schedules. Complete uniform
  // monthly contracts before rebuilding their schedules so that this gap is
  // not invisible to the daily agent.
  const completedMonths = await completeUniformContractMonths(
    supabase,
    companyId,
    contractIds,
    Math.max(limit, limit * 60),
  );
  summary.runs += completedMonths.runs;
  summary.created += completedMonths.created;
  summary.skipped += completedMonths.skipped;

  // New invoices can reveal payment schedules that were missing as well.
  for (const contractId of contractIds) {
    try {
      const { error } = await supabase.rpc("generate_payment_schedules_for_contract", {
        p_contract_id: contractId,
        p_dry_run: false,
      });
      if (error) throw error;

      const graphRepair = await canonicalizeUniformContractScheduleGraph(
        supabase,
        companyId,
        contractId,
      );
      if (graphRepair > 0) {
        console.info("[daily-audit-agent] canonical schedule graph repaired", {
          companyId,
          contractId,
          repaired: graphRepair,
        });
      }
    } catch (error) {
      console.error("[daily-audit-agent] payment schedule backfill failed", {
        companyId,
        contractId,
        error: getErrorMessage(error),
      });
      summary.skipped += 1;
    }
  }

  return summary;
}

async function canonicalizeUniformContractScheduleGraph(
  supabase: any,
  companyId: string,
  contractId: string,
) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, start_date, end_date, monthly_amount, contract_amount")
    .eq("id", contractId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (contractError) throw contractError;
  if (!contract) return 0;

  const startMonth = toMonthStart(String(contract.start_date || ""));
  const endMonth = toMonthStart(String(contract.end_date || ""));
  const monthlyAmount = roundMoney(Number(contract.monthly_amount || 0));
  if (!isIsoDate(startMonth) || !isIsoDate(endMonth) || endMonth < startMonth || monthlyAmount <= 0) return 0;

  const expectedMonthCount = monthCountInclusive(startMonth, endMonth);
  if (
    expectedMonthCount <= 0
    || Math.abs(roundMoney(Number(contract.contract_amount || 0)) - roundMoney(expectedMonthCount * monthlyAmount)) > 1
  ) return 0;

  const [{ data: invoices, error: invoiceError }, { data: schedules, error: scheduleError }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_month, invoice_date, due_date, total_amount, paid_amount, balance_due, status, payment_status, created_at")
      .eq("company_id", companyId)
      .eq("contract_id", contractId),
    supabase
      .from("contract_payment_schedules")
      .select("id, installment_number, due_date, amount, status, paid_amount, paid_date, invoice_id")
      .eq("company_id", companyId)
      .eq("contract_id", contractId),
  ]);
  if (invoiceError) throw invoiceError;
  if (scheduleError) throw scheduleError;

  const activeInvoices = (invoices || []).filter((invoice: any) =>
    !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status)
  );
  const invoiceByMonth = new Map<string, any[]>();
  for (const invoice of activeInvoices) {
    const key = invoiceBillingMonth(invoice);
    if (!isIsoDate(key)) continue;
    invoiceByMonth.set(key, [...(invoiceByMonth.get(key) || []), invoice]);
  }

  const activeSchedules = (schedules || []).filter((schedule: any) => !isCancelledStatus(schedule.status));
  const insideByMonth = new Map<string, any>();
  for (const schedule of activeSchedules) {
    const key = toMonthStart(String(schedule.due_date || ""));
    if (key >= startMonth && key <= endMonth && !insideByMonth.has(key)) insideByMonth.set(key, schedule);
  }

  const expectedMonths = Array.from({ length: expectedMonthCount }, (_, offset) => ({
    month: addMonths(startMonth, offset),
    installmentNumber: offset + 1,
  }));
  const missingMonths = expectedMonths.filter((item) => !insideByMonth.has(item.month));
  const safeOutside = activeSchedules.filter((schedule: any) => {
    const key = toMonthStart(String(schedule.due_date || ""));
    return (key < startMonth || key > endMonth)
      && !schedule.invoice_id
      && Math.abs(Number(schedule.paid_amount || 0)) <= 0.01
      && String(schedule.status || "").toLowerCase() !== "paid";
  });
  const reusableOutside = safeOutside.slice(0, missingMonths.length);
  const inPeriodSchedules = Array.from(insideByMonth.values());
  const needsRenumbering = expectedMonths.some((item) => {
    const schedule = insideByMonth.get(item.month);
    return schedule && Number(schedule.installment_number) !== item.installmentNumber;
  });
  let repaired = 0;
  const now = new Date().toISOString();

  if (needsRenumbering || reusableOutside.length > 0) {
    const temporary = [...inPeriodSchedules, ...reusableOutside];
    for (let index = 0; index < temporary.length; index += 1) {
      const { error } = await supabase
        .from("contract_payment_schedules")
        .update({ installment_number: 20000 + index, updated_at: now })
        .eq("id", temporary[index].id)
        .eq("company_id", companyId);
      if (error) throw error;
    }
  }

  for (const item of expectedMonths) {
    const schedule = insideByMonth.get(item.month);
    if (!schedule) continue;
    if (!needsRenumbering && Number(schedule.installment_number) === item.installmentNumber) continue;
    const { error } = await supabase
      .from("contract_payment_schedules")
      .update({ installment_number: item.installmentNumber, updated_at: now })
      .eq("id", schedule.id)
      .eq("company_id", companyId);
    if (error) throw error;
    repaired += 1;
  }

  for (let index = 0; index < missingMonths.length; index += 1) {
    const item = missingMonths[index];
    const invoice = selectExistingInvoiceForMonth(
      invoiceByMonth.get(item.month) || [],
      item.month,
    );
    if (!invoice) continue;
    const paidAmount = roundMoney(Number(invoice.paid_amount || 0));
    const totalAmount = roundMoney(Number(invoice.total_amount || monthlyAmount));
    const balance = roundMoney(Math.max(0, totalAmount - paidAmount));
    const dueDate = new Date(`${item.month}T00:00:00.000Z`);
    const status = balance <= 1 ? "paid" : paidAmount > 0 ? "partially_paid" : dueDate < new Date() ? "overdue" : "pending";
    const values = {
      invoice_id: invoice.id,
      amount: totalAmount,
      due_date: item.month,
      installment_number: item.installmentNumber,
      status,
      paid_amount: paidAmount,
      paid_date: status === "paid" ? (invoice.invoice_date || item.month) : null,
      description: `Installment ${item.installmentNumber} - ${item.month.slice(0, 7)}`,
      notes: `Canonical schedule graph repaired by daily audit agent at ${now}`,
      updated_at: now,
    };

    const reusable = reusableOutside[index];
    const mutation = reusable
      ? supabase.from("contract_payment_schedules").update(values).eq("id", reusable.id).eq("company_id", companyId)
      : supabase.from("contract_payment_schedules").insert({ ...values, contract_id: contractId, company_id: companyId });
    const { error } = await mutation;
    if (error) throw error;
    repaired += 1;
  }

  const unusedOutside = safeOutside.slice(reusableOutside.length);
  if (unusedOutside.length > 0) {
    const { error } = await supabase
      .from("contract_payment_schedules")
      .update({ status: "cancelled", invoice_id: null, updated_at: now })
      .in("id", unusedOutside.map((schedule: any) => schedule.id))
      .eq("company_id", companyId);
    if (error) throw error;
    repaired += unusedOutside.length;
  }

  return repaired;
}

async function completeUniformContractMonths(
  supabase: any,
  companyId: string,
  contractIds: string[],
  monthLimit: number,
) {
  const summary = { runs: 0, created: 0, skipped: 0 };
  if (contractIds.length === 0) return summary;

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, start_date, end_date, monthly_amount, contract_amount, status")
    .eq("company_id", companyId)
    .in("id", contractIds)
    .in("status", ["active", "under_legal_procedure", "pending", "draft"]);

  if (error) throw error;

  let checkedMonths = 0;
  for (const contract of contracts || []) {
    const startMonth = toMonthStart(String(contract.start_date || ""));
    const endMonth = toMonthStart(String(contract.end_date || ""));
    const monthlyAmount = roundMoney(Number(contract.monthly_amount || 0));
    if (!isIsoDate(startMonth) || !isIsoDate(endMonth) || endMonth < startMonth || monthlyAmount <= 0) {
      summary.skipped += 1;
      continue;
    }

    const expectedMonths = monthCountInclusive(startMonth, endMonth);
    const contractAmount = roundMoney(Number(contract.contract_amount || 0));
    const expectedAmount = roundMoney(expectedMonths * monthlyAmount);

    // Irregular contracts need an explicit schedule; do not invent equal
    // installments when their total proves they use another payment model.
    if (expectedMonths <= 0 || Math.abs(contractAmount - expectedAmount) > 1) {
      summary.skipped += 1;
      continue;
    }

    for (let offset = 0; offset < expectedMonths && checkedMonths < monthLimit; offset += 1) {
      checkedMonths += 1;
      summary.runs += 1;
      const invoiceMonth = addMonths(startMonth, offset);

      try {
        const existingInvoiceId = await findExistingInvoiceForMonth(
          supabase,
          companyId,
          contract.id,
          invoiceMonth,
        );
        if (existingInvoiceId) {
          summary.skipped += 1;
          continue;
        }

        const { data: invoiceId, error: invoiceError } = await supabase.rpc(
          "generate_invoice_for_contract_month",
          { p_contract_id: contract.id, p_invoice_month: invoiceMonth },
        );

        if (invoiceError && invoiceError.code !== "23505") throw invoiceError;
        if (invoiceId) summary.created += 1;
        else summary.skipped += 1;
      } catch (monthError) {
        console.error("[daily-audit-agent] contract month completion failed", {
          companyId,
          contractId: contract.id,
          invoiceMonth,
          error: getErrorMessage(monthError),
        });
        summary.skipped += 1;
      }
    }

    if (checkedMonths >= monthLimit) break;
  }

  return summary;
}

async function repairScheduleInvoiceLinks(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  const schedules = await loadSchedules(supabase, companyId, limit, targetContractIds);
  const activeSchedules = schedules.filter((schedule: any) => !isCancelledStatus(schedule.status) && schedule.contract_id && schedule.due_date);
  const invoiceIds: string[] = Array.from(new Set<string>(activeSchedules.map((schedule: any) => String(schedule.invoice_id)).filter(Boolean)));
  const contractIds: string[] = Array.from(new Set<string>(activeSchedules.map((schedule: any) => String(schedule.contract_id)).filter(Boolean)));
  const invoices = await loadInvoicesForContracts(supabase, companyId, contractIds, invoiceIds, limit * 60);
  const activeInvoices = invoices.filter((invoice: any) => !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status));
  const invoiceById = new Map(activeInvoices.map((invoice: any) => [invoice.id, invoice]));
  const invoicesByContractMonth = new Map<string, any[]>();
  const scheduleCountByInvoiceId = new Map<string, number>();

  for (const invoice of activeInvoices) {
    const key = invoiceContractBillingMonthKey(invoice);
    if (!key) continue;
    invoicesByContractMonth.set(key, [...(invoicesByContractMonth.get(key) || []), invoice]);
  }

  for (const schedule of activeSchedules) {
    if (!schedule.invoice_id) continue;
    scheduleCountByInvoiceId.set(schedule.invoice_id, (scheduleCountByInvoiceId.get(schedule.invoice_id) || 0) + 1);
  }

  let repaired = 0;
  const now = new Date().toISOString();

  for (const schedule of activeSchedules) {
    const scheduleMonth = toMonthStart(String(schedule.due_date));
    const expectedInvoices = invoicesByContractMonth.get(contractMonthKey(schedule.contract_id, scheduleMonth) || "") || [];
    const expectedInvoice = expectedInvoices.length === 1 ? expectedInvoices[0] : null;
    const linkedInvoice = schedule.invoice_id ? invoiceById.get(schedule.invoice_id) : null;
    const linkedMonth = linkedInvoice ? invoiceBillingMonth(linkedInvoice) : null;
    const duplicateLink = schedule.invoice_id && (scheduleCountByInvoiceId.get(schedule.invoice_id) || 0) > 1;
    const wrongLink = Boolean(expectedInvoice && schedule.invoice_id && schedule.invoice_id !== expectedInvoice.id);
    const dateMismatch = Boolean(linkedInvoice && linkedMonth && linkedMonth !== scheduleMonth);

    let nextInvoiceId: string | null | undefined;
    if (expectedInvoice && (!schedule.invoice_id || wrongLink || duplicateLink || dateMismatch)) {
      nextInvoiceId = expectedInvoice.id;
    } else if (!expectedInvoice && linkedInvoice && (wrongLink || duplicateLink || dateMismatch)) {
      nextInvoiceId = null;
    } else {
      continue;
    }

    if (!dryRun) {
      const { error } = await supabase
        .from("contract_payment_schedules")
        .update({ invoice_id: nextInvoiceId, updated_at: now })
        .eq("id", schedule.id)
        .eq("company_id", companyId);

      if (error) throw error;
    }

    repaired += 1;
  }

  return repaired;
}

async function reconcileInvoiceAmountsWithSchedules(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
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

  let reconciled = 0;
  const now = new Date().toISOString();

  for (const invoice of invoices) {
    if (isCancelledStatus(invoice.status) || isCancelledStatus(invoice.payment_status)) continue;
    if (invoice.journal_entry_id || invoicesWithActivePayments.has(invoice.id)) continue;

    const scheduleAmount = roundMoney(scheduleAmountsByInvoiceId.get(invoice.id) || 0);
    const invoiceAmount = roundMoney(Number(invoice.total_amount || 0));
    if (Math.abs(scheduleAmount - invoiceAmount) <= 1) continue;

    if (!dryRun) {
      const { error } = await supabase
        .from("invoices")
        .update({
          total_amount: scheduleAmount,
          subtotal: scheduleAmount,
          balance_due: scheduleAmount,
          paid_amount: 0,
          payment_status: scheduleAmount <= 1 ? "paid" : "unpaid",
          updated_at: now,
        })
        .eq("id", invoice.id)
        .eq("company_id", companyId);

      if (error) throw error;
    }

    reconciled += 1;
  }

  return reconciled;
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

  let cancelled = 0;
  const now = new Date().toISOString();

  for (const group of grouped.values()) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort((left, right) => invoiceKeepScore(right, invoicesWithActivePayments) - invoiceKeepScore(left, invoicesWithActivePayments));
    const [, ...duplicates] = sorted;

    for (const invoice of duplicates) {
      const safeToCancel =
        !invoice.journal_entry_id &&
        !invoicesWithActivePayments.has(invoice.id) &&
        Math.abs(Number(invoice.paid_amount || 0)) <= 0.01 &&
        Math.abs(Number(invoice.balance_due || 0)) <= 0.01;

      if (!safeToCancel) {
        reviewItems.push(`Duplicate invoice ${invoice.invoice_number || invoice.id} needs manual review because it has financial impact.`);
        continue;
      }

      if (!dryRun) {
        await cancelInvoiceSoftly(supabase, companyId, invoice.id, now);
      }
      cancelled += 1;
    }
  }

  return cancelled;
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

  let cancelled = 0;
  const now = new Date().toISOString();

  for (const invoice of activeInvoices) {
    const contract: any = contractsById.get(invoice.contract_id);
    if (!contract?.start_date || !contract?.end_date) continue;

    if (!isInvoiceOutsideContractBillingMonths(
      invoice,
      contract.start_date,
      contract.end_date,
    )) continue;

    const safeToCancel =
      !invoice.journal_entry_id &&
      !invoicesWithActivePayments.has(invoice.id) &&
      Math.abs(Number(invoice.paid_amount || 0)) <= 0.01 &&
      Math.abs(Number(invoice.balance_due || 0)) <= 0.01;

    if (!safeToCancel) {
      reviewItems.push(`Outside-period invoice ${invoice.invoice_number || invoice.id} needs reversal/manual review.`);
      continue;
    }

    if (!dryRun) {
      await cancelInvoiceSoftly(supabase, companyId, invoice.id, now);
    }
    cancelled += 1;
  }

  return cancelled;
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

async function findExistingInvoiceForMonth(supabase: any, companyId: string, contractId: string, monthStart: string) {
  const nextMonth = addMonths(monthStart, 1);
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_month, invoice_date, status, payment_status, created_at")
    .eq("company_id", companyId)
    .eq("contract_id", contractId)
    // invoice_month is canonical; invoice_date is retained only as a legacy
    // fallback. due_date is a payment deadline and must never identify the
    // billing month.
    .or(`and(invoice_month.gte.${monthStart},invoice_month.lt.${nextMonth}),and(invoice_month.is.null,invoice_date.gte.${monthStart},invoice_date.lt.${nextMonth})`)
    .order("invoice_month", { ascending: true, nullsFirst: false })
    .order("invoice_date", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return selectExistingInvoiceForMonth(data || [], monthStart)?.id || null;
}

async function linkScheduleInvoice(supabase: any, companyId: string, scheduleId: string, invoiceId: string) {
  const { error } = await supabase
    .from("contract_payment_schedules")
    .update({ invoice_id: invoiceId, updated_at: new Date().toISOString() })
    .eq("id", scheduleId)
    .eq("company_id", companyId);

  if (error) throw error;
}

async function cleanupCancelledContractZeroInvoices(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
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

  const invoiceRows = invoices || [];
  const invoiceIds = invoiceRows.map((invoice: any) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithPayments = new Set(
    payments
      .filter((payment: any) => !["cancelled", "canceled", "void", "voided", "deleted", "failed", "reversed", "refunded"].includes(String(payment.payment_status || "").toLowerCase()))
      .map((payment: any) => payment.invoice_id)
      .filter(Boolean),
  );

  const safeInvoices = invoiceRows.filter((invoice: any) =>
    !invoicesWithPayments.has(invoice.id) &&
    Math.abs(Number(invoice.total_amount || 0)) <= 0.01 &&
    Math.abs(Number(invoice.paid_amount || 0)) <= 0.01 &&
    Math.abs(Number(invoice.balance_due || 0)) <= 0.01
  );

  if (dryRun) return safeInvoices.length;

  let cancelled = 0;
  const now = new Date().toISOString();

  for (const invoice of safeInvoices) {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "cancelled",
        payment_status: "cancelled",
        updated_at: now,
      })
      .eq("id", invoice.id)
      .eq("company_id", companyId);

    if (error) throw error;
    cancelled += 1;
  }

  return cancelled;
}

async function loadContractsForAudit(
  supabase: any,
  companyId: string,
  limit: number,
  targetContractIds: string[] | null,
  includeCancelled: boolean,
) {
  let query = supabase
    .from("contracts")
    .select("id, start_date, end_date, monthly_amount, contract_amount, status")
    .eq("company_id", companyId)
    .limit(limit);

  if (targetContractIds?.length) {
    query = query.in("id", targetContractIds);
  } else if (includeCancelled) {
    query = query.in("status", ["active", "under_legal_procedure", "pending", "draft", "cancelled", "canceled"]);
  } else {
    query = query.in("status", ["active", "under_legal_procedure", "pending", "draft"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

async function cancelInvoiceSoftly(supabase: any, companyId: string, invoiceId: string, now: string) {
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "cancelled",
      payment_status: "cancelled",
      updated_at: now,
    })
    .eq("id", invoiceId)
    .eq("company_id", companyId);

  if (error) throw error;
}

async function recalculateSingleInvoiceTotals(supabase: any, companyId: string, invoiceId: string, now: string) {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, total_amount, paid_amount, balance_due, payment_status, status")
    .eq("id", invoiceId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  if (!invoice || isCancelledStatus(invoice.status) || isCancelledStatus(invoice.payment_status)) return false;

  const { error } = await supabase.rpc("recalculate_invoice_financial_state", {
    p_invoice_id: invoiceId,
  });

  if (error) throw error;
  return true;
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
    result.errors.push(`${label}: ${getErrorMessage(error)}`);
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
    await supabase.from("audit_logs").insert({
      company_id: company.companyId,
      action: "daily_audit_agent_run",
      resource_type: "system",
      resource_id: company.companyId,
      entity_name: "Daily Audit Agent",
      severity: company.errors.length > 0 ? "warning" : "info",
      status: response.mode,
      changes_summary: response.summary.slice(0, 500),
      metadata: {
        mode: response.mode,
        source: response.source,
        startedAt: response.startedAt,
        finishedAt: response.finishedAt,
        company,
      },
    });
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

function getInvoiceStatus(balance: number, dueDate: string | null, currentStatus: string | null) {
  if (balance <= 1) return "paid";
  if (!dueDate) return currentStatus || "sent";

  const today = new Date();
  const due = new Date(dueDate);
  if (!Number.isNaN(due.getTime()) && due < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    return "overdue";
  }

  return currentStatus === "draft" ? "draft" : "sent";
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

function contractMonthKey(contractId: string | null | undefined, dateValue: string | null | undefined) {
  if (!contractId || !dateValue) return "";
  return `${contractId}:${toMonthStart(String(dateValue))}`;
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

function toMonthStart(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function monthCountInclusive(startMonth: string, endMonth: string) {
  const start = new Date(`${startMonth}T00:00:00.000Z`);
  const end = new Date(`${endMonth}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return ((end.getUTCFullYear() - start.getUTCFullYear()) * 12) + end.getUTCMonth() - start.getUTCMonth() + 1;
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
