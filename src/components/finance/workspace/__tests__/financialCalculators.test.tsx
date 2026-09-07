import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Calculator from '@/pages/finance/FinancialCalculatorsPanel';
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (value: number) => value.toFixed(2) }) }));
vi.mock('@/hooks/useCompanyCurrency', () => ({ useCompanyCurrency: () => ({ currency: 'QAR' }) }));
describe('financial calculator inputs and results', () => {
  it('supports a zero-interest loan and accessible input labels', () => {
    render(<Calculator />);
    fireEvent.change(screen.getByLabelText('مبلغ القرض (ر.ق)'), { target: { value: '12000' } });
    fireEvent.change(screen.getByLabelText('مدة القرض (سنوات)'), { target: { value: '1' } });
    expect(screen.getByText('1000.00')).toBeVisible();
    expect(screen.getByText('12000.00')).toBeVisible();
    expect(screen.getByText('0.00')).toBeVisible();
  });
  it('limits first-year depreciation to cost minus salvage', () => {
    render(<Calculator />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'الإهلاك' }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('تكلفة الأصل (ر.ق)'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('القيمة المتبقية (ر.ق)'), { target: { value: '200' } });
    expect(screen.getByText('800.00')).toBeVisible();
    expect(screen.getByText('200.00')).toBeVisible();
    fireEvent.change(screen.getByLabelText('القيمة المتبقية (ر.ق)'), { target: { value: '1500' } });
    expect(screen.getByText('1000.00')).toBeVisible();
    expect(screen.queryByText('-500.00')).toBeNull();
  });
});
