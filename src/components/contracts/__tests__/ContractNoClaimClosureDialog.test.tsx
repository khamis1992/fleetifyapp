import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractNoClaimClosureDialog } from '../ContractNoClaimClosureDialog';
const mocks = vi.hoisted(() => ({ preview: vi.fn(), close: vi.fn(), preservePreview: vi.fn(), preserveClose: vi.fn(), toast: vi.fn() }));
vi.mock('@/services/contractFinancialIntegrity', () => ({ previewNoClaimClosure: mocks.preview, closeNoClaimClosure: mocks.close, previewScheduleClosure: mocks.preservePreview, closeScheduleClosure: mocks.preserveClose }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
const companyId = '22222222-2222-4222-8222-222222222222';
const contractId = '55555555-5555-4555-8555-555555555555';
const payload = { version: 1, company_id: companyId, contract_id: contractId, contract_number: 'C-TEST',
  contract_status: 'cancelled', eligible: true, blockers: [], canonical_paid: 11550, outstanding: 0,
  review_amount: 1650, schedule_count: 1, revision: 'a'.repeat(32), open_penalty_amount: 0, pending_payment_count: 0,
  schedules: [{ id: '11111111-1111-4111-8111-111111111111', due_date: '2025-05-01', amount: 1650, invoice_id: contractId, invoice_number: 'INV-CANCELLED', eligible: true }] };
const setup = () => {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ContractNoClaimClosureDialog companyId={companyId} contractId={contractId} formatCurrency={value => `${value} ر.ق.`} onClose={onClose} /></QueryClientProvider>);
  return { onClose };
};
describe('no-claim closure approval', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.preview.mockResolvedValue(payload); });
  it('requires a reason and explicit acknowledgement before submitting the reviewed scope', async () => {
    mocks.close.mockResolvedValue({ closed_count: 1, canonical_paid: 11550, replayed: false });
    const { onClose } = setup();
    expect(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' })).toBeDisabled();
    expect(await screen.findByText('INV-CANCELLED')).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveAttribute('dir', 'rtl');
    fireEvent.change(screen.getByLabelText('سبب الإقفال'), { target: { value: 'العقد ملغي ولا توجد عليه مطالبات حالية.' } });
    expect(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mocks.close).toHaveBeenCalledWith(expect.objectContaining({ companyId, contractId, revision: payload.revision, reason: 'العقد ملغي ولا توجد عليه مطالبات حالية.', requestId: expect.any(String) }));
  });
  it('shows server blockers and prevents approval when there is a real outstanding invoice', async () => {
    mocks.preview.mockResolvedValue({ ...payload, eligible: false, outstanding: 100, blockers: ['توجد فواتير مفتوحة؛ يجب تسويتها أولًا.'] });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('توجد فواتير مفتوحة');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' })).toBeDisabled();
    expect(mocks.close).not.toHaveBeenCalled();
  });
  it('preserves the request key on retry after an uncertain error and never reports success', async () => {
    mocks.close.mockRejectedValue(new Error('تعذر استلام نتيجة الطلب؛ أعد المحاولة.'));
    const { onClose } = setup();await screen.findByText('INV-CANCELLED');
    fireEvent.change(screen.getByLabelText('سبب الإقفال'), { target: { value: 'العقد ملغي ولا توجد مطالبات حالية.' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر استلام نتيجة');
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' }));
    await waitFor(() => expect(mocks.close).toHaveBeenCalledTimes(2));
    expect(mocks.close.mock.calls[0][0].requestId).toBe(mocks.close.mock.calls[1][0].requestId);
    expect(onClose).not.toHaveBeenCalled();expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('permits schedule-only approval after explicitly acknowledging preserved invoices and penalties', async () => {
    mocks.preview.mockResolvedValue({ ...payload, eligible: false, outstanding: 150, open_penalty_amount: 500, blockers: ['توجد فواتير مفتوحة'] });
    mocks.preservePreview.mockResolvedValue({ ...payload, closure_mode: 'preserve_claims', outstanding: 150, open_penalty_amount: 500, revision: 'b'.repeat(32) });
    mocks.preserveClose.mockResolvedValue({ closure_mode: 'preserve_claims', closed_count: 1, canonical_paid: 11550, retained_invoice_amount: 150, retained_penalty_amount: 500, replayed: false });
    const { onClose } = setup();
    await screen.findByText('توجد فواتير مفتوحة');
    fireEvent.click(screen.getByRole('button', { name: 'إقفال الأقساط مع إبقاء المطالبات', exact: true }));
    expect(await screen.findByLabelText('المطالبات الباقية بعد الإقفال')).toHaveTextContent('150 ر.ق.');
    expect(screen.getByLabelText('المطالبات الباقية بعد الإقفال')).toHaveTextContent('500 ر.ق.');
    const approve = screen.getByRole('button', { name: 'اعتماد إقفال الأقساط مع إبقاء المطالبات' });
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByLabelText('سبب الإقفال'), { target: { value: 'إقفال الأقساط الملغاة مع إبقاء رصيد الفاتورة والمخالفة.' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(approve);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mocks.close).not.toHaveBeenCalled();
    expect(mocks.preserveClose).toHaveBeenCalledWith(expect.objectContaining({ companyId, contractId, revision: 'b'.repeat(32) }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('بقي رصيد الفواتير 150 ر.ق.') }));
  });
  it('clears acknowledgement when switching decision modes, including a return to a cached preview', async () => {
    mocks.preservePreview.mockResolvedValue({ ...payload, closure_mode: 'preserve_claims', revision: 'b'.repeat(32) });
    setup(); await screen.findByText('INV-CANCELLED');
    fireEvent.change(screen.getByLabelText('سبب الإقفال'), { target: { value: 'الأقساط الملغاة غير مستحقة بعد إلغاء العقد.' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'إقفال الأقساط مع إبقاء المطالبات', exact: true }));
    await screen.findByLabelText('المطالبات الباقية بعد الإقفال');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'اعتماد إقفال الأقساط مع إبقاء المطالبات' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'إقفال بلا مطالبات', exact: true }));
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
    expect(screen.getByRole('button', { name: 'اعتماد الإقفال بلا مطالبات' })).toBeDisabled();
    expect(mocks.close).not.toHaveBeenCalled();expect(mocks.preserveClose).not.toHaveBeenCalled();
  });
});
