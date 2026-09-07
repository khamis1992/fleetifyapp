import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedFinanceRoute } from '../ProtectedFinanceRoute';

const state = vi.hoisted(() => ({
  user: { id: 'user-a' } as { id: string } | null,
  loading: false,
  companyId: 'company-a',
  admin: false,
  permissionLoading: false,
  permitted: true,
  error: null as Error | null,
  moduleLoading: false,
  moduleAccess: true,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: state.loading }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: state.companyId,
    hasCompanyAdminAccess: state.admin,
    isAuthenticating: false,
  }),
}));
vi.mock('@/hooks/usePermissionCheck', () => ({
  usePermissionCheck: () => ({
    isLoading: state.permissionLoading,
    data: { hasPermission: state.permitted },
    error: state.error,
  }),
}));
vi.mock('@/modules/core/hooks/useModuleConfig', () => ({
  useModuleAccess: () => ({ isLoading: state.moduleLoading, hasAccess: state.moduleAccess }),
}));
vi.mock('../FinanceErrorBoundary', () => ({
  FinanceErrorBoundary: ({ error, children }: { error: Error | null; children: React.ReactNode }) =>
    error ? <div role="alert">{error.message}</div> : children,
}));

function page() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/finance']}>
        <Routes>
          <Route
            path="/finance"
            element={
              <ProtectedFinanceRoute>
                <div>Confidential ledger</div>
              </ProtectedFinanceRoute>
            }
          />
          <Route path="/auth" element={<div>Sign in</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
describe('finance route authorization', () => {
  beforeEach(() =>
    Object.assign(state, {
      user: { id: 'user-a' },
      loading: false,
      companyId: 'company-a',
      admin: false,
      permissionLoading: false,
      permitted: true,
      error: null,
      moduleLoading: false,
      moduleAccess: true,
    })
  );
  it.each(['permissionLoading', 'moduleLoading', 'loading'] as const)(
    'does not mount financial readers while %s',
    (field) => {
      state[field] = true;
      page();
      expect(screen.queryByText('Confidential ledger')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    }
  );
  it.each(['denied', 'error', 'no-company', 'module-disabled'])(
    'blocks %s without render loops',
    (condition) => {
      if (condition === 'denied') state.permitted = false;
      if (condition === 'error') state.error = new Error('Connection failed');
      if (condition === 'no-company') state.companyId = '';
      if (condition === 'module-disabled') state.moduleAccess = false;
      page();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Confidential ledger')).not.toBeInTheDocument();
    }
  );
  it('renders an authorized company ledger', () => {
    page();
    expect(screen.getByText('Confidential ledger')).toBeInTheDocument();
  });
  it('redirects a signed-out user', () => {
    state.user = null;
    page();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});
