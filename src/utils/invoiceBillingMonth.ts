export interface InvoiceBillingMonthFields {
  invoice_month?: string | null;
  invoice_date?: string | null;
  /** Payment deadline only; intentionally ignored when resolving the billing month. */
  due_date?: string | null;
}

export interface InvoiceLifecycleFields {
  status?: string | null;
  payment_status?: string | null;
}

export interface InvoiceDisplayFields extends InvoiceBillingMonthFields {
  invoice_number?: string | null;
  invoice_type?: string | null;
  penalty_id?: string | null;
}

const INACTIVE_INVOICE_STATES = new Set([
  'cancelled',
  'canceled',
  'void',
  'voided',
  'deleted',
  'inactive',
  'reversed',
]);

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const normalizeDateOnly = (value?: string | null): string | null => {
  const match = value?.match(ISO_DATE_PREFIX);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

const formatLocalDate = (year: number, monthIndex: number, day: number): string => {
  const date = new Date(year, monthIndex, day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dateDay}`;
};

/**
 * The invoice month is an accounting period, not its payment deadline.
 * Legacy rows without invoice_month fall back to invoice_date.
 */
export const getInvoiceBillingDate = (invoice: InvoiceBillingMonthFields): string | null =>
  normalizeDateOnly(invoice.invoice_month) ?? normalizeDateOnly(invoice.invoice_date);

export const getInvoiceBillingMonthKey = (invoice: InvoiceBillingMonthFields): string | null =>
  getInvoiceBillingDate(invoice)?.slice(0, 7) ?? null;

/** Human-readable Arabic label for invoice lists without changing the accounting reference. */
export const getInvoiceBillingMonthLabel = (invoice: InvoiceBillingMonthFields): string | null => {
  const monthKey = getInvoiceBillingMonthKey(invoice);
  if (!monthKey) return null;

  const [year, month] = monthKey.split('-');
  return `فاتورة شهر ${Number(month)}/${year}`;
};

/**
 * Keep non-rental charges visibly distinct from the monthly rental invoice.
 * This prevents a traffic-violation invoice in the same month from looking
 * like a duplicate rent invoice in customer-facing lists.
 */
export const getInvoiceDisplayLabel = (invoice: InvoiceDisplayFields): string => {
  const reference = invoice.invoice_number?.trim() ?? '';
  const invoiceType = invoice.invoice_type?.trim().toLowerCase() ?? '';

  if (invoice.penalty_id || reference.toUpperCase().startsWith('TV-')) {
    return 'فاتورة مخالفة مرورية';
  }

  if (invoiceType === 'service') {
    return 'فاتورة خدمة';
  }

  return getInvoiceBillingMonthLabel(invoice) || (reference ? `فاتورة ${reference}` : 'فاتورة');
};

export const getLocalMonthKey = (date: Date): string =>
  formatLocalDate(date.getFullYear(), date.getMonth(), 1).slice(0, 7);

export const getNextLocalMonthStart = (date: Date): string =>
  formatLocalDate(date.getFullYear(), date.getMonth() + 1, 1);

/**
 * PostgREST filter used by invoice selectors. It includes current/past billing
 * months and deliberately does not use due_date, which is only a deadline.
 */
export const buildInvoiceMonthCutoffFilter = (date: Date): string => {
  const nextMonthStart = getNextLocalMonthStart(date);
  return `invoice_month.lt.${nextMonthStart},and(invoice_month.is.null,invoice_date.lt.${nextMonthStart})`;
};

/** PostgREST filter for one canonical billing month. */
export const buildInvoiceMonthRangeFilter = (
  monthStart: string,
  nextMonthStart: string,
): string =>
  `and(invoice_month.gte.${monthStart},invoice_month.lt.${nextMonthStart}),` +
  `and(invoice_month.is.null,invoice_date.gte.${monthStart},invoice_date.lt.${nextMonthStart})`;

/**
 * Cancelled/voided invoices are not valid monthly obligations. Check both
 * lifecycle fields because legacy data used either one to deactivate a row.
 */
export const isActiveInvoice = (invoice: InvoiceLifecycleFields): boolean => {
  const status = invoice.status?.trim().toLowerCase() ?? '';
  const paymentStatus = invoice.payment_status?.trim().toLowerCase() ?? '';
  return !INACTIVE_INVOICE_STATES.has(status) && !INACTIVE_INVOICE_STATES.has(paymentStatus);
};

export const isInvoiceInCurrentOrPastMonth = (
  invoice: InvoiceBillingMonthFields,
  date: Date,
): boolean => {
  const billingDate = getInvoiceBillingDate(invoice);
  return billingDate !== null && billingDate < getNextLocalMonthStart(date);
};

export const sortInvoicesByBillingMonth = <T extends InvoiceBillingMonthFields>(invoices: T[]): T[] =>
  [...invoices].sort((left, right) => {
    const leftDate = getInvoiceBillingDate(left) ?? '9999-12-31';
    const rightDate = getInvoiceBillingDate(right) ?? '9999-12-31';
    return leftDate.localeCompare(rightDate);
  });
