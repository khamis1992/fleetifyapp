const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const CLOSED_STATUSES = new Set(['cancelled', 'canceled', 'failed', 'voided', 'reversed', 'refunded']);

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
  console.error('Missing VITE_SUPABASE_URL or service role key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
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
    const query = buildQuery(
      supabase
        .from(table)
        .select(columns)
        .range(from, from + PAGE_SIZE - 1)
    );
    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

const normalizeStatus = (value) => String(value || '').toLowerCase();
const isClosed = (value) => CLOSED_STATUSES.has(normalizeStatus(value));
const amount = (value) => Number((Number(value || 0)).toFixed(2));

function groupBy(rows, getKey) {
  const groups = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function classifyDocument(document, referenceById) {
  const directJournalId = document.journal_entry_id || null;
  const referenceJournal = referenceById.get(document.id) || null;
  return {
    hasDirectJournal: Boolean(directJournalId),
    hasReferenceJournal: Boolean(referenceJournal),
    journalEntryId: directJournalId || referenceJournal?.id || null,
    directJournalId,
    referenceJournalId: referenceJournal?.id || null,
  };
}

function toSample(rows, fields, max = 20) {
  return rows.slice(0, max).map((row) => (
    Object.fromEntries(fields.map((field) => [field, row[field] ?? null]))
  ));
}

function markdownReport(result) {
  const lines = [];
  lines.push(`# Finance Integrity Diagnostics`);
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Company: ${result.companyId}`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Check | Count |`);
  lines.push(`|---|---:|`);
  lines.push(`| Journal entries | ${result.summary.journalEntriesTotal} |`);
  lines.push(`| Journal lines | ${result.summary.journalLinesTotal} |`);
  lines.push(`| Header-unbalanced journal entries | ${result.summary.headerUnbalancedCount} |`);
  lines.push(`| Line-unbalanced journal entries | ${result.summary.lineUnbalancedCount} |`);
  lines.push(`| Journal entries without lines | ${result.summary.entriesWithoutLinesCount} |`);
  lines.push(`| Active invoices needing journal creation | ${result.summary.activeInvoicesNeedingJournalCreation} |`);
  lines.push(`| Active invoices needing field relink only | ${result.summary.activeInvoicesNeedingRelinkOnly} |`);
  lines.push(`| Completed receipt payments needing journal creation | ${result.summary.completedReceiptPaymentsNeedingJournalCreation} |`);
  lines.push(`| Completed receipt payments needing field relink only | ${result.summary.completedReceiptPaymentsNeedingRelinkOnly} |`);
  lines.push(`| Exact duplicate payment groups | ${result.summary.exactDuplicatePaymentGroups} |`);
  lines.push('');
  lines.push(`## Account Candidates`);
  lines.push('');
  lines.push(`- Cash/bank account: ${result.accountCandidates.cashOrBank?.account_code || '-'} ${result.accountCandidates.cashOrBank?.account_name || ''}`);
  lines.push(`- Receivable account: ${result.accountCandidates.receivable?.account_code || '-'} ${result.accountCandidates.receivable?.account_name || ''}`);
  lines.push(`- Revenue account: ${result.accountCandidates.revenue?.account_code || '-'} ${result.accountCandidates.revenue?.account_name || ''}`);
  lines.push('');
  lines.push(`## Samples`);
  lines.push('');
  lines.push(`### Invoices Needing Journal Creation`);
  lines.push('```json');
  lines.push(JSON.stringify(result.samples.invoicesNeedingJournalCreation, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(`### Payments Needing Journal Creation`);
  lines.push('```json');
  lines.push(JSON.stringify(result.samples.paymentsNeedingJournalCreation, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(`### Exact Duplicate Payment Groups`);
  lines.push('```json');
  lines.push(JSON.stringify(result.samples.exactDuplicatePaymentGroups, null, 2));
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

async function findAccount(companyId, preferredCodes, fallbackType) {
  const { data: preferred, error: preferredError } = await supabase
    .from('chart_of_accounts')
    .select('id,account_code,account_name,account_type')
    .eq('company_id', companyId)
    .in('account_code', preferredCodes)
    .eq('is_header', false)
    .eq('is_active', true);

  if (preferredError) throw preferredError;
  const byCode = new Map((preferred || []).map((account) => [account.account_code, account]));
  for (const code of preferredCodes) {
    if (byCode.has(code)) return byCode.get(code);
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('chart_of_accounts')
    .select('id,account_code,account_name,account_type')
    .eq('company_id', companyId)
    .eq('account_type', fallbackType)
    .eq('is_header', false)
    .eq('is_active', true)
    .order('account_code')
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return fallback || null;
}

async function run() {
  const { companyId, outputDir } = parseArgs();

  const [
    journalEntries,
    journalLines,
    invoices,
    payments,
    invoiceReferences,
    paymentReferences,
    cashOrBank,
    receivable,
    revenue,
  ] = await Promise.all([
    selectAll('journal_entries', 'id,entry_number,total_debit,total_credit,status,reference_type,reference_id', (query) => query.eq('company_id', companyId)),
    selectAll('journal_entry_lines', 'id,journal_entry_id,debit_amount,credit_amount,line_number,journal_entries!inner(company_id)', (query) => query.eq('journal_entries.company_id', companyId)),
    selectAll('invoices', 'id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,journal_entry_id,customer_id,contract_id,invoice_type', (query) => query.eq('company_id', companyId)),
    selectAll('payments', 'id,payment_number,amount,payment_date,payment_status,transaction_type,journal_entry_id,customer_id,contract_id,invoice_id,reference_number', (query) => query.eq('company_id', companyId)),
    selectAll('journal_entries', 'id,reference_id,reference_type,status', (query) => query.eq('company_id', companyId).eq('reference_type', 'invoice')),
    selectAll('journal_entries', 'id,reference_id,reference_type,status', (query) => query.eq('company_id', companyId).eq('reference_type', 'payment')),
    findAccount(companyId, ['11151', '11111', '11101', '11201', '1120101', '1010'], 'assets'),
    findAccount(companyId, ['11211', '11212', '1130301', '11301', '12101', '1201'], 'assets'),
    findAccount(companyId, ['4101', '41101', '4110', '4123'], 'revenue'),
  ]);

  const invoiceReferenceById = new Map(invoiceReferences.map((entry) => [entry.reference_id, entry]));
  const paymentReferenceById = new Map(paymentReferences.map((entry) => [entry.reference_id, entry]));

  const lineGroups = groupBy(journalLines, (line) => line.journal_entry_id);
  const headerUnbalanced = journalEntries.filter((entry) => Math.abs(amount(entry.total_debit) - amount(entry.total_credit)) > 0.005);
  const entriesWithoutLines = journalEntries.filter((entry) => !lineGroups.has(entry.id));
  const lineUnbalanced = journalEntries.filter((entry) => {
    const lines = lineGroups.get(entry.id) || [];
    if (!lines.length) return false;
    const debit = lines.reduce((sum, line) => sum + amount(line.debit_amount), 0);
    const credit = lines.reduce((sum, line) => sum + amount(line.credit_amount), 0);
    return Math.abs(debit - credit) > 0.005;
  });

  const activeInvoices = invoices.filter((invoice) => (
    amount(invoice.total_amount) > 0
    && !isClosed(invoice.status)
    && !isClosed(invoice.payment_status)
  ));

  const invoiceClassifications = activeInvoices.map((invoice) => ({
    ...invoice,
    ...classifyDocument(invoice, invoiceReferenceById),
  }));

  const invoicesNeedingJournalCreation = invoiceClassifications.filter((invoice) => !invoice.hasDirectJournal && !invoice.hasReferenceJournal);
  const invoicesNeedingRelinkOnly = invoiceClassifications.filter((invoice) => !invoice.hasDirectJournal && invoice.hasReferenceJournal);

  const completedReceiptPayments = payments.filter((payment) => (
    amount(payment.amount) > 0
    && normalizeStatus(payment.payment_status) === 'completed'
    && normalizeStatus(payment.transaction_type || 'receipt') === 'receipt'
  ));

  const paymentClassifications = completedReceiptPayments.map((payment) => ({
    ...payment,
    ...classifyDocument(payment, paymentReferenceById),
  }));

  const paymentsNeedingJournalCreation = paymentClassifications.filter((payment) => !payment.hasDirectJournal && !payment.hasReferenceJournal);
  const paymentsNeedingRelinkOnly = paymentClassifications.filter((payment) => !payment.hasDirectJournal && payment.hasReferenceJournal);

  const exactDuplicatePaymentGroups = Array.from(
    groupBy(
      completedReceiptPayments,
      (payment) => [
        payment.company_id || companyId,
        payment.customer_id || '',
        payment.contract_id || '',
        payment.invoice_id || '',
        payment.payment_date || '',
        amount(payment.amount).toFixed(2),
        payment.reference_number || '',
      ].join('|')
    )
  )
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, count: group.length, payments: toSample(group, ['id', 'payment_number', 'amount', 'payment_date', 'invoice_id', 'reference_number'], 10) }));

  const result = {
    generatedAt: new Date().toISOString(),
    companyId,
    summary: {
      journalEntriesTotal: journalEntries.length,
      journalLinesTotal: journalLines.length,
      headerUnbalancedCount: headerUnbalanced.length,
      lineUnbalancedCount: lineUnbalanced.length,
      entriesWithoutLinesCount: entriesWithoutLines.length,
      invoicesTotal: invoices.length,
      activeInvoices: activeInvoices.length,
      activeInvoicesNeedingJournalCreation: invoicesNeedingJournalCreation.length,
      activeInvoicesNeedingRelinkOnly: invoicesNeedingRelinkOnly.length,
      paymentsTotal: payments.length,
      completedReceiptPayments: completedReceiptPayments.length,
      completedReceiptPaymentsNeedingJournalCreation: paymentsNeedingJournalCreation.length,
      completedReceiptPaymentsNeedingRelinkOnly: paymentsNeedingRelinkOnly.length,
      exactDuplicatePaymentGroups: exactDuplicatePaymentGroups.length,
    },
    accountCandidates: {
      cashOrBank,
      receivable,
      revenue,
    },
    samples: {
      invoicesNeedingJournalCreation: toSample(invoicesNeedingJournalCreation, ['id', 'invoice_number', 'invoice_date', 'due_date', 'total_amount', 'status', 'payment_status', 'customer_id', 'contract_id']),
      invoicesNeedingRelinkOnly: toSample(invoicesNeedingRelinkOnly, ['id', 'invoice_number', 'journalEntryId', 'referenceJournalId']),
      paymentsNeedingJournalCreation: toSample(paymentsNeedingJournalCreation, ['id', 'payment_number', 'amount', 'payment_date', 'customer_id', 'contract_id', 'invoice_id', 'reference_number']),
      paymentsNeedingRelinkOnly: toSample(paymentsNeedingRelinkOnly, ['id', 'payment_number', 'journalEntryId', 'referenceJournalId']),
      exactDuplicatePaymentGroups,
      headerUnbalanced: toSample(headerUnbalanced, ['id', 'entry_number', 'total_debit', 'total_credit', 'status']),
      lineUnbalanced: toSample(lineUnbalanced, ['id', 'entry_number', 'status']),
      entriesWithoutLines: toSample(entriesWithoutLines, ['id', 'entry_number', 'status', 'reference_type', 'reference_id']),
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = result.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `finance-integrity-diagnostics-${companyId}-${stamp}.json`);
  const mdPath = path.join(outputDir, `finance-integrity-diagnostics-${companyId}-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(mdPath, markdownReport(result), 'utf8');

  console.log(JSON.stringify({
    jsonPath,
    mdPath,
    summary: result.summary,
    accountCandidates: result.accountCandidates,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
