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

const claimableRentalTypes = new Set(['sales', 'service', 'rental', 'monthly']);

/** Unpaid rent invoices belong in the rent component of a legal claim. */
export const isClaimableRentalInvoice = (
  invoice: LegalClaimInvoiceClassification,
) => (
  invoice.penalty_id == null
  && claimableRentalTypes.has((invoice.invoice_type || '').trim().toLowerCase())
  && !isExcludedStatus(invoice.status)
  && !isExcludedStatus(invoice.payment_status)
);
