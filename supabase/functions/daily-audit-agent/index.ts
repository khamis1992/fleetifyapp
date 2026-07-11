import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";

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

  await safeStep(result, "backfill_missing_contract_invoices", async () => {
    const backfill = await backfillContractInvoices(supabase, company.id, dryRun, maxContractsPerCompany, targetContractIds);
    result.contracts.invoiceBackfillRuns = backfill.runs;
    result.contracts.invoiceBackfillCreated = backfill.created;
    result.contracts.invoiceBackfillSkipped = backfill.skipped;
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

  return result;
}

async function recalculateInvoiceBalances(
  supabase: any,
  companyId: string,
  dryRun: boolean,
  limit: number,
  targetContractIds: string[] | null,
) {
  let query = supabase
    .from("invoices")
    .select("id, total_amount, paid_amount, balance_due, due_date, status, payment_status")
    .eq("company_id", companyId)
    .not("status", "eq", "cancelled")
    .order("updated_at", { ascending: true });

  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);
  query = query.limit(limit);

  const { data: invoices, error } = await query;
  if (error) throw error;
  const invoiceRows = invoices || [];
  const invoiceIds = invoiceRows.map((invoice: any) => invoice.id);
  const payments = await fetchPaymentsForInvoices(supabase, companyId, invoiceIds);
  const paidByInvoice = new Map<string, number>();

  for (const payment of payments) {
    if (!isCompletedPayment(payment.payment_status)) continue;
    paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount || 0));
  }

  let fixedBalances = 0;
  const now = new Date().toISOString();

  for (const invoice of invoiceRows) {
    const paid = roundMoney(paidByInvoice.get(invoice.id) || 0);
    const total = roundMoney(Number(invoice.total_amount || 0));
    const balance = roundMoney(Math.max(0, total - paid));
    const paymentStatus = balance <= 1 ? "paid" : paid > 0 ? "partial" : "unpaid";
    const changed =
      Math.abs(Number(invoice.paid_amount || 0) - paid) > 0.01 ||
      Math.abs(Number(invoice.balance_due || 0) - balance) > 0.01 ||
      String(invoice.payment_status || "").toLowerCase() !== paymentStatus;

    if (!changed) continue;

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          paid_amount: paid,
          balance_due: balance,
          payment_status: paymentStatus,
          updated_at: now,
        })
        .eq("id", invoice.id)
        .eq("company_id", companyId);

      if (updateError) {
        console.warn("daily-audit-agent invoice update skipped", {
          invoiceId: invoice.id,
          code: updateError.code,
          message: updateError.message,
        });
        continue;
      }
    }

    fixedBalances += 1;
  }

  return { scanned: invoiceRows.length, fixedBalances };
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
    .not("status", "eq", "cancelled");

  if (targetContractIds?.length) query = query.in("contract_id", targetContractIds);
  query = query.limit(limit);

  const { data: missingRows, error: missingError } = await query;
  if (missingError) throw missingError;

  const rows = (missingRows || []).filter((row: any) => row.contract_id && row.due_date);
  const contractIds = Array.from(
    new Set((missingRows || []).map((row: any) => row.contract_id).filter(Boolean))
  ).slice(0, limit);

  if (dryRun) {
    return { runs: contractIds.length, created: 0, skipped: Math.max(0, (missingRows || []).length - rows.length) };
  }

  const summary = { runs: 0, created: 0, skipped: 0 };

  for (const row of rows) {
    summary.runs += 1;
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
  }

  return summary;
}

async function findExistingInvoiceForMonth(supabase: any, companyId: string, contractId: string, monthStart: string) {
  const nextMonth = addMonths(monthStart, 1);
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("contract_id", contractId)
    .or(`and(due_date.gte.${monthStart},due_date.lt.${nextMonth}),and(due_date.is.null,invoice_date.gte.${monthStart},invoice_date.lt.${nextMonth})`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
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
      .select("contract_id, amount, payment_status")
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
    paymentJournalsCreated: 0,
    paymentJournalsRelinked: 0,
    paymentJournalFailures: 0,
    unbalancedJournalEntries: 0,
    errors: 0,
  });
}

function buildLocalSummary(dryRun: boolean, results: CompanyResult[], totals: AgentResult["totals"]) {
  const mode = dryRun ? "dry run" : "apply";
  return `${mode}: reviewed ${results.length} companies. invoice balances: ${totals.invoicesFixed}, contract totals: ${totals.contractsFixed}, missing invoices created: ${totals.invoiceBackfillCreated}, cancelled zero invoices: ${totals.cancelledZeroInvoicesCancelled}, payment journal fixes: ${totals.paymentJournalsCreated + totals.paymentJournalsRelinked}.`;
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
