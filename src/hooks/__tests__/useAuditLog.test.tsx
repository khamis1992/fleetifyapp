import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { useAuditLogs } from '../useAuditLog';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({ companyId: 'company-1' }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createQueryMock = (data: unknown[] = []) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data, error: null }),
  };

  return query;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters audit logs by employee name or email', async () => {
    const query = createQueryMock();
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(
      () => useAuditLogs({ user_search: 'خميس' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(query.or).toHaveBeenCalledWith(
      'user_name.ilike.%خميس%,user_email.ilike.%خميس%'
    );
  });

  it('extends date_to to the end of the selected day', async () => {
    const query = createQueryMock();
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(
      () => useAuditLogs({ date_to: '2026-08-07' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-08-07T23:59:59.999Z');
  });

  it('keeps lowercase database actions filterable', async () => {
    const query = createQueryMock();
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(
      () => useAuditLogs({ action: 'login' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(query.eq).toHaveBeenCalledWith('action', 'login');
  });

  it('filters audit logs by the selected employee user id', async () => {
    const query = createQueryMock();
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(
      () => useAuditLogs({ user_id: 'auth-user-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(query.eq).toHaveBeenCalledWith('user_id', 'auth-user-1');
  });

  it('expands singular resource filters to trigger-generated table names', async () => {
    const query = createQueryMock();
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const { result } = renderHook(
      () => useAuditLogs({ resource_type: 'payment' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(query.in).toHaveBeenCalledWith('resource_type', ['payment', 'payments']);
  });

  it('fills missing user, entity, and summary data for trigger-generated rows', async () => {
    const auditQuery = createQueryMock([
      {
        id: 'log-1',
        action: 'payments_updated',
        resource_type: 'payments',
        user_id: 'auth-user-1',
        status: 'success',
        created_at: '2026-08-05T12:00:00Z',
        new_values: { payment_number: 'PAY-001', payment_status: 'paid' },
        old_values: { payment_status: 'pending' },
        metadata: { changed_fields: { payment_status: 'paid' } },
      },
    ]);
    const profileQuery = createQueryMock([
      {
        user_id: 'auth-user-1',
        first_name: 'Khamis',
        last_name: 'Mohammed',
        first_name_ar: 'خميس',
        last_name_ar: 'محمد',
        email: 'khamis@example.com',
      },
    ]);

    vi.mocked(supabase.from)
      .mockReturnValueOnce(auditQuery as never)
      .mockReturnValueOnce(profileQuery as never);

    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]).toMatchObject({
      resource_type: 'payment',
      user_name: 'خميس محمد',
      user_email: 'khamis@example.com',
      entity_name: 'PAY-001',
      changes_summary: 'تم تحديث دفعة PAY-001 — حالة الدفع: pending ← paid',
    });
    expect(profileQuery.in).toHaveBeenCalledWith('user_id', ['auth-user-1']);
  });
});
