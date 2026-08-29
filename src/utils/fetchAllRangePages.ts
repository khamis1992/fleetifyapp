export type RangePageResult<T> = {
  data: T[] | null;
  error: unknown;
};

/**
 * Load every PostgREST range page without assuming the server row cap.
 * The caller must apply a stable order to its query before calling range().
 */
export async function fetchAllRangePages<T>(
  loadPage: (from: number, to: number) => PromiseLike<RangePageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('pageSize must be a positive integer');
  }

  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
