import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveProfessionalBalanceSheet, listProfessionalBalanceSheets, parseProfessionalBalanceSheet,
  parseSavedBalanceSheet, readProfessionalBalanceSheet, saveProfessionalBalanceSheet, validateBalanceSheetDates, voidProfessionalBalanceSheet,
} from '../professionalBalanceSheet';
import {
  BALANCE_SHEET_COMPANY, BALANCE_SHEET_OTHER_COMPANY, BALANCE_SHEET_PREPARER,
  makeApprovedBalanceSheet, makeBalanceSheet, makeSavedBalanceSheet,
} from '@/test/fixtures/professionalBalanceSheet';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, from } }));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-18' }));

beforeEach(() => vi.clearAllMocks());

describe('canonical balance sheet reader', () => {
  it('preserves signed cumulative balances, closing equity, and comparative balances', async () => {
    rpc.mockResolvedValue({ data: makeBalanceSheet(), error: null });
    const result = await readProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, '2026-08-31', '2025-12-31');
    expect(rpc).toHaveBeenCalledWith('get_professional_balance_sheet_v1', {
      p_company_id: BALANCE_SHEET_COMPANY, p_as_of: '2026-08-31', p_comparison_date: '2025-12-31',
    });
    expect(result.accounts.find(account => account.name === 'Accumulated depreciation')).toMatchObject({ balance: -100, comparisonBalance: -50 });
    expect(result.current).toMatchObject({ assets: 900, equityAccounts: 500, unclosedResult: 200, equity: 700, imbalance: 0 });
    expect(result.comparison).toMatchObject({ assets: 650, equityAccounts: 400, unclosedResult: 150, equity: 550 });
  });

  it('accepts a report without a comparison while retaining numeric account values', () => {
    const report = makeBalanceSheet({ comparisonDate: null, comparison: null });
    report.accounts.forEach(account => { account.comparisonBalance = 0; });
    expect(parseProfessionalBalanceSheet(report, BALANCE_SHEET_COMPANY, '2026-08-31', null)).toEqual(report);
  });

  it.each([
    ['foreign company', { companyId: BALANCE_SHEET_OTHER_COMPANY, asOf: '2026-08-31', comparison: '2025-12-31' }],
    ['wrong date', { companyId: BALANCE_SHEET_COMPANY, asOf: '2026-07-31', comparison: '2025-12-31' }],
    ['wrong comparison', { companyId: BALANCE_SHEET_COMPANY, asOf: '2026-08-31', comparison: '2024-12-31' }],
  ])('rejects response scope: %s', (_label, scope) => {
    expect(() => parseProfessionalBalanceSheet(makeBalanceSheet(), scope.companyId, scope.asOf, scope.comparison))
      .toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });

  it('rejects missing comparative totals and duplicate account rows', () => {
    expect(() => parseProfessionalBalanceSheet(makeBalanceSheet({ comparison: null }), BALANCE_SHEET_COMPANY))
      .toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
    const report = makeBalanceSheet();
    report.accounts.push({ ...report.accounts[0] });
    expect(() => parseProfessionalBalanceSheet(report, BALANCE_SHEET_COMPANY)).toThrow('BALANCE_SHEET_DUPLICATE_ACCOUNTS');
  });

  it.each(['current', 'comparison'] as const)('rejects tampered %s totals even when the displayed equation remains balanced', (period) => {
    const report = makeBalanceSheet();
    const totals = report[period]!;
    totals.assets += 100;
    totals.liabilities += 100;
    totals.liabilitiesAndEquity += 100;
    expect(() => parseProfessionalBalanceSheet(report, BALANCE_SHEET_COMPANY)).toThrow('BALANCE_SHEET_TOTALS_MISMATCH');
  });

  it('rejects non-finite source values', () => {
    const report = makeBalanceSheet();
    report.accounts[0].balance = Infinity;
    expect(() => parseProfessionalBalanceSheet(report, BALANCE_SHEET_COMPANY)).toThrow();
  });

  it('propagates a source error and never falls back to another balance source', async () => {
    const error = { message: 'Source query timed out', code: '57014' };
    rpc.mockResolvedValue({ data: makeBalanceSheet(), error });
    await expect(readProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, '2026-08-31', null)).rejects.toBe(error);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['2026-02-30', null], ['2025-02-29', null], ['2026-09-19', null], ['', null],
    ['2026-08-31', '2026-08-31'], ['2026-08-31', '2026-09-01'], ['2026-08-31', 'invalid'],
  ])('rejects invalid or future dates before querying (%s, %s)', async (asOf, comparison) => {
    expect(() => validateBalanceSheetDates(asOf!, comparison)).toThrow('BALANCE_SHEET_INVALID_DATES');
    await expect(readProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, asOf!, comparison)).rejects.toThrow('BALANCE_SHEET_INVALID_DATES');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('saved balance sheet authenticity and commands', () => {
  it.each(['company', 'date', 'fingerprint'] as const)('rejects a saved report with mismatched %s', (field) => {
    const report = makeSavedBalanceSheet();
    if (field === 'company') report.company_id = BALANCE_SHEET_OTHER_COMPANY;
    if (field === 'date') report.as_of_date = '2026-07-31';
    if (field === 'fingerprint') report.source_fingerprint = 'b'.repeat(64);
    expect(() => parseSavedBalanceSheet(report, BALANCE_SHEET_COMPANY)).toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });

  it('keeps a balanced saved report draft and requires real independent approval markers', () => {
    expect(parseSavedBalanceSheet(makeSavedBalanceSheet(), BALANCE_SHEET_COMPANY).status).toBe('draft');
    expect(() => parseSavedBalanceSheet(makeSavedBalanceSheet({ status: 'approved' }), BALANCE_SHEET_COMPANY))
      .toThrow('BALANCE_SHEET_INVALID_APPROVAL');
    const approved = makeApprovedBalanceSheet();
    expect(parseSavedBalanceSheet(approved, BALANCE_SHEET_COMPANY)).toEqual(approved);
    approved.approved_by = BALANCE_SHEET_PREPARER;
    expect(() => parseSavedBalanceSheet(approved, BALANCE_SHEET_COMPANY)).toThrow('BALANCE_SHEET_INVALID_APPROVAL');
  });

  it('sends only dates and notes when saving, letting the server compute financial values', async () => {
    rpc.mockResolvedValue({ data: makeSavedBalanceSheet(), error: null });
    const result = await saveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, '2026-08-31', '2025-12-31', '  Supporting references  ');
    expect(rpc).toHaveBeenCalledWith('save_professional_balance_sheet_v1', {
      p_company_id: BALANCE_SHEET_COMPANY, p_as_of: '2026-08-31', p_comparison_date: '2025-12-31', p_notes: 'Supporting references',
    });
    expect(result.status).toBe('draft');
  });

  it('sends reviewer confirmations and uses the approval identity returned by the server', async () => {
    const approved = makeApprovedBalanceSheet();
    rpc.mockResolvedValue({ data: approved, error: null });
    const confirmations = { assets: true, liabilities: true, equity: true, reconciliation: true, completeness: true };
    const result = await approveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, approved.id, '  Reviewed all supporting records.  ', confirmations);
    expect(rpc).toHaveBeenCalledWith('approve_professional_balance_sheet_v1', {
      p_report_id: approved.id, p_review_notes: 'Reviewed all supporting records.', p_confirmations: confirmations,
    });
    expect(result.approved_by).toBe(approved.approved_by);
    expect(result.approved_at).toBe(approved.approved_at);
  });

  it('rejects a successful save response for a different cutoff or an already approved version', async () => {
    rpc.mockResolvedValueOnce({ data: makeSavedBalanceSheet({ payload: makeBalanceSheet({ asOfDate: '2026-07-31' }) }), error: null });
    await expect(saveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, '2026-08-31', '2025-12-31', 'Notes'))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
    rpc.mockResolvedValueOnce({ data: makeApprovedBalanceSheet(), error: null });
    await expect(saveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, '2026-08-31', '2025-12-31', 'Notes'))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });

  it('requires approval responses to identify the requested version and approved state', async () => {
    const requested = makeSavedBalanceSheet();
    const confirmations = { assets: true, liabilities: true, equity: true, reconciliation: true, completeness: true };
    rpc.mockResolvedValueOnce({ data: { ...makeApprovedBalanceSheet(), id: '77777777-7777-4777-8777-777777777777' }, error: null });
    await expect(approveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, requested.id, 'Reviewed all records', confirmations))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
    rpc.mockResolvedValueOnce({ data: requested, error: null });
    await expect(approveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, requested.id, 'Reviewed all records', confirmations))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });

  it('requires void responses to identify the requested version and voided state', async () => {
    const requested = makeSavedBalanceSheet();
    rpc.mockResolvedValueOnce({ data: requested, error: null });
    await expect(voidProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, requested.id, 'Replaced after source correction'))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
    rpc.mockResolvedValueOnce({ data: { ...requested, status: 'voided', id: '77777777-7777-4777-8777-777777777777' }, error: null });
    await expect(voidProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, requested.id, 'Replaced after source correction'))
      .rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });

  it('does not turn a failed approval or a partially invalid history into usable results', async () => {
    const error = { message: 'Balance sheet source changed', code: '40001' };
    const saved = makeSavedBalanceSheet();
    rpc.mockResolvedValueOnce({ data: null, error });
    await expect(approveProfessionalBalanceSheet(BALANCE_SHEET_COMPANY, saved.id, 'Reviewed the supplied records',
      { assets: true, liabilities: true, equity: true, reconciliation: true, completeness: true })).rejects.toBe(error);
    rpc.mockResolvedValueOnce({ data: [saved, { ...saved, company_id: BALANCE_SHEET_OTHER_COMPANY }], error: null });
    await expect(listProfessionalBalanceSheets(BALANCE_SHEET_COMPANY)).rejects.toThrow('BALANCE_SHEET_SCOPE_MISMATCH');
  });
});
