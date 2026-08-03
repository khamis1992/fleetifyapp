import { describe, expect, it } from 'vitest';
import { getExpectedContractInvoiceCount } from '@/utils/contractInvoiceExpectations';

describe('contract invoice count expectations', () => {
  it('does not extend a 36-month contract to 48 invoices because its amount is inconsistent', () => {
    expect(getExpectedContractInvoiceCount({
      hasCompleteContractTerm: true,
      contractTermMonths: 36,
      activeScheduleMonths: 35,
      amountBasedInstallments: 48,
    })).toBe(36);
  });

  it('still respects active schedule months inside a complete contract term', () => {
    expect(getExpectedContractInvoiceCount({
      hasCompleteContractTerm: true,
      contractTermMonths: 36,
      activeScheduleMonths: 36,
      amountBasedInstallments: 48,
    })).toBe(36);
  });

  it('uses the amount estimate only when the contract term is incomplete', () => {
    expect(getExpectedContractInvoiceCount({
      hasCompleteContractTerm: false,
      contractTermMonths: 0,
      activeScheduleMonths: 35,
      amountBasedInstallments: 48,
    })).toBe(48);
  });
});
