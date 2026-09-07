import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinancialIntegrityPanel } from '@/components/finance/FinancialIntegrityPanel';
const state = vi.hoisted(() => ({ value: {} as Record<string, unknown>, refetch: vi.fn() }));
vi.mock('@/hooks/finance/useFinancialIntegrityReport', () => ({ useFinancialIntegrityReport: () => ({ ...state.value, refetch: state.refetch }) }));
describe('financial integrity result states', () => {
  it('does not display successful zero counts while loading', () => {
    state.value = { isLoading: true };
    render(<FinancialIntegrityPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('جاري فحص');
    expect(screen.queryByText('دفعات بلا قيد')).toBeNull();
  });
  it('hides stale success on failure and offers retry', () => {
    state.value = { error: new Error('denied'), data: { status: 'healthy' } };
    render(<FinancialIntegrityPanel />);
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText('سليم')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(state.refetch).toHaveBeenCalled();
  });
  it('does not present zero counts when the database control is unavailable', () => {
    state.value = { data: { status: 'needs_attention', issues: [{ code: 'financial_controls_migration_not_applied', count: 1 }] } };
    render(<FinancialIntegrityPanel />);
    expect(screen.getByText('طبقة الحماية غير مطبقة على قاعدة البيانات')).toBeVisible();
    expect(screen.queryByText('دفعات بلا قيد')).toBeNull();
  });
});
