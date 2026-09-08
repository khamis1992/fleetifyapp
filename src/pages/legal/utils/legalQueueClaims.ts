import { getQatarBusinessDate, loadLegalClaimProjection, type resolveStatementAmounts } from '../LawsuitPreparation/utils/legalClaimSources';

type ClaimAmounts = ReturnType<typeof resolveStatementAmounts>;
export type QueueClaimResult = { amounts: ClaimAmounts; error: null } | { amounts: null; error: string };

/** Read the same authenticated statement as preparation, with bounded concurrency.
 * Each contract is isolated: a reconciliation failure cannot hide the other files.
 */
export async function loadLegalQueueClaims(companyId: string, contractIds: readonly string[]): Promise<Map<string, QueueClaimResult>> {
  const ids = [...new Set(contractIds.filter(Boolean))];
  const result = new Map<string, QueueClaimResult>();
  const asOfDate = getQatarBusinessDate();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const projection = await loadLegalClaimProjection(id, companyId, asOfDate);
        const amounts = projection.summary.authoritativeAmounts;
        if (!amounts) throw new Error('حساب المطالبة المعتمد غير متاح؛ افتح تجهيز الدعوى لمراجعة البيانات.');
        result.set(id, { amounts, error: null });
      } catch (error) {
        result.set(id, { amounts: null, error: error instanceof Error ? error.message : 'تعذر التحقق من مبلغ المطالبة؛ أعد المحاولة من تجهيز الدعوى.' });
      }
    }
  }));
  return result;
}
