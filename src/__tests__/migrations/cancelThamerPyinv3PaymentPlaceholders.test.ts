import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260831024000_cancel_thamer_pyinv3_payment_placeholders.sql',
  'utf8',
);

describe('Thamer PYINV3 placeholder cleanup', () => {
  it('requires eleven matching completed receipts and canonical reversals', () => {
    expect(migration).toContain('the eleven QAR 10,560 PYINV3 placeholders drifted');
    expect(migration).toContain("invoice.invoice_number = 'PYINV3-' || payment.payment_number");
    expect(migration).toContain('public.cancel_invoice_with_reversal(');
    expect(migration).toContain('matching_receipts_preserved');
  });

  it('keeps all three claim summaries at QAR 17,240', () => {
    expect(migration).toContain('balance.current_balance = 17240');
    expect(migration).toContain('legal_case.case_value = 17240');
    expect(migration).toContain('delinquent.total_debt = 17240');
  });
});
