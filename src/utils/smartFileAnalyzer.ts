/**
 * محلل الملفات الذكي - يحلل ملفات CSV قبل المعالجة
 */

export interface FileAnalysisResult {
  encoding: string;
  delimiter: string;
  hasHeader: boolean;
  rowCount: number;
  columnCount: number;
  dateFormat: string;
  numberFormat: string;
  currency: string;
  potentialIssues: FileIssue[];
  confidence: number;
  suggestions: string[];
}

export interface FileIssue {
  type: 'encoding' | 'delimiter' | 'date_format' | 'missing_data' | 'invalid_values' | 'duplicate_headers';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  messageAr: string;
  row?: number;
  column?: string;
  autoFixable: boolean;
  suggestedFix?: string;
}

export interface SmartColumnMapping {
  originalHeader: string;
  mappedHeader: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'content_analysis' | 'ai_suggestion';
  alternatives?: string[];
}

/**
 * تحليل ملف CSV ذكياً
 */
export const analyzeFileIntelligently = async (
  file: File,
  sampleRows: any[]
): Promise<FileAnalysisResult> => {
  const issues: FileIssue[] = [];
  const suggestions: string[] = [];
  
  // تحليل الترميز
  const encoding = await detectEncoding(file);
  if (encoding !== 'utf-8') {
    issues.push({
      type: 'encoding',
      severity: 'medium',
      message: `File encoding detected as ${encoding}. UTF-8 recommended.`,
      messageAr: `ترميز الملف ${encoding}. يُنصح باستخدام UTF-8`,
      autoFixable: true,
      suggestedFix: 'Convert to UTF-8 encoding'
    });
  }

  // تحليل الفواصل
  const delimiter = detectDelimiter(sampleRows);
  
  // تحليل الرؤوس
  const headerAnalysis = analyzeHeaders(sampleRows[0]);
  if (headerAnalysis.hasDuplicates) {
    issues.push({
      type: 'duplicate_headers',
      severity: 'critical',
      message: 'Duplicate column headers detected',
      messageAr: 'تم اكتشاف أعمدة مكررة',
      autoFixable: true,
      suggestedFix: 'Auto-rename duplicate columns'
    });
  }

  // تحليل تنسيق التاريخ
  const dateFormat = detectDateFormat(sampleRows);
  
  // تحليل تنسيق الأرقام
  const numberFormat = detectNumberFormat(sampleRows);
  
  // تحليل العملة
  const currency = detectCurrency(sampleRows);
  
  // تحليل البيانات المفقودة
  const missingDataAnalysis = analyzeMissingData(sampleRows);
  if (missingDataAnalysis.criticalFieldsMissing.length > 0) {
    issues.push({
      type: 'missing_data',
      severity: 'critical',
      message: `Critical fields missing: ${missingDataAnalysis.criticalFieldsMissing.join(', ')}`,
      messageAr: `حقول مهمة مفقودة: ${missingDataAnalysis.criticalFieldsMissing.join('، ')}`,
      autoFixable: false
    });
  }

  // تحليل القيم غير الصحيحة
  const invalidValuesAnalysis = analyzeInvalidValues(sampleRows);
  invalidValuesAnalysis.forEach(issue => {
    issues.push({
      type: 'invalid_values',
      severity: issue.severity as any,
      message: issue.message,
      messageAr: issue.messageAr,
      row: issue.row,
      column: issue.column,
      autoFixable: issue.autoFixable,
      suggestedFix: issue.suggestedFix
    });
  });

  // حساب الثقة
  const confidence = calculateConfidence(issues, sampleRows.length);
  
  // اقتراحات التحسين
  generateSuggestions(issues, suggestions);

  return {
    encoding,
    delimiter,
    hasHeader: true,
    rowCount: sampleRows.length,
    columnCount: Object.keys(sampleRows[0] || {}).length,
    dateFormat,
    numberFormat,
    currency,
    potentialIssues: issues,
    confidence,
    suggestions
  };
};

/**
 * كشف ترميز الملف
 */
const detectEncoding = async (file: File): Promise<string> => {
  const buffer = await file.slice(0, 1024).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // فحص BOM للـ UTF-8
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8-bom';
  }
  
  // فحص وجود أحرف عربية
  const text = new TextDecoder('utf-8').decode(bytes);
  const arabicRegex = /[\u0600-\u06FF]/;
  
  if (arabicRegex.test(text)) {
    return 'utf-8';
  }
  
  return 'utf-8';
};

/**
 * كشف نوع الفاصل
 */
const detectDelimiter = (sampleRows: any[]): string => {
  if (!sampleRows.length) return ',';
  
  const firstRowString = JSON.stringify(sampleRows[0]);
  const commaCount = (firstRowString.match(/,/g) || []).length;
  const semicolonCount = (firstRowString.match(/;/g) || []).length;
  const tabCount = (firstRowString.match(/\t/g) || []).length;
  
  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
};

/**
 * تحليل رؤوس الأعمدة
 */
const analyzeHeaders = (firstRow: any) => {
  if (!firstRow) return { hasDuplicates: false, emptyHeaders: [] };
  
  const headers = Object.keys(firstRow);
  const uniqueHeaders = new Set(headers);
  const emptyHeaders = headers.filter(h => !h || h.trim() === '');
  
  return {
    hasDuplicates: headers.length !== uniqueHeaders.size,
    emptyHeaders
  };
};

/**
 * كشف تنسيق التاريخ
 */
const detectDateFormat = (sampleRows: any[]): string => {
  const datePatterns = [
    { format: 'DD/MM/YYYY', regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
    { format: 'MM/DD/YYYY', regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
    { format: 'YYYY-MM-DD', regex: /^\d{4}-\d{1,2}-\d{1,2}$/ },
    { format: 'DD-MM-YYYY', regex: /^\d{1,2}-\d{1,2}-\d{4}$/ },
    { format: 'DD.MM.YYYY', regex: /^\d{1,2}\.\d{1,2}\.\d{4}$/ }
  ];
  
  const dateSamples: string[] = [];
  sampleRows.slice(0, 10).forEach(row => {
    Object.values(row).forEach(value => {
      if (typeof value === 'string' && value.length >= 8 && value.length <= 10) {
        dateSamples.push(value);
      }
    });
  });
  
  for (const pattern of datePatterns) {
    const matches = dateSamples.filter(sample => pattern.regex.test(sample));
    if (matches.length >= Math.min(3, dateSamples.length * 0.6)) {
      return pattern.format;
    }
  }
  
  return 'DD/MM/YYYY'; // افتراضي
};

/**
 * كشف تنسيق الأرقام
 */
const detectNumberFormat = (sampleRows: any[]): string => {
  const numberSamples: string[] = [];
  sampleRows.slice(0, 10).forEach(row => {
    Object.values(row).forEach(value => {
      if (typeof value === 'string' && /[\d.,]/.test(value)) {
        numberSamples.push(value);
      }
    });
  });
  
  const commaAsDecimal = numberSamples.filter(s => /\d+,\d{1,2}$/.test(s)).length;
  const dotAsDecimal = numberSamples.filter(s => /\d+\.\d{1,2}$/.test(s)).length;
  
  if (commaAsDecimal > dotAsDecimal) {
    return '1.234,56'; // أوروبي
  }
  return '1,234.56'; // أمريكي
};

/**
 * كشف العملة
 */
const detectCurrency = (sampleRows: any[]): string => {
  const currencyPatterns = [
    { currency: 'KWD', patterns: ['دينار', 'kwd', 'k.d', 'د.ك'] },
    { currency: 'USD', patterns: ['$', 'usd', 'dollar', 'دولار'] },
    { currency: 'EUR', patterns: ['€', 'eur', 'euro', 'يورو'] },
    { currency: 'SAR', patterns: ['ريال', 'sar', 'sr'] }
  ];
  
  const allText = sampleRows.slice(0, 5)
    .map(row => Object.values(row).join(' '))
    .join(' ')
    .toLowerCase();
  
  for (const { currency, patterns } of currencyPatterns) {
    if (patterns.some(pattern => allText.includes(pattern))) {
      return currency;
    }
  }
  
  return 'KWD'; // افتراضي
};

/**
 * تحليل البيانات المفقودة
 */
const analyzeMissingData = (sampleRows: any[]) => {
  const criticalFields = ['amount', 'payment_date', 'customer_name'];
  const criticalFieldsMissing: string[] = [];
  
  criticalFields.forEach(field => {
    const hasData = sampleRows.some(row => 
      Object.keys(row).some(key => 
        key.toLowerCase().includes(field.split('_')[0]) && 
        row[key] && 
        String(row[key]).trim() !== ''
      )
    );
    
    if (!hasData) {
      criticalFieldsMissing.push(field);
    }
  });
  
  return { criticalFieldsMissing };
};

/**
 * تحليل القيم غير الصحيحة
 */
const analyzeInvalidValues = (sampleRows: any[]) => {
  const issues: any[] = [];
  
  sampleRows.forEach((row, index) => {
    Object.entries(row).forEach(([key, value]) => {
      const valueStr = String(value || '').trim();
      
      // فحص طرق الدفع
      if (key.toLowerCase().includes('payment') && key.toLowerCase().includes('method')) {
        const validMethods = ['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card'];
        if (valueStr && !validMethods.includes(valueStr.toLowerCase())) {
          issues.push({
            severity: 'medium',
            message: `Invalid payment method: ${valueStr}`,
            messageAr: `طريقة دفع غير صحيحة: ${valueStr}`,
            row: index + 1,
            column: key,
            autoFixable: true,
            suggestedFix: 'Map to valid payment method'
          });
        }
      }
      
      // فحص المبالغ
      if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('مبلغ')) {
        if (valueStr && isNaN(parseFloat(valueStr.replace(/[^\d.-]/g, '')))) {
          issues.push({
            severity: 'high',
            message: `Invalid amount format: ${valueStr}`,
            messageAr: `تنسيق مبلغ غير صحيح: ${valueStr}`,
            row: index + 1,
            column: key,
            autoFixable: true,
            suggestedFix: 'Clean and parse number'
          });
        }
      }
    });
  });
  
  return issues;
};

/**
 * حساب مستوى الثقة
 */
const calculateConfidence = (issues: FileIssue[], rowCount: number): number => {
  let confidence = 100;
  
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'critical':
        confidence -= 30;
        break;
      case 'high':
        confidence -= 20;
        break;
      case 'medium':
        confidence -= 10;
        break;
      case 'low':
        confidence -= 5;
        break;
    }
  });
  
  // تقليل الثقة للملفات الصغيرة جداً
  if (rowCount < 5) {
    confidence -= 20;
  }
  
  return Math.max(0, confidence);
};

/**
 * توليد اقتراحات التحسين
 */
const generateSuggestions = (issues: FileIssue[], suggestions: string[]) => {
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const autoFixableIssues = issues.filter(i => i.autoFixable);
  
  if (criticalIssues.length > 0) {
    suggestions.push('توجد مشاكل حرجة تحتاج إلى إصلاح يدوي قبل المتابعة');
  }
  
  if (autoFixableIssues.length > 0) {
    suggestions.push(`يمكن إصلاح ${autoFixableIssues.length} مشكلة تلقائياً`);
  }
  
  if (issues.length === 0) {
    suggestions.push('الملف يبدو سليماً وجاهز للمعالجة');
  }
};