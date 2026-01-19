/**
 * Legal Cases Types
 * 
 * Type definitions for legal cases management system
 */

export type CaseType =
  | 'contract_dispute'    // نزاع عقد
  | 'payment_dispute'     // نزاع دفع
  | 'accident_claim'      // مطالبة حادث
  | 'insurance_claim'     // مطالبة تأمين
  | 'vehicle_damage'      // ضرر مركبة
  | 'theft'               // سرقة
  | 'traffic_violation'   // مخالفة مرورية
  | 'other';              // أخرى

export type CaseStatus =
  | 'open'          // مفتوحة
  | 'in_progress'   // قيد المعالجة
  | 'pending'       // معلقة
  | 'resolved'      // محلولة
  | 'closed'        // مغلقة
  | 'dismissed';    // مرفوضة

export type CasePriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export interface LegalCaseDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export interface LegalCase {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  
  // Case Type and Status
  case_type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  
  // Related Entities
  company_id: string;
  customer_id?: string;
  contract_id?: string;
  vehicle_id?: string;
  
  // Legal Details
  court_name?: string;
  court_case_number?: string;
  lawyer_name?: string;
  lawyer_contact?: string;
  
  // Financial Information
  claim_amount?: number;
  settlement_amount?: number;
  legal_fees?: number;
  
  // Important Dates
  incident_date?: string;
  filing_date?: string;
  hearing_date?: string;
  resolution_date?: string;
  
  // Documents and Notes
  documents?: LegalCaseDocument[];
  notes?: string;
  
  // Audit Fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relations (populated when queried)
  customer?: any;
  contract?: any;
  vehicle?: any;
}

export interface CreateLegalCaseInput {
  title: string;
  description?: string;
  case_type: CaseType;
  status?: CaseStatus;
  priority?: CasePriority;
  company_id: string;
  customer_id?: string;
  contract_id?: string;
  vehicle_id?: string;
  court_name?: string;
  court_case_number?: string;
  lawyer_name?: string;
  lawyer_contact?: string;
  claim_amount?: number;
  settlement_amount?: number;
  legal_fees?: number;
  incident_date?: string;
  filing_date?: string;
  hearing_date?: string;
  resolution_date?: string;
  notes?: string;
}

export interface UpdateLegalCaseInput extends Partial<CreateLegalCaseInput> {
  id: string;
}

export interface LegalCaseFilters {
  status?: CaseStatus | CaseStatus[];
  case_type?: CaseType | CaseType[];
  priority?: CasePriority | CasePriority[];
  customer_id?: string;
  contract_id?: string;
  vehicle_id?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

// Helper constants
export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  contract_dispute: 'نزاع عقد',
  payment_dispute: 'نزاع دفع',
  accident_claim: 'مطالبة حادث',
  insurance_claim: 'مطالبة تأمين',
  vehicle_damage: 'ضرر مركبة',
  theft: 'سرقة',
  traffic_violation: 'مخالفة مرورية',
  other: 'أخرى',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  pending: 'معلقة',
  resolved: 'محلولة',
  closed: 'مغلقة',
  dismissed: 'مرفوضة',
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

// Status colors for UI
export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-800',
  dismissed: 'bg-red-100 text-red-800',
};

// Priority colors for UI
export const CASE_PRIORITY_COLORS: Record<CasePriority, string> = {
  low: 'bg-slate-100 text-slate-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};
