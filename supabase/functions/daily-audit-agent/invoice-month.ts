const INACTIVE_INVOICE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "void",
  "voided",
  "deleted",
  "inactive",
]);

export type InvoiceMonthCandidate = {
  id: string;
  contract_id?: string | null;
  invoice_month?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
};

export function toCanonicalInvoiceMonth(value: unknown): string {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (!match) return "";

  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}-01` : "";
}

export function invoiceBillingMonth(invoice: InvoiceMonthCandidate): string {
  return toCanonicalInvoiceMonth(invoice.invoice_month || invoice.invoice_date);
}

export function invoiceContractBillingMonthKey(
  invoice: InvoiceMonthCandidate,
): string {
  const contractId = String(invoice.contract_id || "").trim();
  const billingMonth = invoiceBillingMonth(invoice);
  return contractId && billingMonth ? `${contractId}:${billingMonth}` : "";
}

export function isInvoiceOutsideContractBillingMonths(
  invoice: InvoiceMonthCandidate,
  contractStart: unknown,
  contractEnd: unknown,
): boolean {
  const invoiceMonth = invoiceBillingMonth(invoice);
  const startMonth = toCanonicalInvoiceMonth(contractStart);
  const endMonth = toCanonicalInvoiceMonth(contractEnd);
  if (!invoiceMonth || !startMonth || !endMonth) return false;
  return invoiceMonth < startMonth || invoiceMonth > endMonth;
}

export function isActiveInvoiceCandidate(invoice: InvoiceMonthCandidate): boolean {
  const status = String(invoice.status || "").trim().toLowerCase();
  const paymentStatus = String(invoice.payment_status || "").trim().toLowerCase();
  return !INACTIVE_INVOICE_STATUSES.has(status)
    && !INACTIVE_INVOICE_STATUSES.has(paymentStatus);
}

function compareText(left: unknown, right: unknown): number {
  const leftText = String(left || "");
  const rightText = String(right || "");
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

/**
 * Selects the canonical invoice for a billing month without ever consulting
 * due_date. invoice_month is authoritative when populated; invoice_date is a
 * legacy fallback. Explicit invoice_month rows win, then the original row is
 * chosen deterministically by issue/creation date and id.
 */
export function selectExistingInvoiceForMonth(
  invoices: InvoiceMonthCandidate[],
  monthStart: string,
): InvoiceMonthCandidate | null {
  const targetMonth = toCanonicalInvoiceMonth(monthStart);
  if (!targetMonth) return null;

  const candidates = invoices.filter((invoice) =>
    isActiveInvoiceCandidate(invoice) && invoiceBillingMonth(invoice) === targetMonth
  );

  candidates.sort((left, right) => {
    const leftHasExplicitMonth = Boolean(toCanonicalInvoiceMonth(left.invoice_month));
    const rightHasExplicitMonth = Boolean(toCanonicalInvoiceMonth(right.invoice_month));
    if (leftHasExplicitMonth !== rightHasExplicitMonth) {
      return leftHasExplicitMonth ? -1 : 1;
    }

    return compareText(left.invoice_date, right.invoice_date)
      || compareText(left.created_at, right.created_at)
      || compareText(left.id, right.id);
  });

  return candidates[0] || null;
}
