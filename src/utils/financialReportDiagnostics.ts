import { ZodError } from 'zod';

export interface FinancialReportErrorSummary {
  code: string;
  issues?: Array<{ path: string; code: string }>;
}

// Explicit schema field names only. Record keys, identifiers and user text are never logged.
const schemaFields = new Set([
  'version', 'company', 'id', 'name', 'nameAr', 'commercialRegister', 'currency', 'address',
  'asOfDate', 'comparisonDate', 'generatedAt', 'accounts', 'code', 'type', 'subtype',
  'classification', 'level', 'isHeader', 'isActive', 'debit', 'credit', 'balance', 'comparisonBalance',
  'current', 'comparison', 'assets', 'liabilities', 'equityAccounts', 'revenue', 'expenses',
  'unclosedResult', 'equity', 'liabilitiesAndEquity', 'imbalance', 'postedEntries', 'postedLines',
  'draftEntries', 'checks', 'severity', 'count', 'fingerprint', 'permissions', 'canSave', 'canApprove',
  'company_id', 'as_of_date', 'comparison_date', 'payload', 'source_fingerprint', 'status',
  'created_by', 'created_by_name', 'created_at', 'approved_by', 'approved_by_name', 'approved_at',
  'notes', 'review_notes', 'voided_by', 'voided_at', 'void_reason', 'confirmations',
  'configuration', 'kind', 'scope', 'framework', 'legalForm', 'periodStart', 'periodEnd',
  'positionComparisonDate', 'comparativePeriodStart', 'comparativePeriodEnd', 'thirdPositionDate',
  'requiresThirdPosition', 'accountMappings', 'accountId', 'positionLine', 'comparisonPositionLine',
  'thirdPositionLine', 'incomeLine', 'cashFlowCategory', 'isCashEquivalent', 'currentSplit',
  'comparisonSplit', 'thirdSplit', 'line', 'amount', 'journalOverrides', 'journalId', 'treatment',
  'internalCashTransfer', 'equityCategory', 'cashFlows', 'category', 'label', 'reason', 'number',
  'titleAr', 'titleEn', 'text', 'evidence', 'preparationNotes', 'position', 'statements', 'key',
  'columns', 'labelAr', 'labelEn', 'startDate', 'endDate', 'rows', 'values', 'accountIds',
  'noteNumbers', 'findings', 'messageAr', 'messageEn', 'journalIds', 'journals', 'date', 'description',
  'referenceType', 'effectiveTreatment', 'isCanonicalClosing', 'cashMovement', 'requiresCashFlowReview',
  'requiresEquityReview', 'classifications', 'policies', 'reconciliations', 'disclosures', 'periodCutoff',
]);

const issueCodes = new Set([
  'invalid_type', 'invalid_literal', 'custom', 'invalid_union', 'invalid_union_discriminator',
  'invalid_enum_value', 'unrecognized_keys', 'invalid_arguments', 'invalid_return_type',
  'invalid_date', 'invalid_string', 'too_small', 'too_big', 'invalid_intersection_types',
  'not_multiple_of', 'not_finite',
]);

// Enumerated alternatives deliberately reject arbitrary prefixed text and appended values.
const knownErrorCode = /^(?:BALANCE_SHEET_(?:INVALID_DATES|COMPANY_REQUIRED|SCOPE_MISMATCH|DUPLICATE_ACCOUNTS|TOTALS_MISMATCH|INVALID_APPROVAL)|FINANCIAL_STATEMENT_(?:FUTURE_DATE|SCOPE_MISMATCH|DUPLICATE|TOTALS_MISMATCH|ROW_MISMATCH|REQUIRED_ROW|RECONCILIATION_MISMATCH|COLUMN_SCOPE|INVALID_APPROVAL|INVALID_VOID))$/;
const knownRequestCodes = new Set(['57014', '42501', 'PGRST202', 'PGRST301']);
const timeoutMessage = /abort|timeout|timed out|canceling statement/i;

function safePath(path: unknown): string {
  if (!Array.isArray(path) || path.length === 0) return '$';
  return path.slice(0, 16).map((part: unknown) => {
    if (typeof part === 'number' && Number.isSafeInteger(part) && part >= 0) return '[]';
    return typeof part === 'string' && schemaFields.has(part) ? part : '[redacted]';
  }).join('.');
}

/** Safe for console diagnostics: never serialize errors, input data or Zod messages. */
export function summarizeFinancialReportError(error: unknown): FinancialReportErrorSummary {
  const fallback: FinancialReportErrorSummary = { code: 'REPORT_VALIDATION_FAILED' };
  try {
    if (error instanceof ZodError) {
      return {
        code: fallback.code,
        issues: error.issues.slice(0, 20).map(issue => ({
          path: safePath(issue.path),
          code: issueCodes.has(issue.code) ? issue.code : 'custom',
        })),
      };
    }
    const object = error && typeof error === 'object' ? error : null;
    const code = object && 'code' in object ? object.code : undefined;
    if (typeof code === 'string' && knownRequestCodes.has(code)) return { code };
    const name = object && 'name' in object ? object.name : undefined;
    const message = object && 'message' in object ? object.message : undefined;
    if (name === 'AbortError' || (typeof message === 'string' && timeoutMessage.test(message.slice(0, 2000)))) {
      return { code: 'REPORT_REQUEST_TIMEOUT' };
    }
    const candidates = [code, error instanceof Error ? message : undefined];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length < 100
        && candidate === candidate.trim() && knownErrorCode.test(candidate)) {
        return { code: candidate };
      }
    }
  } catch {
    // Malformed/custom error objects must not break reporting or reveal their content.
  }
  return fallback;
}
