export type LegalQueueAmountSort = 'amount_desc' | 'amount_asc';

type LegalQueueAmountItem = {
  detailedClaimTotal: number | null;
};

const safeAmount = (value: number | null) => (
  value != null && Number.isFinite(value) ? value : 0
);

/**
 * Returns a new array so changing the view order never mutates React Query data.
 * Modern stable sorting preserves the server order for equal amounts.
 */
export function sortLegalQueueByAmount<T extends LegalQueueAmountItem>(
  items: readonly T[],
  direction: LegalQueueAmountSort,
): T[] {
  const multiplier = direction === 'amount_desc' ? -1 : 1;
  return [...items].sort(
    (left, right) => {
      const leftUnknown = left.detailedClaimTotal == null || !Number.isFinite(left.detailedClaimTotal);
      const rightUnknown = right.detailedClaimTotal == null || !Number.isFinite(right.detailedClaimTotal);
      if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1;
      return multiplier * (safeAmount(left.detailedClaimTotal) - safeAmount(right.detailedClaimTotal));
    },
  );
}
