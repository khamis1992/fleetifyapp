const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const CLOSED_STATUSES = new Set(['cancelled', 'canceled', 'voided', 'failed', 'reversed', 'refunded']);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, '')])
  );
}

const env = {
  ...readEnvFile(path.join(process.cwd(), '.env.local')),
  ...readEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    companyId: args['company-id'] || DEFAULT_COMPANY_ID,
    outputDir: args['output-dir'] || path.join(process.cwd(), 'reports'),
  };
}

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

const n = (value) => Number(Number(value || 0).toFixed(2));
const norm = (value) => String(value || '').toLowerCase();
const isClosed = (status) => CLOSED_STATUSES.has(norm(status));

function groupBy(rows, keySelector) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

function addIssue(issues, severity, code, message, rows, fields, limit = 20) {
  const sample = (rows || []).slice(0, limit).map((row) => (
    Object.fromEntries(fields.map((field) => [field, row[field] ?? null]))
  ));
  const totals = {};

  for (const field of fields) {
    const numericRows = (rows || []).filter((row) => (
      row[field] !== null
      && row[field] !== undefined
      && row[field] !== ''
      && Number.isFinite(Number(row[field]))
    ));

    if (numericRows.length) {
      totals[field] = sum(numericRows, (row) => row[field]);
    }
  }

  issues.push({
    severity,
    code,
    message,
    count: rows.length,
    totals,
    sample,
  });
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function sum(rows, selector) {
  return n(rows.reduce((total, row) => total + Number(selector(row) || 0), 0));
}

function formatTotals(totals) {
  const entries = Object.entries(totals || {});
  if (!entries.length) return '-';
  return entries
    .map(([key, value]) => `${key}: ${value}`)
    .join('<br>');
}

function markdown(result) {
  const lines = [];
  lines.push('# Alaraf Finance Deep Audit');
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Company: ${result.company.name || result.company.id}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Area | Count |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(result.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (result.issues.length === 0) {
    lines.push('No issues found.');
  } else {
    lines.push('| Severity | Code | Count | Totals |');
    lines.push('|---|---|---:|---|');
    for (const issue of result.issues) {
      lines.push(`| ${issue.severity} | ${issue.code} | ${issue.count} | ${formatTotals(issue.totals)} |`);
    }
  }
  lines.push('');
  lines.push('## Samples');
  lines.push('');
  for (const issue of result.issues) {
    lines.push(`### ${issue.code}`);
    lines.push(issue.message);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(issue.sample, null, 2));
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

async function run() {
  const { companyId, outputDir } = parseArgs();
  const [
    companies,
    accounts,
    journalEntries,
    journalLines,
    invoices,
    payments,
    contracts,
    bankTransactions,
    accountingPeriods,
  ] = await Promise.all([
    selectAll('companies', 'id,name,name_ar', (query) => query.eq('id', companyId)),
    selectAll('chart_of_accounts', 'id,account_code,account_name,account_type,account_level,is_header,is_active,current_balance', (query) => query.eq('company_id', companyId)),
    selectAll('journal_entries', 'id,entry_number,entry_date,status,total_debit,total_credit,reference_type,reference_id,reversal_entry_id', (query) => query.eq('company_id', companyId)),
    selectAll('journal_entry_lines', 'id,journal_entry_id,account_id,debit_amount,credit_amount,line_number,journal_entries!inner(company_id)', (query) => query.eq('journal_entries.company_id', companyId)),
    selectAll('invoices', 'id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,journal_entry_id,customer_id,contract_id,invoice_type', (query) => query.eq('company_id', companyId)),
    selectAll('payments', 'id,payment_number,amount,payment_date,payment_status,transaction_type,journal_entry_id,customer_id,contract_id,invoice_id,reference_number,payment_method', (query) => query.eq('company_id', companyId)),
    selectAll('contracts', 'id,contract_number,contract_amount,monthly_amount,total_paid,balance_due,status,payment_status,customer_id,start_date,end_date', (query) => query.eq('company_id', companyId)),
    selectAll('bank_transactions', 'id,transaction_number,amount,status,reconciled,reconciled_at,journal_entry_id,reference_number,transaction_type', (query) => query.eq('company_id', companyId)),
    selectAll('accounting_periods', 'id,period_name,status,start_date,end_date', (query) => query.eq('company_id', companyId)),
  ]);

  const company = companies[0] || { id: companyId, name: companyId };
  const issues = [];
  const accountById = byId(accounts);
  const journalById = byId(journalEntries);
  const invoiceById = byId(invoices);
  const contractById = byId(contracts);
  const linesByJournal = groupBy(journalLines, (line) => line.journal_entry_id);
  const invoiceRefs = new Map(journalEntries.filter((entry) => entry.reference_type === 'invoice' && entry.reference_id).map((entry) => [entry.reference_id, entry]));
  const paymentRefs = new Map(journalEntries.filter((entry) => entry.reference_type === 'payment' && entry.reference_id).map((entry) => [entry.reference_id, entry]));
  const entriesByReferenceId = groupBy(journalEntries.filter((entry) => entry.reference_id), (entry) => entry.reference_id);

  const headerUnbalanced = journalEntries.filter((entry) => Math.abs(n(entry.total_debit) - n(entry.total_credit)) > 0.01);
  if (headerUnbalanced.length) {
    addIssue(issues, 'critical', 'journal_header_unbalanced', 'Journal entry header debits and credits are not equal.', headerUnbalanced, ['id', 'entry_number', 'status', 'total_debit', 'total_credit']);
  }

  const entriesWithoutLines = journalEntries.filter((entry) => !linesByJournal.has(entry.id));
  if (entriesWithoutLines.length) {
    addIssue(issues, 'critical', 'journal_entry_without_lines', 'Journal entries must have line details.', entriesWithoutLines, ['id', 'entry_number', 'status', 'reference_type', 'reference_id']);
  }

  const lineUnbalanced = [];
  const lineHeaderMismatch = [];
  const singleLinePosted = [];
  for (const entry of journalEntries) {
    const lines = linesByJournal.get(entry.id) || [];
    if (entry.status === 'posted' && lines.length === 1) singleLinePosted.push({ ...entry, line_count: lines.length });
    if (!lines.length) continue;
    const debit = sum(lines, (line) => line.debit_amount);
    const credit = sum(lines, (line) => line.credit_amount);
    if (Math.abs(debit - credit) > 0.01) lineUnbalanced.push({ ...entry, line_debit: debit, line_credit: credit });
    if (Math.abs(debit - n(entry.total_debit)) > 0.01 || Math.abs(credit - n(entry.total_credit)) > 0.01) {
      lineHeaderMismatch.push({ ...entry, line_debit: debit, line_credit: credit });
    }
  }
  if (lineUnbalanced.length) {
    addIssue(issues, 'critical', 'journal_lines_unbalanced', 'Journal entry line debits and credits are not equal.', lineUnbalanced, ['id', 'entry_number', 'status', 'line_debit', 'line_credit']);
  }
  if (lineHeaderMismatch.length) {
    addIssue(issues, 'high', 'journal_header_line_total_mismatch', 'Journal entry header totals do not match line totals.', lineHeaderMismatch, ['id', 'entry_number', 'status', 'total_debit', 'total_credit', 'line_debit', 'line_credit']);
  }
  if (singleLinePosted.length) {
    addIssue(issues, 'high', 'posted_journal_single_line', 'Posted journal entries should have at least two lines.', singleLinePosted, ['id', 'entry_number', 'reference_type', 'reference_id', 'line_count']);
  }

  const badLineAccounts = journalLines
    .map((line) => ({ ...line, account: accountById.get(line.account_id) || null }))
    .filter((line) => !line.account || line.account.is_header || line.account.is_active === false);
  if (badLineAccounts.length) {
    addIssue(issues, 'critical', 'journal_line_invalid_account', 'Journal lines must post to active non-header accounts.', badLineAccounts, ['id', 'journal_entry_id', 'account_id']);
  }

  const doubleOrZeroLines = journalLines.filter((line) => {
    const debit = n(line.debit_amount);
    const credit = n(line.credit_amount);
    return (debit > 0 && credit > 0) || (debit === 0 && credit === 0);
  });
  if (doubleOrZeroLines.length) {
    addIssue(issues, 'high', 'journal_line_double_or_zero_sided', 'A journal line should have debit or credit, not both and not neither.', doubleOrZeroLines, ['id', 'journal_entry_id', 'account_id', 'debit_amount', 'credit_amount']);
  }

  const activeInvoices = invoices.filter((invoice) => n(invoice.total_amount) > 0 && !isClosed(invoice.status) && !isClosed(invoice.payment_status));
  const invoiceNeedingCreate = activeInvoices.filter((invoice) => !invoice.journal_entry_id && !invoiceRefs.has(invoice.id));
  const invoiceNeedingRelink = activeInvoices.filter((invoice) => !invoice.journal_entry_id && invoiceRefs.has(invoice.id));
  const invoiceBrokenJournal = activeInvoices.filter((invoice) => invoice.journal_entry_id && !journalById.has(invoice.journal_entry_id));
  if (invoiceNeedingCreate.length) {
    addIssue(issues, 'critical', 'active_invoice_missing_journal', 'Active invoices must have an accounting journal entry.', invoiceNeedingCreate, ['id', 'invoice_number', 'total_amount', 'status', 'payment_status']);
  }
  if (invoiceNeedingRelink.length) {
    addIssue(issues, 'high', 'active_invoice_needs_journal_relink', 'Active invoices have reference journal entries but missing direct link.', invoiceNeedingRelink, ['id', 'invoice_number', 'total_amount']);
  }
  if (invoiceBrokenJournal.length) {
    addIssue(issues, 'critical', 'active_invoice_broken_journal_link', 'Invoice journal_entry_id points to a missing journal entry.', invoiceBrokenJournal, ['id', 'invoice_number', 'journal_entry_id']);
  }

  const completedReceiptPayments = payments.filter((payment) => (
    n(payment.amount) > 0
    && norm(payment.payment_status) === 'completed'
    && norm(payment.transaction_type || 'receipt') === 'receipt'
  ));
  const paymentNeedingCreate = completedReceiptPayments.filter((payment) => !payment.journal_entry_id && !paymentRefs.has(payment.id));
  const paymentNeedingRelink = completedReceiptPayments.filter((payment) => !payment.journal_entry_id && paymentRefs.has(payment.id));
  const paymentBrokenJournal = completedReceiptPayments.filter((payment) => payment.journal_entry_id && !journalById.has(payment.journal_entry_id));
  if (paymentNeedingCreate.length) {
    addIssue(issues, 'critical', 'completed_payment_missing_journal', 'Completed receipt payments must have accounting journal entries.', paymentNeedingCreate, ['id', 'payment_number', 'amount', 'payment_date', 'invoice_id', 'contract_id']);
  }
  if (paymentNeedingRelink.length) {
    addIssue(issues, 'high', 'completed_payment_needs_journal_relink', 'Completed payments have reference journals but missing direct journal link.', paymentNeedingRelink, ['id', 'payment_number', 'amount', 'payment_date']);
  }
  if (paymentBrokenJournal.length) {
    addIssue(issues, 'critical', 'completed_payment_broken_journal_link', 'Payment journal_entry_id points to a missing journal entry.', paymentBrokenJournal, ['id', 'payment_number', 'journal_entry_id']);
  }

  const paymentJournalMismatch = completedReceiptPayments.filter((payment) => {
    const entry = payment.journal_entry_id ? journalById.get(payment.journal_entry_id) : paymentRefs.get(payment.id);
    return entry && !(entry.reference_type === 'payment' && entry.reference_id === payment.id);
  });
  if (paymentJournalMismatch.length) {
    addIssue(issues, 'medium', 'completed_payment_journal_reference_mismatch', 'Payment journal exists but does not reference the payment id.', paymentJournalMismatch, ['id', 'payment_number', 'journal_entry_id']);
  }

  const duplicatePaymentGroups = Array.from(groupBy(completedReceiptPayments, (payment) => [
    payment.customer_id || '',
    payment.contract_id || '',
    payment.invoice_id || '',
    payment.payment_date || '',
    n(payment.amount),
    norm(payment.transaction_type || 'receipt'),
  ].join('|')).values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      count: group.length,
      payment_numbers: group.map((payment) => payment.payment_number).join(', '),
      amount: n(group[0].amount),
      payment_date: group[0].payment_date,
      invoice_id: group[0].invoice_id,
      contract_id: group[0].contract_id,
      customer_id: group[0].customer_id,
    }));
  if (duplicatePaymentGroups.length) {
    addIssue(issues, 'high', 'duplicate_completed_receipt_payment_group', 'Exact duplicate completed receipt payments were found.', duplicatePaymentGroups, ['count', 'payment_numbers', 'amount', 'payment_date', 'invoice_id', 'contract_id']);
  }

  const paymentsWithCrossDocumentMismatch = completedReceiptPayments.filter((payment) => {
    const invoice = payment.invoice_id ? invoiceById.get(payment.invoice_id) : null;
    const contract = payment.contract_id ? contractById.get(payment.contract_id) : null;
    return (
      (invoice && (
        (payment.customer_id && invoice.customer_id && payment.customer_id !== invoice.customer_id)
        || (payment.contract_id && invoice.contract_id && payment.contract_id !== invoice.contract_id)
      ))
      || (contract && payment.customer_id && contract.customer_id && payment.customer_id !== contract.customer_id)
    );
  });
  if (paymentsWithCrossDocumentMismatch.length) {
    addIssue(issues, 'critical', 'payment_customer_contract_invoice_mismatch', 'Payment customer/contract/invoice references do not agree.', paymentsWithCrossDocumentMismatch, ['id', 'payment_number', 'customer_id', 'contract_id', 'invoice_id']);
  }

  const paymentsByInvoice = groupBy(completedReceiptPayments.filter((payment) => payment.invoice_id), (payment) => payment.invoice_id);
  const invoiceAmountMismatch = activeInvoices.map((invoice) => {
    const linkedPayments = paymentsByInvoice.get(invoice.id) || [];
    const linkedPaid = sum(linkedPayments, (payment) => payment.amount);
    const expectedBalance = n(Math.max(n(invoice.total_amount) - linkedPaid, 0));
    return {
      ...invoice,
      linked_paid: linkedPaid,
      expected_balance: expectedBalance,
    };
  }).filter((invoice) => (
    Math.abs(invoice.linked_paid - n(invoice.paid_amount)) > 0.01
    || Math.abs(invoice.expected_balance - n(invoice.balance_due)) > 0.01
    || invoice.linked_paid - n(invoice.total_amount) > 0.01
  ));
  if (invoiceAmountMismatch.length) {
    addIssue(issues, 'critical', 'invoice_payment_amount_mismatch', 'Invoice paid/balance values do not match completed linked payments.', invoiceAmountMismatch, ['id', 'invoice_number', 'total_amount', 'paid_amount', 'linked_paid', 'balance_due', 'expected_balance', 'payment_status']);
  }

  const invoiceStatusMismatch = activeInvoices.filter((invoice) => {
    const paid = n(invoice.paid_amount);
    const total = n(invoice.total_amount);
    const status = norm(invoice.payment_status);
    return (
      (paid >= total - 0.01 && status !== 'paid')
      || (paid <= 0.01 && status === 'paid')
      || (paid > 0.01 && paid < total - 0.01 && !['partial', 'partially_paid'].includes(status))
    );
  });
  if (invoiceStatusMismatch.length) {
    addIssue(issues, 'medium', 'invoice_payment_status_mismatch', 'Invoice payment_status does not match paid amount.', invoiceStatusMismatch, ['id', 'invoice_number', 'total_amount', 'paid_amount', 'balance_due', 'payment_status', 'status']);
  }

  const paymentsByContract = groupBy(completedReceiptPayments.filter((payment) => payment.contract_id), (payment) => payment.contract_id);
  const activeContracts = contracts.filter((contract) => !isClosed(contract.status));
  const contractAmountMismatch = activeContracts.map((contract) => {
    const linkedPayments = paymentsByContract.get(contract.id) || [];
    const linkedPaid = sum(linkedPayments, (payment) => payment.amount);
    const expectedBalance = n(Math.max(n(contract.contract_amount) - linkedPaid, 0));
    return {
      ...contract,
      linked_paid: linkedPaid,
      expected_balance: expectedBalance,
    };
  }).filter((contract) => (
    Math.abs(contract.linked_paid - n(contract.total_paid)) > 0.01
    || Math.abs(contract.expected_balance - n(contract.balance_due)) > 0.01
  ));
  if (contractAmountMismatch.length) {
    addIssue(issues, 'critical', 'contract_payment_amount_mismatch', 'Contract total_paid/balance_due do not match completed linked payments.', contractAmountMismatch, ['id', 'contract_number', 'contract_amount', 'total_paid', 'linked_paid', 'balance_due', 'expected_balance', 'status']);
  }

  const contractMissingAmountWithPayments = activeContracts
    .map((contract) => ({
      ...contract,
      linked_paid: sum(paymentsByContract.get(contract.id) || [], (payment) => payment.amount),
    }))
    .filter((contract) => n(contract.contract_amount) <= 0 && (n(contract.total_paid) > 0 || contract.linked_paid > 0));
  if (contractMissingAmountWithPayments.length) {
    addIssue(issues, 'medium', 'contract_amount_zero_with_payments', 'Contracts with payments should not have zero contract_amount unless explicitly imported as legacy exceptions.', contractMissingAmountWithPayments, ['id', 'contract_number', 'contract_amount', 'total_paid', 'linked_paid', 'balance_due', 'status']);
  }

  const contractOverpaid = activeContracts
    .map((contract) => ({
      ...contract,
      linked_paid: sum(paymentsByContract.get(contract.id) || [], (payment) => payment.amount),
    }))
    .filter((contract) => n(contract.contract_amount) > 0 && contract.linked_paid > n(contract.contract_amount) + 0.01);
  if (contractOverpaid.length) {
    addIssue(issues, 'medium', 'contract_overpaid_against_contract_amount', 'Completed payments exceed contract_amount. This may be valid only if late fees/other charges are intentionally included.', contractOverpaid, ['id', 'contract_number', 'contract_amount', 'total_paid', 'linked_paid', 'balance_due', 'status']);
  }

  const cancelledPayments = payments.filter((payment) => norm(payment.payment_status) === 'cancelled');
  const cancelledMissingReversal = [];
  for (const payment of cancelledPayments) {
    const entries = entriesByReferenceId.get(payment.id) || [];
    const original = (payment.journal_entry_id && journalById.get(payment.journal_entry_id))
      || entries.find((entry) => entry.reference_type === 'payment');
    if (!original) continue;
    const hasReversal = Boolean(original.reversal_entry_id)
      || original.status === 'reversed'
      || entries.some((entry) => entry.reference_type === 'payment_reversal');
    if (!hasReversal) {
      cancelledMissingReversal.push({ ...payment, original_journal_entry_id: original.id, original_entry_number: original.entry_number });
    }
  }
  if (cancelledMissingReversal.length) {
    addIssue(issues, 'critical', 'cancelled_payment_missing_reversal', 'Cancelled payments with accounting entries must have reversal entries.', cancelledMissingReversal, ['id', 'payment_number', 'amount', 'payment_date', 'original_journal_entry_id', 'original_entry_number']);
  }

  const completedBankTransactions = bankTransactions.filter((transaction) => norm(transaction.status) === 'completed');
  const bankTransactionBrokenJournal = completedBankTransactions.filter((transaction) => transaction.journal_entry_id && !journalById.has(transaction.journal_entry_id));
  if (bankTransactionBrokenJournal.length) {
    addIssue(issues, 'high', 'bank_transaction_broken_journal_link', 'Bank transaction journal_entry_id points to a missing journal entry.', bankTransactionBrokenJournal, ['id', 'transaction_number', 'amount', 'journal_entry_id']);
  }

  const closedPeriods = accountingPeriods.filter((period) => ['closed', 'locked'].includes(norm(period.status)));

  const summary = {
    accounts: accounts.length,
    journalEntries: journalEntries.length,
    journalLines: journalLines.length,
    invoices: invoices.length,
    activeInvoices: activeInvoices.length,
    payments: payments.length,
    completedReceiptPayments: completedReceiptPayments.length,
    contracts: contracts.length,
    activeContracts: activeContracts.length,
    bankTransactions: bankTransactions.length,
    closedAccountingPeriods: closedPeriods.length,
    issueCount: issues.length,
    criticalIssues: issues.filter((issue) => issue.severity === 'critical').length,
    highIssues: issues.filter((issue) => issue.severity === 'high').length,
    mediumIssues: issues.filter((issue) => issue.severity === 'medium').length,
  };

  const result = {
    generatedAt: new Date().toISOString(),
    company,
    status: issues.length === 0 ? 'healthy' : 'issues_found',
    summary,
    issues,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = result.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `alaraf-finance-deep-audit-${companyId}-${stamp}.json`);
  const mdPath = path.join(outputDir, `alaraf-finance-deep-audit-${companyId}-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(mdPath, markdown(result), 'utf8');

  console.log(JSON.stringify({
    status: result.status,
    summary,
    issues: issues.map((issue) => ({ severity: issue.severity, code: issue.code, count: issue.count })),
    jsonPath,
    mdPath,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
