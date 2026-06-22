/**
 * Taqadi Integration Types
 * Data models for mapping Fleetify data to Taqadi system requirements
 */

// ==========================================
// Taqadi Field Types
// ==========================================

/**
 * Litigation types in Taqadi system
 */
export enum TaqadiCaseType {
  COMMERCIAL = 'commercial', // دعوى تجارية
  RENT = 'rent', // دعاوى إيجار
  COMPENSATION = 'compensation', // دعاوى تعويض
  EVICTION = 'eviction', // دعاوى إخلاء
}

/**
 * Document types for Taqadi uploads
 */
export enum TaqadiDocumentType {
  COMMERCIAL_REGISTER = 'commercial_register', // السجل التجاري
  ESTABLISHMENT_RECORD = 'establishment_record', // قيد المنشأة
  IBAN_CERTIFICATE = 'iban_certificate', // شهادة IBAN
  REPRESENTATIVE_ID = 'representative_id', // بطاقة الممثل
  AUTHORIZATION_LETTER = 'authorization_letter', // خطاب التفويض
  EXPLANATORY_MEMO = 'explanatory_memo', // المذكرة الشارحة
  CONTRACT_COPY = 'contract_copy', // صورة العقد
  DOCUMENTS_LIST = 'documents_list', // كشف المستندات
  CLAIMS_STATEMENT = 'claims_statement', // كشف المطالبات
  INVOICE_COPY = 'invoice_copy', // صورة الفاتورة
  VIOLATION_NOTICE = 'violation_notice', // إشعار مخالفة
}

/**
 * Document file metadata
 */
export interface TaqadiDocument {
  type: TaqadiDocumentType;
  name: string;
  url: string;
  size?: number;
  uploaded: boolean;
  required: boolean;
}

// ==========================================
// Plaintiff (المدعي) Data
// ==========================================

/**
 * Plaintiff company information
 */
export interface TaqadiPlaintiff {
  // معلومات الشركة
  companyName: string; // اسم الشركة
  companyNameArabic: string; // الاسم بالعربية
  commercialRegisterNumber: string; // رقم السجل التجاري
  establishmentNumber?: string; // رقم قيد المنشأة

  // معلومات الاتصال
  address: string; // العنوان
  phone: string; // الهاتف
  email: string; // البريد الإلكتروني

  // معلومات الحساب البنكي
  bankName?: string; // اسم البنك
  iban: string; // رقم IBAN

  // معلومات الممثل القانوني
  representativeName: string; // اسم الممثل القانوني
  representativeId: string; // رقم هوية الممثل
  representativePosition: string; // منصب الممثل
  representativePhone?: string; // هاتف الممثل

  // المستندات المطلوبة
  documents: {
    commercialRegister?: string; // رابط السجل التجاري
    establishmentRecord?: string; // رابط قيد المنشأة
    ibanCertificate?: string; // رابط شهادة IBAN
    representativeId?: string; // رابط صورة البطاقة
    authorizationLetter?: string; // رابط خطاب التفويض
  };
}

// ==========================================
// Defendant (المدعى عليه) Data
// ==========================================

/**
 * Defendant information
 */
export interface TaqadiDefendant {
  // النوع
  type: 'natural_person' | 'legal_entity'; // شخص طبيعي أو اعتباري

  // معلومات أساسية (شخص طبيعي)
  firstName?: string; // الاسم الأول
  lastName?: string; // الاسم الأخير
  fullName: string; // الاسم الكامل

  // معلومات الهوية
  idNumber?: string; // رقم الهوية / البطاقة الشخصية
  idType?: 'qatar_id' | 'passport' | 'commercial_register'; // نوع الهوية
  idExpiryDate?: string; // تاريخ انتهاء الهوية

  // معلومات الاتصال
  address?: string; // العنوان
  phone?: string; // الهاتف
  email?: string; // البريد الإلكتروني

  // معلومات العقد (لعقود الإيجار)
  contractNumber?: string; // رقم العقد
  contractStartDate?: string; // تاريخ بدء العقد
  contractEndDate?: string; // تاريخ انتهاء العقد

  // معلومات السيارة (لعقود تأجير سيارات)
  vehicle?: {
    make: string; // الماركة
    model: string; // الموديل
    year: number; // السنة
    plateNumber: string; // رقم اللوحة
    color?: string; // اللون
    vin?: string; // رقم الشاسيه
  };

  // المستندات
  documents?: {
    idCopy?: string; // صورة الهوية
    contractCopy?: string; // صورة العقد
  };
}

// ==========================================
// Case Details (بيانات الدعوى)
// ==========================================

/**
 * Main lawsuit case information
 */
export interface TaqadiCaseDetails {
  // معلومات أساسية
  caseType: TaqadiCaseType; // نوع الدعوى
  caseTitle: string; // عنوان الدعوى (حد أقصى 50 حرف)
  caseReference?: string; // رقم مرجع الدعوى (بعد التسجيل)

  // نصوص الدعوى
  facts: string; // الوقائع
  claims: string; // الطلبات

  // المبالغ المالية
  amounts: {
    principalAmount: number; // المبلغ الأساسي
    lateFees?: number; // غرامات التأخير
    violationsFines?: number; // غرامات المخالفات
    otherFees?: number; // رسوم أخرى
    totalAmount: number; // الإجمالي
    amountInWords: string; // المبلغ كتابةً بالعربية
    currency: string; // العملة (QAR)
  };

  // التواريخ
  dates: {
    incidentDate?: string; // تاريخ الواقعة / بداية المداينة
    claimDate: string; // تاريخ رفع الدعوى
    lastPaymentDate?: string; // تاريخ آخر دفعة
  };

  // التفاصيل الإضافية
  notes?: string; // ملاحظات إضافية
  urgency?: 'normal' | 'urgent' | 'expedited'; // مستوى الاستعجال

  // المستندات المرفقة
  documents: {
    explanatoryMemo?: string; // المذكرة الشارحة
    documentsList?: string; // كشف المستندات
    claimsStatement?: string; // كشف المطالبات
    invoices?: string[]; // روابط الفواتير
    violations?: string[]; // روابط المخالفات
  };
}

// ==========================================
// Complete Taqadi Submission Data
// ==========================================

/**
 * Complete data package for Taqadi submission
 * This is the main interface that contains all required data
 */
export interface TaqadiSubmissionData {
  // Metadata
  metadata: {
    contractId: string; // Fleetify contract ID
    extractedAt: string; // ISO timestamp
    extractedBy?: string; // User who extracted the data
    version: string; // Data format version
  };

  // المدعي (Plaintiff)
  plaintiff: TaqadiPlaintiff;

  // المدعى عليه (Defendant)
  defendant: TaqadiDefendant;

  // بيانات الدعوى (Case Details)
  case: TaqadiCaseDetails;

  // Validation results
  validation?: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    missingRequiredFields: string[];
  };

  // Submission tracking
  submission?: {
    status: 'draft' | 'ready' | 'submitted' | 'registered' | 'failed';
    submittedAt?: string;
    taqadiCaseNumber?: string;
    taqadiReferenceNumber?: string;
    errorMessage?: string;
  };
}

// ==========================================
// Validation Types
// ==========================================

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  category: 'missing' | 'invalid' | 'incomplete';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  canSubmit: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 completion score
  requiredFields: Record<string, boolean>; // Field -> status map
}

// ==========================================
// Field Definitions for Validation
// ==========================================

/**
 * Required fields for Taqadi submission
 */
export const TAQADI_REQUIRED_FIELDS = {
  plaintiff: {
    companyName: 'اسم الشركة',
    commercialRegisterNumber: 'رقم السجل التجاري',
    address: 'العنوان',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    iban: 'رقم IBAN',
    representativeName: 'اسم الممثل القانوني',
    representativeId: 'رقم هوية الممثل',
    representativePosition: 'منصب الممثل',
  },
  defendant: {
    fullName: 'الاسم الكامل',
    type: 'نوع المدعى عليه',
  },
  case: {
    caseType: 'نوع الدعوى',
    caseTitle: 'عنوان الدعوى',
    facts: 'الوقائع',
    claims: 'الطلبات',
  },
  amounts: {
    principalAmount: 'المبلغ الأساسي',
    totalAmount: 'المبلغ الإجمالي',
    amountInWords: 'المبلغ كتابةً',
    currency: 'العملة',
  },
  documents: {
    commercialRegister: 'السجل التجاري',
    ibanCertificate: 'شهادة IBAN',
    representativeId: 'صورة الهوية',
  },
} as const;

/**
 * Optional but recommended fields
 */
export const TAQADI_RECOMMENDED_FIELDS = {
  plaintiff: {
    establishmentNumber: 'رقم قيد المنشأة',
    bankName: 'اسم البنك',
  },
  defendant: {
    idNumber: 'رقم الهوية',
    address: 'العنوان',
    phone: 'الهاتف',
  },
  case: {
    incidentDate: 'تاريخ الواقعة',
    notes: 'ملاحظات',
  },
  documents: {
    explanatoryMemo: 'المذكرة الشارحة',
    documentsList: 'كشف المستندات',
    claimsStatement: 'كشف المطالبات',
    contractCopy: 'صورة العقد',
  },
} as const;

// ==========================================
// Field Mappings (Fleetify -> Taqadi)
// ==========================================

/**
 * Mapping configuration from Fleetify database fields to Taqadi fields
 */
export interface FieldMapping {
  source: string; // Fleetify field path
  target: string; // Taqadi field path
  transform?: (value: any) => any; // Optional transformation function
  required: boolean;
}

/**
 * Mapping configuration
 */
export const FLEETIFY_TO_TAQADI_MAPPING: Record<string, FieldMapping[]> = {
  plaintiff: [
    { source: 'company.name', target: 'companyName', required: true },
    { source: 'company.commercial_register', target: 'commercialRegisterNumber', required: true },
    { source: 'company.address', target: 'address', required: true },
    { source: 'company.phone', target: 'phone', required: true },
    { source: 'company.email', target: 'email', required: true },
    { source: 'company.iban', target: 'iban', required: true },
    { source: 'company.representative_name', target: 'representativeName', required: true },
    { source: 'company.representative_id', target: 'representativeId', required: true },
    { source: 'company.representative_position', target: 'representativePosition', required: true },
  ],
  defendant: [
    { source: 'customer.first_name', target: 'firstName', required: false },
    { source: 'customer.last_name', target: 'lastName', required: false },
    { source: 'customer.full_name', target: 'fullName', required: true },
    { source: 'customer.national_id', target: 'idNumber', required: false },
    { source: 'customer.phone', target: 'phone', required: false },
    { source: 'customer.email', target: 'email', required: false },
    { source: 'contract.contract_number', target: 'contractNumber', required: false },
    { source: 'contract.start_date', target: 'contractStartDate', required: false },
    { source: 'contract.end_date', target: 'contractEndDate', required: false },
    { source: 'vehicle.make', target: 'vehicle.make', required: false },
    { source: 'vehicle.model', target: 'vehicle.model', required: false },
    { source: 'vehicle.year', target: 'vehicle.year', required: false },
    { source: 'vehicle.plate_number', target: 'vehicle.plateNumber', required: false },
  ],
};
