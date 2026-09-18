import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardWorkspace, { type DashboardWorkspaceProps } from '../DashboardWorkspace';
import { dashboardRoute, fleetBreakdown, fleetGradient, formatDashboardCurrency, prioritizeActions } from '../model';

const fleet = { available: 92, rented: 61, maintenance: 3, reserved: 0, outOfService: 60, reservedEmployee: 1, accident: 1, stolen: 0, policeStation: 1, total: 219 };
function props(): DashboardWorkspaceProps {
  return {
    stats: { totalCustomers: 332, activeContracts: 47, monthlyRevenue: 41950, customersChange: '', revenueChange: '' },
    fleet, maintenance: [], refreshing: false,
    sources: { stats: { loading: false, error: false }, fleet: { loading: false, error: false }, decision: { loading: false, error: false }, maintenance: { loading: false, error: false } },
    onRefresh: vi.fn(), onNewContract: vi.fn(), onSearch: vi.fn(),
    decision: { summary: '', source: 'local', generatedAt: '', risks: [], cashflow: { next7Days: 700, next30Days: 3000, note: '' },
      actions: [{ title: 'متابعة التجديد', reason: 'قرب الانتهاء', priority: 'medium', route: '/contracts' }, { title: 'متابعة المتأخرات', reason: 'مستحقات العميل', priority: 'high', route: '/financial-tracking' }],
      metrics: { generatedFor: '', collections: { overdueInvoices: 12, overdueAmount: 18400, expected7Days: 700, expected30Days: 3000, topCustomers: [] },
        contracts: { activeCount: 47, endingSoonCount: 1, overdueCount: 0, endingSoon: [{ contractNumber: 'CTR-1', customerName: 'عميل اختبار', endDate: '2026-09-10', monthlyAmount: 1500, route: '/contracts/contract-1' }] },
        fleet: { totalVehicles: 219, idleVehiclesCount: 92, maintenanceRiskCount: 3, statusCounts: {}, maintenanceRiskVehicles: [] }, traffic: { unpaidCount: 0, unpaidAmount: 0 } } },
  };
}
function mount(value = props()) { return render(<MemoryRouter><DashboardWorkspace {...value}/></MemoryRouter>); }

describe('dashboard workspace', () => {
  it('includes less common vehicle states without losing any of the fleet', () => {
    const rows = fleetBreakdown(fleet);
    expect(rows.reduce((sum, row) => sum + row.value, 0)).toBe(219);
    expect(rows.at(-1)?.value).toBe(63);
    expect(rows.reduce((sum, row) => sum + row.percent, 0)).toBeCloseTo(100);
    const empty = fleetBreakdown({ ...fleet, total: 0, available: 0, rented: 0, maintenance: 0 });
    expect(empty.every(row => row.percent === 0)).toBe(true);
    expect(fleetGradient(empty)).not.toMatch(/NaN|Infinity/);
  });
  it('keeps action navigation inside the application', () => {
    for (const route of ['https://example.com', '//example.com', '/\\example.com', undefined]) expect(dashboardRoute(route)).toBe('/tasks');
    expect(dashboardRoute('/customers/id?tab=invoices')).toBe('/customers/id?tab=invoices');
  });
  it('orders urgent actions without mutating cached source data', () => {
    const actions = props().decision?.actions || [];
    expect(prioritizeActions(actions)[0].priority).toBe('high');
    expect(actions[0].priority).toBe('medium');
  });
  it('filters priorities and retains actionable routes', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /عاجل/ }));
    expect(screen.queryByText('متابعة التجديد')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /متابعة المتأخرات/ })).toHaveAttribute('href', '/financial-tracking');
    fireEvent.click(screen.getByRole('button', { name: /متابعة/ }));
    expect(screen.queryByText('متابعة المتأخرات')).not.toBeInTheDocument();
    expect(screen.getByText('متابعة التجديد')).toBeInTheDocument();
  });
  it('renders actual collection metrics and the ending contract route', () => {
    mount();
    expect(screen.getByText((_, element) => element?.tagName === 'STRONG' && element.textContent === formatDashboardCurrency(18400))).toBeInTheDocument();
    expect(screen.getByText('12 فاتورة تحتاج متابعة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح العقد CTR-1' })).toHaveAttribute('href', '/contracts/contract-1');
  });
  it('connects search, refresh and contract creation to existing commands', () => {
    const value = props(); mount(value);
    fireEvent.click(screen.getByRole('button', { name: /البحث في النظام/ }));
    fireEvent.click(screen.getByRole('button', { name: 'تحديث بيانات لوحة التحكم' }));
    fireEvent.click(screen.getByRole('button', { name: 'عقد جديد' }));
    expect(value.onSearch).toHaveBeenCalledOnce();
    expect(value.onRefresh).toHaveBeenCalledOnce();
    expect(value.onNewContract).toHaveBeenCalledOnce();
  });
  it('does not present unavailable data as zero or a successful empty state', () => {
    const value = props(); value.decision = undefined; value.sources.decision.error = true; mount(value);
    expect(screen.queryByText('لا توجد أولويات مسجلة حالياً')).not.toBeInTheDocument();
    expect(screen.getAllByText('تعذر تحميل هذا القسم')).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'إعادة المحاولة' })[0]);
    expect(value.onRefresh).toHaveBeenCalledOnce();
  });
  it('distinguishes loading, missing metrics and empty records', () => {
    const value = props(); value.sources.maintenance.loading = true;
    if (value.decision) value.decision.metrics = undefined;
    mount(value);
    expect(screen.getByText('جاري تحميل البيانات…')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد طلبات صيانة مفتوحة')).not.toBeInTheDocument();
    expect(screen.getByText('تفاصيل التحصيل غير متاحة')).toBeInTheDocument();
    expect(formatDashboardCurrency(undefined)).toBe('—');
    expect(formatDashboardCurrency(0)).not.toBe('—');
  });
});
