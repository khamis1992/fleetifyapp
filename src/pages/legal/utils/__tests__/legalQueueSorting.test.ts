import { describe, expect, it } from 'vitest';
import { sortLegalQueueByAmount } from '../legalQueueSorting';

const rows = [
  { id: 'middle', detailedClaimTotal: 7850 },
  { id: 'highest', detailedClaimTotal: 35000 },
  { id: 'lowest', detailedClaimTotal: 500 },
];

describe('legal delinquency queue amount sorting', () => {
  it('orders the highest claim first', () => {
    expect(sortLegalQueueByAmount(rows, 'amount_desc').map((row) => row.id))
      .toEqual(['highest', 'middle', 'lowest']);
  });

  it('orders the lowest claim first', () => {
    expect(sortLegalQueueByAmount(rows, 'amount_asc').map((row) => row.id))
      .toEqual(['lowest', 'middle', 'highest']);
  });

  it('does not mutate the legal queue returned by React Query', () => {
    const before = [...rows];
    sortLegalQueueByAmount(rows, 'amount_desc');
    expect(rows).toEqual(before);
  });

  it('keeps malformed non-finite display amounts at a safe zero boundary', () => {
    expect(sortLegalQueueByAmount([
      { id: 'unknown', detailedClaimTotal: Number.NaN },
      { id: 'known', detailedClaimTotal: 100 },
    ], 'amount_desc').map((row) => row.id)).toEqual(['known', 'unknown']);
  });
});
