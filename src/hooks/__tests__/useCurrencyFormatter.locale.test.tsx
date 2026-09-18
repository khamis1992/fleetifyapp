import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCurrencyFormatter } from '../useCurrencyFormatter';

vi.unmock('@/hooks/useCurrencyFormatter');
vi.mock('@/hooks/useCompanyCurrency', () => ({ useCompanyCurrency: () => ({ currency: 'QAR', locale: 'ar-QA' }) }));

describe('currency presentation in the Arabic interface', () => {
  it('shows the Qatari currency in Arabic without changing the amount or precision', () => {
    const { result } = renderHook(useCurrencyFormatter);
    expect(result.current.formatCurrency(1234.5)).toContain('ر.ق');
    expect(result.current.formatCurrency(1234.5)).toContain('1,234.50');
    expect(result.current.formatCurrency(-1234.5)).toContain('-1,234.50');
    expect(result.current.formatCurrency(0)).toContain('0.00');
  });

  it('retains Arabic when callers override precision or currency', () => {
    const { result } = renderHook(useCurrencyFormatter);
    expect(result.current.formatCurrency(1234.5, { minimumFractionDigits: 0 })).toContain('ر.ق');
    expect(result.current.formatCurrency(1.234, { currency: 'KWD' })).toContain('1.234');
    expect(result.current.formatCurrency(1.234, { currency: 'KWD' })).toContain('د.ك');
  });

  it('honors an explicitly requested locale for exported documents', () => {
    const { result } = renderHook(useCurrencyFormatter);
    expect(result.current.formatCurrency(1234.5, { currency: 'USD', locale: 'en-US' })).toBe('$1,234.50');
  });
});
