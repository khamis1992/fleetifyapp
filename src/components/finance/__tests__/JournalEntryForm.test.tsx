import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JournalEntryForm } from '../JournalEntryForm';

const { save, period } = vi.hoisted(() => ({ save: vi.fn(), period: vi.fn() }));
vi.mock('@/hooks/finance/useJournalEntries', () => ({ useCreateJournalEntry: () => ({ mutateAsync: save, isPending: false }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: '24bc0b21-4e2d-4413-9842-31719a3669f4' }) }));
vi.mock('@/hooks/useCostCenters', () => ({ useCostCenters: () => ({ data: [], isLoading: false }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [], isLoading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/services/financialControls', () => ({ assertFinancialPeriodOpen: period }));
vi.mock('@/components/ui/unified-account-selector', () => ({ UnifiedAccountSelector: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => <input aria-label="account" value={value} onChange={event => onValueChange(event.target.value)} /> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); save.mockResolvedValue({ id: 'new-entry' }); period.mockResolvedValue(undefined); });
describe('manual journal form', () => {
  it('shows a manual default and saves a balanced draft with its document UUID', async () => {
    render(<JournalEntryForm open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText('نوع المرجع')).toHaveValue('manual');
    fireEvent.change(screen.getByLabelText('وصف القيد'), { target: { value: 'تصحيح تخصيصات غير نقدي' } });
    fireEvent.change(screen.getByLabelText('معرف المرجع UUID (اختياري)'), { target: { value: 'b3b38d14-4a8f-5d49-9572-7ef3a969247a' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة بند' }));
    screen.getAllByLabelText('account').forEach((element,index) => fireEvent.change(element, { target: { value: index ? '86ec2978-84ab-45b5-a67c-bfa095f297c3' : '250f6a9f-2057-45cb-a0ca-1e2364b3debe' } }));
    const amounts=screen.getAllByRole('spinbutton');
    fireEvent.change(amounts[0], { target: { value: '100' } });
    fireEvent.change(amounts[3], { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ reference_type: 'manual', reference_id: 'b3b38d14-4a8f-5d49-9572-7ef3a969247a', total_debit: 100, total_credit: 100 }));
    expect(period).toHaveBeenCalledWith('24bc0b21-4e2d-4413-9842-31719a3669f4', expect.any(String));
  });
});
