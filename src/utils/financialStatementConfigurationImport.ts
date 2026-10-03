import { z } from 'zod';
import type { FinancialStatementConfiguration, ProfessionalFinancialStatementPackage } from '@/types/financialStatementPackage';
import { validateFinancialStatementConfiguration } from './financialStatementPackageValidation';

export const financialStatementImportMaxBytes = 1024 * 1024;
type ImportFailure = 'too_large' | 'invalid_json' | 'wrong_company' | 'invalid_configuration' | 'unknown_account' | 'unknown_journal';
export class FinancialStatementImportError extends Error {
  constructor(public readonly code: ImportFailure) { super(`FINANCIAL_STATEMENT_IMPORT_${code.toUpperCase()}`); }
}
const envelopeSchema = z.object({ companyId: z.string().uuid(), configuration: z.unknown() }).strict();
export type FinancialStatementImportScope = { companyId: string; accountIds: readonly string[]; journalIds: readonly string[]; today: string };

/** Build scope from the current server-parsed company report, never from the imported file. */
export function financialStatementImportScopeFromReport(companyId: string, report: ProfessionalFinancialStatementPackage, today: string): FinancialStatementImportScope {
  if (report.company.id !== companyId || report.position.company.id !== companyId) throw new FinancialStatementImportError('wrong_company');
  let sourceConfiguration: FinancialStatementConfiguration;
  try { sourceConfiguration = validateFinancialStatementConfiguration(report.configuration, today); }
  catch { throw new FinancialStatementImportError('invalid_configuration'); }
  // The RPC returns only journals still needing review. A reviewed override may
  // therefore be absent from journals while retained in its validated config.
  // Recalculation still verifies every override's company and cutoff on the server.
  return {
    companyId,
    accountIds: report.position.accounts.map(account => account.id),
    journalIds: [...new Set([...report.journals.map(journal => journal.id), ...sourceConfiguration.journalOverrides.map(override => override.journalId)])],
    today,
  };
}

/** Reads presentation settings only. This never submits a journal, saves a report, or approves it. */
export function parseFinancialStatementConfigurationImport(text: string, scope: FinancialStatementImportScope): FinancialStatementConfiguration {
  if (text.length > financialStatementImportMaxBytes || new TextEncoder().encode(text).byteLength > financialStatementImportMaxBytes) throw new FinancialStatementImportError('too_large');
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new FinancialStatementImportError('invalid_json'); }
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) throw new FinancialStatementImportError('invalid_configuration');
  if (envelope.data.companyId !== scope.companyId) throw new FinancialStatementImportError('wrong_company');
  let configuration: FinancialStatementConfiguration;
  try { configuration = validateFinancialStatementConfiguration(envelope.data.configuration, scope.today); }
  catch { throw new FinancialStatementImportError('invalid_configuration'); }
  const accounts = new Set(scope.accountIds), journals = new Set(scope.journalIds);
  if (configuration.accountMappings.some(mapping => !accounts.has(mapping.accountId))) throw new FinancialStatementImportError('unknown_account');
  if (configuration.journalOverrides.some(override => !journals.has(override.journalId))) throw new FinancialStatementImportError('unknown_journal');
  return configuration;
}
