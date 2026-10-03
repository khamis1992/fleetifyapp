export type PortfolioRow = Record<string, unknown>;

export interface PortfolioRegister {
  key: string;
  label: string;
  basis: 'current_records' | 'dated_records' | 'posted_ledger';
  rows: PortfolioRow[];
  readAt: string;
}

export interface PortfolioDocument {
  id: string;
  source: string;
  name: string;
  category: string;
  ownerId: string | null;
  reference: string | null;
  buckets: string[];
  verifiedOwnerIds?: string[];
  expectedBytes?: number | null;
  recordState?: string | null;
  referenceOwnerId?: string | null;
  generatedHtml?: string;
  active: boolean;
}

export interface PortfolioManifestEntry {
  documentId: string;
  source: string;
  name: string;
  category: string;
  ownerId: string | null;
  status: 'included' | 'generated' | 'failed' | 'missing_reference' | 'inactive';
  archivePath: string | null;
  archiveName?: string | null;
  recordState?: string | null;
  referenceOwnerId?: string | null;
  bytes: number | null;
  sha256: string | null;
  reason: string | null;
}

export interface InsolvencyPortfolio {
  companyId: string;
  cutoff: string;
  startedAt: string;
  completedAt: string;
  registers: PortfolioRegister[];
  documents: PortfolioDocument[];
  savedStatements: PortfolioRow[];
}

/** Multiple supporting files per category; presence is never an approval of content. */
export const PORTFOLIO_EVIDENCE_CATEGORIES = [
  { key: 'insolvency_al_mana_case', ar: 'دعوى المانع: الصحيفة والمطالبة والمرفقات', en: 'Al-Mana lawsuit and supporting claim' },
  { key: 'insolvency_theft_report', ar: 'بلاغات سرقة المركبات ومتابعتها', en: 'Vehicle theft reports and follow-up' },
  { key: 'insolvency_fleet_assessment', ar: 'فحص الأسطول وتقييمه وأسباب تعطل التشغيل', en: 'Fleet inspection, valuation and operating restrictions' },
  { key: 'insolvency_cash_reconciliation', ar: 'جرد الصندوق ومطابقة النقد وإيصالات القبض والصرف', en: 'Cash count, cash reconciliation and receipt/payment vouchers' },
  { key: 'insolvency_bank_statement', ar: 'كشوف البنك الأصلية والمصادقات إن وجدت', en: 'Original bank statements and confirmations where applicable' },
  { key: 'insolvency_creditor_confirmation', ar: 'مصادقات الدائنين وعقود التمويل والضمانات', en: 'Creditor confirmations, finance agreements and security' },
  { key: 'insolvency_traffic_statement', ar: 'كشف المخالفات الرسمي وإثباتات السداد', en: 'Official traffic register and payment evidence' },
  { key: 'insolvency_financial_statements', ar: 'القوائم المالية الموقعة وتقرير المحاسب', en: 'Signed financial statements and accountant report' },
  { key: 'insolvency_company_resolution', ar: 'قرار الشركاء والتفويض للمحامي', en: 'Partners resolution and lawyer authorization' },
  { key: 'insolvency_employee_dues', ar: 'مستحقات الموظفين والتسويات', en: 'Employee dues and settlements' },
  { key: 'insolvency_tax_dues', ar: 'المستحقات الضريبية والحكومية', en: 'Tax and government dues' },
  { key: 'insolvency_collection_evidence', ar: 'مطالبات التحصيل والتعثر ومستنداتها', en: 'Collection demands and default evidence' },
  { key: 'insolvency_other_evidence', ar: 'مستندات مؤيدة أخرى', en: 'Other supporting evidence' },
] as const;
export type PortfolioEvidenceCategory = typeof PORTFOLIO_EVIDENCE_CATEGORIES[number]['key'];
