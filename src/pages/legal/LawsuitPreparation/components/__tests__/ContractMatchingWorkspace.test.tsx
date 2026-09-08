import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../../store/reducer';
import type { ContractDocument } from '@/hooks/useContractDocuments';
import { ContractMatchingWorkspace } from '../ContractMatchingWorkspace';

const mocks = vi.hoisted(() => ({
  state: {} as ReturnType<typeof createInitialState>,
  query: {} as { data: ContractDocument[]; isPending: boolean; isFetching: boolean; isSuccess: boolean; dataUpdatedAt: number; error: Error | null; refetch: ReturnType<typeof vi.fn> },
  invalidate: vi.fn(), opened: vi.fn(),
}));
vi.mock('../../store', () => ({ useLawsuitPreparationContext: () => ({ state: mocks.state }) }));
vi.mock('@/hooks/useContractDocuments', () => ({ useContractDocuments: () => mocks.query }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('@/components/contracts/ManualContractIdentityReview', () => ({
  IdentityReviewDialog: ({ document }: { document: ContractDocument }) => {
    mocks.opened(document);
    return <div role="dialog" aria-label="مطابقة العقد يدويًا">{document.id}</div>;
  },
}));
vi.mock('@/components/contracts/CustomerContractAttachment', () => ({
  CustomerContractAttachment: ({ document, onAttached, buttonLabel }: { document: ContractDocument; onAttached: (copy: ContractDocument) => void; buttonLabel: string }) =>
    <button onClick={() => onAttached({ ...document, id: 'new-copy', sourceType: 'contract' })}>{buttonLabel}</button>,
}));
vi.mock('@/components/contracts/ContractDocuments', () => ({ ContractDocuments: () => <p>مكتبة المستندات الكاملة</p> }));

const copy: ContractDocument = {
  id: 'copy-1', company_id: 'company-1', contract_id: 'contract-1', sourceType: 'contract',
  document_type: 'signed_contract', document_name: 'signed.pdf', file_path: 'contract-1/signed.pdf',
  mime_type: 'application/pdf', uploaded_at: null, created_at: null, updated_at: null, is_required: true,
  legal_identity_match_status: 'unverified', legal_evidence_state: 'active',
};
const customerCopy: ContractDocument = { ...copy, id: 'customer-copy', sourceType: 'customer', sourceOwnerId: 'customer-1' };
const workspace = <ContractMatchingWorkspace contractId="contract-1" customerId="customer-1" />;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = createInitialState('contract-1'); mocks.state.companyId = 'company-1';
  mocks.query = { data: [copy], isPending: false, isFetching: false, isSuccess: true, dataUpdatedAt: 1, error: null, refetch: vi.fn() };
  mocks.invalidate.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('direct lawsuit contract approval workspace', () => {
  it('offers review for a quarantined name assessment but explains a blocked identity-number conflict', () => {
    mocks.query.data = [{ ...copy, legal_evidence_state: 'quarantined', legal_identity_details: { reasonCode: 'tenant_name_conflict' } },
      { ...copy, id: 'conflict-copy', document_name: 'conflict.pdf', legal_evidence_state: 'quarantined', legal_identity_match_status: 'mismatch', legal_identity_details: { reasonCode: 'identity_number_conflict' } }];
    render(workspace);
    expect(screen.getByRole('button', { name: 'مراجعة واعتماد هذه النسخة' })).toBeEnabled();
    const conflict = screen.getByRole('region', { name: 'نسخة العقد: conflict.pdf' });
    expect(within(conflict).queryByRole('button')).not.toBeInTheDocument();
    expect(within(conflict).getByText(/لا تقبل الاعتماد المباشر/)).toBeInTheDocument();
  });
  it('opens approval for the actual contract copy without a library detour', () => {
    render(workspace);
    expect(screen.queryByText('مكتبة المستندات الكاملة')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة واعتماد هذه النسخة' }));
    expect(screen.getByRole('dialog', { name: 'مطابقة العقد يدويًا' })).toHaveTextContent('copy-1');
    expect(mocks.opened).toHaveBeenLastCalledWith(copy);
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['contract-document', 'contract-1', 'company-1'] });
    expect(mocks.state.documents.contract.status).toBe('pending');
  });
  it('uses current customer ownership instead of a stale contract-copy assessment, then opens the newly attached copy', () => {
    mocks.state.contractEvidenceDocuments = [{ ...copy, file_path: copy.file_path!, mime_type: copy.mime_type!, legal_identity_match_status: 'unverified', legal_evidence_state: 'active' }];
    mocks.query.data = [customerCopy];
    render(workspace);
    expect(screen.getByText('نسخة موجودة في ملف العميل — يلزم إرفاقها بهذا العقد')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مراجعة واعتماد هذه النسخة' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق النسخة ومتابعة الاعتماد' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('new-copy');
    expect(mocks.opened).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'new-copy', sourceType: 'contract' }));
  });
  it('does not offer another attachment for an already linked source or approve superseded copies', () => {
    mocks.query.data = [{ ...copy, notes: '[customer-document:customer-copy]' }, customerCopy,
      { ...copy, id: 'old-copy', document_name: 'old.pdf', legal_evidence_state: 'superseded' }];
    render(workspace);
    expect(screen.queryByRole('button', { name: 'إرفاق النسخة ومتابعة الاعتماد' })).not.toBeInTheDocument();
    const old = screen.getByRole('region', { name: 'نسخة العقد: old.pdf' });
    expect(within(old).queryByRole('button')).not.toBeInTheDocument();
  });
  it('does not use other companies or contracts, even when the previous assessment said ready', () => {
    mocks.query.data = [{ ...copy, company_id: 'other-company' }, { ...copy, contract_id: 'other-contract' }];
    mocks.state.documents.contract.status = 'ready'; mocks.state.documents.contract.sourceDocumentId = copy.id;
    render(workspace);
    expect(screen.getByText('نسخة العقد ناقصة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مراجعة واعتماد هذه النسخة' })).not.toBeInTheDocument();
    expect(screen.queryByText('نسخة العقد مطابقة وجاهزة في حافظة الدعوى')).not.toBeInTheDocument();
  });
  it('does not show stale actions while loading or after a failed inventory read', () => {
    mocks.query.isFetching = true;
    const view = render(workspace);
    expect(screen.getByRole('button', { name: 'مراجعة واعتماد هذه النسخة' })).toBeDisabled();
    mocks.query.isFetching = false; mocks.query.error = new Error('network'); mocks.query.isSuccess = false;
    view.rerender(<ContractMatchingWorkspace contractId="contract-1" customerId="customer-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل النسخ الحالية');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل النسخ' }));
    expect(mocks.query.refetch).toHaveBeenCalledOnce();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it('shows ready only after the live matched copy and filing assessment agree', () => {
    mocks.query.data = [{ ...copy, legal_identity_match_status: 'matched' }];
    const view = render(workspace);
    expect(screen.getByText('النسخة مطابقة، جارٍ تجهيزها للحافظة')).toBeInTheDocument();
    mocks.state.documents.contract.status = 'ready'; mocks.state.documents.contract.sourceDocumentId = copy.id;
    view.rerender(<ContractMatchingWorkspace contractId="contract-1" customerId="customer-1" />);
    expect(screen.getByText('نسخة العقد مطابقة وجاهزة في حافظة الدعوى')).toBeInTheDocument();
  });
});
