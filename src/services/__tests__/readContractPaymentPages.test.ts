import { describe, expect, it, vi } from 'vitest';
import { readContractPaymentPages } from '../readContractPaymentPages';

describe('complete contract payment reads', () => {
  it('continues through short server-capped pages until an explicit empty page', async () => {
    const read = vi.fn(async (cursor: string | null) => ({
      data: cursor === null ? [{ id: 'a' }] : cursor === 'a' ? [{ id: 'b' }] : [], error: null,
    }));
    expect(await readContractPaymentPages(read)).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(read.mock.calls).toEqual([[null], ['a'], ['b']]);
  });
  it('rejects a failed later page rather than returning a partial ledger', async () => {
    const failure = new Error('later page failed');
    await expect(readContractPaymentPages(async (cursor) => cursor
      ? { data: null, error: failure } : { data: [{ id: 'a' }], error: null })).rejects.toBe(failure);
  });
  it('does not turn a null response into zero payments', async () => {
    await expect(readContractPaymentPages(async () => ({ data: null, error: null }))).rejects.toThrow('كاملة');
  });
  it.each([[{ id: 'a' }, { id: 'a' }], [{ id: 'b' }, { id: 'a' }], [{ id: '' }]].map((rows) => ({ rows })))('rejects duplicate or unordered rows', async ({ rows }) => {
    await expect(readContractPaymentPages(async () => ({ data: rows, error: null }))).rejects.toThrow('ترتيب');
  });
});
