import { format, parse, isValid } from 'date-fns';

export interface FixResult {
  success: boolean;
  originalValue: any;
  fixedValue: any;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CSVRowFix {
  rowNumber: number;
  originalData: Record<string, any>;
  fixedData: Record<string, any>;
  fixes: Array<{
    field: string;
    fix: FixResult;
  }>;
  hasErrors: boolean;
  validationErrors: string[];
}

// تنسيقات التاريخ الشائعة
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'dd.MM.yyyy',
  'MM.dd.yyyy',
  'yyyy/MM/dd',
];

// أرقام الهواتف الكويتية
const KUWAIT_PHONE_PATTERNS = [
  /^(\+965\s?)?([2569]\d{7})$/,
  /^(\+965\s?)?([2569]\d{3}\s?\d{4})$/,
  /^(\+965\s?)?([2569]\d{3}-\d{4})$/,
];

export class CSVAutoFix {
  /**
   * إصلاح التواريخ التلقائي
   */
  static fixDate(value: any): FixResult {
    if (!value || value === '') {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    const stringValue = String(value).trim();
    
    // إذا كان التاريخ صحيحاً بالفعل
    if (isValid(new Date(stringValue))) {
      const parsedDate = new Date(stringValue);
      return {
        success: true,
        originalValue: value,
        fixedValue: format(parsedDate, 'yyyy-MM-dd'),
        confidence: 'high',
        reason: 'تم تنسيق التاريخ'
      };
    }

    // محاولة تحليل التاريخ بصيغ مختلفة
    for (const dateFormat of DATE_FORMATS) {
      try {
        const parsedDate = parse(stringValue, dateFormat, new Date());
        if (isValid(parsedDate)) {
          return {
            success: true,
            originalValue: value,
            fixedValue: format(parsedDate, 'yyyy-MM-dd'),
            confidence: 'high',
            reason: `تم تحويل من ${dateFormat} إلى yyyy-MM-dd`
          };
        }
      } catch (error) {
        // تجاهل أخطاء التحليل
      }
    }

    return {
      success: false,
      originalValue: value,
      fixedValue: value,
      confidence: 'low',
      reason: 'لا يمكن تحليل التاريخ'
    };
  }

  /**
   * إصلاح الأرقام التلقائي
   */
  static fixNumber(value: any): FixResult {
    if (value === null || value === undefined || value === '') {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    const stringValue = String(value).trim();
    
    // إزالة الفواصل والرموز غير الرقمية
    const cleanedValue = stringValue.replace(/[^\d.-]/g, '');
    
    if (cleanedValue === '') {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'لا توجد أرقام في القيمة'
      };
    }

    const numericValue = parseFloat(cleanedValue);
    
    if (!isNaN(numericValue)) {
      return {
        success: true,
        originalValue: value,
        fixedValue: numericValue,
        confidence: stringValue === cleanedValue ? 'high' : 'medium',
        reason: stringValue === cleanedValue ? 'رقم صحيح' : 'تم إزالة الرموز غير الرقمية'
      };
    }

    return {
      success: false,
      originalValue: value,
      fixedValue: value,
      confidence: 'low',
      reason: 'لا يمكن تحويل إلى رقم'
    };
  }

  /**
   * إصلاح رقم الهاتف الكويتي
   */
  static fixKuwaitPhone(value: any): FixResult {
    if (!value || value === '') {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    let phoneValue = String(value).trim();
    
    // إزالة المسافات والشرطات الإضافية
    phoneValue = phoneValue.replace(/\s+/g, '').replace(/-+/g, '');
    
    // إضافة رمز الكويت إذا لم يكن موجوداً
    if (!phoneValue.startsWith('+965') && !phoneValue.startsWith('965')) {
      if (phoneValue.length === 8 && /^[2569]/.test(phoneValue)) {
        phoneValue = '+965' + phoneValue;
      }
    } else if (phoneValue.startsWith('965')) {
      phoneValue = '+' + phoneValue;
    }

    // التحقق من صحة الرقم
    for (const pattern of KUWAIT_PHONE_PATTERNS) {
      if (pattern.test(phoneValue)) {
        return {
          success: true,
          originalValue: value,
          fixedValue: phoneValue,
          confidence: 'high',
          reason: 'تم تنسيق رقم الهاتف الكويتي'
        };
      }
    }

    return {
      success: false,
      originalValue: value,
      fixedValue: value,
      confidence: 'low',
      reason: 'رقم هاتف غير صحيح'
    };
  }

  /**
   * إصلاح البريد الإلكتروني
   */
  static fixEmail(value: any): FixResult {
    if (!value || value === '') {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    let emailValue = String(value).trim().toLowerCase();
    
    // إزالة المسافات
    emailValue = emailValue.replace(/\s+/g, '');
    
    // أخطاء شائعة في البريد الإلكتروني
    const commonFixes = [
      { from: '@gmai.com', to: '@gmail.com' },
      { from: '@gmail.co', to: '@gmail.com' },
      { from: '@yahooo.com', to: '@yahoo.com' },
      { from: '@yahoo.co', to: '@yahoo.com' },
      { from: '@hotmai.com', to: '@hotmail.com' },
      { from: '@outlook.co', to: '@outlook.com' },
    ];

    for (const fix of commonFixes) {
      if (emailValue.includes(fix.from)) {
        emailValue = emailValue.replace(fix.from, fix.to);
      }
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(emailValue)) {
      return {
        success: true,
        originalValue: value,
        fixedValue: emailValue,
        confidence: emailValue === String(value).trim().toLowerCase() ? 'high' : 'medium',
        reason: 'تم تنسيق البريد الإلكتروني'
      };
    }

    return {
      success: false,
      originalValue: value,
      fixedValue: value,
      confidence: 'low',
      reason: 'بريد إلكتروني غير صحيح'
    };
  }

  /**
   * إصلاح القيم المنطقية
   */
  static fixBoolean(value: any): FixResult {
    if (value === null || value === undefined) {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    const stringValue = String(value).trim().toLowerCase();
    
    const trueValues = ['true', 'yes', 'y', '1', 'نعم', 'صحيح', 'موافق'];
    const falseValues = ['false', 'no', 'n', '0', 'لا', 'خطأ', 'غير موافق'];
    
    if (trueValues.includes(stringValue)) {
      return {
        success: true,
        originalValue: value,
        fixedValue: true,
        confidence: 'high',
        reason: 'تم تحويل إلى true'
      };
    }
    
    if (falseValues.includes(stringValue)) {
      return {
        success: true,
        originalValue: value,
        fixedValue: false,
        confidence: 'high',
        reason: 'تم تحويل إلى false'
      };
    }

    return {
      success: false,
      originalValue: value,
      fixedValue: value,
      confidence: 'low',
      reason: 'لا يمكن تحويل إلى قيمة منطقية'
    };
  }

  /**
   * إصلاح النصوص (تنظيف)
   */
  static fixText(value: any): FixResult {
    if (value === null || value === undefined) {
      return {
        success: false,
        originalValue: value,
        fixedValue: value,
        confidence: 'low',
        reason: 'القيمة فارغة'
      };
    }

    let textValue = String(value);
    const originalText = textValue;
    
    // إزالة المسافات الإضافية
    textValue = textValue.trim().replace(/\s+/g, ' ');
    
    // تصحيح الأحرف الإنجليزية المكتوبة بالعربية
    const arabicToEnglish = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    
    for (const [arabic, english] of Object.entries(arabicToEnglish)) {
      textValue = textValue.replace(new RegExp(arabic, 'g'), english);
    }

    if (textValue !== originalText) {
      return {
        success: true,
        originalValue: value,
        fixedValue: textValue,
        confidence: 'medium',
        reason: 'تم تنظيف النص وتصحيح الأرقام'
      };
    }

    return {
      success: true,
      originalValue: value,
      fixedValue: textValue,
      confidence: 'high',
      reason: 'النص سليم'
    };
  }

  /**
   * إصلاح صف كامل من البيانات
   */
  static fixRow(
    data: Record<string, any>,
    rowNumber: number,
    fieldTypes: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean'>,
    requiredFields: string[] = []
  ): CSVRowFix {
    const fixedData = { ...data };
    const fixes: Array<{ field: string; fix: FixResult }> = [];
    const validationErrors: string[] = [];

    // التحقق من الحقول المطلوبة
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === '') {
        validationErrors.push(`الحقل ${field} مطلوب`);
      }
    }

    // إصلاح كل حقل حسب نوعه
    for (const [field, type] of Object.entries(fieldTypes)) {
      if (data[field] !== undefined && data[field] !== null) {
        let fixResult: FixResult;

        switch (type) {
          case 'date':
            fixResult = this.fixDate(data[field]);
            break;
          case 'number':
            fixResult = this.fixNumber(data[field]);
            break;
          case 'email':
            fixResult = this.fixEmail(data[field]);
            break;
          case 'phone':
            fixResult = this.fixKuwaitPhone(data[field]);
            break;
          case 'boolean':
            fixResult = this.fixBoolean(data[field]);
            break;
          case 'text':
          default:
            fixResult = this.fixText(data[field]);
            break;
        }

        if (fixResult.success) {
          fixedData[field] = fixResult.fixedValue;
          if (fixResult.originalValue !== fixResult.fixedValue) {
            fixes.push({ field, fix: fixResult });
          }
        } else if (requiredFields.includes(field)) {
          validationErrors.push(`${field}: ${fixResult.reason}`);
        }
      }
    }

    return {
      rowNumber,
      originalData: data,
      fixedData,
      fixes,
      hasErrors: validationErrors.length > 0,
      validationErrors
    };
  }

  /**
   * إصلاح ملف CSV كامل
   */
  static fixCSVData(
    csvData: Record<string, any>[],
    fieldTypes: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean'>,
    requiredFields: string[] = []
  ): CSVRowFix[] {
    return csvData.map((row, index) => 
      this.fixRow(row, index + 1, fieldTypes, requiredFields)
    );
  }
}