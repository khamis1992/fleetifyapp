const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const CLOSED_PAYMENT_STATUSES = new Set(['cancelled', 'canceled', 'failed', 'voided', 'reversed', 'refunded']);

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
  const args = new Set(process.argv.slice(2));
  const keyedArgs = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    apply: args.has('--apply'),
    companyId: keyedArgs['company-id'] || DEFAULT_COMPANY_ID,
    outputDir: keyedArgs['output-dir'] || path.join(process.cwd(), 'reports'),
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

async function selectByIds(table, columns, ids, buildQuery = (query) => query) {
  const rows = [];
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batchIds = uniqueIds.slice(index, index + 100);
    const { data, error } = await buildQuery(
      supabase
        .from(table)
        .select(columns)
        .in('invoice_id', batchIds)
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

function dateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function norm(value) {
  return String(value || '').toLowerCase();
}

function isClosedPayment(payment) {
  return CLOSED_PAYMENT_STATUSES.has(norm(payment.payment_status));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

function customerName(customer) {
  if (!customer) return '';
  const arabic = [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ').trim();
  const english = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
  return arabic || english || customer.company_name_ar || customer.company_name || customer.phone || customer.id;
}

function hasOutsideDurationIssue(row) {
  return [
    'invoice_date_before_contract_start',
    'invoice_date_after_contract_end',
    'due_date_before_contract_start',
    'due_date_after_contract_end',
  ].some((code) => row.issue_codes.includes(code));
}

async function buildTargets(companyId) {
  const [contracts, invoices, customers] = await Promise.all([
    selectAll(
      'contracts',
      'id,contract_number,start_date,end_date,status,customer_id',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'invoices',
      'id,invoice_number,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,contract_id,customer_id,invoice_type,journal_entry_id,created_at',
      (query) => query.eq('company_id', companyId).not('contract_id', 'is', null).order('invoice_date', { ascending: true })
    ),
    selectAll(
      'customers',
      'id,first_name,first_name_ar,last_name,last_name_ar,company_name,company_name_ar,phone,customer_code',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  const rows = invoices.map((invoice) => {
    const contract = contractById.get(invoice.contract_id);
    const contractStart = dateOnly(contract?.start_date);
    const contractEnd = dateOnly(contract?.end_date);
    const invoiceDate = dateOnly(invoice.invoice_date);
    const dueDate = dateOnly(invoice.due_date);
    const issues = [];

    if (invoiceDate && contractStart && invoiceDate < contractStart) issues.push('invoice_date_before_contract_start');
    if (invoiceDate && contractEnd && invoiceDate > contractEnd) issues.push('invoice_date_after_contract_end');
    if (dueDate && contractStart && dueDate < contractStart) issues.push('due_date_before_contract_start');
    if (dueDate && contractEnd && dueDate > contractEnd) issues.push('due_date_after_contract_end');
    if (contractStart && contractEnd && contractStart > contractEnd) issues.push('contract_start_after_end');

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoiceDate || '',
      due_date: dueDate || '',
      invoice_status: invoice.status,
      payment_status: invoice.payment_status,
      invoice_type: invoice.invoice_type,
      journal_entry_id: invoice.journal_entry_id || '',
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
      balance_due: Number(invoice.balance_due || 0),
      agreement_id: invoice.contract_id,
      agreement_number: contract?.contract_number || '',
      agreement_status: contract?.status || '',
      agreement_start_date: contractStart || '',
      agreement_end_date: contractEnd || '',
      customer_id: invoice.customer_id || contract?.customer_id || '',
      customer_name: customerName(customerById.get(invoice.customer_id || contract?.customer_id)),
      issue_codes: issues.join('|'),
    };
  });

  return rows.filter(hasOutsideDurationIssue);
}

async function enrichTargets(companyId, targets) {
  const invoiceIds = targets.map((target) => target.invoice_id);
  const payments = await selectByIds(
    'payments',
    'id,payment_number,amount,payment_status,transaction_type,invoice_id,journal_entry_id,payment_date',
    invoiceIds,
    (query) => query.eq('company_id', companyId)
  );

  const paymentsByInvoice = new Map();
  for (const payment of payments) {
    const group = paymentsByInvoice.get(payment.invoice_id) || [];
    group.push(payment);
    paymentsByInvoice.set(payment.invoice_id, group);
  }

  return targets.map((target) => {
    const linkedPayments = paymentsByInvoice.get(target.invoice_id) || [];
    const activePayments = linkedPayments.filter((payment) =>
      norm(payment.transaction_type || 'receipt') === 'receipt' && !isClosedPayment(payment)
    );

    const alreadyCancelled =
      norm(target.invoice_status) === 'cancelled' || norm(target.payment_status) === 'cancelled';

    const classification = alreadyCancelled
      ? 'already_cancelled'
      : activePayments.length
        ? 'blocked_active_payment'
        : 'ready_for_cancellation';

    return {
      ...target,
      total_amount: target.total_amount.toFixed(2),
      paid_amount: target.paid_amount.toFixed(2),
      balance_due: target.balance_due.toFixed(2),
      linked_payment_count: linkedPayments.length,
      active_payment_count: activePayments.length,
      linked_payment_numbers: linkedPayments.map((payment) => payment.payment_number || payment.id).join('|'),
      active_payment_numbers: activePayments.map((payment) => payment.payment_number || payment.id).join('|'),
      classification,
      action_status: '',
      action_message: '',
      reversal_entry_id: '',
    };
  });
}

function summarize(rows) {
  const summary = {
    targets: rows.length,
    already_cancelled: 0,
    blocked_active_payment: 0,
    ready_for_cancellation: 0,
    with_journal_entry: 0,
    with_linked_payments: 0,
    with_active_payments: 0,
    non_zero_total: 0,
    paid_amount_positive: 0,
  };

  for (const row of rows) {
    summary[row.classification] = (summary[row.classification] || 0) + 1;
    if (row.journal_entry_id) summary.with_journal_entry += 1;
    if (Number(row.linked_payment_count) > 0) summary.with_linked_payments += 1;
    if (Number(row.active_payment_count) > 0) summary.with_active_payments += 1;
    if (Number(row.total_amount) !== 0) summary.non_zero_total += 1;
    if (Number(row.paid_amount) > 0) summary.paid_amount_positive += 1;
  }

  return summary;
}

async function cancelInvoices(companyId, rows) {
  const results = [];
  const cancellable = rows.filter((row) => row.classification === 'ready_for_cancellation');

  for (let index = 0; index < cancellable.length; index += 1) {
    const row = cancellable[index];
    if (index > 0 && index % 50 === 0) {
      console.log(`Processed ${index}/${cancellable.length} cancellable invoices...`);
    }

    const { data, error } = await supabase.rpc('cancel_invoice_with_reversal', {
      p_invoice_id: row.invoice_id,
      p_company_id: companyId,
      p_reason: `Cancelled because invoice date/due date is outside agreement duration. Agreement ${row.agreement_number}; invoice ${row.invoice_number}; agreement ${row.agreement_start_date} to ${row.agreement_end_date}; invoice ${row.invoice_date}; due ${row.due_date}.`,
    });

    if (error) {
      results.push({
        ...row,
        action_status: 'failed',
        action_message: `${error.code || ''} ${error.message || ''}`.trim(),
      });
      continue;
    }

    results.push({
      ...row,
      action_status: data?.status || 'cancelled',
      action_message: 'cancel_invoice_with_reversal completed',
      reversal_entry_id: data?.reversal_entry_id || '',
    });
  }

  return [
    ...rows.filter((row) => row.classification !== 'ready_for_cancellation').map((row) => ({
      ...row,
      action_status: row.classification === 'already_cancelled' ? 'skipped_already_cancelled' : 'skipped_active_payment',
      action_message: row.classification === 'already_cancelled'
        ? 'Invoice was already cancelled.'
        : 'Invoice has active payment(s); cancel payments first.',
    })),
    ...results,
  ];
}

async function main() {
  const { apply, companyId, outputDir } = parseArgs();
  fs.mkdirSync(outputDir, { recursive: true });

  const targets = await buildTargets(companyId);
  const enriched = await enrichTargets(companyId, targets);
  const beforeSummary = summarize(enriched);

  let actionRows = enriched.map((row) => ({ ...row }));
  if (apply) {
    actionRows = await cancelInvoices(companyId, enriched);
  }

  const actionSummary = {
    attempted: actionRows.filter((row) => row.classification === 'ready_for_cancellation').length,
    cancelled: actionRows.filter((row) => ['cancelled', 'already_cancelled'].includes(row.action_status)).length,
    failed: actionRows.filter((row) => row.action_status === 'failed').length,
    skippedAlreadyCancelled: actionRows.filter((row) => row.action_status === 'skipped_already_cancelled').length,
    skippedActivePayment: actionRows.filter((row) => row.action_status === 'skipped_active_payment').length,
  };

  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, '-');
  const baseName = `cancel-outside-agreement-invoices-${apply ? 'apply' : 'dry-run'}-${companyId}-${timestamp}`;
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const csvPath = path.join(outputDir, `${baseName}.csv`);
  const mdPath = path.join(outputDir, `${baseName}.md`);

  const columns = [
    'classification',
    'action_status',
    'action_message',
    'agreement_number',
    'agreement_status',
    'customer_name',
    'agreement_start_date',
    'agreement_end_date',
    'invoice_number',
    'invoice_date',
    'due_date',
    'invoice_status',
    'payment_status',
    'total_amount',
    'paid_amount',
    'balance_due',
    'journal_entry_id',
    'reversal_entry_id',
    'linked_payment_count',
    'active_payment_count',
    'active_payment_numbers',
    'issue_codes',
    'agreement_id',
    'invoice_id',
  ];

  const output = {
    mode: apply ? 'apply' : 'dry-run',
    companyId,
    generatedAt,
    beforeSummary,
    actionSummary: apply ? actionSummary : null,
    rows: actionRows,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  fs.writeFileSync(csvPath, toCsv(actionRows, columns));

  const md = [
    `# ${apply ? 'Cancel' : 'Dry Run'} Outside Agreement Invoices`,
    '',
    `Generated: ${generatedAt}`,
    `Company ID: ${companyId}`,
    '',
    '## Before Summary',
    '',
    `- Target invoices outside agreement duration: ${beforeSummary.targets}`,
    `- Ready for cancellation: ${beforeSummary.ready_for_cancellation}`,
    `- Already cancelled: ${beforeSummary.already_cancelled}`,
    `- Blocked by active payments: ${beforeSummary.blocked_active_payment}`,
    `- With invoice journal entry: ${beforeSummary.with_journal_entry}`,
    `- With linked payments: ${beforeSummary.with_linked_payments}`,
    `- With active payments: ${beforeSummary.with_active_payments}`,
    `- Non-zero total amount: ${beforeSummary.non_zero_total}`,
    `- Positive paid amount: ${beforeSummary.paid_amount_positive}`,
    '',
    apply ? '## Action Summary' : '## Action Summary',
    '',
    apply
      ? [
        `- Attempted cancellation: ${actionSummary.attempted}`,
        `- Cancelled/already-cancelled responses: ${actionSummary.cancelled}`,
        `- Failed: ${actionSummary.failed}`,
        `- Skipped already cancelled: ${actionSummary.skippedAlreadyCancelled}`,
        `- Skipped active payment: ${actionSummary.skippedActivePayment}`,
      ].join('\n')
      : '- No changes were applied. Rerun with `--apply` to cancel ready invoices.',
    '',
    '## First 100 Rows',
    '',
    actionRows.slice(0, 100).length
      ? '| Class | Action | Agreement | Invoice | Invoice Date | Due Date | Total | Paid | Active Payments | Issue |\n'
        + '|---|---|---|---|---:|---:|---:|---:|---:|---|\n'
        + actionRows.slice(0, 100).map((row) => `| ${row.classification} | ${row.action_status || ''} | ${row.agreement_number} | ${row.invoice_number} | ${row.invoice_date} | ${row.due_date} | ${row.total_amount} | ${row.paid_amount} | ${row.active_payment_count} | ${row.issue_codes} |`).join('\n')
      : 'No target invoices found.',
    '',
    '## Output Files',
    '',
    `- JSON: ${jsonPath}`,
    `- CSV: ${csvPath}`,
  ].join('\n');

  fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify({
    mode: output.mode,
    beforeSummary,
    actionSummary: output.actionSummary,
    mdPath,
    jsonPath,
    csvPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
