/**
 * نظام موحد لتنسيق الأرقام - دعم الأرقام العربية والإنجليزية
 */

// تحويل الأرقام العربية إلى إنجليزية
const ARABIC_TO_ENGLISH_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// تحويل الأرقام الإنجليزية إلى عربية
const ENGLISH_TO_ARABIC_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
};

/**
 * تحويل الأرقام العربية إلى إنجليزية
 */
export const normalizeArabicDigits = (input: string): string => {
  if (!input) return '';
  return input.replace(/[٠-٩]/g, (digit) => ARABIC_TO_ENGLISH_DIGITS[digit] || digit);
};

/**
 * تحويل الأرقام الإنجليزية إلى عربية
 */
export const convertToArabicDigits = (input: string): string => {
  if (!input) return '';
  return input.replace(/[0-9]/g, (digit) => ENGLISH_TO_ARABIC_DIGITS[digit] || digit);
};

/**
 * تنظيف النص وإزالة أي رموز غير رقمية (عدا النقطة العشرية والفاصلة)
 */
export const cleanNumericString = (input: string): string => {
  const normalized = normalizeArabicDigits(input);
  // الحفاظ على النقطة العشرية والفاصلة والإشارة السالبة
  return normalized.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
};

/**
 * تحويل النص إلى رقم مع التعامل مع الأرقام العربية
 */
export const parseNumber = (input: string | number): number => {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  
  const cleaned = cleanNumericString(input.toString());
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * تنسيق الرقم حسب التفضيل (عربي أو إنجليزي)
 */
export interface NumberFormatOptions {
  useArabicDigits?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
}

export const formatNumber = (
  value: number | string, 
  options: NumberFormatOptions = {}
): string => {
  const {
    useArabicDigits = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 3,
    locale = 'en-US'
  } = options;

  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (isNaN(numValue)) return '0';

  // تنسيق الرقم بالطريقة الإنجليزية أولاً
  const formatted = numValue.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  // تحويل إلى أرقام عربية إذا كان مطلوباً
  return useArabicDigits ? convertToArabicDigits(formatted) : formatted;
};

/**
 * تحديد ما إذا كان النص يحتوي على أرقام عربية
 */
export const hasArabicDigits = (input: string): boolean => {
  return /[٠-٩]/.test(input);
};

/**
 * تحديد ما إذا كان النص يحتوي على أرقام إنجليزية
 */
export const hasEnglishDigits = (input: string): boolean => {
  return /[0-9]/.test(input);
};

/**
 * تحديد نوع الأرقام المستخدمة في النص
 */
export const detectDigitType = (input: string): 'arabic' | 'english' | 'mixed' | 'none' => {
  const hasArabic = hasArabicDigits(input);
  const hasEnglish = hasEnglishDigits(input);
  
  if (hasArabic && hasEnglish) return 'mixed';
  if (hasArabic) return 'arabic';
  if (hasEnglish) return 'english';
  return 'none';
};

/**
 * توحيد جميع الأرقام في النص إلى نوع واحد
 */
export const unifyDigits = (input: string, targetType: 'arabic' | 'english' = 'english'): string => {
  if (!input) return '';
  
  if (targetType === 'english') {
    return normalizeArabicDigits(input);
  } else {
    // تحويل إلى إنجليزي أولاً ثم إلى عربي لضمان التوحيد
    const normalized = normalizeArabicDigits(input);
    return convertToArabicDigits(normalized);
  }
};

/**
 * Get default number formatting preferences for the company
 */
export const getNumberPreferences = (): NumberFormatOptions => {
  return {
    useArabicDigits: false, // Force English digits
    locale: 'en-US', // Use English locale for consistent formatting
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  };
};

/**
 * تنسيق رقم باستخدام تفضيلات الشركة
 */
export const formatNumberWithPreferences = (
  value: number | string,
  customOptions: Partial<NumberFormatOptions> = {}
): string => {
  const preferences = getNumberPreferences();
  const options = { ...preferences, ...customOptions };
  
  return formatNumber(value, options);
};