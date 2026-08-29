import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LawsuitPreparationState } from '../../store';
import { openLegalCase, registerLegalCase } from '../caseRegistration';

const { assertFilingCanStartMock, assertFilingReadyMock, rpcMock } = vi.hoisted(() => ({
  assertFilingCanStartMock: vi.fn(),
  assertFilingReadyMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));
vi.mock('../filingReadiness', () => ({
  assertFilingCanStart: assertFilingCanStartMock,
  assertFilingReady: assertFilingReadyMock,
}));

function createState(): LawsuitPreparationState {
  const readyDocument = { status: 'ready', htmlContent: '<p>ready</p>' };
  return {
    companyId: 'company-1',
    contractId: 'contract-1',
    // مكونات موثقة: صافي إيجارات 1500 + غرامات 0 + مخالفات 250 = 1750
    calculations: {
      overdueRent: 1500,
      lateFees: 0,
      violationsFines: 250,
      total: 1750,
    },
    documents: {
      memo: readyDocument,
      claims: readyDocument,
      docsList: readyDocument,
    },
    taqadiData: {
      caseTitle: 'دعوى مطالبة مالية',
      claims: 'إلزام المدعى عليه بالسداد',
      facts: 'تأخر عن السداد',
    },
  } as unknown as LawsuitPreparationState;
}

describe('openLegalCase', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    assertFilingCanStartMock.mockReset();
    assertFilingReadyMock.mockReset();
  });

  it('creates a preparation record without requiring user approval', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          case_number: 'CASE-26-0028',
          legal_case: { id: 'case-1', case_number: 'CASE-26-0028' },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { case_id: 'case-1' }, error: null });

    await expect(registerLegalCase(createState(), 'user-1', {
      preparationOnly: true,
    })).resolves.toEqual({
      caseId: 'case-1',
      caseNumber: 'CASE-26-0028',
    });

    expect(assertFilingCanStartMock).toHaveBeenCalledOnce();
    expect(assertFilingReadyMock).not.toHaveBeenCalled();
  });

  it('registers, syncs, then transitions the case to filed and active', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          case_number: 'CASE-26-0028',
          legal_case: { id: 'case-1', case_number: 'CASE-26-0028' },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { case_id: 'case-1' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'case-1', workflow_stage: 'filed', case_status: 'active' },
        error: null,
      });

    await expect(openLegalCase(createState(), 'user-1')).resolves.toEqual({
      caseId: 'case-1',
      caseNumber: 'CASE-26-0028',
    });

    expect(assertFilingReadyMock).toHaveBeenCalledOnce();

    expect(rpcMock.mock.calls.map(([name]) => name)).toEqual([
      'convert_contract_to_legal_v1',
      'sync_lawsuit_preparation_to_legal_case_v1',
      'finalize_legal_case_filing_v1',
    ]);
    expect(rpcMock).toHaveBeenNthCalledWith(
      2,
      'sync_lawsuit_preparation_to_legal_case_v1',
      expect.objectContaining({ p_claim_amount: 1750 }),
    );
    expect(rpcMock).toHaveBeenLastCalledWith(
      'finalize_legal_case_filing_v1',
      expect.objectContaining({
        p_company_id: 'company-1',
        p_contract_id: 'contract-1',
        p_case_id: 'case-1',
        p_claim_amount: 1750,
        p_actor_id: 'user-1',
      }),
    );
  });

  it('does not report success when the database leaves the case pending', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          case_number: 'CASE-26-0028',
          legal_case: { id: 'case-1', case_number: 'CASE-26-0028' },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { case_id: 'case-1' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'case-1', workflow_stage: 'preparation', case_status: 'pending' },
        error: null,
      });

    await expect(openLegalCase(createState(), 'user-1')).rejects.toThrow(
      'لم تؤكد قاعدة البيانات انتقال القضية إلى الحالة المرفوعة',
    );
  });
});
