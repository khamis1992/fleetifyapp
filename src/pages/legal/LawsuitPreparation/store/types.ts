/**
 * Types for Lawsuit Preparation Module
 * أنواع بيانات وحدة تجهيز الدعوى
 */

import type { LegalDocumentType } from '@/services/LawsuitService';

// ==========================================
// Core Domain Types
// ==========================================

export interface Customer {
  id: string;
  first_name: string | null;
  first_name_ar: string | null;
  last_name: string | null;
  last_name_ar: string | null;
  customer_type: 'individual' | 'company' | null;
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
  customers?: Customer | null;
  vehicles?: Vehicle | null;
}

export interface OverdueInvoice {
  id: string;
  invoice_number: string | null;
  due_date: string;
  total_amount: number | null;
  paid_amount: number | null;
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
  damagesFee: number;
  violationsFines: number;
  violationsCount: number;
  total: number;
  invoiceLateFees: { invoiceId: string; amount: number; daysLate: number }[];
  overdueInvoicesCount: number;
  avgDaysOverdue: number;
  amountInWords: string;
}

// ==========================================
// Taqadi Data
// ==========================================

export interface TaqadiData {
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
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
}

export interface DocumentsState {
  memo: DocumentState;
  claims: DocumentState;
  docsList: DocumentState;
  violations: DocumentState;
  criminalComplaint: DocumentState;
  violationsTransfer: DocumentState;
  contract: DocumentState;
  commercialRegister: DocumentState;
  ibanCertificate: DocumentState;
  representativeId: DocumentState;
}

// ==========================================
// UI State
// ==========================================

export interface UIState {
  isLoading: boolean;
  isGeneratingAll: boolean;
  isRegistering: boolean;
  isDownloadingZip: boolean;
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
  trafficViolations: TrafficViolation[];
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
  | { type: 'SET_VIOLATIONS'; payload: TrafficViolation[] }
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
  | { type: 'UPLOAD_DOCUMENT_SUCCESS'; payload: { docId: keyof DocumentsState; url: string } }
  | { type: 'UPLOAD_DOCUMENT_ERROR'; payload: { docId: keyof DocumentsState; error: string } }
  
  // Batch Actions
  | { type: 'GENERATE_ALL_START' }
  | { type: 'GENERATE_ALL_COMPLETE' }
  | { type: 'REGISTER_CASE_START' }
  | { type: 'REGISTER_CASE_COMPLETE' }
  | { type: 'REGISTER_CASE_ERROR'; payload: Error }
  | { type: 'DOWNLOAD_ZIP_START' }
  | { type: 'DOWNLOAD_ZIP_COMPLETE' }
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
    
    // Utilities
    copyToClipboard: (text: string, field: string) => Promise<void>;
    toggleTaqadiData: () => void;
    setIncludeCriminalComplaint: (value: boolean) => void;
    setIncludeViolationsTransfer: (value: boolean) => void;
    markCaseAsOpened: () => Promise<void>;
  };
}

// ==========================================
// Constants
// ==========================================

export const DAILY_LATE_FEE = 120; // ريال قطري لكل يوم تأخير
export const DAMAGES_FEE = 10000; // رسوم الأضرار
export const MAX_LATE_FEE_PER_INVOICE = 3000; // الحد الأقصى للغرامة

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
  criminalComplaint: {
    name: 'بلاغ سرقة المركبة',
    description: 'بلاغ جنائي للنيابة العامة',
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
