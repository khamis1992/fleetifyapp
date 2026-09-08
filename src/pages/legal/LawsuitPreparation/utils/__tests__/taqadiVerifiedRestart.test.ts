import { beforeEach, expect, it, vi } from 'vitest';
import { restartVerifiedUnsubmittedJob } from '../taqadiVerifiedRestart';
import type { TaqadiFilingPayload } from '../taqadiAutomation';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
beforeEach(() => rpc.mockReset());
const payload = { schemaVersion: '1.0', documents: [] } as unknown as TaqadiFilingPayload;
const confirmation = { jobId: 'job', expectedUpdatedAt: '2026-09-07T15:44:28.709199Z', requestId: 'request',
  confirmedNotSubmitted: true, verificationNote: 'راجعت الطلب ولم يتم إيداعه' };
it('sends current package, human confirmation and the same concurrency/idempotency tokens on retry', async () => {
  const job = { id: 'job', company_id: 'company', status: 'queued' };
  rpc.mockResolvedValue({ data: job, error: null });
  await restartVerifiedUnsubmittedJob('company', payload, confirmation);
  await restartVerifiedUnsubmittedJob('company', payload, confirmation);
  expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  expect(rpc).toHaveBeenCalledWith('restart_verified_unsubmitted_taqadi_job_v1', {
    p_company_id: 'company', p_job_id: 'job', p_payload: payload,
    p_expected_updated_at: confirmation.expectedUpdatedAt, p_confirmed_not_submitted: true,
    p_verification_note: confirmation.verificationNote, p_request_id: 'request',
  });
});
it.each([{ confirmedNotSubmitted: false }, { verificationNote: '  ' }, { verificationNote: 'x'.repeat(2001) }])
('does not send an unconfirmed restart %j', async patch => {
  await expect(restartVerifiedUnsubmittedJob('company', payload, { ...confirmation, ...patch })).rejects.toThrow('أكد مراجعة');
  expect(rpc).not.toHaveBeenCalled();
});
it('does not fall back to an ordinary retry when the verified command is unavailable', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Missing function' } });
  await expect(restartVerifiedUnsubmittedJob('company', payload, confirmation)).rejects.toThrow('غير متاح');
  expect(rpc).toHaveBeenCalledOnce();
});
it('preserves actionable database errors', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'يوجد إيصال محفوظ' } });
  await expect(restartVerifiedUnsubmittedJob('company', payload, confirmation)).rejects.toThrow('يوجد إيصال محفوظ');
});
it.each([null, {}, { id: 'other', company_id: 'company', status: 'queued' }, { id: 'job', company_id: 'other', status: 'queued' }])
('rejects an unrelated or missing acknowledgement %j', async data => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(restartVerifiedUnsubmittedJob('company', payload, confirmation)).rejects.toThrow('لم يؤكد النظام');
});
