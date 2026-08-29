import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ContractCancellationImpactPanel } from '../ContractCancellationImpactPanel';

const transferableImpact = {
  contractId: 'contract-1',
  openPenaltyCount: 2,
  openPenaltyAmount: 750,
  requiresCompanyTransfer: true,
  blockedPenaltyCount: 0,
  authorizedToTransfer: true,
  canTransfer: true,
};

describe('ContractCancellationImpactPanel', () => {
  it('requires an explicit choice before transferring open penalties to the company', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ContractCancellationImpactPanel
        impact={transferableImpact}
        isLoading={false}
        transferToCompany={false}
        onTransferToCompanyChange={onChange}
      />,
    );

    expect(screen.getByText('يوجد 2 مخالفة مرورية مفتوحة')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', {
      name: /تحويل المخالفات غير المسددة إلى مسؤولية الشركة/,
    });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('blocks automatic transfer when a customer payment is linked to a penalty invoice', () => {
    render(
      <ContractCancellationImpactPanel
        impact={{ ...transferableImpact, blockedPenaltyCount: 1, canTransfer: false }}
        isLoading={false}
        transferToCompany={false}
        onTransferToCompanyChange={vi.fn()}
      />,
    );

    expect(screen.getByText('لا يمكن تحويل كل المخالفات إلى الشركة الآن.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
