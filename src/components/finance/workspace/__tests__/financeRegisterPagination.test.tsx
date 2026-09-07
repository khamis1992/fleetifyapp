import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinanceRegisterPagination } from '../FinanceRegisterPagination';
import { useFinanceRegisterPage } from '../useFinanceRegisterPage';
describe('complete finance registers', () => {
  const rows = Array.from({ length: 61 }, (_, index) => index + 1);
  it('makes every record reachable, including the final partial page', () => {
    const hook = renderHook(() => useFinanceRegisterPage(rows, 'company-a'));
    expect(hook.result.current.rows).toEqual(rows.slice(0, 25));
    act(() => hook.result.current.setPage(3));
    expect(hook.result.current.rows).toEqual(rows.slice(50));
    expect(hook.result.current.total).toBe(61);
  });
  it('resets the page after company or search changes and clamps shrinking data', () => {
    const hook = renderHook(({ key, data }) => useFinanceRegisterPage(data, key), { initialProps: { key: 'company-a', data: rows } });
    act(() => hook.result.current.setPage(3));
    hook.rerender({ key: 'company-b', data: rows });
    expect(hook.result.current.page).toBe(1);
    act(() => hook.result.current.setPage(3));
    hook.rerender({ key: 'company-b', data: [1] });
    expect(hook.result.current.rows).toEqual([1]);
    expect(hook.result.current.page).toBe(1);
  });
  it('disables invalid navigation for empty and terminal pages', () => {
    function Register() { const state = useFinanceRegisterPage(rows, 'a'); return <FinanceRegisterPagination {...state} />; }
    render(<Register />);
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('3 من 3');
  });
});
