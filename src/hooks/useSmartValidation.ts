/**
 * نظام التحقق الذكي مع الإصلاح التلقائي
 */

import { useState, useCallback } from 'react';
import { normalizeCsvHeaders } from '@/utils/csvHeaderMapping';
import { smartFuzzyMatch, getHistoricalMappings } from '@/utils/fuzzyColumnMatcher';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  autoFixedItems: AutoFixedItem[];
  suggestions: string[];
  confidence: number;
}

export interface ValidationError {
  id: string;
  type: 'critical' | 'blocking' | 'data_integrity';
  field: string;
  row: number;
  message: string;
  messageAr: string;
  originalValue: any;
  canAutoFix: boolean;
  suggestedFix?: any;
  severity: number; // 1-10
}

export interface ValidationWarning {
  id: string;
  type: 'format' | 'consistency' | 'optimization';
  field: string;
  row?: number;
  message: string;
  messageAr: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AutoFixedItem {
  id: string;
  field: string;
  row: number;
  originalValue: any;
  fixedValue: any;
  fixType: string;
  confidence: number;
}

export const useSmartValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);

  /**
   * التحقق الذكي من البيانات
   */
  const validateData = useCallback(async (
    data: any[],
    options: {
      autoFix?: boolean;
      strictMode?: boolean;
      requiredFields?: string[];
    } = {}
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const autoFixedItems: AutoFixedItem[] = [];
    const suggestions: string[] = [];
    
    const { autoFix = true, strictMode = false, requiredFields = [] } = options;
    const historicalMappings = getHistoricalMappings();
    
    try {
      // 1. تطبيع البيانات وتحليل الأعمدة
      const normalizedData = data.map((row, index) => {
        const normalizedRow = normalizeCsvHeaders(row);
        
        // تحليل وإصلاح كل حقل
        Object.entries(normalizedRow).forEach(([field, value]) => {
          const validationResult = validateAndFixField(
            field,
            value,
            index,
            autoFix,
            historicalMappings
          );
          
          if (validationResult.error) {
            errors.push(validationResult.error);
          }
          
          if (validationResult.warning) {
            warnings.push(validationResult.warning);
          }
          
          if (validationResult.autoFixed) {
            autoFixedItems.push(validationResult.autoFixed);
            normalizedRow[field] = validationResult.autoFixed.fixedValue;
          }
        });
        
        return normalizedRow;
      });
      
      // 2. التحقق من الحقول المطلوبة
      validateRequiredFields(normalizedData, requiredFields, errors);
      
      // 3. التحقق من تناسق البيانات
      validateDataConsistency(normalizedData, warnings);
      
      // 4. التحقق من جودة البيانات
      validateDataQuality(normalizedData, warnings, strictMode);
      
      // 5. توليد الاقتراحات
      generateSmartSuggestions(errors, warnings, autoFixedItems, suggestions);
      
      // 6. حساب مستوى الثقة
      const confidence = calculateValidationConfidence(errors, warnings, data.length);
      
      const result: ValidationResult = {
        isValid: errors.filter(e => e.type === 'critical' || e.type === 'blocking').length === 0,
        errors,
        warnings,
        autoFixedItems,
        suggestions,
        confidence
      };
      
      // حفظ النتيجة في التاريخ
      setValidationHistory(prev => [...prev.slice(-9), result]);
      
      return result;
      
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * التحقق من حقل واحد وإصلاحه
   */
  const validateAndFixField = (
    field: string,
    value: any,
    rowIndex: number,
    autoFix: boolean,
    historicalMappings: Record<string, string>
  ) => {
    const result: {
      error?: ValidationError;
      warning?: ValidationWarning;
      autoFixed?: AutoFixedItem;
    } = {};
    
    const valueStr = String(value || '').trim();
    
    // التحقق من طرق الدفع
    if (field === 'payment_method') {
      const fixResult = fixPaymentMethod(valueStr, rowIndex, autoFix);
      if (fixResult.error) result.error = fixResult.error;
      if (fixResult.autoFixed) result.autoFixed = fixResult.autoFixed;
    }
    
    // التحقق من المبالغ
    else if (field.includes('amount') || field.includes('مبلغ')) {
      const fixResult = fixAmountFormat(valueStr, field, rowIndex, autoFix);
      if (fixResult.error) result.error = fixResult.error;
      if (fixResult.warning) result.warning = fixResult.warning;
      if (fixResult.autoFixed) result.autoFixed = fixResult.autoFixed;
    }
    
    // التحقق من التواريخ
    else if (field.includes('date') || field.includes('تاريخ')) {
      const fixResult = fixDateFormat(valueStr, field, rowIndex, autoFix);
      if (fixResult.error) result.error = fixResult.error;
      if (fixResult.autoFixed) result.autoFixed = fixResult.autoFixed;
    }
    
    // التحقق من أسماء العملاء
    else if (field.includes('customer') || field.includes('عميل')) {
      const fixResult = fixCustomerName(valueStr, field, rowIndex, autoFix);
      if (fixResult.warning) result.warning = fixResult.warning;
      if (fixResult.autoFixed) result.autoFixed = fixResult.autoFixed;
    }
    
    // التحقق من أرقام الهاتف
    else if (field.includes('phone') || field.includes('هاتف')) {
      const fixResult = fixPhoneNumber(valueStr, field, rowIndex, autoFix);
      if (fixResult.autoFixed) result.autoFixed = fixResult.autoFixed;
    }
    
    return result;
  };

  /**
   * إصلاح طريقة الدفع
   */
  const fixPaymentMethod = (value: string, rowIndex: number, autoFix: boolean) => {
    const validMethods = ['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card'];
    const normalizedValue = value.toLowerCase().trim();
    
    // خريطة الترجمة والمرادفات
    const methodMappings: Record<string, string> = {
      'نقد': 'cash',
      'نقدي': 'cash',
      'كاش': 'cash',
      'شيك': 'check',
      'صك': 'check',
      'cheque': 'check',
      'تحويل': 'bank_transfer',
      'تحويل بنكي': 'bank_transfer',
      'حوالة': 'bank_transfer',
      'transfer': 'bank_transfer',
      'بنك': 'bank_transfer',
      'بطاقة ائتمان': 'credit_card',
      'كريدت': 'credit_card',
      'credit': 'credit_card',
      'visa': 'credit_card',
      'mastercard': 'credit_card',
      'بطاقة مدين': 'debit_card',
      'debit': 'debit_card',
      'مدين': 'debit_card'
    };
    
    // البحث عن مطابقة دقيقة
    if (validMethods.includes(normalizedValue)) {
      return {};
    }
    
    // البحث في الخريطة
    const mappedMethod = methodMappings[normalizedValue];
    if (mappedMethod && autoFix) {
      return {
        autoFixed: {
          id: `payment_method_${rowIndex}`,
          field: 'payment_method',
          row: rowIndex,
          originalValue: value,
          fixedValue: mappedMethod,
          fixType: 'payment_method_mapping',
          confidence: 0.9
        }
      };
    }
    
    // البحث الضبابي
    const fuzzyMatch = smartFuzzyMatch(value, [], {});
    if (fuzzyMatch.confidence > 0.7 && validMethods.includes(fuzzyMatch.bestMatch) && autoFix) {
      return {
        autoFixed: {
          id: `payment_method_fuzzy_${rowIndex}`,
          field: 'payment_method',
          row: rowIndex,
          originalValue: value,
          fixedValue: fuzzyMatch.bestMatch,
          fixType: 'fuzzy_payment_method',
          confidence: fuzzyMatch.confidence
        }
      };
    }
    
    // إذا لم نتمكن من الإصلاح
    return {
      error: {
        id: `invalid_payment_method_${rowIndex}`,
        type: 'critical' as const,
        field: 'payment_method',
        row: rowIndex,
        message: `Invalid payment method: ${value}`,
        messageAr: `طريقة دفع غير صحيحة: ${value}`,
        originalValue: value,
        canAutoFix: false,
        severity: 8
      }
    };
  };

  /**
   * إصلاح تنسيق المبلغ
   */
  const fixAmountFormat = (value: string, field: string, rowIndex: number, autoFix: boolean) => {
    if (!value) {
      return {
        error: {
          id: `empty_amount_${rowIndex}`,
          type: 'critical' as const,
          field,
          row: rowIndex,
          message: 'Amount cannot be empty',
          messageAr: 'المبلغ لا يمكن أن يكون فارغاً',
          originalValue: value,
          canAutoFix: false,
          severity: 10
        }
      };
    }
    
    // تنظيف المبلغ
    const cleanAmount = value
      .replace(/[^\d.,\-+]/g, '') // إزالة كل شيء عدا الأرقام والعلامات
      .replace(/,(\d{3})/g, '$1') // إزالة الفواصل من الآلاف
      .replace(/,/g, '.'); // تحويل الفاصلة العشرية
    
    const numericValue = parseFloat(cleanAmount);
    
    if (isNaN(numericValue)) {
      return {
        error: {
          id: `invalid_amount_${rowIndex}`,
          type: 'critical' as const,
          field,
          row: rowIndex,
          message: `Invalid amount format: ${value}`,
          messageAr: `تنسيق مبلغ غير صحيح: ${value}`,
          originalValue: value,
          canAutoFix: false,
          severity: 9
        }
      };
    }
    
    if (numericValue < 0) {
      return {
        warning: {
          id: `negative_amount_${rowIndex}`,
          type: 'consistency' as const,
          field,
          row: rowIndex,
          message: 'Negative amount detected',
          messageAr: 'تم اكتشاف مبلغ سالب',
          impact: 'medium' as const
        }
      };
    }
    
    if (cleanAmount !== value && autoFix) {
      return {
        autoFixed: {
          id: `amount_format_${rowIndex}`,
          field,
          row: rowIndex,
          originalValue: value,
          fixedValue: numericValue,
          fixType: 'amount_cleaning',
          confidence: 0.95
        }
      };
    }
    
    return {};
  };

  /**
   * إصلاح تنسيق التاريخ
   */
  const fixDateFormat = (value: string, field: string, rowIndex: number, autoFix: boolean) => {
    if (!value) return {};
    
    const datePatterns = [
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'DD/MM/YYYY' },
      { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'DD-MM-YYYY' },
      { pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, format: 'YYYY-MM-DD' },
      { pattern: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, format: 'DD.MM.YYYY' }
    ];
    
    for (const { pattern, format } of datePatterns) {
      const match = value.match(pattern);
      if (match) {
        try {
          let date: Date;
          if (format === 'YYYY-MM-DD') {
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          }
          
          if (date.getTime() && autoFix) {
            const standardFormat = date.toISOString().split('T')[0];
            if (standardFormat !== value) {
              return {
                autoFixed: {
                  id: `date_format_${rowIndex}`,
                  field,
                  row: rowIndex,
                  originalValue: value,
                  fixedValue: standardFormat,
                  fixType: 'date_standardization',
                  confidence: 0.9
                }
              };
            }
          }
          return {};
        } catch (error) {
          // التاريخ غير صحيح
        }
      }
    }
    
    return {
      error: {
        id: `invalid_date_${rowIndex}`,
        type: 'critical' as const,
        field,
        row: rowIndex,
        message: `Invalid date format: ${value}`,
        messageAr: `تنسيق تاريخ غير صحيح: ${value}`,
        originalValue: value,
        canAutoFix: false,
        severity: 7
      }
    };
  };

  /**
   * إصلاح اسم العميل
   */
  const fixCustomerName = (value: string, field: string, rowIndex: number, autoFix: boolean) => {
    if (!value || value.length < 2) {
      return {
        warning: {
          id: `short_customer_name_${rowIndex}`,
          type: 'format' as const,
          field,
          row: rowIndex,
          message: 'Customer name seems too short',
          messageAr: 'اسم العميل يبدو قصيراً جداً',
          impact: 'low' as const
        }
      };
    }
    
    // تنظيف الاسم
    const cleanName = value
      .replace(/\s+/g, ' ') // إزالة المسافات المتعددة
      .replace(/[^\w\s\u0600-\u06FF]/g, '') // إزالة الرموز الغريبة
      .trim();
    
    if (cleanName !== value && autoFix) {
      return {
        autoFixed: {
          id: `customer_name_clean_${rowIndex}`,
          field,
          row: rowIndex,
          originalValue: value,
          fixedValue: cleanName,
          fixType: 'name_cleaning',
          confidence: 0.8
        }
      };
    }
    
    return {};
  };

  /**
   * إصلاح رقم الهاتف
   */
  const fixPhoneNumber = (value: string, field: string, rowIndex: number, autoFix: boolean) => {
    if (!value) return {};
    
    // تنظيف رقم الهاتف
    const cleanPhone = value
      .replace(/[^\d+]/g, '') // الاحتفاظ بالأرقام وعلامة + فقط
      .replace(/^00/, '+') // تحويل 00 إلى +
      .replace(/^(\d)/, '+965$1'); // إضافة رمز الكويت إذا لم يكن موجوداً
    
    if (cleanPhone !== value && autoFix) {
      return {
        autoFixed: {
          id: `phone_format_${rowIndex}`,
          field,
          row: rowIndex,
          originalValue: value,
          fixedValue: cleanPhone,
          fixType: 'phone_formatting',
          confidence: 0.7
        }
      };
    }
    
    return {};
  };

  /**
   * التحقق من الحقول المطلوبة
   */
  const validateRequiredFields = (data: any[], requiredFields: string[], errors: ValidationError[]) => {
    requiredFields.forEach(field => {
      data.forEach((row, index) => {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push({
            id: `missing_${field}_${index}`,
            type: 'blocking',
            field,
            row: index,
            message: `Required field ${field} is missing`,
            messageAr: `الحقل المطلوب ${field} مفقود`,
            originalValue: row[field],
            canAutoFix: false,
            severity: 10
          });
        }
      });
    });
  };

  /**
   * التحقق من تناسق البيانات
   */
  const validateDataConsistency = (data: any[], warnings: ValidationWarning[]) => {
    if (data.length < 2) return;
    
    // فحص تناسق العملات
    const currencies = data
      .map(row => row.currency)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    if (currencies.length > 1) {
      warnings.push({
        id: 'multiple_currencies',
        type: 'consistency',
        field: 'currency',
        message: `Multiple currencies detected: ${currencies.join(', ')}`,
        messageAr: `عملات متعددة: ${currencies.join('، ')}`,
        impact: 'medium'
      });
    }
    
    // فحص تناسق تنسيق التواريخ
    const dateFormats = new Set<string>();
    data.forEach(row => {
      if (row.payment_date) {
        const dateStr = String(row.payment_date);
        if (dateStr.includes('/')) dateFormats.add('DD/MM/YYYY');
        if (dateStr.includes('-')) dateFormats.add('YYYY-MM-DD');
        if (dateStr.includes('.')) dateFormats.add('DD.MM.YYYY');
      }
    });
    
    if (dateFormats.size > 1) {
      warnings.push({
        id: 'inconsistent_date_formats',
        type: 'consistency',
        field: 'payment_date',
        message: 'Inconsistent date formats detected',
        messageAr: 'تنسيقات تاريخ غير متناسقة',
        impact: 'medium'
      });
    }
  };

  /**
   * التحقق من جودة البيانات
   */
  const validateDataQuality = (data: any[], warnings: ValidationWarning[], strictMode: boolean) => {
    const duplicateCheck = new Map<string, number[]>();
    
    data.forEach((row, index) => {
      // فحص البيانات المكررة
      const key = `${row.customer_name}_${row.amount}_${row.payment_date}`;
      if (duplicateCheck.has(key)) {
        duplicateCheck.get(key)!.push(index);
      } else {
        duplicateCheck.set(key, [index]);
      }
      
      // فحص المبالغ غير المعقولة
      if (row.amount && (row.amount > 100000 || row.amount < 0.01)) {
        warnings.push({
          id: `unusual_amount_${index}`,
          type: 'optimization',
          field: 'amount',
          row: index,
          message: 'Unusual amount detected',
          messageAr: 'مبلغ غير عادي',
          impact: strictMode ? 'high' : 'low'
        });
      }
    });
    
    // إضافة تحذيرات للبيانات المكررة
    duplicateCheck.forEach((indices, key) => {
      if (indices.length > 1) {
        warnings.push({
          id: `duplicate_${key}`,
          type: 'consistency',
          field: 'general',
          message: `Potential duplicate entries found at rows: ${indices.join(', ')}`,
          messageAr: `إدخالات مكررة محتملة في الصفوف: ${indices.join('، ')}`,
          impact: 'medium'
        });
      }
    });
  };

  /**
   * توليد الاقتراحات الذكية
   */
  const generateSmartSuggestions = (
    errors: ValidationError[],
    warnings: ValidationWarning[],
    autoFixedItems: AutoFixedItem[],
    suggestions: string[]
  ) => {
    const criticalErrors = errors.filter(e => e.type === 'critical');
    const blockingErrors = errors.filter(e => e.type === 'blocking');
    
    if (criticalErrors.length > 0) {
      suggestions.push(`${criticalErrors.length} أخطاء حرجة تحتاج إلى إصلاح فوري`);
    }
    
    if (blockingErrors.length > 0) {
      suggestions.push(`${blockingErrors.length} أخطاء تمنع المتابعة`);
    }
    
    if (autoFixedItems.length > 0) {
      suggestions.push(`تم إصلاح ${autoFixedItems.length} عنصر تلقائياً`);
    }
    
    const highImpactWarnings = warnings.filter(w => w.impact === 'high');
    if (highImpactWarnings.length > 0) {
      suggestions.push(`${highImpactWarnings.length} تحذيرات عالية الأهمية`);
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      suggestions.push('البيانات تبدو سليمة وجاهزة للمعالجة');
    }
  };

  /**
   * حساب مستوى الثقة في التحقق
   */
  const calculateValidationConfidence = (
    errors: ValidationError[],
    warnings: ValidationWarning[],
    totalRows: number
  ): number => {
    let confidence = 100;
    
    // تقليل الثقة بناءً على الأخطاء
    errors.forEach(error => {
      switch (error.type) {
        case 'critical':
          confidence -= 20;
          break;
        case 'blocking':
          confidence -= 15;
          break;
        case 'data_integrity':
          confidence -= 10;
          break;
      }
    });
    
    // تقليل الثقة بناءً على التحذيرات
    warnings.forEach(warning => {
      switch (warning.impact) {
        case 'high':
          confidence -= 5;
          break;
        case 'medium':
          confidence -= 3;
          break;
        case 'low':
          confidence -= 1;
          break;
      }
    });
    
    // تقليل الثقة للملفات الصغيرة
    if (totalRows < 3) {
      confidence -= 10;
    }
    
    return Math.max(0, confidence);
  };

  return {
    validateData,
    isValidating,
    validationHistory
  };
};