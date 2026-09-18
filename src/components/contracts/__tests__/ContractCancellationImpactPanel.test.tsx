import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContractCancellationImpactPanel } from '../ContractCancellationImpactPanel';

describe('cancellation preserves customer penalties', () => {
  for (const blockedPenaltyCount of [0, 1]) {
    it(`preserves liability with ${blockedPenaltyCount} paid invoice blockers`, () => {
      render(<ContractCancellationImpactPanel isLoading={false} impact={{
        contractId: 'contract-1', openPenaltyCount: 2, openPenaltyAmount: 750,
        requiresCompanyTransfer: true, blockedPenaltyCount,
        authorizedToTransfer: false, canTransfer: false,
      }} />);
      expect(screen.getByText('يوجد 2 مخالفة مرورية مفتوحة')).toBeInTheDocument();
      expect(screen.getByText(/تبقى المخالفات المرورية على مسؤولية العميل/)).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  }
});
