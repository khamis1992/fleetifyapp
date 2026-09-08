import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LawsuitCaseWorkflowCard } from '../components/LawsuitCaseWorkflowCard';
import { ExternalFilingUncertainError, ExternalFilingWaitError } from '@/services/externalLegalFiling';

const { transition, refetch, verify, success, warning } = vi.hoisted(() => ({ transition: vi.fn(), refetch: vi.fn(), verify: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success, warning, error: vi.fn() } }));
vi.mock('../store', () => ({ useLawsuitPreparationContext: () => ({ state: { companyId: 'company-1', contractId: 'contract-1' } }) }));
vi.mock('../utils/taqadiFiling', () => ({ getCurrentLegalCase: async () => ({ id: 'case-1', case_number: 'CASE-1' }) }));
vi.mock('@/hooks/useLegalCaseWorkflow', async importOriginal => ({
  ...await importOriginal<typeof import('@/hooks/useLegalCaseWorkflow')>(),
  useLegalCaseWorkflow: () => ({
    data: { legalCase: { id: 'case-1', workflow_stage: 'preparation' }, tasks: [] },
    isLoading: false, isSaving: false, recordExternalFiling: transition, verifyExternalFiling: verify, refetch,
  }),
}));
describe('preparation page manual filing recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refetch.mockResolvedValue({ data: { legalCase: { id: 'case-1', workflow_stage: 'awaiting_acceptance' } } });
  });
  afterEach(cleanup);
  const openFiling = async () => {
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LawsuitCaseWorkflowCard />
    </QueryClientProvider>);
    await user.click(await screen.findByRole('button', { name: 'تسجيل رفع الدعوى' }));
    await user.type(screen.getByLabelText('رقم طلب الإيداع'), 'REQ-1234');
    fireEvent.change(screen.getByLabelText('تاريخ إيداع الدعوى'), { target: { value: '2026-09-04' } });
    return user;
  };
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

  it('keeps entered evidence and verifies a lost response without sending another command', async () => {
    transition.mockRejectedValue(new ExternalFilingUncertainError());
    verify.mockResolvedValue({ id: 'case-1', workflow_stage: 'awaiting_acceptance' });
    const user = await openFiling();
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    expect(await screen.findByRole('button', { name: 'إعادة محاولة التسجيل' })).toBeDisabled();
    expect(screen.getByLabelText('رقم طلب الإيداع')).toHaveValue('REQ-1234');
    expect(screen.getByLabelText('رقم طلب الإيداع')).toBeDisabled();
    expect(screen.getByLabelText('تاريخ إيداع الدعوى')).toHaveValue('2026-09-04');
    await user.click(screen.getByRole('button', { name: 'التحقق من التسجيل' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(verify).toHaveBeenCalledWith('REQ-1234', '2026-09-04');
    expect(transition).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith('تم التحقق من تسجيل الإيداع في النظام');
  });

  it('permits an explicit same-input retry only after a fresh verification', async () => {
    transition.mockRejectedValueOnce(new ExternalFilingUncertainError()).mockResolvedValueOnce({ id: 'case-1' });
    verify.mockResolvedValue(null);
    const user = await openFiling();
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    expect(await screen.findByRole('button', { name: 'إعادة محاولة التسجيل' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'التحقق من التسجيل' }));
    expect(screen.getByRole('button', { name: 'إعادة محاولة التسجيل' })).toBeEnabled();
    expect(transition).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'إعادة محاولة التسجيل' }));
    expect(transition.mock.calls).toEqual([['REQ-1234', '2026-09-04'], ['REQ-1234', '2026-09-04']]);
  });

  it('closes a successfully saved dialog even while the parent refresh remains pending', async () => {
    transition.mockResolvedValue({ id: 'case-1' });
    refetch.mockImplementation(() => new Promise(() => {}));
    const user = await openFiling();
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(success).toHaveBeenCalledWith('تم توثيق بيانات الإيداع في النظام');
  });

  it('does not misreport a successful save when background refresh fails', async () => {
    transition.mockResolvedValue({ id: 'case-1' });
    refetch.mockRejectedValue(new Error('offline'));
    const user = await openFiling();
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(success).toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('تم الحفظ'));
    expect(screen.queryByText('offline')).not.toBeInTheDocument();
  });

  it('keeps evidence and allows continuing approval when the automatic stop wait expires', async () => {
    transition.mockRejectedValue(new ExternalFilingWaitError(false));
    const user = await openFiling();
    await user.click(screen.getByRole('button', { name: 'اعتماد الإجراء' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('طُلب إيقاف الوكيل تلقائيًا');
    expect(screen.getByLabelText('رقم طلب الإيداع')).toHaveValue('REQ-1234');
    expect(screen.getByLabelText('تاريخ إيداع الدعوى')).toHaveValue('2026-09-04');
    expect(screen.getByRole('button', { name: 'اعتماد الإجراء' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeEnabled();
    expect(transition).toHaveBeenCalledOnce();
  });
});
