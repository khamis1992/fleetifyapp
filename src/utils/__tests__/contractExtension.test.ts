import { describe, it, expect } from 'vitest';
import { contractExtensionAmount } from '../contractExtension';
describe('contract extension preserves the recorded billing basis', () => {
  const original = { end_date: '2026-12-31', contract_amount: 27000, monthly_amount: 1500 };
  it('keeps the original 18 installments for a vehicle-only change', () => {
    expect(contractExtensionAmount(original, '2026-12-31')).toBe(27000);
  });
  it('adds 12 monthly installments through December 2027', () => {
    expect(contractExtensionAmount(original, '2027-12-01')).toBe(45000);
  });
});
