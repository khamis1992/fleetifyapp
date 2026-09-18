import type { BalanceSheetLocale, ProfessionalBalanceSheet } from './balanceSheet';

/** A reporting configuration, never an instruction to create or alter ledger entries. */
export type PositionLine =
  | 'cash' | 'receivables' | 'inventories' | 'current_tax_assets' | 'other_current_assets'
  | 'property_equipment' | 'right_of_use_assets' | 'intangibles' | 'investments' | 'investment_property' | 'deferred_tax_assets' | 'other_noncurrent_assets'
  | 'payables' | 'customer_deposits' | 'current_borrowings' | 'current_lease_liabilities' | 'current_tax_liabilities' | 'current_provisions' | 'other_current_liabilities'
  | 'noncurrent_borrowings' | 'noncurrent_lease_liabilities' | 'employee_benefits' | 'deferred_tax_liabilities' | 'noncurrent_provisions' | 'other_noncurrent_liabilities'
  | 'share_capital' | 'statutory_reserve' | 'retained_earnings' | 'other_reserves' | 'other_equity';
export type IncomeLine = 'rental_revenue' | 'other_revenue' | 'cost_of_revenue' | 'staff_costs' | 'depreciation' | 'administrative_expenses' | 'impairment' | 'finance_income' | 'finance_costs' | 'other_income' | 'other_expenses' | 'income_tax';
export type CashFlowCategory = 'operating' | 'investing' | 'financing' | 'exchange';
export type EquityMovementCategory = 'contributions' | 'distributions' | 'transfers' | 'prior_adjustments' | 'oci_reclassifiable' | 'oci_nonreclassifiable' | 'other';

export interface StatementAccountMapping {
  accountId: string;
  positionLine: PositionLine | null;
  /** Null means the same reviewed classification as the current column. */
  comparisonPositionLine: PositionLine | null;
  thirdPositionLine: PositionLine | null;
  incomeLine: IncomeLine | null;
  cashFlowCategory: CashFlowCategory | null;
  isCashEquivalent: boolean;
  /** Reclassify a part of the balance to another presentation line; totals cannot change. */
  currentSplit: { line: PositionLine; amount: number } | null;
  comparisonSplit: { line: PositionLine; amount: number } | null;
  thirdSplit: { line: PositionLine; amount: number } | null;
}
export interface StatementJournalOverride {
  journalId: string;
  treatment: 'regular' | 'closing';
  internalCashTransfer: number;
  equityCategory: EquityMovementCategory | null;
  cashFlows: { category: CashFlowCategory; amount: number; label: string }[];
  reason: string;
}
export type StatementNoteCode = 'entity' | 'basis' | 'policies' | 'estimates' | 'assets' | 'receivables' | 'liabilities' | 'equity' | 'related_parties' | 'commitments' | 'subsequent_events' | 'going_concern' | 'noncash_transactions' | 'interim_changes';
export interface FinancialStatementNote {
  code: StatementNoteCode;
  number: number;
  titleAr: string;
  titleEn: string;
  status: 'pending' | 'complete' | 'not_applicable';
  text: string;
  evidence: string;
}
export interface FinancialStatementConfiguration {
  version: 1;
  kind: 'annual' | 'interim';
  scope: 'individual_entity';
  framework: 'IFRS';
  legalForm: 'unspecified' | 'llc' | 'sole_establishment' | 'other';
  periodStart: string;
  periodEnd: string;
  positionComparisonDate: string;
  comparativePeriodStart: string;
  comparativePeriodEnd: string;
  /** Optional opening comparative position when retrospective changes require it. */
  thirdPositionDate: string | null;
  requiresThirdPosition: boolean;
  accountMappings: StatementAccountMapping[];
  journalOverrides: StatementJournalOverride[];
  notes: FinancialStatementNote[];
  preparationNotes: string;
}

export interface FinancialStatementColumn {
  key: string;
  labelAr: string;
  labelEn: string;
  startDate?: string | null;
  endDate?: string | null;
}
export interface FinancialStatementRow {
  key: string;
  labelAr: string;
  labelEn: string;
  kind: 'section' | 'line' | 'subtotal' | 'total' | 'reconciliation';
  values: (number | null)[];
  accountIds: string[];
  noteNumbers: number[];
}
export interface FinancialStatementSection {
  key: 'position' | 'profit_loss_oci' | 'equity_current' | 'equity_comparative' | 'cash_flow';
  titleAr: string;
  titleEn: string;
  columns: FinancialStatementColumn[];
  rows: FinancialStatementRow[];
}
export interface FinancialStatementFinding {
  code: string;
  severity: 'error' | 'warning';
  count: number;
  messageAr: string;
  messageEn: string;
  accountIds: string[];
  journalIds: string[];
}
export interface FinancialStatementSourceJournal {
  id: string;
  date: string;
  number: string;
  description: string;
  referenceType: string | null;
  effectiveTreatment: 'regular' | 'closing';
  isCanonicalClosing: boolean;
  cashMovement: number;
  requiresCashFlowReview: boolean;
  requiresEquityReview: boolean;
}
export interface ProfessionalFinancialStatementPackage {
  version: 1;
  company: ProfessionalBalanceSheet['company'];
  configuration: FinancialStatementConfiguration;
  generatedAt: string;
  fingerprint: string;
  position: ProfessionalBalanceSheet;
  statements: FinancialStatementSection[];
  findings: FinancialStatementFinding[];
  journals: FinancialStatementSourceJournal[];
  permissions: { canSave: boolean; canApprove: boolean };
}
export interface SavedFinancialStatementPackage {
  id: string;
  company_id: string;
  payload: ProfessionalFinancialStatementPackage;
  source_fingerprint: string;
  status: 'draft' | 'approved' | 'voided';
  created_by: string;
  created_by_name: string;
  created_at: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  review_notes: string | null;
  void_reason: string | null;
}
export interface FinancialStatementReview {
  classifications: boolean;
  policies: boolean;
  reconciliations: boolean;
  disclosures: boolean;
  periodCutoff: boolean;
}
export interface FinancialStatementPackageExportOptions {
  report: ProfessionalFinancialStatementPackage;
  snapshot?: SavedFinancialStatementPackage | null;
  locale: BalanceSheetLocale;
}
