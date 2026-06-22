/**
 * Legal Document Generator Types
 * Types for the official document generator system
 */

// ============================================================================
// Enums
// ============================================================================

export type DocumentCategory = 'insurance' | 'traffic' | 'general' | 'customer';

export type DocumentStatus = 'draft' | 'generated' | 'approved' | 'rejected' | 'sent';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type FileType = 'pdf' | 'docx' | 'html' | 'txt';

export type VariableType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'vehicle' | 'customer' | 'contract';

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateVariable {
  name: string;
  label: string;
  label_en?: string;
  type: VariableType;
  required: boolean;
  placeholder?: string;
  placeholder_en?: string;
  options?: string[];
  validation?: ValidationRule[];
  defaultValue?: any;
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'required';
  value?: any;
  message: string;
  message_en?: string;
}

export interface DocumentTemplate {
  id: string;
  template_key: string;
  name_ar: string;
  name_en: string | null;
  category: DocumentCategory;
  description_ar: string | null;
  description_en: string | null;
  subject_template: string | null;
  body_template: string;
  footer_template: string | null;
  variables: TemplateVariable[];
  is_active: boolean;
  requires_approval: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Generation Types
// ============================================================================

export interface DocumentGeneration {
  id: string;
  template_id: string | null;
  company_id: string;
  document_type: string;
  document_number: string | null;
  subject: string | null;
  body: string;
  variables_data: Record<string, any>;
  status: DocumentStatus;
  approval_status: ApprovalStatus;
  recipient_name: string | null;
  recipient_entity: string | null;
  recipient_address: string | null;
  related_vehicle_id: string | null;
  related_contract_id: string | null;
  related_customer_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: FileType | null;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentGenerationView extends DocumentGeneration {
  template_name_ar: string | null;
  template_name_en: string | null;
  category: DocumentCategory | null;
  company_name_ar: string | null;
  company_name_en: string | null;
  generated_by_name: string | null;
  approved_by_name: string | null;
  plate_number: string | null;
  customer_name_ar: string | null;
}

// ============================================================================
// Wizard State Types
// ============================================================================

export interface WizardState {
  currentStep: number;
  selectedCategory: DocumentCategory | null;
  selectedTemplate: DocumentTemplate | null;
  formData: Record<string, any>;
  generatedDocument: GeneratedDocument | null;
  isGenerating: boolean;
  error: string | null;
}

export interface GeneratedDocument {
  subject: string;
  body: string;
  documentNumber?: string;
  previewHtml: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormFieldConfig {
  variable: TemplateVariable;
  value: any;
  error: string | null;
  touched: boolean;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'txt';
  includeHeader: boolean;
  includeFooter: boolean;
  includeSignature: boolean;
  orientation?: 'portrait' | 'landscape';
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

// ============================================================================
// Category Info Types
// ============================================================================

export interface CategoryInfo {
  id: DocumentCategory;
  name_ar: string;
  name_en: string;
  icon: string;
  description_ar: string;
  description_en: string;
  color: string;
}

export const CATEGORY_INFO: Record<DocumentCategory, CategoryInfo> = {
  insurance: {
    id: 'insurance',
    name_ar: 'التأمين',
    name_en: 'Insurance',
    icon: '🏢',
    description_ar: 'كتب شركات التأمين مثل طلب الشطب والإخطار بالحوادث',
    description_en: 'Insurance company letters such as deregistration and accident notifications',
    color: 'bg-blue-500',
  },
  traffic: {
    id: 'traffic',
    name_ar: 'المرور',
    name_en: 'Traffic Department',
    icon: '🚗',
    description_ar: 'كتب إدارة المرور مثل نقل الملكية وتجديد الرخص',
    description_en: 'Traffic department letters such as ownership transfer and license renewal',
    color: 'bg-green-500',
  },
  general: {
    id: 'general',
    name_ar: 'رسمي عام',
    name_en: 'General Official',
    icon: '📋',
    description_ar: 'كتب رسمية عامة للجهات الحكومية والخاصة',
    description_en: 'General official letters for government and private entities',
    color: 'bg-purple-500',
  },
  customer: {
    id: 'customer',
    name_ar: 'العملاء',
    name_en: 'Customers',
    icon: '👤',
    description_ar: 'كتب العملاء مثل الإنذارات والإشعارات',
    description_en: 'Customer letters such as warnings and notifications',
    color: 'bg-orange-500',
  },
};

// ============================================================================
// Template Engine Types
// ============================================================================

export interface TemplateRenderContext {
  template: DocumentTemplate;
  data: Record<string, any>;
  company?: {
    name_ar: string;
    name_en: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  user?: {
    name_ar: string;
    name_en: string;
    title?: string;
  };
  currentDate?: Date;
}

export interface TemplateRenderResult {
  subject: string;
  body: string;
  html: string;
  errors: string[];
}

// ============================================================================
// Helper Types
// ============================================================================

export type VariableValue = string | number | Date | boolean | null;

export interface DocumentListItem {
  id: string;
  document_number: string | null;
  document_type: string;
  template_name: string;
  status: DocumentStatus;
  created_at: string;
  recipient_name: string | null;
}

export interface DocumentHistoryFilters {
  category?: DocumentCategory;
  status?: DocumentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface TemplatesResponse {
  templates: DocumentTemplate[];
  count: number;
}

export interface GenerationsResponse {
  generations: DocumentGenerationView[];
  count: number;
  page: number;
  pageSize: number;
}

export interface GenerateResponse {
  generation: DocumentGeneration;
  document: GeneratedDocument;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}
