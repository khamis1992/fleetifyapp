import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => {
  const user = {
    id: 'resume-user',
    email: 'resume@example.com',
    company: { id: 'resume-company', name: 'Resume Company' },
    roles: ['admin'],
  };
  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };

  return {
    user,
    session,
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    startAutoRefresh: vi.fn(),
    getCurrentUser: vi.fn(),
  };
});

vi.unmock('@/contexts/AuthContext');

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: testState.getSession,
      refreshSession: testState.refreshSession,
      startAutoRefresh: testState.startAutoRefresh,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({ insert: vi.fn() })),
  },
}));

vi.mock('@/lib/auth', () => ({
  authService: {
    getCurrentUser: testState.getCurrentUser,
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AuthProbe() {
  const { session, user } = useAuth();
  return <div data-testid="auth-state">{user?.id}:{session?.access_token}</div>;
}

describe('AuthProvider app resume recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.getSession.mockResolvedValue({ data: { session: testState.session }, error: null });
    testState.refreshSession.mockResolvedValue({ data: { session: testState.session }, error: null });
    testState.getCurrentUser.mockResolvedValue(testState.user);

    localStorage.setItem('sb-test-auth-token', JSON.stringify(testState.session));
    localStorage.setItem('fleetify_auth_cache', JSON.stringify({
      user: testState.user,
      timestamp: Date.now(),
      version: '1.0',
    }));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('restores Supabase refresh and active queries after hidden to visible', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('resume-user:access-token');
    });
    const initialSessionChecks = testState.getSession.mock.calls.length;

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    fireEvent(document, new Event('visibilitychange'));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    fireEvent(document, new Event('visibilitychange'));

    await waitFor(() => {
      expect(testState.startAutoRefresh).toHaveBeenCalledTimes(1);
      expect(testState.getSession.mock.calls.length).toBeGreaterThan(initialSessionChecks);
      expect(invalidateQueries).toHaveBeenCalledWith({ refetchType: 'active' });
    });
  });
});
