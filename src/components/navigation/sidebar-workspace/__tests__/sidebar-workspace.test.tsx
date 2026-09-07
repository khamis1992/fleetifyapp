import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BentoSidebar from '@/components/dashboard/bento/BentoSidebar';
import { activeNavigationHref, filterNavigation } from '../model';
import { navigation } from '../navigation';

const access = vi.hoisted(() => ({ admin: false, global: false, roles: ['manager'] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { roles: access.roles, email: 'test@example.com', profile: { first_name: 'مستخدم', last_name: 'اختبار' } }, signOut: vi.fn() }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ hasCompanyAdminAccess: access.admin, hasGlobalAccess: access.global }) }));
vi.mock('@/components/tour-guide', () => ({ useTourGuide: () => ({ startTour: vi.fn() }) }));
beforeEach(() => { access.admin = false; access.global = false; access.roles = ['manager']; });
const mount = (path = '/dashboard', props = {}) => render(<MemoryRouter initialEntries={[path]}><BentoSidebar {...props}/></MemoryRouter>);

describe('sidebar workspace', () => {
  it('selects the most specific route and respects segment boundaries', () => {
    expect(activeNavigationHref(navigation, '/fleet/maintenance')).toBe('/fleet/maintenance');
    expect(activeNavigationHref(navigation, '/fleet/dispatch-permits')).toBe('/fleet/dispatch-permits');
    expect(activeNavigationHref(navigation, '/customers/customer-id')).toBe('/customers');
    expect(activeNavigationHref(navigation, '/customers/crm')).toBe('/customers/crm');
    expect(activeNavigationHref(navigation, '/settings/audit-logs')).toBe('/settings/audit-logs');
    expect(activeNavigationHref(navigation, '/fleet-other')).toBeUndefined();
  });
  it('matches Arabic search without diacritics or alef variants and preserves child routes', () => {
    const result = filterNavigation(navigation, 'إِدَارَة العملاء');
    expect(result.map(item => item.id)).toEqual(['customers']);
    expect(filterNavigation(navigation, 'الصيانة')[0].children?.map(item => item.href)).toEqual(['/fleet/maintenance']);
    expect(filterNavigation(navigation, 'غير موجود')).toHaveLength(0);
  });
  it('automatically reveals only one current child link', () => {
    mount('/fleet/maintenance');
    expect(screen.getByRole('button', { name: 'إدارة الأسطول' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'الصيانة', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'المركبات', exact: true })).not.toHaveAttribute('aria-current');
  });
  it('filters the navigation in place and can clear an empty search', () => {
    mount();
    const input = screen.getByRole('textbox', { name: 'البحث في أقسام القائمة' });
    fireEvent.change(input, { target: { value: 'الصيانة' } });
    expect(screen.getByRole('link', { name: 'الصيانة' })).toHaveAttribute('href', '/fleet/maintenance');
    expect(screen.queryByRole('button', { name: 'إدارة العملاء' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'غير موجود' } });
    expect(screen.getByRole('status')).toHaveTextContent('لا توجد أقسام مطابقة');
    fireEvent.click(screen.getByRole('button', { name: 'عرض جميع الأقسام' }));
    expect(screen.getByRole('button', { name: 'إدارة العملاء' })).toBeInTheDocument();
  });
  it('keeps admin navigation restricted, including during search', () => {
    const view = mount();
    expect(screen.queryByRole('link', { name: 'سجل التدقيق' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'سجل التدقيق' } });
    expect(screen.queryByRole('link', { name: 'سجل التدقيق' })).not.toBeInTheDocument();
    view.unmount(); access.admin = true; mount();
    expect(screen.getByRole('link', { name: 'سجل التدقيق' })).toHaveAttribute('href', '/settings/audit-logs');
  });
  it('preserves the employee workspace restriction', () => {
    access.roles = ['employee']; mount('/employee-workspace');
    const nav = screen.getByRole('navigation', { name: 'أقسام النظام' });
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(within(nav).getByRole('link', { name: 'مساحة عملي' })).toHaveAttribute('href', '/employee-workspace');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /الملف الشخصي/ })).toBeDisabled();
  });
  it('expands a collapsed group so its children remain reachable', () => {
    const onCollapsedChange = vi.fn(); mount('/dashboard', { onCollapsedChange });
    fireEvent.click(screen.getByRole('button', { name: 'طي القائمة' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'إدارة الأسطول' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('link', { name: 'المركبات' })).toBeInTheDocument();
  });
  it('closes the mobile drawer on navigation and with its close control', () => {
    const onCloseMobile = vi.fn(); mount('/dashboard', { isMobile: true, onCloseMobile });
    fireEvent.click(screen.getByRole('button', { name: 'إدارة العملاء' }));
    fireEvent.click(screen.getByRole('link', { name: 'قائمة العملاء' }));
    expect(onCloseMobile).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق القائمة' }));
    expect(onCloseMobile).toHaveBeenCalledTimes(2);
  });
});
