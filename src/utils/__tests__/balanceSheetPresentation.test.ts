import { describe, expect, it } from 'vitest';
import { makeBalanceSheetFixture } from './balanceSheetFixtures';
import { formatBalanceSheetMoney, getBalanceSheetCheckMessage, getBalanceSheetRows } from '../balanceSheetPresentation';

describe('balance sheet presentation', () => {
  it('preserves contra assets, sums non-current assets net, and never guesses classification from codes', () => {
    const report = makeBalanceSheetFixture();
    const rows = getBalanceSheetRows(report, 'en');
    expect(rows.find(row => row.code === '1202')?.amount).toBe(-200);
    expect(rows.find(row => row.key === 'asset-non_current-subtotal')?.amount).toBe(800);
    expect(rows.find(row => row.key === 'asset-current-subtotal')?.amount).toBe(300);
    expect(formatBalanceSheetMoney(-200, 'QAR', 'en')).toMatch(/-.*200\.00/);
  });

  it('includes comparison-only accounts and exactly one unclosed residual without revenue/expense account rows', () => {
    const rows = getBalanceSheetRows(makeBalanceSheetFixture(), 'ar');
    expect(rows.find(row => row.code === '1102')).toMatchObject({ amount: 0, comparisonAmount: 50 });
    expect(rows.filter(row => row.key === 'unclosed-result')).toHaveLength(1);
    expect(rows.find(row => row.key === 'unclosed-result')).toMatchObject({ amount: 100, comparisonAmount: 100 });
    expect(rows.some(row => ['4101', '5101'].includes(row.code || ''))).toBe(false);
    expect(rows.find(row => row.key === 'equity-total')?.amount).toBe(1000);
  });

  it('omits comparison-only accounts and cells when no comparative date was requested', () => {
    const report = makeBalanceSheetFixture(); report.comparisonDate = null; report.comparison = null;
    const rows = getBalanceSheetRows(report, 'en');
    expect(rows.some(row => row.code === '1102')).toBe(false);
    expect(rows.every(row => row.comparisonAmount === null)).toBe(true);
  });

  it('shows unclassified accounts explicitly and retains negative unclosed losses', () => {
    const report = makeBalanceSheetFixture(); report.accounts[0].classification = 'unclassified'; report.current.unclosedResult = -125;
    const rows = getBalanceSheetRows(report, 'en');
    expect(rows.find(row => row.key === 'asset-unclassified-subtotal')?.amount).toBe(300);
    expect(rows.find(row => row.key === 'unclosed-result')?.amount).toBe(-125);
  });

  it('identifies current-register checks separately from historical financial evidence', () => {
    expect(getBalanceSheetCheckMessage({ code: 'current_vehicles_missing_cost', severity: 'warning', count: 5, asOfDate: '2026-08-31' }, 'en')).toContain('not the historical fleet position');
  });

  it('keeps unknown check severity, code, count and date visible', () => {
    expect(getBalanceSheetCheckMessage({ code: 'new_server_check', severity: 'error', count: 3, asOfDate: '2026-08-31' }, 'en')).toBe('Error: new_server_check (3) — 2026-08-31');
  });

  it('does not invent a currency when company metadata is missing', () => {
    expect(formatBalanceSheetMoney(-200, '', 'en')).toBe('-200.00 (currency unspecified)');
    expect(formatBalanceSheetMoney(-200, '', 'ar')).toContain('العملة غير محددة');
  });
});

