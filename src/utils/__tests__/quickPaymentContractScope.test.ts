import { describe, expect, it } from 'vitest';
import { resolveQuickPaymentContractScope } from '@/utils/quickPaymentContractScope';

describe('quick payment contract scope', () => {
  it('scopes a customer payment when all invoices belong to one contract', () => {
    expect(resolveQuickPaymentContractScope(['contract-a', 'contract-a'])).toBe('contract-a');
  });

  it('leaves a multi-contract customer unscoped so all invoices remain visible', () => {
    expect(resolveQuickPaymentContractScope(['contract-a', 'contract-b'])).toBeUndefined();
  });

  it('stays unscoped when no contract is known', () => {
    expect(resolveQuickPaymentContractScope([null, undefined])).toBeUndefined();
  });

  it('stays unscoped when any displayed invoice has no known contract', () => {
    expect(resolveQuickPaymentContractScope(['contract-a', null])).toBeUndefined();
  });
});
