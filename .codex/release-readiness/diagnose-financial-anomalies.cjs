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
const companyId = process.argv[2] || '24bc0b21-4e2d-4413-9842-31719a3669f4';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase service configuration');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function selectAll(table, columns, configure = (query) => query) {
  const pageSize = 1_000;
  const rows = [];
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    let query = supabase.from(table).select(columns).range(offset, offset + pageSize - 1);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function selectOptionalAll(table, columns, configure = (query) => query) {
  try {
    return await selectAll(table, columns, configure);
  } catch (error) {
    if (String(error.message).includes('does not exist')) return [];
    throw error;
  }
}

function sum(rows, pick) {
  return rows.reduce((total, row) => total + Number(pick(row) || 0), 0);
}

function countBy(rows, pick) {
  const result = {};
  for (const row of rows) {
    const key = String(pick(row) ?? 'null');
    result[key] = (result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1]));
}

function monthKey(value) {
  return value ? String(value).slice(0, 7) : null;
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

async function main() {
  const [invoices, payments, contracts, schedules, allocations, agentRepairs] = await Promise.all([
    selectAll(
      'invoices',
      'id,invoice_number,contract_id,customer_id,invoice_date,due_date,total_amount,paid_amount,balance_due,payment_status,status,invoice_type,is_legacy,created_at,updated_at',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'payments',
      'id,payment_number,invoice_id,contract_id,customer_id,amount,amount_paid,monthly_amount,late_fee_amount,late_fine_amount,payment_status,payment_date,payment_method,payment_type,transaction_type,reference_number,journal_entry_id,created_at,updated_at,processing_notes',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'contracts',
      'id,contract_number,contract_amount,total_paid,balance_due,payment_status,status,start_date,end_date,monthly_amount',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'contract_payment_schedules',
      'id,contract_id,invoice_id,amount,paid_amount,status,due_date,installment_number',
      (query) => query.eq('company_id', companyId)
    ),
    selectOptionalAll('payment_allocations', 'id,payment_id,target_id,allocation_type,amount,allocation_method,allocated_date'),
    selectOptionalAll(
      'system_agent_repairs',
      'id,domain,command,entity_table,entity_id,status,applied_at,rolled_back_at',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const completedPayments = payments.filter((payment) => payment.payment_status === 'completed');
  const paymentsByInvoice = new Map();
  for (const payment of completedPayments) {
    if (!payment.invoice_id) continue;
    const bucket = paymentsByInvoice.get(payment.invoice_id) || [];
    bucket.push(payment);
    paymentsByInvoice.set(payment.invoice_id, bucket);
  }

  const schedulesByInvoice = new Map();
  for (const schedule of schedules) {
    if (!schedule.invoice_id) continue;
    const bucket = schedulesByInvoice.get(schedule.invoice_id) || [];
    bucket.push(schedule);
    schedulesByInvoice.set(schedule.invoice_id, bucket);
  }

  const allocationsByPayment = new Map();
  for (const allocation of allocations) {
    const bucket = allocationsByPayment.get(allocation.payment_id) || [];
    bucket.push(allocation);
    allocationsByPayment.set(allocation.payment_id, bucket);
  }

  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const controlsCutoff = Date.parse('2026-06-27T00:00:00Z');
  const overpaid = [];

  for (const invoice of invoices) {
    const linkedPayments = paymentsByInvoice.get(invoice.id) || [];
    const linkedPaid = round(sum(linkedPayments, (payment) => payment.amount));
    const totalAmount = round(invoice.total_amount);
    if (linkedPaid <= totalAmount + 0.01) continue;

    const linkedSchedules = schedulesByInvoice.get(invoice.id) || [];
    const paymentFeeTotal = round(sum(linkedPayments, (payment) => Number(payment.late_fee_amount || 0) + Number(payment.late_fine_amount || 0)));
    const allocatedAmount = round(sum(linkedPayments.flatMap((payment) => allocationsByPayment.get(payment.id) || []), (allocation) => allocation.amount));
    const crossMonthPayments = linkedPayments.filter((payment) => monthKey(payment.payment_date) !== monthKey(invoice.invoice_date));
    const contract = contractsById.get(invoice.contract_id) || null;

    overpaid.push({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      invoice_type: invoice.invoice_type,
      invoice_status: invoice.status,
      payment_status: invoice.payment_status,
      is_legacy: invoice.is_legacy,
      total_amount: totalAmount,
      recorded_paid: round(invoice.paid_amount),
      linked_paid: linkedPaid,
      overpaid_amount: round(linkedPaid - totalAmount),
      payment_count: linkedPayments.length,
      payment_fee_total: paymentFeeTotal,
      overpayment_matches_fees: Math.abs(linkedPaid - totalAmount - paymentFeeTotal) <= 0.01,
      payments_created_after_controls: linkedPayments.filter((payment) => Date.parse(payment.created_at) >= controlsCutoff).length,
      cross_month_payment_count: crossMonthPayments.length,
      schedule_count: linkedSchedules.length,
      schedule_amount: round(sum(linkedSchedules, (schedule) => schedule.amount)),
      allocation_count: linkedPayments.reduce((count, payment) => count + (allocationsByPayment.get(payment.id) || []).length, 0),
      allocated_amount: allocatedAmount,
      contract: contract ? {
        id: contract.id,
        contract_number: contract.contract_number,
        contract_amount: round(contract.contract_amount),
        total_paid: round(contract.total_paid),
        balance_due: round(contract.balance_due),
        monthly_amount: round(contract.monthly_amount),
        status: contract.status,
      } : null,
      payments: linkedPayments.map((payment) => ({
        id: payment.id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date,
        amount: round(payment.amount),
        late_fee_amount: round(payment.late_fee_amount),
        late_fine_amount: round(payment.late_fine_amount),
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        transaction_type: payment.transaction_type,
        reference_number: payment.reference_number,
        contract_id: payment.contract_id,
        journal_entry_id: payment.journal_entry_id,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        processing_notes: payment.processing_notes,
        allocations: allocationsByPayment.get(payment.id) || [],
      })),
      schedules: linkedSchedules,
    });
  }

  overpaid.sort((a, b) => b.overpaid_amount - a.overpaid_amount);

  const duplicatePaymentGroups = new Map();
  for (const payment of completedPayments) {
    const key = [payment.contract_id, payment.invoice_id, payment.payment_date, round(payment.amount), payment.reference_number || ''].join('|');
    const bucket = duplicatePaymentGroups.get(key) || [];
    bucket.push(payment);
    duplicatePaymentGroups.set(key, bucket);
  }

  const possibleDuplicates = [...duplicatePaymentGroups.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.map((payment) => ({
      id: payment.id,
      payment_number: payment.payment_number,
      invoice_id: payment.invoice_id,
      contract_id: payment.contract_id,
      payment_date: payment.payment_date,
      amount: round(payment.amount),
      reference_number: payment.reference_number,
    })));

  const report = {
    generated_at: new Date().toISOString(),
    company_id: companyId,
    source_counts: {
      invoices: invoices.length,
      payments: payments.length,
      completed_payments: completedPayments.length,
      contracts: contracts.length,
      schedules: schedules.length,
      allocations: allocations.length,
      payment_allocations_table_available: allocations.length > 0,
      agent_repairs: agentRepairs.length,
    },
    summary: {
      overpaid_invoice_count: overpaid.length,
      total_overpaid_amount: round(sum(overpaid, (invoice) => invoice.overpaid_amount)),
      single_payment_overpayments: overpaid.filter((invoice) => invoice.payment_count === 1).length,
      multiple_payment_overpayments: overpaid.filter((invoice) => invoice.payment_count > 1).length,
      overpayments_matching_fees: overpaid.filter((invoice) => invoice.overpayment_matches_fees).length,
      overpayments_with_cross_month_links: overpaid.filter((invoice) => invoice.cross_month_payment_count > 0).length,
      overpayments_without_schedule: overpaid.filter((invoice) => invoice.schedule_count === 0).length,
      overpayments_with_allocations: overpaid.filter((invoice) => invoice.allocation_count > 0).length,
      payments_created_after_controls: sum(overpaid, (invoice) => invoice.payments_created_after_controls),
      affected_contracts: new Set(overpaid.map((invoice) => invoice.contract?.id).filter(Boolean)).size,
      possible_duplicate_payment_groups: possibleDuplicates.length,
      agent_repair_commands: countBy(agentRepairs, (repair) => `${repair.command}:${repair.status}`),
      by_invoice_type: countBy(overpaid, (invoice) => invoice.invoice_type),
      by_invoice_status: countBy(overpaid, (invoice) => invoice.invoice_status),
      by_payment_count: countBy(overpaid, (invoice) => invoice.payment_count),
    },
    possible_duplicate_payments: possibleDuplicates,
    overpaid_invoices: overpaid,
  };

  const outputPath = path.join(process.cwd(), 'reports', 'release-readiness-financial-anomalies.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ outputPath, ...report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
