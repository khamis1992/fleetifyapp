import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../../store/reducer';
import type { LawsuitPreparationState } from '../../store/types';
import { freezeCurrentMemoSnapshot, MemoFactsChangedError } from '../memoSnapshot';

const mocks = vi.hoisted(() => ({ load: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('../documentGenerators', async (importOriginal) => ({
  ...await importOriginal<typeof import('../documentGenerators')>(),
  loadCanonicalLawsuitState: mocks.load,
}));

function readyState(): LawsuitPreparationState {
  return {
    ...createInitialState('contract-1'), companyId: 'company-1',
    contract: { id: 'contract-1', contract_number: 'TEST-1', vehicle_id: 'vehicle-1',
      monthly_amount: 1700, start_date: '2026-01-01', end_date: '2027-01-01' },
    customer: { id: 'customer-1', first_name_ar: 'عميل', last_name_ar: 'اختبار',
      national_id: 'test-identity', nationality: 'قطري', email: 'customer@example.test' },
    vehicle: { plate_number: 'TEST', make: 'Test', model: 'Car', year: 2026 },
    legalCase: { id: 'case-1', claim_scope: 'full_outstanding', case_number: 'CASE-TEST', filing_date: null },
    litigationProfile: { rescission_strategy: 'judicial_rescission', vehicle_custody: 'with_defendant',
      defendant_email_status: 'verified', defendant_contact_source: 'customer_record' },
    documents: { contract: { sourceDocumentId: 'signed-contract' } },
    overdueInvoices: [{ id: 'invoice-1', due_date: '2026-08-01', invoice_month: '2026-08-01',
      total_amount: 1700, paid_amount: 700, service_period_start: '2026-08-01', service_period_end: '2026-08-31' }],
    calculations: { overdueRent: 1000, lateFees: 0, damagesFee: 0, violationsFines: 0,
      retentionCompensation: 0, securityDepositDeduction: 0, total: 1000 },
    financialClaimSource: { authoritativeAmounts: { overdueRent: 1000, lateFees: 0,
      damagesFee: 0, violationsFines: 0, retentionCompensation: 0, securityDepositDeduction: 0, total: 1000 } },
  } as unknown as LawsuitPreparationState;
}

describe('freezing current memo facts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T22:30:00Z'));
    mocks.load.mockReset();
    mocks.rpc.mockReset().mockResolvedValue({ data: { id: 'snapshot-1' }, error: null });
  });
  afterEach(() => vi.useRealTimers());

  it('reloads persisted facts and uses one Qatar date for memo and snapshot', async () => {
    const state = readyState();
    mocks.load.mockResolvedValue(state);
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', state)).resolves.toEqual({ id: 'snapshot-1' });
    expect(mocks.load).toHaveBeenCalledWith('company-1', 'contract-1');
    expect(mocks.rpc).toHaveBeenCalledWith('freeze_legal_case_memo_snapshot', expect.objectContaining({
      p_company_id: 'company-1', p_contract_id: 'contract-1', p_case_id: 'case-1',
      p_facts_as_of_date: '2026-09-09', p_approve: false,
      p_payload: expect.objectContaining({ memoDate: '09/09/2026', grossInvoicesTotal: 1700,
        paidTotal: 700, unpaidPeriodTo: '31/08/2026', customer: expect.objectContaining({ overdue_amount: 1000 }) }),
    }));
  });

  it('requires review when gross rent and receipts change even if net and total are identical', async () => {
    const reviewed = readyState();
    const current = readyState();
    current.overdueInvoices[0].total_amount = 1800;
    current.overdueInvoices[0].paid_amount = 800;
    mocks.load.mockResolvedValue(current);
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', reviewed)).rejects.toBeInstanceOf(MemoFactsChangedError);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires review when the covered service period changes without an amount change', async () => {
    const reviewed = readyState();
    const current = readyState();
    current.overdueInvoices[0].service_period_end = '2026-08-20';
    mocks.load.mockResolvedValue(current);
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', reviewed)).rejects.toBeInstanceOf(MemoFactsChangedError);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('refuses inconsistent current receipt details before saving', async () => {
    const current = readyState();
    current.overdueInvoices[0].paid_amount = 800;
    mocks.load.mockResolvedValue(current);
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', readyState())).rejects.toThrow('لا تتطابق الأجرة');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not save when a supporting contract is removed or the reload fails', async () => {
    const current = readyState();
    current.documents.contract.sourceDocumentId = undefined;
    mocks.load.mockResolvedValueOnce(current).mockRejectedValueOnce(new Error('تعذر تحديث البيانات'));
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', readyState())).rejects.toThrow('نسخة العقد');
    await expect(freezeCurrentMemoSnapshot('company-1', 'contract-1', readyState())).rejects.toThrow('تعذر تحديث البيانات');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
