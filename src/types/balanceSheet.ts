/** Canonical, server-generated balance sheet. Approval is an internal review, not an audit opinion. */
export type BalanceSheetLocale = "ar" | "en";
export type BalanceSheetAccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "unknown";
export type BalanceSheetClassification =
  | "current"
  | "non_current"
  | "unclassified"
  | "equity"
  | "result";

export interface BalanceSheetAccount {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: BalanceSheetAccountType;
  subtype: string | null;
  classification: BalanceSheetClassification;
  level: number | null;
  isHeader: boolean | null;
  isActive: boolean | null;
  debit: number;
  credit: number;
  balance: number;
  comparisonBalance: number;
}

export interface BalanceSheetTotals {
  assets: number;
  liabilities: number;
  equityAccounts: number;
  revenue: number;
  expenses: number;
  unclosedResult: number;
  equity: number;
  liabilitiesAndEquity: number;
  imbalance: number;
  postedEntries: number;
  postedLines: number;
  draftEntries: number;
}

export interface BalanceSheetCheck {
  code: string;
  severity: "error" | "warning";
  count: number;
  asOfDate: string;
}

export interface ProfessionalBalanceSheet {
  version: 1;
  company: {
    id: string;
    name: string;
    nameAr: string | null;
    commercialRegister: string | null;
    currency: string;
    address: string | null;
  };
  asOfDate: string;
  comparisonDate: string | null;
  generatedAt: string;
  accounts: BalanceSheetAccount[];
  current: BalanceSheetTotals;
  comparison: BalanceSheetTotals | null;
  checks: BalanceSheetCheck[];
  fingerprint: string;
  permissions: { canSave: boolean; canApprove: boolean };
}

export interface SavedBalanceSheet {
  id: string;
  company_id: string;
  as_of_date: string;
  comparison_date: string | null;
  payload: ProfessionalBalanceSheet;
  source_fingerprint: string;
  status: "draft" | "approved" | "voided";
  created_by: string;
  created_by_name: string;
  created_at: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string | null;
  review_notes: string | null;
  voided_by?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface BalanceSheetReviewConfirmations {
  assets: boolean;
  liabilities: boolean;
  equity: boolean;
  reconciliation: boolean;
  completeness: boolean;
}

export interface BalanceSheetExportOptions {
  report: ProfessionalBalanceSheet;
  snapshot?: SavedBalanceSheet | null;
  locale: BalanceSheetLocale;
}
