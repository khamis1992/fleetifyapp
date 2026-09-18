import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RentalViolationOverrideProvider,
  useRentalViolationOverride,
} from '../RentalViolationOverrideContext';
import { checkRentalEligibility, type RentalGuardResult } from '@/services/rentalEligibilityGuard';

vi.mock('@/services/rentalEligibilityGuard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/rentalEligibilityGuard')>();
  return {
    ...actual,
    checkRentalEligibility: vi.fn(),
  };
});

const mockedCheckRentalEligibility = vi.mocked(checkRentalEligibility);

const violationResult: RentalGuardResult = {
  level: 'block',
  message: 'توجد مخالفات غير مسددة',
  messages: ['توجد مخالفات غير مسددة'],
  hardBlockMessages: [],
  violationMessages: ['مخالفات المركبة', 'مخالفات العميل'],
  canOverrideUnpaidViolations: true,
  vehiclePenalties: { count: 11, total: 4_700 },
  customerPenalties: { count: 8, total: 8_500 },
  trafficViolationsPath: '/fleet/traffic-violations',
};

function ConfirmationHarness() {
  const { confirmRentalEligibility } = useRentalViolationOverride();
  const [outcome, setOutcome] = useState('pending');

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            const confirmation = await confirmRentalEligibility({
              companyId: 'company-1',
              vehicleId: 'vehicle-1',
              customerId: 'customer-1',
            });
            setOutcome(confirmation?.acceptedUnpaidViolations ? 'accepted' : 'cancelled');
          } catch {
            setOutcome('hard-blocked');
          }
        }}
      >
        تحقق
      </button>
      <output>{outcome}</output>
    </>
  );
}

describe('RentalViolationOverrideProvider', () => {
  beforeEach(() => {
    mockedCheckRentalEligibility.mockReset();
    mockedCheckRentalEligibility.mockResolvedValue(violationResult);
  });

  it('requires a checked acknowledgement before accepting both violation summaries', async () => {
    const user = userEvent.setup();
    render(
      <RentalViolationOverrideProvider>
        <ConfirmationHarness />
      </RentalViolationOverrideProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'تحقق' }));

    expect(await screen.findByText('توجد مخالفات غير مسددة')).toBeInTheDocument();
    expect(screen.getByText(/11 مخالفة/)).toHaveTextContent(/٤٬٧٠٠/);
    expect(screen.getByText(/8 مخالفة/)).toHaveTextContent(/٨٬٥٠٠/);

    const confirmButton = screen.getByRole('button', { name: 'تأكيد وإنشاء العقد' });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'الموافقة على إنشاء العقد رغم المخالفات' }));
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    expect(await screen.findByText('accepted')).toBeInTheDocument();
  });

  it('does not offer an override for a hard vehicle block', async () => {
    mockedCheckRentalEligibility.mockResolvedValue({
      ...violationResult,
      message: 'لا يمكن تأجير المركبة لأنها مسروقة',
      hardBlockMessages: ['لا يمكن تأجير المركبة لأنها مسروقة'],
      canOverrideUnpaidViolations: false,
    });
    const user = userEvent.setup();

    render(
      <RentalViolationOverrideProvider>
        <ConfirmationHarness />
      </RentalViolationOverrideProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'تحقق' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('hard-blocked')).toBeInTheDocument();
  });
});
