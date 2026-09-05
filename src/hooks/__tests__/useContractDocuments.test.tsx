import type { ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateContractDocument, useDeleteContractDocument } from '../useContractDocuments';
import { contractDocumentsKey } from '@/utils/contractDocumentQueries';

const { single, remove, success, errorToast, dbDelete } = vi.hoisted(() => ({
  single: vi.fn(), remove: vi.fn(), success: vi.fn(), errorToast: vi.fn(), dbDelete: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-1' }) }));
vi.mock('sonner', () => ({ toast: { success, error: errorToast } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const chain = { select: () => chain, insert: () => chain, eq: () => chain,
        delete: () => { dbDelete(); return chain; }, single };
      return chain;
    },
    storage: { from: () => ({ remove }) },
  },
}));

const doc = { id: 'doc-1', company_id: 'company-1', contract_id: 'contract-1', file_path: null };
const keys = [
  [...contractDocumentsKey(doc.company_id, doc.contract_id), 'customer-1', 'vehicle-1'],
  ['contract-document', doc.contract_id, doc.company_id],
  ['legal-transfer-readiness', doc.company_id, doc.contract_id],
];
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  single.mockReset();
  remove.mockResolvedValue({ error: null });
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  for (const key of keys) client.setQueryData(key, []);
});
afterEach(() => { cleanup(); client.clear(); });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const input = { contract_id: doc.contract_id, document_type: 'other', document_name: 'fixture' };

describe('contract document mutations refresh evidence consumers', () => {
  it('refreshes both documents and legal evidence after confirmed creation', async () => {
    single.mockResolvedValue({ data: doc, error: null });
    const { result } = renderHook(() => useCreateContractDocument(), { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(success).toHaveBeenCalledOnce();
  });
  it('refreshes consumers after confirmed row deletion', async () => {
    single.mockResolvedValueOnce({ data: doc, error: null })
      .mockResolvedValueOnce({ data: { id: doc.id }, error: null });
    const { result } = renderHook(() => useDeleteContractDocument(), { wrapper });
    await act(async () => { await result.current.mutateAsync(doc.id); });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(dbDelete).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledOnce();
  });
  it('does not remove stored bytes or report success when deletion is rejected', async () => {
    single.mockResolvedValueOnce({ data: { ...doc, file_path: 'fixture.pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('SIGNED_CONTRACT_REPLACEMENT_REQUIRED') });
    const { result } = renderHook(() => useDeleteContractDocument(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync(doc.id)).rejects.toThrow('REPLACEMENT_REQUIRED'); });
    expect(remove).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('مطابقة الهوية'));
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });
  it('explains lock contention without retrying deletion or removing stored bytes', async () => {
    single.mockResolvedValueOnce({ data: { ...doc, file_path: 'fixture.pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '55P03', message: 'SIGNED_CONTRACT_EVIDENCE_BUSY' } });
    const { result } = renderHook(() => useDeleteContractDocument(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(doc.id)).rejects.toMatchObject({ code: '55P03' });
    });
    expect(dbDelete).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('عملية أخرى'));
  });
  it('does not announce or cache an upload that failed to create its row', async () => {
    single.mockResolvedValue({ data: null, error: new Error('denied') });
    const { result } = renderHook(() => useCreateContractDocument(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow('denied'); });
    expect(success).not.toHaveBeenCalled();
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });
  it('explains referenced evidence rejection and never deletes the stored file', async () => {
    single.mockResolvedValueOnce({ data: { ...doc, file_path: 'notice-proof.pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '23503', message: 'foreign key violation',
        details: 'legal_case_formal_notices_proof_document_id_fkey' } });
    const { result } = renderHook(() => useDeleteContractDocument(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(doc.id)).rejects.toMatchObject({ code: '23503' });
    });
    expect(remove).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('مرتبط بسجلات أخرى'));
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });
});
