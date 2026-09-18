import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '@/integrations/supabase/client';
import { useConvertToLegal, useRevertFromLegal, type ContractForLegal } from '../useConvertToLegal';

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      profile: { company_id: 'company-1' },
    },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

const contract: ContractForLegal = {
  id: 'contract-1',
  contract_number: 'LTO202437',
  customer_id: 'customer-1',
  vehicle_id: 'vehicle-1',
  company_id: 'company-1',
  contract_amount: 39_020,
  monthly_amount: 1_060,
  start_date: '2024-01-01',
  end_date: '2027-01-01',
  status: 'active',
  vehicle_returned: false,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // The conversion hook must override a global retry policy, including
      // when a malformed acknowledgement may follow a committed command.
      mutations: { retry: 2, retryDelay: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useConvertToLegal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the Supabase client context for pre-flight and conversion RPCs', async () => {
    const rpcMock = vi.mocked(supabase.rpc);
    rpcMock.mockImplementation(function (functionName: string) {
      expect(this).toBe(supabase);

      if (
        functionName === 'check_contract_has_verified_signed_lease_v1'
        || functionName === 'check_contract_identity_verified_v1'
      ) {
        return Promise.resolve({ data: true, error: null }) as never;
      }

      if (functionName === 'convert_contract_to_legal_collection_v2') {
        return Promise.resolve({
          data: {
            legal_case: { id: 'case-1', company_id: contract.company_id, contract_id: contract.id, client_id: contract.customer_id },
            case_number: 'CASE-26-9999',
            total_case_value: 10_150,
            claim_scope: 'full_outstanding',
          },
          error: null,
        }) as never;
      }

      throw new Error(`Unexpected RPC: ${functionName}`);
    });

    const { result } = renderHook(() => useConvertToLegal(), {
      wrapper: createWrapper(),
    });

    let conversionResult: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      conversionResult = await result.current.mutateAsync({
        contractId: contract.id,
        contract,
        claimScope: 'full_outstanding',
      });
    });

    expect(conversionResult).toEqual({
      legalCase: { id: 'case-1', company_id: contract.company_id, contract_id: contract.id, client_id: contract.customer_id },
      caseNumber: 'CASE-26-9999',
      totalCaseValue: 10_150,
    });
    expect(rpcMock).toHaveBeenCalledTimes(3);
    expect(rpcMock).toHaveBeenLastCalledWith(
      'convert_contract_to_legal_collection_v2',
      expect.objectContaining({
        p_company_id: contract.company_id,
        p_contract_id: contract.id,
        p_actor_id: 'user-1',
      }),
    );
  });

  it.each(['false',{},1])('does not treat a malformed verification result as approval: %j',async(approval)=>{
    vi.mocked(supabase.rpc).mockResolvedValue({data:approval,error:null} as never);
    const {result}=renderHook(()=>useConvertToLegal(),{wrapper:createWrapper()});
    await act(async()=>{
      await expect(result.current.mutateAsync({contractId:contract.id,contract})).rejects.toThrow();
    });
    expect(vi.mocked(supabase.rpc).mock.calls.some(([name])=>name==='convert_contract_to_legal_collection_v2')).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('rejects a selected contract ID different from its supplied record before any request',async()=>{
    const {result}=renderHook(()=>useConvertToLegal(),{wrapper:createWrapper()});
    await act(async()=>{
      await expect(result.current.mutateAsync({contractId:'other-contract',contract})).rejects.toThrow();
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([
    {},
    {legal_case:{id:'case-1'},case_number:'CASE-1',total_case_value:100},
    {legal_case:{id:'case-1',company_id:'other',contract_id:contract.id,client_id:contract.customer_id},case_number:'CASE-1',total_case_value:100},
    {legal_case:{id:'case-1',company_id:contract.company_id,contract_id:contract.id,client_id:contract.customer_id},case_number:'CASE-1',total_case_value:null},
  ])('does not announce success for an unverified conversion acknowledgement %#',async(data)=>{
    vi.mocked(supabase.rpc).mockImplementation((name)=>Promise.resolve({
      data:name==='convert_contract_to_legal_collection_v2'?data:true,error:null,
    }) as never);
    const {result}=renderHook(()=>useConvertToLegal(),{wrapper:createWrapper()});
    await act(async()=>{
      await expect(result.current.mutateAsync({contractId:contract.id,contract})).rejects.toThrow('تحقق');
    });
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
  });
});

describe('useRevertFromLegal', () => {
  beforeEach(() => { vi.mocked(supabase.rpc).mockReset(); });

  it('uses the same guarded atomic reversal as the contract details page', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: true, changed: true, contract_id: contract.id }, error: null,
    } as never);
    const { result } = renderHook(() => useRevertFromLegal(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        contractId: contract.id, reason: 'تمت مراجعة الإجراء القانوني', idempotencyKey: 'request-1',
      });
    });
    expect(supabase.rpc).toHaveBeenCalledWith('revert_contract_from_legal_v2', {
      p_company_id: contract.company_id, p_contract_id: contract.id,
      p_reason: 'تمت مراجعة الإجراء القانوني', p_idempotency_key: 'request-1',
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('does not bypass the minimum reason validation', async () => {
    const { result } = renderHook(() => useRevertFromLegal(), { wrapper: createWrapper() });
    await act(async () => {
      await expect(result.current.mutateAsync({ contractId: contract.id, reason: 'قصير' }))
        .rejects.toThrow('10');
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
