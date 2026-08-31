import 'dotenv/config';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const audit = JSON.parse(fs.readFileSync('tmp/august-contract-reconciliation.json', 'utf8'));
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

const invoices = await allPages(
  () => supabase
    .from('invoices')
    .select('id,contract_id,invoice_type,penalty_id,total_amount,paid_amount,balance_due,status,payment_status,due_date,invoice_month,notes')
    .eq('company_id', COMPANY_ID)
    .not('contract_id', 'is', null),
  'invoices',
);

const typeSummary = {};
for (const invoice of invoices) {
  const key = `${invoice.invoice_type || '(null)'} | ${invoice.penalty_id ? 'penalty_linked' : 'no_penalty_link'}`;
  const bucket = typeSummary[key] ||= { count: 0, total: 0, balance: 0 };
  bucket.count += 1;
  bucket.total += Number(invoice.total_amount || 0);
  bucket.balance += Number(invoice.balance_due || 0);
}

const targetContracts = new Map();
for (const row of audit.auditRows) {
  for (const contract of row.contracts) {
    if (contract.status !== 'under_legal_procedure') continue;
    targetContracts.set(contract.id, {
      id: contract.id,
      contractNumber: contract.contract_number,
      plate: row.source.plate,
      customerName: contract.customerName,
    });
  }
}

const contractIds = [...targetContracts.keys()];
const schedules = await allPages(
  () => supabase
    .from('contract_payment_schedules')
    .select('id,contract_id,invoice_id,due_date,amount,paid_amount,status,description,notes')
    .eq('company_id', COMPANY_ID)
    .in('contract_id', contractIds),
  'schedules',
);

const breakdowns = [];
for (const contract of targetContracts.values()) {
  const breakdown = await must(
    supabase.rpc('calculate_legal_claim_breakdown_v2', {
      p_company_id: COMPANY_ID,
      p_contract_id: contract.id,
      p_as_of_date: '2026-08-31',
    }),
    `claim ${contract.contractNumber}`,
  );
  const contractInvoices = invoices.filter((invoice) => invoice.contract_id === contract.id);
  const dueActive = contractInvoices.filter((invoice) =>
    String(invoice.due_date || '') <= '2026-08-31'
    && !['cancelled', 'canceled', 'voided', 'reversed'].includes(String(invoice.status || '').toLowerCase())
    && !['cancelled', 'canceled', 'voided', 'reversed'].includes(String(invoice.payment_status || '').toLowerCase()));
  const penaltyInvoiceDue = dueActive.filter((invoice) => invoice.penalty_id)
    .reduce((sum, invoice) => sum + Number(invoice.balance_due ?? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);
  const rentInvoiceDue = dueActive.filter((invoice) => !invoice.penalty_id)
    .reduce((sum, invoice) => sum + Number(invoice.balance_due ?? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);
  const unlinkedSchedules = schedules.filter((schedule) => schedule.contract_id === contract.id && !schedule.invoice_id);
  breakdowns.push({
    ...contract,
    breakdown,
    rentInvoiceDue,
    penaltyInvoiceDue,
    unlinkedScheduleCount: unlinkedSchedules.length,
    unlinkedScheduleAmount: unlinkedSchedules.reduce((sum, schedule) => sum + Math.max(Number(schedule.amount || 0) - Number(schedule.paid_amount || 0), 0), 0),
    unlinkedScheduleDescriptions: [...new Set(unlinkedSchedules.map((schedule) => schedule.description).filter(Boolean))],
  });
}

fs.writeFileSync('tmp/legal-claim-components-audit.json', `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  invoiceCount: invoices.length,
  typeSummary,
  breakdowns,
}, null, 2)}\n`);

console.log(JSON.stringify({
  invoiceCount: invoices.length,
  typeSummary,
  targetLegalContracts: breakdowns.length,
  duplicateRiskContracts: breakdowns.filter((row) =>
    Number(row.breakdown?.violations_amount || 0) > 0 && row.penaltyInvoiceDue > 0).map((row) => ({
      contractNumber: row.contractNumber,
      plate: row.plate,
      recordedDue: row.breakdown.recorded_due_amount,
      violations: row.breakdown.violations_amount,
      penaltyInvoiceDue: row.penaltyInvoiceDue,
      total: row.breakdown.total,
    })),
  output: 'tmp/legal-claim-components-audit.json',
}, null, 2));
