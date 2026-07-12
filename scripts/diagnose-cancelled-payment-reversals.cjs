const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;

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
const monthOf = (value) => String(value || '').slice(0, 7) || '(blank)';

function groupSummary(rows, keySelector) {
  const groups = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    const current = groups.get(key) || { key, count: 0, amount: 0 };
    current.count += 1;
    current.amount = n(current.amount + n(row.amount));
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function paymentFamily(paymentNumber) {
  const value = String(paymentNumber || '');
  if (value.startsWith('PAY-IMP-')) return 'PAY-IMP';
  if (value.startsWith('PAY-MIG-')) return 'PAY-MIG';
  if (value.startsWith('REC-')) return 'REC';
  if (value.startsWith('PAY-')) return 'PAY-other';
  return value.split('-')[0] || '(blank)';
}

function entryFamily(entryNumber) {
  const value = String(entryNumber || '');
  if (value.startsWith('JE-PAY-BF-')) return 'JE-PAY-BF';
  if (value.startsWith('JE-PAY-REC-')) return 'JE-PAY-REC';
  if (value.startsWith('JE-PAY-')) return 'JE-PAY-other';
  return value.split('-').slice(0, 2).join('-') || '(blank)';
}

function classifyLikelyCause(row) {
  const paymentNumber = String(row.payment_number || '');
  const entryNumber = String(row.original_entry_number || '');
  const processingNotes = String(row.processing_notes || '');
  const referenceNumber = String(row.reference_number || '');
  const notes = String(row.notes || '');

  if (processingNotes.startsWith('Contract health repair:')) {
    return 'contract_health_out_of_period_cancellation_without_reversal';
  }

  if (paymentNumber.startsWith('PAY-IMP-') || paymentNumber.startsWith('PAY-MIG-') || entryNumber.startsWith('JE-PAY-BF-')) {
    return 'historical_import_cleanup_or_backfill';
  }

  if (referenceNumber.startsWith('xls:') || notes.includes('Excel')) {
    return 'excel_import_payment';
  }

  if (processingNotes.includes('إلغاء') || processingNotes.includes('cancel')) {
    return 'central_cancel_attempt_without_atomic_reversal';
  }

  return 'unknown_direct_status_change';
}

function markdown(result) {
  const lines = [];
  lines.push('# Cancelled Payments Missing Reversal Diagnosis');
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Company: ${result.companyId}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(result.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  for (const [title, rows] of Object.entries(result.groups)) {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push('| Key | Count | Amount |');
    lines.push('|---|---:|---:|');
    for (const row of rows) {
      lines.push(`| ${row.key} | ${row.count} | ${row.amount} |`);
    }
    lines.push('');
  }

  lines.push('## Samples');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(result.samples, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Likely Cause');
  lines.push('');
  lines.push(result.likelyCause);
  lines.push('');

  return lines.join('\n');
}

async function run() {
  const { companyId, outputDir } = parseArgs();

  const [payments, journalEntries, contracts, invoices] = await Promise.all([
    selectAll(
      'payments',
      'id,payment_number,amount,payment_date,payment_status,transaction_type,journal_entry_id,customer_id,contract_id,invoice_id,reference_number,payment_method,notes,processing_notes,created_at,updated_at,created_by',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'journal_entries',
      'id,entry_number,entry_date,status,total_debit,total_credit,reference_type,reference_id,reversal_entry_id,created_at,updated_at,description',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'contracts',
      'id,contract_number,customer_id,start_date,end_date,status,contract_amount,total_paid,balance_due',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'invoices',
      'id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,contract_id,customer_id',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const journalById = new Map(journalEntries.map((entry) => [entry.id, entry]));
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const invoiceByNumber = new Map(invoices.map((invoice) => [invoice.invoice_number, invoice]));
  const journalsByReference = new Map();

  for (const entry of journalEntries) {
    const referenceId = entry.reference_id || '';
    if (!referenceId) continue;
    if (!journalsByReference.has(referenceId)) journalsByReference.set(referenceId, []);
    journalsByReference.get(referenceId).push(entry);
  }

  const cancelledPayments = payments.filter((payment) => norm(payment.payment_status) === 'cancelled');
  const missingReversals = [];
  const cancelledWithReversal = [];
  const cancelledWithoutJournal = [];

  for (const payment of cancelledPayments) {
    const directEntry = payment.journal_entry_id ? journalById.get(payment.journal_entry_id) : null;
    const referencedEntries = journalsByReference.get(payment.id) || [];
    const original = directEntry || referencedEntries.find((entry) => entry.reference_type === 'payment');

    if (!original) {
      cancelledWithoutJournal.push(payment);
      continue;
    }

    const hasReversal = Boolean(original.reversal_entry_id)
      || norm(original.status) === 'reversed'
      || referencedEntries.some((entry) => entry.reference_type === 'payment_reversal');

    const row = {
      ...payment,
      original_journal_entry_id: original.id,
      original_entry_number: original.entry_number,
      original_entry_status: original.status,
      original_entry_date: original.entry_date,
      original_reference_type: original.reference_type,
      likely_cause: '',
    };
    row.likely_cause = classifyLikelyCause(row);

    if (hasReversal) {
      cancelledWithReversal.push(row);
    } else {
      missingReversals.push(row);
    }
  }

  const originalJournalIds = missingReversals.map((row) => row.original_journal_entry_id);
  const journalLines = originalJournalIds.length > 0
    ? await selectAll(
      'journal_entry_lines',
      'id,journal_entry_id,account_id,debit_amount,credit_amount,line_description,line_number',
      (query) => query.in('journal_entry_id', originalJournalIds)
    )
    : [];
  const accountIds = Array.from(new Set(journalLines.map((line) => line.account_id).filter(Boolean)));
  const accounts = accountIds.length > 0
    ? await selectAll(
      'chart_of_accounts',
      'id,account_code,account_name,account_type,balance_type',
      (query) => query.in('id', accountIds)
    )
    : [];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const linesByJournalId = new Map();
  for (const line of journalLines) {
    if (!linesByJournalId.has(line.journal_entry_id)) linesByJournalId.set(line.journal_entry_id, []);
    linesByJournalId.get(line.journal_entry_id).push(line);
  }

  const totalAmount = n(missingReversals.reduce((sum, row) => sum + n(row.amount), 0));
  const groups = {
    by_likely_cause: groupSummary(missingReversals, (row) => row.likely_cause),
    by_payment_number_family: groupSummary(missingReversals, (row) => paymentFamily(row.payment_number)),
    by_original_journal_family: groupSummary(missingReversals, (row) => entryFamily(row.original_entry_number)),
    by_created_month: groupSummary(missingReversals, (row) => monthOf(row.created_at)),
    by_updated_month: groupSummary(missingReversals, (row) => monthOf(row.updated_at)),
    by_current_invoice_link: groupSummary(missingReversals, (row) => row.invoice_id ? 'still_linked_to_invoice' : 'invoice_id_null'),
    by_reference_hint: groupSummary(missingReversals, (row) => {
      if (String(row.reference_number || '').startsWith('xls:')) return 'xls_reference';
      if (String(row.notes || '').includes('Excel')) return 'notes_excel';
      return 'no_excel_hint';
    }),
    by_processing_note: groupSummary(missingReversals, (row) => row.processing_notes ? 'has_processing_notes' : 'no_processing_notes'),
  };

  const result = {
    generatedAt: new Date().toISOString(),
    companyId,
    summary: {
      cancelled_payments: cancelledPayments.length,
      cancelled_with_journal_and_reversal: cancelledWithReversal.length,
      cancelled_without_journal: cancelledWithoutJournal.length,
      cancelled_with_journal_missing_reversal: missingReversals.length,
      missing_reversal_amount: totalAmount,
    },
    groups,
    samples: missingReversals.slice(0, 25).map((row) => {
      const contract = contractById.get(row.contract_id);
      const notedInvoiceNumber = String(row.processing_notes || '').match(/INV-[A-Z0-9]+(?:-[A-Z0-9]+)*/)?.[0] || null;
      const invoice = row.invoice_id
        ? invoiceById.get(row.invoice_id)
        : notedInvoiceNumber
          ? invoiceByNumber.get(notedInvoiceNumber)
          : null;
      const coveringContracts = contracts
        .filter((candidate) => (
          candidate.customer_id === row.customer_id
          && row.payment_date
          && row.payment_date >= candidate.start_date
          && row.payment_date <= candidate.end_date
        ))
        .map((candidate) => ({
          id: candidate.id,
          contract_number: candidate.contract_number,
          start_date: candidate.start_date,
          end_date: candidate.end_date,
          status: candidate.status,
        }));
      const paymentMonth = monthOf(row.payment_date);
      const matchingMonthInvoices = invoices
        .filter((candidate) => (
          candidate.customer_id === row.customer_id
          && monthOf(candidate.due_date || candidate.invoice_date) === paymentMonth
        ))
        .slice(0, 10)
        .map((candidate) => ({
          id: candidate.id,
          invoice_number: candidate.invoice_number,
          contract_id: candidate.contract_id,
          invoice_date: candidate.invoice_date,
          due_date: candidate.due_date,
          total_amount: candidate.total_amount,
          paid_amount: candidate.paid_amount,
          balance_due: candidate.balance_due,
          status: candidate.status,
          payment_status: candidate.payment_status,
        }));
      return {
        id: row.id,
        payment_number: row.payment_number,
        amount: row.amount,
        payment_date: row.payment_date,
        contract_id: row.contract_id,
        contract_number: contract?.contract_number || null,
        contract_start_date: contract?.start_date || null,
        contract_end_date: contract?.end_date || null,
        payment_is_outside_contract_period: Boolean(
          row.payment_date
          && contract?.start_date
          && contract?.end_date
          && (row.payment_date < contract.start_date || row.payment_date > contract.end_date)
        ),
        customer_id: row.customer_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        invoice_id: row.invoice_id,
        noted_invoice_number: notedInvoiceNumber,
        invoice_number: invoice?.invoice_number || null,
        invoice_date: invoice?.invoice_date || null,
        reference_number: row.reference_number,
        original_entry_number: row.original_entry_number,
        original_entry_status: row.original_entry_status,
        original_reference_type: row.original_reference_type,
        original_journal_lines: (linesByJournalId.get(row.original_journal_entry_id) || [])
          .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
          .map((line) => ({
            account_id: line.account_id,
            account_code: accountById.get(line.account_id)?.account_code || null,
            account_name: accountById.get(line.account_id)?.account_name || null,
            debit_amount: line.debit_amount,
            credit_amount: line.credit_amount,
            line_description: line.line_description,
          })),
        likely_cause: row.likely_cause,
        has_processing_notes: Boolean(row.processing_notes),
        processing_notes_hint: String(row.processing_notes || '').slice(0, 500),
        notes_hint: String(row.notes || '').slice(0, 120),
        covering_customer_contracts: coveringContracts,
        matching_customer_invoices_for_payment_month: matchingMonthInvoices,
      };
    }),
    likelyCause: [
      'The current affected payments were changed by the contract-health repair flow.',
      'That flow directly updated payment_status to cancelled instead of using the atomic payment-cancellation RPC.',
      'The direct update left the original posted receipt journals active without payment_reversal entries.',
      'Each affected payment must be validated against its contract period, then repaired through an auditable accounting reversal.',
    ].join(' '),
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = result.generatedAt.replace(/[:.]/g, '-');
  const base = path.join(outputDir, `cancelled-payment-reversal-diagnosis-${companyId}-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(result, null, 2));
  fs.writeFileSync(`${base}.md`, markdown(result));

  console.log(JSON.stringify({
    status: missingReversals.length ? 'issues_found' : 'ok',
    summary: result.summary,
    groups: {
      by_likely_cause: groups.by_likely_cause,
      by_payment_number_family: groups.by_payment_number_family,
      by_original_journal_family: groups.by_original_journal_family,
      by_updated_month: groups.by_updated_month,
      by_current_invoice_link: groups.by_current_invoice_link,
    },
    jsonPath: `${base}.json`,
    mdPath: `${base}.md`,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
