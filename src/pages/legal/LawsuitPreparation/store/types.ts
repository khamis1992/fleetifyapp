/**
 * Types for Lawsuit Preparation Module
 * أنواع بيانات وحدة تجهيز الدعوى
 */

import type { LegalDocumentType } from '@/services/LawsuitService';
import type { LegalClaimScope } from '@/types/legalClaimScope';

// ==========================================
// Core Domain Types
// ==========================================

export interface Customer {
  id: string;
  first_name: string | null;
  first_name_ar: string | null;
  last_name: string | null;
  last_name_ar: string | null;
  customer_type: 'individual' | 'corporate' | null;
  company_name: string | null;
  company_name_ar: string | null;
  national_id: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
}

export interface Vehicle {
  make: string | null;
  model: string | null;
  year: number | null;
  plate_number: string | null;
  color: string | null;
  vin: string | null;
  status: string | null;
}

export interface Contract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string | null;
  monthly_amount: number | null;
  customer_id: string | null;
  vehicle_id: string | null;
  license_plate: string | null;
  status: string | null;
  contract_amount?: number | null;
  auto_renew_enabled?: boolean | null;
  renewal_terms?: unknown;
  vehicle_returned?: boolean | null;
  /** وديعة الضمان المدوّنة في العقد نفسه (أقوى مصدر قبل تسعير المركبة) */
  security_deposit?: number | null;
  customers?: Customer | null;
  vehicles?: Vehicle | null;
}

export interface OverdueInvoice {
  id: string;
  invoice_number: string | null;
  due_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  /** المصدر المحاسبي الفعلي للسطر؛ الاستحقاق التعاقدي يستخدم فقط عند غياب فاتورة للشهر نفسه. */
  source?: 'invoice' | 'payment_schedule' | 'legal_accrual';
  source_reference?: string | null;
  invoice_month?: string | null;
}

export interface FinancialClaimSourceSummary {
  mode: 'none' | 'invoices' | 'payment_schedules' | 'hybrid' | 'legal_accrual' | 'composite';
  invoiceCount: number;
  scheduleCount: number;
  legalAccrualCount: number;
  legalAccrualAmount: number;
  totalCount: number;
  outstandingTotal: number;
  asOfDate: string;
}

/** ملخص إشعارات السداد المرسلة للعميل (الإعذار القانوني) من reminder_history */
export interface PaymentReminderSummary {
  count: number;
  lastSentDate: string | null;
  sendMethods: string[];
}

// ==========================================
// بيانات التقاضي الموثقة (المرحلة 2)
// ==========================================

export type RescissionStrategy =
  | 'natural_expiry'
  | 'judicial_rescission'
  | 'documented_termination';

export type TerminationType =
  | 'contract_expired'
  | 'documented_cancellation'
  | 'judicial_rescission';

export type TerminationDateStatus = 'confirmed' | 'requires_judicial_proof';

export type VehicleCustodyStatus =
  | 'with_defendant'
  | 'returned'
  | 'recovered_by_company'
  | 'authority_impounded'
  | 'lost'
  | 'unknown';

export type LegalReviewStatus = 'draft' | 'ready_with_reservations' | 'ready' | 'approved';
export type DefendantContactSource =
  | 'customer_record'
  | 'contract'
  | 'national_address'
  | 'verified_manual';
export type DefendantEmailStatus = 'unknown' | 'verified' | 'unavailable';

/** سجل الملف التقاضي للعقد من جدول legal_case_litigation_profile */
export interface LitigationProfile {
  id: string;
  company_id: string;
  contract_id: string;
  case_id: string | null;
  rescission_strategy: RescissionStrategy;
  termination_type: TerminationType | null;
  termination_date: string | null;
  termination_date_source: string | null;
  termination_date_status: TerminationDateStatus;
  termination_supporting_document_id: string | null;
  delivery_handover_date: string | null;
  delivery_handover_document_id: string | null;
  vehicle_custody: VehicleCustodyStatus;
  vehicle_returned_at: string | null;
  vehicle_return_document_id: string | null;
  renewal_applies: boolean;
  renewed_end_date: string | null;
  rent_due_day: number | null;
  payment_clause_number: string | null;
  return_clause_number: string | null;
  violations_clause_number: string | null;
  termination_clause_number: string | null;
  termination_clause_text: string | null;
  notice_exception_type: 'due_date_agreement' | 'written_refusal' | 'impossible_or_useless_performance' | null;
  notice_exception_clause_or_reason: string | null;
  notice_exception_document_id: string | null;
  defendant_service_address: string | null;
  defendant_email: string | null;
  defendant_email_status: DefendantEmailStatus;
  defendant_contact_source: DefendantContactSource | null;
  defendant_contact_document_id: string | null;
  security_deposit_amount: number | null;
  apply_security_deposit: boolean;
  retention_daily_rate: number | null;
  retention_rate_source: 'company_price_list' | 'market_quotes' | 'recent_contracts' | null;
  retention_rate_source_ref: string | null;
  retention_rate_source_document_id: string | null;
  contractual_compensation_enabled: boolean;
  contractual_compensation_clause_number: string | null;
  contractual_compensation_clause_text: string | null;
  contractual_compensation_method: 'fixed' | 'daily' | 'monthly' | 'per_invoice' | null;
  contractual_compensation_rate: number | null;
  contractual_compensation_cap: number | null;
  contractual_compensation_document_id: string | null;
  legal_review_status: LegalReviewStatus;
  approved_by: string | null;
  approved_at: string | null;
  approval_source: 'human' | 'taqadi_agent' | null;
  approval_job_id: string | null;
  approval_worker_id: string | null;
  updated_at: string;
  notes: string | null;
}

/** إنذار كتابي موثق الوصول من جدول legal_case_formal_notices */
export interface FormalNotice {
  id: string;
  company_id: string;
  contract_id: string;
  case_id: string | null;
  notice_type: 'payment_demand' | 'vehicle_return_demand' | 'termination_notice';
  sent_on: string;
  delivery_method: string;
  delivered_on: string | null;
  delivery_confirmed: boolean;
  grace_period_days: number | null;
  proof_document_id: string | null;
  notes: string | null;
}

/** بند مصاريف أضرار بسند مستند من جدول legal_case_damage_costs */
export interface DamageCost {
  id: string;
  company_id: string;
  contract_id: string;
  case_id: string | null;
  cost_type:
    | 'recovery_towing'
    | 'non_standard_repairs'
    | 'parts_insurance_burden'
    | 'inspection_transport_storage'
    | 'monetary_delay_damage'
    | 'financing_burden_damage'
    | 'operational_loss'
    | 'early_termination_damage'
    | 'other';
  description: string;
  amount: number;
  cost_date: string | null;
  evidence_document_id: string | null;
  evidence_url: string | null;
  verified: boolean;
  causation_notes: string | null;
  depreciation_deduction: number;
  insurance_recovery: number;
  notes: string | null;
}

export interface ContractEvidenceDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string | null;
  mime_type: string | null;
  legal_identity_match_status?: 'pending' | 'matched' | 'mismatch' | 'unverified' | 'expired_unverified' | 'failed' | null;
  legal_evidence_state?: 'active' | 'superseded' | 'quarantined' | null;
}

export type EvidenceProposalStatus = 'pending' | 'accepted' | 'rejected' | 'superseded';

/** اقتراح مؤتمت يحتاج مراجعة قبل نقله إلى الملف القانوني. */
export interface LegalEvidenceProposal {
  id: string;
  company_id: string;
  contract_id: string;
  field_key: string;
  field_label: string;
  value_label: string;
  proposed_patch: Partial<LitigationProfile>;
  current_value: Record<string, unknown> | null;
  automation_level: 'automatic' | 'review';
  source_kind: string;
  source_ref: string;
  source_label: string;
  source_document_id: string | null;
  confidence: number;
  reason: string;
  status: EvidenceProposalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalMemoSnapshot {
  id: string;
  company_id: string;
  contract_id: string;
  case_id: string | null;
  version: number;
  facts_as_of_date: string;
  filing_date: string | null;
  legal_path: RescissionStrategy;
  readiness_status: Exclude<LegalReviewStatus, 'draft'>;
  readiness_issues: string[];
  payload: Record<string, unknown>;
  template_version: string;
  document_reference: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_source: 'human' | 'taqadi_agent' | null;
  approval_job_id: string | null;
  approval_worker_id: string | null;
  created_at: string;
}

export interface LegalCaseSummary {
  id: string;
  case_number: string;
  case_reference: string | null;
  filing_date: string | null;
  case_status: string;
  workflow_stage: string;
  claim_scope: LegalClaimScope;
}

export interface TrafficViolation {
  id: string;
  violation_number: string | null;
  violation_date: string | null;
  violation_type: string | null;
  location: string | null;
  fine_amount: number | null;
  total_amount: number | null;
  status: string;
}

export interface CompanyLegalDocument {
  id: string;
  company_id: string;
  document_type: LegalDocumentType;
  document_name: string;
  file_url: string;
  file_size?: number;
  expiry_date?: string;
  notes?: string;
  is_active: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Financial Calculations
// ==========================================

export interface FinancialCalculations {
  overdueRent: number;
  lateFees: number;
  contractualCompensationUnits?: number;
  damagesFee: number;
  violationsFines: number;
  violationsCount: number;
  retentionCompensation: number;
  securityDepositDeduction: number;
  total: number;
  invoiceLateFees: {
    invoiceId?: string;
    invoiceNumber?: string;
    dueDate: string;
    remainingAmount: number;
    daysOverdue: number;
    lateFee: number;
  }[];
  overdueInvoicesCount: number;
  totalDaysOverdue: number;
  avgDaysOverdue: number;
  amountInWords: string;
}

// ==========================================
// Taqadi Data
// ==========================================

export interface TaqadiDefendantInfo {
  // معلومات أساسية
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  
  // معلومات الهوية
  idNumber: string | null;
  idType: string | null;
  nationality: string | null;
  
  // معلومات الاتصال
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface TaqadiContractInfo {
  contractNumber: string;
  startDate: string;
  endDate: string | null;
  monthlyAmount: number | null;
}

export interface TaqadiVehicleInfo {
  make: string | null;
  model: string | null;
  year: number | null;
  plateNumber: string | null;
  color: string | null;
  vin: string | null;
  fullDescription: string;
}

export interface TaqadiData {
  // بيانات الدعوى
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
  
  // بيانات المدعى عليه
  defendant: TaqadiDefendantInfo;
  
  // بيانات العقد
  contract: TaqadiContractInfo;
  
  // بيانات السيارة
  vehicle: TaqadiVehicleInfo;
}

// ==========================================
// Document State
// ==========================================

export type DocumentStatus = 'pending' | 'generating' | 'ready' | 'error' | 'missing';

export interface DocumentState {
  id: string;
  status: DocumentStatus;
  url: string | null;
  htmlContent: string | null;
  error: Error | null;
  generatedAt: string | null;
  name: string;
  description: string;
  type: 'mandatory' | 'optional';
  category: 'generated' | 'company' | 'contract' | 'violations';
  isUploading?: boolean;
  uploadError?: string | null;
  sourceDocumentId?: string | null;
  identityVerification?: import('@/services/legalContractIdentityVerifier').LegalContractIdentityVerification;
}

export interface DocumentsState {
  memo: DocumentState;
  claims: DocumentState;
  docsList: DocumentState;
  violations: DocumentState;
  violationsEvidence: DocumentState;
  criminalComplaint: DocumentState;
  violationsTransfer: DocumentState;
  contract: DocumentState;
  commercialRegister: DocumentState;
  ibanCertificate: DocumentState;
  representativeId: DocumentState;
}

export interface ViolationEvidenceDocument {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
}

// ==========================================
// UI State
// ==========================================

export interface UIState {
  isLoading: boolean;
  isGeneratingAll: boolean;
  isRegistering: boolean;
  isDownloadingZip: boolean;
  isDownloadingInvoices: boolean;
  isSendingToLawsuitData: boolean;
  isTaqadiAutomating: boolean;
  isMarkingCaseOpened: boolean;
  showTaqadiData: boolean;
  taqadiServerRunning: boolean;
  taqadiAutomationStatus: string;
  copiedField: string | null;
  progress: {
    total: number;
    ready: number;
    percentage: number;
  };
  includeCriminalComplaint: boolean;
  includeViolationsTransfer: boolean;
}

// ==========================================
// Main State
// ==========================================

export interface LawsuitPreparationState {
  // Core Data
  contractId: string | null;
  companyId: string | null;
  contract: Contract | null;
  customer: Customer | null;
  vehicle: Vehicle | null;
  overdueInvoices: OverdueInvoice[];
  financialClaimSource: FinancialClaimSourceSummary;
  paymentReminders: PaymentReminderSummary;
  /** الملف التقاضي الموثق (استراتيجية الفسخ، الإنهاء، التسليم، الحيازة، وديعة الضمان، أجر المثل) */
  litigationProfile: LitigationProfile | null;
  /** الإنذارات الكتابية الموثقة الوصول */
  formalNotices: FormalNotice[];
  /** بنود مصاريف الأضرار بسند مستند */
  damageCosts: DamageCost[];
  contractEvidenceDocuments: ContractEvidenceDocument[];
  evidenceProposals: LegalEvidenceProposal[];
  memoSnapshots: LegalMemoSnapshot[];
  legalCase: LegalCaseSummary | null;
  trafficViolations: TrafficViolation[];
  violationEvidenceDocuments: ViolationEvidenceDocument[];
  companyDocuments: CompanyLegalDocument[];
  
  // Derived Data
  calculations: FinancialCalculations | null;
  taqadiData: TaqadiData | null;
  
  // States
  documents: DocumentsState;
  ui: UIState;
}

// ==========================================
// Actions
// ==========================================

export type LawsuitPreparationAction =
  // Data Loading
  | { type: 'SET_CONTRACT_DATA'; payload: { contract: Contract; customer: Customer | null; vehicle: Vehicle | null } }
  | { type: 'SET_INVOICES'; payload: OverdueInvoice[] }
  | { type: 'SET_FINANCIAL_CLAIM_SOURCE'; payload: FinancialClaimSourceSummary }
  | { type: 'SET_PAYMENT_REMINDERS'; payload: PaymentReminderSummary }
  | { type: 'SET_LITIGATION_PROFILE'; payload: LitigationProfile | null }
  | { type: 'SET_FORMAL_NOTICES'; payload: FormalNotice[] }
  | { type: 'SET_DAMAGE_COSTS'; payload: DamageCost[] }
  | { type: 'SET_CONTRACT_EVIDENCE_DOCUMENTS'; payload: ContractEvidenceDocument[] }
  | { type: 'SET_EVIDENCE_PROPOSALS'; payload: LegalEvidenceProposal[] }
  | { type: 'SET_MEMO_SNAPSHOTS'; payload: LegalMemoSnapshot[] }
  | { type: 'SET_LEGAL_CASE'; payload: LegalCaseSummary | null }
  | { type: 'SET_VIOLATIONS'; payload: TrafficViolation[] }
  | { type: 'SET_VIOLATION_EVIDENCE_DOCUMENTS'; payload: ViolationEvidenceDocument[] }
  | { type: 'SET_COMPANY_DOCUMENTS'; payload: CompanyLegalDocument[] }
  | { type: 'SET_COMPANY_ID'; payload: string }
  
  // Calculations
  | { type: 'UPDATE_CALCULATIONS'; payload: FinancialCalculations }
  | { type: 'UPDATE_TAQADI_DATA'; payload: TaqadiData }
  
  // Document Actions
  | { type: 'GENERATE_DOCUMENT_START'; payload: { docId: keyof DocumentsState } }
  | { type: 'GENERATE_DOCUMENT_SUCCESS'; payload: { docId: keyof DocumentsState; url: string; html: string } }
  | { type: 'GENERATE_DOCUMENT_ERROR'; payload: { docId: keyof DocumentsState; error: Error } }
  | { type: 'RESET_DOCUMENT'; payload: { docId: keyof DocumentsState } }
  | { type: 'UPLOAD_DOCUMENT_START'; payload: { docId: keyof DocumentsState } }
  | {
      type: 'UPLOAD_DOCUMENT_SUCCESS';
      payload: {
        docId: keyof DocumentsState;
        url: string;
        sourceDocumentId?: string | null;
        identityVerification?: import('@/services/legalContractIdentityVerifier').LegalContractIdentityVerification;
      };
    }
  | { type: 'UPLOAD_DOCUMENT_ERROR'; payload: { docId: keyof DocumentsState; error: string } }
  
  // Batch Actions
  | { type: 'GENERATE_ALL_START' }
  | { type: 'GENERATE_ALL_COMPLETE' }
  | { type: 'REGISTER_CASE_START' }
  | { type: 'REGISTER_CASE_COMPLETE' }
  | { type: 'REGISTER_CASE_ERROR'; payload: Error }
  | { type: 'DOWNLOAD_ZIP_START' }
  | { type: 'DOWNLOAD_ZIP_COMPLETE' }
  | { type: 'SET_DOWNLOADING_INVOICES'; payload: boolean }
  | { type: 'SEND_TO_LAWSUIT_DATA_START' }
  | { type: 'SEND_TO_LAWSUIT_DATA_COMPLETE' }
  
  // Taqadi Automation
  | { type: 'TAQADI_AUTOMATION_START' }
  | { type: 'TAQADI_AUTOMATION_STATUS'; payload: string }
  | { type: 'TAQADI_AUTOMATION_STOP' }
  | { type: 'SET_TAQADI_SERVER_STATUS'; payload: boolean }
  
  // Mark Case as Opened
  | { type: 'MARK_CASE_OPENED_START' }
  | { type: 'MARK_CASE_OPENED_COMPLETE' }
  | { type: 'MARK_CASE_OPENED_ERROR'; payload: Error }
  
  // UI Actions
  | { type: 'TOGGLE_TAQADI_DATA' }
  | { type: 'SET_COPIED_FIELD'; payload: string | null }
  | { type: 'SET_INCLUDE_CRIMINAL_COMPLAINT'; payload: boolean }
  | { type: 'SET_INCLUDE_VIOLATIONS_TRANSFER'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_STATE' };

// ==========================================
// Context Type
// ==========================================

export interface LawsuitPreparationContextValue {
  state: LawsuitPreparationState;
  dispatch: React.Dispatch<LawsuitPreparationAction>;
  actions: {
    // Document Generation
    generateDocument: (docId: keyof DocumentsState) => Promise<void>;
    generateAllDocuments: () => Promise<void>;
    uploadDocument: (docId: keyof DocumentsState, file: File) => Promise<void>;
    
    // Case Management
    registerCase: () => Promise<void>;
    downloadAllAsZip: () => Promise<void>;
    sendToLawsuitData: () => Promise<void>;
    
    // Taqadi
    startTaqadiAutomation: () => Promise<void>;
    stopTaqadiAutomation: () => void;
    checkTaqadiServer: () => Promise<boolean>;
    
    // Document Downloads
    downloadMemoPdf: () => Promise<void>;
    downloadMemoDocx: () => Promise<void>;
    downloadInvoicesAsZip: () => Promise<void>;
    
    // Utilities
    copyToClipboard: (text: string, field: string) => Promise<void>;
    toggleTaqadiData: () => void;
    setIncludeCriminalComplaint: (value: boolean) => void;
    setIncludeViolationsTransfer: (value: boolean) => void;
    markCaseAsOpened: () => Promise<void>;
    /** اعتماد موحد: يعتمد الملف القانوني ثم لقطة المذكرة في حركة واحدة */
    saveLitigationProfile: (profile: Partial<LitigationProfile>) => Promise<LitigationProfile>;
    saveFormalNotice: (notice: Partial<FormalNotice> & Pick<FormalNotice, 'notice_type' | 'sent_on' | 'delivery_method'>) => Promise<FormalNotice>;
    deleteFormalNotice: (noticeId: string) => Promise<void>;
    saveDamageCost: (cost: Partial<DamageCost> & Pick<DamageCost, 'cost_type' | 'description' | 'amount'>) => Promise<DamageCost>;
    deleteDamageCost: (costId: string) => Promise<void>;
    freezeMemoSnapshot: () => Promise<LegalMemoSnapshot>;
    uploadEvidenceDocument: (
      file: File,
      documentType: string,
      documentName?: string,
    ) => Promise<ContractEvidenceDocument>;
    analyzeLegalEvidence: () => Promise<import('../utils/legalEvidenceAutomation').LegalEvidenceAnalysis>;
    reviewEvidenceProposal: (
      proposalId: string,
      decision: 'accept' | 'reject',
    ) => Promise<void>;
  };
}

// ==========================================
// Constants
// ==========================================

/** لا توجد قيم افتراضية للمطالبات غير المثبتة. */
export const DAILY_LATE_FEE = 0;
export const DAMAGES_FEE = 0;
export const MAX_LATE_FEE_PER_INVOICE = 0;

export const DOCUMENT_CONFIG: Record<keyof DocumentsState, { 
  name: string; 
  description: string; 
  type: 'mandatory' | 'optional';
  category: 'generated' | 'company' | 'contract' | 'violations';
}> = {
  memo: {
    name: 'المذكرة الشارحة',
    description: 'مذكرة شارحة للدعوى',
    type: 'mandatory',
    category: 'generated',
  },
  claims: {
    name: 'كشف المطالبات المالية',
    description: 'كشف بالمطالبات المالية',
    type: 'mandatory',
    category: 'generated',
  },
  docsList: {
    name: 'كشف المستندات المرفوعة',
    description: 'قائمة بجميع المستندات',
    type: 'mandatory',
    category: 'generated',
  },
  violations: {
    name: 'كشف المخالفات المرورية',
    description: 'كشف بالمخالفات المرورية',
    type: 'optional',
    category: 'violations',
  },
  violationsEvidence: {
    name: 'تقرير مخالفات وزارة الداخلية',
    description: 'نسخة التقرير الرسمي الصادر للمركبة',
    type: 'mandatory',
    category: 'violations',
  },
  criminalComplaint: {
    name: 'بلاغ جنائي بالامتناع عن رد المركبة',
    description: 'مستند استثنائي يتطلب أدلة معتمدة على التسليم والانتهاء والمطالبة بالرد',
    type: 'optional',
    category: 'generated',
  },
  violationsTransfer: {
    name: 'طلب تحويل المخالفات',
    description: 'طلب لإدارة المرور',
    type: 'optional',
    category: 'generated',
  },
  contract: {
    name: 'عقد الإيجار',
    description: 'صورة من العقد الموقع',
    type: 'mandatory',
    category: 'contract',
  },
  commercialRegister: {
    name: 'السجل التجاري',
    description: 'سجل الشركة التجاري',
    type: 'mandatory',
    category: 'company',
  },
  ibanCertificate: {
    name: 'شهادة IBAN',
    description: 'شهادة الحساب البنكي',
    type: 'mandatory',
    category: 'company',
  },
  representativeId: {
    name: 'البطاقة الشخصية للممثل',
    description: 'بطاقة المفوض بالتوقيع',
    type: 'mandatory',
    category: 'company',
  },
};
