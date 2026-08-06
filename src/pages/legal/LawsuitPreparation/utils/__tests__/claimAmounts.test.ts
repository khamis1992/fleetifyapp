import { describe, expect, it } from 'vitest';
import { getLawsuitClaimAmounts } from '../claimAmounts';

describe('getLawsuitClaimAmounts', () => {
  it('uses the same cash amount in the final requests and Taqadi claim field', () => {
    expect(getLawsuitClaimAmounts({
      total: 125_200,
      violationsFines: 6_600,
    })).toEqual({
      cashClaimAmount: 118_600,
      taqadiClaimAmount: 118_600,
    });
  });

  it('keeps both values equal when there are no traffic violations', () => {
    expect(getLawsuitClaimAmounts({
      total: 118_600,
      violationsFines: 0,
    })).toEqual({
      cashClaimAmount: 118_600,
      taqadiClaimAmount: 118_600,
    });
  });
});
