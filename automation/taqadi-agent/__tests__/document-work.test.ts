import { describe, expect, it } from 'vitest';
import { documentSourceVersion, mapDocuments } from '../document-work';
import type { FilingPayload } from '../types';

describe('bounded document preparation', () => {
  it('runs two files concurrently and preserves the portal upload order', async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapDocuments([1, 2, 3, 4], 2, async value => {
      maxActive = Math.max(maxActive, ++active);
      await new Promise(resolve => setTimeout(resolve, value === 1 ? 20 : 2));
      active--;
      return value * 2;
    });
    expect(result).toEqual([2, 4, 6, 8]);
    expect(maxActive).toBe(2);
  });
  it('settles active work before shared resources can be closed on failure', async () => {
    let otherFinished = false;
    const started: number[] = [];
    await expect(mapDocuments([1, 2, 3], 2, async value => {
      started.push(value);
      if (value === 1) throw new Error('document failed');
      await new Promise(resolve => setTimeout(resolve, 10));
      otherFinished = true;
    })).rejects.toThrow('document failed');
    expect(started).toEqual([1, 2]);
    expect(otherFinished).toBe(true);
  });
  it('invalidates prepared PDFs and Word copies when source content or the frozen snapshot changes', () => {
    const payload = { memoSnapshotId: 'snapshot-1', documents: [{ key: 'memo', htmlContent: '<p>one</p>' }] } as FilingPayload;
    expect(documentSourceVersion(payload)).toBe(documentSourceVersion(structuredClone(payload)));
    expect(documentSourceVersion(payload)).not.toBe(documentSourceVersion({ ...payload, memoSnapshotId: 'snapshot-2' }));
    expect(documentSourceVersion(payload)).not.toBe(documentSourceVersion({ ...payload, documents: [{ ...payload.documents[0], htmlContent: '<p>two</p>' }] }));
  });
});
