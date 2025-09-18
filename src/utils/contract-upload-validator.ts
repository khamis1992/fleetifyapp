// نظام التحقق المحسن من بيانات العقود

// Interface للبيانات المؤقتة للعقود قبل المعالجة
export interface TempContractData {
  customer_name?: string;
  customer_identifier?: string;
  customer_phone?: string;
  customer_id?: string;
  contract_amount?: number;
  monthly_amount?: number;
  start_date?: string;
  end_date?: string;
  contract_type?: string;
  vehicle_id?: string;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export const validateContractData = (
  contractData: TempContractData,
  rowIndex: number
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // التحقق من البيانات الأساسية
  if (!contractData.customer_name && !contractData.customer_identifier && !contractData.customer_phone) {
    errors.push(`السطر ${rowIndex + 1}: يجب توفير اسم العميل أو معرفه أو رقم الهاتف على الأقل`);
    suggestions.push('تأكد من وجود بيانات العميل في الملف');
  }

  // التحقق من معرف العميل إذا كان موجوداً
  if (contractData.customer_identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(contractData.customer_identifier)) {
      warnings.push(`السطر ${rowIndex + 1}: معرف العميل ليس UUID صحيح، سيتم استخدامه كرقم هوية`);
      suggestions.push('استخدم UUID صحيح أو رقم الهوية الوطنية');
    }
  }

  // التحقق من رقم الهاتف
  if (contractData.customer_phone) {
    const phoneRegex = /^(\+965|965)?[245679]\d{7}$/;
    if (!phoneRegex.test(contractData.customer_phone.replace(/\s|-/g, ''))) {
      warnings.push(`السطر ${rowIndex + 1}: تنسيق رقم الهاتف قد يكون غير صحيح`);
      suggestions.push('استخدم تنسيق رقم الهاتف الكويتي: +96512345678');
    }
  }

  // التحقق من المبالغ المالية
  if (contractData.contract_amount && contractData.contract_amount <= 0) {
    errors.push(`السطر ${rowIndex + 1}: مبلغ العقد يجب أن يكون أكبر من صفر`);
  }

  if (contractData.monthly_amount && contractData.monthly_amount <= 0) {
    errors.push(`السطر ${rowIndex + 1}: القسط الشهري يجب أن يكون أكبر من صفر`);
  }

  // التحقق من التواريخ
  if (!contractData.start_date || !contractData.end_date) {
    errors.push(`السطر ${rowIndex + 1}: تاريخ البداية والنهاية مطلوبان`);
    suggestions.push('تأكد من وجود تواريخ صحيحة في الملف');
  } else {
    const startDate = new Date(contractData.start_date);
    const endDate = new Date(contractData.end_date);
    
    // التحقق من صحة التواريخ
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errors.push(`السطر ${rowIndex + 1}: تنسيق التاريخ غير صحيح`);
      suggestions.push('استخدم تنسيق التاريخ: YYYY-MM-DD أو DD/MM/YYYY');
    } else if (startDate >= endDate) {
      errors.push(`السطر ${rowIndex + 1}: تاريخ بداية العقد يجب أن يكون قبل تاريخ النهاية`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
};

export const generateUserFriendlyMessage = (validation: ValidationResult): string => {
  let message = '';
  
  if (validation.errors.length > 0) {
    message += '❌ **أخطاء يجب إصلاحها:**\n';
    validation.errors.forEach(error => {
      message += `• ${error}\n`;
    });
    message += '\n';
  }
  
  if (validation.warnings.length > 0) {
    message += '⚠️ **تحذيرات:**\n';
    validation.warnings.forEach(warning => {
      message += `• ${warning}\n`;
    });
    message += '\n';
  }
  
  if (validation.suggestions.length > 0) {
    message += '💡 **اقتراحات للتحسين:**\n';
    validation.suggestions.forEach(suggestion => {
      message += `• ${suggestion}\n`;
    });
  }
  
  return message.trim();
};

export const validateBatchContracts = (
  contracts: TempContractData[]
): { totalErrors: number; totalWarnings: number; detailedResults: ValidationResult[] } => {
  let totalErrors = 0;
  let totalWarnings = 0;
  const detailedResults: ValidationResult[] = [];
  
  contracts.forEach((contract, index) => {
    const result = validateContractData(contract, index);
    detailedResults.push(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  });
  
  return {
    totalErrors,
    totalWarnings,
    detailedResults
  };
};