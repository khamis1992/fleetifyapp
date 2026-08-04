const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/;

const INACTIVE_INVOICE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive",
]);

export type PositiveInvoiceCandidate = {
  id?: unknown;
  total_amount?: unknown;
  status?: unknown;
  payment_status?: unknown;
};

export { getDefaultScheduledInvoiceMonth } from "../_shared/invoice-month.ts";

export function normalizeInvoiceMonth(value: string): string {
  const match = value.match(MONTH_PATTERN);
  if (!match) throw new RangeError("targetMonth must use YYYY-MM format");
  return `${match[1]}-${match[2]}`;
}

export function getInvoiceMonthBounds(invoiceMonth: string): {
  monthStart: string;
  monthEnd: string;
} {
  const normalized = normalizeInvoiceMonth(invoiceMonth);
  const [year, month] = normalized.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);

  return {
    monthStart: `${normalized}-01`,
    monthEnd: `${monthEnd.getUTCFullYear()}-${String(monthEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(monthEnd.getUTCDate()).padStart(2, "0")}`,
  };
}

/** Zero-value and cancelled/voided rows must never satisfy a billing month. */
export function isActivePositiveInvoice(
  invoice: PositiveInvoiceCandidate,
): boolean {
  const status = String(invoice.status || "").trim().toLowerCase();
  const paymentStatus = String(invoice.payment_status || "").trim().toLowerCase();

  return Number(invoice.total_amount || 0) > 0.01
    && !INACTIVE_INVOICE_STATUSES.has(status)
    && !INACTIVE_INVOICE_STATUSES.has(paymentStatus);
}
