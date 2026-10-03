import { Blob as NodeBlob } from 'node:buffer';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { CustomerAccountStatement } from '../CustomerAccountStatement';
import type { Customer } from '@/types/customer';

const mocks = vi.hoisted(() => ({ hook: vi.fn(), retry: vi.fn(), write: vi.fn(), print: vi.fn(), csv: null as unknown }));
vi.mock('@/hooks/useCustomerAccountStatement', () => ({ useCustomerAccountStatement: mocks.hook }));
vi.mock('@/hooks/useCompanyCurrency', () => ({ useCompanyCurrency: () => ({ currency: 'QAR', locale: 'ar-QA' }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const customer = { id: 'customer-a', customer_code: 'CODE-A', customer_type: 'individual', first_name: 'عميل', last_name: 'اختبار' } as Customer;
const records = [
  { transaction_id: 'old-invoice', transaction_date: '2026-01-01', transaction_type: 'invoice', description: 'حركة سابقة', reference_number: 'OLD', debit_amount: 70, credit_amount: 0 },
  { transaction_id: 'period-invoice', transaction_date: '2026-02-01', transaction_type: 'invoice', description: 'حركة الفترة', reference_number: 'PERIOD', debit_amount: 200, credit_amount: 0 },
  { transaction_id: 'period-payment', transaction_date: '2026-02-02', transaction_type: 'payment', description: 'سداد الفترة', reference_number: 'PAY', debit_amount: 0, credit_amount: 25 },
];
const csvRows = (csv: string) => {
  const parsed = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), { skipEmptyLines: true });
  expect(parsed.errors).toEqual([]);
  return parsed.data;
};
describe('customer statement period balance disclosure', () => {
  beforeEach(() => {
    mocks.write.mockClear(); mocks.print.mockClear(); mocks.csv = null; mocks.hook.mockReset();
    mocks.hook.mockImplementation(({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
      let movement = 0;
      const data = records.filter(row => (!dateFrom || row.transaction_date >= dateFrom) && (!dateTo || row.transaction_date <= dateTo))
        .map(row => ({ ...row, source_table: row.transaction_type === 'invoice' ? 'invoices' : 'payments',
          running_balance: movement += row.debit_amount - row.credit_amount }));
      return { data, isLoading: false, error: null, refetch: mocks.retry };
    });
    vi.stubGlobal('Blob', NodeBlob);
    const BaseURL = URL;
    vi.stubGlobal('URL', class extends BaseURL {
      static createObjectURL(blob: unknown) { mocks.csv = blob; return 'blob:synthetic-statement'; }
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockReturnValue({ document: { write: mocks.write, close: vi.fn() }, print: mocks.print } as unknown as Window);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('retains the actual period movements and carries their basis into CSV and printed PDF content without an invented opening row', async () => {
    render(<CustomerAccountStatement customer={customer} />);
    fireEvent.click(screen.getByRole('button', { name: 'فلترة' }));
    fireEvent.change(screen.getByLabelText('من تاريخ'), { target: { value: '2026-02-01' } });
    expect(screen.getByRole('note')).toHaveTextContent('لا يشمل الحركات السابقة');
    expect(screen.getByText('صافي حركة الفترة')).toBeInTheDocument();
    expect(screen.queryByText('حركة سابقة')).not.toBeInTheDocument();
    expect(screen.getByText('حركة الفترة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تصدير CSV' }));
    const csv = await (mocks.csv as NodeBlob).text();
    expect(csv).toContain('لا يمثل رصيدًا افتتاحيًا أو مصادقة');
    const rows = csvRows(csv);
    expect(rows).toHaveLength(4);
    expect(rows[2].slice(-3)).toEqual(['200','0','200']);
    expect(rows[3].slice(-3)).toEqual(['0','25','175']);
    expect(csv).not.toContain('OLD'); expect(csv).not.toContain('245');
    fireEvent.click(screen.getByRole('button', { name: 'طباعة' }));
    const html = mocks.write.mock.calls[0][0] as string;
    const doc = new DOMParser().parseFromString(html,'text/html');
    expect(doc.body.textContent).toContain('لا يشمل الحركات السابقة');
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(3); // Two source movements and their totals.
    expect(doc.body.textContent).not.toContain('حركة سابقة');
    expect(mocks.print).toHaveBeenCalledOnce();
  });
  it('does not label a date-to-only report as having an omitted opening period', async () => {
    render(<CustomerAccountStatement customer={customer} />);
    fireEvent.click(screen.getByRole('button', { name: 'فلترة' }));
    fireEvent.change(screen.getByLabelText('إلى تاريخ'), { target: { value: '2026-02-28' } });
    expect(screen.getByRole('note')).not.toHaveTextContent('لا يشمل الحركات السابقة');
    expect(screen.getByText('الرصيد الصافي')).toBeInTheDocument();
    expect(screen.getByText('حركة سابقة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تصدير CSV' }));
    const csv = await (mocks.csv as NodeBlob).text();
    expect(csv).toContain('OLD'); expect(csvRows(csv).at(-1)?.at(-1)).toBe('245');
  });
  it('prints stored markup as literal text and protects CSV formulas without corrupting quoted fields or signed amounts', async () => {
    const hostileName = '</title><script>alert("name")</script><img src=x onerror="alert(1)">';
    const description = ' =HYPERLINK("https://example.test","<img onerror=alert(2)>")\nتفصيل, إضافي';
    const reference = '+SUM(1,2), "مرجع"<script>alert("ref")</script>';
    mocks.hook.mockReturnValue({
      data: [{ ...records[2], description, reference_number: reference, running_balance: -25, source_table: 'payments' }],
      isLoading: false, error: null, refetch: mocks.retry,
    });
    render(<CustomerAccountStatement customer={{ ...customer, first_name: hostileName, last_name: '', customer_code: '<img src=x onerror=alert(3)>' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'طباعة' }));
    const doc = new DOMParser().parseFromString(mocks.write.mock.calls[0][0] as string, 'text/html');
    expect(doc.querySelectorAll('script,img,[onerror]')).toHaveLength(0);
    expect(doc.title).toContain(hostileName);
    expect(doc.querySelector('h2')?.textContent).toContain(hostileName);
    expect(doc.body.textContent).toContain('<img src=x onerror=alert(3)>');
    expect(doc.querySelectorAll('tbody tr')[0].children[2].textContent).toBe(description);
    expect(doc.querySelectorAll('tbody tr')[0].children[3].textContent).toBe(reference);
    fireEvent.click(screen.getByRole('button', { name: 'تصدير CSV' }));
    const rows = csvRows(await (mocks.csv as NodeBlob).text());
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveLength(7);
    expect(rows[2][2]).toBe(`'${description}`);
    expect(rows[2][3]).toBe(`'${reference}`);
    expect(rows[2].slice(-3)).toEqual(['0', '25', '-25']);
  });
});

