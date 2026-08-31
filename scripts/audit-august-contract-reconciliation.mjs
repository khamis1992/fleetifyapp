import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const AS_OF_MONTH = '2026-08-01';
const SOURCE_FILE = path.resolve('دفعات-شهر-8-أغسطس-2026.xlsx');
const OUTPUT_FILE = path.resolve('tmp', 'august-contract-reconciliation.json');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalizePlate = (value) => String(value ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
const normalizeArabicName = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/[ىی]/g, 'ي')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[گک]/g, 'ك')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');
const asNumber = (value) => Number(value ?? 0) || 0;
const asDate = (value) => {
  if (typeof value !== 'number') return value || null;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
};

const workbook = XLSX.read(fs.readFileSync(SOURCE_FILE), { type: 'buffer', cellDates: false });
const augustRows = XLSX.utils.sheet_to_json(workbook.Sheets['المستأجرون'], { defval: null }).map((row) => ({
  plate: normalizePlate(row['اللوحة']),
  expectedCustomer: row['الاسم / الجهة'],
  canonicalCustomer: row['اسمه في النظام'],
  sourceContractNumber: row['رقم العقد'],
  sourceStartDate: asDate(row['بداية العقد']),
  sourceEndDate: asDate(row['انتهاء العقد']),
  sourceMonthlyAmount: asNumber(row['القسط']),
  sourcePhone: String(row['الهاتف'] ?? ''),
  sourceNote: row['ملاحظة'] || null,
}));

const plates = [...new Set(augustRows.map((row) => row.plate))];

const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};

const allPages = async (makeQuery, label, pageSize = 1000) => {
  const rows = [];
  for (let start = 0; ; start += pageSize) {
    const page = await must(makeQuery().range(start, start + pageSize - 1), `${label} page ${start / pageSize + 1}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
};

const vehicles = await must(
  supabase
    .from('vehicles')
    .select('id,plate_number,make,model,status,is_active,company_id')
    .eq('company_id', COMPANY_ID),
  'vehicles',
);
const targetVehicles = vehicles.filter((vehicle) => plates.includes(normalizePlate(vehicle.plate_number)));
const vehicleIds = targetVehicles.map((vehicle) => vehicle.id);

const contracts = await must(
  supabase
    .from('contracts')
    .select('id,contract_number,customer_id,vehicle_id,status,sub_status,legal_status,start_date,end_date,monthly_amount,contract_amount,total_paid,balance_due,payment_status,last_payment_date,vehicle_returned,created_via,created_at,updated_at')
    .eq('company_id', COMPANY_ID)
    .order('start_date', { ascending: true }),
  'contracts',
);
const contractIds = contracts.map((contract) => contract.id);
const customerIds = [...new Set(contracts.map((contract) => contract.customer_id).filter(Boolean))];

const customers = customerIds.length
  ? await must(
      supabase
        .from('customers')
        .select('id,first_name,last_name,first_name_ar,last_name_ar,phone,national_id,passport_number,customer_code,is_active,is_blacklisted')
        .eq('company_id', COMPANY_ID)
        .in('id', customerIds),
      'customers',
    )
  : [];

const payments = contractIds.length
  ? await allPages(
      () => supabase
        .from('payments')
        .select('id,contract_id,customer_id,payment_number,payment_date,payment_month,amount,payment_status,payment_type,transaction_type,invoice_id,notes,created_at')
        .eq('company_id', COMPANY_ID)
        .in('contract_id', contractIds),
      'payments',
    )
  : [];

const invoices = contractIds.length
  ? await allPages(
      () => supabase
        .from('invoices')
        .select('id,contract_id,customer_id,invoice_number,invoice_month,invoice_date,due_date,invoice_type,status,payment_status,total_amount,paid_amount,balance_due,penalty_id,manual_review_required,notes')
        .eq('company_id', COMPANY_ID)
        .in('contract_id', contractIds),
      'invoices',
    )
  : [];

const penalties = contractIds.length
  ? await allPages(
      () => supabase
        .from('penalties')
        .select('id,contract_id,customer_id,vehicle_id,vehicle_plate,penalty_number,penalty_date,amount,status,payment_status,reason,violation_type,notes')
        .eq('company_id', COMPANY_ID)
        .in('contract_id', contractIds),
      'penalties',
    )
  : [];

const legalCases = contractIds.length
  ? await must(
      supabase
        .from('legal_cases')
        .select('id,contract_id,case_number,case_status,workflow_stage,case_type,case_value,filing_date,complaint_number,police_report_number,created_at,updated_at,notes')
        .eq('company_id', COMPANY_ID)
        .in('contract_id', contractIds),
      'legal_cases',
    )
  : [];

const documents = contractIds.length
  ? await must(
      supabase
        .from('contract_documents')
        .select('id,contract_id,document_type,legal_identity_match_status,legal_evidence_state,document_name,original_filename,created_at')
        .eq('company_id', COMPANY_ID)
        .in('contract_id', contractIds),
      'contract_documents',
    )
  : [];

const byId = (rows) => new Map(rows.map((row) => [row.id, row]));
const vehiclesById = byId(vehicles);
const customersById = byId(customers);
const groupBy = (rows, key) => {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return groups;
};
const contractsByVehicle = groupBy(contracts, 'vehicle_id');
const paymentsByContract = groupBy(payments, 'contract_id');
const invoicesByContract = groupBy(invoices, 'contract_id');
const penaltiesByContract = groupBy(penalties, 'contract_id');
const legalByContract = groupBy(legalCases, 'contract_id');
const documentsByContract = groupBy(documents, 'contract_id');

const customerName = (customer) => {
  if (!customer) return null;
  return [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ').trim()
    || [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim()
    || null;
};
const activeInvoice = (invoice) => !['cancelled', 'canceled', 'void', 'voided', 'deleted'].includes(String(invoice.status || '').toLowerCase());
const completedPayment = (payment) => String(payment.payment_status || '').toLowerCase() === 'completed';

const auditRows = augustRows.map((source) => {
  const vehicle = targetVehicles.find((item) => normalizePlate(item.plate_number) === source.plate);
  const vehicleContracts = vehicle ? contractsByVehicle.get(vehicle.id) ?? [] : [];
  const preferredSystemName = source.canonicalCustomer && source.canonicalCustomer !== 'غير موجود في النظام'
    ? source.canonicalCustomer
    : source.expectedCustomer;
  const expectedNameKeys = new Set([preferredSystemName, source.expectedCustomer].map(normalizeArabicName).filter(Boolean));
  const normalizedPhone = String(source.sourcePhone || '').replace(/\D/g, '').slice(-8);
  const matchingCustomers = customers.filter((customer) => {
    const nameMatches = expectedNameKeys.has(normalizeArabicName(customerName(customer)));
    const customerPhone = String(customer.phone || '').replace(/\D/g, '').slice(-8);
    return nameMatches || (normalizedPhone.length === 8 && normalizedPhone === customerPhone);
  });
  const matchingCustomerIds = new Set(matchingCustomers.map((customer) => customer.id));
  const expectedCustomerContracts = contracts.filter((contract) => matchingCustomerIds.has(contract.customer_id));
  const contractSummaries = vehicleContracts.map((contract) => {
    const contractPayments = paymentsByContract.get(contract.id) ?? [];
    const contractInvoices = invoicesByContract.get(contract.id) ?? [];
    const contractPenalties = penaltiesByContract.get(contract.id) ?? [];
    const rentInvoices = contractInvoices.filter((invoice) => activeInvoice(invoice) && !invoice.penalty_id);
    const penaltyInvoices = contractInvoices.filter((invoice) => activeInvoice(invoice) && invoice.penalty_id);
    const unpaidPenalties = contractPenalties.filter((penalty) =>
      !['paid', 'completed', 'settled'].includes(String(penalty.payment_status || penalty.status || '').toLowerCase()));
    const unpaidPenaltiesBeforeSourceStart = source.sourceStartDate
      ? unpaidPenalties.filter((penalty) => String(penalty.penalty_date || '') < source.sourceStartDate)
      : [];
    const penaltyInvoicesBeforeSourceStart = source.sourceStartDate
      ? penaltyInvoices.filter((invoice) =>
          String(invoice.invoice_month || invoice.due_date || invoice.invoice_date || '') < source.sourceStartDate.slice(0, 8) + '01')
      : [];
    const completedPayments = contractPayments.filter(completedPayment);
    const openRentInvoices = rentInvoices.filter((invoice) => asNumber(invoice.balance_due) > 0.01);
    const dueOpenRentInvoices = openRentInvoices.filter((invoice) =>
      String(invoice.invoice_month || invoice.due_date || invoice.invoice_date || '') <= AS_OF_MONTH);
    const futureOpenRentInvoices = openRentInvoices.filter((invoice) =>
      String(invoice.invoice_month || invoice.due_date || invoice.invoice_date || '') > AS_OF_MONTH);
    const beforeReplacementOpenRentInvoices = source.sourceStartDate
      ? openRentInvoices.filter((invoice) =>
          String(invoice.invoice_month || invoice.due_date || invoice.invoice_date || '') < source.sourceStartDate.slice(0, 8) + '01')
      : [];
    const matchedDocuments = (documentsByContract.get(contract.id) ?? []).filter((document) =>
      ['signed_contract', 'signed_contract_image'].includes(document.document_type)
      && document.legal_identity_match_status === 'matched'
      && (document.legal_evidence_state ?? 'active') === 'active');
    return {
      ...contract,
      customer: customersById.get(contract.customer_id) ?? null,
      customerName: customerName(customersById.get(contract.customer_id)),
      completedPaymentCount: completedPayments.length,
      completedPaymentAmount: completedPayments.reduce((sum, payment) => sum + asNumber(payment.amount), 0),
      lastCompletedPaymentDate: completedPayments.map((payment) => payment.payment_date).filter(Boolean).sort().at(-1) ?? null,
      rentInvoiceCount: rentInvoices.length,
      rentInvoiceTotal: rentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.total_amount), 0),
      openRentInvoiceCount: openRentInvoices.length,
      openRentBalance: openRentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      dueOpenRentBalanceAsOfAugust: dueOpenRentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      dueOpenRentInvoiceCountAsOfAugust: dueOpenRentInvoices.length,
      futureOpenRentBalanceAfterAugust: futureOpenRentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      openRentBalanceBeforeSourceStart: beforeReplacementOpenRentInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      earliestOpenRentMonth: openRentInvoices.map((invoice) => invoice.invoice_month || invoice.due_date).filter(Boolean).sort()[0] ?? null,
      penaltyInvoiceBalance: penaltyInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      penaltyInvoiceBalanceBeforeSourceStart: penaltyInvoicesBeforeSourceStart.reduce((sum, invoice) => sum + asNumber(invoice.balance_due), 0),
      penaltyCount: contractPenalties.length,
      penaltyAmount: contractPenalties.reduce((sum, penalty) => sum + asNumber(penalty.amount), 0),
      unpaidPenaltyCount: unpaidPenalties.length,
      unpaidPenaltyAmount: unpaidPenalties.reduce((sum, penalty) => sum + asNumber(penalty.amount), 0),
      unpaidPenaltyBeforeSourceStart: unpaidPenaltiesBeforeSourceStart.reduce((sum, penalty) => sum + asNumber(penalty.amount), 0),
      legalCases: legalByContract.get(contract.id) ?? [],
      matchedSignedDocumentCount: matchedDocuments.length,
    };
  });
  const activeSameCustomer = contractSummaries.filter((contract) => contract.status === 'active' && matchingCustomerIds.has(contract.customer_id));
  const activeDifferentCustomer = contractSummaries.filter((contract) => contract.status === 'active' && !matchingCustomerIds.has(contract.customer_id));
  const legalSameCustomer = contractSummaries.filter((contract) => contract.status === 'under_legal_procedure' && matchingCustomerIds.has(contract.customer_id));
  const legalDifferentCustomer = contractSummaries.filter((contract) => contract.status === 'under_legal_procedure' && !matchingCustomerIds.has(contract.customer_id));
  const activeExpectedOtherVehicle = expectedCustomerContracts.filter((contract) => contract.status === 'active' && contract.vehicle_id !== vehicle?.id);
  const legalExpectedOtherVehicle = expectedCustomerContracts.filter((contract) => contract.status === 'under_legal_procedure' && contract.vehicle_id !== vehicle?.id);
  return {
    source,
    vehicle: vehicle ?? null,
    matchingCustomers,
    expectedCustomerContracts: expectedCustomerContracts.map((contract) => ({
      ...contract,
      plate: normalizePlate(vehiclesById.get(contract.vehicle_id)?.plate_number),
    })),
    classification: {
      activeSameCustomer: activeSameCustomer.length,
      activeDifferentCustomer: activeDifferentCustomer.length,
      legalSameCustomer: legalSameCustomer.length,
      legalDifferentCustomer: legalDifferentCustomer.length,
      activeExpectedOtherVehicle: activeExpectedOtherVehicle.length,
      legalExpectedOtherVehicle: legalExpectedOtherVehicle.length,
    },
    contracts: contractSummaries,
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(SOURCE_FILE),
  sourceRenterCount: augustRows.length,
  matchedVehicleCount: targetVehicles.length,
  auditRows,
};

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output: OUTPUT_FILE,
  sourceRenterCount: augustRows.length,
  matchedVehicleCount: targetVehicles.length,
  contractCount: contracts.length,
  paymentCount: payments.length,
  invoiceCount: invoices.length,
  penaltyCount: penalties.length,
  legalCaseCount: legalCases.length,
  documentCount: documents.length,
}, null, 2));
