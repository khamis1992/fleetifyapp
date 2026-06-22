// Contract Amendment Types

export type AmendmentType = 
  | 'extend_duration'     // تمديد المدة
  | 'change_amount'       // تعديل المبلغ
  | 'change_terms'        // تعديل الشروط
  | 'change_vehicle'      // تغيير المركبة
  | 'change_dates'        // تعديل التواريخ
  | 'change_payment'      // تعديل الدفعات
  | 'other';              // أخرى

export type AmendmentStatus =
  | 'pending'             // قيد الانتظار
  | 'approved'            // معتمد
  | 'rejected'            // مرفوض
  | 'cancelled';          // ملغي

export type ChangeImpact = 'low' | 'medium' | 'high' | 'critical';

export interface ContractAmendment {
  id: string;
  company_id: string;
  contract_id: string;
  amendment_number: string;
  amendment_type: AmendmentType;
  amendment_reason: string;
  
  // Values
  original_values: Record<string, any>;
  new_values: Record<string, any>;
  changes_summary?: Record<string, any>;
  
  // Financial
  amount_difference: number;
  requires_payment_adjustment: boolean;
  
  // Status
  status: AmendmentStatus;
  
  // Creator
  created_by?: string;
  
  // Approval
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  
  // Rejection
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  
  // Signatures
  requires_customer_signature: boolean;
  customer_signed: boolean;
  customer_signature_data?: string | null;
  customer_signed_at?: string | null;
  company_signature_data?: string | null;
  company_signed_at?: string | null;
  
  // Effective date
  effective_date?: string | null;
  applied_at?: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface AmendmentChangeLog {
  id: string;
  amendment_id: string;
  field_name: string;
  field_label_ar?: string;
  old_value?: string;
  new_value?: string;
  value_type?: string;
  change_impact?: ChangeImpact;
  created_at: string;
}

export interface AmendmentWithChanges extends ContractAmendment {
  change_logs: AmendmentChangeLog[];
}

export interface CreateAmendmentData {
  contract_id: string;
  amendment_type: AmendmentType;
  amendment_reason: string;
  original_values: Record<string, any>;
  new_values: Record<string, any>;
  requires_customer_signature?: boolean;
  effective_date?: string;
}

export interface AmendmentFormData {
  amendment_type: AmendmentType;
  amendment_reason: string;
  
  // Contract changes
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
  monthly_amount?: number;
  description?: string;
  terms?: string;
  vehicle_id?: string;
  contract_type?: string;
  
  // Settings
  requires_customer_signature: boolean;
  effective_date?: string;
  approval_notes?: string;
}

export interface AmendmentApprovalData {
  amendment_id: string;
  action: 'approve' | 'reject';
  notes?: string;
  rejection_reason?: string;
}

export interface AmendmentSignatureData {
  amendment_id: string;
  signature_type: 'customer' | 'company';
  signature_data: string;
}
