import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HRReports from '@/pages/hr/Reports';
import PermissionsMatrix from '@/components/hr/permissions/PermissionsMatrix';
import { PERMISSIONS } from '@/types/permissions';
import { permissionArabicCopy } from '@/components/hr/permissions/permissionArabicCopy';
import { OperationsWorkspace } from '../OperationsWorkspace';

const state = vi.hoisted(() => ({ loading: false, error: null as Error | null, refetch: vi.fn(), roles: ['company_admin'] }));
vi.mock('../operations-workspace.css', () => ({}));
vi.mock('../administration-workspace.css', () => ({}));
vi.mock('@/hooks/useHRReports', () => ({ useHRStatistics: () => ({ data: { total_employees: 8, attendance_rate: 75, total_payroll: 18000, pending_payrolls: 2 }, isLoading: state.loading, isFetching: false, error: state.error, refetch: state.refetch }) }));
vi.mock('@/hooks/useCurrencyFormatter', () => ({ useCurrencyFormatter: () => ({ formatCurrency: (value: number) => value + ' ر.ق.' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { roles: state.roles } }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ data: [], isLoading: false }) }));
vi.mock('@/components/hr/reports/AttendanceReportModal', () => ({ AttendanceReportModal: ({ open }: { open: boolean }) => open ? <div role="dialog">نافذة الحضور</div> : null }));
vi.mock('@/components/hr/reports/EmployeeReportModal', () => ({ EmployeeReportModal: ({ open }: { open: boolean }) => open ? <div role="dialog">نافذة الموظفين</div> : null }));
vi.mock('@/components/hr/reports/PayrollReportModal', () => ({ PayrollReportModal: ({ open }: { open: boolean }) => open ? <div role="dialog">نافذة الرواتب</div> : null }));
vi.mock('@/components/hr/reports/LeaveReportModal', () => ({ LeaveReportModal: ({ open }: { open: boolean }) => open ? <div role="dialog">نافذة الإجازات</div> : null }));

afterEach(cleanup);
beforeEach(() => { state.loading = false; state.error = null; state.roles = ['company_admin']; vi.clearAllMocks(); });

describe('administration workspaces', () => {
  it('cleans administrative portal styling when navigating to an operations page', () => {
    const view = render(<MemoryRouter><OperationsWorkspace section="permissions">محتوى</OperationsWorkspace></MemoryRouter>);
    expect(document.body).toHaveAttribute('data-administration-active', 'permissions');
    view.rerender(<MemoryRouter><OperationsWorkspace section="customers">محتوى</OperationsWorkspace></MemoryRouter>);
    expect(document.body).not.toHaveAttribute('data-administration-active');
    expect(document.body).toHaveAttribute('data-operations-active', 'customers');
  });
  it.each([['الحضور', 'نافذة الحضور'], ['الرواتب', 'نافذة الرواتب'], ['الموظفين', 'نافذة الموظفين'], ['الإجازات', 'نافذة الإجازات']])('opens only the requested %s report', (label, dialog) => {
    render(<MemoryRouter><HRReports /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'فتح تقرير ' + label }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveTextContent(dialog);
  });
  it('does not represent loading or failed statistics as zero balances', () => {
    state.loading = true;
    const view = render(<MemoryRouter><HRReports /></MemoryRouter>);
    expect(screen.getAllByText('—')).toHaveLength(4);
    state.loading = false; state.error = new Error('offline');
    view.rerender(<MemoryRouter><HRReports /></MemoryRouter>);
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل المؤشرات');
    fireEvent.click(screen.getByRole('button', { name: 'تحديث المؤشرات' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});

describe('Arabic permissions editor', () => {
  const selectedUser = { user_id: 'test-user', first_name: 'مستخدم', last_name: 'اختبار', roles: ['sales_agent' as const] };
  it('provides Arabic labels and descriptions for every registered permission', () => {
    for (const permission of PERMISSIONS) {
      expect(permissionArabicCopy[permission.id], permission.id).toBeDefined();
      expect(permissionArabicCopy[permission.id]?.every(value => /[\u0600-\u06ff]/.test(value))).toBe(true);
    }
  });
  it('searches in Arabic and maps inherit, allow and deny to the existing draft callbacks', () => {
    const change = vi.fn();
    render(<PermissionsMatrix selectedUser={selectedUser} onPermissionChange={change} pendingPermissions={[{ permissionId: 'operations.customers.read', granted: null }]} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'البحث في الصلاحيات' }), { target: { value: 'عرض العملاء' } });
    expect(screen.getByText('مسموح بها')).toBeInTheDocument();
    expect(screen.queryByText('View Customers')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'منع: عرض العملاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'سماح: عرض العملاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'يرث: عرض العملاء' }));
    expect(change.mock.calls).toEqual([['operations.customers.read', false], ['operations.customers.read', true], ['operations.customers.read', null]]);
  });
  it('keeps sensitive permissions disabled for a manager and keeps read-only controls disabled', () => {
    state.roles = ['manager'];
    const view = render(<PermissionsMatrix selectedUser={selectedUser} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'البحث في الصلاحيات' }), { target: { value: 'admin.settings.write' } });
    expect(screen.getByRole('button', { name: 'سماح: إدارة الإعدادات' })).toBeDisabled();
    view.rerender(<PermissionsMatrix selectedUser={selectedUser} readOnly />);
    fireEvent.change(screen.getByRole('textbox', { name: 'البحث في الصلاحيات' }), { target: { value: 'عرض العملاء' } });
    expect(screen.getByRole('button', { name: 'سماح: عرض العملاء' })).toBeDisabled();
  });
});
