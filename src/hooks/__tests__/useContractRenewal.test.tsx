import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: {
    user: {
      id: 'user-1',
      profile: { company_id: 'company-1' },
    } as any,
  },
  from: vi.fn(),
  rpc: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => state.auth,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => state.from(...args),
    rpc: (...args: unknown[]) => state.rpc(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => state.toastSuccess(...args),
    error: (...args: unknown[]) => state.toastError(...args),
  },
}));

vi.mock('@/hooks/useAuditLog', () => ({
  createAuditLog: vi.fn(),
}));

import {
  AutoRenewalBatchError,
  normalizeContractCancellationImpact,
  useAutoRenewContracts,
  useUpdateContractStatus,
} from '../useContractRenewal';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createContractsQuery = (response: { data: any[] | null; error: any }) => {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.lte = vi.fn().mockResolvedValue(response);
  return query;
};

describe('useAutoRenewContracts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 3, 12, 0, 0));
    vi.clearAllMocks();
    state.auth.user = {
      id: 'user-1',
      profile: { company_id: 'company-1' },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects only enabled active contracts ending from today through the next seven days', async () => {
    const query = createContractsQuery({ data: [], error: null });
    state.from.mockReturnValue(query);

    const { result } = renderHook(() => useAutoRenewContracts(), {
      wrapper: createWrapper(),
    });

    let batchResult: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      batchResult = await result.current.mutateAsync();
    });

    expect(state.from).toHaveBeenCalledWith('contracts');
    expect(query.eq).toHaveBeenCalledWith('company_id', 'company-1');
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
    expect(query.eq).toHaveBeenCalledWith('auto_renew_enabled', true);
    expect(query.gte).toHaveBeenCalledWith('end_date', '2026-08-03');
    expect(query.lte).toHaveBeenCalledWith('end_date', '2026-08-10');
    expect(batchResult).toEqual({
      eligibleCount: 0,
      renewedContracts: [],
      failures: [],
    });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('returns a structured success result for every renewed contract', async () => {
    const contract = {
      id: 'contract-1',
      contract_number: 'CTR-001',
      company_id: 'company-1',
      start_date: '2025-08-04',
      end_date: '2026-08-03',
      contract_amount: 12000,
      terms: 'same terms',
    };
    state.from.mockReturnValue(createContractsQuery({ data: [contract], error: null }));
    state.rpc.mockResolvedValue({
      data: {
        success: true,
        billing_graph_created: true,
        contract_id: 'renewed-contract-1',
        contract_number: 'CTR-001-R1',
      },
      error: null,
    });

    const { result } = renderHook(() => useAutoRenewContracts(), {
      wrapper: createWrapper(),
    });

    let batchResult: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      batchResult = await result.current.mutateAsync();
    });

    expect(state.rpc).toHaveBeenCalledWith(
      'renew_contract_with_billing_graph_atomic',
      expect.objectContaining({
        p_contract_id: 'contract-1',
        p_new_end_date: '2027-08-04',
        p_new_amount: 12000,
      }),
    );
    expect(batchResult?.eligibleCount).toBe(1);
    expect(batchResult?.failures).toEqual([]);
    expect(batchResult?.renewedContracts).toEqual([
      expect.objectContaining({
        id: 'renewed-contract-1',
        contract_number: 'CTR-001-R1',
        end_date: '2027-08-04',
      }),
    ]);
  });

  it('reports per-contract failures and preserves partial-success details', async () => {
    const contracts = [
      {
        id: 'contract-1',
        contract_number: 'CTR-001',
        start_date: '2025-08-04',
        end_date: '2026-08-03',
        contract_amount: 12000,
        terms: null,
      },
      {
        id: 'contract-2',
        contract_number: 'CTR-002',
        start_date: '2025-08-08',
        end_date: '2026-08-07',
        contract_amount: 12000,
        terms: null,
      },
    ];
    state.from.mockReturnValue(createContractsQuery({ data: contracts, error: null }));
    state.rpc
      .mockResolvedValueOnce({
        data: {
          success: true,
          billing_graph_created: true,
          contract_id: 'renewed-contract-1',
          contract_number: 'CTR-001-R1',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'database rejected contract-2' },
      });

    const { result } = renderHook(() => useAutoRenewContracts(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(AutoRenewalBatchError);
    const batchError = thrown as AutoRenewalBatchError;
    expect(batchError.message).toContain('CTR-002');
    expect(batchError.result.eligibleCount).toBe(2);
    expect(batchError.result.renewedContracts).toEqual([
      expect.objectContaining({ id: 'renewed-contract-1' }),
    ]);
    expect(batchError.result.failures).toEqual([
      {
        contractId: 'contract-2',
        contractNumber: 'CTR-002',
        message: 'database rejected contract-2',
      },
    ]);
  });
});

describe('contract cancellation with traffic penalties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.user = {
      id: 'user-1',
      profile: { company_id: 'company-1' },
    };
  });

  it('normalizes the cancellation impact returned by the database', () => {
    expect(normalizeContractCancellationImpact({
      contract_id: 'contract-1',
      open_penalty_count: 2,
      open_penalty_amount: '750.50',
      requires_company_transfer: true,
      blocked_penalty_count: 0,
      authorized_to_transfer: true,
      can_transfer: true,
    })).toEqual({
      contractId: 'contract-1',
      openPenaltyCount: 2,
      openPenaltyAmount: 750.5,
      requiresCompanyTransfer: true,
      blockedPenaltyCount: 0,
      authorizedToTransfer: true,
      canTransfer: true,
    });
  });

  it('uses the atomic cancellation RPC and passes the explicit company-transfer choice', async () => {
    const contractQuery: any = {};
    contractQuery.select = vi.fn(() => contractQuery);
    contractQuery.eq = vi.fn(() => contractQuery);
    contractQuery.single = vi.fn().mockResolvedValue({
      data: {
        contract_number: 'CTR-001',
        company_id: 'company-1',
        vehicle_id: 'vehicle-1',
        old_status: 'active',
      },
      error: null,
    });
    state.from.mockReturnValue(contractQuery);
    state.rpc.mockResolvedValue({
      data: {
        status: 'cancelled',
        transferred_penalty_count: 2,
        contract: { id: 'contract-1', status: 'cancelled' },
      },
      error: null,
    });

    const { result } = renderHook(() => useUpdateContractStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        contractId: 'contract-1',
        companyId: 'company-1',
        status: 'cancelled',
        reason: 'إلغاء بطلب الإدارة',
        transferTrafficViolationsToCompany: true,
      });
    });

    expect(state.rpc).toHaveBeenCalledWith(
      'cancel_contract_with_return_and_penalties_v2',
      {
        p_company_id: 'company-1',
        p_contract_id: 'contract-1',
        p_reason: 'إلغاء بطلب الإدارة',
        p_transfer_open_penalties_to_company: true,
        p_return_payload: null,
        p_actor_id: 'user-1',
      },
    );
    expect(contractQuery.update).toBeUndefined();
  });
});
