const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
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
const toAmount = (value) => Number((Number(value || 0)).toFixed(2));

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

async function findAccount(companyId, preferredCodes, fallbackType) {
  const { data: preferred, error: preferredError } = await supabase
    .from('chart_of_accounts')
    .select('id,account_code,account_name,account_type')
    .eq('company_id', companyId)
    .in('account_code', preferredCodes)
    .eq('is_header', false)
    .eq('is_active', true)
    .order('account_code');

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
  return fallback;
}

async function loadCompletedPaymentsWithoutJournal(companyId) {
  const payments = await selectAll(
    'payments',
    'id,payment_number,amount,payment_status,transaction_type,payment_method,payment_date,invoice_id,contract_id,customer_id,journal_entry_id,created_at',
    (query) => query
      .eq('company_id', companyId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: true })
  );

  const references = await selectAll(
    'journal_entries',
    'id,reference_id,reference_type',
    (query) => query
      .eq('company_id', companyId)
      .eq('reference_type', 'payment')
  );
  const referencedPaymentIds = new Set((references || []).map((entry) => entry.reference_id));

  return payments.filter((payment) => (
    !payment.journal_entry_id
    && !referencedPaymentIds.has(payment.id)
    && toAmount(payment.amount) > 0
  ));
}

async function backfillCompany(companyId, options = {}) {
  const dryRun = options.dryRun !== false;
  const cashAccount = await findAccount(companyId, ['11101', '11151', '11201', '1120101'], 'assets');
  const receivableAccount = await findAccount(companyId, ['1130301', '11301', '12101', '11211'], 'assets');

  if (!cashAccount || !receivableAccount) {
    throw new Error(`Cannot find required cash/receivable accounts for company ${companyId}`);
  }

  const payments = await loadCompletedPaymentsWithoutJournal(companyId);
  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `payment-journal-backfill-${companyId}-${timestamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'apply',
    companyId,
    cashAccount,
    receivableAccount,
    candidatePayments: payments.length,
    created: [],
    failed: [],
  };

  if (dryRun) {
    fs.writeFileSync(reportPath, JSON.stringify({ ...report, sample: payments.slice(0, 20) }, null, 2), 'utf8');
    return { reportPath, ...report };
  }

  for (const payment of payments) {
    const amount = toAmount(payment.amount);
    const entryNumber = `JE-BF-PAY-${payment.payment_number || payment.id.slice(0, 8)}`;
    const entryDate = payment.payment_date || new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('company_id', companyId)
      .eq('reference_type', 'payment')
      .eq('reference_id', payment.id)
      .maybeSingle();

    if (existing?.id) {
      report.created.push({ paymentId: payment.id, journalEntryId: existing.id, alreadyExisted: true });
      continue;
    }

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: entryDate,
        status: 'posted',
        description: `Backfilled payment receipt journal ${payment.payment_number || payment.id}`,
        reference_type: 'payment',
        reference_id: payment.id,
        total_debit: amount,
        total_credit: amount,
      })
      .select('id')
      .single();

    if (entryError || !journalEntry) {
      report.failed.push({ paymentId: payment.id, stage: 'journal_entry', error: entryError?.message || 'No journal entry returned' });
      continue;
    }

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert([
        {
          journal_entry_id: journalEntry.id,
          account_id: cashAccount.id,
          line_number: 1,
          line_description: `Payment receipt ${payment.payment_number || payment.id}`,
          debit_amount: amount,
          credit_amount: 0,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          line_number: 2,
          line_description: `Customer receivable settlement ${payment.payment_number || payment.id}`,
          debit_amount: 0,
          credit_amount: amount,
        },
      ]);

    if (linesError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      report.failed.push({ paymentId: payment.id, stage: 'journal_lines', error: linesError.message });
      continue;
    }

    const { error: linkError } = await supabase
      .from('payments')
      .update({ journal_entry_id: journalEntry.id })
      .eq('id', payment.id)
      .eq('company_id', companyId);

    report.created.push({
      paymentId: payment.id,
      paymentNumber: payment.payment_number,
      journalEntryId: journalEntry.id,
      amount,
      linkWarning: linkError?.message || null,
    });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return {
    reportPath,
    mode: report.mode,
    companyId,
    candidatePayments: report.candidatePayments,
    created: report.created.length,
    failed: report.failed.length,
    failures: report.failed.slice(0, 10),
  };
}

async function main() {
  const companyId = process.argv.find((arg) => arg.startsWith('--company-id='))?.split('=')[1];
  const apply = process.argv.includes('--apply');

  if (!companyId) {
    console.error('Usage: node scripts/backfill-missing-payment-journals.cjs --company-id=<uuid> [--apply]');
    process.exit(1);
  }

  const result = await backfillCompany(companyId, { dryRun: !apply });
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
