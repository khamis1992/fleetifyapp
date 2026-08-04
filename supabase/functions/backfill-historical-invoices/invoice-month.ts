const MONTH_PATTERN = /^(\d{4})-(\d{2})(?:-\d{2})?$/;

export { getCurrentInvoiceMonthInQatar } from "../_shared/invoice-month.ts";

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

export type ContractSelectionSummary = {
  requested: number;
  matched: number;
  missing: number;
};

/** Count-only selection diagnostics avoid leaking cross-company contract IDs. */
export function summarizeContractSelection(
  requestedIds: string[],
  matchedIds: string[],
): ContractSelectionSummary {
  const requested = new Set(requestedIds);
  const matched = new Set(matchedIds.filter((id) => requested.has(id)));
  return {
    requested: requested.size,
    matched: matched.size,
    missing: requested.size - matched.size,
  };
}

export function normalizeInvoiceMonth(value: string): string {
  const match = String(value || "").trim().match(MONTH_PATTERN);
  if (!match) throw new RangeError("month must use YYYY-MM or YYYY-MM-DD format");

  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new RangeError("month is outside the valid range");
  return `${match[1]}-${match[2]}-01`;
}

export function endOfInvoiceMonth(value: string): string {
  const monthStart = normalizeInvoiceMonth(value);
  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
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
