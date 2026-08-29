import { describe, expect, it } from 'vitest';
import { getLawsuitClaimAmounts } from '../claimAmounts';

describe('getLawsuitClaimAmounts', () => {
  it('sums only document-backed components across the lawsuit package', () => {
    expect(
      getLawsuitClaimAmounts({
        overdueRent: 50_500,
        lateFees: 134_880,
        violationsFines: 9_900,
      }),
    ).toEqual({
      cashClaimAmount: 195_280,
      taqadiClaimAmount: 195_280,
    });
  });

  it('keeps both values equal when there are no traffic violations', () => {
    expect(
      getLawsuitClaimAmounts({
        overdueRent: 118_600,
        lateFees: 0,
        violationsFines: 0,
      }),
    ).toEqual({
      cashClaimAmount: 118_600,
      taqadiClaimAmount: 118_600,
    });
  });

  it('never claims more than the documented components even with odd inputs', () => {
    expect(
      getLawsuitClaimAmounts({
        overdueRent: Number.NaN,
        lateFees: -50,
        violationsFines: 800,
      }).cashClaimAmount,
    ).toBe(800);
  });

  it('adds verified damage costs and subtracts an applied security deposit', () => {
    expect(
      getLawsuitClaimAmounts(
        { overdueRent: 10_000, lateFees: 500, violationsFines: 300 },
        { verifiedDamages: 1_200, securityDepositDeduction: 2_000 },
      ),
    ).toEqual({ cashClaimAmount: 10_000, taqadiClaimAmount: 10_000 });
  });

  it('floors at zero when the deposit exceeds the documented claim', () => {
    expect(
      getLawsuitClaimAmounts(
        { overdueRent: 1_000, lateFees: 0, violationsFines: 0 },
        { verifiedDamages: 0, securityDepositDeduction: 5_000 },
      ).cashClaimAmount,
    ).toBe(0);
  });

  it('preserves the saved deposit deduction across filing and registration paths', () => {
    expect(
      getLawsuitClaimAmounts({
        overdueRent: 10_000,
        lateFees: 500,
        violationsFines: 300,
        damagesFee: 1_200,
        retentionCompensation: 2_000,
        securityDepositDeduction: 2_500,
      }),
    ).toEqual({ cashClaimAmount: 11_500, taqadiClaimAmount: 11_500 });
  });
});
