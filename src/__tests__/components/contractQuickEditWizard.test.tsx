import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';

const { saveNotes, saveExtension, success, error, warning, refresh, invalidate, vehicleResults } = vi.hoisted(() => ({
  saveNotes: vi.fn(), saveExtension: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(),
  refresh: vi.fn(), invalidate: vi.fn(), vehicleResults: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock('@/utils/contractFinancialQueries', () => ({ refreshContractFinancialQueries: refresh }));
vi.mock('@/services/contractQuickEditService', () => ({ saveContractNotes: saveNotes, saveContractVehicleAndExtension: saveExtension }));
vi.mock('sonner', () => ({ toast: { success, error, warning } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useCurrentCompanyId: () => 'company-1' }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (n: number) => String(n) }) }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ t: (s: string) => s, currentLanguage: 'en' }) }));
vi.mock('@/contexts/RentalViolationOverrideContext', () => ({ useRentalViolationOverride: () => ({ confirmRentalEligibility: vi.fn() }) }));
vi.mock('@/services/rentalEligibilityGuard', () => ({ assertRentalEligible: vi.fn() }));
vi.mock('@/components/contracts/RentalEligibilityBanner', () => ({ RentalEligibilityNotice: () => null, RentalEligibilityBanner: () => null }));
vi.mock('@/components/customers/EnhancedCustomerForm', () => ({ EnhancedCustomerDialog: () => null }));
vi.mock('@/components/contracts/PricingSuggestions', () => ({ PricingSuggestions: () => null }));
vi.mock('@/components/ui/collapsible-section', () => ({ AdvancedOptions: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/components/ui/date-field', () => ({ DateField: ({ value, onChange, placeholder }: {
  value: string; onChange: (value: string) => void; placeholder: string;
}) => <input aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} /> }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain = {
        select: () => chain, eq: () => chain, in: () => chain, order: () => chain,
        or: () => chain, limit: vehicleResults,
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
  status: 'active', contract_number: 'LTO-TEST-1',
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  saveNotes.mockResolvedValue({ id: original.id, updated_at: '2026-09-03T12:02:00Z' });
  saveExtension.mockResolvedValue({ success: true });
  refresh.mockResolvedValue(undefined); invalidate.mockResolvedValue(undefined);
  vehicleResults.mockResolvedValue({ data: [], error: null });
});

function reviewButton() {
  const button = screen.getAllByRole('button', { name: /مراجعة التغييرات/ }).at(-1);
  if (!button) throw new Error('Missing review button');
  return button;
}

async function enterNote() {
  const notes = await screen.findByPlaceholderText('أي ملاحظات إضافية...');
  fireEvent.change(notes, { target: { value: 'new note' } });
  fireEvent.click(reviewButton());
  await screen.findByRole('button', { name: 'حفظ التعديلات' });
}

describe('quick edit wizard persistence', () => {
  it('preserves the existing billing basis and saves an extension through the atomic command', async () => {
    const contract = { ...original, contract_type: 'rental', start_date: '2025-07-01', end_date: '2026-12-31', monthly_amount: 1500, contract_amount: 27000 };
    render(<SimpleContractWizard open onOpenChange={vi.fn()} editContract={contract} showAssistant={false} />);
    expect(screen.getAllByRole('button', { name: /مراجعة التغييرات/ }).at(-1)).toBeDisabled();
    fireEvent.change(screen.getByLabelText('اختر تاريخ الانتهاء'), { target: { value: '2027-12-01' } });
    fireEvent.click(reviewButton());
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveExtension).toHaveBeenCalledWith(expect.objectContaining({
      contractId: contract.id, vehicleId: contract.vehicle_id, endDate: '2027-12-01', expectedUpdatedAt: contract.updated_at,
    })));
    expect(saveNotes).not.toHaveBeenCalled();
  });
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
      editContract={{ ...original, updated_at: '2026-09-03T12:01:00Z', description: 'another employee', contract_amount: 99999 }} showAssistant={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveNotes).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: original.updated_at })));
    expect(screen.queryByText('99999')).not.toBeInTheDocument();
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

  it('requires changes and rejects a shorter contract before review', async () => {
    render(<SimpleContractWizard open onOpenChange={vi.fn()} editContract={original} />);
    const review = reviewButton;
    expect(review()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('اختر تاريخ الانتهاء'), { target: { value: '2027-07-15' } });
    expect(review()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('لا يمكن تقليص المدة');
    expect(saveExtension).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'تراجع: تاريخ الانتهاء' }));
    expect(screen.getByLabelText('اختر تاريخ الانتهاء')).toHaveValue(original.end_date);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('confirms abandoning a dirty draft and preserves it when editing continues', async () => {
    const close = vi.fn();
    render(<SimpleContractWizard open onOpenChange={close} editContract={original} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'ملاحظات العقد' }), { target: { value: 'unsaved note' } });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء', exact: true }));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'متابعة التعديل' }));
    expect(screen.getByRole('textbox', { name: 'ملاحظات العقد' })).toHaveValue('unsaved note');
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'تجاهل والخروج' }));
    expect(close).toHaveBeenCalledWith(false);
    expect(saveNotes).not.toHaveBeenCalled();
  });

  it('keeps legal contract financial details read-only while permitting notes', async () => {
    render(<SimpleContractWizard open onOpenChange={vi.fn()} editContract={{ ...original, status: 'under_legal_procedure' }} />);
    expect(screen.getByLabelText('اختر تاريخ الانتهاء')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'اختيار مركبة بديلة' })).not.toBeInTheDocument();
    await enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveNotes).toHaveBeenCalledOnce());
    expect(saveExtension).not.toHaveBeenCalled();
  });

  it('does not duplicate a save and distinguishes refresh failure from write failure', async () => {
    let finish!: (value: unknown) => void;
    saveNotes.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    refresh.mockRejectedValueOnce(new Error('offline after commit'));
    const close = vi.fn();
    render(<SimpleContractWizard open onOpenChange={close} editContract={original} />);
    await enterNote();
    const save = screen.getByRole('button', { name: 'حفظ التعديلات' });
    fireEvent.click(save); fireEvent.click(save);
    expect(saveNotes).toHaveBeenCalledOnce();
    expect(save).toBeDisabled();
    finish({ id: original.id });
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    await waitFor(() => expect(warning).toHaveBeenCalledOnce());
    expect(success).toHaveBeenCalledOnce(); expect(error).not.toHaveBeenCalled();
  });

  it('loads replacements only when needed and reviews a vehicle change before saving', async () => {
    vehicleResults.mockResolvedValue({ data: [{ id: 'vehicle-2', make: 'Toyota', model: 'Corolla', year: 2025, plate_number: '12345' }], error: null });
    render(<SimpleContractWizard open onOpenChange={vi.fn()} editContract={original} />);
    expect(vehicleResults).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'اختيار مركبة بديلة' }));
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Corolla 2025.*12345/ }));
    expect(saveExtension).not.toHaveBeenCalled();
    fireEvent.click(reviewButton());
    expect(screen.getAllByText(/Toyota Corolla 2025/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }));
    await waitFor(() => expect(saveExtension).toHaveBeenCalledWith(expect.objectContaining({
      vehicleId: 'vehicle-2', endDate: original.end_date, expectedUpdatedAt: original.updated_at,
    })));
  });

  it('switches the editor language without discarding the draft', () => {
    render(<SimpleContractWizard open onOpenChange={vi.fn()} editContract={original} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    fireEvent.change(screen.getByRole('textbox', { name: 'ملاحظات العقد' }), { target: { value: 'unsaved note' } });
    fireEvent.click(screen.getByRole('button', { name: 'View in English' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('textbox', { name: 'Contract notes' })).toHaveValue('unsaved note');
    fireEvent.click(screen.getByRole('button', { name: 'عرض بالعربية' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('textbox', { name: 'ملاحظات العقد' })).toHaveValue('unsaved note');
  });
});
