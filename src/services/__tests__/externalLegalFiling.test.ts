import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExternalFilingUncertainError, recordExternalLegalFiling, verifyExternalLegalFiling } from '../externalLegalFiling';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
const input = { companyId: 'company-1', caseId: 'case-1', reference: 'REF-123', date: '2026-09-07' };
const saved = { id: input.caseId, company_id: input.companyId, case_reference: input.reference, filing_date: input.date, workflow_stage: 'awaiting_acceptance' };
const recorded = { state: 'recorded', legalCase: saved };
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({ data: saved, error: null });
});

describe('external filing recovery', () => {
  it('uses a confirmed command result without requiring extra reads', async () => {
    mocks.rpc.mockResolvedValue({ data: recorded, error: null, status: 200 });
    expect(await recordExternalLegalFiling(input)).toEqual(saved);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  for (const failure of [
    { data: null, error: { message: 'AbortError: signal is aborted without reason' }, status: 0 },
    { data: null, error: { message: 'Gateway timeout' }, status: 504 },
    { data: null, error: null, status: 200 },
  ]) {
    it(`recovers the saved case after an ambiguous response (${failure.status}, ${Boolean(failure.error)})`, async () => {
      mocks.rpc.mockResolvedValue(failure);
      expect(await recordExternalLegalFiling(input)).toEqual(saved);
      expect(mocks.rpc).toHaveBeenCalledOnce();
      expect(mocks.eq.mock.calls).toEqual([['company_id', input.companyId], ['id', input.caseId]]);
    });
  }
  it('recovers thrown network errors as well as PostgREST error responses', async () => {
    mocks.rpc.mockRejectedValue(new DOMException('aborted', 'AbortError'));
    expect(await recordExternalLegalFiling(input)).toEqual(saved);
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it('reports an Arabic uncertain outcome and never repeats the command when both requests fail', async () => {
    mocks.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    mocks.maybeSingle.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(recordExternalLegalFiling(input)).rejects.toMatchObject({ name: 'ExternalFilingUncertainError', canRetry: false, message: expect.stringContaining('التحقق من التسجيل') });
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it('allows only a deliberate same-input retry after a successful read of the unrecorded case', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'AbortError: aborted' }, status: 0 });
    mocks.maybeSingle.mockResolvedValue({ data: { ...saved, workflow_stage: 'preparation', case_reference: null, filing_date: null } });
    await expect(recordExternalLegalFiling(input)).rejects.toMatchObject({ canRetry: true });
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it.each([{ case_reference: 'OTHER' }, { filing_date: '2026-09-06' }, { company_id: 'other-company' }, { id: 'other-case' }])('never confirms mismatched evidence: %o', async (patch) => {
    mocks.maybeSingle.mockResolvedValue({ data: { ...saved, ...patch } });
    await expect(verifyExternalLegalFiling(input)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves actionable server validation and does not disguise it as a network error', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'P0001', message: 'أوقف مهمة تقاضي الجارية قبل تسجيل الإيداع الخارجي' }, status: 400 });
    await expect(recordExternalLegalFiling(input)).rejects.toThrow('أوقف مهمة');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not enable retry after a missing or inaccessible case', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(verifyExternalLegalFiling(input)).rejects.toBeInstanceOf(ExternalFilingUncertainError);
  });
});

describe('automatic filing handoff', () => {
  it('preserves existing filing when the new command is not yet installed, without bypassing its guards', async () => {
    mocks.rpc.mockResolvedValueOnce({error:{code:'PGRST202',message:'function missing'},status:404})
      .mockResolvedValueOnce({data:saved,status:200});
    expect(await recordExternalLegalFiling(input)).toEqual(saved);
    expect(mocks.rpc.mock.calls.map(([name])=>name)).toEqual(['record_external_legal_filing_v2','record_external_legal_filing_v1']);
  });
  it.each(['waiting_for_stop', 'waiting_for_receipt'])('continues only after a confirmed %s response', async (state) => {
    vi.useFakeTimers();
    const progress = vi.fn();
    mocks.rpc.mockResolvedValueOnce({ data: { state }, status: 200 })
      .mockResolvedValueOnce({ data: recorded, status: 200 });
    const request = recordExternalLegalFiling(input, progress);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await request).toEqual(saved);
    expect(progress.mock.calls).toEqual([['recording'], [state]]);
    expect(mocks.rpc.mock.calls[0]).toEqual(['record_external_legal_filing_v2', {
      p_company_id: input.companyId, p_case_id: input.caseId, p_reference: input.reference, p_filing_date: input.date,
    }]);
    expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
  });
  it('bounds the wait and preserves the server stop request without issuing a separate cancellation', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValue({ data: { state: 'waiting_for_stop' }, status: 200 });
    const assertion = expect(recordExternalLegalFiling(input)).rejects.toMatchObject({name: 'ExternalFilingWaitError', message: expect.stringContaining('لم يصل تأكيد توقفه')});
    await vi.advanceTimersByTimeAsync(90_000);
    await assertion;
    expect(mocks.rpc.mock.calls.every(([name]) => name === 'record_external_legal_filing_v2')).toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('stops continuation on an ambiguous response after requesting the stop', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValueOnce({data:{state:'waiting_for_stop'},status:200})
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mocks.maybeSingle.mockResolvedValue({ data: { ...saved, workflow_stage:'preparation', case_reference:null } });
    const assertion = expect(recordExternalLegalFiling(input)).rejects.toMatchObject({name:'ExternalFilingUncertainError',canRetry:true});
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
