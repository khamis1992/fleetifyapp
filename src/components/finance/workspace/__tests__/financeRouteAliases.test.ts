import { describe, expect, it } from 'vitest';
import { resolveFinanceLocation } from '../financeRouteAliases';

describe('finance legacy locations', () => {
  it.each([
    ['/finance/billing?tab=payments&customer=c1', '/finance/payments?customer=c1'],
    ['/finance/billing?tab=payments&invoice=i1', '/finance/invoices?invoice=i1'],
    ['/finance/billing?action=new-invoice', '/finance/invoices?action=new-invoice'],
    ['/finance/accounting?tab=entries&action=new', '/finance/journal-entries?action=new'],
    ['/finance/new-entry?date=2026-09-01', '/finance/journal-entries?date=2026-09-01&action=new'],
    ['/finance/treasury?tab=transactions&bank=b1', '/finance/treasury/transactions?bank=b1'],
    ['/finance/reports-analysis?tab=reports&report=balance-sheet&asOf=2026-09-01', '/finance/reports/balance-sheet?asOf=2026-09-01'],
    ['/finance/reports-analysis?tab=reports&report=unknown', '/finance/reports'],
    ['/finance/reports-analysis?tab=ratios', '/finance/analysis/ratios'],
    ['/finance/budgets-centers?tab=cost-centers', '/finance/cost-centers'],
    ['/finance/audit-settings?tab=permissions', '/finance/settings/permissions'],
    ['/finance/audit-settings?tab=wizard', '/finance/settings/setup'],
    ['/finance/audit-settings?tab=close&month=2026-08', '/finance/close?month=2026-08'],
    ['/finance/payments/quick?contract=C-1&amount=100', '/finance/operations/receive-payment?contract=C-1&amount=100'],
    ['/finance/monthly-rent-redirect', '/finance/collections/rent'],
    ['/finance/general-ledger-redirect', '/finance/general-ledger'],
    ['/finance/financial-ratios-redirect', '/finance/analysis/ratios'],
    ['/finance/monthly-close-audit?month=2026-08', '/finance/close/review?month=2026-08'],
    ['/finance/alerts', '/finance/overview?panel=alerts'],
  ])('preserves context when resolving %s', (from, expected) => {
    const [path, search] = from.split('?');
    expect(resolveFinanceLocation(path, search)).toBe(expected);
    const [resolvedPath, resolvedSearch] = expected.split('?');
    expect(resolveFinanceLocation(resolvedPath, resolvedSearch)).toBe(expected);
  });
  it.each(['/finance/invoices', '/finance/payments', '/finance/reports', '/finance/settings', '/finance/unknown-redirect', '/finance/accounting-wizard'])('does not redirect canonical or unrelated locations: %s', path => {
    expect(resolveFinanceLocation(path, '?filter=a%26b&filter=c')).toBe(`${path}?filter=a%26b&filter=c`);
  });
});
