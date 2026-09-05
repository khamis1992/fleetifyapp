import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Invoice } from '@/types/finance.types';
import { EnhancedPaymentScheduleTabRedesigned } from '../EnhancedPaymentScheduleTabRedesigned';
import { buildContractFinancialSnapshotV3 } from '../contract-details-v3/tokens';

// Use real motion components; the global test stub forwards whileHover to DOM.
vi.unmock('framer-motion');

const money = (amount: number) => `QAR ${amount.toFixed(2)}`;
const source = { id: 's', installment_number: 1, status: 'paid', amount: 1500, paid_amount: 1500, due_date: '2026-01-01', invoice_id: 'i' };
const snapshot = (paid: number, options: { cancelled?: boolean; unlinked?: boolean; invalidDate?: boolean; duplicate?: boolean; service?: boolean; scheduleStatus?: string } = {}) => {
  const invoices = [{ id: 'i', invoice_number: 'INV-1', invoice_month: '2026-01-01', invoice_date: '2026-01-01',
    due_date: '2026-01-01', invoice_type: options.service ? 'service' : 'sales', total_amount: 1500, paid_amount: paid, balance_due: 1500 - paid, status: 'sent', payment_status: 'partial' }] as Invoice[];
  const schedules = [{ ...source, status: options.scheduleStatus ?? source.status, invoice_id: options.unlinked ? null : 'i', due_date: options.invalidDate ? '2026-02-30' : source.due_date }];
  if (options.duplicate) schedules.push({ ...source, id: 's2', installment_number: 2 });
  return buildContractFinancialSnapshotV3(invoices, [{ id: 'p', amount: paid, payment_status: options.cancelled ? 'cancelled' : 'completed',
    payment_date: '2026-01-02', payment_method: 'cash', financial_applications: [{ invoice_id: 'i', amount: paid }] }], schedules,
  { contract_amount: 1500, monthly_amount: 1500, total_paid: paid, start_date: '2026-01-01', end_date: '2026-01-31' });
};
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-02-01T12:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const show = (value = snapshot(500)) => render(<EnhancedPaymentScheduleTabRedesigned snapshot={value} formatCurrency={money} />);
describe('mounted reconciled installment tab', () => {
  it.each(['inactive', 'reversed'])('does not display an inactive %s installment as outstanding', (scheduleStatus) => {
    show(snapshot(500, { scheduleStatus }));
    expect(screen.queryByText('القسط 1')).not.toBeInTheDocument();
    expect(screen.queryByText(/المتبقي: QAR 1000.00/)).not.toBeInTheDocument();
  });
  it('shows service rental partial payment and restores the original installment balance after cancellation', () => {
    const view = show(snapshot(500, { service: true }));
    fireEvent.click(screen.getByRole('button', { name: /^جزئي/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    expect(screen.getByText(/المتبقي: QAR 1000.00/)).toBeInTheDocument();
    view.rerender(<EnhancedPaymentScheduleTabRedesigned snapshot={snapshot(500, { service: true, cancelled: true })} formatCurrency={money} />);
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^متأخر/ }));
    expect(screen.getAllByText('القسط 1')).toHaveLength(1);
    expect(screen.getByText(/المتبقي: QAR 1500.00/)).toBeInTheDocument();
  });
  it('does not retain the cancelled receipt in the paid filter', () => {
    show(snapshot(1500, { cancelled: true }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^مدفوع/ }));
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^متأخر/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
  });
  it('partial overdue totals and filters use only the remaining 1000, not the full 1500', () => {
    show();
    const metric = screen.getByText('المتأخر').closest('.rounded-2xl');
    expect(within(metric as HTMLElement).getByText('QAR 1000.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^جزئي/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    expect(screen.getByText(/المتبقي: QAR 1000.00/)).toBeInTheDocument();
  });
  it('opens real installment details instead of logging a row', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'عرض بطاقات الأقساط' }));
    fireEvent.click(screen.getByRole('button', { name: 'عرض التفاصيل' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('المسدد: QAR 500.00')).toBeInTheDocument();
    expect(within(dialog).getByText('المتبقي: QAR 1000.00')).toBeInTheDocument();
  });
  it('does not keep stale settlement in an open dialog after a refresh cancels the receipt', () => {
    const view = show();
    fireEvent.click(screen.getByRole('button', { name: 'عرض بطاقات الأقساط' }));
    fireEvent.click(screen.getByRole('button', { name: 'عرض التفاصيل' }));
    view.rerender(<EnhancedPaymentScheduleTabRedesigned snapshot={snapshot(500, { cancelled: true })} formatCurrency={money} />);
    expect(within(screen.getByRole('dialog')).getByText('المسدد: QAR 0.00')).toBeInTheDocument();
  });
  it('keeps undated, unlinked installments visible for review and never implies they are all paid', () => {
    show(snapshot(1500, { unlinked: true, invalidDate: true }));
    expect(screen.getByText('توجد أقساط تحتاج مطابقة قبل تحديد القسط المستحق.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^يحتاج مطابقة/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    expect(screen.getByText('تاريخ استحقاق القسط غير صالح.')).toBeInTheDocument();
  });
  it('retains both duplicate-month installments for review', () => {
    show(snapshot(1500, { duplicate: true }));
    fireEvent.click(screen.getByRole('button', { name: /^يحتاج مطابقة/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    expect(screen.getByText('القسط 2')).toBeInTheDocument();
  });
  it('shows a genuinely settled installment as paid without creating a next due installment', () => {
    show(snapshot(1500));
    fireEvent.click(screen.getByRole('button', { name: /^مدفوع/ }));
    expect(screen.getByText('القسط 1')).toBeInTheDocument();
    expect(screen.getByText('لا توجد أقساط مفتوحة حالياً.')).toBeInTheDocument();
  });
  it('never rounds a sub-QAR remaining balance to 100 percent collection', () => {
    show(snapshot(1499.99));
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.getAllByText('99%').length).toBeGreaterThan(0);
  });
});
