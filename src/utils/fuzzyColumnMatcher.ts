/**
 * مطابق الأعمدة الضبابي - يستخدم خوارزميات التشابه النصي لمطابقة أفضل
 */

import { csvHeaderMappings } from './csvHeaderMapping';

export interface FuzzyMatchResult {
  originalHeader: string;
  bestMatch: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'content_analysis' | 'semantic';
  alternatives: Array<{
    header: string;
    confidence: number;
  }>;
}

/**
 * حساب مسافة Levenshtein بين نصين
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * حساب نسبة التشابه بين نصين
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
};

/**
 * تطبيع النص للمقارنة
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '_')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ي]/g, 'ى')
    .replace(/[^\w\u0600-\u06FF]/g, '');
};

/**
 * استخراج الكلمات المفتاحية من النص
 */
const extractKeywords = (text: string): string[] => {
  const keywords = text
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(word => word.length > 2);
  
  return [...new Set(keywords)];
};

/**
 * تحليل المحتوى لتحديد نوع العمود
 */
const analyzeColumnContent = (values: any[]): string[] => {
  const patterns: Array<{type: string, test: (value: any) => boolean}> = [
    {
      type: 'amount',
      test: (value) => !isNaN(parseFloat(String(value).replace(/[^\d.-]/g, '')))
    },
    {
      type: 'payment_date',
      test: (value) => /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(String(value))
    },
    {
      type: 'customer_name',
      test: (value) => String(value).length > 3 && /[a-zA-Z\u0600-\u06FF]/.test(String(value))
    },
    {
      type: 'payment_method',
      test: (value) => ['cash', 'check', 'bank', 'transfer', 'card', 'نقد', 'شيك', 'بنك'].some(method => 
        String(value).toLowerCase().includes(method)
      )
    },
    {
      type: 'contract_number',
      test: (value) => /^[A-Z]{2,4}[-_]?\d{3,6}$/i.test(String(value))
    },
    {
      type: 'reference_number',
      test: (value) => /^[A-Z0-9]{5,15}$/i.test(String(value))
    }
  ];
  
  const sampleSize = Math.min(10, values.length);
  const sample = values.slice(0, sampleSize).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  
  const detectedTypes: string[] = [];
  
  patterns.forEach(pattern => {
    const matches = sample.filter(pattern.test).length;
    const confidence = matches / sample.length;
    
    if (confidence > 0.6) {
      detectedTypes.push(pattern.type);
    }
  });
  
  return detectedTypes;
};

/**
 * المطابق الضبابي الذكي
 */
export const smartFuzzyMatch = (
  originalHeader: string,
  columnValues: any[] = [],
  historicalMappings: Record<string, string> = {}
): FuzzyMatchResult => {
  const normalizedOriginal = normalizeText(originalHeader);
  const originalKeywords = extractKeywords(originalHeader);
  
  // 1. البحث عن مطابقة دقيقة
  const exactMatch = csvHeaderMappings[normalizedOriginal];
  if (exactMatch) {
    return {
      originalHeader,
      bestMatch: exactMatch,
      confidence: 1.0,
      method: 'exact',
      alternatives: []
    };
  }
  
  // 2. البحث في البيانات التاريخية
  if (historicalMappings[normalizedOriginal]) {
    return {
      originalHeader,
      bestMatch: historicalMappings[normalizedOriginal],
      confidence: 0.95,
      method: 'exact',
      alternatives: []
    };
  }
  
  // 3. تحليل المحتوى
  const contentTypes = columnValues.length > 0 ? analyzeColumnContent(columnValues) : [];
  
  // 4. حساب التشابه الضبابي
  const candidates: Array<{header: string, confidence: number, method: string}> = [];
  
  Object.entries(csvHeaderMappings).forEach(([key, value]) => {
    const normalizedKey = normalizeText(key);
    const keyKeywords = extractKeywords(key);
    
    // حساب التشابه النصي
    const textSimilarity = calculateSimilarity(normalizedOriginal, normalizedKey);
    
    // حساب تشابه الكلمات المفتاحية
    const commonKeywords = originalKeywords.filter(kw => 
      keyKeywords.some(kk => calculateSimilarity(kw, kk) > 0.8)
    );
    const keywordSimilarity = commonKeywords.length / Math.max(originalKeywords.length, keyKeywords.length);
    
    // تحسين النتيجة بناءً على تحليل المحتوى
    let contentBoost = 0;
    if (contentTypes.includes(value)) {
      contentBoost = 0.3;
    }
    
    const finalConfidence = Math.max(textSimilarity, keywordSimilarity) + contentBoost;
    
    if (finalConfidence > 0.4) {
      candidates.push({
        header: value,
        confidence: Math.min(finalConfidence, 0.99), // لا نريد ثقة 100% للمطابقة الضبابية
        method: contentBoost > 0 ? 'content_analysis' : 'fuzzy'
      });
    }
  });
  
  // 5. ترتيب المرشحين
  candidates.sort((a, b) => b.confidence - a.confidence);
  
  if (candidates.length === 0) {
    // إذا لم نجد مطابقة، نحاول التخمين الذكي
    const smartGuess = makeSmartGuess(originalHeader, contentTypes);
    return {
      originalHeader,
      bestMatch: smartGuess || originalHeader,
      confidence: smartGuess ? 0.3 : 0,
      method: 'semantic',
      alternatives: []
    };
  }
  
  const bestCandidate = candidates[0];
  const alternatives = candidates.slice(1, 4).map(c => ({
    header: c.header,
    confidence: c.confidence
  }));
  
  return {
    originalHeader,
    bestMatch: bestCandidate.header,
    confidence: bestCandidate.confidence,
    method: bestCandidate.method as any,
    alternatives
  };
};

/**
 * التخمين الذكي للأعمدة غير المعروفة
 */
const makeSmartGuess = (originalHeader: string, contentTypes: string[]): string | null => {
  const header = originalHeader.toLowerCase();
  
  // قواعد التخمين الذكي
  const guessRules = [
    {
      patterns: ['مبلغ', 'amount', 'قيمة', 'value'],
      guess: 'amount'
    },
    {
      patterns: ['تاريخ', 'date', 'يوم', 'day'],
      guess: 'payment_date'
    },
    {
      patterns: ['عميل', 'customer', 'client', 'اسم'],
      guess: 'customer_name'
    },
    {
      patterns: ['هاتف', 'phone', 'تليفون', 'جوال'],
      guess: 'customer_phone'
    },
    {
      patterns: ['رقم', 'number', 'مرجع', 'reference'],
      guess: contentTypes.includes('contract_number') ? 'contract_number' : 'reference_number'
    },
    {
      patterns: ['ملاحظات', 'notes', 'تفاصيل', 'description'],
      guess: 'notes'
    }
  ];
  
  for (const rule of guessRules) {
    if (rule.patterns.some(pattern => header.includes(pattern))) {
      return rule.guess;
    }
  }
  
  // التخمين بناءً على تحليل المحتوى فقط
  if (contentTypes.length === 1) {
    return contentTypes[0];
  }
  
  return null;
};

/**
 * تحديث البيانات التاريخية للتعلم
 */
export const updateHistoricalMappings = (
  originalHeader: string,
  mappedHeader: string,
  confidence: number
): void => {
  const key = `historical_mappings_${Date.now()}`;
  const mapping = {
    originalHeader: normalizeText(originalHeader),
    mappedHeader,
    confidence,
    timestamp: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(mapping));
  } catch (error) {
    console.warn('Could not save historical mapping:', error);
  }
};

/**
 * استرجاع البيانات التاريخية
 */
export const getHistoricalMappings = (): Record<string, string> => {
  const mappings: Record<string, string> = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('historical_mappings_')) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.originalHeader && data.mappedHeader) {
          mappings[data.originalHeader] = data.mappedHeader;
        }
      }
    }
  } catch (error) {
    console.warn('Could not load historical mappings:', error);
  }
  
  return mappings;
};