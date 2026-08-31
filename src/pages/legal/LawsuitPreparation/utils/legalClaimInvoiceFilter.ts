export interface LegalClaimInvoiceClassification {
  invoice_type?: string | null;
  penalty_id?: string | null;
  payment_status?: string | null;
  status?: string | null;
}

const excludedStatuses = new Set([
  'cancelled',
  'canceled',
  'void',
  'voided',
  'reversed',
  'deleted',
]);

const isExcludedStatus = (value: string | null | undefined) =>
  excludedStatuses.has((value || '').trim().toLowerCase());

/** Only unpaid rent invoices belong in the rent component of a legal claim. */
export const isClaimableRentalInvoice = (
  invoice: LegalClaimInvoiceClassification,
) => (
  invoice.penalty_id == null
  && invoice.invoice_type?.trim().toLowerCase() === 'sales'
  && !isExcludedStatus(invoice.status)
  && !isExcludedStatus(invoice.payment_status)
);
