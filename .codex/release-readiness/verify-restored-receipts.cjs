const { config } = require('dotenv');

config({ quiet: true });

const baseUrl = `${process.env.VITE_SUPABASE_URL}/rest/v1/`;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!baseUrl || !serviceKey) {
  throw new Error('Supabase URL and service role key are required');
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

const paymentIds = [
  '36366922-906a-4d88-957a-c624681f5ca2',
  '297bc609-f394-4c95-9198-04c7bc848913',
  'dd9468ac-2ee0-47ce-83e7-2791e34f2fae',
  '41eb7671-ecbb-44c1-9513-c2fe0bfbf712',
  'c5435a08-1be4-4fda-b35e-e40fb4f724d0',
  '9affaa85-5ee4-4d75-85d3-4dc22b5a84bc',
  'ce3a0e39-8c7c-4ebb-ac11-0e05cf300e83',
];

const invoiceIds = [
  '65bbf50b-dcd6-4c5b-b699-34740684a692',
  'fdaf7f31-cc23-460f-b88c-eb12dc2701b7',
  'fcf7a4e2-80f2-48fc-b192-ac47c1a8d854',
  'fa62dc77-d670-4362-85af-9baeb84599a4',
  '13a947c5-af90-4f66-a802-5cca5b8ad53c',
  'ed2a7fd5-165e-439f-8dcc-89a453446aa4',
];

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${JSON.stringify(payload).slice(0, 300)}`);
  }
  return payload;
}

async function main() {
  const [payments, invoices, snapshots, reclassifications] = await Promise.all([
    get(
      `payments?select=id,payment_number,amount,payment_status,contract_id,invoice_id,journal_entry_id,allocation_status,processing_status&id=in.(${paymentIds.join(',')})&order=payment_number`,
    ),
    get(
      `invoices?select=id,invoice_number,total_amount,paid_amount,balance_due,status,payment_status,contract_id&id=in.(${invoiceIds.join(',')})&order=invoice_number`,
    ),
    get(
      'financial_data_repair_snapshots?select=id,entity_id,before_value,after_value,rolled_back_at&migration_version=eq.20260712051000&order=entity_id',
    ),
    get(
      'journal_entries?select=id,entry_number,status,reference_type,reference_id,total_debit,total_credit,reversal_entry_id&reference_type=eq.payment_reclassification&reference_id=eq.c5435a08-1be4-4fda-b35e-e40fb4f724d0',
    ),
  ]);

  const reclassification = reclassifications[0] ?? null;
  const reclassificationLines = reclassification
    ? await get(
        `journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount,line_description&journal_entry_id=eq.${reclassification.id}`,
      )
    : [];

  const invalidPayments = payments.filter(
    (payment) =>
      payment.payment_status !== 'completed' ||
      !payment.journal_entry_id ||
      (payment.invoice_id
        ? payment.allocation_status !== 'fully_allocated'
        : payment.allocation_status !== 'unallocated'),
  );

  const invalidInvoices = invoices.filter(
    (invoice) =>
      Math.abs(Number(invoice.paid_amount) - Number(invoice.total_amount)) > 0.01 ||
      Math.abs(Number(invoice.balance_due)) > 0.01 ||
      String(invoice.payment_status).toLowerCase() !== 'paid',
  );

  const reclassificationOk = Boolean(
    reclassification &&
      reclassification.status === 'posted' &&
      !reclassification.reversal_entry_id &&
      Math.abs(Number(reclassification.total_debit) - 168) <= 0.01 &&
      Math.abs(Number(reclassification.total_credit) - 168) <= 0.01 &&
      reclassificationLines.length === 2 &&
      Math.abs(
        reclassificationLines.reduce((sum, line) => sum + Number(line.debit_amount), 0) - 168,
      ) <= 0.01 &&
      Math.abs(
        reclassificationLines.reduce((sum, line) => sum + Number(line.credit_amount), 0) - 168,
      ) <= 0.01,
  );

  const result = {
    paymentCount: payments.length,
    invalidPayments,
    invoiceCount: invoices.length,
    invalidInvoices,
    snapshotCount: snapshots.length,
    snapshotRollbackCount: snapshots.filter((snapshot) => snapshot.rolled_back_at).length,
    reclassification,
    reclassificationLines,
    reclassificationOk,
    payments,
    invoices,
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    payments.length !== 7 ||
    invalidPayments.length > 0 ||
    invoices.length !== 6 ||
    invalidInvoices.length > 0 ||
    snapshots.length !== 7 ||
    snapshots.some((snapshot) => snapshot.rolled_back_at) ||
    !reclassificationOk
  ) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
