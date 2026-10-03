import { cloneElement, isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AdminRoute, ProtectedRoute, SuperAdminRoute } from '../ProtectedRoute';
import { AdminOnly } from '../PermissionGuard';

const state = vi.hoisted(() => ({
  user: { id: 'user-a', company: { id: 'company-a' }, roles: ['company_admin'] } as { id: string; company: { id: string }; roles: string[] } | null,
  session: { token: 'synthetic-session' } as { token: string } | null,
  loading: false,
  permissionLoading: false,
  permitted: true,
  featureLoading: false,
  featureAllowed: true,
  reader: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, session: state.session, loading: state.loading }) }));
// Keep the actual unified auth/company hook and PermissionGuard: these are the race's participants.
vi.unmock('@/hooks/useUnifiedCompanyAccess');
vi.mock('@/contexts/CompanyContext', () => ({ useCompanyContext: () => ({ browsedCompany: null, isBrowsingMode: false, stableCompanyId: 'company-a' }) }));
vi.mock('@/hooks/usePermissionCheck', () => ({ usePermissionCheck: () => ({ data: { hasPermission: state.permitted }, isLoading: state.permissionLoading }) }));
vi.mock('@/hooks/useFeatureAccess', () => ({ useFeatureAccess: () => ({ data: state.featureAllowed, isLoading: state.featureLoading }) }));

const PATH = '/finance/reports/insolvency-portfolio';
function Reader() { state.reader(); return <div>Confidential portfolio reader</div>; }
function LocationProbe() { const location = useLocation(); return <span data-testid="location">{location.pathname}</span>; }
function view(element: ReactNode) {
  return <MemoryRouter initialEntries={[PATH]}><LocationProbe /><Routes>
    <Route path={PATH} element={isValidElement(element) ? cloneElement(element) : element} />
    <Route path="/dashboard" element={<div>Dashboard destination</div>} />
    <Route path="/auth" element={<div>Sign in destination</div>} />
    <Route path="/employee-workspace" element={<div>Employee workspace</div>} />
  </Routes></MemoryRouter>;
}
function page(element: ReactNode = <AdminRoute><Reader /></AdminRoute>) {
  const result = render(view(element));
  return { ...result, refresh: () => result.rerender(view(element)) };
}

beforeEach(() => {
  state.user = { id: 'user-a', company: { id: 'company-a' }, roles: ['company_admin'] };
  state.session = { token: 'synthetic-session' };
  state.loading = false; state.permissionLoading = false; state.permitted = true;
  state.featureLoading = false; state.featureAllowed = true;
  state.reader.mockClear();
});

describe('protected route authorization lifecycle', () => {
  it.each(['auth-loading', 'session-restoration'])('waits with a retained user during %s, then renders authorized content', mode => {
    if (mode === 'auth-loading') state.loading = true;
    else state.session = null;
    const { refresh } = page();
    expect(screen.getByRole('status')).toHaveTextContent('جاري التحقق من الجلسة');
    expect(state.reader).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent(PATH);
    state.loading = false; state.session = { token: 'synthetic-session' };
    refresh();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Confidential portfolio reader')).toBeInTheDocument();
  });

  it('hides a previously mounted reader during session restoration and renders it again only when ready', () => {
    const { refresh } = page();
    expect(screen.getByText('Confidential portfolio reader')).toBeInTheDocument();
    state.reader.mockClear(); state.session = null;
    refresh();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Confidential portfolio reader')).not.toBeInTheDocument();
    expect(state.reader).not.toHaveBeenCalled();
    state.session = { token: 'synthetic-session' };
    refresh();
    expect(screen.getByText('Confidential portfolio reader')).toBeInTheDocument();
  });

  it('navigates to the configured denial destination after a retained user finishes loading without admin access', async () => {
    state.loading = true;
    const { refresh } = page();
    expect(screen.getByRole('status')).toBeInTheDocument();
    state.loading = false;
    state.user = { id: 'user-a', company: { id: 'company-a' }, roles: ['accountant'] };
    refresh();
    await screen.findByText('Dashboard destination');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    expect(state.reader).not.toHaveBeenCalled();
  });

  it.each(['admin', 'role', 'permission', 'feature', 'global'])('keeps the %s check and renders the route denial fallback instead of a blank page', async condition => {
    if (condition === 'admin') state.user = { id: 'user-a', company: { id: 'company-a' }, roles: ['accountant'] };
    if (condition === 'permission') state.permitted = false;
    if (condition === 'feature') state.featureAllowed = false;
    const element = condition === 'global'
      ? <SuperAdminRoute><Reader /></SuperAdminRoute>
      : <ProtectedRoute requireCompanyAdmin permission={condition === 'permission' ? 'finance.reports.view' : undefined} role={condition === 'role' ? 'legal' : undefined} feature={condition === 'feature' ? 'finance' : undefined}><Reader /></ProtectedRoute>;
    page(element);
    await screen.findByText('Dashboard destination');
    expect(state.reader).not.toHaveBeenCalled();
  });

  it.each(['permission', 'feature'])('does not trust a cached grant while the %s check loads', async condition => {
    state.permissionLoading = condition === 'permission'; state.featureLoading = condition === 'feature';
    const { refresh } = page(<ProtectedRoute requireCompanyAdmin permission="finance.reports.view" feature="finance"><Reader /></ProtectedRoute>);
    expect(state.reader).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent(PATH);
    state.permissionLoading = false; state.featureLoading = false;
    if (condition === 'permission') state.permitted = false;
    else state.featureAllowed = false;
    refresh();
    await screen.findByText('Dashboard destination');
    expect(state.reader).not.toHaveBeenCalled();
  });

  it('shows the existing visible denial when showFallback is requested', () => {
    state.permitted = false;
    page(<ProtectedRoute permission="finance.reports.view" showFallback><Reader /></ProtectedRoute>);
    expect(screen.getByText('وصول محظور')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(PATH);
    expect(state.reader).not.toHaveBeenCalled();
  });

  it('preserves hidden ordinary admin controls without a route fallback', () => {
    state.user = { id: 'user-a', company: { id: 'company-a' }, roles: ['accountant'] };
    page(<div>Public controls<AdminOnly><Reader /></AdminOnly></div>);
    expect(screen.getByText('Public controls')).toBeInTheDocument();
    expect(screen.queryByText('وصول محظور')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(PATH);
    expect(state.reader).not.toHaveBeenCalled();
  });

  it('redirects to sign in if authentication finishes without a user', async () => {
    state.loading = true;
    const { refresh } = page();
    expect(screen.getByRole('status')).toBeInTheDocument();
    state.loading = false; state.user = null; state.session = null;
    refresh();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/auth'));
    expect(screen.getByText('Sign in destination')).toBeInTheDocument();
    expect(state.reader).not.toHaveBeenCalled();
  });
});
