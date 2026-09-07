import { createHash } from 'node:crypto';
import type { FilingPayload } from './types';

export function documentSourceVersion(payload: FilingPayload) {
  return createHash('sha256').update(JSON.stringify({
    formatVersion: 'pdf-docx-v2', memoSnapshotId: payload.memoSnapshotId,
    documents: payload.documents,
  })).digest('hex');
}

/** Wait for in-flight work before rejecting so shared browser cleanup is safe. */
export async function mapDocuments<T, R>(items: readonly T[], concurrency: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(items.length, Math.max(1, Math.floor(concurrency))) }, async () => {
    while (!failed && cursor < items.length) {
      const index = cursor++;
      try { results[index] = await run(items[index], index); }
      catch (error) { failed = true; throw error; }
    }
  });
  const settled = await Promise.allSettled(workers);
  const failure = settled.find((value): value is PromiseRejectedResult => value.status === 'rejected');
  if (failure) throw failure.reason;
  return results;
}
