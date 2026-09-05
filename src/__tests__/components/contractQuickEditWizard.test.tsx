import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';

const { saveNotes, success, error } = vi.hoisted(() => ({
  saveNotes: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('@/services/contractQuickEditService', () => ({ saveContractNotes: saveNotes }));
vi.mock('sonner', () => ({ toast: { success, error } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useCurrentCompanyId: () => 'company-1' }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (n: number) => String(n) }) }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('@/contexts/RentalViolationOverrideContext', () => ({ useRentalViolationOverride: () => ({ confirmRentalEligibility: vi.fn() }) }));
vi.mock('@/services/rentalEligibilityGuard', () => ({ assertRentalEligible: vi.fn() }));
vi.mock('@/components/contracts/RentalEligibilityBanner', () => ({ RentalEligibilityNotice: () => null, RentalEligibilityBanner: () => null }));
vi.mock('@/components/customers/EnhancedCustomerForm', () => ({ EnhancedCustomerDialog: () => null }));
vi.mock('@/components/contracts/PricingSuggestions', () => ({ PricingSuggestions: () => null }));
vi.mock('@/components/ui/collapsible-section', () => ({ AdvancedOptions: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/components/ui/date-field', () => ({ DateField: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain = {
        select: () => chain, eq: () => chain, in: () => chain, order: () => chain,
        or: () => chain, limit: async () => ({ data: [], error: null }),
      };
      return chain;
    },
  },
}));

const original = {
  id: 'contract-1', company_id: 'company-1', updated_at: '2026-09-03T12:00:00Z',
  customer_id: 'customer-1', vehicle_id: 'vehicle-1', contract_type: 'monthly',
  start_date: '2024-08-15', end_date: '2027-08-15', monthly_amount: 1800,
  contract_amount: 64800, description: 'original', rental_days: 1095,
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  saveNotes.mockResolvedValue({ id: original.id, updated_at: '2026-09-03T12:02:00Z' });
});

async function enterNote() {
  fireEvent.click(screen.getByRole('button', { name: 'التالي', exact: true }));
  const notes = await screen.findByPlaceholderText('أي ملاحظات إضافية...');
  fireEvent.change(notes, { target: { value: 'new note' } });
  fireEvent.click(screen.getByRole('button', { name: 'التالي', exact: true }));
  await screen.findByRole('button', { name: 'حفظ التعديلات' });
}

describe('quick edit wizard persistence', () => {
  it('saves only notes through the versioned service before reporting success', async () => {
    const close = vi.fn();
    render(<SimpleContractWizard open onOpenChange={close} editContract={original} showAssistant={false} />);
    await enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveNotes).toHaveBeenCalledWith({
      companyId: original.company_id, contractId: original.id,
      expectedUpdatedAt: original.updated_at, notes: 'new note',
    }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(success).toHaveBeenCalledOnce();
  });

  it('keeps the opening version when a background refetch supplies a newer contract', async () => {
    const close = vi.fn();
    const { rerender } = render(<SimpleContractWizard open onOpenChange={close} editContract={original} showAssistant={false} />);
    await enterNote();
    rerender(<SimpleContractWizard open onOpenChange={close}
      editContract={{ ...original, updated_at: '2026-09-03T12:01:00Z', description: 'another employee' }} showAssistant={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveNotes).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: original.updated_at })));
  });

  it('keeps the form open and does not announce success when the service rejects stale state', async () => {
    saveNotes.mockRejectedValue(new Error('تغير العقد'));
    const close = vi.fn();
    render(<SimpleContractWizard open onOpenChange={close} editContract={original} showAssistant={false} />);
    await enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('تغير العقد'));
    expect(close).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });
});
