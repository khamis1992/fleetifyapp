import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../store/reducer';
import { LegalDocuments } from '../components/LegalDocuments';

const fixture = vi.hoisted(() => ({ state: {} as ReturnType<typeof createInitialState>, actions: {} }));
vi.mock('../store', () => ({ useLawsuitPreparationContext: () => fixture }));
vi.mock('@/hooks/useTranslation', () => ({ useFleetifyTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../components/FilingPackageCheckButton', () => ({ FilingPackageCheckButton: () => null }));
vi.mock('../utils/legalCaseWorkflow', () => ({ getCriminalComplaintEligibility: () => ({ eligible: false }) }));
vi.mock('../utils/violationDocumentRequirements', () => ({ requiresViolationDocuments: () => false }));
vi.mock('../components/ContractMatchingWorkspace', () => ({
  ContractMatchingWorkspace: ({ contractId, customerId, vehicleId }: { contractId: string; customerId?: string; vehicleId?: string }) =>
    <section data-testid="inline-contract-workspace" data-contract-id={contractId} data-customer-id={customerId} data-vehicle-id={vehicleId}>
      <button>مطابقة يدوية</button>
    </section>,
}));

beforeEach(() => {
  fixture.state = createInitialState('contract-1');
  fixture.state.contractEvidenceDocuments = [{
    id: 'copy-1', document_name: 'نسخة العقد الموقّع.pdf', document_type: 'signed_contract',
    file_path: 'contract-1/contract.pdf', mime_type: 'application/pdf',
    legal_identity_match_status: 'unverified', legal_evidence_state: 'quarantined',
    legal_identity_match_reason: 'الرقم الشخصي غير مقروء',
  }];
  fixture.state.documents.contract.uploadError = 'لا توجد نسخة عقد مطابقة';
});
afterEach(cleanup);

describe('contract attachment review in the lawsuit ledger', () => {
  it('shows the uploaded filename and actual review reason with inline matching controls', () => {
    render(<LegalDocuments />);
    expect(screen.getByText('موجود — يحتاج مراجعة')).toBeInTheDocument();
    expect(screen.getByText(/النسخة المرفوعة: نسخة العقد الموقّع.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/نسخة العقد موجودة.*الرقم الشخصي غير مقروء/)).toBeInTheDocument();
    expect(screen.queryByText('لا توجد نسخة عقد مطابقة')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'مراجعة العقد والمطابقة' })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'مراجعة العقد والمطابقة' })).not.toBeInTheDocument();
    // Presence is not readiness and never exposes the quarantined file for filing.
    const row = screen.getByText('موجود — يحتاج مراجعة').closest('.lawsuit-document-row')!;
    expect(within(row as HTMLElement).queryByRole('button', { name: 'معاينة المستند' })).not.toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('رفع نسخة أخرى')).toBeVisible();
    expect(within(row as HTMLElement).queryByText('رفع الملف')).not.toBeInTheDocument();
    expect(screen.getByText('مستندات تحتاج إجراء')).toBeInTheDocument();
    expect(screen.getByText('حالة النسخة: موجود — يحتاج مراجعة')).toBeInTheDocument();
    expect(screen.queryByText('نسخة العقد ناقصة')).not.toBeInTheDocument();
    expect(screen.queryByText('النواقص الحالية')).not.toBeInTheDocument();
    expect(fixture.state.documents.contract.status).toBe('pending');
  });
  it('distinguishes a truly absent attachment', () => {
    fixture.state.contractEvidenceDocuments = [];
    render(<LegalDocuments />);
    expect(screen.getByText('نسخة العقد ناقصة')).toBeInTheDocument();
    expect(screen.queryByText('موجود — يحتاج مراجعة')).not.toBeInTheDocument();
    const row = screen.getByText('نسخة العقد ناقصة').closest('.lawsuit-document-row')!;
    expect(within(row as HTMLElement).getByText('رفع الملف')).toBeVisible();
    expect(within(row as HTMLElement).queryByText('رفع نسخة أخرى')).not.toBeInTheDocument();
  });
  it('does not label an approved attachment ready while its URL is unavailable', () => {
    fixture.state.contractEvidenceDocuments[0].legal_identity_match_status = 'matched';
    fixture.state.contractEvidenceDocuments[0].legal_evidence_state = 'active';
    fixture.state.documents.contract.uploadError = 'تعذر تحميل رابط الملف';
    render(<LegalDocuments />);
    expect(screen.getByText('موجود — قيد التجهيز')).toBeInTheDocument();
    expect(screen.getByText('تعذر تحميل رابط الملف')).toBeInTheDocument();
  });
  it.each([0, 1])('opens the matching workspace from action %s and returns without navigation or marking pending evidence ready', async (index) => {
    const url = window.location.href;
    fixture.state.contract = {
      id: 'contract-1', contract_number: 'C-ALF-0079', customer_id: 'customer-1', vehicle_id: 'vehicle-1',
      start_date: '2025-04-01', end_date: null, monthly_amount: null, license_plate: null, status: 'legal_action',
    };
    render(<LegalDocuments />);
    expect(screen.queryByTestId('inline-contract-workspace')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'مراجعة العقد والمطابقة' })[index]);
    const dialog = screen.getByRole('dialog', { name: 'مراجعة العقد والمطابقة' });
    const workspace = await within(dialog).findByTestId('inline-contract-workspace');
    expect(workspace).toHaveAttribute('data-contract-id', 'contract-1');
    expect(workspace).toHaveAttribute('data-customer-id', 'customer-1');
    expect(workspace).toHaveAttribute('data-vehicle-id', 'vehicle-1');
    expect(within(dialog).getByRole('button', { name: 'مطابقة يدوية' })).toBeVisible();
    expect(fixture.state.documents.contract.status).toBe('pending');
    fireEvent.click(within(dialog).getByRole('button', { name: 'العودة إلى حافظة الدعوى' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.href).toBe(url);
  });
  it('provides the same inline workspace when no signed copy exists', async () => {
    fixture.state.contractEvidenceDocuments = [];
    render(<LegalDocuments />);
    fireEvent.click(screen.getAllByRole('button', { name: 'مراجعة العقد والمطابقة' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'مراجعة العقد والمطابقة' });
    await within(dialog).findByTestId('inline-contract-workspace');
    expect(within(dialog).getByText(/اختر النسخة أدناه لإكمال مراجعتها واعتمادها/)).toBeInTheDocument();
  });
  it('keeps the matching workspace open across a verified context refresh', async () => {
    const view = render(<LegalDocuments />);
    fireEvent.click(screen.getAllByRole('button', { name: 'مراجعة العقد والمطابقة' })[0]);
    await screen.findByTestId('inline-contract-workspace');
    fixture.state.contractEvidenceDocuments[0].legal_identity_match_status = 'matched';
    fixture.state.contractEvidenceDocuments[0].legal_evidence_state = 'active';
    fixture.state.documents.contract.status = 'ready';
    fixture.state.documents.contract.url = 'https://example.test/verified.pdf';
    view.rerender(<LegalDocuments />);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByTestId('inline-contract-workspace')).toBeInTheDocument();
  });
});
