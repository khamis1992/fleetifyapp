import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { financeNavigation, allFinanceDestinations, filterFinanceNavigation, findFinanceDestination } from '../financeNavigation';
import { FinanceSidebarNavigation } from '../FinanceSidebarNavigation';
vi.mock('../useFinanceNavigation', () => ({ useFinanceNavigation: () => ({ groups: financeNavigation, searchGroups: filterFinanceNavigation({admin:true,superAdmin:true,permissions:new Set()}, true), language: 'ar', isLoading: false }) }));

describe('financial navigation', () => {
  it('gives every destination a distinct id and URL with one active match', () => {
    const items = allFinanceDestinations;
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    expect(new Set(items.map(item => item.href)).size).toBe(items.length);
    for (const item of items) {
      const url = new URL(item.href, 'https://preview.test');
      expect(findFinanceDestination(url.pathname, url.search)?.item.id).toBe(item.id);
    }
  });
  it.each([
    ['/finance/accounting', '', 'chart'],
    ['/finance/billing', '', 'invoices'],
    ['/finance/treasury/', '', 'treasury'],
    ['/finance/reports-analysis', '', 'report-trial-balance'],
    ['/finance/accounting', '?tab=entries&action=new', 'entries'],
    ['/finance/reports-analysis', '?tab=analysis&report=balance-sheet', 'analysis'],
  ])('resolves defaults and ignores unrelated parameters: %s%s', (path, search, id) => {
    expect(findFinanceDestination(path, search)?.item.id).toBe(id);
  });
  it('hides unauthorized items and empty groups', () => {
    expect(filterFinanceNavigation({ admin: false, superAdmin: false, permissions: new Set() })).toEqual([]);
    const groups = filterFinanceNavigation({ admin: false, superAdmin: false, permissions: new Set(['finance.treasury.view']) });
    expect(groups.map(group => group.id)).toEqual(['treasury']);
    expect(groups[0].items.map(item => item.id)).toEqual(['treasury', 'bank-reconciliation']);
  });
  it('does not show super-admin settings to company admins', () => {
    const items = filterFinanceNavigation({ admin: true, superAdmin: false, permissions: new Set() }).flatMap(group => group.items);
    expect(items.some(item => item.id === 'vendors')).toBe(true);
    expect(items.some(item => item.superAdmin)).toBe(false);
  });
  it('opens the current group and marks its exact report link', () => {
    render(<MemoryRouter initialEntries={['/finance/reports-analysis?tab=reports&report=balance-sheet']}><FinanceSidebarNavigation /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'التقارير والتحليل' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'مكتبة التقارير' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getAllByRole('link').filter(link => !!link.getAttribute('aria-current'))).toHaveLength(1);
  });
  it('searches hidden subsections in Arabic and English and supports navigation', () => {
    const onNavigate = vi.fn();
    render(<MemoryRouter initialEntries={['/finance/overview']}><FinanceSidebarNavigation onNavigate={onNavigate} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'reconciliation' } });
    const link = screen.getByRole('link', { name: 'التسوية البنكية' });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'تصنيفات' } });
    expect(screen.getByRole('link', { name: 'تصنيفات الموردين' })).toBeVisible();
  });
  it('keeps just one sidebar group expanded outside search', () => {
    render(<MemoryRouter initialEntries={['/finance/invoices']}><FinanceSidebarNavigation /></MemoryRouter>);
    expect(screen.getByRole('button', {name: 'الفوترة والتحصيل'})).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'المحاسبة العامة'}));
    expect(screen.getByRole('button', {name: 'الفوترة والتحصيل'})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button').filter(button => button.getAttribute('aria-expanded') === 'true')).toHaveLength(1);
    expect(financeNavigation).toHaveLength(9);
  });
  it('never exposes restricted tools through search', () => {
    const groups = filterFinanceNavigation({admin: false, superAdmin: false, permissions: new Set(['finance.invoices.view'])}, true);
    const items = groups.flatMap(group => group.items);
    expect(items.some(item => item.id === 'payments')).toBe(true);
    expect(items.some(item => item.id === 'scanner' || item.id === 'register' || item.id === 'excel-import')).toBe(false);
  });
  it('renders accessible group links while collapsed', () => {
    const { container } = render(<MemoryRouter><FinanceSidebarNavigation collapsed /></MemoryRouter>);
    expect(within(container).queryByRole('textbox')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(financeNavigation.length);
    expect(screen.getByRole('link', { name: 'الخزينة' })).toHaveAttribute('href', '/finance/treasury');
  });
  it('restores every group when collapsing a filtered menu', () => {
    const view = render(<MemoryRouter><FinanceSidebarNavigation /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ميزان' } });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    view.rerender(<MemoryRouter><FinanceSidebarNavigation collapsed /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(financeNavigation.length);
  });
});
