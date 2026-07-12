const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const contractIds = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const outputDir = 'reports';
fs.mkdirSync(outputDir, { recursive: true });

function n(value) {
  return Number(Number(value || 0).toFixed(2));
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const groupKey = row[key] || 'none';
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(row);
    return acc;
  }, {});
}

async function run() {
  const ids = contractIds.length
    ? contractIds
    : ['b0051de5-494e-4a45-bc37-d3374384abb5', '3beb3058-3ea7-4b1c-91c8-7a71e74f4c65'];

  const { data: contracts, error: contractError } = await supabase
    .from('contracts')
    .select('id,contract_number,contract_amount,monthly_amount,total_paid,balance_due,status,start_date,end_date')
    .in('id', ids);
  if (contractError) throw contractError;

  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('id,invoice_number,total_amount,paid_amount,balance_due,status,payment_status,contract_id,due_date,invoice_date')
    .in('contract_id', ids);
  if (invoiceError) throw invoiceError;

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('id,payment_number,amount,payment_date,payment_status,transaction_type,invoice_id,contract_id,reference_number,notes')
    .in('contract_id', ids)
    .order('contract_id')
    .order('payment_date');
  if (paymentError) throw paymentError;

  const invoicesById = new Map((invoices || []).map((invoice) => [invoice.id, invoice]));
  const invoicesByContract = groupBy(invoices || [], 'contract_id');
  const paymentsByContract = groupBy((payments || []).filter((payment) => payment.payment_status === 'completed'), 'contract_id');

  const analysis = (contracts || []).map((contract) => {
    const contractInvoices = invoicesByContract[contract.id] || [];
    const contractPayments = paymentsByContract[contract.id] || [];
    const invoiceTotal = n(contractInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0));
    const paymentTotal = n(contractPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const byInvoice = groupBy(contractPayments, 'invoice_id');
    const invoicePaymentBreakdown = Object.entries(byInvoice).map(([invoiceId, rows]) => {
      const invoice = invoicesById.get(invoiceId);
      const amount = n(rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
      return {
        invoice_id: invoiceId === 'none' ? null : invoiceId,
        invoice_number: invoice?.invoice_number || null,
        invoice_total: n(invoice?.total_amount),
        payment_total: amount,
        difference: invoice ? n(amount - Number(invoice.total_amount || 0)) : amount,
        payment_count: rows.length,
        payments: rows.map((payment) => ({
          id: payment.id,
          payment_number: payment.payment_number,
          amount: payment.amount,
          payment_date: payment.payment_date,
          reference_number: payment.reference_number,
          notes: payment.notes,
        })),
      };
    });

    const unlinkedPayments = invoicePaymentBreakdown.find((row) => !row.invoice_id)?.payments || [];
    const overpaidInvoices = invoicePaymentBreakdown.filter((row) => row.invoice_id && row.difference > 0.01);
    const duplicateDateAmounts = Object.values(groupBy(contractPayments, 'payment_date'))
      .flatMap((sameDate) => Object.values(groupBy(sameDate, 'amount')).filter((rows) => rows.length > 1))
      .map((rows) => rows.map((payment) => ({
        payment_number: payment.payment_number,
        amount: payment.amount,
        payment_date: payment.payment_date,
        invoice: invoicesById.get(payment.invoice_id)?.invoice_number || null,
        notes: payment.notes,
      })));

    return {
      contract_id: contract.id,
      contract_number: contract.contract_number,
      status: contract.status,
      contract_amount: n(contract.contract_amount),
      invoice_total: invoiceTotal,
      payment_total: paymentTotal,
      overpaid_amount: n(paymentTotal - Number(contract.contract_amount || 0)),
      balance_due: n(contract.balance_due),
      payment_count: contractPayments.length,
      invoice_count: contractInvoices.length,
      unlinked_payments_total: n(unlinkedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
      unlinked_payments: unlinkedPayments,
      overpaid_invoices: overpaidInvoices,
      duplicate_same_date_amount_groups: duplicateDateAmounts,
      invoice_payment_breakdown: invoicePaymentBreakdown,
      recommendation: 'Do not delete automatically. Cancel/reclassify only the listed unlinked or duplicate payments after accounting approval.',
    };
  });

  const outputPath = path.join(outputDir, `overpaid-contract-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(JSON.stringify({
    outputPath,
    summary: analysis.map((row) => ({
      contract_number: row.contract_number,
      contract_amount: row.contract_amount,
      invoice_total: row.invoice_total,
      payment_total: row.payment_total,
      overpaid_amount: row.overpaid_amount,
      unlinked_payments_total: row.unlinked_payments_total,
      overpaid_invoices: row.overpaid_invoices.length,
      duplicate_groups: row.duplicate_same_date_amount_groups.length,
    })),
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
