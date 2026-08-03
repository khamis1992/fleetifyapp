export interface InvoiceBillingMonthFields {
  invoice_month?: string | null;
  invoice_date?: string | null;
  /** Payment deadline only; intentionally ignored when resolving the billing month. */
  due_date?: string | null;
}

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
