/**
 * نظام التحقق والتحذيرات للمدفوعات المربوطة بالعقود
 * يوفر مجموعة شاملة من عمليات التحقق والتحذيرات لضمان دقة ربط المدفوعات بالعقود
 */

import { parseNumber } from './numberFormatter';

// أنواع البيانات
export interface PaymentData {
  id?: string;
  amount: number;
  payment_date: string;
  due_date?: string;
  original_due_date?: string;
  late_fine_amount?: number;
  late_fine_days_overdue?: number;
  agreement_number?: string;
  contract_number?: string;
  customer_id?: string;
  reconciliation_status?: string;
  description?: string;
  description_type?: string;
  type?: string;
  payment_status?: string;
}

export interface ContractData {
  id: string;
  contract_number: string;
  contract_amount: number;
  balance_due: number;
  payment_status: string;
  days_overdue?: number;
  late_fine_amount?: number;
  total_paid?: number;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  confidence?: number;
}

export interface LinkingAttempt {
  payment_id?: string;
  attempted_identifiers: {
    agreement_number?: string;
    contract_number?: string;
    customer_id?: string;
  };
  matching_contracts: ContractData[];
  selected_contract?: ContractData;
  confidence: number;
  method: 'agreement_number' | 'contract_number' | 'customer_match' | 'manual';
}

/**
 * التحقق الأساسي من صحة بيانات الدفعة
 */
export const validatePaymentData = (payment: PaymentData): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];

  // التحقق من المبلغ
  if (!payment.amount || payment.amount <= 0) {
    errors.push('مبلغ الدفعة يجب أن يكون أكبر من صفر');
  }

  // التحقق من تاريخ الدفع
  if (!payment.payment_date) {
    errors.push('تاريخ الدفع مطلوب');
  } else {
    const paymentDate = new Date(payment.payment_date);
    const today = new Date();
    
    if (paymentDate > today) {
      warnings.push('تاريخ الدفع في المستقبل - يرجى التأكد من صحة التاريخ');
    }
    
    // تحذير للتواريخ القديمة جداً (أكثر من سنة)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (paymentDate < oneYearAgo) {
      warnings.push('تاريخ الدفع قديم جداً (أكثر من سنة) - يرجى التأكد من صحة التاريخ');
    }
  }

  // التحقق من تواريخ الاستحقاق
  if (payment.due_date && payment.original_due_date) {
    const dueDate = new Date(payment.due_date);
    const originalDueDate = new Date(payment.original_due_date);
    
    if (dueDate < originalDueDate) {
      warnings.push('تاريخ الاستحقاق الحالي أقدم من التاريخ الأصلي');
    }
  }

  // التحقق من أيام التأخير والغرامات
  if (payment.late_fine_days_overdue && payment.late_fine_days_overdue > 0) {
    if (!payment.late_fine_amount || payment.late_fine_amount <= 0) {
      warnings.push('يوجد أيام تأخير ولكن لا توجد غرامة محددة');
      suggestions.push('يرجى تحديد مبلغ الغرامة أو تصفير أيام التأخير');
    }
  }

  // التحقق من معرفات العقد
  if (!payment.agreement_number && !payment.contract_number) {
    warnings.push('لا يوجد رقم عقد أو اتفاقية - سيكون من الصعب ربط الدفعة بعقد محدد');
    suggestions.push('يرجى إضافة رقم العقد أو الاتفاقية لضمان الربط الصحيح');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    suggestions
  };
};

/**
 * التحقق من توافق الدفعة مع العقد
 */
export const validatePaymentContractMatch = (
  payment: PaymentData,
  contract: ContractData
): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];

  // التحقق من حالة العقد
  if (contract.status === 'cancelled' || contract.status === 'terminated') {
    errors.push(`لا يمكن إضافة مدفوعات لعقد ${contract.status === 'cancelled' ? 'ملغي' : 'منتهي'}`);
  }

  // التحقق من المبالغ
  if (payment.amount > contract.balance_due && contract.balance_due > 0) {
    warnings.push(`المبلغ المدفوع (${payment.amount}) أكبر من الرصيد المستحق (${contract.balance_due})`);
    suggestions.push('يرجى التحقق من صحة المبلغ أو تحديث رصيد العقد');
  }

  if (contract.payment_status === 'paid') {
    warnings.push('العقد مسدد بالكامل بالفعل');
    suggestions.push('يرجى التحقق من ضرورة هذه الدفعة أو إنشاء عقد جديد');
  }

  // التحقق من تطابق العميل
  if (payment.customer_id && contract.customer_id && payment.customer_id !== contract.customer_id) {
    errors.push('عميل الدفعة لا يتطابق مع عميل العقد');
  }

  // التحقق من التواريخ
  if (payment.payment_date && contract.end_date) {
    const paymentDate = new Date(payment.payment_date);
    const contractEndDate = new Date(contract.end_date);
    
    if (paymentDate > contractEndDate) {
      warnings.push('تاريخ الدفعة بعد انتهاء العقد');
      suggestions.push('يرجى التحقق من تواريخ العقد أو الدفعة');
    }
  }

  // التحقق من أيام التأخير
  if (payment.late_fine_days_overdue !== undefined && contract.days_overdue !== undefined) {
    if (Math.abs(payment.late_fine_days_overdue - contract.days_overdue) > 5) {
      warnings.push(`تضارب في أيام التأخير: البيانات (${payment.late_fine_days_overdue}) vs العقد (${contract.days_overdue})`);
      suggestions.push('يرجى مراجعة حساب أيام التأخير');
    }
  }

  // التحقق من الغرامات
  if (payment.late_fine_amount && contract.late_fine_amount) {
    if (Math.abs(payment.late_fine_amount - contract.late_fine_amount) > 0.01) {
      warnings.push(`تضارب في مبلغ الغرامة: البيانات (${payment.late_fine_amount}) vs العقد (${contract.late_fine_amount})`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    suggestions
  };
};

/**
 * تقييم جودة ربط الدفعة بالعقد
 */
export const assessLinkingQuality = (
  payment: PaymentData,
  contract: ContractData,
  matchMethod: string
): ValidationResult & { confidence: number } => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.5; // البداية بثقة متوسطة

  // تقييم طريقة الربط
  switch (matchMethod) {
    case 'agreement_number':
      if (payment.agreement_number === contract.contract_number) {
        confidence = 1.0; // تطابق تام
      } else if (contract.contract_number?.includes(payment.agreement_number || '')) {
        confidence = 0.8; // تطابق جزئي
        warnings.push('تطابق جزئي برقم الاتفاقية');
      }
      break;
      
    case 'contract_number':
      confidence = 0.95; // ثقة عالية للتطابق برقم العقد
      break;
      
    case 'customer_match':
      confidence = 0.6; // ثقة متوسطة للتطابق بالعميل فقط
      warnings.push('الربط بناءً على العميل فقط - يرجى التأكد من صحة العقد');
      break;
      
    case 'manual':
      confidence = 0.9; // ثقة عالية للربط اليدوي
      break;
      
    default:
      confidence = 0.3; // ثقة منخفضة للطرق غير المعروفة
      warnings.push('طريقة ربط غير معروفة');
  }

  // تعديل الثقة بناءً على التطابقات الإضافية
  if (payment.customer_id === contract.customer_id) {
    confidence += 0.1; // زيادة الثقة لتطابق العميل
  }

  if (payment.amount <= contract.balance_due) {
    confidence += 0.05; // زيادة الثقة للمبالغ المنطقية
  } else {
    confidence -= 0.1; // تقليل الثقة للمبالغ غير المنطقية
  }

  // التأكد من أن الثقة في النطاق الصحيح
  confidence = Math.max(0, Math.min(1, confidence));

  // إضافة تحذيرات بناءً على مستوى الثقة
  if (confidence < 0.5) {
    warnings.push('مستوى ثقة منخفض في الربط - يرجى المراجعة اليدوية');
    suggestions.push('يرجى التحقق من صحة البيانات وإعادة المحاولة');
  } else if (confidence < 0.8) {
    warnings.push('مستوى ثقة متوسط في الربط - يُنصح بالمراجعة');
  }

  return {
    isValid: confidence >= 0.5,
    warnings,
    errors,
    suggestions,
    confidence: Math.round(confidence * 100) / 100 // تقريب لرقمين عشريين
  };
};

/**
 * إنشاء تقرير شامل للتحقق من الربط
 */
export const generateLinkingReport = (
  payment: PaymentData,
  contract: ContractData,
  linkingAttempt: LinkingAttempt
): {
  paymentValidation: ValidationResult;
  contractMatch: ValidationResult;
  linkingQuality: ValidationResult & { confidence: number };
  overallAssessment: {
    canProceed: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  };
} => {
  const paymentValidation = validatePaymentData(payment);
  const contractMatch = validatePaymentContractMatch(payment, contract);
  const linkingQuality = assessLinkingQuality(payment, contract, linkingAttempt.method);

  // تقييم المخاطر الإجمالي
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let recommendation = 'يمكن المتابعة بأمان';
  let canProceed = true;

  // تحديد مستوى المخاطر
  const totalErrors = paymentValidation.errors.length + contractMatch.errors.length + linkingQuality.errors.length;
  const totalWarnings = paymentValidation.warnings.length + contractMatch.warnings.length + linkingQuality.warnings.length;

  if (totalErrors > 0) {
    riskLevel = 'critical';
    recommendation = 'يجب إصلاح الأخطاء قبل المتابعة';
    canProceed = false;
  } else if (linkingQuality.confidence < 0.5) {
    riskLevel = 'high';
    recommendation = 'مستوى ثقة منخفض - يُنصح بالمراجعة اليدوية';
    canProceed = false;
  } else if (totalWarnings > 3 || linkingQuality.confidence < 0.7) {
    riskLevel = 'medium';
    recommendation = 'يُنصح بالمراجعة قبل المتابعة';
  } else if (totalWarnings > 0) {
    riskLevel = 'low';
    recommendation = 'يمكن المتابعة مع مراعاة التحذيرات';
  }

  return {
    paymentValidation,
    contractMatch,
    linkingQuality,
    overallAssessment: {
      canProceed,
      riskLevel,
      recommendation
    }
  };
};

/**
 * اقتراح تصحيحات للبيانات
 */
export const suggestCorrections = (
  payment: PaymentData,
  contract?: ContractData
): {
  field: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
}[] => {
  const suggestions: {
    field: string;
    currentValue: any;
    suggestedValue: any;
    reason: string;
  }[] = [];

  // اقتراحات للدفعة
  if (payment.amount && contract?.balance_due && payment.amount > contract.balance_due) {
    suggestions.push({
      field: 'amount',
      currentValue: payment.amount,
      suggestedValue: contract.balance_due,
      reason: 'المبلغ أكبر من الرصيد المستحق'
    });
  }

  // اقتراحات للغرامات
  if (payment.late_fine_days_overdue && payment.late_fine_days_overdue > 0 && (!payment.late_fine_amount || payment.late_fine_amount <= 0)) {
    const suggestedFine = payment.late_fine_days_overdue * 5; // افتراض 5 وحدات لكل يوم تأخير
    suggestions.push({
      field: 'late_fine_amount',
      currentValue: payment.late_fine_amount || 0,
      suggestedValue: suggestedFine,
      reason: 'حساب الغرامة بناءً على أيام التأخير'
    });
  }

  // اقتراحات لحالة التسوية
  if (!payment.reconciliation_status || payment.reconciliation_status === 'pending') {
    suggestions.push({
      field: 'reconciliation_status',
      currentValue: payment.reconciliation_status || 'pending',
      suggestedValue: 'completed',
      reason: 'تحديث حالة التسوية للدفعة المكتملة'
    });
  }

  return suggestions;
};

/**
 * تصدير جميع الدوال كوحدة واحدة
 */
export const PaymentContractValidator = {
  validatePaymentData,
  validatePaymentContractMatch,
  assessLinkingQuality,
  generateLinkingReport,
  suggestCorrections
};

export default PaymentContractValidator;
