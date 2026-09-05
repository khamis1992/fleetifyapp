import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resumeTaqadiFilingJob, type TaqadiFilingPayload } from '../taqadiAutomation';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/services/LawsuitService', () => ({ lawsuitService: {} }));
const fresh = { documents: [{ key: 'contract', sourceDocumentId: 'fresh-document', url: 'https://example.invalid/new.pdf' }] } as unknown as TaqadiFilingPayload;
beforeEach(() => { rpc.mockReset(); });

describe('fresh atomic Taqadi resume', () => {
  it('always sends the new evidence package in a single atomic request', async () => {
    rpc.mockResolvedValue({ data: { id: 'job', company_id: 'company', status: 'queued' }, error: null });
    await resumeTaqadiFilingJob('company', 'job', fresh);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('resume_taqadi_filing_job_v2', {
      p_company_id: 'company', p_job_id: 'job', p_payload: fresh,
    });
  });
  it('does not fall back to an old snapshot when the migration is missing', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } });
    await expect(resumeTaqadiFilingJob('company', 'job', fresh)).rejects.toThrow('غير منشور');
    expect(rpc).toHaveBeenCalledOnce();
  });
  it('propagates source validation rejection without a second resume', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED' } });
    await expect(resumeTaqadiFilingJob('company', 'job', fresh)).rejects.toMatchObject({ code: '23514' });
    expect(rpc).toHaveBeenCalledOnce();
  });
  for (const response of [null, {}, { id: 'other', company_id: 'company', status: 'queued' },
    { id: 'job', company_id: 'other', status: 'queued' }, { id: 'job', company_id: 'company', status: 'failed' }]) {
    it(`rejects an unconfirmed acknowledgement: ${JSON.stringify(response)}`, async () => {
      rpc.mockResolvedValue({ data: response, error: null });
      await expect(resumeTaqadiFilingJob('company', 'job', fresh)).rejects.toThrow('لم تؤكد قاعدة البيانات');
      expect(rpc).toHaveBeenCalledOnce();
    });
  }
});
