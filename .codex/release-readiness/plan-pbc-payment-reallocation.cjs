const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const PAGE_SIZE = 1000;
const EPSILON = 0.01;

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const value = fs.readFileSync(filePath, 'utf8')
      .match(new RegExp(`^${name}\\s*=\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1];
    if (value) return value.trim();
  }
  return null;
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');
const companyId = process.argv[2] || DEFAULT_COMPANY_ID;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase service configuration');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

const money = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const sum = (rows, pick) => money(rows.reduce((total, row) => total + Number(pick(row) || 0), 0));
const dateKey = (row) => String(row.due_date || row.invoice_date || '9999-12-31').slice(0, 10);
const inactive = (value) => ['cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded']
  .includes(String(value || '').toLowerCase());
const completedReceipt = (payment) => (
  ['completed', 'paid', 'success', 'succeeded'].includes(String(payment.payment_status || '').toLowerCase())
  && String(payment.transaction_type || 'receipt').toLowerCase() === 'receipt'
);
const isPbcImport = (payment) => (
  String(payment.reference_number || '').startsWith('PBCFULL-')
  || String(payment.processing_notes || '').includes('scripts/link-high-confidence-payment-file.cjs')
);

async function main() {
  const [invoices, payments, contracts] = await Promise.all([
    selectAll(
      'invoices',
      'id,invoice_number,contract_id,customer_id,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,created_at',
      (query) => query.eq('company_id', companyId),
    ),
    selectAll(
      'payments',
      'id,payment_number,reference_number,contract_id,customer_id,invoice_id,amount,payment_date,payment_status,transaction_type,allocation_status,processing_status,processing_notes,created_at,updated_at',
      (query) => query.eq('company_id', companyId),
    ),
    selectAll(
      'contracts',
      'id,contract_number,customer_id,start_date,end_date,status,contract_amount,total_paid,balance_due',
      (query) => query.eq('company_id', companyId),
    ),
  ]);

  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const activeInvoices = invoices.filter((invoice) => (
    invoice.contract_id
    && !inactive(invoice.status)
    && !inactive(invoice.payment_status)
    && Number(invoice.total_amount || 0) > EPSILON
  ));
  const completedPayments = payments.filter(completedReceipt);
  const pbcPayments = completedPayments.filter(isPbcImport);
  const nonPbcPayments = completedPayments.filter((payment) => !isPbcImport(payment));

  const nonPbcPaidByInvoice = new Map();
  for (const payment of nonPbcPayments) {
    if (!payment.invoice_id) continue;
    nonPbcPaidByInvoice.set(
      payment.invoice_id,
      money((nonPbcPaidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount || 0)),
    );
  }

  const invoicesByContract = new Map();
  for (const invoice of activeInvoices) {
    const bucket = invoicesByContract.get(invoice.contract_id) || [];
    bucket.push(invoice);
    invoicesByContract.set(invoice.contract_id, bucket);
  }
  for (const bucket of invoicesByContract.values()) {
    bucket.sort((left, right) => dateKey(left).localeCompare(dateKey(right)) || left.created_at.localeCompare(right.created_at));
  }

  const pbcByContract = new Map();
  const noContract = [];
  for (const payment of pbcPayments) {
    if (!payment.contract_id) {
      noContract.push(payment);
      continue;
    }
    const bucket = pbcByContract.get(payment.contract_id) || [];
    bucket.push(payment);
    pbcByContract.set(payment.contract_id, bucket);
  }
  for (const bucket of pbcByContract.values()) {
    bucket.sort((left, right) => (
      String(left.payment_date || '').localeCompare(String(right.payment_date || ''))
      || String(left.created_at || '').localeCompare(String(right.created_at || ''))
      || left.id.localeCompare(right.id)
    ));
  }

  const paymentPlans = [];
  const contractPlans = [];
  let nonPbcOverpaidInvoiceCount = 0;

  for (const [contractId, contractPayments] of pbcByContract) {
    const contract = contractById.get(contractId) || null;
    const contractInvoices = invoicesByContract.get(contractId) || [];
    const remainingByInvoice = new Map();

    for (const invoice of contractInvoices) {
      const nonPbcPaid = money(nonPbcPaidByInvoice.get(invoice.id) || 0);
      const capacity = money(Math.max(Number(invoice.total_amount || 0) - nonPbcPaid, 0));
      if (nonPbcPaid > Number(invoice.total_amount || 0) + EPSILON) nonPbcOverpaidInvoiceCount += 1;
      remainingByInvoice.set(invoice.id, capacity);
    }

    const contractPaymentPlans = [];
    for (const payment of contractPayments) {
      let remainingPayment = money(payment.amount);
      const allocations = [];

      for (const invoice of contractInvoices) {
        if (remainingPayment <= EPSILON) break;
        const capacity = money(remainingByInvoice.get(invoice.id) || 0);
        if (capacity <= EPSILON) continue;

        const allocatedAmount = money(Math.min(remainingPayment, capacity));
        allocations.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          amount: allocatedAmount,
        });
        remainingByInvoice.set(invoice.id, money(capacity - allocatedAmount));
        remainingPayment = money(remainingPayment - allocatedAmount);
      }

      const plan = {
        payment_id: payment.id,
        payment_number: payment.payment_number,
        reference_number: payment.reference_number,
        payment_date: payment.payment_date,
        amount: money(payment.amount),
        contract_id: contractId,
        contract_number: contract?.contract_number || null,
        current_invoice_id: payment.invoice_id,
        current_invoice_number: invoiceById.get(payment.invoice_id)?.invoice_number || null,
        allocation_count: allocations.length,
        allocated_amount: sum(allocations, (allocation) => allocation.amount),
        unallocated_amount: remainingPayment,
        proposed_primary_invoice_id: allocations.length === 1 && remainingPayment <= EPSILON ? allocations[0].invoice_id : null,
        disposition: remainingPayment > EPSILON
          ? allocations.length > 0 ? 'partially_allocated' : 'unallocated_credit'
          : allocations.length === 1 ? 'single_invoice' : 'split_invoices',
        allocations,
      };
      contractPaymentPlans.push(plan);
      paymentPlans.push(plan);
    }

    contractPlans.push({
      contract_id: contractId,
      contract_number: contract?.contract_number || null,
      contract_start_date: contract?.start_date || null,
      contract_end_date: contract?.end_date || null,
      contract_status: contract?.status || null,
      invoice_count: contractInvoices.length,
      pbc_payment_count: contractPayments.length,
      pbc_payment_amount: sum(contractPayments, (payment) => payment.amount),
      proposed_allocated_amount: sum(contractPaymentPlans, (plan) => plan.allocated_amount),
      proposed_unallocated_amount: sum(contractPaymentPlans, (plan) => plan.unallocated_amount),
      remaining_invoice_capacity: sum(contractInvoices, (invoice) => remainingByInvoice.get(invoice.id) || 0),
    });
  }

  for (const payment of noContract) {
    paymentPlans.push({
      payment_id: payment.id,
      payment_number: payment.payment_number,
      reference_number: payment.reference_number,
      payment_date: payment.payment_date,
      amount: money(payment.amount),
      contract_id: null,
      contract_number: null,
      current_invoice_id: payment.invoice_id,
      current_invoice_number: invoiceById.get(payment.invoice_id)?.invoice_number || null,
      allocation_count: 0,
      allocated_amount: 0,
      unallocated_amount: money(payment.amount),
      proposed_primary_invoice_id: null,
      disposition: 'unallocated_credit',
      allocations: [],
    });
  }

  const currentLinkedPbc = pbcPayments.filter((payment) => payment.invoice_id);
  const currentCrossMonthPbc = currentLinkedPbc.filter((payment) => {
    const invoice = invoiceById.get(payment.invoice_id);
    return invoice && String(payment.payment_date || '').slice(0, 7) !== dateKey(invoice).slice(0, 7);
  });
  const report = {
    generated_at: new Date().toISOString(),
    company_id: companyId,
    algorithm: 'FIFO by invoice due date after preserving non-PBC completed allocations; no invoice may exceed total_amount.',
    summary: {
      pbc_payment_count: pbcPayments.length,
      pbc_payment_amount: sum(pbcPayments, (payment) => payment.amount),
      pbc_payments_currently_linked: currentLinkedPbc.length,
      pbc_payments_currently_cross_month: currentCrossMonthPbc.length,
      pbc_payments_without_contract: noContract.length,
      affected_contracts: pbcByContract.size,
      proposed_single_invoice_payments: paymentPlans.filter((plan) => plan.disposition === 'single_invoice').length,
      proposed_split_invoice_payments: paymentPlans.filter((plan) => plan.disposition === 'split_invoices').length,
      proposed_partial_payments: paymentPlans.filter((plan) => plan.disposition === 'partially_allocated').length,
      proposed_unallocated_credit_payments: paymentPlans.filter((plan) => plan.disposition === 'unallocated_credit').length,
      proposed_allocated_amount: sum(paymentPlans, (plan) => plan.allocated_amount),
      proposed_unallocated_amount: sum(paymentPlans, (plan) => plan.unallocated_amount),
      proposed_allocation_rows: sum(paymentPlans, (plan) => plan.allocation_count),
      invoices_overpaid_by_non_pbc_payments: nonPbcOverpaidInvoiceCount,
    },
    contract_plans: contractPlans.sort((left, right) => right.proposed_unallocated_amount - left.proposed_unallocated_amount),
    payment_plans: paymentPlans,
  };

  const outputPath = path.join(process.cwd(), 'reports', 'pbc-payment-reallocation-plan.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ outputPath, ...report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
