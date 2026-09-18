import { describe, expect, it, vi } from 'vitest';

import { fetchAllRangePages } from '../fetchAllRangePages';

describe('fetchAllRangePages', () => {
  it('loads beyond the first server-limited page', async () => {
    const source = Array.from({ length: 1061 }, (_, index) => index + 1);
    const loadPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const result = await fetchAllRangePages(loadPage, 1000);

    expect(result).toEqual(source);
    expect(loadPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(loadPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('stops after the first partial page', async () => {
    const loadPage = vi.fn(async () => ({ data: [1, 2, 3], error: null }));

    await expect(fetchAllRangePages(loadPage, 1000)).resolves.toEqual([1, 2, 3]);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('propagates the query error without returning partial financial data', async () => {
    const failure = new Error('invoice page failed');
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], error: null })
      .mockResolvedValueOnce({ data: null, error: failure });

    await expect(fetchAllRangePages(loadPage, 2)).rejects.toBe(failure);
  });
});
