const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const EPSILON = 0.01;

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  return text.match(new RegExp(`^${name}=["']?([^"'\r\n]+)`, 'm'))?.[1];
}

const supabase = createClient(
  readEnv('VITE_SUPABASE_URL'),
  readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const money = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const isPbc = (payment) =>
  String(payment.reference_number || '').startsWith('PBCFULL-') ||
  String(payment.processing_notes || '').includes('scripts/link-high-confidence-payment-file.cjs');

async function selectAll(table, columns, configure = (query) => query) {
  const rows = [];
  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    const { data, error } = await configure(
      supabase.from(table).select(columns).range(offset, offset + PAGE_SIZE - 1),
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function selectInChunks(table, columns, column, values) {
  const rows = [];
  for (let offset = 0; offset < values.length; offset += 100) {
    const chunk = values.slice(offset, offset + 100);
    const { data, error } = await supabase.from(table).select(columns).in(column, chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

async function main() {
  const allocationPlan = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'reports', 'pbc-payment-reallocation-plan.json'), 'utf8'),
  );
  const planByPayment = new Map(
    allocationPlan.payment_plans.map((plan) => [plan.payment_id, plan]),
  );

  const [allPayments, accounts] = await Promise.all([
    selectAll(
      'payments',
      'id,payment_number,reference_number,amount,payment_status,transaction_type,journal_entry_id,processing_notes',
      (query) => query.eq('company_id', COMPANY_ID),
    ),
    selectAll(
      'chart_of_accounts',
      'id,account_code,account_name,account_type,balance_type,account_level,is_header,is_active',
      (query) => query.eq('company_id', COMPANY_ID),
    ),
  ]);

  const payments = allPayments.filter(
    (payment) =>
      isPbc(payment) &&
      ['completed', 'paid', 'success', 'succeeded'].includes(
        String(payment.payment_status || '').toLowerCase(),
      ) &&
      String(payment.transaction_type || 'receipt').toLowerCase() === 'receipt',
  );
  const paymentIds = payments.map((payment) => payment.id);
  const journals = await selectInChunks(
    'journal_entries',
    'id,entry_number,status,reference_type,reference_id,total_debit,total_credit,reversal_entry_id,created_by',
    'reference_id',
    paymentIds,
  );
  const journalIds = journals.map((journal) => journal.id);
  const lines = await selectInChunks(
    'journal_entry_lines',
    'id,journal_entry_id,account_id,line_number,debit_amount,credit_amount,line_description',
    'journal_entry_id',
    journalIds,
  );

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const journalsByPayment = new Map();
  for (const journal of journals) {
    const bucket = journalsByPayment.get(journal.reference_id) || [];
    bucket.push(journal);
    journalsByPayment.set(journal.reference_id, bucket);
  }
  const linesByJournal = new Map();
  for (const line of lines) {
    const bucket = linesByJournal.get(line.journal_entry_id) || [];
    bucket.push(line);
    linesByJournal.set(line.journal_entry_id, bucket);
  }

  const results = [];
  for (const payment of payments) {
    const plan = planByPayment.get(payment.id);
    const candidateJournals = journalsByPayment.get(payment.id) || [];
    const journal =
      candidateJournals.find((candidate) => candidate.id === payment.journal_entry_id) ||
      candidateJournals[0] ||
      null;
    const journalLines = journal ? linesByJournal.get(journal.id) || [] : [];
    const creditLines = journalLines
      .filter((line) => Number(line.credit_amount) > EPSILON)
      .sort((left, right) => Number(left.line_number || 0) - Number(right.line_number || 0));
    const debitTotal = money(journalLines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0));
    const creditTotal = money(journalLines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0));
    const unallocated = money(plan?.unallocated_amount || 0);
    let remaining = unallocated;
    const debitReclassifications = [];
    for (const line of creditLines) {
      if (remaining <= EPSILON) break;
      const amount = money(Math.min(remaining, Number(line.credit_amount || 0)));
      if (amount > EPSILON) {
        const account = accountById.get(line.account_id);
        debitReclassifications.push({
          account_id: line.account_id,
          account_code: account?.account_code || null,
          account_name: account?.account_name || null,
          amount,
        });
        remaining = money(remaining - amount);
      }
    }

    const valid = Boolean(
      plan &&
        journal &&
        journal.id === payment.journal_entry_id &&
        journal.reference_type === 'payment' &&
        journal.status === 'posted' &&
        !journal.reversal_entry_id &&
        Math.abs(Number(payment.amount) - debitTotal) <= EPSILON &&
        Math.abs(Number(payment.amount) - creditTotal) <= EPSILON &&
        remaining <= EPSILON,
    );

    results.push({
      payment_id: payment.id,
      payment_number: payment.payment_number,
      amount: money(payment.amount),
      allocated_amount: money(plan?.allocated_amount || 0),
      unallocated_amount: unallocated,
      journal_id: journal?.id || null,
      journal_entry_number: journal?.entry_number || null,
      journal_status: journal?.status || null,
      journal_debit_total: debitTotal,
      journal_credit_total: creditTotal,
      credit_line_count: creditLines.length,
      debit_reclassifications: debitReclassifications,
      valid,
    });
  }

  const needingReclassification = results.filter((result) => result.unallocated_amount > EPSILON);
  const invalid = results.filter((result) => !result.valid);
  const summary = {
    pbc_payment_count: results.length,
    pbc_payment_amount: money(results.reduce((sum, result) => sum + result.amount, 0)),
    payment_journal_count: new Set(results.map((result) => result.journal_id).filter(Boolean)).size,
    payments_needing_reclassification: needingReclassification.length,
    reclassification_amount: money(
      needingReclassification.reduce((sum, result) => sum + result.unallocated_amount, 0),
    ),
    reclassification_debit_rows: needingReclassification.reduce(
      (sum, result) => sum + result.debit_reclassifications.length,
      0,
    ),
    invalid_payment_journal_plans: invalid.length,
    credit_account_codes: Object.fromEntries(
      Object.entries(
        needingReclassification
          .flatMap((result) => result.debit_reclassifications)
          .reduce((counts, row) => {
            const key = row.account_code || 'missing';
            counts[key] = (counts[key] || 0) + 1;
            return counts;
          }, {}),
      ).sort((left, right) => right[1] - left[1]),
    ),
  };

  const output = {
    generated_at: new Date().toISOString(),
    company_id: COMPANY_ID,
    summary,
    invalid,
    payment_plans: results,
  };
  const outputPath = path.join(
    process.cwd(),
    'reports',
    'pbc-journal-reclassification-plan.json',
  );
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(JSON.stringify({ outputPath, ...summary }, null, 2));
  if (invalid.length > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
