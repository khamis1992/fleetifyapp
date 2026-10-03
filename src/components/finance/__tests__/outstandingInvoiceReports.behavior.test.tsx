import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PayablesReport } from '../PayablesReport';
import { ReceivablesReport } from '../ReceivablesReport';

const mocks = vi.hoisted(() => ({ query: {} as Record<string, unknown>, print: vi.fn(), retry: vi.fn() }));
vi.mock('@/hooks/useFinancialReportsExport', () => ({ usePayablesReport: () => mocks.query, useReceivablesReport: () => mocks.query, exportToHTML: mocks.print }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (amount: number) => `${amount.toFixed(2)} QAR` }) }));

const metadata = { asOf: '2026-09-30', description: 'أرصدة الفواتير الحالية وقت القراءة؛ لا يعيد هذا الكشف بناء رصيد تاريخي من السداد.', retrievedAt: '2026-09-30T20:10:00Z' };
const invoice = { invoice_id: 'i1', invoice_number: 'INV-1', customer_name: '<script>customer</script>', vendor_name: '<script>vendor</script>', amount: 123.45, due_date: '2026-09-01', overdue_days: 29, status: 'متأخر' };

describe.each([{ name: 'receivables', Component: ReceivablesReport }, { name: 'payables', Component: PayablesReport }])('$name invoice report integration', ({ Component }) => {
  beforeEach(() => {
    mocks.print.mockClear(); mocks.retry.mockClear();
    mocks.query = { data: [invoice], isLoading: false, isFetching: false, isError: false, error: null, refetch: mocks.retry, reportMetadata: metadata };
  });

  it('shows a source failure explicitly instead of declaring that no balances exist', () => {
    mocks.query = { ...mocks.query, data: undefined, isError: true, error: new Error('source read denied') };
    render(<Component companyName="company" />);
    expect(screen.getByRole('alert')).toHaveTextContent('source read denied');
    expect(screen.queryByText(/لا توجد حسابات/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تحميل التقرير' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(mocks.retry).toHaveBeenCalledOnce();
    expect(mocks.print).not.toHaveBeenCalled();
  });

  it('blocks export while refreshing even when an older successful dataset remains visible', () => {
    mocks.query = { ...mocks.query, isFetching: true };
    render(<Component />);
    const button = screen.getByRole('button', { name: 'تحميل التقرير' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.print).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('جاري تحديث');
  });

  it('passes the cutoff/current-balance metadata to printing and preserves cents', () => {
    render(<Component companyName="company" />);
    expect(screen.getByText('2026-09-30')).toBeInTheDocument();
    expect(screen.getByText(metadata.description)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تحميل التقرير' }));
    expect(mocks.print).toHaveBeenCalledOnce();
    expect(mocks.print.mock.calls[0][3]).toEqual(metadata);
    expect(mocks.print.mock.calls[0][0]).toContain('123.45 QAR');
    expect(mocks.print.mock.calls[0][0]).not.toContain('<script>');
  });

  it('shows empty balances only after a successful empty read and retains the scope note', () => {
    mocks.query = { ...mocks.query, data: [] };
    render(<Component />);
    expect(screen.getByText(/لا توجد حسابات/)).toBeInTheDocument();
    expect(screen.getByText(metadata.description)).toBeInTheDocument();
  });
});
