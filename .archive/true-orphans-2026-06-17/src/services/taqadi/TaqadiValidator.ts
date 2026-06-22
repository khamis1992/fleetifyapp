/**
 * Taqadi Validation Service
 * Validates extracted data against Taqadi system requirements
 */

import {
  TaqadiSubmissionData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TAQADI_REQUIRED_FIELDS,
} from './TaqadiTypes';

// ==========================================
// Validation Rules
// ==========================================

interface ValidationRule {
  field: string;
  required: boolean;
  validate?: (value: any) => boolean;
  errorMessage?: string;
  category?: 'missing' | 'invalid' | 'incomplete';
}

/**
 * Validation rules for plaintiff data
 */
const PLAINTIFF_VALIDATION_RULES: ValidationRule[] = [
  // Only company name is strictly required - other fields are optional
  { field: 'plaintiff.companyName', required: true },
  { field: 'plaintiff.companyNameArabic', required: false },
  {
    field: 'plaintiff.commercialRegisterNumber',
    required: false,
    validate: (v: string) => !v || v.length >= 5,
    errorMessage: 'رقم السجل التجاري يجب أن يكون 5 أرقام على الأقل',
    category: 'incomplete',
  },
  { field: 'plaintiff.address', required: false, category: 'incomplete' },
  {
    field: 'plaintiff.phone',
    required: false,
    validate: (v: string) => !v || /^[+]?[0-9]{8,15}$/.test(v.replace(/\s/g, '')),
    errorMessage: 'رقم الهاتف غير صحيح',
    category: 'incomplete',
  },
  {
    field: 'plaintiff.email',
    required: false,
    validate: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    errorMessage: 'البريد الإلكتروني غير صحيح',
    category: 'incomplete',
  },
  {
    field: 'plaintiff.iban',
    required: false,
    validate: (v: string) => !v || (v.startsWith('QA') && v.length >= 29),
    errorMessage: 'رقم IBAN غير صحيح (يجب أن يبدأ بـ QA ويكون 29 حرف)',
    category: 'incomplete',
  },
  { field: 'plaintiff.representativeName', required: false, category: 'incomplete' },
  {
    field: 'plaintiff.representativeId',
    required: false,
    validate: (v: string) => !v || v.length >= 5,
    errorMessage: 'رقم الهوية يجب أن يكون 5 أرقام على الأقل',
    category: 'incomplete',
  },
  { field: 'plaintiff.representativePosition', required: false, category: 'incomplete' },
];

/**
 * Validation rules for defendant data
 */
const DEFENDANT_VALIDATION_RULES: ValidationRule[] = [
  // Defendant name is required for lawsuit
  { field: 'defendant.fullName', required: true },
  // Defendant type defaults to 'individual' so not strictly required
  { field: 'defendant.type', required: false },
  {
    field: 'defendant.idNumber',
    required: false,
    validate: (v: string) => !v || v.length >= 5,
    errorMessage: 'رقم الهوية يجب أن يكون 5 أرقام على الأقل',
    category: 'invalid',
  },
];

/**
 * Validation rules for case data
 */
const CASE_VALIDATION_RULES: ValidationRule[] = [
  // caseType is auto-set to 'rent', so not strictly required
  { field: 'case.caseType', required: false },
  {
    field: 'case.caseTitle',
    required: true,
    validate: (v: string) => v && v.length > 0 && v.length <= 50,
    errorMessage: 'عنوان الدعوى يجب أن يكون بين 1 و 50 حرف',
    category: 'invalid',
  },
  {
    field: 'case.facts',
    required: false, // Allow submission even without full facts
    validate: (v: string) => !v || v.length >= 50,
    errorMessage: 'الوقائع يجب أن تكون 50 حرف على الأقل',
    category: 'incomplete',
  },
  {
    field: 'case.claims',
    required: false, // Allow submission without complete claims
    validate: (v: string) => !v || v.length >= 30,
    errorMessage: 'الطلبات يجب أن تكون 30 حرف على الأقل',
    category: 'incomplete',
  },
];

/**
 * Validation rules for amounts
 * Note: amounts are nested inside case.amounts in the data structure
 */
const AMOUNT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'case.amounts.principalAmount',
    required: true,
    validate: (v: number) => v !== null && v !== undefined && v > 0,
    errorMessage: 'المبلغ الأساسي يجب أن يكون أكبر من صفر',
    category: 'invalid',
  },
  {
    field: 'case.amounts.totalAmount',
    required: true,
    validate: (v: number) => v !== null && v !== undefined && v > 0,
    errorMessage: 'المبلغ الإجمالي يجب أن يكون أكبر من صفر',
    category: 'invalid',
  },
  {
    field: 'case.amounts.amountInWords',
    required: true,
    validate: (v: string) => v && v.length > 10,
    errorMessage: 'المبلغ كتابةً غير مكتمل',
    category: 'incomplete',
  },
  { field: 'case.amounts.currency', required: true },
];

/**
 * Validation rules for documents
 */
const DOCUMENT_VALIDATION_RULES: ValidationRule[] = [
  // Documents are optional for initial submission - can be uploaded later
  {
    field: 'plaintiff.documents.commercialRegister',
    required: false,
    errorMessage: 'السجل التجاري مطلوب',
    category: 'incomplete',
  },
  {
    field: 'plaintiff.documents.ibanCertificate',
    required: false,
    errorMessage: 'شهادة IBAN مطلوبة',
    category: 'incomplete',
  },
  {
    field: 'plaintiff.documents.representativeId',
    required: false,
    errorMessage: 'صورة هوية الممثل مطلوبة',
    category: 'incomplete',
  },
];

// ==========================================
// Validation Service
// ==========================================

export class TaqadiValidator {
  /**
   * Validate complete submission data
   */
  validate(data: TaqadiSubmissionData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const requiredFields: Record<string, boolean> = {};

    // Validate plaintiff
    const plaintiffResult = this.validatePlaintiff(data);
    errors.push(...plaintiffResult.errors);
    warnings.push(...plaintiffResult.warnings);
    Object.assign(requiredFields, plaintiffResult.fields);

    // Validate defendant
    const defendantResult = this.validateDefendant(data);
    errors.push(...defendantResult.errors);
    warnings.push(...defendantResult.warnings);
    Object.assign(requiredFields, defendantResult.fields);

    // Validate case
    const caseResult = this.validateCase(data);
    errors.push(...caseResult.errors);
    warnings.push(...caseResult.warnings);
    Object.assign(requiredFields, caseResult.fields);

    // Validate amounts
    const amountsResult = this.validateAmounts(data);
    errors.push(...amountsResult.errors);
    warnings.push(...amountsResult.warnings);
    Object.assign(requiredFields, amountsResult.fields);

    // Validate documents
    const documentsResult = this.validateDocuments(data);
    errors.push(...documentsResult.errors);
    warnings.push(...documentsResult.warnings);
    Object.assign(requiredFields, documentsResult.fields);

    // Calculate completion score
    const score = this.calculateCompletionScore(requiredFields);

    // Determine if valid and can submit
    // Only block submission for critical errors (missing essential fields like case title, facts, claims)
    // Allow submission even with high severity errors (missing optional fields like address, IBAN)
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const isValid = criticalErrors.length === 0;
    const canSubmit = isValid; // Allow submission as long as no critical errors

    return {
      isValid,
      canSubmit,
      errors,
      warnings,
      score,
      requiredFields,
    };
  }

  /**
   * Validate plaintiff data
   */
  private validatePlaintiff(data: TaqadiSubmissionData): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fields: Record<string, boolean>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fields: Record<string, boolean> = {};

    for (const rule of PLAINTIFF_VALIDATION_RULES) {
      const value = this.getNestedValue(data, rule.field);
      const hasValue = this.hasValue(value);
      fields[rule.field] = hasValue;

      if (rule.required && !hasValue) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || `${TAQADI_REQUIRED_FIELDS[rule.field.split('.')[1] as keyof typeof TAQADI_REQUIRED_FIELDS] || rule.field} مطلوب`,
          severity: 'critical',
          category: rule.category || 'missing',
        });
      } else if (hasValue && rule.validate && !rule.validate(value)) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'قيمة غير صحيحة',
          severity: 'high',
          category: rule.category || 'invalid',
        });
      }
    }

    // Check for optional but recommended fields
    if (!data.plaintiff.establishmentNumber) {
      warnings.push({
        field: 'plaintiff.establishmentNumber',
        message: 'رقم قيد المنشأة غير موجود (مستحسن)',
        suggestion: 'رفع قيد المنشأة يسهل إجراءات التقاضي',
      });
    }

    return { errors, warnings, fields };
  }

  /**
   * Validate defendant data
   */
  private validateDefendant(data: TaqadiSubmissionData): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fields: Record<string, boolean>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fields: Record<string, boolean> = {};

    for (const rule of DEFENDANT_VALIDATION_RULES) {
      const value = this.getNestedValue(data, rule.field);
      const hasValue = this.hasValue(value);
      fields[rule.field] = hasValue;

      if (rule.required && !hasValue) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'حقل مطلوب',
          severity: 'critical',
          category: rule.category || 'missing',
        });
      } else if (hasValue && rule.validate && !rule.validate(value)) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'قيمة غير صحيحة',
          severity: 'medium',
          category: rule.category || 'invalid',
        });
      }
    }

    // Check for recommended fields
    if (!data.defendant.idNumber) {
      warnings.push({
        field: 'defendant.idNumber',
        message: 'رقم الهوية غير موجود',
        suggestion: ' Existence of ID number helps in defendant identification',
      });
    }

    if (!data.defendant.address) {
      warnings.push({
        field: 'defendant.address',
        message: 'عنوان المدعى عليه غير موجود',
      });
    }

    if (!data.defendant.phone) {
      warnings.push({
        field: 'defendant.phone',
        message: 'هاتف المدعى عليه غير موجود',
      });
    }

    return { errors, warnings, fields };
  }

  /**
   * Validate case data
   */
  private validateCase(data: TaqadiSubmissionData): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fields: Record<string, boolean>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fields: Record<string, boolean> = {};

    for (const rule of CASE_VALIDATION_RULES) {
      const value = this.getNestedValue(data, rule.field);
      const hasValue = this.hasValue(value);
      fields[rule.field] = hasValue;

      if (rule.required && !hasValue) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'حقل مطلوب',
          severity: 'critical',
          category: rule.category || 'missing',
        });
      } else if (hasValue && rule.validate && !rule.validate(value)) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'قيمة غير صحيحة',
          severity: rule.category === 'incomplete' ? 'medium' : 'high',
          category: rule.category || 'invalid',
        });
      }
    }

    // Check case title length specifically
    if (data.case.caseTitle && data.case.caseTitle.length > 50) {
      errors.push({
        field: 'case.caseTitle',
        message: 'عنوان الدعوى طويل جداً (يجب أن يكون 50 حرف كحد أقصى)',
        severity: 'medium',
        category: 'invalid',
      });
    }

    return { errors, warnings, fields };
  }

  /**
   * Validate amounts
   */
  private validateAmounts(data: TaqadiSubmissionData): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fields: Record<string, boolean>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fields: Record<string, boolean> = {};

    for (const rule of AMOUNT_VALIDATION_RULES) {
      const value = this.getNestedValue(data, rule.field);
      const hasValue = this.hasValue(value);
      fields[rule.field] = hasValue;

      if (rule.required && !hasValue) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'حقل مطلوب',
          severity: 'critical',
          category: rule.category || 'missing',
        });
      } else if (hasValue && rule.validate && !rule.validate(value)) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'قيمة غير صحيحة',
          severity: 'high',
          category: rule.category || 'invalid',
        });
      }
    }

    // Check if amounts add up correctly
    if (data.case.amounts.principalAmount && data.case.amounts.totalAmount) {
      const calculated = data.case.amounts.principalAmount +
                        (data.case.amounts.lateFees || 0) +
                        (data.case.amounts.violationsFines || 0) +
                        (data.case.amounts.otherFees || 0);

      if (Math.abs(calculated - data.case.amounts.totalAmount) > 1) {
        warnings.push({
          field: 'amounts.totalAmount',
          message: 'الإجمالي لا يتطابق مع مجموع المبالغ',
          suggestion: `الإجمالي المدخل: ${data.case.amounts.totalAmount}, المجموع المحسوب: ${calculated}`,
        });
      }
    }

    return { errors, warnings, fields };
  }

  /**
   * Validate documents
   */
  private validateDocuments(data: TaqadiSubmissionData): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fields: Record<string, boolean>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fields: Record<string, boolean> = {};

    for (const rule of DOCUMENT_VALIDATION_RULES) {
      const value = this.getNestedValue(data, rule.field);
      const hasValue = this.hasValue(value);
      fields[rule.field] = hasValue;

      if (rule.required && !hasValue) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || 'مستند مطلوب',
          severity: 'critical',
          category: 'missing',
        });
      }
    }

    // Check for recommended documents
    if (!data.case.documents.explanatoryMemo) {
      warnings.push({
        field: 'documents.explanatoryMemo',
        message: 'المذكرة الشارحة غير موجودة',
        suggestion: 'المذكرة الشارحة تعرض القضية بشكل واضح للقاضي',
      });
    }

    if (!data.case.documents.claimsStatement) {
      warnings.push({
        field: 'documents.claimsStatement',
        message: 'كشف المطالبات غير موجود',
        suggestion: 'كشف المطالبات يوضح تفاصيل المبالغ المطالب بها',
      });
    }

    if (!data.defendant.documents?.contractCopy && !data.case.documents.contractCopy) {
      warnings.push({
        field: 'documents.contractCopy',
        message: 'صورة العقد غير موجودة',
        suggestion: 'صورة العقد إثبات للعلاقة التعاقدية',
      });
    }

    return { errors, warnings, fields };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if value has meaningful content
   */
  private hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  /**
   * Calculate completion score (0-100)
   */
  private calculateCompletionScore(fields: Record<string, boolean>): number {
    const totalFields = Object.keys(fields).length;
    if (totalFields === 0) return 0;

    const completedFields = Object.values(fields).filter(v => v).length;
    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(validation: ValidationResult): {
    title: string;
    description: string;
    color: string;
    icon: string;
  } {
    if (!validation.canSubmit) {
      return {
        title: 'بيانات ناقصة',
        description: 'يرجى إكمال جميع الحقول المطلوبة قبل المتابعة',
        color: 'red',
        icon: '⚠️',
      };
    }

    if (validation.score < 80) {
      return {
        title: 'بيانات غير مكتملة',
        description: 'يمكنك المتابعة، ولكن يُنصح بإكمال المزيد من البيانات',
        color: 'amber',
        icon: '⚡',
      };
    }

    if (validation.warnings.length > 0) {
      return {
        title: 'بيانات جاهزة',
        description: 'البيانات جاهزة للإرسال مع بعض ملاحظات التحسين',
        color: 'green',
        icon: '✓',
      };
    }

    return {
      title: 'بيانات كاملة',
      description: 'جميع البيانات مكتملة وجاهزة للإرسال',
      color: 'green',
      icon: '✓✓',
    };
  }
}

// Export singleton instance
export const taqadiValidator = new TaqadiValidator();
export default taqadiValidator;
