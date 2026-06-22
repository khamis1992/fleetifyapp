/**
 * مكتبة استخراج أرقام العقود من النصوص
 * تتعرف على أنماط مختلفة من أرقام العقود والاتفاقيات
 */

export interface ContractNumberMatch {
  contractNumber: string;
  confidence: number;
  source: 'direct' | 'extracted';
  pattern?: string;
}

/**
 * أنماط أرقام العقود المختلفة
 */
export const contractPatterns = [
  // LTO patterns (أرقام اتفاقيات الايجار)
  {
    pattern: /LTO\d{7}/gi,
    confidence: 0.95,
    description: 'LTO + 7 digits'
  },
  {
    pattern: /LTO\d{4,6}/gi,
    confidence: 0.85,
    description: 'LTO + 4-6 digits'
  },
  
  // RNT patterns (أرقام عقود الايجار)
  {
    pattern: /RNT\d{5,7}/gi,
    confidence: 0.9,
    description: 'RNT + 5-7 digits'
  },
  
  // CON patterns (أرقام العقود العامة)
  {
    pattern: /CON[-_]?\d{3,6}/gi,
    confidence: 0.8,
    description: 'CON + optional separator + 3-6 digits'
  },
  
  // AGR patterns (أرقام الاتفاقيات)
  {
    pattern: /AGR[-_]?\d{3,6}/gi,
    confidence: 0.8,
    description: 'AGR + optional separator + 3-6 digits'
  },
  
  // Generic contract patterns
  {
    pattern: /\b\d{6,8}\b/g,
    confidence: 0.4,
    description: '6-8 digit numbers (generic)'
  },
  
  // Arabic patterns
  {
    pattern: /عقد[-_\s]?\d{3,7}/gi,
    confidence: 0.7,
    description: 'Arabic contract + digits'
  },
  
  {
    pattern: /اتفاقية[-_\s]?\d{3,7}/gi,
    confidence: 0.7,
    description: 'Arabic agreement + digits'
  }
];

/**
 * استخراج أرقام العقود من نص
 */
export const extractContractNumbers = (text: string): ContractNumberMatch[] => {
  if (!text || typeof text !== 'string') return [];
  
  const matches: ContractNumberMatch[] = [];
  const cleanText = text.trim();
  
  // البحث عن كل نمط
  for (const { pattern, confidence, description } of contractPatterns) {
    const found = cleanText.match(pattern);
    
    if (found) {
      for (const match of found) {
        const cleanMatch = match.trim().toUpperCase();
        
        // تجنب التكرارات
        if (!matches.some(m => m.contractNumber === cleanMatch)) {
          matches.push({
            contractNumber: cleanMatch,
            confidence,
            source: 'extracted',
            pattern: description
          });
        }
      }
    }
  }
  
  // ترتيب النتائج حسب مستوى الثقة
  return matches.sort((a, b) => b.confidence - a.confidence);
};

/**
 * استخراج رقم العقد من حقول متعددة
 */
export const extractContractFromPaymentData = (paymentData: any): ContractNumberMatch | null => {
  const fieldsToCheck = [
    'agreement_number',
    'contract_number', 
    'notes',
    'description',
    'reference_number',
    'payment_number'
  ];
  
  // فحص الحقول المباشرة أولاً
  for (const field of ['agreement_number', 'contract_number']) {
    const value = paymentData[field];
    if (value && String(value).trim()) {
      return {
        contractNumber: String(value).trim().toUpperCase(),
        confidence: 1.0,
        source: 'direct'
      };
    }
  }
  
  // استخراج من النصوص
  for (const field of fieldsToCheck) {
    const value = paymentData[field];
    if (value && String(value).trim()) {
      const extracted = extractContractNumbers(String(value));
      if (extracted.length > 0) {
        return extracted[0]; // إرجاع أفضل تطابق
      }
    }
  }
  
  return null;
};

/**
 * تنظيف وتوحيد رقم العقد
 */
export const normalizeContractNumber = (contractNumber: string): string => {
  if (!contractNumber) return '';
  
  return contractNumber
    .trim()
    .toUpperCase()
    .replace(/[-_\s]+/g, '') // إزالة الفواصل والمسافات
    .replace(/^0+/, ''); // إزالة الأصفار المبدئية
};

/**
 * مقارنة أرقام العقود مع التساهل في التنسيق
 */
export const compareContractNumbers = (num1: string, num2: string): number => {
  if (!num1 || !num2) return 0;
  
  const normalized1 = normalizeContractNumber(num1);
  const normalized2 = normalizeContractNumber(num2);
  
  // تطابق تام
  if (normalized1 === normalized2) return 1.0;
  
  // تطابق جزئي (يحتوي على)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const longer = Math.max(normalized1.length, normalized2.length);
    const shorter = Math.min(normalized1.length, normalized2.length);
    return shorter / longer * 0.8; // تقييم أقل للتطابق الجزئي
  }
  
  // لا يوجد تطابق
  return 0;
};

/**
 * التحقق من صحة رقم العقد
 */
export const isValidContractNumber = (contractNumber: string): boolean => {
  if (!contractNumber || typeof contractNumber !== 'string') return false;
  
  const normalized = normalizeContractNumber(contractNumber);
  
  // يجب أن يحتوي على أرقام على الأقل
  if (!/\d/.test(normalized)) return false;
  
  // يجب أن يكون طوله معقول
  if (normalized.length < 2 || normalized.length > 20) return false;
  
  return true;
};