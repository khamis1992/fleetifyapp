export const PENALTY_INVOICE_TYPE = 'service';

export const getPenaltyInvoiceDescription = (penaltyNumber: string) =>
  `مخالفة مرورية ${penaltyNumber}`;

export const getPenaltyInvoiceIdempotencyKey = (penaltyId: string) =>
  `traffic-penalty:${penaltyId}`;

export function shouldCreatePenaltyInvoice(input: {
  penaltyId: string;
  contractId?: string | null;
  amount: number;
  existingPenaltyInvoiceIds: Iterable<string>;
}) {
  if (!input.contractId || input.amount <= 0) return false;
  return !new Set(input.existingPenaltyInvoiceIds).has(input.penaltyId);
}
