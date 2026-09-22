import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveFinancialStatementPackage, changeFinancialReportingPeriodLock, listFinancialReportingPeriodLocks, listFinancialStatementPackages, readFinancialStatementPackage, saveFinancialStatementPackage, voidFinancialStatementPackage } from '../financialStatementPackage';
import { canonicalFinancialStatementContent, parseFinancialStatementPackage, parseSavedFinancialStatementPackage, validateFinancialStatementConfiguration } from '@/utils/financialStatementPackageValidation';
import { defaultStatementConfiguration } from '@/utils/financialStatementConfiguration';
import { fixtureCompanyId, fixturePreparerId, fixtureReviewerId, makeFinancialStatementPackageFixture, makeSavedFinancialStatementPackageFixture } from '../../../tests/visual/financial-statement-package/fixtureData';
import sqlPackageFixture from '../../../tests/fixtures/financial-statement-package-sql.json';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-18' }));
const review = { classifications: true, policies: true, reconciliations: true, disclosures: true, periodCutoff: true };
const notes = 'Reviewed all classifications, evidence, period cutoff and disclosures.';
beforeEach(() => vi.clearAllMocks());

describe('financial statement package dates and canonical contract', () => {
  it('accepts an actual SQL-produced package with reconciled statement columns and source metadata', () => {
    const report = parseFinancialStatementPackage(sqlPackageFixture, sqlPackageFixture.company.id);
    expect(report.statements).toHaveLength(5);
    expect(report.journals.every(journal => typeof journal.isCanonicalClosing === 'boolean')).toBe(true);
  });
  it.each([
    ['position', 'cash'], ['position', 'current_assets_total'], ['position', 'property_equipment'],
    ['profit_loss_oci', 'rental_revenue'], ['profit_loss_oci', 'administrative_expenses'],
  ])('rejects changed %s detail %s even when the original totals remain unchanged', (sectionKey, rowKey) => {
    const report = structuredClone(sqlPackageFixture);
    report.statements.find(section => section.key === sectionKey)!.rows.find(row => row.key === rowKey)!.values[0]! += 100;
    expect(() => parseFinancialStatementPackage(report, report.company.id)).toThrow('RECONCILIATION_MISMATCH');
  });
  it.each(['receipts', 'payments'])('reconciles cash-flow %s detail to its activity subtotal', direction => {
    const report = structuredClone(sqlPackageFixture);
    const cash = report.statements.find(section => section.key === 'cash_flow')!;
    cash.rows.find(row => row.key.startsWith(`operating_${direction}_`))!.values[0]! += 25;
    expect(() => parseFinancialStatementPackage(report, report.company.id)).toThrow('RECONCILIATION_MISMATCH');
  });
  it('rejects omitted cash receipts and unrecognised numeric detail rows', () => {
    const omitted = structuredClone(sqlPackageFixture);
    const cash = omitted.statements.find(section => section.key === 'cash_flow')!;
    cash.rows = cash.rows.filter(row => !row.key.startsWith('operating_receipts_'));
    expect(() => parseFinancialStatementPackage(omitted, omitted.company.id)).toThrow('RECONCILIATION_MISMATCH');
    const unknown = structuredClone(sqlPackageFixture);
    const row = structuredClone(unknown.statements[0].rows.find(row => row.key === 'cash')!);
    row.key = 'unverified_additional_asset';
    unknown.statements[0].rows.push(row);
    expect(() => parseFinancialStatementPackage(unknown, unknown.company.id)).toThrow('ROW_MISMATCH');
  });
  it('rejects cash receipts with a negative sign even if an offsetting payment preserves the subtotal', () => {
    const report = structuredClone(sqlPackageFixture);
    const cash = report.statements.find(section => section.key === 'cash_flow')!;
    cash.rows.find(row => row.key.startsWith('operating_receipts_'))!.values[0] = -50;
    cash.rows.find(row => row.key.startsWith('operating_payments_'))!.values[0] = 400;
    expect(() => parseFinancialStatementPackage(report, report.company.id)).toThrow('RECONCILIATION_MISMATCH');
  });
  it('includes unclassified draft amounts in position and income reconciliations', () => {
    const report = structuredClone(sqlPackageFixture);
    const position = report.statements.find(section => section.key === 'position')!;
    position.rows.find(row => row.key === 'cash')!.key = 'unclassified_asset';
    position.rows.find(row => row.key === 'current_assets_total')!.values = [0, 0];
    report.statements.find(section => section.key === 'profit_loss_oci')!.rows.find(row => row.key === 'rental_revenue')!.key = 'unclassified_income';
    report.findings.push({ code: 'position_mapping_missing', severity: 'error', count: 1, messageAr: 'تصنيف ناقص', messageEn: 'Missing classification', accountIds: [], journalIds: [] });
    expect(() => parseFinancialStatementPackage(report, report.company.id)).not.toThrow();
    position.rows.find(row => row.key === 'unclassified_asset')!.values[1]! += 50;
    expect(() => parseFinancialStatementPackage(report, report.company.id)).toThrow('RECONCILIATION_MISMATCH');
  });
  it('checks the opening third-position detail column as well as current and comparative columns', () => {
    const report = structuredClone(sqlPackageFixture);
    report.configuration.thirdPositionDate = '2024-12-31';
    report.configuration.requiresThirdPosition = true;
    const position = report.statements.find(section => section.key === 'position')!;
    position.columns.push({ key: 'third', labelAr: 'افتتاح المقارنة', labelEn: 'Opening comparative', endDate: '2024-12-31' });
    for (const row of position.rows) row.values.push(row.kind === 'section' ? null : 0);
    expect(() => parseFinancialStatementPackage(report, report.company.id)).not.toThrow();
    position.rows.find(row => row.key === 'cash')!.values[2] = 100;
    expect(() => parseFinancialStatementPackage(report, report.company.id)).toThrow('RECONCILIATION_MISMATCH');
  });
  it.each(['split', 'cashFlow', 'internalCashTransfer'] as const)('bounds configured %s amounts without changing signed statement values', field => {
    const config = makeFinancialStatementPackageFixture().configuration;
    const setAmount = (amount: number) => {
      if (field === 'split') config.accountMappings[0].currentSplit = { line: 'other_current_assets', amount };
      else config.journalOverrides = [{ journalId: fixturePreparerId, treatment: 'regular', equityCategory: null,
        reason: 'Reviewed against the underlying journal and source documents.',
        internalCashTransfer: field === 'internalCashTransfer' ? amount : 0,
        cashFlows: field === 'cashFlow' ? [{ category: 'operating', amount, label: 'Reviewed customer receipts' }] : [] }];
    };
    setAmount(1e12); expect(() => validateFinancialStatementConfiguration(config)).not.toThrow();
    for (const invalid of [1e12 + 1, -1e12 - 1, Infinity]) {
      setAmount(invalid); expect(() => validateFinancialStatementConfiguration(config)).toThrow();
    }
    if (field !== 'internalCashTransfer') {
      setAmount(-1e12); expect(() => validateFinancialStatementConfiguration(config)).not.toThrow();
    }
  });
  it('separates annual and interim position comparisons from comparative performance periods', () => {
    expect(defaultStatementConfiguration('2025-12-31')).toMatchObject({ kind: 'annual', positionComparisonDate: '2024-12-31', comparativePeriodStart: '2024-01-01', comparativePeriodEnd: '2024-12-31' });
    expect(defaultStatementConfiguration('2026-08-31')).toMatchObject({ kind: 'interim', positionComparisonDate: '2025-12-31', comparativePeriodStart: '2025-01-01', comparativePeriodEnd: '2025-08-31' });
    expect(validateFinancialStatementConfiguration(defaultStatementConfiguration('2025-12-31'))).toBeDefined();
  });
  it.each([
    { periodEnd: '2026-02-30' }, { positionComparisonDate: '2025-08-31' }, { comparativePeriodEnd: '2025-12-31' },
    { kind: 'annual' }, { thirdPositionDate: '2025-12-31' }, { periodStart: '2026-09-01' },
  ])('rejects invalid or misleading period configuration: %j', patch => {
    expect(() => validateFinancialStatementConfiguration({ ...defaultStatementConfiguration(), ...patch })).toThrow();
  });
  it('keeps incomplete notes editable as drafts without fabricating a policy or account classification', () => {
    const config = validateFinancialStatementConfiguration(defaultStatementConfiguration());
    expect(config.notes.every(note => note.status === 'pending' && note.text === '')).toBe(true);
    expect(config.accountMappings).toEqual([]);
    expect(config.legalForm).toBe('unspecified');
  });
  it('validates a complete synthetic package and preserves signed amounts', () => {
    const fixture = makeFinancialStatementPackageFixture();
    const report = parseFinancialStatementPackage(fixture, fixtureCompanyId, fixture.configuration);
    expect(report.position.accounts.find(account => account.code === '1202')?.balance).toBe(-1000);
    expect(report.statements.find(section => section.key === 'cash_flow')?.rows.find(row => row.key === 'investing')?.values).toEqual([-400, -300]);
  });
  it('rejects a response for another company or another configuration', () => {
    const report = makeFinancialStatementPackageFixture();
    expect(() => parseFinancialStatementPackage(report, fixtureReviewerId)).toThrow('SCOPE_MISMATCH');
    expect(() => parseFinancialStatementPackage(report, fixtureCompanyId, { ...report.configuration, preparationNotes: 'Different user configuration' })).toThrow('SCOPE_MISMATCH');
  });
  it.each(['position', 'profit_loss_oci', 'cash_flow', 'equity_current'] as const)('rejects inconsistent %s figures and scopes', key => {
    const report = makeFinancialStatementPackageFixture();
    const statement = report.statements.find(item => item.key === key)!;
    const target = key === 'position' ? 'assets_total' : key === 'profit_loss_oci' ? 'profit' : 'closing';
    statement.rows.find(row => row.key === target)!.values[0]! += 30;
    expect(() => parseFinancialStatementPackage(report, fixtureCompanyId)).toThrow('RECONCILIATION_MISMATCH');
  });
  it('rejects a cash-flow comparison mislabeled as the year-end position date', () => {
    const report = makeFinancialStatementPackageFixture();
    report.statements.find(item => item.key === 'cash_flow')!.columns[1].endDate = '2025-12-31';
    expect(() => parseFinancialStatementPackage(report, fixtureCompanyId)).toThrow('COLUMN_SCOPE');
  });
  it('rejects missing statement rows, nonfinite amounts and duplicate note numbers', () => {
    const report = makeFinancialStatementPackageFixture();
    report.statements[0].rows = report.statements[0].rows.filter(row => row.key !== 'assets_total');
    expect(() => parseFinancialStatementPackage(report, fixtureCompanyId)).toThrow('REQUIRED_ROW');
    const invalid = makeFinancialStatementPackageFixture(); invalid.statements[0].rows[0].values[0] = Infinity;
    expect(() => parseFinancialStatementPackage(invalid, fixtureCompanyId)).toThrow();
    const config = defaultStatementConfiguration(); config.notes[1].number = 1;
    expect(() => validateFinancialStatementConfiguration(config)).toThrow();
  });
  it('accepts documented self approval but never a blocked snapshot', () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'approved');
    saved.approved_by = saved.created_by;
    // Documented sole-admin self approval is representable; review markers remain required.
    expect(() => parseSavedFinancialStatementPackage(saved, fixtureCompanyId)).not.toThrow();
    saved.payload.findings.push({ code: 'missing_data', severity: 'error', count: 1, messageAr: 'ناقص', messageEn: 'Missing', accountIds: [], journalIds: [] });
    expect(() => parseSavedFinancialStatementPackage(saved, fixtureCompanyId)).toThrow('INVALID_APPROVAL');
  });
  it('canonicalizes object key order while retaining configuration and signed numeric content', () => {
    expect(canonicalFinancialStatementContent({ b: -3, a: 2 })).toBe(canonicalFinancialStatementContent({ a: 2, b: -3 }));
    expect(canonicalFinancialStatementContent({ a: -3 })).not.toBe(canonicalFinancialStatementContent({ a: 3 }));
  });
});

describe('financial statement commands', () => {
  it('uses only server RPC calculation and fails closed on source errors', async () => {
    const report = makeFinancialStatementPackageFixture(); rpc.mockResolvedValue({ data: report, error: null });
    await expect(readFinancialStatementPackage(fixtureCompanyId, report.configuration)).resolves.toEqual(report);
    expect(rpc).toHaveBeenCalledWith('get_financial_statement_package_v1', { p_company_id: fixtureCompanyId, p_configuration: report.configuration });
    const error = { message: 'Source unavailable' }; rpc.mockResolvedValue({ data: report, error });
    await expect(readFinancialStatementPackage(fixtureCompanyId, report.configuration)).rejects.toEqual(error);
  });
  it('rejects future periods before contacting the database', async () => {
    await expect(readFinancialStatementPackage(fixtureCompanyId, defaultStatementConfiguration('2027-08-31'))).rejects.toThrow('FUTURE_DATE');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('saves configuration, never client-computed statement amounts', async () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft'); rpc.mockResolvedValue({ data: saved, error: null });
    await expect(saveFinancialStatementPackage(fixtureCompanyId, saved.payload.configuration)).resolves.toEqual(saved);
    expect(rpc).toHaveBeenCalledWith('save_financial_statement_package_v1', { p_company_id: fixtureCompanyId, p_configuration: saved.payload.configuration });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('payload');
  });
  it('verifies independent approval response and all review confirmations', async () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'approved'); rpc.mockResolvedValue({ data: saved, error: null });
    await expect(approveFinancialStatementPackage(fixtureCompanyId, saved.id, notes, review)).resolves.toEqual(saved);
    rpc.mockClear();
    await expect(approveFinancialStatementPackage(fixtureCompanyId, saved.id, notes, { ...review, periodCutoff: false })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('validates every saved version and void action', async () => {
    const saved = makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), 'draft');
    rpc.mockResolvedValue({ data: [saved], error: null }); expect(await listFinancialStatementPackages(fixtureCompanyId)).toHaveLength(1);
    const voided = { ...saved, status: 'voided', void_reason: 'Superseded after an accounting review.' }; rpc.mockResolvedValue({ data: voided, error: null });
    await expect(voidFinancialStatementPackage(fixtureCompanyId, saved.id, voided.void_reason)).resolves.toEqual(voided);
    rpc.mockResolvedValue({ data: [{ ...saved, company_id: fixtureReviewerId }], error: null });
    await expect(listFinancialStatementPackages(fixtureCompanyId)).rejects.toThrow('SCOPE_MISMATCH');
  });
  it('scopes period lock mutations and requires a substantive reason', async () => {
    const locked = { id: fixtureReviewerId, company_id: fixtureCompanyId, accounting_period_id: fixturePreparerId, locked_through: '2026-08-31', status: 'locked', changed_by: fixtureReviewerId, changed_by_name: 'Reviewer', changed_at: '2026-09-18T00:00:00Z', reason: notes };
    rpc.mockResolvedValue({ data: locked, error: null });
    await expect(changeFinancialReportingPeriodLock(fixtureCompanyId, '2026-08-31', notes)).resolves.toEqual(locked);
    expect(rpc).toHaveBeenCalledWith('lock_financial_reporting_period_v1', { p_company: fixtureCompanyId, p_locked_through: '2026-08-31', p_reason: notes });
    rpc.mockClear(); await expect(changeFinancialReportingPeriodLock(fixtureCompanyId, null, 'short')).rejects.toThrow(); expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: { company_id: fixtureReviewerId, managed_lock: null, other_closed_periods: [], history: [], can_manage: true }, error: null });
    await expect(listFinancialReportingPeriodLocks(fixtureCompanyId)).rejects.toThrow('SCOPE_MISMATCH');
  });
});
