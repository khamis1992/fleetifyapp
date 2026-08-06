const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const fileName of ['.env', '.env.taqadi-agent']) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, 'utf8');
    const match = text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'));
    if (match?.[1]) return match[1];
  }
  return undefined;
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL') || readEnv('TAQADI_SUPABASE_URL');
const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('TAQADI_SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL/TAQADI_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/TAQADI_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const toCents = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const query = buildQuery(supabase.from(table).select(columns).range(from, to));
    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function isReceiptPayment(payment) {
  const status = String(payment.payment_status || '').toLowerCase();
  const type = String(payment.transaction_type || 'receipt').toLowerCase();
  return ['completed', 'paid', 'success', 'succeeded'].includes(status) && type === 'receipt';
}

function buildAllocationReductions(invoice, allocations) {
  let overflow = toCents(allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0))
    - toCents(invoice.total_amount);
  const reductions = [];

  const newestFirst = [...allocations].sort((a, b) => (
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
      || String(b.id).localeCompare(String(a.id))
  ));

  for (const allocation of newestFirst) {
    if (overflow <= 0) break;

    const amount = toCents(allocation.amount);
    const reduction = Math.min(amount, overflow);
    const nextAmount = amount - reduction;

    reductions.push({
      allocation_id: allocation.id,
      payment_id: allocation.payment_id,
      before_amount: fromCents(amount),
      reduce_by: fromCents(reduction),
      after_amount: fromCents(nextAmount),
      action: nextAmount > 0 ? 'reduce' : 'void',
    });

    overflow -= reduction;
  }

  return reductions;
}

async function loadRepairPlan() {
  const invoices = await selectAll(
    'invoices',
    'id,invoice_number,total_amount,paid_amount,balance_due,payment_status,status,company_id,customer_id,contract_id,due_date,created_at',
    (query) => query
      .eq('company_id', COMPANY_ID)
      .not('total_amount', 'is', null)
      .gt('total_amount', 0)
      .order('created_at', { ascending: true })
  );

  const allocations = await selectAll(
    'payment_allocations',
    'id,company_id,payment_id,allocation_type,target_id,amount,is_active,created_at',
    (query) => query
      .eq('company_id', COMPANY_ID)
      .eq('allocation_type', 'invoice')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
  );

  const payments = await selectAll(
    'payments',
    'id,payment_number,amount,payment_status,transaction_type,invoice_id,contract_id,customer_id,payment_date',
    (query) => query
      .eq('company_id', COMPANY_ID)
      .in('payment_status', ['completed', 'paid', 'success', 'succeeded'])
      .order('created_at', { ascending: true })
  );
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));

  const allocationsByInvoice = new Map();
  for (const allocation of allocations) {
    const payment = paymentsById.get(allocation.payment_id);
    if (!payment || !isReceiptPayment(payment)) continue;
    if (!allocationsByInvoice.has(allocation.target_id)) allocationsByInvoice.set(allocation.target_id, []);
    allocationsByInvoice.get(allocation.target_id).push({ ...allocation, payment });
  }

  return invoices.flatMap((invoice) => {
    const invoiceAllocations = allocationsByInvoice.get(invoice.id) || [];
    const allocatedCents = invoiceAllocations.reduce(
      (sum, allocation) => sum + toCents(allocation.amount),
      0
    );
    const totalCents = toCents(invoice.total_amount);

    if (allocatedCents <= totalCents) return [];

    const reductions = buildAllocationReductions(invoice, invoiceAllocations);
    return [{
      invoice,
      allocated_amount: fromCents(allocatedCents),
      invoice_total: fromCents(totalCents),
      overpaid_amount: fromCents(allocatedCents - totalCents),
      next_paid_amount: fromCents(totalCents),
      next_balance_due: 0,
      next_payment_status: 'paid',
      next_status: 'paid',
      reductions,
      payments: invoiceAllocations.map((allocation) => ({
        payment_number: allocation.payment.payment_number,
        payment_amount: Number(allocation.payment.amount || 0),
        allocation_amount: Number(allocation.amount || 0),
        payment_date: allocation.payment.payment_date,
      })),
    }];
  });
}

async function applyPlan(plan) {
  const results = [];

  for (const item of plan) {
    for (const reduction of item.reductions) {
      const query = reduction.action === 'reduce'
        ? supabase
          .from('payment_allocations')
          .update({
            amount: reduction.after_amount,
            notes: `Capped invoice allocation at invoice total. Reduced by QAR ${reduction.reduce_by}.`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reduction.allocation_id)
        : supabase
          .from('payment_allocations')
          .update({
            is_active: false,
            voided_at: new Date().toISOString(),
            void_reason: `Voided overpaid invoice allocation by QAR ${reduction.reduce_by}.`,
            amount: reduction.before_amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reduction.allocation_id);

      const { error } = await query;
      if (error) throw error;
    }

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        paid_amount: item.next_paid_amount,
        balance_due: item.next_balance_due,
        payment_status: item.next_payment_status,
        status: item.next_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.invoice.id);
    if (invoiceError) throw invoiceError;

    results.push({
      invoice_number: item.invoice.invoice_number,
      overpaid_amount: item.overpaid_amount,
      reductions: item.reductions,
    });
  }

  return results;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const plan = await loadRepairPlan();
  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `finance-overpayment-repair-${timestamp}.json`);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    overpaidInvoices: plan.length,
    allocationsToAdjust: plan.reduce((sum, item) => sum + item.reductions.length, 0),
    amountToMoveToUnallocatedCredit: fromCents(plan.reduce(
      (sum, item) => sum + toCents(item.overpaid_amount),
      0
    )),
  };

  const report = { summary, invoices: plan };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (!apply) {
    console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
    return;
  }

  const results = await applyPlan(plan);
  const resultPath = reportPath.replace('.json', '-results.json');
  fs.writeFileSync(resultPath, JSON.stringify({ summary, results }, null, 2), 'utf8');

  console.log(JSON.stringify({
    ...summary,
    appliedInvoices: results.length,
    reportPath,
    resultPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
