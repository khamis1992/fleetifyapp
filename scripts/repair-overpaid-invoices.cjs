const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  const envPath = path.join(process.cwd(), '.env');
  const text = fs.readFileSync(envPath, 'utf8');
  const match = text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'));
  return match?.[1];
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

const toCents = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));
const PAGE_SIZE = 1000;

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const query = buildQuery(
      supabase
        .from(table)
        .select(columns)
        .range(from, to)
    );

    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function choosePaymentsToKeep(payments, targetCents) {
  if (targetCents <= 0) return new Set();

  const normalized = payments.map((payment, index) => ({
    payment,
    index,
    amount: toCents(payment.amount),
  }));

  if (normalized.length <= 22) {
    let bestMask = 0;
    let bestAmount = -1;
    let bestCount = 0;
    const totalMasks = 1 << normalized.length;

    for (let mask = 0; mask < totalMasks; mask += 1) {
      let amount = 0;
      let count = 0;

      for (let index = 0; index < normalized.length; index += 1) {
        if (mask & (1 << index)) {
          amount += normalized[index].amount;
          count += 1;
        }
      }

      if (amount <= targetCents && (amount > bestAmount || (amount === bestAmount && count > bestCount))) {
        bestMask = mask;
        bestAmount = amount;
        bestCount = count;
        if (amount === targetCents) break;
      }
    }

    const keepIds = new Set();
    for (let index = 0; index < normalized.length; index += 1) {
      if (bestMask & (1 << index)) keepIds.add(normalized[index].payment.id);
    }
    return keepIds;
  }

  normalized.sort((a, b) => b.amount - a.amount);
  let amount = 0;
  const keepIds = new Set();

  for (const item of normalized) {
    if (amount + item.amount <= targetCents) {
      amount += item.amount;
      keepIds.add(item.payment.id);
    }
  }

  return keepIds;
}

async function loadRepairPlan() {
  const invoices = await selectAll(
    'invoices',
    'id,invoice_number,total_amount,paid_amount,balance_due,payment_status,company_id,customer_id,contract_id,due_date,created_at',
    (query) => query.order('created_at', { ascending: true })
  );

  const payments = await selectAll(
    'payments',
    'id,payment_number,invoice_id,amount,payment_status,transaction_type,allocation_status,reconciliation_status,processing_status,contract_id,customer_id,payment_date,notes,created_at',
    (query) => query
      .eq('payment_status', 'completed')
      .not('invoice_id', 'is', null)
      .order('created_at', { ascending: true })
  );

  const paymentsByInvoice = new Map();
  for (const payment of payments || []) {
    if (!paymentsByInvoice.has(payment.invoice_id)) paymentsByInvoice.set(payment.invoice_id, []);
    paymentsByInvoice.get(payment.invoice_id).push(payment);
  }

  const plan = [];

  for (const invoice of invoices || []) {
    const linkedPayments = paymentsByInvoice.get(invoice.id) || [];
    const linkedTotal = linkedPayments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
    const invoiceTotal = toCents(invoice.total_amount);

    if (linkedTotal <= invoiceTotal) continue;

    const keepIds = choosePaymentsToKeep(linkedPayments, invoiceTotal);
    const keptPayments = linkedPayments.filter((payment) => keepIds.has(payment.id));
    const paymentsToUnlink = linkedPayments.filter((payment) => !keepIds.has(payment.id));
    const keptTotal = keptPayments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
    const balanceDue = Math.max(invoiceTotal - keptTotal, 0);

    plan.push({
      invoice,
      linkedTotal,
      invoiceTotal,
      keptTotal,
      balanceDue,
      nextPaymentStatus: keptTotal >= invoiceTotal ? 'paid' : keptTotal > 0 ? 'partial' : 'unpaid',
      keptPayments,
      paymentsToUnlink,
    });
  }

  return plan;
}

async function applyPlan(plan) {
  const rpcPlan = plan.map((item) => ({
    invoice_id: item.invoice.id,
    paid_amount: fromCents(item.keptTotal),
    balance_due: fromCents(item.balanceDue),
    payment_status: item.nextPaymentStatus,
    payment_ids_to_unlink: item.paymentsToUnlink.map((payment) => payment.id),
  }));

  const { data, error } = await supabase.rpc('repair_overpaid_invoice_allocations', {
    p_plan: rpcPlan,
  });

  if (error) {
    return [{
      ok: false,
      stage: 'repair_rpc',
      error: error.message,
      hint: error.code === 'PGRST202'
        ? 'Apply supabase/migrations/20260627002000_repair_overpaid_invoice_allocations.sql first.'
        : undefined,
    }];
  }

  return [{
    ok: true,
    stage: 'repair_rpc',
    result: data,
  }];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const plan = await loadRepairPlan();
  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(reportsDir, `finance-overpayment-repair-${timestamp}.json`);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    overpaidInvoices: plan.length,
    paymentsToUnlink: plan.reduce((sum, item) => sum + item.paymentsToUnlink.length, 0),
    amountToUnapply: fromCents(plan.reduce((sum, item) => (
      sum + item.paymentsToUnlink.reduce((paymentSum, payment) => paymentSum + toCents(payment.amount), 0)
    ), 0)),
    exactlyRepairable: plan.filter((item) => item.keptTotal === item.invoiceTotal).length,
    willBecomePartialOrUnpaid: plan.filter((item) => item.keptTotal !== item.invoiceTotal).length,
  };

  const backup = {
    summary,
    invoices: plan.map((item) => ({
      invoice: item.invoice,
      linkedTotal: fromCents(item.linkedTotal),
      invoiceTotal: fromCents(item.invoiceTotal),
      keptTotal: fromCents(item.keptTotal),
      balanceDue: fromCents(item.balanceDue),
      nextPaymentStatus: item.nextPaymentStatus,
      keptPayments: item.keptPayments,
      paymentsToUnlink: item.paymentsToUnlink,
    })),
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  if (!apply) {
    console.log(JSON.stringify({ ...summary, backupPath }, null, 2));
    return;
  }

  const results = await applyPlan(plan);
  const failed = results.filter((result) => !result.ok);
  const resultPath = backupPath.replace('.json', '-results.json');
  fs.writeFileSync(resultPath, JSON.stringify({ summary, results }, null, 2), 'utf8');

  console.log(JSON.stringify({
    ...summary,
    applied: results.filter((result) => result.ok).length,
    failed: failed.length,
    backupPath,
    resultPath,
    failures: failed.slice(0, 10),
  }, null, 2));

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
