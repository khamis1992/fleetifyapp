import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateContractDocument } from '../useContractDocuments';
const mock = vi.hoisted(() => ({ review: vi.fn(), verify: vi.fn(), single: vi.fn(), upload: vi.fn(), remove: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'c1' }) }));
vi.mock('@/components/contracts/SignedContractReview', () => ({ reviewSignedContract: mock.review }));
vi.mock('@/services/legalContractIdentityVerifier', () => ({ verifyLegalContractDocumentIdentity: mock.verify, normalizeLegalContractDocumentIdentityRow: (row: unknown) => row }));
vi.mock('sonner', () => ({ toast: mock }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => { const chain = { select: () => chain, eq: () => chain, insert: () => chain, single: mock.single }; return chain; },
  storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
} }));
const input = { contract_id: 'contract1', document_type: 'signed_contract', document_name: 'signed', file: new File(['pdf'], 'signed.pdf', { type: 'application/pdf' }) };
const row = { id: 'doc1', company_id: 'c1', contract_id: 'contract1', legal_identity_match_status: 'pending' };
let client: QueryClient;
beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mock.single.mockResolvedValueOnce({ data: { contract_number: '123', customer: { first_name: 'Demo' } }, error: null }).mockResolvedValueOnce({ data: row, error: null });
  mock.upload.mockResolvedValue({ error: null }); mock.remove.mockResolvedValue({ error: null });
  mock.review.mockResolvedValue(input.file);
});
afterEach(() => { cleanup(); client.clear(); });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
describe('signed upload boundary', () => {
  it('never uploads bytes when review is cancelled or rejects a mismatch', async () => {
    mock.review.mockRejectedValue(new Error('cancelled'));
    const { result } = renderHook(useCreateContractDocument, { wrapper });
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow('cancelled'); });
    expect(mock.upload).not.toHaveBeenCalled(); expect(mock.verify).not.toHaveBeenCalled();
  });
  it('retains a mismatched copy for review but never reports an approved upload', async () => {
    mock.verify.mockResolvedValue({ ...row, legal_identity_match_status: 'mismatch' });
    const { result } = renderHook(useCreateContractDocument, { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    expect(mock.upload).toHaveBeenCalledOnce(); expect(mock.remove).not.toHaveBeenCalled();
    expect(mock.success).not.toHaveBeenCalled(); expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('لم تُعتمد'));
  });
  it('does not reupload or claim a match when OCR is unavailable', async () => {
    mock.verify.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useCreateContractDocument, { wrapper });
    await act(async () => { await result.current.mutateAsync(input); });
    expect(mock.upload).toHaveBeenCalledOnce(); expect(mock.success).not.toHaveBeenCalled();
    expect(mock.warning).toHaveBeenCalled();
  });
});
