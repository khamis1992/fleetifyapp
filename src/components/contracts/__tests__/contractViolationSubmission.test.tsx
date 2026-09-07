import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddViolationDialog, ContractViolationsTabRedesigned } from '../ContractViolationsTabRedesigned';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/hooks/useTrafficViolationPayments', () => ({ useCreateTrafficViolationPayment: () => ({ isPending: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(cleanup);

const amount = () => screen.getByRole('spinbutton', { name: 'قيمة الغرامة (ر.ق) *' });
const submit = () => screen.getByRole('button', { name: 'إضافة المخالفة', exact: true });

describe('contract violation submission', () => {
  it('starts inside an expired contract and rejects a date before it began', () => {
    const onAdd = vi.fn();
    render(<AddViolationDialog open onClose={vi.fn()} onAdd={onAdd} contractStartDate="2023-01-31" contractEndDate="2026-01-31" />);
    expect(screen.getByLabelText('تاريخ المخالفة')).toHaveValue('2026-01-31');
    fireEvent.change(amount(), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('تاريخ المخالفة'), { target: { value: '2022-01-01' } });
    fireEvent.click(submit());
    expect(screen.getByRole('alert')).toHaveTextContent('ضمن مدة العقد');
    expect(onAdd).not.toHaveBeenCalled();
  });
  it('requires a valid date and amount before calling the command', () => {
    const onAdd = vi.fn();
    render(<AddViolationDialog open onClose={vi.fn()} onAdd={onAdd} />);
    fireEvent.click(submit());
    expect(screen.getByRole('alert')).toHaveTextContent('أدخل تاريخ المخالفة');
    fireEvent.change(amount(), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('تاريخ المخالفة'), { target: { value: '' } });
    fireEvent.click(submit());
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('keeps the form and request identity after a database error and does not implicitly notify', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce({ message: 'لا تملك صلاحية تسجيل المخالفة' }).mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AddViolationDialog open onClose={onClose} onAdd={onAdd} />);
    fireEvent.change(amount(), { target: { value: '120' } });
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية تسجيل المخالفة');
    expect(amount()).toHaveValue(120);
    expect(onClose).not.toHaveBeenCalled();
    const request = onAdd.mock.calls[0][0];
    expect(request.notify_customer).toBe(false);
    fireEvent.click(submit());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[1][0]).toEqual(request);
  });

  it('blocks repeat clicks, edits and dismissal until save finishes, and honors an explicit notification choice', async () => {
    let finish!: () => void;
    const onAdd = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    render(<AddViolationDialog open onClose={onClose} onAdd={onAdd} />);
    fireEvent.change(amount(), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'إرسال إشعار واتساب للعميل بعد الحفظ' }));
    fireEvent.click(submit());
    fireEvent.click(screen.getByRole('button', { name: 'جاري الإضافة...' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(amount()).toBeDisabled();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0].notify_customer).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe('contract violation cancellation', () => {
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ContractViolationsTabRedesigned violations={[{ id: 'v1', violation_number: 'QA-1', violation_date: '2025-06-01',
      violation_type: 'speeding', fine_amount: 120, status: 'pending', created_at: '2025-06-01' }]} formatCurrency={String} />
  </QueryClientProvider>);
  it.each([
    [{data: null,error:{message:'TRAFFIC_VIOLATION_HAS_RECOGNIZED_LIABILITY'}},'التزام محاسبي'],
    [{data:{ok:true,status:'cancelled',violation_id:'another'},error:null},'لم يكتمل'],
  ])('keeps a failed or mismatched cancellation visible for review', async (response, message) => {
    rpc.mockReset().mockResolvedValue(response);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء المخالفة QA-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الإلغاء' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('dialog', { name: 'إلغاء المخالفة' })).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
