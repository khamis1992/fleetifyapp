// supabase/functions/daily-audit-agent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// supabase/functions/_shared/longcat.ts
var LONGCAT_CHAT_COMPLETIONS_URL = Deno.env.get("LONGCAT_CHAT_COMPLETIONS_URL") || "https://api.longcat.chat/openai/v1/chat/completions";
var LONGCAT_MODEL = Deno.env.get("LONGCAT_MODEL") || "LongCat-2.0";
function getLongCatApiKey() {
  return Deno.env.get("LONGCAT_API_KEY") || "";
}
function buildLongCatHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

// supabase/functions/daily-audit-agent/invoice-month.ts
function toCanonicalInvoiceMonth(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (!match) return "";
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}-01` : "";
}
function invoiceBillingMonth(invoice) {
  return toCanonicalInvoiceMonth(invoice.invoice_month || invoice.invoice_date);
}
function invoiceContractBillingMonthKey(invoice) {
  const contractId = String(invoice.contract_id || "").trim();
  const billingMonth = invoiceBillingMonth(invoice);
  return contractId && billingMonth ? `${contractId}:${billingMonth}` : "";
}
function isInvoiceOutsideContractBillingMonths(invoice, contractStart, contractEnd) {
  const invoiceMonth = invoiceBillingMonth(invoice);
  const startMonth = toCanonicalInvoiceMonth(contractStart);
  const endMonth = toCanonicalInvoiceMonth(contractEnd);
  if (!invoiceMonth || !startMonth || !endMonth) return false;
  return invoiceMonth < startMonth || invoiceMonth > endMonth;
}

// supabase/functions/daily-audit-agent/daily-rotation.ts
var MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1e3;
function getUtcDayNumber(now = /* @__PURE__ */ new Date()) {
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("now must be a valid date");
  }
  return Math.floor(timestamp / MILLISECONDS_PER_DAY);
}
function buildDailyRotatingRanges(totalCount, requestedLimit, utcDayNumber) {
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new RangeError("totalCount must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit <= 0) {
    throw new RangeError("requestedLimit must be a positive safe integer");
  }
  if (!Number.isSafeInteger(utcDayNumber)) {
    throw new RangeError("utcDayNumber must be a safe integer");
  }
  if (totalCount === 0) return [];
  const windowSize = Math.min(requestedLimit, totalCount);
  const start = (utcDayNumber * windowSize % totalCount + totalCount) % totalCount;
  const inclusiveEnd = start + windowSize - 1;
  if (inclusiveEnd < totalCount) {
    return [{ from: start, to: inclusiveEnd }];
  }
  return [
    { from: start, to: totalCount - 1 },
    { from: 0, to: inclusiveEnd - totalCount }
  ];
}

// supabase/functions/daily-audit-agent/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-secret"
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    authorizeAgent(req);
    const body = await readJson(req);
    if (body.dryRun === false) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Legacy daily-audit writer retired",
        replacement: "system-audit-orchestrator"
      }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const dryRun = body.dryRun !== false;
    const maxCompanies = clampInt(body.maxCompanies, 1, 50, 10);
    const maxContractsPerCompany = clampInt(body.maxContractsPerCompany, 1, 500, 80);
    const maxInvoicesPerCompany = clampInt(body.maxInvoicesPerCompany, 1, 2e3, 600);
    const maxJournalRepairBatch = clampInt(body.maxJournalRepairBatch, 1, 1e3, 150);
    const includeAiSummary = body.includeAiSummary !== false;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const hasContractSelector = Boolean(body.contractId || body.contractNumber);
    const targetContracts = await loadTargetContracts(supabase, body);
    if (hasContractSelector && targetContracts.length === 0) {
      throw new Error("Requested contract selector did not match any contract");
    }
    if (hasContractSelector && targetContracts.length !== 1) {
      throw new Error("Requested contract selector is ambiguous; include companyId or contractId");
    }
    const targetCompanyId = hasContractSelector ? targetContracts[0].company_id : body.companyId;
    const companies = await loadCompanies(supabase, targetCompanyId, maxCompanies);
    const results = [];
    for (const company of companies) {
      const targetContractIds = targetContracts.filter((contract) => contract.company_id === company.id).map((contract) => contract.id);
      results.push(await auditCompany({
        supabase,
        company,
        dryRun,
        maxContractsPerCompany,
        maxInvoicesPerCompany,
        maxJournalRepairBatch,
        targetContractIds: hasContractSelector ? targetContractIds : null
      }));
    }
    const totals = summarizeTotals(results);
    const localSummary = buildLocalSummary(dryRun, results, totals);
    const aiSummary = includeAiSummary ? await buildAiSummary(localSummary, totals, results) : null;
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    const response = {
      ok: totals.errors === 0,
      status: totals.errors === 0 ? "completed" : "partial",
      mode: dryRun ? "dry_run" : "apply",
      source: aiSummary ? "longcat" : "local",
      startedAt,
      finishedAt,
      summary: aiSummary || localSummary,
      companiesProcessed: results.length,
      totals,
      companies: results
    };
    await writeAgentAuditLog(supabase, response);
    return jsonResponse(response, response.status === "partial" ? 207 : 200);
  } catch (error) {
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    return jsonResponse({
      ok: false,
      status: "partial",
      mode: "dry_run",
      source: "local",
      startedAt,
      finishedAt,
      error: getErrorMessage(error)
    }, 500);
  }
});
function authorizeAgent(req) {
  const configuredSecret = Deno.env.get("AUDIT_AGENT_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("authorization") || "";
  const agentSecret = req.headers.get("x-agent-secret") || "";
  if (configuredSecret && agentSecret === configuredSecret) return;
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;
  throw new Error("Unauthorized daily audit agent request");
}
async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
async function loadCompanies(supabase, companyId, limit) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const isEligible = (company) => {
    const status = String(company.subscription_status || "active").toLowerCase();
    if (status && !["active", "trial", ""].includes(status)) return false;
    if (company.subscription_expires_at && String(company.subscription_expires_at).slice(0, 10) < today) return false;
    return true;
  };
  if (companyId) {
    const { data, error } = await supabase.from("companies").select("id, name, name_ar, subscription_status, subscription_expires_at").eq("id", companyId).limit(1);
    if (error) throw error;
    return (data || []).filter(isEligible);
  }
  const eligibleCompanies = [];
  let afterId = null;
  const pageSize = 500;
  while (true) {
    let query = supabase.from("companies").select("id, name, name_ar, subscription_status, subscription_expires_at").order("id", { ascending: true }).limit(pageSize);
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
    getUtcDayNumber()
  );
  return ranges.flatMap(
    (range) => eligibleCompanies.slice(range.from, range.to + 1)
  );
}
async function loadTargetContracts(supabase, body) {
  if (!body.contractId && !body.contractNumber) return [];
  let query = supabase.from("contracts").select("id, company_id, contract_number, status").limit(20);
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
  targetContractIds
}) {
  const result = {
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
      outOfPeriodPaymentsRepaired: 0
    },
    accounting: {
      paymentJournalNeedsCreate: 0,
      paymentJournalNeedsRelink: 0,
      paymentJournalCreated: 0,
      paymentJournalRelinked: 0,
      paymentJournalFailed: 0,
      unbalancedJournalEntries: 0
    },
    reviewItems: [],
    errors: []
  };
  await safeStep(result, "backfill_missing_contract_invoices", async () => {
    const backfill = await backfillContractInvoices(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds);
    result.contracts.invoiceBackfillRuns = backfill.runs;
    result.contracts.invoiceBackfillCreated = backfill.created;
    result.contracts.invoiceBackfillSkipped = backfill.skipped;
    const backfillFailures = backfill.errors.map(
      (error) => `backfill_missing_contract_invoices: ${error}`
    );
    result.errors.push(...backfillFailures);
    result.reviewItems.push(...backfillFailures.map(
      (error) => `\u0641\u0634\u0644 \u0625\u0635\u0644\u0627\u062D \u0641\u0648\u062A\u0631\u0629 \u062A\u0644\u0642\u0627\u0626\u064A \u0648\u064A\u062A\u0637\u0644\u0628 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0634\u0631\u0641: ${error}`
    ));
  });
  await safeStep(result, "recalculate_invoice_balances", async () => {
    result.invoices = await recalculateInvoiceBalances(supabase, company.id, dryRun, maxInvoicesPerCompany, targetContractIds);
  });
  await safeStep(result, "recalculate_contract_totals", async () => {
    result.contracts = {
      ...result.contracts,
      ...await recalculateContractTotals(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds)
    };
  });
  await safeStep(result, "reconcile_invoice_amounts_with_schedules", async () => {
    result.contracts.invoiceAmountsReconciled = await reconcileInvoiceAmountsWithSchedules(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
    );
  });
  await safeStep(result, "cleanup_duplicate_contract_month_invoices", async () => {
    result.contracts.duplicateInvoicesCancelled = await cleanupDuplicateContractMonthInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
    );
  });
  await safeStep(result, "cleanup_outside_contract_invoices", async () => {
    result.contracts.outsideInvoicesCancelled = await cleanupOutsideContractInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
    );
  });
  await safeStep(result, "cleanup_cancelled_contract_zero_invoices", async () => {
    result.contracts.cancelledZeroInvoicesCancelled = await cleanupCancelledContractZeroInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
    );
  });
  await safeStep(result, "link_unlinked_payments_to_invoices", async () => {
    result.contracts.unlinkedPaymentsLinked = await linkUnlinkedPaymentsToClearInvoices(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
    );
  });
  await safeStep(result, "sync_schedule_payment_states", async () => {
    result.contracts.scheduleStatesSynced = await syncSchedulePaymentStates(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds
    );
  });
  await safeStep(result, "repair_out_of_period_payments", async () => {
    result.contracts.outOfPeriodPaymentsRepaired = await repairOutOfPeriodPayments(
      supabase,
      company.id,
      dryRun,
      maxContractsPerCompany,
      targetContractIds,
      result.reviewItems
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
    if (!dryRun && targetContractIds === null) {
      await reconcileDailyAuditReviewTask(supabase, company.id, result.reviewItems);
    }
  });
  return result;
}
async function reconcileDailyAuditReviewTask(supabase, companyId, reviewItems) {
  if (reviewItems.length === 0) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const lifecycleKey = `daily-audit-agent:${companyId}`;
  const title = `\u0645\u0631\u0627\u062C\u0639\u0629 ${reviewItems.length} \u0639\u0646\u0635\u0631\u064B\u0627 \u0645\u0627\u0644\u064A\u064B\u0627 \u0631\u0635\u062F\u0647 \u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u064A\u0648\u0645\u064A`;
  const shown = reviewItems.slice(0, 20).map((item) => `- ${item}`).join("\n");
  const description = `\u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u064A\u0648\u0645\u064A \u0631\u0635\u062F ${reviewItems.length} \u0639\u0646\u0635\u0631\u064B\u0627 \u064A\u062D\u062A\u0627\u062C \u0642\u0631\u0627\u0631\u064B\u0627 \u0628\u0634\u0631\u064A\u064B\u0627:
${shown}${reviewItems.length > 20 ? `
- ... \u0648 ${reviewItems.length - 20} \u0639\u0646\u0635\u0631\u064B\u0627 \u0625\u0636\u0627\u0641\u064A\u064B\u0627 \u0641\u064A \u0633\u062C\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642` : ""}`;
  const { data: existing, error: existingError } = await supabase.from("tasks").select("id,status,metadata,description,assigned_to,created_by,created_at").eq("company_id", companyId).eq("category", "system_audit_review").in("status", ["pending", "in_progress", "on_hold"]).eq("metadata->>source", "daily_audit_agent").order("created_at", { ascending: true });
  if (existingError) throw existingError;
  const openTasks = existing || [];
  if (openTasks.length > 0) {
    const [currentTask] = openTasks;
    const currentMetadata = currentTask.metadata && typeof currentTask.metadata === "object" ? currentTask.metadata : {};
    const previousReviewItems = Array.isArray(currentMetadata.reviewItems) ? currentMetadata.reviewItems.filter((item) => typeof item === "string") : [];
    const accumulatedReviewItems = Array.from(/* @__PURE__ */ new Set([
      ...previousReviewItems,
      ...reviewItems
    ]));
    const newReviewItems = reviewItems.filter((item) => !previousReviewItems.includes(item));
    const taskUpdate = {
      metadata: {
        ...currentMetadata,
        source: "daily_audit_agent",
        dailyAuditTaskKey: lifecycleKey,
        lifecycleMode: "additive_only",
        snapshotComplete: false,
        reviewItems: accumulatedReviewItems,
        reviewItemCount: accumulatedReviewItems.length,
        latestReviewItemCount: reviewItems.length,
        syncedAt: now
      },
      updated_at: now
    };
    if (currentTask.status === "pending" && newReviewItems.length > 0) {
      const additionalShown = newReviewItems.slice(0, 20).map((item) => `- ${item}`).join("\n");
      const additionalDescription = `Additional findings from the latest rotating audit window:
${additionalShown}${newReviewItems.length > 20 ? `
- ... and ${newReviewItems.length - 20} more findings retained in task metadata and the audit log` : ""}`;
      taskUpdate.description = [currentTask.description, additionalDescription].filter(Boolean).join("\n\n");
    }
    const { error: updateError } = await supabase.from("tasks").update(taskUpdate).eq("company_id", companyId).eq("id", currentTask.id);
    if (updateError) throw updateError;
    const actorId = currentTask.assigned_to || currentTask.created_by;
    if (actorId) {
      const { error: activityError } = await supabase.from("task_activity_log").insert({
        task_id: currentTask.id,
        user_id: actorId,
        action: "updated",
        description: currentTask.status === "pending" ? "\u062D\u062F\u0651\u062B \u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u064A\u0648\u0645\u064A \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629." : "\u0623\u0631\u0641\u0642 \u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u064A\u0648\u0645\u064A \u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0623\u062D\u062F\u062B \u062F\u0648\u0646 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u062C\u0627\u0631\u064A\u0629.",
        new_value: {
          lifecycleKey,
          lifecycleMode: "additive_only",
          snapshotComplete: false,
          reviewItemCount: accumulatedReviewItems.length,
          latestReviewItemCount: reviewItems.length,
          syncedAt: now
        }
      });
      if (activityError) console.warn("[daily-audit-agent] update task activity log failed", activityError.message);
    }
    return;
  }
  const { data: profileRows, error: profileError } = await supabase.from("profiles").select("id").eq("company_id", companyId).eq("is_active", true).in("role", ["admin", "manager", "accountant", "super_admin", "company_admin"]).limit(1);
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
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
    category: "system_audit_review",
    tags: ["system-audit", "daily-audit-agent", "human-decision"],
    metadata: {
      source: "daily_audit_agent",
      dailyAuditTaskKey: lifecycleKey,
      lifecycleMode: "additive_only",
      snapshotComplete: false,
      reviewItems,
      reviewItemCount: reviewItems.length,
      syncedAt: now
    }
  });
  if (insertError) throw insertError;
}
async function recalculateInvoiceBalances(supabase, companyId, dryRun, limit, targetContractIds) {
  const { data: driftRows, error: driftError } = await supabase.rpc("invoice_balance_drift_report", {
    p_company_id: companyId,
    p_contract_ids: targetContractIds?.length ? targetContractIds : null
  });
  if (driftError) throw driftError;
  const drift = (driftRows || []).slice(0, Math.max(1, limit));
  let countQuery = supabase.from("invoices").select("id", { count: "exact", head: true }).eq("company_id", companyId).not("status", "eq", "cancelled");
  if (targetContractIds?.length) countQuery = countQuery.in("contract_id", targetContractIds);
  const { count: scanned } = await countQuery;
  if (dryRun) {
    return { scanned: scanned ?? drift.length, fixedBalances: drift.length };
  }
  let fixedBalances = 0;
  const batchErrors = [];
  for (const invoiceIds of chunk(drift.map((row) => row.invoice_id), 500)) {
    const { data: batchResult, error: batchError } = await supabase.rpc(
      "recalculate_invoice_financial_states_batch",
      {
        p_company_id: companyId,
        p_invoice_ids: invoiceIds
      }
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
    fixedBalances
  };
}
async function recalculateContractTotals(supabase, companyId, dryRun, limit, targetContractIds) {
  let query = supabase.from("contracts").select("id, contract_amount, total_paid, balance_due, payment_status, status").eq("company_id", companyId).in("status", targetContractIds?.length ? ["active", "under_legal_procedure", "pending", "draft", "cancelled", "canceled"] : ["active", "under_legal_procedure", "pending", "draft"]).order("updated_at", { ascending: true });
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
        p_contract_ids: contractRows.map((contract) => contract.id)
      }
    );
    if (batchError) throw batchError;
    const batchErrors = Array.isArray(batchResult?.errors) ? batchResult.errors : [];
    if (batchErrors.length > 0) {
      throw new Error(`Canonical contract recalculation failed for ${batchErrors.length} rows: ${JSON.stringify(batchErrors.slice(0, 5))}`);
    }
    return {
      scanned: contractRows.length,
      fixedTotals: Number(batchResult?.fixed || 0)
    };
  }
  const contractIds = contractRows.map((contract) => contract.id);
  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  const paidByContract = /* @__PURE__ */ new Map();
  for (const payment of payments) {
    if (!isCompletedPayment(payment.payment_status)) continue;
    paidByContract.set(payment.contract_id, (paidByContract.get(payment.contract_id) || 0) + Number(payment.amount || 0));
  }
  let fixedTotals = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const contract of contractRows) {
    const paid = roundMoney(paidByContract.get(contract.id) || 0);
    const amount = roundMoney(Number(contract.contract_amount || 0));
    const balance = roundMoney(Math.max(0, amount - paid));
    const paymentStatus = balance <= 1 ? "paid" : paid > 0 ? "partial" : "unpaid";
    const changed = Math.abs(Number(contract.total_paid || 0) - paid) > 0.01 || Math.abs(Number(contract.balance_due || 0) - balance) > 0.01 || String(contract.payment_status || "").toLowerCase() !== paymentStatus;
    if (!changed) continue;
    fixedTotals += 1;
    if (!dryRun) {
      const { error: updateError } = await supabase.from("contracts").update({
        total_paid: paid,
        balance_due: balance,
        payment_status: paymentStatus,
        updated_at: now
      }).eq("id", contract.id).eq("company_id", companyId);
      if (updateError) throw updateError;
    }
  }
  return { scanned: contractRows.length, fixedTotals };
}
async function backfillContractInvoices(supabase, companyId, dryRun, limit, targetContractIds) {
  if (!targetContractIds?.length) {
    return backfillContractInvoicesWithDurableCursor(
      supabase,
      companyId,
      dryRun,
      limit
    );
  }
  const auditedContracts = await loadContractsForAudit(
    supabase,
    companyId,
    limit,
    targetContractIds,
    false
  );
  const contractIds = Array.from(new Set(
    auditedContracts.filter((contract) => [
      "active",
      "under_legal_procedure"
    ].includes(String(contract.status || "").toLowerCase())).map((contract) => contract.id).filter(Boolean)
  )).slice(0, limit);
  if (dryRun) {
    return {
      runs: contractIds.length,
      created: 0,
      skipped: 0,
      errors: []
    };
  }
  const summary = {
    runs: contractIds.length,
    created: 0,
    skipped: 0,
    errors: []
  };
  for (const contractBatch of chunk(contractIds, 5)) {
    const outcomes = await Promise.all(contractBatch.map(async (contractId) => {
      try {
        const { data: createdCount, error } = await supabase.rpc(
          "generate_invoices_from_payment_schedule",
          { p_contract_id: contractId }
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
          error: outcome.error
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
async function backfillContractInvoicesWithDurableCursor(supabase, companyId, dryRun, limit) {
  const summary = {
    runs: 0,
    created: 0,
    skipped: 0,
    errors: []
  };
  let { data: cursorRow, error: cursorReadError } = await supabase.from("daily_invoice_repair_cursors").select("last_contract_id, version, cycle_count").eq("company_id", companyId).maybeSingle();
  if (cursorReadError) throw cursorReadError;
  if (!cursorRow && !dryRun) {
    const { error: cursorCreateError } = await supabase.from("daily_invoice_repair_cursors").upsert({ company_id: companyId }, {
      onConflict: "company_id",
      ignoreDuplicates: true
    });
    if (cursorCreateError) throw cursorCreateError;
    const reread = await supabase.from("daily_invoice_repair_cursors").select("last_contract_id, version, cycle_count").eq("company_id", companyId).single();
    if (reread.error) throw reread.error;
    cursorRow = reread.data;
  }
  let currentCursor = cursorRow?.last_contract_id || null;
  let cursorVersion = Number(cursorRow?.version || 0);
  let cycleCount = Number(cursorRow?.cycle_count || 0);
  let wrappedSinceCheckpoint = false;
  const seenContractIds = /* @__PURE__ */ new Set();
  while (summary.runs < limit) {
    const batchLimit = Math.min(5, limit - summary.runs);
    let query = supabase.from("contracts").select("id").eq("company_id", companyId).in("status", ["active", "under_legal_procedure"]).order("id", { ascending: true }).limit(batchLimit);
    if (currentCursor) query = query.gt("id", currentCursor);
    const { data: rows, error: rowsError } = await query;
    if (rowsError) throw rowsError;
    const batch = (rows || []).filter(
      (row) => row.id && !seenContractIds.has(row.id)
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
      const outcomes = await Promise.all(batch.map(async (row) => {
        try {
          const { data: createdCount, error } = await supabase.rpc(
            "generate_invoices_from_payment_schedule",
            { p_contract_id: row.id }
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
      const { data: checkpoint, error: checkpointError } = await supabase.from("daily_invoice_repair_cursors").update({
        last_contract_id: batchLastContractId,
        version: nextVersion,
        cycle_count: nextCycleCount,
        last_error_count: outcomes.filter((outcome) => outcome.error).length,
        last_completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("company_id", companyId).eq("version", cursorVersion).select("version").maybeSingle();
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
async function reconcileInvoiceAmountsWithSchedules(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  const schedules = await loadSchedules(supabase, companyId, limit, targetContractIds);
  const activeSchedules = schedules.filter((schedule) => !isCancelledStatus(schedule.status) && schedule.invoice_id);
  const scheduleAmountsByInvoiceId = /* @__PURE__ */ new Map();
  for (const schedule of activeSchedules) {
    scheduleAmountsByInvoiceId.set(
      schedule.invoice_id,
      roundMoney((scheduleAmountsByInvoiceId.get(schedule.invoice_id) || 0) + Number(schedule.amount || 0))
    );
  }
  const invoiceIds = Array.from(scheduleAmountsByInvoiceId.keys());
  if (invoiceIds.length === 0) return 0;
  const invoices = await loadInvoicesByIds(supabase, companyId, invoiceIds);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments.filter((payment) => !isInactivePaymentStatus(payment.payment_status)).map((payment) => payment.invoice_id).filter(Boolean)
  );
  for (const invoice of invoices) {
    if (isCancelledStatus(invoice.status) || isCancelledStatus(invoice.payment_status)) continue;
    const scheduleAmount = roundMoney(scheduleAmountsByInvoiceId.get(invoice.id) || 0);
    const invoiceAmount = roundMoney(Number(invoice.total_amount || 0));
    if (Math.abs(scheduleAmount - invoiceAmount) <= 1) continue;
    reviewItems.push(
      `Invoice ${invoice.invoice_number || invoice.id} differs from its payment schedule (${invoiceAmount} vs ${scheduleAmount}). It was not repriced automatically${invoice.journal_entry_id || invoicesWithActivePayments.has(invoice.id) ? " because it has recorded financial history" : " because a reference journal may exist even when journal_entry_id is null"}.`
    );
  }
  void dryRun;
  return 0;
}
async function cleanupDuplicateContractMonthInvoices(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, true);
  const contractIds = contracts.map((contract) => contract.id);
  if (contractIds.length === 0) return 0;
  const invoices = await loadInvoicesForContracts(supabase, companyId, contractIds, [], limit * 80);
  const activeInvoices = invoices.filter((invoice) => !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status));
  const invoiceIds = activeInvoices.map((invoice) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments.filter((payment) => !isInactivePaymentStatus(payment.payment_status)).map((payment) => payment.invoice_id).filter(Boolean)
  );
  const grouped = /* @__PURE__ */ new Map();
  for (const invoice of activeInvoices) {
    const key = invoiceContractBillingMonthKey(invoice);
    if (!key) continue;
    grouped.set(key, [...grouped.get(key) || [], invoice]);
  }
  for (const group of grouped.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((left, right) => invoiceKeepScore(right, invoicesWithActivePayments) - invoiceKeepScore(left, invoicesWithActivePayments));
    const [, ...duplicates] = sorted;
    for (const invoice of duplicates) {
      reviewItems.push(
        `Duplicate invoice ${invoice.invoice_number || invoice.id} requires canonical reversal/manual review; the daily agent never soft-cancels invoice source documents.`
      );
    }
  }
  void dryRun;
  void invoicesWithActivePayments;
  return 0;
}
async function cleanupOutsideContractInvoices(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const contractIds = Array.from(contractsById.keys());
  if (contractIds.length === 0) return 0;
  const invoices = await loadInvoicesForContracts(supabase, companyId, contractIds, [], limit * 80);
  const activeInvoices = invoices.filter((invoice) => !isCancelledStatus(invoice.status) && !isCancelledStatus(invoice.payment_status));
  const invoiceIds = activeInvoices.map((invoice) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const invoicesWithActivePayments = new Set(
    payments.filter((payment) => !isInactivePaymentStatus(payment.payment_status)).map((payment) => payment.invoice_id).filter(Boolean)
  );
  for (const invoice of activeInvoices) {
    const contract = contractsById.get(invoice.contract_id);
    if (!contract?.start_date || !contract?.end_date) continue;
    if (!isInvoiceOutsideContractBillingMonths(
      invoice,
      contract.start_date,
      contract.end_date
    )) continue;
    reviewItems.push(
      `Outside-period invoice ${invoice.invoice_number || invoice.id} requires canonical reversal/manual review; it was not soft-cancelled automatically.`
    );
  }
  void dryRun;
  void invoicesWithActivePayments;
  return 0;
}
async function linkUnlinkedPaymentsToClearInvoices(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  const { data, error } = await supabase.rpc("allocate_contract_receipts_fifo", {
    p_company_id: companyId,
    p_contract_id: targetContractIds?.length === 1 ? targetContractIds[0] : null,
    p_dry_run: dryRun,
    p_max_payments: Math.max(1, limit * 10)
  });
  if (error) throw error;
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  for (const warning of warnings) {
    reviewItems.push(String(warning));
  }
  return Number(data?.payments_processed || 0);
}
async function syncSchedulePaymentStates(supabase, companyId, dryRun, limit, targetContractIds) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  let synced = 0;
  for (const contract of contracts) {
    const { data, error } = await supabase.rpc("sync_contract_schedule_payment_state", {
      p_contract_id: contract.id,
      p_dry_run: dryRun
    });
    if (error) {
      console.warn("[daily-audit-agent] schedule payment state sync skipped", {
        contractId: contract.id,
        message: error.message
      });
      continue;
    }
    synced += Number(data || 0);
  }
  return synced;
}
async function detectDuplicatePayments(supabase, companyId, limit, targetContractIds) {
  let query = supabase.from("payments").select("id, contract_id, payment_date, amount, payment_status, reference_number").eq("company_id", companyId).limit(limit * 20);
  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);
  const { data, error } = await query;
  if (error) throw error;
  const seen = /* @__PURE__ */ new Set();
  let duplicates = 0;
  for (const payment of data || []) {
    if (isInactivePaymentStatus(payment.payment_status)) continue;
    const key = `${payment.contract_id || ""}:${payment.payment_date || ""}:${roundMoney(Number(payment.amount || 0))}:${payment.reference_number || ""}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}
async function repairOutOfPeriodPayments(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, false);
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const contractIds = Array.from(contractsById.keys());
  if (contractIds.length === 0) return 0;
  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  let repaired = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const payment of payments) {
    if (isInactivePaymentStatus(payment.payment_status) || !payment.payment_date || !payment.contract_id) continue;
    const contract = contractsById.get(payment.contract_id);
    if (!contract?.start_date || !contract?.end_date) continue;
    const paymentDate = String(payment.payment_date).slice(0, 10);
    if (paymentDate >= contract.start_date && paymentDate <= contract.end_date) continue;
    const nextDate = paymentDate < contract.start_date ? contract.start_date : contract.end_date;
    if (isCompletedPayment(payment.payment_status)) {
      reviewItems.push(`Completed payment ${payment.payment_number || payment.reference_number || payment.id} is outside contract period and needs reversal/manual approval.`);
      continue;
    }
    if (!dryRun) {
      const { error } = await supabase.from("payments").update({ payment_date: nextDate, updated_at: now }).eq("id", payment.id).eq("company_id", companyId);
      if (error) throw error;
    }
    repaired += 1;
  }
  return repaired;
}
async function detectContractOverpayments(supabase, companyId, limit, targetContractIds) {
  const contracts = await loadContractsForAudit(supabase, companyId, limit, targetContractIds, true);
  const contractIds = contracts.map((contract) => contract.id);
  if (contractIds.length === 0) return 0;
  const payments = await fetchPaymentsForContracts(supabase, companyId, contractIds);
  const paidByContract = /* @__PURE__ */ new Map();
  for (const payment of payments) {
    if (!isCompletedPayment(payment.payment_status) || !payment.contract_id) continue;
    paidByContract.set(payment.contract_id, roundMoney((paidByContract.get(payment.contract_id) || 0) + Number(payment.amount || 0)));
  }
  return contracts.filter((contract) => {
    const amount = roundMoney(Number(contract.contract_amount || 0));
    const paid = roundMoney(paidByContract.get(contract.id) || 0);
    return amount > 0 && paid - amount > 1;
  }).length;
}
async function cleanupCancelledContractZeroInvoices(supabase, companyId, dryRun, limit, targetContractIds, reviewItems) {
  let contractQuery = supabase.from("contracts").select("id").eq("company_id", companyId).in("status", ["cancelled", "canceled"]).limit(limit);
  if (targetContractIds?.length) contractQuery = contractQuery.in("id", targetContractIds);
  const { data: contracts, error: contractError } = await contractQuery;
  if (contractError) throw contractError;
  const contractIds = (contracts || []).map((contract) => contract.id);
  if (contractIds.length === 0) return 0;
  const { data: invoices, error: invoiceError } = await supabase.from("invoices").select("id, total_amount, paid_amount, balance_due, payment_status, status").eq("company_id", companyId).in("contract_id", contractIds).not("status", "eq", "cancelled").limit(limit * 50);
  if (invoiceError) throw invoiceError;
  const zeroInvoices = (invoices || []).filter(
    (invoice) => Math.abs(Number(invoice.total_amount || 0)) <= 0.01 && Math.abs(Number(invoice.paid_amount || 0)) <= 0.01 && Math.abs(Number(invoice.balance_due || 0)) <= 0.01
  );
  for (const invoice of zeroInvoices) {
    reviewItems.push(
      `Zero invoice ${invoice.id} belongs to a cancelled contract and requires canonical cancellation review; the daily agent did not mutate the source document.`
    );
  }
  void dryRun;
  return 0;
}
async function loadContractsForAudit(supabase, companyId, limit, targetContractIds, includeCancelled) {
  if (targetContractIds?.length) {
    const { data, error } = await supabase.from("contracts").select("id, start_date, end_date, monthly_amount, contract_amount, status").eq("company_id", companyId).in("id", targetContractIds).order("id", { ascending: true }).limit(limit);
    if (error) throw error;
    return data || [];
  }
  const statuses = includeCancelled ? ["active", "under_legal_procedure", "pending", "draft", "cancelled", "canceled"] : ["active", "under_legal_procedure", "pending", "draft"];
  const { count, error: countError } = await supabase.from("contracts").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("status", statuses);
  if (countError) throw countError;
  const ranges = buildDailyRotatingRanges(count || 0, limit, getUtcDayNumber());
  const contracts = [];
  for (const range of ranges) {
    const { data, error } = await supabase.from("contracts").select("id, start_date, end_date, monthly_amount, contract_amount, status").eq("company_id", companyId).in("status", statuses).order("id", { ascending: true }).range(range.from, range.to);
    if (error) throw error;
    contracts.push(...data || []);
  }
  return contracts;
}
async function loadSchedules(supabase, companyId, limit, targetContractIds) {
  let query = supabase.from("contract_payment_schedules").select("id, contract_id, installment_number, due_date, amount, status, invoice_id").eq("company_id", companyId).limit(limit * 60);
  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
async function loadInvoicesForContracts(supabase, companyId, contractIds, extraInvoiceIds, limit) {
  const rows = [];
  const cleanContractIds = Array.from(new Set(contractIds.filter(Boolean)));
  const cleanInvoiceIds = Array.from(new Set(extraInvoiceIds.filter(Boolean)));
  for (const ids of chunk(cleanContractIds, 100)) {
    const { data, error } = await supabase.from("invoices").select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at").eq("company_id", companyId).in("contract_id", ids).limit(limit);
    if (error) throw error;
    rows.push(...data || []);
  }
  for (const ids of chunk(cleanInvoiceIds, 100)) {
    const { data, error } = await supabase.from("invoices").select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at, updated_at").eq("company_id", companyId).in("id", ids).limit(limit);
    if (error) throw error;
    rows.push(...data || []);
  }
  const byId = /* @__PURE__ */ new Map();
  for (const row of rows) byId.set(row.id, row);
  return Array.from(byId.values());
}
async function loadInvoicesByIds(supabase, companyId, invoiceIds) {
  const rows = [];
  for (const ids of chunk(Array.from(new Set(invoiceIds.filter(Boolean))), 100)) {
    const { data, error } = await supabase.from("invoices").select("id, company_id, contract_id, invoice_number, invoice_month, invoice_date, due_date, total_amount, subtotal, paid_amount, balance_due, status, payment_status, journal_entry_id, created_at").eq("company_id", companyId).in("id", ids);
    if (error) throw error;
    rows.push(...data || []);
  }
  return rows;
}
async function repairPaymentJournalIntegrity(supabase, companyId, apply, limit) {
  const { data, error } = await supabase.rpc("repair_payment_journal_integrity", {
    p_company_id: companyId,
    p_apply: apply,
    p_limit: limit
  });
  if (error) throw error;
  return {
    needsCreate: Number(data?.needs_create || 0),
    needsRelink: Number(data?.needs_relink || 0),
    created: Number(data?.created || 0),
    relinked: Number(data?.relinked || 0),
    failed: Number(data?.failed || 0)
  };
}
async function countUnbalancedJournalEntries(supabase, companyId) {
  const { data, error } = await supabase.from("journal_entries").select("id, total_debit, total_credit").eq("company_id", companyId).limit(1e3);
  if (error) throw error;
  return (data || []).filter(
    (entry) => Math.abs(Number(entry.total_debit || 0) - Number(entry.total_credit || 0)) > 0.01
  ).length;
}
async function fetchPaymentsForInvoices(supabase, companyId, invoiceIds) {
  if (invoiceIds.length === 0) return [];
  const chunks = chunk(invoiceIds, 200);
  const rows = [];
  for (const ids of chunks) {
    const { data, error } = await supabase.from("payments").select("invoice_id, amount, payment_status").eq("company_id", companyId).in("invoice_id", ids);
    if (error) throw error;
    rows.push(...data || []);
  }
  return rows.filter((row) => row.invoice_id);
}
async function fetchPaymentsForContracts(supabase, companyId, contractIds) {
  if (contractIds.length === 0) return [];
  const chunks = chunk(contractIds, 200);
  const rows = [];
  for (const ids of chunks) {
    const { data, error } = await supabase.from("payments").select("id, contract_id, invoice_id, amount, payment_date, payment_status, reference_number, payment_number").eq("company_id", companyId).in("contract_id", ids);
    if (error) throw error;
    rows.push(...data || []);
  }
  return rows.filter((row) => row.contract_id);
}
async function safeStep(result, label, fn) {
  try {
    await fn();
  } catch (error) {
    const failure = `${label}: ${getErrorMessage(error)}`;
    result.errors.push(failure);
    result.reviewItems.push(
      `\u0641\u0634\u0644\u062A \u062E\u0637\u0648\u0629 \u0627\u0644\u0648\u0643\u064A\u0644 ${label} \u0648\u062A\u062A\u0637\u0644\u0628 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0634\u0631\u0641: ${failure}`
    );
  }
}
async function buildAiSummary(localSummary, totals, companies) {
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
    errors: company.errors.length
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
            content: "You summarize ERP audit agent results in Arabic. Use only aggregate counts. Do not invent names, IDs, or financial details."
          },
          {
            role: "user",
            content: JSON.stringify({ localSummary, totals, companies: compactCompanies })
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return String(payload?.choices?.[0]?.message?.content || "").trim() || null;
  } catch {
    return null;
  }
}
async function writeAgentAuditLog(supabase, response) {
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
        company
      }
    });
    if (error) throw error;
  }
}
function summarizeTotals(results) {
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
    errors: 0
  });
}
function buildLocalSummary(dryRun, results, totals) {
  const mode = dryRun ? "dry run" : "apply";
  return `${mode}: reviewed ${results.length} companies. invoice balances: ${totals.invoicesFixed}, contract totals: ${totals.contractsFixed}, schedule links: ${totals.scheduleLinksRepaired}, schedule states synced: ${totals.scheduleStatesSynced}, missing invoices created: ${totals.invoiceBackfillCreated}, invoice amounts: ${totals.invoiceAmountsReconciled}, duplicate invoices cancelled: ${totals.duplicateInvoicesCancelled}, outside invoices cancelled: ${totals.outsideInvoicesCancelled}, cancelled zero invoices: ${totals.cancelledZeroInvoicesCancelled}, unlinked payments linked: ${totals.unlinkedPaymentsLinked}, out-of-period payments repaired: ${totals.outOfPeriodPaymentsRepaired}, payment journal fixes: ${totals.paymentJournalsCreated + totals.paymentJournalsRelinked}.`;
}
function isCompletedPayment(status) {
  return ["completed", "paid", "success", "succeeded"].includes(String(status || "").toLowerCase());
}
function isCancelledStatus(status) {
  return ["cancelled", "canceled", "void", "voided", "deleted", "inactive"].includes(String(status || "").toLowerCase());
}
function isInactivePaymentStatus(status) {
  return ["cancelled", "canceled", "void", "voided", "deleted", "failed", "reversed", "refunded"].includes(String(status || "").toLowerCase());
}
function invoiceKeepScore(invoice, invoicesWithActivePayments) {
  let score = 0;
  if (invoicesWithActivePayments.has(invoice.id)) score += 1e3;
  if (invoice.journal_entry_id) score += 500;
  score += Number(invoice.total_amount || 0) > 0 ? 100 : 0;
  score += Number(invoice.paid_amount || 0) > 0 ? 50 : 0;
  score += Number(invoice.balance_due || 0) > 0 ? 20 : 0;
  return score;
}
function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
function clampInt(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  const payload = error;
  return [payload?.message, payload?.details, payload?.code].filter(Boolean).join(" - ") || String(error);
}
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
