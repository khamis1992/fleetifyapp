/**
 * نظام ذكي لاكتشاف وتحليل التواريخ في ملفات CSV
 */

import { normalizeArabicDigits } from "./numberFormatter";

export interface DateDetectionResult {
  isDate: boolean;
  confidence: number; // 0-100
  detectedFormat: string;
  parsedDate?: Date;
  originalValue: string;
  suggestions?: string[];
}

export interface DateFormatOption {
  format: string;
  label: string;
  example: string;
  regex: RegExp;
  parseFunction: (value: string) => Date | null;
}

// أنماط التواريخ المدعومة
export const DATE_FORMATS: DateFormatOption[] = [
  {
    format: 'DD/MM/YYYY',
    label: 'يوم/شهر/سنة (DD/MM/YYYY)',
    example: '31/12/2024',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    parseFunction: (value: string) => {
      const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!match) return null;
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(date) ? date : null;
    }
  },
  {
    format: 'MM/DD/YYYY',
    label: 'شهر/يوم/سنة (MM/DD/YYYY)',
    example: '12/31/2024',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    parseFunction: (value: string) => {
      const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!match) return null;
      const [, month, day, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(date) ? date : null;
    }
  },
  {
    format: 'YYYY-MM-DD',
    label: 'سنة-شهر-يوم (YYYY-MM-DD)',
    example: '2024-12-31',
    regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    parseFunction: (value: string) => {
      const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) return null;
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(date) ? date : null;
    }
  },
  {
    format: 'DD-MM-YYYY',
    label: 'يوم-شهر-سنة (DD-MM-YYYY)',
    example: '31-12-2024',
    regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    parseFunction: (value: string) => {
      const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (!match) return null;
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(date) ? date : null;
    }
  },
  {
    format: 'DD.MM.YYYY',
    label: 'يوم.شهر.سنة (DD.MM.YYYY)',
    example: '31.12.2024',
    regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    parseFunction: (value: string) => {
      const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (!match) return null;
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(date) ? date : null;
    }
  },
  {
    format: 'Excel Serial',
    label: 'رقم تسلسلي (Excel)',
    example: '44927',
    regex: /^(\d{4,6})$/,
    parseFunction: (value: string) => {
      const serial = parseInt(value);
      if (serial < 1 || serial > 50000) return null;
      // Excel serial date starts from 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
      return isValidDate(date) ? date : null;
    }
  }
];

/**
 * التحقق من صحة التاريخ
 */
export const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime()) && 
         date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
};

/**
 * تنظيف وتطبيع قيمة التاريخ
 */
export const normalizeDateValue = (value: any): string => {
  if (!value) return '';
  
  let normalized = String(value).trim();
  
  // تحويل الأرقام العربية إلى إنجليزية
  normalized = normalizeArabicDigits(normalized);
  
  // إزالة الأوقات إذا كانت موجودة
  normalized = normalized.replace(/\s+\d{1,2}:\d{1,2}(:\d{1,2})?.*$/, '');
  
  return normalized;
};

/**
 * اكتشاف تنسيق التاريخ تلقائياً
 */
export const detectDateFormat = (value: any): DateDetectionResult => {
  const originalValue = String(value || '');
  const normalized = normalizeDateValue(value);
  
  if (!normalized) {
    return {
      isDate: false,
      confidence: 0,
      detectedFormat: '',
      originalValue
    };
  }

  let bestMatch: DateDetectionResult = {
    isDate: false,
    confidence: 0,
    detectedFormat: '',
    originalValue
  };

  // تجربة جميع الأنماط
  for (const format of DATE_FORMATS) {
    if (format.regex.test(normalized)) {
      const parsedDate = format.parseFunction(normalized);
      
      if (parsedDate && isValidDate(parsedDate)) {
        const confidence = calculateConfidence(normalized, format, parsedDate);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            isDate: true,
            confidence,
            detectedFormat: format.format,
            parsedDate,
            originalValue,
            suggestions: [format.label]
          };
        }
      }
    }
  }

  return bestMatch;
};

/**
 * حساب مستوى الثقة في التاريخ المكتشف
 */
const calculateConfidence = (value: string, format: DateFormatOption, date: Date): number => {
  let confidence = 50; // قاعدة أساسية
  
  // زيادة الثقة للتواريخ المنطقية
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // سنوات منطقية (2000-2030 ثقة عالية)
  if (year >= 2000 && year <= 2030) confidence += 20;
  else if (year >= 1990 && year <= 2040) confidence += 10;
  else if (year >= 1950 && year <= 2050) confidence += 5;
  
  // أشهر صحيحة
  if (month >= 1 && month <= 12) confidence += 10;
  
  // أيام صحيحة
  if (day >= 1 && day <= 31) confidence += 10;
  
  // تنسيقات شائعة
  if (format.format === 'DD/MM/YYYY' || format.format === 'YYYY-MM-DD') {
    confidence += 10;
  }
  
  // تقليل الثقة للأرقام التسلسلية
  if (format.format === 'Excel Serial') {
    confidence -= 20;
  }
  
  return Math.min(100, Math.max(0, confidence));
};

/**
 * اكتشاف الأعمدة التي تحتوي على تواريخ
 */
export const detectDateColumns = (data: any[]): { [column: string]: DateDetectionResult[] } => {
  const columnResults: { [column: string]: DateDetectionResult[] } = {};
  
  if (!data || data.length === 0) return columnResults;
  
  // فحص أول 10 صفوف لكل عمود
  const sampleSize = Math.min(10, data.length);
  const columns = Object.keys(data[0] || {});
  
  for (const column of columns) {
    const results: DateDetectionResult[] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const value = data[i]?.[column];
      if (value) {
        const result = detectDateFormat(value);
        results.push(result);
      }
    }
    
    columnResults[column] = results;
  }
  
  return columnResults;
};

/**
 * تحديد ما إذا كان العمود يحتوي على تواريخ بناءً على العينة
 */
export const isDateColumn = (results: DateDetectionResult[], threshold: number = 70): boolean => {
  if (!results || results.length === 0) return false;
  
  const dateResults = results.filter(r => r.isDate);
  const percentage = (dateResults.length / results.length) * 100;
  
  // حساب متوسط الثقة للتواريخ المكتشفة
  const avgConfidence = dateResults.length > 0 
    ? dateResults.reduce((sum, r) => sum + r.confidence, 0) / dateResults.length 
    : 0;
  
  return percentage >= 50 && avgConfidence >= threshold;
};

/**
 * اقتراح تنسيق التاريخ الأفضل للعمود
 */
export const suggestBestFormat = (results: DateDetectionResult[]): DateFormatOption | null => {
  const formatCounts: { [format: string]: { count: number; totalConfidence: number } } = {};
  
  for (const result of results) {
    if (result.isDate && result.detectedFormat) {
      if (!formatCounts[result.detectedFormat]) {
        formatCounts[result.detectedFormat] = { count: 0, totalConfidence: 0 };
      }
      formatCounts[result.detectedFormat].count++;
      formatCounts[result.detectedFormat].totalConfidence += result.confidence;
    }
  }
  
  let bestFormat: string | null = null;
  let bestScore = 0;
  
  for (const [format, stats] of Object.entries(formatCounts)) {
    const avgConfidence = stats.totalConfidence / stats.count;
    const score = stats.count * avgConfidence;
    
    if (score > bestScore) {
      bestScore = score;
      bestFormat = format;
    }
  }
  
  return bestFormat ? DATE_FORMATS.find(f => f.format === bestFormat) || null : null;
};

/**
 * تحويل قيمة إلى تاريخ باستخدام التنسيق المحدد
 */
export const parseWithFormat = (value: any, format: DateFormatOption): Date | null => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return null;
  
  return format.parseFunction(normalized);
};

/**
 * إصلاح التواريخ في مجموعة البيانات
 */
export const fixDatesInData = (
  data: any[], 
  columnFormats: { [column: string]: DateFormatOption }
): any[] => {
  return data.map(row => {
    const fixedRow = { ...row };
    
    for (const [column, format] of Object.entries(columnFormats)) {
      if (row[column]) {
        const parsedDate = parseWithFormat(row[column], format);
        if (parsedDate && isValidDate(parsedDate)) {
          // تحويل إلى تنسيق ISO
          fixedRow[column] = parsedDate.toISOString().split('T')[0];
        }
      }
    }
    
    return fixedRow;
  });
};