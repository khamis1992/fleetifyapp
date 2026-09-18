import { describe, expect, it } from 'vitest';
import { getPenaltyInvoiceDescription, getPenaltyInvoiceIdempotencyKey, shouldCreatePenaltyInvoice } from '../penaltyInvoiceRules';

describe('penalty invoice idempotency', () => {
  it('creates one invoice for a linked positive penalty', () => {
    expect(shouldCreatePenaltyInvoice({ penaltyId: 'p1', contractId: 'c1', amount: 500, existingPenaltyInvoiceIds: [] })).toBe(true);
    expect(getPenaltyInvoiceIdempotencyKey('p1')).toBe('traffic-penalty:p1');
    expect(getPenaltyInvoiceDescription('TV-123')).toBe('مخالفة مرورية TV-123');
  });

  it('skips a penalty that already has an invoice', () => {
    expect(shouldCreatePenaltyInvoice({ penaltyId: 'p1', contractId: 'c1', amount: 500, existingPenaltyInvoiceIds: ['p1'] })).toBe(false);
  });

  it('skips unlinked or zero-value penalties', () => {
    expect(shouldCreatePenaltyInvoice({ penaltyId: 'p1', contractId: null, amount: 500, existingPenaltyInvoiceIds: [] })).toBe(false);
    expect(shouldCreatePenaltyInvoice({ penaltyId: 'p1', contractId: 'c1', amount: 0, existingPenaltyInvoiceIds: [] })).toBe(false);
  });
});
