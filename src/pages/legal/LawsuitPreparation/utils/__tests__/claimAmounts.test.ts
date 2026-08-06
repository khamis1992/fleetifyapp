import { describe, expect, it } from 'vitest';
import { getLawsuitClaimAmounts } from '../claimAmounts';

describe('getLawsuitClaimAmounts', () => {
  it('uses the complete final-request total for the Taqadi claim value', () => {
    expect(getLawsuitClaimAmounts({
      total: 125_200,
      violationsFines: 6_600,
    })).toEqual({
      cashClaimAmount: 118_600,
      taqadiClaimAmount: 125_200,
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
