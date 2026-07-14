import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const state = vi.hoisted(() => ({
  auth: {
    user: null as any,
    session: null as any,
    loading: false,
  },
  company: {
    browsedCompany: null as any,
    isBrowsingMode: false,
    stableCompanyId: null as string | null,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => state.auth,
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: () => state.company,
}));

vi.unmock('@/hooks/useUnifiedCompanyAccess');

import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

describe('useUnifiedCompanyAccess tenant isolation', () => {
  beforeEach(() => {
    state.auth.user = null;
    state.auth.session = null;
    state.auth.loading = false;
    state.company.browsedCompany = null;
    state.company.isBrowsingMode = false;
    state.company.stableCompanyId = null;
  });

  it('fails closed when an authenticated profile has no company identity', () => {
    state.auth.user = { id: 'user-id', roles: ['admin'] };
    state.auth.session = { access_token: 'session-token' };

    const { result } = renderHook(() => useUnifiedCompanyAccess());

    expect(result.current.companyId).toBeNull();
    expect(result.current.filter.company_id).toBe('__loading__');
    expect(result.current.canAccessCompany('another-company')).toBe(false);
    expect(() => result.current.validateCompanyAccess('another-company')).toThrow('Access denied');
  });

  it('uses a company identity supplied by authenticated context', () => {
    state.auth.user = {
      id: 'user-id',
      roles: ['admin'],
      company: { id: 'company-id' },
    };
    state.auth.session = { access_token: 'session-token' };

    const { result } = renderHook(() => useUnifiedCompanyAccess());

    expect(result.current.companyId).toBe('company-id');
    expect(result.current.filter.company_id).toBe('company-id');
    expect(result.current.canAccessCompany('company-id')).toBe(true);
    expect(result.current.canAccessCompany('another-company')).toBe(false);
  });

  it('scopes a super administrator to the company being browsed', () => {
    state.auth.user = {
      id: 'super-id',
      roles: ['super_admin'],
      company: { id: 'home-company' },
    };
    state.auth.session = { access_token: 'session-token' };
    state.company.isBrowsingMode = true;
    state.company.browsedCompany = { id: 'browsed-company', name: 'Browsed' };

    const { result } = renderHook(() => useUnifiedCompanyAccess());

    expect(result.current.companyId).toBe('browsed-company');
    expect(result.current.isBrowsingMode).toBe(true);
    expect(result.current.isCompanyScoped).toBe(true);
    expect(result.current.canAccessCompany('browsed-company')).toBe(true);
    expect(result.current.canAccessCompany('home-company')).toBe(false);
  });
});
