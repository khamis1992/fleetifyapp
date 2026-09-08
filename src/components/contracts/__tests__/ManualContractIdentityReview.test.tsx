import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContractDocument } from '@/hooks/useContractDocuments';
import { IdentityReviewDialog, ManualContractIdentityReview } from '../ManualContractIdentityReview';
import { ContractIdentityBadge } from '../ContractIdentityBadge';

const mocks = vi.hoisted(() => ({ review: vi.fn(), invalidate: vi.fn(), success: vi.fn() }));
vi.mock('@/services/manualContractIdentityReview', () => ({ reviewContractDocumentIdentity: mocks.review }));
vi.mock('@/utils/contractDocumentQueries', () => ({ invalidateContractDocumentDependents: mocks.invalidate }));
vi.mock('sonner', () => ({ toast: { success: mocks.success } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/lease.pdf' }, error: null }) }) } } }));
const document: ContractDocument = {
  id: 'document-1', company_id: 'company-1', contract_id: 'contract-1',
  document_type: 'signed_contract', document_name: 'نسخة العقد.pdf', file_path: 'contract-1/lease.pdf',
  sourceType: 'contract', uploaded_at: null, is_required: true, created_at: null, updated_at: null,
};
const preview = {
  revision: 'preview-revision', document_name: document.document_name, file_path: document.file_path,
  mime_type: 'application/pdf', customer_name: 'عميل تجريبي', national_id: '29900000001', contract_number: 'TEST-LEASE',
  status: 'mismatch', extracted_name: 'قراءة قديمة', extracted_id: '29900000002', previous_reason: 'قراءة غير مطابقة',
};
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const close = vi.fn();
  render(<QueryClientProvider client={client}><IdentityReviewDialog document={document} onClose={close} /></QueryClientProvider>);
  return { client, close };
}
async function completeForm() {
  await screen.findByText('عميل تجريبي');
  fireEvent.change(screen.getByLabelText('الرقم الشخصي كما يظهر في العقد'), { target: { value: '29900000001' } });
  fireEvent.change(screen.getByLabelText('سبب المطابقة اليدوية'), { target: { value: 'راجعت العقد وتحققت من هوية المستأجر' } });
  fireEvent.click(screen.getByRole('checkbox'));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.review.mockImplementation(async (_document, approval) => approval ? { status: 'matched', review_id: 'review-1', replayed: false } : preview);
  mocks.invalidate.mockResolvedValue(undefined);
});
describe('manual contract identity review', () => {
  it('requires an observation, reason and attestation before saving, then refreshes all document consumers', async () => {
    const { client, close } = setup();
    await screen.findByText('عميل تجريبي');
    expect(screen.getByRole('button', { name: 'اعتماد المطابقة اليدوية' })).toBeDisabled();
    await completeForm();
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد المطابقة اليدوية' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(mocks.review).toHaveBeenLastCalledWith(document, {
      revision: 'preview-revision', observedId: '29900000001', reason: 'راجعت العقد وتحققت من هوية المستأجر', confirmed: true,
    });
    expect(mocks.invalidate).toHaveBeenCalledWith(client, 'company-1', 'contract-1');
  });
  it('keeps the form open and shows the server refusal without claiming completion', async () => {
    mocks.review.mockImplementation(async (_document, approval) => {
      if (approval) throw new Error('تغيرت بيانات العقد؛ افتح المطابقة مجددًا');
      return preview;
    });
    const { close } = setup();
    await completeForm();
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد المطابقة اليدوية' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تغيرت بيانات العقد');
    expect(close).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('does not offer contract approval for inherited customer files', () => {
    render(<ManualContractIdentityReview document={{ ...document, sourceType: 'customer' }} />);
    expect(screen.queryByRole('button', { name: 'مطابقة يدوية' })).not.toBeInTheDocument();
  });
  it('distinguishes a saved human approval from an automatic identity match', () => {
    render(<ContractIdentityBadge type="signed_contract" status="matched" reason="مطابقة يدوية معتمدة: تم فحص الملف" />);
    expect(screen.getByText('مطابق يدويًا')).toBeInTheDocument();
  });
});
