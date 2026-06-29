import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config({ quiet: true });

type ThroughMode = 'current' | 'next' | 'full';

type ContractRow = {
  id: string;
  company_id: string;
  contract_number: string | null;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  monthly_amount: number | null;
  contract_amount: number | null;
};

type InvoiceRow = {
  id: string;
  contract_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string | null;
};

type MissingInvoice = {
  contract_id: string;
  contract_number: string | null;
  company_id: string;
  customer_id: string | null;
  month: string;
  expected_amount: number;
};

type SkippedContract = {
  contract_id: string;
  contract_number: string | null;
  reason: string;
};

const args = process.argv.slice(2);
const argSet = new Set(args);
const apply = argSet.has('--apply');
const companyId = getArgValue('--company-id');
const contractId = getArgValue('--contract-id');
const throughArg = getArgValue('--through') || 'current';
const startMonthArg = getArgValue('--start-month');
const statusesArg = getArgValue('--statuses');
const statuses = statusesArg
  ? statusesArg.split(',').map((status) => status.trim()).filter(Boolean)
  : ['active', 'under_legal_procedure'];

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
}

if (!isValidThrough(throughArg) && !isMonth(throughArg)) {
  throw new Error('--through must be one of current, next, full, or YYYY-MM');
}

if (startMonthArg && !isMonth(startMonthArg)) {
  throw new Error('--start-month must use YYYY-MM format');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getArgValue(name: string): string | undefined {
  const index = args.findIndex((arg) => arg === name);
  return index >= 0 ? args[index + 1] : undefined;
}

function isValidThrough(value: string): value is ThroughMode {
  return value === 'current' || value === 'next' || value === 'full';
}

function isMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function dateToMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function todayMonth(): string {
  return dateToMonth(new Date());
}

function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return dateToMonth(new Date(Date.UTC(year, monthNumber - 1 + count, 1)));
}

function monthToDate(month: string): string {
  return `${month}-01`;
}

function normalizeMonth(date: string | null): string | null {
  if (!date || date.length < 7) return null;
  return date.slice(0, 7);
}

function compareMonths(a: string, b: string): number {
  return a.localeCompare(b);
}

function firstBillingMonth(contract: ContractRow): string | null {
  if (!contract.start_date) return null;
  const startMonth = normalizeMonth(contract.start_date);
  if (!startMonth) return null;

  return startMonthArg || addMonths(startMonth, 1);
}

function lastBillingMonth(contract: ContractRow): string | null {
  const current = todayMonth();
  let requested: string;

  if (throughArg === 'current') {
    requested = current;
  } else if (throughArg === 'next') {
    requested = addMonths(current, 1);
  } else if (throughArg === 'full') {
    const contractEndMonth = normalizeMonth(contract.end_date);
    requested = contractEndMonth || current;
  } else {
    requested = throughArg;
  }

  const endMonth = normalizeMonth(contract.end_date);
  if (endMonth && compareMonths(requested, endMonth) > 0) {
    return endMonth;
  }

  return requested;
}

function expectedMonths(contract: ContractRow): string[] {
  const start = firstBillingMonth(contract);
  const end = lastBillingMonth(contract);
  if (!start || !end || compareMonths(start, end) > 0) return [];

  const months: string[] = [];
  let cursor = start;
  while (compareMonths(cursor, end) <= 0) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function invoiceMonths(invoice: InvoiceRow): string[] {
  return [
    normalizeMonth(invoice.invoice_date),
    normalizeMonth(invoice.due_date),
  ].filter((month): month is string => Boolean(month));
}

async function fetchAll<T>(table: string, select: string, build?: (query: any) => any): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (build) query = build(query);

    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...((data || []) as T[]));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  return rows;
}

async function main() {
  const contracts = await fetchAll<ContractRow>(
    'contracts',
    'id, company_id, contract_number, customer_id, start_date, end_date, status, monthly_amount, contract_amount',
    (query) => {
      let next = query.in('status', statuses).order('contract_number', { ascending: true });
      if (companyId) next = next.eq('company_id', companyId);
      if (contractId) next = next.eq('id', contractId);
      return next;
    },
  );

  const invoices = await fetchAll<InvoiceRow>(
    'invoices',
    'id, contract_id, invoice_number, invoice_date, due_date, status',
    (query) => {
      let next = query.not('contract_id', 'is', null).neq('status', 'cancelled');
      if (companyId) next = next.eq('company_id', companyId);
      if (contractId) next = next.eq('contract_id', contractId);
      return next;
    },
  );

  const invoiceMonthsByContract = new Map<string, Set<string>>();
  for (const invoice of invoices) {
    if (!invoice.contract_id) continue;
    const months = invoiceMonthsByContract.get(invoice.contract_id) || new Set<string>();
    for (const month of invoiceMonths(invoice)) {
      months.add(month);
    }
    invoiceMonthsByContract.set(invoice.contract_id, months);
  }

  const missing: MissingInvoice[] = [];
  const skippedContracts: SkippedContract[] = [];
  const contractSummaries = [];

  for (const contract of contracts) {
    const amount = Number(contract.monthly_amount || contract.contract_amount || 0);
    const months = expectedMonths(contract);

    if (!contract.start_date) {
      skippedContracts.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        reason: 'missing_start_date',
      });
      continue;
    }

    if (amount <= 0) {
      skippedContracts.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        reason: 'missing_monthly_amount',
      });
      continue;
    }

    const existingMonths = invoiceMonthsByContract.get(contract.id) || new Set<string>();
    const contractMissing = months.filter((month) => !existingMonths.has(month));

    for (const month of contractMissing) {
      missing.push({
        contract_id: contract.id,
        contract_number: contract.contract_number,
        company_id: contract.company_id,
        customer_id: contract.customer_id,
        month,
        expected_amount: amount,
      });
    }

    contractSummaries.push({
      contract_id: contract.id,
      contract_number: contract.contract_number,
      status: contract.status,
      start_date: contract.start_date,
      end_date: contract.end_date,
      expected_months: months.length,
      existing_months: months.filter((month) => existingMonths.has(month)).length,
      missing_months: contractMissing.length,
      first_missing_month: contractMissing[0] || null,
      last_missing_month: contractMissing[contractMissing.length - 1] || null,
    });
  }

  const created: Array<MissingInvoice & { invoice_id: string }> = [];
  const failed: Array<MissingInvoice & { error: string }> = [];

  if (apply) {
    for (const item of missing) {
      const { data, error } = await supabase.rpc('generate_invoice_for_contract_month', {
        p_contract_id: item.contract_id,
        p_invoice_month: monthToDate(item.month),
      });

      if (error) {
        failed.push({ ...item, error: error.message });
      } else if (typeof data === 'string' && data.length > 0) {
        created.push({ ...item, invoice_id: data });
      }
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    companyId: companyId || null,
    contractId: contractId || null,
    through: throughArg,
    startMonth: startMonthArg || null,
    statuses,
    scannedContracts: contracts.length,
    scannedInvoices: invoices.length,
    missingInvoiceCount: missing.length,
    createdCount: created.length,
    failedCount: failed.length,
    skippedContractCount: skippedContracts.length,
    skippedContracts,
    contractsWithMissingInvoices: contractSummaries.filter((contract) => contract.missing_months > 0).length,
    missingByMonth: missing.reduce<Record<string, number>>((acc, item) => {
      acc[item.month] = (acc[item.month] || 0) + 1;
      return acc;
    }, {}),
    topContractsWithMissingInvoices: contractSummaries
      .filter((contract) => contract.missing_months > 0)
      .sort((a, b) => b.missing_months - a.missing_months)
      .slice(0, 25),
    missing,
    created,
    failed,
  };

  mkdirSync('reports', { recursive: true });
  const reportPath = join('reports', `contract-invoice-reconciliation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    mode: report.mode,
    through: report.through,
    scannedContracts: report.scannedContracts,
    scannedInvoices: report.scannedInvoices,
    missingInvoiceCount: report.missingInvoiceCount,
    contractsWithMissingInvoices: report.contractsWithMissingInvoices,
    createdCount: report.createdCount,
    failedCount: report.failedCount,
    skippedContractCount: report.skippedContractCount,
    reportPath,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
