import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateLegalCase, useLegalCase, useUpdateLegalCase, type LegalCaseFormData } from '../useLegalCases';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), companyId: 'company-a', foreignCustomer: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('@/hooks/useCompanyScope', () => ({ useCompanyFilter: () => ({ company_id: mocks.companyId }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Call = { table: string; filters: Array<[string, unknown]>; insert?: Record<string, unknown>; update?: Record<string, unknown> };
const calls: Call[] = [];
const form: LegalCaseFormData = { case_title: 'incoming', case_type: 'other', case_status: 'active', case_direction: 'filed_against_us', client_name: 'claimant', case_value: 102.75, priority: 'medium', legal_team: [], legal_fees: 0, court_fees: 0, other_expenses: 0, billing_status: 'pending', tags: [], is_confidential: false };
function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('legal case active-company isolation', () => {
  beforeEach(() => {
    calls.length = 0; mocks.companyId = 'company-a'; mocks.foreignCustomer = false;
    mocks.rpc.mockReset().mockResolvedValue({ data: 'CASE-001', error: null });
    mocks.from.mockReset().mockImplementation((table: string) => {
      const call: Call = { table, filters: [] }; calls.push(call);
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
        insert: (value: Record<string, unknown>) => { call.insert = value; return query; },
        update: (value: Record<string, unknown>) => { call.update = value; return query; },
        single: async () => table === 'customers' && mocks.foreignCustomer ? { data: null, error: { message: 'not found' } } : { data: { id: 'case-a', company_id: mocks.companyId, case_number: 'CASE-001', legal_fees: 1, court_fees: 2, other_expenses: 3, ...(call.insert || call.update) }, error: null },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return query;
    });
  });

  it('creates against-us in the selected company rather than using a profile company', async () => {
    const { result } = renderHook(() => useCreateLegalCase(), { wrapper });
    await act(async () => { await result.current.mutateAsync(form); });
    expect(mocks.rpc).toHaveBeenCalledWith('generate_legal_case_number', { company_id_param: 'company-a' });
    expect(calls.find(call => call.table === 'legal_cases')?.insert).toMatchObject({ company_id: 'company-a', case_direction: 'filed_against_us', case_value: 102.75 });
    expect(calls.some(call => call.table === 'profiles')).toBe(false);
    expect(calls.find(call => call.table === 'legal_case_activities')?.insert?.company_id).toBe('company-a');
  });

  it('rejects a foreign customer before creating a case or allocating a case number', async () => {
    mocks.foreignCustomer = true;
    const { result } = renderHook(() => useCreateLegalCase(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ ...form, client_id: 'foreign-client' })).rejects.toThrow('الشركة الحالية'); });
    expect(calls[0].filters).toContainEqual(['company_id', 'company-a']);
    expect(calls.some(call => call.insert)).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('scopes cost reads and edits and prevents identity/company/status replacement', async () => {
    const { result } = renderHook(() => useUpdateLegalCase(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 'case-a', data: { company_id: 'company-b', id: 'replace', case_status: 'closed', case_direction: 'filed_against_us', legal_fees: 8 } as unknown as Partial<LegalCaseFormData> }); });
    const legalCalls = calls.filter(call => call.table === 'legal_cases');
    expect(legalCalls).toHaveLength(2);
    for (const call of legalCalls) expect(call.filters).toEqual([['id', 'case-a'], ['company_id', 'company-a']]);
    expect(legalCalls[1].update).toEqual({ case_direction: 'filed_against_us', legal_fees: 8, total_costs: 13 });
  });

  it('scopes single-case reads and disables them when no company is selected', async () => {
    const { result, unmount } = renderHook(() => useLegalCase('case-a'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].filters).toEqual([['id', 'case-a'], ['company_id', 'company-a']]);
    unmount(); calls.length = 0; mocks.companyId = '';
    renderHook(() => useLegalCase('case-a'), { wrapper });
    expect(calls).toHaveLength(0);
  });
});
