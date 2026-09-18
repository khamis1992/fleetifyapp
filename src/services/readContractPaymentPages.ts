/** Keyset pagination: never infer EOF from a short page (server caps vary). */
export async function readContractPaymentPages<T extends { id: string }>(
  fetchPage: (afterId: string | null) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10000; page += 1) {
    const { data, error } = await fetchPage(cursor);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('تعذر قراءة تفاصيل الدفعات كاملة.');
    if (!data.length) return rows;
    for (const row of data) {
      if (!row.id || (cursor !== null && row.id <= cursor)) {
        throw new Error('تغير ترتيب الدفعات أثناء القراءة؛ أعد تحميل البيانات.');
      }
      rows.push(row);
      cursor = row.id;
    }
  }
  throw new Error('تجاوزت تفاصيل الدفعات حد القراءة؛ لم تُحسب الأرصدة من بيانات جزئية.');
}
