import {
  getInvoiceBillingDate,
  getInvoiceBillingMonthKey,
  isActiveInvoice,
  isInvoiceInCurrentOrPastMonth,
} from '@/utils/invoiceBillingMonth';

export const CONTRACT_ID_QUERY_CHUNK_SIZE = 50;
export const CONTRACT_ROW_PAGE_SIZE = 500;

export interface ContractKeysetPageRequest {
  contractIds: string[];
  afterId: string | null;
  limit: number;
}

export interface ContractKeysetOptions {
  contractIdChunkSize?: number;
  pageSize?: number;
}

type ContractKeysetRow = {
  id: string;
};

/**
 * Fetch every row for a potentially large contract set without relying on
 * PostgREST's default 1,000-row response cap or an unbounded `.in(...)` URL.
 * The page callback must apply `id > afterId`, order by `id`, and use `limit`.
 */
export const fetchContractRowsByKeyset = async <T extends ContractKeysetRow>(
  contractIds: string[],
  fetchPage: (request: ContractKeysetPageRequest) => Promise<T[]>,
  options: ContractKeysetOptions = {},
): Promise<T[]> => {
  const uniqueContractIds = Array.from(new Set(contractIds.filter(Boolean)));
  const contractIdChunkSize = options.contractIdChunkSize ?? CONTRACT_ID_QUERY_CHUNK_SIZE;
  const pageSize = options.pageSize ?? CONTRACT_ROW_PAGE_SIZE;

  if (contractIdChunkSize <= 0 || pageSize <= 0) {
    throw new Error('Keyset chunk and page sizes must be positive');
  }

  const result: T[] = [];

  for (let offset = 0; offset < uniqueContractIds.length; offset += contractIdChunkSize) {
    const contractIdChunk = uniqueContractIds.slice(offset, offset + contractIdChunkSize);
    let afterId: string | null = null;

    while (true) {
      const page = await fetchPage({
        contractIds: contractIdChunk,
        afterId,
        limit: pageSize,
      });

      if (page.length === 0) break;

      const nextAfterId = page[page.length - 1]?.id;
      if (!nextAfterId || (afterId !== null && nextAfterId <= afterId)) {
        throw new Error('Keyset page did not advance by id');
      }

      result.push(...page);
      afterId = nextAfterId;

      if (page.length < pageSize) break;
    }
  }

  return result;
};

export interface EmployeeInvoiceStats {
  dueBalance: number;
  openBalance: number;
  collectibleBalance: number;
  futureBalance: number;
  dueCount: number;
  openCount: number;
  collectibleCount: number;
  /** Positive active invoice months, including invoices that are already paid. */
  positiveInvoiceMonths: Set<string>;
}

export interface EmployeeInvoiceStatsRow {
  contract_id: string | null;
  invoice_month?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  balance_due?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  payment_status?: string | null;
  status?: string | null;
}

export interface EmployeeContractBillingSummary extends EmployeeInvoiceStats {
  billingReviewRequired: boolean;
}

export interface EmployeeScheduleCoverage {
  positiveScheduleMonths: Set<string>;
}

export interface EmployeeScheduleCoverageRow {
  contract_id: string | null;
  due_date?: string | null;
  amount?: number | null;
  status?: string | null;
}

export interface EmployeeContractBillingContext {
  balance_due?: number | null;
  contract_amount?: number | null;
  monthly_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
}

const CLOSED_PAYMENT_STATES = new Set([
  'paid',
  'completed',
  'cleared',
]);

export const createEmptyEmployeeInvoiceStats = (): EmployeeInvoiceStats => ({
  dueBalance: 0,
  openBalance: 0,
  collectibleBalance: 0,
  futureBalance: 0,
  dueCount: 0,
  openCount: 0,
  collectibleCount: 0,
  positiveInvoiceMonths: new Set<string>(),
});

export const createEmptyEmployeeScheduleCoverage = (): EmployeeScheduleCoverage => ({
  positiveScheduleMonths: new Set<string>(),
});

const getDateOnlyInQatar = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const INACTIVE_SCHEDULE_STATES = new Set([
  'cancelled',
  'canceled',
  'void',
  'voided',
  'deleted',
  'inactive',
]);

const getMonthOnlyInQatar = (date: Date): string => getDateOnlyInQatar(date).slice(0, 7);

const normalizeMonthKey = (value?: string | null): string | null => {
  const match = value?.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
};

const addMonthsToKey = (monthKey: string, amount: number): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const absoluteMonth = year * 12 + (month - 1) + amount;
  const resultYear = Math.floor(absoluteMonth / 12);
  const resultMonth = absoluteMonth % 12 + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, '0')}`;
};

const getInclusiveMonthCount = (fromMonth: string, toMonth: string): number => {
  const [fromYear, fromValue] = fromMonth.split('-').map(Number);
  const [toYear, toValue] = toMonth.split('-').map(Number);
  return (toYear - fromYear) * 12 + toValue - fromValue + 1;
};

const getOpenInvoiceBalance = (invoice: EmployeeInvoiceStatsRow): number => {
  const storedBalance = invoice.balance_due;
  const balance = storedBalance == null
    ? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
    : Number(storedBalance);
  return Number.isFinite(balance) ? Math.max(0, balance) : 0;
};

export const summarizeEmployeeInvoicesByContract = (
  invoices: EmployeeInvoiceStatsRow[],
  now = new Date(),
): Map<string, EmployeeInvoiceStats> => {
  const statsByContract = new Map<string, EmployeeInvoiceStats>();
  const today = getDateOnlyInQatar(now);

  for (const invoice of invoices) {
    if (!invoice.contract_id || !isActiveInvoice(invoice)) continue;

    const current = statsByContract.get(invoice.contract_id)
      ?? createEmptyEmployeeInvoiceStats();
    const invoiceMonth = getInvoiceBillingMonthKey(invoice);
    if (invoiceMonth && Number(invoice.total_amount || 0) > 0.01) {
      current.positiveInvoiceMonths.add(invoiceMonth);
      // Persist coverage before open-balance filters: a paid invoice still
      // proves that its accounting month exists.
      statsByContract.set(invoice.contract_id, current);
    }

    const paymentStatus = String(invoice.payment_status || '').trim().toLowerCase();
    const status = String(invoice.status || '').trim().toLowerCase();
    if (CLOSED_PAYMENT_STATES.has(paymentStatus) || CLOSED_PAYMENT_STATES.has(status)) continue;

    const balance = getOpenInvoiceBalance(invoice);
    if (balance <= 0) continue;

    const isCollectible = isInvoiceInCurrentOrPastMonth(invoice, now);
    const billingDate = getInvoiceBillingDate(invoice);
    const dueDate = String(invoice.due_date || '').slice(0, 10);

    current.openBalance += balance;
    current.openCount += 1;

    if (isCollectible) {
      current.collectibleBalance += balance;
      current.collectibleCount += 1;
    } else if (billingDate) {
      current.futureBalance += balance;
    }

    if (isCollectible && (!dueDate || dueDate <= today)) {
      current.dueBalance += balance;
      current.dueCount += 1;
    }

    statsByContract.set(invoice.contract_id, current);
  }

  return statsByContract;
};

export const summarizeEmployeeSchedulesByContract = (
  schedules: EmployeeScheduleCoverageRow[],
): Map<string, EmployeeScheduleCoverage> => {
  const coverageByContract = new Map<string, EmployeeScheduleCoverage>();

  for (const schedule of schedules) {
    if (!schedule.contract_id || Number(schedule.amount || 0) <= 0.01) continue;
    const status = String(schedule.status || '').trim().toLowerCase();
    if (INACTIVE_SCHEDULE_STATES.has(status)) continue;

    const month = normalizeMonthKey(schedule.due_date);
    if (!month) continue;

    const coverage = coverageByContract.get(schedule.contract_id)
      ?? createEmptyEmployeeScheduleCoverage();
    coverage.positiveScheduleMonths.add(month);
    coverageByContract.set(schedule.contract_id, coverage);
  }

  return coverageByContract;
};

const isCurrentBillingMonthExpected = (
  contract: EmployeeContractBillingContext,
  invoiceStats: EmployeeInvoiceStats,
  scheduleCoverage: EmployeeScheduleCoverage,
  now: Date,
): boolean => {
  const lifecycle = String(contract.status || '').trim().toLowerCase();
  if (!['active', 'under_legal_procedure'].includes(lifecycle)) return false;

  const startMonth = normalizeMonthKey(contract.start_date);
  const endMonth = normalizeMonthKey(contract.end_date);
  const currentMonth = getMonthOnlyInQatar(now);
  if (!startMonth || !endMonth || endMonth < startMonth) return false;
  if (currentMonth < startMonth || currentMonth > endMonth) return false;

  const contractAmount = Number(contract.contract_amount || 0);
  const monthlyAmount = Number(contract.monthly_amount || 0);
  if (contractAmount <= 0 && monthlyAmount <= 0) return false;

  const hasStartMonthConvention =
    invoiceStats.positiveInvoiceMonths.has(startMonth)
    || scheduleCoverage.positiveScheduleMonths.has(startMonth);
  let firstBillingMonth = hasStartMonthConvention
    ? startMonth
    : addMonthsToKey(startMonth, 1);

  // Mirrors the hardened generator: a contract wholly contained in its start
  // month still has one billable month.
  if (firstBillingMonth > endMonth) firstBillingMonth = startMonth;

  const availableMonths = Math.max(1, getInclusiveMonthCount(firstBillingMonth, endMonth));
  const financialInstallments = contractAmount > 0 && monthlyAmount > 0
    ? Math.ceil(contractAmount / monthlyAmount)
    : availableMonths;
  const expectedMonths = Math.min(availableMonths, Math.max(financialInstallments, 1));
  const lastBillingMonth = addMonthsToKey(firstBillingMonth, expectedMonths - 1);

  return currentMonth >= firstBillingMonth && currentMonth <= lastBillingMonth;
};

/**
 * Contract balance is diagnostic only. It must never be substituted for
 * missing invoice rows because doing so creates a synthetic invoice/count.
 */
export const buildEmployeeContractBillingSummary = (
  contract: EmployeeContractBillingContext,
  invoiceStats?: EmployeeInvoiceStats,
  scheduleCoverage?: EmployeeScheduleCoverage,
  now = new Date(),
): EmployeeContractBillingSummary => {
  const stats = invoiceStats ?? createEmptyEmployeeInvoiceStats();
  const schedules = scheduleCoverage ?? createEmptyEmployeeScheduleCoverage();
  const currentMonth = getMonthOnlyInQatar(now);
  return {
    ...stats,
    billingReviewRequired:
      isCurrentBillingMonthExpected(contract, stats, schedules, now)
      && !stats.positiveInvoiceMonths.has(currentMonth),
  };
};
