import { z } from 'zod';
import type { FinancialStatementConfiguration, ProfessionalFinancialStatementPackage, SavedFinancialStatementPackage } from '@/types/financialStatementPackage';
import { dateBefore, incomeLineOptions, noteDefinitions, positionLineOptions, previousYearDate } from './financialStatementConfiguration';

const money = z.number().finite();
const configurationMoney = money.min(-1e12).max(1e12);
const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= '1900-01-01';
}, 'Invalid financial statement date');
const timestamp = z.string().datetime({ offset: true });
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const count = z.number().int().nonnegative();
const positionLine = z.enum(positionLineOptions.map(item => item.value) as [typeof positionLineOptions[number]['value'], ...typeof positionLineOptions[number]['value'][]]);
const incomeLine = z.enum(incomeLineOptions.map(item => item.value) as [typeof incomeLineOptions[number]['value'], ...typeof incomeLineOptions[number]['value'][]]);
const split = z.object({ line: positionLine, amount: configurationMoney }).strict();
const category = z.enum(['operating', 'investing', 'financing', 'exchange']);
export const financialStatementConfigurationSchema = z.object({
  version: z.literal(1), kind: z.enum(['annual', 'interim']), scope: z.literal('individual_entity'), framework: z.literal('IFRS'),
  legalForm: z.enum(['unspecified', 'llc', 'sole_establishment', 'other']),
  periodStart: isoDate, periodEnd: isoDate, positionComparisonDate: isoDate,
  comparativePeriodStart: isoDate, comparativePeriodEnd: isoDate,
  thirdPositionDate: isoDate.nullable(), requiresThirdPosition: z.boolean(),
  accountMappings: z.array(z.object({
    accountId: uuid, positionLine: positionLine.nullable(), comparisonPositionLine: positionLine.nullable(),
    thirdPositionLine: positionLine.nullable().default(null), incomeLine: incomeLine.nullable(),
    cashFlowCategory: category.nullable(), isCashEquivalent: z.boolean(),
    currentSplit: split.nullable(), comparisonSplit: split.nullable(), thirdSplit: split.nullable().default(null),
  }).strict()).max(20000),
  journalOverrides: z.array(z.object({
    journalId: uuid, treatment: z.enum(['regular', 'closing']), internalCashTransfer: configurationMoney.nonnegative().default(0),
    equityCategory: z.enum(['contributions', 'distributions', 'transfers', 'prior_adjustments', 'oci_reclassifiable', 'oci_nonreclassifiable', 'other']).nullable(),
    cashFlows: z.array(z.object({ category, amount: configurationMoney, label: z.string().trim().min(5).max(200) }).strict()).max(20), reason: z.string().trim().min(20).max(2000),
  }).strict()).max(20000),
  notes: z.array(z.object({
    code: z.enum(noteDefinitions.map(item => item.code) as [typeof noteDefinitions[number]['code'], ...typeof noteDefinitions[number]['code'][]]),
    number: z.number().int().min(1).max(99), titleAr: z.string().trim().min(1).max(200), titleEn: z.string().trim().min(1).max(200),
    status: z.enum(['pending', 'complete', 'not_applicable']), text: z.string().max(20000), evidence: z.string().max(4000),
  }).strict()).max(30),
  preparationNotes: z.string().max(10000),
}).strict().superRefine((value, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (value.periodStart > value.periodEnd || value.comparativePeriodStart > value.comparativePeriodEnd || value.comparativePeriodEnd >= value.periodStart) error('Invalid reporting periods');
  if (value.positionComparisonDate !== dateBefore(value.periodStart) || value.comparativePeriodStart !== previousYearDate(value.periodStart) || value.comparativePeriodEnd !== previousYearDate(value.periodEnd)) error('Comparison dates must match the prior financial year and corresponding period');
  const [year, month, day] = value.periodStart.split('-').map(Number);
  const anniversary = new Date(Date.UTC(year + 1, month - 1, day)).toISOString().slice(0, 10);
  const lastDay = dateBefore(anniversary);
  if (value.kind === 'annual' ? value.periodEnd !== lastDay : value.periodEnd >= lastDay) error('Annual/interim period does not match its financial-year start');
  if (value.thirdPositionDate && value.thirdPositionDate !== dateBefore(value.comparativePeriodStart)) error('Invalid opening comparative position date');
  // Missing third-position data is a review finding: drafts can still be prepared.
  for (const ids of [value.accountMappings.map(item => item.accountId), value.journalOverrides.map(item => item.journalId), value.notes.map(item => item.code), value.notes.map(item => String(item.number))]) {
    if (new Set(ids).size !== ids.length) error('Duplicate financial statement configuration item');
  }
});

const totals = z.object({ assets: money, liabilities: money, equityAccounts: money, revenue: money, expenses: money,
  unclosedResult: money, equity: money, liabilitiesAndEquity: money, imbalance: money, postedEntries: count, postedLines: count, draftEntries: count });
const company = z.object({ id: uuid, name: z.string(), nameAr: z.string().nullable(), commercialRegister: z.string().nullable(), currency: z.string(), address: z.string().nullable() });
const permissions = z.object({ canSave: z.boolean(), canApprove: z.boolean() });
const account = z.object({ id: uuid, code: z.string(), name: z.string(), nameAr: z.string().nullable(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'unknown']), subtype: z.string().nullable(),
  classification: z.enum(['current', 'non_current', 'unclassified', 'equity', 'result']), level: z.number().int().nullable(),
  isHeader: z.boolean().nullable(), isActive: z.boolean().nullable(), debit: money, credit: money, balance: money, comparisonBalance: money });
const position = z.object({ version: z.literal(1), company, asOfDate: isoDate, comparisonDate: isoDate.nullable(), generatedAt: timestamp,
  accounts: z.array(account), current: totals, comparison: totals.nullable(),
  checks: z.array(z.object({ code: z.string(), severity: z.enum(['error', 'warning']), count, asOfDate: isoDate })), fingerprint: digest, permissions });
const positionGroups = {
  current_assets: ['cash', 'receivables', 'inventories', 'current_tax_assets', 'other_current_assets'],
  noncurrent_assets: ['property_equipment', 'right_of_use_assets', 'intangibles', 'investments', 'investment_property', 'deferred_tax_assets', 'other_noncurrent_assets'],
  current_liabilities: ['payables', 'customer_deposits', 'current_borrowings', 'current_lease_liabilities', 'current_tax_liabilities', 'current_provisions', 'other_current_liabilities'],
  noncurrent_liabilities: ['noncurrent_borrowings', 'noncurrent_lease_liabilities', 'employee_benefits', 'deferred_tax_liabilities', 'noncurrent_provisions', 'other_noncurrent_liabilities'],
  equity: ['share_capital', 'statutory_reserve', 'retained_earnings', 'other_reserves', 'other_equity'],
} as const;
export const financialStatementPackageSchema = z.object({
  version: z.literal(1), company, configuration: financialStatementConfigurationSchema, generatedAt: timestamp, fingerprint: digest, position,
  statements: z.array(z.object({
    key: z.enum(['position', 'profit_loss_oci', 'equity_current', 'equity_comparative', 'cash_flow']), titleAr: z.string().min(1), titleEn: z.string().min(1),
    columns: z.array(z.object({ key: z.string().min(1), labelAr: z.string(), labelEn: z.string(), startDate: isoDate.nullable().optional(), endDate: isoDate.nullable().optional() })).min(1).max(12),
    rows: z.array(z.object({ key: z.string().min(1), labelAr: z.string(), labelEn: z.string(), kind: z.enum(['section', 'line', 'subtotal', 'total', 'reconciliation']),
      values: z.array(money.nullable()), accountIds: z.array(uuid), noteNumbers: z.array(z.number().int().positive()) })).min(1),
  })).length(5),
  findings: z.array(z.object({ code: z.string().min(1), severity: z.enum(['error', 'warning']), count, messageAr: z.string(), messageEn: z.string(), accountIds: z.array(uuid), journalIds: z.array(uuid) })),
  journals: z.array(z.object({ id: uuid, date: isoDate, number: z.string(), description: z.string(), referenceType: z.string().nullable(), effectiveTreatment: z.enum(['regular', 'closing']), isCanonicalClosing: z.boolean(), cashMovement: money,
    requiresCashFlowReview: z.boolean(), requiresEquityReview: z.boolean() })), permissions,
});
export function canonicalFinancialStatementContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalFinancialStatementContent).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalFinancialStatementContent((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function validateFinancialStatementConfiguration(raw: unknown, today?: string): FinancialStatementConfiguration {
  const data = financialStatementConfigurationSchema.parse(raw);
  if (today && data.periodEnd > today) throw new Error('FINANCIAL_STATEMENT_FUTURE_DATE');
  return data;
}
export function parseFinancialStatementPackage(raw: unknown, companyId: string, expectedConfiguration?: FinancialStatementConfiguration): ProfessionalFinancialStatementPackage {
  const data = financialStatementPackageSchema.parse(raw);
  const { configuration: config, position: source } = data;
  if (data.company.id !== companyId || source.company.id !== companyId || canonicalFinancialStatementContent(data.company) !== canonicalFinancialStatementContent(source.company)
    || source.asOfDate !== config.periodEnd || source.comparisonDate !== config.positionComparisonDate || !source.comparison
    || (expectedConfiguration && canonicalFinancialStatementContent(config) !== canonicalFinancialStatementContent(validateFinancialStatementConfiguration(expectedConfiguration)))) throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  if (new Set(source.accounts.map(item => item.id)).size !== source.accounts.length || new Set(data.statements.map(item => item.key)).size !== 5 || new Set(data.journals.map(item => item.id)).size !== data.journals.length) throw new Error('FINANCIAL_STATEMENT_DUPLICATE');
  const close = (left: number, right: number) => Math.abs(left - right) < 0.011;
  for (const [value, key] of [[source.current, 'balance'], [source.comparison, 'comparisonBalance']] as const) {
    if (!value) continue;
    const sum = (type: string) => source.accounts.filter(item => item.type === type).reduce((result, item) => result + item[key], 0);
    if (!close(value.assets, sum('asset')) || !close(value.liabilities, sum('liability')) || !close(value.equityAccounts, sum('equity'))
      || !close(value.revenue, sum('revenue')) || !close(value.expenses, sum('expense')) || !close(value.unclosedResult, value.revenue - value.expenses)
      || !close(value.equity, value.equityAccounts + value.unclosedResult) || !close(value.liabilitiesAndEquity, value.liabilities + value.equity)
      || !close(value.imbalance, value.assets - value.liabilitiesAndEquity)) throw new Error('FINANCIAL_STATEMENT_TOTALS_MISMATCH');
  }
  const noteNumbers = new Set(config.notes.map(note => note.number));
  for (const statement of data.statements) {
    if (new Set(statement.rows.map(row => row.key)).size !== statement.rows.length || new Set(statement.columns.map(column => column.key)).size !== statement.columns.length) throw new Error('FINANCIAL_STATEMENT_DUPLICATE');
    if (statement.rows.some(row => row.values.length !== statement.columns.length || row.noteNumbers.some(number => !noteNumbers.has(number)))) throw new Error('FINANCIAL_STATEMENT_ROW_MISMATCH');
  }
  const section = (key: ProfessionalFinancialStatementPackage['statements'][number]['key']) => data.statements.find(item => item.key === key)!;
  const numberAt = (key: ProfessionalFinancialStatementPackage['statements'][number]['key'], rowKey: string, column: number) => {
    const value = section(key).rows.find(row => row.key === rowKey)?.values[column];
    if (value === undefined || value === null) throw new Error('FINANCIAL_STATEMENT_REQUIRED_ROW');
    return value;
  };
  const requireEqual = (left: number, right: number) => { if (!close(left, right)) throw new Error('FINANCIAL_STATEMENT_RECONCILIATION_MISMATCH'); };
  const optionalNumberAt = (key: ProfessionalFinancialStatementPackage['statements'][number]['key'], rowKey: string, column: number) =>
    section(key).rows.some(row => row.key === rowKey) ? numberAt(key, rowKey, column) : 0;
  const sumRows = (key: ProfessionalFinancialStatementPackage['statements'][number]['key'], rowKeys: readonly string[], column: number) =>
    rowKeys.reduce((sum, rowKey) => sum + optionalNumberAt(key, rowKey, column), 0);
  const positionRowKeys = new Set<string>([
    ...Object.keys(positionGroups), ...Object.values(positionGroups).flat(),
    'current_assets_total', 'noncurrent_assets_total', 'current_liabilities_total', 'noncurrent_liabilities_total',
    'unclassified_asset', 'unclassified_liability', 'unclassified_equity',
    'assets_total', 'liabilities_total', 'equity_total', 'liabilities_equity_total', 'position_difference',
  ]);
  const incomeRowKeys = new Set<string>([
    ...incomeLineOptions.map(item => item.value), 'unclassified_income', 'profit_before_tax', 'profit',
    'oci_reclassifiable', 'oci_nonreclassifiable', 'total_comprehensive_income',
  ]);
  const cashCategories = ['operating', 'investing', 'financing', 'exchange'] as const;
  const cashSummaryKeys = new Set<string>([...cashCategories, 'opening', 'net_change', 'closing', 'ledger_closing', 'difference']);
  const cashDetailPattern = /^(operating|investing|financing|exchange)_(receipts|payments)_.+$/;
  if (section('position').rows.some(row => !positionRowKeys.has(row.key))
    || section('profit_loss_oci').rows.some(row => !incomeRowKeys.has(row.key))
    || section('cash_flow').rows.some(row => !cashSummaryKeys.has(row.key) && !cashDetailPattern.test(row.key))) {
    throw new Error('FINANCIAL_STATEMENT_ROW_MISMATCH');
  }
  const positionColumns = section('position').columns;
  if (positionColumns.length !== (config.thirdPositionDate ? 3 : 2) || positionColumns[0].endDate !== config.periodEnd || positionColumns[1].endDate !== config.positionComparisonDate
    || (config.thirdPositionDate && positionColumns[2].endDate !== config.thirdPositionDate)) throw new Error('FINANCIAL_STATEMENT_COLUMN_SCOPE');
  for (let column = 0; column < 2; column++) {
    const ledger = column === 0 ? source.current : source.comparison!;
    for (const [key, value] of [['assets_total', ledger.assets], ['liabilities_total', ledger.liabilities], ['equity_total', ledger.equity], ['liabilities_equity_total', ledger.liabilitiesAndEquity], ['position_difference', ledger.imbalance]] as const) requireEqual(numberAt('position', key, column), value);
  }
  // Validate every displayed position column, including an opening third position.
  for (let column = 0; column < positionColumns.length; column++) {
    const value = (key: string) => numberAt('position', key, column);
    for (const group of ['current_assets', 'noncurrent_assets', 'current_liabilities', 'noncurrent_liabilities'] as const) {
      requireEqual(value(`${group}_total`), sumRows('position', positionGroups[group], column));
    }
    requireEqual(value('assets_total'), value('current_assets_total') + value('noncurrent_assets_total') + optionalNumberAt('position', 'unclassified_asset', column));
    requireEqual(value('liabilities_total'), value('current_liabilities_total') + value('noncurrent_liabilities_total') + optionalNumberAt('position', 'unclassified_liability', column));
    requireEqual(value('equity_total'), sumRows('position', positionGroups.equity, column) + optionalNumberAt('position', 'unclassified_equity', column));
    requireEqual(value('liabilities_equity_total'), value('liabilities_total') + value('equity_total'));
    requireEqual(value('position_difference'), value('assets_total') - value('liabilities_equity_total'));
  }
  for (const key of ['profit_loss_oci', 'cash_flow'] as const) {
    const columns = section(key).columns;
    if (columns.length !== 2 || columns[0].startDate !== config.periodStart || columns[0].endDate !== config.periodEnd
      || columns[1].startDate !== config.comparativePeriodStart || columns[1].endDate !== config.comparativePeriodEnd) throw new Error('FINANCIAL_STATEMENT_COLUMN_SCOPE');
  }
  for (let column = 0; column < 2; column++) {
    const profit = (key: string) => numberAt('profit_loss_oci', key, column), cash = (key: string) => numberAt('cash_flow', key, column);
    requireEqual(profit('profit_before_tax'), sumRows('profit_loss_oci', incomeLineOptions.filter(item => item.value !== 'income_tax').map(item => item.value), column)
      + optionalNumberAt('profit_loss_oci', 'unclassified_income', column));
    requireEqual(profit('profit'), profit('profit_before_tax') + profit('income_tax'));
    requireEqual(profit('total_comprehensive_income'), profit('profit') + profit('oci_reclassifiable') + profit('oci_nonreclassifiable'));
    for (const category of cashCategories) {
      const details = section('cash_flow').rows.filter(row => row.key.startsWith(`${category}_receipts_`) || row.key.startsWith(`${category}_payments_`));
      for (const row of details) {
        const amount = cash(row.key);
        if (row.key.startsWith(`${category}_receipts_`) ? amount < 0 : amount > 0) throw new Error('FINANCIAL_STATEMENT_RECONCILIATION_MISMATCH');
      }
      requireEqual(cash(category), sumRows('cash_flow', details.map(row => row.key), column));
    }
    requireEqual(cash('net_change'), cash('operating') + cash('investing') + cash('financing') + cash('exchange'));
    requireEqual(cash('closing'), cash('opening') + cash('net_change'));
    requireEqual(cash('difference'), cash('closing') - cash('ledger_closing'));
    const key = column === 0 ? 'equity_current' : 'equity_comparative', equity = section(key);
    const totalColumn = equity.columns.findIndex(item => item.key === 'total');
    if (totalColumn < 0 || equity.columns.some(item => item.startDate !== (column === 0 ? config.periodStart : config.comparativePeriodStart)
      || item.endDate !== (column === 0 ? config.periodEnd : config.comparativePeriodEnd))) throw new Error('FINANCIAL_STATEMENT_COLUMN_SCOPE');
    for (const row of equity.rows) requireEqual(row.values[totalColumn] ?? 0, row.values.reduce<number>((sum, value, index) => index === totalColumn ? sum : sum + (value ?? 0), 0));
    requireEqual(numberAt(key, 'profit', totalColumn), profit('profit'));
    requireEqual(numberAt(key, 'oci', totalColumn), profit('oci_reclassifiable') + profit('oci_nonreclassifiable'));
    for (let index = 0; index < equity.columns.length; index++) {
      requireEqual(numberAt(key, 'closing', index), ['opening', 'profit', 'oci', 'contributions', 'distributions', 'transfers', 'prior_adjustments', 'other'].reduce((sum, row) => sum + numberAt(key, row, index), 0));
      requireEqual(numberAt(key, 'difference', index), numberAt(key, 'closing', index) - numberAt(key, 'ledger_closing', index));
    }
  }
  return data;
}
const savedSchema = z.object({ id: uuid, company_id: uuid, payload: z.unknown(), source_fingerprint: digest, status: z.enum(['draft', 'approved', 'voided']),
  created_by: uuid, created_by_name: z.string(), created_at: timestamp, approved_by: uuid.nullable(), approved_by_name: z.string().nullable(),
  approved_at: timestamp.nullable(), review_notes: z.string().nullable(), void_reason: z.string().nullable() });
export function parseSavedFinancialStatementPackage(raw: unknown, companyId: string): SavedFinancialStatementPackage {
  const saved = savedSchema.parse(raw);
  const payload = parseFinancialStatementPackage(saved.payload, companyId);
  if (saved.company_id !== companyId || saved.source_fingerprint !== payload.fingerprint) throw new Error('FINANCIAL_STATEMENT_SCOPE_MISMATCH');
  if (saved.status === 'approved' && (!saved.approved_by || saved.approved_by === saved.created_by || !saved.approved_by_name || !saved.approved_at
    || !saved.review_notes || saved.review_notes.trim().length < 20 || Date.parse(saved.approved_at) < Date.parse(saved.created_at)
    || payload.findings.some(finding => finding.severity === 'error' && finding.count > 0))) throw new Error('FINANCIAL_STATEMENT_INVALID_APPROVAL');
  if (saved.status === 'voided' && (!saved.void_reason || saved.void_reason.trim().length < 10)) throw new Error('FINANCIAL_STATEMENT_INVALID_VOID');
  return { ...saved, payload };
}
