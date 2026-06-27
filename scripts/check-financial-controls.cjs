const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  return text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const serviceRoleKey = readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(
      supabase
        .from(table)
        .select(columns)
        .range(from, from + PAGE_SIZE - 1)
    );

    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function isBetween(date, start, end) {
  const value = new Date(date).getTime();
  return value >= new Date(start).getTime() && value <= new Date(end).getTime();
}

function addIssue(collection, severity, code, message, details = {}) {
  collection.push({ severity, code, message, ...details });
}

async function checkIntegrity(companies, issues) {
  const reports = [];

  for (const company of companies) {
    const { data, error } = await supabase.rpc('get_financial_integrity_report', {
      p_company_id: company.id,
    });

    reports.push({
      company_id: company.id,
      company_name: company.name,
      status: error ? 'error' : data?.status,
      summary: data?.summary || null,
    });

    if (error || data?.status !== 'healthy') {
      addIssue(
        issues,
        'critical',
        'financial_integrity_not_healthy',
        `Financial integrity report is not healthy for ${company.name || company.id}.`,
        {
          company_id: company.id,
          company_name: company.name,
          error: error?.message || null,
          summary: data?.summary || null,
        }
      );
    }
  }

  return reports;
}

async function checkClosedPeriodGuard(issues, warnings) {
  let periods = [];
  try {
    periods = await selectAll(
      'accounting_periods',
      'id,company_id,period_name,status,start_date,end_date',
      (query) => query.in('status', ['closed', 'locked']).order('start_date', { ascending: false })
    );
  } catch (error) {
    addIssue(issues, 'critical', 'accounting_periods_unavailable', 'Cannot read accounting periods.', { error: error.message });
    return { closedPeriods: 0, sampledPeriods: 0 };
  }

  if (periods.length === 0) {
    addIssue(
      warnings,
      'warning',
      'no_closed_accounting_periods',
      'No closed or locked accounting periods exist. Month-end close is not operationally proven yet.'
    );
    return { closedPeriods: 0, sampledPeriods: 0 };
  }

  const sample = periods.slice(0, 10);
  for (const period of sample) {
    const { error } = await supabase.rpc('assert_financial_period_is_open', {
      p_company_id: period.company_id,
      p_entry_date: period.start_date,
    });

    if (!error) {
      addIssue(
        issues,
        'critical',
        'closed_period_guard_not_enforced',
        `Closed period guard did not reject ${period.period_name || period.id}.`,
        { company_id: period.company_id, period_id: period.id, start_date: period.start_date }
      );
    }
  }

  return { closedPeriods: periods.length, sampledPeriods: sample.length };
}

async function checkTransactionsInsideClosedPeriods(warnings) {
  let periods = [];
  try {
    periods = await selectAll(
      'accounting_periods',
      'id,company_id,period_name,status,start_date,end_date',
      (query) => query.in('status', ['closed', 'locked'])
    );
  } catch {
    return { checked: false, paymentViolations: 0, journalViolations: 0 };
  }

  if (periods.length === 0) {
    return { checked: true, paymentViolations: 0, journalViolations: 0 };
  }

  const payments = await selectAll(
    'payments',
    'id,company_id,payment_number,payment_date,payment_status',
    (query) => query.eq('payment_status', 'completed')
  );
  const journalEntries = await selectAll(
    'journal_entries',
    'id,company_id,entry_number,entry_date,status',
    (query) => query.eq('status', 'posted')
  );

  const paymentViolations = payments.filter((payment) => (
    periods.some((period) => (
      period.company_id === payment.company_id
      && payment.payment_date
      && isBetween(payment.payment_date, period.start_date, period.end_date)
    ))
  ));

  const journalViolations = journalEntries.filter((entry) => (
    periods.some((period) => (
      period.company_id === entry.company_id
      && entry.entry_date
      && isBetween(entry.entry_date, period.start_date, period.end_date)
    ))
  ));

  if (paymentViolations.length > 0 || journalViolations.length > 0) {
    addIssue(
      warnings,
      'warning',
      'historical_transactions_in_closed_periods',
      'Closed periods contain historical posted transactions. This is acceptable for imported history, but new writes are guarded.',
      {
        payment_count: paymentViolations.length,
        journal_entry_count: journalViolations.length,
      }
    );
  }

  return {
    checked: true,
    paymentViolations: paymentViolations.length,
    journalViolations: journalViolations.length,
  };
}

async function checkCancellationReversals(issues) {
  const cancelledPayments = await selectAll(
    'payments',
    'id,company_id,payment_number,payment_status,journal_entry_id',
    (query) => query.eq('payment_status', 'cancelled')
  );

  if (cancelledPayments.length === 0) {
    return { cancelledPayments: 0, checkedWithJournal: 0, missingReversals: 0 };
  }

  const paymentIds = cancelledPayments.map((payment) => payment.id);
  const referencedEntries = await selectAll(
    'journal_entries',
    'id,company_id,entry_number,status,reference_type,reference_id,reversal_entry_id',
    (query) => query.in('reference_id', paymentIds)
  );

  const entriesByPaymentId = new Map();
  for (const entry of referencedEntries) {
    if (!entriesByPaymentId.has(entry.reference_id)) entriesByPaymentId.set(entry.reference_id, []);
    entriesByPaymentId.get(entry.reference_id).push(entry);
  }

  const directEntryIds = cancelledPayments.map((payment) => payment.journal_entry_id).filter(Boolean);
  const directEntries = directEntryIds.length > 0
    ? await selectAll(
      'journal_entries',
      'id,company_id,entry_number,status,reference_type,reference_id,reversal_entry_id',
      (query) => query.in('id', directEntryIds)
    )
    : [];
  const directById = new Map(directEntries.map((entry) => [entry.id, entry]));

  let checkedWithJournal = 0;
  const missingReversals = [];

  for (const payment of cancelledPayments) {
    const entries = entriesByPaymentId.get(payment.id) || [];
    const original = directById.get(payment.journal_entry_id)
      || entries.find((entry) => entry.reference_type === 'payment');

    if (!original) continue;
    checkedWithJournal += 1;

    const hasReversal = Boolean(original.reversal_entry_id)
      || original.status === 'reversed'
      || entries.some((entry) => entry.reference_type === 'payment_reversal');

    if (!hasReversal) missingReversals.push(payment);
  }

  if (missingReversals.length > 0) {
    addIssue(
      issues,
      'critical',
      'cancelled_payment_missing_reversal',
      'Cancelled payments with accounting entries must have reversal entries.',
      {
        count: missingReversals.length,
        sample: missingReversals.slice(0, 10).map((payment) => ({
          payment_id: payment.id,
          payment_number: payment.payment_number,
        })),
      }
    );
  }

  return {
    cancelledPayments: cancelledPayments.length,
    checkedWithJournal,
    missingReversals: missingReversals.length,
  };
}

async function checkBankReconciliation(warnings) {
  let completedPayments = [];
  let completedBankTransactions = [];
  try {
    completedPayments = await selectAll(
      'payments',
      'id,payment_number,amount,payment_method,payment_status,reconciliation_status,reconciled_at',
      (query) => query.eq('payment_status', 'completed')
    );
  } catch (error) {
    addIssue(
      warnings,
      'warning',
      'payment_reconciliation_columns_unavailable',
      'Payment reconciliation columns are not fully available in the current schema.',
      { error: error.message }
    );
    return { bankPayments: 0, unreconciledBankPayments: 0 };
  }

  try {
    completedBankTransactions = await selectAll(
      'bank_transactions',
      'id,transaction_number,amount,transaction_type,status,reconciled,reconciled_at',
      (query) => query.eq('status', 'completed')
    );
  } catch (error) {
    addIssue(
      warnings,
      'warning',
      'bank_transaction_reconciliation_unavailable',
      'Bank transaction reconciliation columns are not fully available in the current schema.',
      { error: error.message }
    );
  }

  const bankMethods = new Set(['bank_transfer', 'check', 'cheque', 'credit_card', 'debit_card', 'card']);
  const bankPayments = completedPayments.filter((payment) => bankMethods.has(String(payment.payment_method || '').toLowerCase()));
  const unreconciled = bankPayments.filter((payment) => {
    const status = String(payment.reconciliation_status || '').toLowerCase();
    return status !== 'reconciled' && !payment.reconciled_at;
  });
  const unreconciledBankTransactions = completedBankTransactions.filter((transaction) => (
    !transaction.reconciled && !transaction.reconciled_at
  ));

  if (unreconciled.length > 0) {
    addIssue(
      warnings,
      'warning',
      'bank_payments_pending_reconciliation',
      'Some bank-like payments are still not reconciled. This is operational work, not a ledger imbalance.',
      {
        count: unreconciled.length,
        amount: Number(unreconciled.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2)),
      }
    );
  }

  if (unreconciledBankTransactions.length > 0) {
    addIssue(
      warnings,
      'warning',
      'bank_transactions_pending_reconciliation',
      'Some completed bank transactions are still not reconciled.',
      {
        count: unreconciledBankTransactions.length,
        amount: Number(unreconciledBankTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0).toFixed(2)),
      }
    );
  }

  return {
    bankPayments: bankPayments.length,
    unreconciledBankPayments: unreconciled.length,
    bankTransactions: completedBankTransactions.length,
    unreconciledBankTransactions: unreconciledBankTransactions.length,
  };
}

async function checkApprovalWorkflows(warnings) {
  let invoices = [];
  let financialApprovalRequests = [];
  try {
    invoices = await selectAll(
      'invoices',
      'id,invoice_number,status,total_amount,submitted_for_approval_at,approved_at,approved_by',
      (query) => query.in('status', ['pending_approval', 'approved'])
    );
  } catch (error) {
    addIssue(
      warnings,
      'warning',
      'invoice_approval_columns_unavailable',
      'Invoice approval columns are not fully available in the current schema.',
      { error: error.message }
    );
    return { checked: false, pendingApprovals: 0, approvalMetadataIssues: 0 };
  }

  try {
    financialApprovalRequests = await selectAll(
      'approval_requests',
      'id,request_number,source_type,status,total_amount,created_at,completed_at',
      (query) => query.in('source_type', ['payment', 'expense', 'purchase', 'contract', 'budget'])
    );
  } catch (error) {
    addIssue(
      warnings,
      'warning',
      'financial_approval_requests_unavailable',
      'Financial approval request tracking is not fully available in the current schema.',
      { error: error.message }
    );
  }

  const metadataIssues = invoices.filter((invoice) => (
    (invoice.status === 'pending_approval' && !invoice.submitted_for_approval_at)
    || (invoice.status === 'approved' && (!invoice.approved_at && !invoice.approved_by))
  ));
  const staleCutoff = Date.now() - (3 * 24 * 60 * 60 * 1000);
  const stalePendingFinancialApprovals = financialApprovalRequests.filter((request) => (
    request.status === 'pending'
    && request.created_at
    && new Date(request.created_at).getTime() < staleCutoff
  ));
  const completedMetadataIssues = financialApprovalRequests.filter((request) => (
    ['approved', 'rejected', 'cancelled'].includes(String(request.status))
    && !request.completed_at
  ));

  if (metadataIssues.length > 0) {
    addIssue(
      warnings,
      'warning',
      'invoice_approval_metadata_incomplete',
      'Some invoices have approval statuses without complete approval metadata.',
      {
        count: metadataIssues.length,
        sample: metadataIssues.slice(0, 10).map((invoice) => ({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
        })),
      }
    );
  }

  if (stalePendingFinancialApprovals.length > 0) {
    addIssue(
      warnings,
      'warning',
      'stale_financial_approvals',
      'Some financial approval requests have been pending for more than 3 days.',
      {
        count: stalePendingFinancialApprovals.length,
        amount: Number(stalePendingFinancialApprovals.reduce((sum, request) => sum + Number(request.total_amount || 0), 0).toFixed(2)),
        sample: stalePendingFinancialApprovals.slice(0, 10).map((request) => ({
          request_id: request.id,
          request_number: request.request_number,
          source_type: request.source_type,
        })),
      }
    );
  }

  if (completedMetadataIssues.length > 0) {
    addIssue(
      warnings,
      'warning',
      'financial_approval_completion_metadata_incomplete',
      'Some completed financial approval requests are missing completed_at metadata.',
      {
        count: completedMetadataIssues.length,
        sample: completedMetadataIssues.slice(0, 10).map((request) => ({
          request_id: request.id,
          request_number: request.request_number,
          status: request.status,
        })),
      }
    );
  }

  return {
    checked: true,
    pendingApprovals: invoices.filter((invoice) => invoice.status === 'pending_approval').length,
    approvedInvoices: invoices.filter((invoice) => invoice.status === 'approved').length,
    approvalMetadataIssues: metadataIssues.length,
    financialApprovalRequests: financialApprovalRequests.length,
    stalePendingFinancialApprovals: stalePendingFinancialApprovals.length,
    completedFinancialApprovalMetadataIssues: completedMetadataIssues.length,
  };
}

async function main() {
  const failOnCritical = process.argv.includes('--fail-on-critical');
  const issues = [];
  const warnings = [];

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id,name')
    .order('name');
  if (companiesError) throw companiesError;

  const bypassCheck = await supabase.rpc('financial_controls_bypass_enabled', {});
  if (bypassCheck.error || bypassCheck.data !== false) {
    addIssue(
      issues,
      'critical',
      'financial_bypass_enabled',
      'Financial controls bypass must be disabled outside controlled maintenance.',
      { error: bypassCheck.error?.message || null, value: bypassCheck.data }
    );
  }

  const results = {
    integrity: await checkIntegrity(companies || [], issues),
    closedPeriodGuard: await checkClosedPeriodGuard(issues, warnings),
    closedPeriodHistory: await checkTransactionsInsideClosedPeriods(warnings),
    cancellationReversals: await checkCancellationReversals(issues),
    bankReconciliation: await checkBankReconciliation(warnings),
    approvalWorkflows: await checkApprovalWorkflows(warnings),
  };

  const criticalIssues = issues.filter((issue) => issue.severity === 'critical');
  const report = {
    checked_at: new Date().toISOString(),
    status: criticalIssues.length === 0 ? 'passed' : 'failed',
    summary: {
      criticalIssues: criticalIssues.length,
      warnings: warnings.length,
    },
    results,
    issues,
    warnings,
  };

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `financial-controls-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    status: report.status,
    criticalIssues: criticalIssues.length,
    warnings: warnings.length,
    reportPath,
    issueCodes: issues.map((issue) => ({ code: issue.code, severity: issue.severity })),
    warningCodes: warnings.map((warning) => ({ code: warning.code, count: warning.count || undefined })),
  }, null, 2));

  if (failOnCritical && criticalIssues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
