import { describe, expect, it } from 'vitest';
import { isClaimableRentalInvoice } from '../legalClaimInvoiceFilter';

describe('isClaimableRentalInvoice', () => {
  it.each(['sales', 'service', 'rental', 'monthly'])(
    'accepts a live %s rent invoice',
    (invoice_type) => {
      expect(isClaimableRentalInvoice({
        invoice_type,
        penalty_id: null,
        status: 'sent',
        payment_status: 'pending',
      })).toBe(true);
    },
  );

  it.each([
    { invoice_type: 'purchase', penalty_id: null },
    { invoice_type: 'sales', penalty_id: 'penalty-1' },
    { invoice_type: null, penalty_id: null },
    { invoice_type: 'service', penalty_id: null, status: 'void' },
    { invoice_type: 'sales', penalty_id: null, payment_status: 'deleted' },
  ])('rejects non-rent, penalty-linked, unknown, and void records', (invoice) => {
    expect(isClaimableRentalInvoice(invoice)).toBe(false);
  });
});
