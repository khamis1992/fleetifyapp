import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateJournalEntry, usePostJournalEntry } from '../useJournalEntries';

const { rpc, state } = vi.hoisted(() => ({ rpc: vi.fn(), state: { companyId: '24bc0b21-4e2d-4413-9842-31719a3669f4', user: { id: 'actor-id' }, allowed: true } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => state }));
vi.mock('@/hooks/finance/useFinanceAccessGuard', () => ({ useFinanceAccessGuard: () => ({ can: () => state.allowed }) }));
vi.mock('@/services/financialControls', () => ({ assertFinancialPeriodOpen: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 1 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => { vi.clearAllMocks(); state.allowed = true; rpc.mockResolvedValue({ data: { id: 'entry-id' }, error: null }); });

describe('manual journal RPC flow', () => {
  it('keeps manual reference and current company/actor when saving a draft', async () => {
    const { result } = renderHook(() => useCreateJournalEntry(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ entry_date: '2026-09-30', description: 'Allocation correction', reference_type: 'manual', reference_id: 'b3b38d14-4a8f-5d49-9572-7ef3a969247a', lines: [{ account_id: 'debit', debit_amount: 100, credit_amount: 0 }, { account_id: 'credit', debit_amount: 0, credit_amount: 100 }] }); });
    expect(rpc).toHaveBeenCalledWith('create_manual_journal_entry_v1', expect.objectContaining({ p_company_id: state.companyId, p_actor_id: state.user.id, p_reference_type: 'manual', p_reference_id: 'b3b38d14-4a8f-5d49-9572-7ef3a969247a' }));
  });
  it.each(['entry-id', { entryId: 'entry-id' }, { entryId: 'entry-id', selfReviewAcknowledged: false }])('sends explicit false without an acknowledgement: %j', async input => {
    const { result } = renderHook(() => usePostJournalEntry(), { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    expect(rpc).toHaveBeenCalledWith('post_manual_journal_entry_v1', { p_company_id: state.companyId, p_entry_id: 'entry-id', p_actor_id: state.user.id, p_self_review_acknowledged: false });
  });
  it('sends true only from an explicit acknowledgement', async () => {
    const { result } = renderHook(() => usePostJournalEntry(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ entryId: 'entry-id', selfReviewAcknowledged: true }); });
    expect(rpc).toHaveBeenCalledWith('post_manual_journal_entry_v1', expect.objectContaining({ p_self_review_acknowledged: true }));
  });
  it('does not call the RPC when posting permission is absent', async () => {
    state.allowed = false;
    const { result } = renderHook(() => usePostJournalEntry(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ entryId: 'entry-id', selfReviewAcknowledged: true })).rejects.toThrow('ليس لديك صلاحية'); });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('propagates server rejection without retry or changing acknowledgement', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Company access denied', details: null, hint: null } });
    const { result } = renderHook(() => usePostJournalEntry(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync('entry-id')).rejects.toThrow('Company access denied'); });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1].p_self_review_acknowledged).toBe(false);
  });
  it('preserves a plain server save failure and never retries the draft', async () => {
    rpc.mockResolvedValue({ data: null, error: { code:'P0001', message:'Journal creation is blocked by a closed accounting period' } });
    const { result } = renderHook(() => useCreateJournalEntry(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ entry_date:'2026-09-30', description:'Correction', reference_type:'manual', lines:[{ account_id:'debit', debit_amount:100, credit_amount:0 }, { account_id:'credit', debit_amount:0, credit_amount:100 }] })).rejects.toThrow('Journal creation is blocked'); });
    expect(rpc).toHaveBeenCalledOnce();
  });
});
