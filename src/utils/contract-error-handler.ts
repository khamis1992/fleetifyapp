// معالج الأخطاء المحسن لنظام رفع العقود

export interface ContractError {
  type: 'validation' | 'database' | 'customer' | 'vehicle' | 'financial' | 'system';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  field?: string;
  rowNumber?: number;
}

export const generateErrorMessage = (error: any, context: string, rowNumber?: number): ContractError => {
  const baseContext = rowNumber ? `السطر ${rowNumber}` : context;
  
  // أخطاء UUID
  if (error.message?.includes('UUID') || error.message?.includes('invalid input syntax for type uuid')) {
    return {
      type: 'customer',
      severity: 'warning',
      message: `معرف العميل في ${baseContext} ليس UUID صحيح`,
      suggestion: 'استخدم رقم الهوية الوطنية أو اتركه فارغاً لإنشاء عميل جديد',
      field: 'customer_id',
      rowNumber
    };
  }
  
  // أخطاء التكرار
  if (error.message?.includes('duplicate') || error.message?.includes('unique constraint')) {
    return {
      type: 'database',
      severity: 'warning',
      message: `بيانات مكررة في ${baseContext}`,
      suggestion: 'سيتم ربط العقد بالبيانات الموجودة',
      rowNumber
    };
  }
  
  // أخطاء البيانات المطلوبة
  if (error.message?.includes('null value') || error.message?.includes('not-null constraint')) {
    const field = error.message.match(/column "(\w+)"/)?.[1] || 'غير محدد';
    return {
      type: 'validation',
      severity: 'error',
      message: `حقل مطلوب مفقود في ${baseContext}: ${field}`,
      suggestion: 'تأكد من وجود جميع البيانات المطلوبة في الملف',
      field,
      rowNumber
    };
  }
  
  // أخطاء عدم وجود عمود في المخطط
  if (error.message?.includes('Could not find') && error.message?.includes('column')) {
    const columnName = error.message.match(/'(\w+)'/)?.[1] || 'غير محدد';
    return {
      type: 'system',
      severity: 'error',
      message: `خطأ في النظام: العمود ${columnName} غير موجود في قاعدة البيانات`,
      suggestion: 'يرجى الاتصال بالدعم الفني لحل هذه المشكلة',
      field: columnName,
      rowNumber
    };
  }
  
  // أخطاء العميل المطلوب
  if (error.message?.includes('معرف العميل مطلوب') || 
      (typeof error === 'string' && error.includes('معرف العميل مطلوب'))) {
    return {
      type: 'customer',
      severity: 'error',
      message: `معرف العميل مطلوب`,
      suggestion: 'راجع البيانات وأعد المحاولة',
      field: 'customer_id',
      rowNumber
    };
  }
  
  // أخطاء التواريخ
  if (error.message?.includes('date') || error.message?.includes('timestamp')) {
    return {
      type: 'validation',
      severity: 'error',
      message: `تنسيق التاريخ غير صحيح في ${baseContext}`,
      suggestion: 'استخدم تنسيق التاريخ: YYYY-MM-DD',
      field: 'date',
      rowNumber
    };
  }
  
  // أخطاء الأرقام
  if (error.message?.includes('numeric') || error.message?.includes('integer')) {
    return {
      type: 'financial',
      severity: 'error',
      message: `قيمة رقمية غير صحيحة في ${baseContext}`,
      suggestion: 'تأكد من أن المبالغ والأرقام صحيحة',
      field: 'amount',
      rowNumber
    };
  }
  
  // أخطاء الصلاحيات
  if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
    return {
      type: 'system',
      severity: 'error',
      message: `عدم وجود صلاحية في ${baseContext}`,
      suggestion: 'تأكد من وجود صلاحيات كافية لإنشاء العقود',
      rowNumber
    };
  }
  
  // أخطاء الشبكة
  if (error.message?.includes('network') || error.message?.includes('timeout')) {
    return {
      type: 'system',
      severity: 'warning',
      message: `مشكلة في الاتصال أثناء ${baseContext}`,
      suggestion: 'تحقق من الاتصال بالإنترنت وأعد المحاولة',
      rowNumber
    };
  }
  
  // خطأ عام
  return {
    type: 'system',
    severity: 'error',
    message: `خطأ في ${baseContext}: ${error.message || 'خطأ غير معروف'}`,
    suggestion: 'راجع البيانات وأعد المحاولة',
    rowNumber
  };
};

export const formatErrorForUser = (error: ContractError): string => {
  const severity = error.severity === 'error' ? '❌' : 
                  error.severity === 'warning' ? '⚠️' : 'ℹ️';
  
  let message = `${severity} ${error.message}`;
  
  if (error.suggestion) {
    message += `\n💡 ${error.suggestion}`;
  }
  
  return message;
};

export const groupErrorsByType = (errors: ContractError[]): Record<string, ContractError[]> => {
  return errors.reduce((groups, error) => {
    const type = error.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(error);
    return groups;
  }, {} as Record<string, ContractError[]>);
};

export const generateErrorSummary = (errors: ContractError[]): string => {
  const grouped = groupErrorsByType(errors);
  const summary: string[] = [];
  
  Object.entries(grouped).forEach(([type, typeErrors]) => {
    const count = typeErrors.length;
    const typeLabel = {
      'validation': 'أخطاء التحقق',
      'database': 'أخطاء قاعدة البيانات',
      'customer': 'أخطاء العملاء',
      'vehicle': 'أخطاء المركبات',
      'financial': 'أخطاء مالية',
      'system': 'أخطاء النظام'
    }[type] || type;
    
    summary.push(`${typeLabel}: ${count}`);
  });
  
  return summary.join(' | ');
};
