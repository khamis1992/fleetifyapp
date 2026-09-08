import { describe, it, expect, vi } from 'vitest';
import { loadLegalQueueClaims } from '../legalQueueClaims';
import { loadLegalClaimProjection } from '../../LawsuitPreparation/utils/legalClaimSources';
import { sortLegalQueueByAmount } from '../legalQueueSorting';
vi.mock('../../LawsuitPreparation/utils/legalClaimSources', () => ({
  getQatarBusinessDate: () => '2026-09-09', loadLegalClaimProjection: vi.fn(),
}));

describe('canonical queue claims', () => {
  it('isolates reconciliation failures, deduplicates contracts and bounds concurrent reads', async () => {
    let active = 0, peak = 0;
    const amounts = { overdueRent: 33500, lateFees: 100, damagesFee: 20, violationsFines: 30,
      retentionCompensation: 40, securityDepositDeduction: 50, total: 33640 };
    vi.mocked(loadLegalClaimProjection).mockImplementation(async (id, company, date) => {
      expect(company).toBe('company-a'); expect(date).toBe('2026-09-09');
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1)); active--;
      if (id === 'review') throw new Error('تحتاج مطابقة الدفعات');
      return { rows: [], summary: { authoritativeAmounts: amounts } } as Awaited<ReturnType<typeof loadLegalClaimProjection>>;
    });
    const results = await loadLegalQueueClaims('company-a', ['a', 'b', 'review', 'c', 'd', 'a', 'e']);
    expect(results.size).toBe(6); expect(peak).toBe(4);
    expect(results.get('review')).toEqual({ amounts: null, error: 'تحتاج مطابقة الدفعات' });
    expect(results.get('a')).toEqual({ amounts, error: null });
    expect(results.get('e')?.amounts?.total).toBe(33640);
  });
  it('does not promote a legacy estimate without authoritative components into a claim', async () => {
    vi.mocked(loadLegalClaimProjection).mockResolvedValue({ rows: [], summary: { outstandingTotal: 35000 } } as Awaited<ReturnType<typeof loadLegalClaimProjection>>);
    const results = await loadLegalQueueClaims('company-a', ['old']);
    expect(results.get('old')?.amounts).toBeNull();
    expect(results.get('old')?.error).toContain('حساب المطالبة المعتمد غير متاح');
  });
  it.each(['amount_asc', 'amount_desc'] as const)('keeps unknown claims separate from zero in %s sorting', direction => {
    const sorted = sortLegalQueueByAmount([{ id: 'review', detailedClaimTotal: null }, { id: 'zero', detailedClaimTotal: 0 }, { id: 'rent', detailedClaimTotal: 33500 }], direction);
    expect(sorted.at(-1)?.id).toBe('review');
    expect(sorted.slice(0,2).map(item => item.id)).toEqual(direction === 'amount_asc' ? ['zero','rent'] : ['rent','zero']);
  });
});
