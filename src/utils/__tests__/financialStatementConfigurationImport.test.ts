import { describe, expect, it } from 'vitest';
import { fixtureCompanyId, fixturePreparerId, makeFinancialStatementPackageFixture } from '../../../tests/visual/financial-statement-package/fixtureData';
import { financialStatementImportMaxBytes, financialStatementImportScopeFromReport, parseFinancialStatementConfigurationImport } from '../financialStatementConfigurationImport';

const report = () => makeFinancialStatementPackageFixture();
const scope = () => ({ companyId: fixtureCompanyId, accountIds: report().position.accounts.map(account => account.id), journalIds: [fixturePreparerId], today: '2026-10-01' });
const envelope = (configuration = report().configuration, companyId = fixtureCompanyId) => JSON.stringify({ companyId, configuration });

describe('local financial statement configuration import', () => {
  it('preserves pending disclosures and supplied signed mappings without adding approval data', () => {
    const configuration = report().configuration;
    configuration.notes[0].status = 'pending';
    configuration.notes[0].text = 'Company activity is known; ownership confirmation remains pending.';
    configuration.accountMappings[0].currentSplit = { line: 'other_current_assets', amount: -125.5 };
    const imported = parseFinancialStatementConfigurationImport(envelope(configuration), scope());
    expect(imported).toEqual(configuration);
    expect(imported).not.toHaveProperty('confirmations');
    expect(imported.notes[0].status).toBe('pending');
  });
  it('rejects another company even when the same account IDs are supplied', () => {
    expect(() => parseFinancialStatementConfigurationImport(envelope(undefined, fixturePreparerId), scope())).toThrow('WRONG_COMPANY');
  });
  it('rejects unmapped-scope accounts and journal overrides before application', () => {
    const foreignAccount = report().configuration;
    foreignAccount.accountMappings[0].accountId = fixturePreparerId;
    expect(() => parseFinancialStatementConfigurationImport(envelope(foreignAccount), scope())).toThrow('UNKNOWN_ACCOUNT');
    const foreignJournal = report().configuration;
    foreignJournal.journalOverrides = [{ journalId: fixtureCompanyId, treatment: 'regular', internalCashTransfer: 0, equityCategory: null, cashFlows: [], reason: 'Source journal has been reviewed by the preparer.' }];
    expect(() => parseFinancialStatementConfigurationImport(envelope(foreignJournal), scope())).toThrow('UNKNOWN_JOURNAL');
  });
  it('rejects invalid periods, future dates, duplicates and extra command fields', () => {
    const config = report().configuration;
    config.periodEnd = '2026-09-31';
    expect(() => parseFinancialStatementConfigurationImport(envelope(config), scope())).toThrow('INVALID_CONFIGURATION');
    expect(() => parseFinancialStatementConfigurationImport(envelope(), { ...scope(), today: '2026-08-30' })).toThrow('INVALID_CONFIGURATION');
    const duplicate = report().configuration;
    duplicate.accountMappings.push(duplicate.accountMappings[0]);
    expect(() => parseFinancialStatementConfigurationImport(envelope(duplicate), scope())).toThrow('INVALID_CONFIGURATION');
    expect(() => parseFinancialStatementConfigurationImport(JSON.stringify({ companyId: fixtureCompanyId, configuration: report().configuration, approve: true }), scope())).toThrow('INVALID_CONFIGURATION');
  });
  it('rejects malformed JSON and bounds UTF-8 bytes, including multi-byte Arabic content', () => {
    expect(() => parseFinancialStatementConfigurationImport('{', scope())).toThrow('INVALID_JSON');
    expect(() => parseFinancialStatementConfigurationImport('س'.repeat(financialStatementImportMaxBytes / 2 + 1), scope())).toThrow('TOO_LARGE');
    expect(() => parseFinancialStatementConfigurationImport(' '.repeat(financialStatementImportMaxBytes + 1), scope())).toThrow('TOO_LARGE');
  });
  it('accepts a UTF-8 BOM envelope and a known source journal treatment', () => {
    const configuration = report().configuration;
    configuration.journalOverrides = [{ journalId: fixturePreparerId, treatment: 'regular', internalCashTransfer: 0, equityCategory: 'other', cashFlows: [], reason: 'This movement classification is documented for review.' }];
    expect(parseFinancialStatementConfigurationImport(`\uFEFF${envelope(configuration)}`, scope()).journalOverrides).toEqual(configuration.journalOverrides);
  });
  it('round-trips 139 reviewed overrides omitted from the RPC journal review subset, but rejects a new unknown ID', () => {
    const source = report();
    source.configuration.journalOverrides = Array.from({ length: 139 }, (_, index) => ({
      journalId: `55555555-5555-4555-8555-${String(index + 1).padStart(12, '0')}`,
      treatment: 'regular', internalCashTransfer: 0, equityCategory: 'other', cashFlows: [],
      reason: 'Reviewed classification retained in the company source configuration.',
    }));
    source.journals = []; // Already-reviewed journals are removed by the RPC's response filter.
    const imported = structuredClone(source.configuration);
    imported.notes[0].status = 'pending';
    imported.notes[0].text = 'The updated disclosure preserves the remaining source uncertainty.';
    const sourceScope = financialStatementImportScopeFromReport(fixtureCompanyId, source, '2026-10-01');
    expect(parseFinancialStatementConfigurationImport(envelope(imported), sourceScope)).toEqual(imported);
    imported.journalOverrides.push({ ...imported.journalOverrides[0], journalId: fixturePreparerId });
    expect(() => parseFinancialStatementConfigurationImport(envelope(imported), sourceScope)).toThrow('UNKNOWN_JOURNAL');
  });
  it('does not trust a report from another company, a foreign position, or malformed source overrides', () => {
    const foreignReport = report();
    foreignReport.company = { ...foreignReport.company, id: fixturePreparerId };
    expect(() => financialStatementImportScopeFromReport(fixtureCompanyId, foreignReport, '2026-10-01')).toThrow('WRONG_COMPANY');
    const foreignPosition = report();
    foreignPosition.position = { ...foreignPosition.position, company: { ...foreignPosition.position.company, id: fixturePreparerId } };
    expect(() => financialStatementImportScopeFromReport(fixtureCompanyId, foreignPosition, '2026-10-01')).toThrow('WRONG_COMPANY');
    const malformed = report();
    malformed.configuration.journalOverrides = [{ journalId: 'not-a-uuid', treatment: 'regular', internalCashTransfer: 0, equityCategory: null, cashFlows: [], reason: 'Source journal classification retained for review.' }];
    expect(() => financialStatementImportScopeFromReport(fixtureCompanyId, malformed, '2026-10-01')).toThrow('INVALID_CONFIGURATION');
  });
});
