import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LawsuitCaseWorkflowCard } from '../components/LawsuitCaseWorkflowCard';

const { transition, refetch } = vi.hoisted(() => ({ transition: vi.fn(), refetch: vi.fn() }));
vi.mock('../store', () => ({ useLawsuitPreparationContext: () => ({ state: { companyId: 'company-1', contractId: 'contract-1' } }) }));
vi.mock('../utils/taqadiFiling', () => ({ getCurrentLegalCase: async () => ({ id: 'case-1', case_number: 'CASE-1' }) }));
vi.mock('@/hooks/useLegalCaseWorkflow', async importOriginal => ({
  ...await importOriginal<typeof import('@/hooks/useLegalCaseWorkflow')>(),
  useLegalCaseWorkflow: () => ({
    data: { legalCase: { id: 'case-1', workflow_stage: 'preparation' }, tasks: [] },
    isLoading: false, isSaving: false, recordExternalFiling: transition, refetch,
  }),
}));
describe('preparation page manual filing recovery', () => {
  it('allows recording an already filed case through the audited workflow command', async () => {
    transition.mockResolvedValue({ id: 'case-1' });
    refetch.mockResolvedValue({ data: { legalCase: { id: 'case-1', workflow_stage: 'filed' } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LawsuitCaseWorkflowCard />
    </QueryClientProvider>);
    const button = await screen.findByRole('button', { name: 'تسجيل رفع الدعوى' });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(screen.getByRole('button', { name: 'اعتماد الإجراء' })).toBeDisabled();
    expect(transition).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('رقم طلب الإيداع'), 'REQ-1234');
    fireEvent.change(screen.getByLabelText('تاريخ إيداع الدعوى'), { target: { value: '2026-09-04' } });
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    await waitFor(() => expect(transition).toHaveBeenCalledWith('REQ-1234', '2026-09-04'));
  });
});
