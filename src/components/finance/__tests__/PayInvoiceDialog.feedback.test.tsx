import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PayInvoiceDialog } from '../PayInvoiceDialog';
import { Toaster } from '@/components/ui/toaster';
import { useToast, toast } from '@/hooks/use-toast';
import { useToast as legacyUseToast, toast as legacyToast } from '@/hooks/use-toast-mock';
import { PaymentRecordedReadError } from '@/services/paymentCommitResult';

const { mutateAsync, feeUpdate, feeInsert, feeRows, from, eqCalls, readState, access } = vi.hoisted(() => ({
  mutateAsync: vi.fn(), feeUpdate: vi.fn(), feeInsert: vi.fn(), from: vi.fn(),
  eqCalls: vi.fn(),
  access: { companyId: 'company-fixture', isInitializing: false },
  readState: {
    feeError: null as unknown,
    allocationError: null as unknown,
    pendingFees: null as Promise<{ data: unknown[]; error: unknown }> | null,
    allocations: [] as { target_id: string; amount: number }[],
  },
  feeRows: [] as { id: string; status: string; fee_amount: number }[],
}));
vi.mock('@/hooks/usePayments.unified', () => ({ useCreatePayment: () => ({ mutateAsync, isPending: false }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => access }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (n: number) => `${n} QAR` }) }));
vi.mock('@/components/tour-guide', () => ({ useTourGuide: () => ({ startTour: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

let client: QueryClient;
const invoice = {
  id: 'invoice-fixture', invoice_number: 'INV-FIXTURE', company_id: 'company-fixture',
  contract_id: 'contract-fixture', customer_id: 'customer-fixture', total_amount: 1500,
  paid_amount: 0, balance_due: 1500, payment_status: 'unpaid', due_date: '2099-01-01',
};
beforeEach(() => {
  vi.clearAllMocks();
  feeRows.splice(0);
  readState.feeError = null;
  readState.allocationError = null;
  readState.pendingFees = null;
  readState.allocations = [];
  access.companyId = 'company-fixture';
  access.isInitializing = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const { result, unmount } = renderHook(() => useToast());
  act(() => result.current.dismiss());
  unmount();
  from.mockImplementation((table: string) => {
    const read = table === 'late_fees' && readState.pendingFees
      ? readState.pendingFees
      : Promise.resolve({ data: table === 'late_fees' ? [...feeRows] : readState.allocations,
          error: table === 'late_fees' ? readState.feeError : readState.allocationError });
    const chain = {
      select: () => chain, eq: (column: string, value: unknown) => { eqCalls(table, column, value); return chain; },
      in: () => chain, order: () => read,
      update: () => {
        const mutation = {
          eq: (column: string, value: unknown) => { eqCalls('waiver', column, value); return mutation; },
          in: () => mutation, select: () => mutation, single: feeUpdate,
        };
        return mutation;
      },
      insert: (payload: unknown) => ({ select: () => ({ single: () => feeInsert(payload) }) }),
      then: read.then.bind(read),
    };
    return chain;
  });
});
afterEach(() => { cleanup(); client.clear(); });

const mount = (props: Partial<React.ComponentProps<typeof PayInvoiceDialog>> = {}) => {
  const onOpenChange = vi.fn();
  render(<QueryClientProvider client={client}>
    <Toaster />
    <PayInvoiceDialog invoice={invoice} open onOpenChange={onOpenChange} {...props} />
  </QueryClientProvider>);
  return onOpenChange;
};

describe('invoice payment dialog uses visible feedback and preserves committed outcomes', () => {
  it('keeps legacy imports connected to the same real notification store', () => {
    expect(legacyUseToast).toBe(useToast);
    expect(legacyToast).toBe(toast);
  });
  it('shows a fee-waiver rejection in the actual toast renderer and keeps the fee', async () => {
    feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    feeUpdate.mockResolvedValue({ error: { message: 'ليس لديك صلاحية إعفاء الغرامة' } });
    mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
    await waitFor(() => expect(screen.getByText('مسجلة')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'إعفاء' }));
    expect(await screen.findByText('ليس لديك صلاحية إعفاء الغرامة')).toBeVisible();
    expect(screen.getByText('مسجلة')).toBeVisible();
    expect(screen.queryByText('تم إعفاء العميل من غرامة التأخير')).not.toBeInTheDocument();
    expect(feeUpdate).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('keeps the entered payment when the backend rejects it', async () => {
    mutateAsync.mockRejectedValue(new Error('الفترة المحاسبية مغلقة — اختبار'));
    const onOpenChange = mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    expect(await screen.findByText('الفترة المحاسبية مغلقة — اختبار')).toBeVisible();
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(1500);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('closes and refreshes a confirmed but unreadable payment; parent refresh rejects: %s', async (refreshFails) => {
    const paymentId = '11111111-1111-4111-8111-111111111111';
    mutateAsync.mockRejectedValue(new PaymentRecordedReadError(paymentId, invoice.company_id, new Error('read failed')));
    const refresh = refreshFails ? vi.fn().mockRejectedValue(new Error('parent read failed')) : vi.fn().mockResolvedValue(undefined);
    const onOpenChange = mount({ onPaymentCreated: refresh });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    expect(await screen.findByText('تم تسجيل الدفعة، وتعذر تحديث العرض')).toBeVisible();
    expect(screen.getByText(new RegExp(paymentId))).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('خطأ في تسجيل الدفع')).not.toBeInTheDocument();
  });

  it.each(['readable', 'unreadable'] as const)('does not reset or close another invoice when an old %s payment finishes', async (outcome) => {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: unknown) => void;
    mutateAsync.mockReturnValue(new Promise((done, fail) => { resolve = done; reject = fail; }));
    const onOpenChange = vi.fn();
    const refresh = vi.fn();
    const renderDialog = (current: typeof invoice) => <QueryClientProvider client={client}>
      <Toaster /><PayInvoiceDialog invoice={current} open onOpenChange={onOpenChange} onPaymentCreated={refresh} />
    </QueryClientProvider>;
    const view = render(renderDialog(invoice));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    view.rerender(renderDialog({ ...invoice, id: 'invoice-next', invoice_number: 'INV-NEXT' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('مبلغ الدفع'), { target: { value: '400' } });
    await act(async () => {
      if (outcome === 'readable') resolve({ id: 'committed-payment' });
      else reject(new PaymentRecordedReadError('11111111-1111-4111-8111-111111111111', invoice.company_id, new Error('read failure')));
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(400);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('does not describe a committed payment as failed if the parent refresh throws', async () => {
    mutateAsync.mockResolvedValue({ id: 'payment-fixture' });
    const refresh = vi.fn(() => { throw new Error('refresh failed'); });
    const onOpenChange = mount({ onPaymentCreated: refresh });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    expect(await screen.findByText('تم تسجيل الدفعة، وتعذر تحديث العرض')).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('خطأ في تسجيل الدفع')).not.toBeInTheDocument();
  });

  it('also handles an asynchronous refresh failure after a committed payment', async () => {
    mutateAsync.mockResolvedValue({ id: 'payment-fixture-async' });
    const refresh = vi.fn().mockRejectedValue(new Error('async read failed'));
    const onOpenChange = mount({ onPaymentCreated: refresh });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    expect(await screen.findByText('تم تسجيل الدفعة، وتعذر تحديث العرض')).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('خطأ في تسجيل الدفع')).not.toBeInTheDocument();
  });

  it('closes and runs the refresh once after successful recording', async () => {
    mutateAsync.mockResolvedValue({ id: 'payment-fixture-success' });
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = mount({ onPaymentCreated: refresh });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدفع' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it.each(['fee', 'allocation'] as const)('blocks collection when the %s read fails, then recovers by reading only', async (source) => {
    feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    if (source === 'fee') readState.feeError = { message: 'fee read unavailable' };
    else readState.allocationError = { message: 'allocation read unavailable' };
    mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
    expect(await screen.findByText(/تعذر التحقق من غرامات الفاتورة/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled();
    expect(screen.getByLabelText('مبلغ الدفع')).toBeDisabled();
    expect(screen.getAllByText('غير متحقق')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'إعفاء' })).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(feeUpdate).not.toHaveBeenCalled();
    readState.feeError = null;
    readState.allocationError = null;
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل الغرامات' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(4500);
    expect(eqCalls).toHaveBeenCalledWith('late_fees', 'company_id', 'company-fixture');
    expect(eqCalls).toHaveBeenCalledWith('payment_allocations', 'company_id', 'company-fixture');
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(feeUpdate).not.toHaveBeenCalled();
  });

  it('does not expose a calculated fee as verified while the read is pending', async () => {
    let finish!: (value: { data: unknown[]; error: unknown }) => void;
    readState.pendingFees = new Promise((resolve) => { finish = resolve; });
    mount();
    expect(screen.getByText(/جاري التحقق من غرامات الفاتورة/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'دفع كامل' })).toBeDisabled();
    await act(async () => { finish({ data: [], error: null }); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(1500);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('does not query or collect for an invoice owned by another company', () => {
    mount({ invoice: { ...invoice, company_id: 'other-company' } });
    expect(screen.getByText(/تعذر التحقق من غرامات الفاتورة/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled();
    expect(from).not.toHaveBeenCalled();
  });

  it('preserves a partial amount through a background read failure and retry', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('مبلغ الدفع'), { target: { value: '500' } });
    readState.feeError = { message: 'temporary read failure' };
    await act(async () => { await client.invalidateQueries({ queryKey: ['invoice-late-fees', invoice.id] }); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled());
    readState.feeError = null;
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل الغرامات' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeEnabled());
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(500);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { id: 'other-fee', company_id: 'company-fixture', invoice_id: 'invoice-fixture', status: 'waived' },
    { id: 'fee-fixture', company_id: 'other-company', invoice_id: 'invoice-fixture', status: 'waived' },
    { id: 'fee-fixture', company_id: 'company-fixture', invoice_id: 'other-invoice', status: 'waived' },
    { id: 'fee-fixture', company_id: 'company-fixture', invoice_id: 'invoice-fixture', status: 'applied' },
  ])(
    'does not announce a waiver without confirmation of the exact fee: %j', async (data) => {
      feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
      feeUpdate.mockResolvedValue({ data, error: null });
      mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
      await waitFor(() => expect(screen.getByText('مسجلة')).toBeVisible());
      fireEvent.click(screen.getByRole('button', { name: 'إعفاء' }));
      expect(await screen.findByText('تعذر تأكيد إعفاء الغرامة. أعد تحميل البيانات للتحقق قبل تكرار الطلب.')).toBeVisible();
      expect(screen.queryByText('تم إعفاء العميل من غرامة التأخير بنجاح')).not.toBeInTheDocument();
      expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(4500);
      expect(eqCalls).toHaveBeenCalledWith('waiver', 'company_id', 'company-fixture');
      expect(eqCalls).toHaveBeenCalledWith('waiver', 'invoice_id', invoice.id);
      expect(eqCalls).toHaveBeenCalledWith('waiver', 'id', 'fee-fixture');
      expect(feeUpdate).toHaveBeenCalledTimes(1);
      expect(mutateAsync).not.toHaveBeenCalled();
    },
  );

  it('keeps collection blocked if refreshing a confirmed waiver fails', async () => {
    feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    feeUpdate.mockImplementation(async () => {
      readState.feeError = { message: 'read unavailable after waiver' };
      return { data: { id: 'fee-fixture', company_id: 'company-fixture', invoice_id: invoice.id, status: 'waived' }, error: null };
    });
    mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
    await waitFor(() => expect(screen.getByText('مسجلة')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'إعفاء' }));
    expect(await screen.findByText('تم إعفاء الغرامة، وتعذر تحديث العرض')).toBeVisible();
    expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled();
    expect(feeUpdate).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('waits for company initialization without issuing queries or payments', () => {
    access.isInitializing = true;
    mount();
    expect(screen.getByRole('button', { name: 'تأكيد الدفع' })).toBeDisabled();
    expect(from).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('subtracts verified active fee allocations from the amount to collect', async () => {
    feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    readState.allocations = [{ target_id: 'fee-fixture', amount: 500 }, { target_id: 'fee-fixture', amount: 200 }];
    mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
    await waitFor(() => expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(3800));
    expect(eqCalls).toHaveBeenCalledWith('payment_allocations', 'is_active', true);
    expect(eqCalls).toHaveBeenCalledWith('payment_allocations', 'allocation_type', 'late_fee');
  });

  it.each(['persisted', 'calculated'] as const)('uses reloaded persisted evidence after a %s waiver', async (source) => {
    if (source === 'persisted') feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    const acknowledge = async () => {
      feeRows.splice(0, feeRows.length, { id: 'fee-fixture', status: 'waived', fee_amount: 3000 });
      return { data: { id: 'fee-fixture', company_id: 'company-fixture', invoice_id: invoice.id, status: 'waived' }, error: null };
    };
    feeUpdate.mockImplementation(acknowledge);
    feeInsert.mockImplementation(acknowledge);
    mount({ invoice: { ...invoice, due_date: '2020-01-01' } });
    await waitFor(() => expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(4500));
    fireEvent.click(screen.getByRole('button', { name: 'إعفاء' }));
    expect(await screen.findByText('تم إعفاء العميل من غرامة التأخير بنجاح')).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(1500));
    expect(source === 'persisted' ? feeUpdate : feeInsert).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('does not waive another invoice when a previous invoice waiver finishes late', async () => {
    let finish!: (value: unknown) => void;
    feeUpdate.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    feeRows.push({ id: 'fee-fixture', status: 'applied', fee_amount: 3000 });
    const first = { ...invoice, due_date: '2020-01-01' };
    const second = { ...first, id: 'invoice-second', invoice_number: 'INV-SECOND' };
    const renderDialog = (current: typeof first) => <QueryClientProvider client={client}>
      <Toaster /><PayInvoiceDialog invoice={current} open onOpenChange={vi.fn()} />
    </QueryClientProvider>;
    const view = render(renderDialog(first));
    await waitFor(() => expect(screen.getByText('مسجلة')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'إعفاء' }));
    feeRows.splice(0, feeRows.length, { id: 'fee-second', status: 'applied', fee_amount: 3000 });
    view.rerender(renderDialog(second));
    await waitFor(() => expect(eqCalls).toHaveBeenCalledWith('late_fees', 'invoice_id', second.id));
    await act(async () => { finish({ data: {
      id: 'fee-fixture', company_id: first.company_id, invoice_id: first.id, status: 'waived',
    }, error: null }); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'إعفاء' })).toBeEnabled());
    expect(screen.getByText('INV-SECOND')).toBeVisible();
    expect(screen.getByLabelText('مبلغ الدفع')).toHaveValue(4500);
    expect(screen.getByText('مسجلة')).toBeVisible();
    expect(feeUpdate).toHaveBeenCalledTimes(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
