import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { Contract } from '@/types/contracts';
import { FinancialDashboard } from '../FinancialDashboard';
import { ContractHero } from '../contract-details-v3/ContractHero';
import { buildContractFinancialSnapshotV3 } from '../contract-details-v3/tokens';

// Test real financial UI text; chart dimensions/animations are not the subject.
vi.mock('recharts', () => ({ ResponsiveContainer: () => null, PieChart: () => null, Pie: () => null, Cell: () => null, Tooltip: () => null }));
afterEach(cleanup);
const money = (amount: number) => `QAR ${amount.toFixed(2)}`;
const contract = { contract_number: 'TEST', status: 'active', contract_amount: 1500,
  monthly_amount: 1500, start_date: '2026-01-01', end_date: '2026-12-31' } as Contract;
const snapshot = (paid = 1500, total = 1500) => buildContractFinancialSnapshotV3([], [{
  id: 'payment', amount: paid, payment_status: 'completed', payment_date: '2026-01-01', payment_method: 'cash',
  financial_applications: [{ invoice_id: null, amount: paid }],
}], [], { ...contract, contract_amount: total, total_paid: Math.min(paid, total) });

describe('mounted contract financial summary', () => {
  it('does not round a fractional outstanding balance to fully settled', () => {
    render(<FinancialDashboard contract={contract} formatCurrency={money} snapshot={snapshot(1499.99)} />);
    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.queryByText('مسدد بالكامل')).not.toBeInTheDocument();
    expect(screen.queryByText('تم السداد')).not.toBeInTheDocument();
    expect(screen.getAllByText('QAR 0.01').length).toBeGreaterThan(0);
  });
  it('does not claim settlement in another tile while reconciliation is required', () => {
    render(<FinancialDashboard contract={contract} formatCurrency={money} snapshot={{ ...snapshot(), financialReviewRequired: true }} />);
    expect(screen.getAllByText('يحتاج مطابقة').length).toBeGreaterThan(0);
    expect(screen.queryByText('تم السداد')).not.toBeInTheDocument();
  });
  it('does not call an unknown zero contract settled', () => {
    render(<FinancialDashboard contract={contract} formatCurrency={money} snapshot={snapshot(0, 0)} />);
    expect(screen.queryByText('تم السداد')).not.toBeInTheDocument();
    expect(screen.queryByText('مسدد بالكامل')).not.toBeInTheDocument();
  });
  it('keeps the attributed excess in the grand total instead of reporting the capped principal', () => {
    render(<FinancialDashboard contract={contract} formatCurrency={money} snapshot={snapshot(1700)} />);
    expect(screen.getByText('مبالغ إضافية')).toBeInTheDocument();
    const totalRow = screen.getByText('الإجمالي الكلي').closest('.flex.items-center.justify-between');
    expect(within(totalRow as HTMLElement).getByText('QAR 1700.00')).toBeInTheDocument();
  });
  it('the hero shows reconciliation instead of a stale paid-installment count and caps financial progress below 100', () => {
    const value = { ...snapshot(1499.99), financialReviewRequired: true };
    render(<ContractHero contract={contract} customerName="عميل الاختبار" vehicleName="مركبة الاختبار"
      totalAmount={1500} monthlyAmount={1500} paidAmount={1499.99} paidPayments={1} totalPayments={1}
      daysRemaining={100} progressPercentage={50} snapshot={value} formatCurrency={money}
      onBack={vi.fn()} onEdit={vi.fn()} onStatusClick={vi.fn()} onCustomerClick={vi.fn()} onVehicleClick={vi.fn()} />);
    expect(screen.getByText('بانتظار المطابقة')).toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
    expect(screen.getByText('99%')).toBeInTheDocument();
  });
});
