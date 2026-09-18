import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceiptOutbox, ReceiptSynchronizer } from '../receipt-outbox';
import type { FilingJob, FilingResult } from '../types';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const job = {
  id: id(1), company_id: id(2), contract_id: id(3), legal_case_id: id(4),
  payload: { memoSnapshotId: id(5) },
} as FilingJob;
const result: FilingResult = { caseNumber: null, referenceNumber: 'REF-123', courtFees: 3000, confirmationText: 'تم بنجاح' };
let directory: string;
let outbox: ReceiptOutbox;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taqadi-receipts-'));
  outbox = new ReceiptOutbox(directory);
});
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

describe('durable receipt synchronization', () => {
  it('survives restart and acknowledges only after database completion', async () => {
    await outbox.save(job, 'worker-1', result);
    const restarted = new ReceiptOutbox(directory);
    const complete = vi.fn().mockResolvedValue({ status: 'filed' });
    await new ReceiptSynchronizer(restarted, { complete, markReceiptSyncPending: vi.fn() }, 'worker-1').flush();
    expect(complete).toHaveBeenCalledWith(job.id, result, expect.objectContaining({ companyId: job.company_id, memoSnapshotId: id(5) }));
    expect(await restarted.pending()).toEqual([]);
    expect((await restarted.read(job.id))?.syncedAt).toBeTruthy();
  });

  it('keeps the receipt during an outage and backs off before retrying synchronization', async () => {
    await outbox.save(job, 'worker-1', result);
    let now = 0;
    const complete = vi.fn().mockRejectedValueOnce({ code: 'PGRST002', message: 'database unavailable' }).mockResolvedValue({ status: 'filed' });
    const markReceiptSyncPending = vi.fn().mockResolvedValue(undefined);
    const sync = new ReceiptSynchronizer(outbox, { complete, markReceiptSyncPending }, 'worker-1', () => now);
    expect((await sync.flush()).pending).toBe(1);
    expect((await outbox.read(job.id))?.syncedAt).toBeUndefined();
    await sync.flush();
    expect(complete).toHaveBeenCalledTimes(1);
    now = 2001;
    expect((await sync.flush()).pending).toBe(0);
    expect(markReceiptSyncPending).toHaveBeenCalledTimes(1);
  });

  it('replays the same receipt when the database committed but its response was lost', async () => {
    await outbox.save(job, 'worker-1', result);
    const committed = new Set<string>();
    let calls = 0;
    const complete = vi.fn(async (jobId: string) => {
      committed.add(jobId);
      if (++calls === 1) throw new TypeError('fetch failed');
    });
    const queue = { complete, markReceiptSyncPending: vi.fn().mockRejectedValue(new Error('already filed')) };
    expect((await new ReceiptSynchronizer(outbox, queue, 'worker-1').flush()).pending).toBe(1);
    expect((await new ReceiptSynchronizer(new ReceiptOutbox(directory), queue, 'worker-1').flush()).pending).toBe(0);
    expect(committed.size).toBe(1);
    expect(complete.mock.calls[0]).toEqual(complete.mock.calls[1]);
  });

  it('retains a persistent failure and publishes it through the conditional pending writer', async () => {
    await outbox.save(job, 'worker-1', result);
    const complete = vi.fn().mockRejectedValue({ code: 'P0001', message: 'Filing job lock was lost' });
    const markReceiptSyncPending = vi.fn().mockResolvedValue(undefined);
    const sync = new ReceiptSynchronizer(outbox, { complete, markReceiptSyncPending }, 'worker-1', () => 0);
    expect((await sync.flush()).pending).toBe(1);
    await sync.flush();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(markReceiptSyncPending).toHaveBeenCalledWith(expect.objectContaining({ jobId: job.id }), 'Filing job lock was lost');
  });

  it('rejects conflicting evidence and corrupt records instead of silently skipping them', async () => {
    await outbox.save(job, 'worker-1', result);
    await expect(outbox.save(job, 'worker-1', { ...result, referenceNumber: 'OTHER-456' })).rejects.toThrow('Conflicting');
    await fs.writeFile(path.join(directory, `${job.id}.json`), '{broken');
    await expect(outbox.pending()).rejects.toThrow();
  });

  it('does not replay a receipt from another worker', async () => {
    await outbox.save(job, 'worker-1', result);
    const complete = vi.fn();
    expect((await new ReceiptSynchronizer(outbox, { complete, markReceiptSyncPending: vi.fn() }, 'worker-2').flush()).pending).toBe(1);
    expect(complete).not.toHaveBeenCalled();
  });
});
