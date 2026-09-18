import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractStatusManagement } from '@/components/contracts/ContractStatusManagement';

const { mutate, reverseLegal, impactQuery, refetchImpact, refresh, invalidate, warning, success } = vi.hoisted(() => ({
  mutate: vi.fn(), reverseLegal: vi.fn(), impactQuery: vi.fn(), refetchImpact: vi.fn(),
  refresh: vi.fn(), invalidate: vi.fn(), warning: vi.fn(), success: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ refetchQueries: refresh, invalidateQueries: invalidate }) }));
vi.mock('sonner', () => ({ toast: { success, warning, error: vi.fn() } }));
vi.mock('@/services/contractLegalProcedureService', () => ({ LEGAL_REVERSAL_MIN_REASON_LENGTH: 10, revertContractLegalProcedure: reverseLegal }));
vi.mock('@/hooks/useContractRenewal', () => ({
  useUpdateContractStatus: () => ({ isPending: false, mutateAsync: mutate }),
  useContractCancellationImpact: impactQuery,
}));

afterEach(cleanup);
const emptyImpact = {
  contractId: 'contract-1', openPenaltyCount: 0, openPenaltyAmount: 0,
  requiresCompanyTransfer: false, blockedPenaltyCount: 0, authorizedToTransfer: true, canTransfer: true,
};
const queryState = { data: emptyImpact, isLoading: false, isFetching: false, error: null, refetch: refetchImpact };
beforeEach(() => {
  vi.clearAllMocks();
  mutate.mockResolvedValue({}); reverseLegal.mockResolvedValue({});
  impactQuery.mockReturnValue(queryState); refetchImpact.mockResolvedValue({});
  refresh.mockResolvedValue(undefined); invalidate.mockResolvedValue(undefined);
});

const renderStatus = (status: string) => {
  const contract = { id: 'contract-1', company_id: 'company-1', contract_number: 'LTO2024276', status, updated_at: '2026-09-06T08:00:00Z' };
  const close = vi.fn(); const updated = vi.fn();
  const result = render(<ContractStatusManagement open onOpenChange={close} onStatusUpdated={updated} contract={contract} />);
  return { ...result, contract, close, updated };
};
const choose = (name: string) => fireEvent.click(screen.getByRole('radio', { name, exact: true }));
const enterReason = (value = 'سبب واضح لتغيير الحالة') => fireEvent.change(screen.getByRole('textbox', { name: 'سبب التغيير' }), { target: { value } });
const review = () => fireEvent.click(screen.getByRole('button', { name: 'مراجعة التغيير', exact: true }));

describe('contract status reason validation', () => {
  it('links legal contracts to their scoped case register without submitting a status change', () => {
    renderStatus('under_legal_procedure');
    expect(screen.getByRole('link', { name: 'فتح قضايا هذا العقد ومراجعة الإغلاق' }))
      .toHaveAttribute('href', '/legal/cases?view=cases&contract_id=contract-1');
    expect(reverseLegal).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
  it('requires ten non-whitespace characters before enabling legal reversal', () => {
    renderStatus('under_legal_procedure');
    choose('نشط');
    const reason = screen.getByRole('textbox');
    const submit = document.querySelector('button[type="submit"]');
    expect(screen.getByText(/من 10 أحرف على الأقل/)).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: ' 123456789 ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(reason, { target: { value: '1234567890' } });
    expect(submit).toBeEnabled();
  });

  it('preserves the existing five-character rule for ordinary suspension', () => {
    renderStatus('active');
    choose('معلق');
    const reason = screen.getByRole('textbox');
    const submit = document.querySelector('button[type="submit"]');
    expect(screen.getByText(/من 5 أحرف على الأقل/)).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: '1234' } });
    expect(submit).toBeDisabled();
    fireEvent.change(reason, { target: { value: '12345' } });
    expect(submit).toBeEnabled();
  });

  it('opens in Arabic and requires review before executing, with duplicate protection', async () => {
    let finish!: (value: unknown) => void;
    mutate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { close, updated } = renderStatus('active');
    expect(screen.getByRole('dialog')).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    expect(screen.queryByRole('radio', { name: 'نشط' })).not.toBeInTheDocument();
    choose('معلق'); enterReason(); review();
    expect(mutate).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'تأكيد تعليق العقد' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledOnce();
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ contractId: 'contract-1', status: 'suspended', reason: 'سبب واضح لتغيير الحالة' }));
    expect(confirm).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
    finish({});
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    await waitFor(() => expect(updated).toHaveBeenCalledWith('suspended'));
  });

  it('permits activation without a reason only for existing activatable states', async () => {
    renderStatus('draft'); choose('نشط'); review();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تفعيل العقد' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', reason: undefined })));
    cleanup(); renderStatus('cancelled');
    expect(screen.queryByRole('radio', { name: 'نشط' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'ملغي' })).not.toBeInTheDocument();
  });

  it.each([
    { data: undefined, isLoading: false },
    { data: emptyImpact, isLoading: true },
    { data: { ...emptyImpact, contractId: 'different-contract' }, isLoading: false },
    { data: emptyImpact, isFetching: true },
    { data: emptyImpact, error: new Error('تعذر الاتصال') },
  ])('blocks cancellation until a matching impact result is available: %j', state => {
    impactQuery.mockReturnValue({ ...queryState, ...state });
    renderStatus('active'); choose('ملغي'); enterReason();
    expect(screen.getByRole('button', { name: 'مراجعة التغيير', exact: true })).toBeDisabled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('offers a retry when the impact check fails', () => {
    impactQuery.mockReturnValue({ ...queryState, error: new Error('تعذر الاتصال') });
    renderStatus('active'); choose('ملغي');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة الفحص' }));
    expect(refetchImpact).toHaveBeenCalledOnce();
  });

  it('requires explicit transfer consent and preserves it for cancellation review', async () => {
    impactQuery.mockReturnValue({ ...queryState, data: { ...emptyImpact, requiresCompanyTransfer: true, openPenaltyCount: 2, openPenaltyAmount: 500 } });
    renderStatus('active'); choose('ملغي'); enterReason();
    expect(screen.getByRole('button', { name: 'مراجعة التغيير', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /تحويل المخالفات غير المسددة/ }));
    review();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إلغاء العقد' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled', transferTrafficViolationsToCompany: true })));
  });

  it.each([{ blockedPenaltyCount: 1 }, { authorizedToTransfer: false }])('retains cancellation guards: %j', blocked => {
    impactQuery.mockReturnValue({ ...queryState, data: { ...emptyImpact, requiresCompanyTransfer: true, ...blocked } });
    renderStatus('active'); choose('ملغي'); enterReason();
    expect(screen.getByRole('button', { name: 'مراجعة التغيير', exact: true })).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('uses the legal reversal service after review and offers no ordinary legal exit', async () => {
    const { close } = renderStatus('under_legal_procedure');
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    choose('نشط'); enterReason(); review();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إنهاء الإجراء وإعادة التفعيل' }));
    await waitFor(() => expect(reverseLegal).toHaveBeenCalledWith({ contractId: 'contract-1', companyId: 'company-1', reason: 'سبب واضح لتغيير الحالة' }));
    expect(mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  });

  it('preserves the draft and reports an unsuccessful write inside the dialog', async () => {
    mutate.mockRejectedValueOnce(new Error('تعذر تنفيذ العملية'));
    const { close } = renderStatus('active'); choose('معلق'); enterReason(); review();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تعليق العقد' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تنفيذ العملية');
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'العودة للتعديل' }));
    expect(screen.getByRole('textbox')).toHaveValue('سبب واضح لتغيير الحالة');
    expect(screen.getByRole('radio', { name: 'معلق' })).toBeChecked();
  });

  it('closes a confirmed write even when the subsequent refresh fails', async () => {
    refresh.mockRejectedValueOnce(new Error('offline after commit'));
    const { close, updated } = renderStatus('active'); choose('معلق'); enterReason(); review();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد تعليق العقد' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    await waitFor(() => expect(warning).toHaveBeenCalledOnce());
    expect(updated).toHaveBeenCalledWith('suspended');
    expect(mutate).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks a changed background snapshot while retaining the reason', () => {
    const { rerender, contract, close } = renderStatus('active'); choose('معلق'); enterReason();
    rerender(<ContractStatusManagement open onOpenChange={close} contract={{ ...contract, status: 'cancelled' }} />);
    expect(screen.getByRole('textbox')).toHaveValue('سبب واضح لتغيير الحالة');
    expect(screen.getByRole('button', { name: 'مراجعة التغيير', exact: true })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('تغيرت بيانات العقد');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('confirms discarding an unsaved reason and choice', () => {
    const { close } = renderStatus('active'); choose('معلق'); enterReason();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق', exact: true }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'متابعة التعديل' }));
    expect(screen.getByRole('textbox')).toHaveValue('سبب واضح لتغيير الحالة');
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'تجاهل والخروج' }));
    expect(close).toHaveBeenCalledWith(false);
    expect(mutate).not.toHaveBeenCalled();
  });
});
