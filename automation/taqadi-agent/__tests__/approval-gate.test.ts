import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }));
import { TaqadiQueue } from '../database';
import { requiresExistingDraft } from '../adaptive-flow';
import type { FilingJob } from '../types';

const job = { id: 'job-1', company_id: 'company-1', contract_id: 'contract-1', payload: { memoSnapshotId: 'snapshot-1', case: { amount: 50800 }, defendant: { nationality: 'السودان' } } } as FilingJob;
beforeEach(() => rpc.mockReset());
describe('legal file approval gate', () => {
  it('rejects placeholder nationality before any remote validation or browser action', async () => {
    const incomplete = { ...job, payload: { ...job.payload, defendant: { ...job.payload.defendant, nationality: 'غير محدد' } } };
    await expect(new TaqadiQueue().validateBeforePortal(incomplete)).rejects.toMatchObject({ code: 'DEFENDANT_NATIONALITY_REQUIRED' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('requires the saved draft after a mid-flow worker restart', () => {
    expect(requiresExistingDraft(true,54,'open_new_case')).toBe(true);
    expect(requiresExistingDraft(true,54,'process_parties')).toBe(false);
    expect(requiresExistingDraft(true,15,'open_new_case')).toBe(false);
    expect(requiresExistingDraft(false,0,'open_new_case')).toBe(false);
  });
  it('rejects stale attachments before opening the portal', async () => {
    rpc.mockResolvedValueOnce({ data: { ready: false, missing: ['documents.contract.sourceDocumentId'] }, error: null });
    await expect(new TaqadiQueue().validateBeforePortal(job)).rejects.toMatchObject({ code: 'FILING_PACKAGE_INVALID' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('rejects a mismatched claim before opening the portal', async () => {
    rpc.mockResolvedValueOnce({ data: { ready: true }, error: null }).mockResolvedValueOnce({ data: 48700, error: null });
    await expect(new TaqadiQueue().validateBeforePortal(job)).rejects.toMatchObject({ code: 'FILING_CLAIM_CHANGED', details: { packageAmount: 50800, currentAmount: 48700 } });
  });
  it('checks the server amount using its current business date', async () => {
    rpc.mockResolvedValueOnce({ data: { ready: true }, error: null }).mockResolvedValueOnce({ data: 50800, error: null });
    await expect(new TaqadiQueue().validateBeforePortal(job)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenLastCalledWith('calculate_legal_claim_amount_v1', { p_company_id: 'company-1', p_contract_id: 'contract-1' });
  });
  it('preserves structured rejection before any portal submission', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'claim amount changed after the reviewed memo was frozen', details: 'mismatch' } });
    await expect(new TaqadiQueue().approveReviewedLegalFile(job, { matched: true })).rejects.toMatchObject({
      code: 'LEGAL_FILE_APPROVAL_FAILED',
      details: { resumeSupported: true, error: { code: 'P0001', message: 'claim amount changed after the reviewed memo was frozen' } },
    });
  });
  it.each([null, {}, { approved: false }, { approved: true, jobId: 'other', memoSnapshotId: 'snapshot-1' },
    { approved: true, jobId: 'job-1', memoSnapshotId: 'old-snapshot' }])('rejects missing or mismatched approval evidence: %j', async data => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(new TaqadiQueue().approveReviewedLegalFile(job, {})).rejects.toMatchObject({ code: 'LEGAL_FILE_APPROVAL_NOT_CONFIRMED' });
  });
  it('accepts only the exact approved job and snapshot', async () => {
    const data = { approved: true, jobId: 'job-1', memoSnapshotId: 'snapshot-1' };
    rpc.mockResolvedValue({ data, error: null });
    expect(await new TaqadiQueue().approveReviewedLegalFile(job, {})).toEqual(data);
  });
});
