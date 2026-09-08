import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import type { FilingJob, FilingResult } from './types';
import { describeError } from './error-details';
export { describeError } from './error-details';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SavedReceipt {
  version: 1;
  jobId: string;
  companyId: string;
  legalCaseId: string;
  contractId: string;
  workerId: string;
  memoSnapshotId: string | null;
  payloadHash: string;
  capturedAt: string;
  result: FilingResult;
  syncedAt?: string;
}

export const receiptReference = (result: FilingResult) =>
  (result.referenceNumber || result.caseNumber || '').trim();

export function isTransientSyncError(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code) : '';
  if (/^(PGRST00[0-3]|08|40|53|57P|ECONN|ETIMEDOUT)/.test(code)) return true;
  if (code) return false;
  return /fetch|network|timeout|timed out|abort|socket|connection/i.test(describeError(error));
}

/** Only immutable submission evidence is replayed; this class has no portal API. */
export class ReceiptOutbox {
  private initialized: Promise<void> | null = null;

  constructor(private readonly directory: string) {}

  initialize() {
    this.initialized ??= (async () => {
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      if (process.platform === 'win32') {
        const account = process.env.USERDOMAIN
          ? `${process.env.USERDOMAIN}\\${os.userInfo().username}`
          : os.userInfo().username;
        await promisify(execFile)('icacls.exe', [
          this.directory, '/inheritance:r', '/grant:r', `${account}:(OI)(CI)F`,
          '*S-1-5-18:(OI)(CI)F',
        ], { windowsHide: true, timeout: 10_000 });
      } else {
        await fs.chmod(this.directory, 0o700);
      }
    })();
    return this.initialized;
  }

  private file(jobId: string) {
    if (!uuid.test(jobId)) throw new Error('Invalid receipt job id');
    return path.join(this.directory, `${jobId}.json`);
  }

  private async write(receipt: SavedReceipt) {
    const target = this.file(receipt.jobId);
    const temporary = `${target}.${randomUUID()}.tmp`;
    const handle = await fs.open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(receipt), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporary, target);
    // Flush the directory entry where the OS supports directory fsync.
    if (process.platform !== 'win32') {
      const directoryHandle = await fs.open(this.directory, 'r');
      try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    }
  }

  async save(job: FilingJob, workerId: string, result: FilingResult): Promise<SavedReceipt> {
    await this.initialize();
    if (!receiptReference(result)) throw new Error('A proven receipt reference is required');
    const existing = await this.read(job.id);
    if (existing) {
      if (existing.companyId !== job.company_id || existing.contractId !== job.contract_id
        || existing.legalCaseId !== job.legal_case_id || existing.workerId !== workerId
        || existing.memoSnapshotId !== (job.payload.memoSnapshotId || null)
        || receiptReference(existing.result) !== receiptReference(result)) {
        throw new Error('Conflicting local filing receipt; verify the existing submission');
      }
      return existing;
    }
    const receipt: SavedReceipt = {
      version: 1, jobId: job.id, companyId: job.company_id,
      legalCaseId: job.legal_case_id, contractId: job.contract_id, workerId,
      memoSnapshotId: job.payload.memoSnapshotId || null,
      payloadHash: createHash('sha256').update(JSON.stringify(job.payload)).digest('hex'),
      capturedAt: new Date().toISOString(), result,
    };
    await this.write(receipt);
    return receipt;
  }

  async read(jobId: string): Promise<SavedReceipt | null> {
    let content: string;
    try { content = await fs.readFile(this.file(jobId), 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    const value = JSON.parse(content) as SavedReceipt;
    if (value.version !== 1 || value.jobId !== jobId || !uuid.test(value.companyId)
      || !uuid.test(value.contractId) || !uuid.test(value.legalCaseId)
      || !value.workerId || !value.result || !receiptReference(value.result)) {
      throw new Error(`Invalid saved receipt for job ${jobId}; manual verification required`);
    }
    return value;
  }

  async pending(): Promise<SavedReceipt[]> {
    await this.initialize();
    const files = (await fs.readdir(this.directory)).filter(name => name.endsWith('.json')).sort();
    const entries = await Promise.all(files.map(name => this.read(name.slice(0, -5))));
    return entries.filter((entry): entry is SavedReceipt => Boolean(entry && !entry.syncedAt));
  }

  async acknowledge(receipt: SavedReceipt) {
    await this.write({ ...receipt, syncedAt: new Date().toISOString() });
  }
}

interface CompletionQueue {
  complete(jobId: string, result: FilingResult, receipt: SavedReceipt): Promise<unknown>;
  markReceiptSyncPending(receipt: SavedReceipt, error?: string): Promise<unknown>;
}

export class ReceiptSynchronizer {
  private readonly retries = new Map<string, { attempts: number; retryAt: number; error: string }>();

  constructor(
    private readonly outbox: ReceiptOutbox,
    private readonly queue: CompletionQueue,
    private readonly workerId: string,
    private readonly now = Date.now,
  ) {}

  async flush(): Promise<{ pending: number; jobId: string | null; error: string | null }> {
    const receipts = await this.outbox.pending();
    for (const receipt of receipts) {
      const retry = this.retries.get(receipt.jobId);
      if (retry && retry.retryAt > this.now()) continue;
      try {
        if (receipt.workerId !== this.workerId) throw new Error('Receipt belongs to another worker');
        // Complete first: a previous request may have committed but lost its response.
        await this.queue.complete(receipt.jobId, receipt.result, receipt);
        await this.outbox.acknowledge(receipt);
        this.retries.delete(receipt.jobId);
      } catch (error) {
        const transient = isTransientSyncError(error);
        const attempts = (retry?.attempts || 0) + 1;
        const delay = transient ? Math.min(60_000, 2_000 * 2 ** Math.min(attempts - 1, 5)) : 300_000;
        this.retries.set(receipt.jobId, {
          attempts, retryAt: this.now() + delay, error: describeError(error),
        });
        // Best effort only. Never overwrite a terminal state after a lost response.
        if (receipt.workerId === this.workerId) {
          await this.queue.markReceiptSyncPending(receipt, describeError(error)).catch(() => undefined);
        }
        console.warn(`[TaqadiAgent] receipt sync ${transient ? 'pending' : 'requires verification'} for ${receipt.jobId}: ${describeError(error)}`);
      }
    }
    const remaining = await this.outbox.pending();
    const first = remaining[0];
    return {
      pending: remaining.length, jobId: first?.jobId || null,
      error: first ? this.retries.get(first.jobId)?.error || 'Receipt synchronization pending' : null,
    };
  }
}
