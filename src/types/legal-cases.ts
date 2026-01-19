// ============================================================================
// Legal Cases Types
// ============================================================================

export interface LegalDocumentTemplate {
  id: string;
  template_key: string;
  name_ar: string;
  name_en?: string;
  category: 'insurance' | 'traffic' | 'general' | 'customer';
  description_ar?: string;
  description_en?: string;
  subject_template?: string;
  body_template: string;
  footer_template?: string;
  variables: TemplateVariable[];
  is_active: boolean;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'vehicle' | 'customer' | 'company' | 'user';
  required: boolean;
  placeholder?: string;
  options?: string[];
  source?: 'customer' | 'vehicle' | 'contract' | 'company' | 'user';
  default?: string | number;
}

export interface LegalDocumentGeneration {
  id: string;
  template_id: string;
  company_id: string;
  document_type: string;
  document_number?: string;
  subject?: string;
  body: string;
  variables_data: Record<string, any>;
  status: 'draft' | 'generated' | 'approved' | 'rejected' | 'sent';
  approval_status: 'pending' | 'approved' | 'rejected';
  recipient_name?: string;
  recipient_entity?: string;
  recipient_address?: string;
  related_vehicle_id?: string;
  related_contract_id?: string;
  related_customer_id?: string;
  file_url?: string;
  file_name?: string;
  file_type?: 'pdf' | 'docx' | 'html' | 'txt';
  generated_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariableData {
  [key: string]: string | number | Date | undefined;
}

export interface MissingField {
  field: string;
  label: string;
  source: 'customer' | 'vehicle' | 'contract' | 'company';
  requiredFor: string[];
}

export interface LegalCaseOption {
  key: string;
  name_ar: string;
  name_en?: string;
  description_ar: string;
  description_en?: string;
  icon: string;
  template_key: string;
}

export const LEGAL_CASE_OPTIONS: LegalCaseOption[] = [
  {
    key: 'traffic_violation_transfer',
    name_ar: 'تحويل مخالفة مرورية',
    name_en: 'Transfer Traffic Violation',
    description_ar: 'إنشاء طلب تحويل المخالفات المرورية للنيابة',
    description_en: 'Create request to transfer traffic violations to prosecution',
    icon: 'FileText',
    template_key: 'traffic_violation_transfer_request',
  },
  {
    key: 'theft_report',
    name_ar: 'بلاغ سرقة',
    name_en: 'Theft Report',
    description_ar: 'إنشاء بلاغ سرقة مركبة',
    description_en: 'Create vehicle theft report',
    icon: 'AlertTriangle',
    template_key: 'theft_report',
  },
];
