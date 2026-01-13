// ============================================================================
// MOI Qatar Traffic Violation Regex Patterns
// Optimized patterns for extracting traffic violations from MOI Qatar PDFs
// ============================================================================

// ----------------------------------------------------------------------------
// Violation Number Pattern
// MOI Qatar violation numbers are 10 digits starting with 14, 16, or 33
// Examples: 1400084142, 1600010463, 3312345678
// ----------------------------------------------------------------------------

export const VIOLATION_NUMBER_PATTERNS = [
  // Simple pattern: 10 digits starting with 14, 16, or 33
  /\b(14\d{8})\b/g,
  /\b(16\d{8})\b/g,
  /\b(33\d{8})\b/g,
  // General 10-digit violation number pattern
  /\b([1-3]\d{9})\b/g,
  // With prefix or special formatting
  /(?:رقم المخالفة|المرجع|Reference)?[:\s]*([1-3]\d{9})/gi,
];

// ----------------------------------------------------------------------------
// Date Patterns
// Supports both Arabic and English numerals, multiple formats
// DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD
// ----------------------------------------------------------------------------

// Arabic to English numeral mapping
export const ARABIC_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

export const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/g,
  // YYYY-MM-DD or YYYY/MM/DD
  /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/g,
  // With Arabic month names or text
  /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(\d{4})/gi,
  // English months
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
];

export const ARABIC_MONTH_NAMES: Record<string, number> = {
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
  'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
};

// ----------------------------------------------------------------------------
// Time Patterns
// HH:MM format, 24-hour or 12-hour
// ----------------------------------------------------------------------------

export const TIME_PATTERNS = [
  /\b([01]?\d|2[0-3]):([0-5]\d)(?::(\d{2}))?\b/g, // HH:MM or HH:MM:SS
  /\b([0-1]?\d):([0-5]\d)\s*(AM|PM|ص|م)?\b/gi, // 12-hour format
];

// ----------------------------------------------------------------------------
// Plate Number Patterns
// Multiple formats used in Qatar
// Simple: 123456
// With month: 1/2023
// Qatar format: AB-1234
// ----------------------------------------------------------------------------

export const PLATE_PATTERNS = [
  // Simple 5-6 digit numbers
  /\b(\d{5,6})\b/g,
  // With month: 1/2023, 12/2023
  /\b(\d{1,2})\/(\d{4})\b/g,
  // Qatar format: AB-1234
  /\b([A-Z]{2})[-\-](\d{4})\b/g,
  // With Arabic characters
  /\b[أ-ي]{2,4}[-\-]?\d{4}\b/g,
  // In violation context
  /(?:رقم اللوحة|اللوحة|الصفيحة|Plate)?[:\s]*([A-Z]{0,2}[\-]?\d{4,6})/gi,
];

// ----------------------------------------------------------------------------
// Fine Amount Patterns
// QAR currency with Arabic/English numerals
// 300 ريال, 500 ر.ق, 6000 QAR
// ----------------------------------------------------------------------------

export const AMOUNT_PATTERNS = [
  // Amount with currency indicator (must be followed by currency word)
  /(?:مبلغ|الغرامه|الفائده|المبلغ)\s*(?:المخالفه)?[:\s]*(\d{1,5})\s*(?:ريال|ر\.ق|QAR|قطري)/gi,
  // Simple amount with currency
  /(\d{1,5})\s*(?:ريال|ر\.ق|QAR|ر\.ق\.قطري)/gi,
];

// ----------------------------------------------------------------------------
// Violation Type Patterns
// Arabic keywords for common violation types
// ----------------------------------------------------------------------------

export const VIOLATION_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  keywords: string[];
}> = [
  {
    pattern: /(?:مخالفه|تجاوز)\s*(?:سرعه|السرعه|الحد)/gi,
    type: 'مخالفة سرعة',
    keywords: ['سرعه', 'تجاوز السرعه', 'مخالفه سرعه', 'تخطي السرعه']
  },
  {
    pattern: /(?:عدم|لم)\s*(?:يربط|ربط)\s*(?:حزام|الامان)/gi,
    type: 'عدم ربط حزام الامان',
    keywords: ['حزام', 'حزام الامان', 'عدم ربط حزام الامان']
  },
  {
    pattern: /(?:استخدام|التحدث|الجوال)\s*(?:الهاتف|الجوال|الموبايل)/gi,
    type: 'استخدام الهاتف اثناء القياده',
    keywords: ['هاتف', 'جوال', 'استخدام الهاتف', 'التحدث بالهاتف']
  },
  {
    pattern: /(?:مخالفه|وقوف|ركن)\s*(?:ممنوع|غير)/gi,
    type: 'مخالفة وقوف',
    keywords: ['وقوف ممنوع', 'مخالفه وقوف', 'وقوف غير قانوني']
  },
  {
    pattern: /(?:عدم)\s*(?:الانصياع|الالتزام)\s*(?:اشاره|مرور)/gi,
    type: 'عدم الانصياع للاشاره',
    keywords: ['عدم الانصياع', 'مخالفه اشاره', 'تجاوز اشاره حمراء']
  },
  {
    pattern: /(?:مخالفه|قياده)\s*(?:عكس)\s*(?:السير|الاتجاه)/gi,
    type: 'قياده عكس السير',
    keywords: ['عكس السير', 'قياده عكس الاتجاه']
  },
  {
    pattern: /(?:تخطي|عدم)\s*(?:الخط)\s*(?:الابيض|المتصل)/gi,
    type: 'تخطي الخط الابيض',
    keywords: ['تخطي الخط', 'عدم التقيد بالخط الابيض']
  },
];

// ----------------------------------------------------------------------------
// Location Patterns
// Common locations in Qatar
// ----------------------------------------------------------------------------

export const LOCATION_PATTERNS = [
  /(?:مكان|موقع|المنطقة|الشارع|في)?[:\s]*([أ-ي\s]+(?:الدائري|الطريق|الشارع|الجسر|الميدان)[أ-ي0-9\s]*)/gi,
  /(?:الدائري|الطريق|الشارع|الجسر|الميدان)[:\s]*([أ-ي0-9\s]+)/gi,
];

// Common location keywords
export const LOCATION_KEYWORDS = [
  'الدائري الاول', 'الدائري الثاني', 'الدائري الثالث', 'الدائري الرابع', 'الدائري الخامس', 'الدائري السادس', 'الدائري السابع', 'الدائري الثامن',
  'طريق سلوى', 'طريق لوسيل', 'طريقه الدوحه', 'طريق الشمال', 'طريق الخور',
  'شارع الوكره', 'شارع الريان', 'شارع الخليج', 'شارع المطار',
  'جسر الفيرجاون', 'جسر المطار',
  'ميدان الخليج', 'ميدان الوكره',
];

// ----------------------------------------------------------------------------
// Header Data Patterns
// For extracting file number, vehicle plate, owner name from PDF header
// ----------------------------------------------------------------------------

export const FILE_NUMBER_PATTERN = /(?:رقم الملف|ملف|File)?[:\s]*(\d{2}\-\d{4}\-\d{2})/gi;
export const OWNER_NAME_PATTERN = /(?:اسم المالك|المالك|Owner)?[:\s]*([ا-ي\s]+(?:ال|بن|ابن)?[ا-ي\s]+)/gi;
export const TOTAL_VIOLATIONS_PATTERN = /(?:عدد|اجمالي|العدد)\s*(?:المخالفات)?[:\s]*(\d+)/gi;
export const TOTAL_AMOUNT_PATTERN = /(?:اجمالي|المجموع)\s*(?:المبالغ)?[:\s]*(\d+)\s*(?:ريال)?/gi;

// ----------------------------------------------------------------------------
// Context Patterns
// To identify violation blocks in the text
// ----------------------------------------------------------------------------

export const VIOLATION_BLOCK_PATTERN = /(?:مخالفة|Violation|تفاصيل)[\s\S]*?(?=\n\nمخالفة|\n\nViolation|\n\n*$|$)/gi;

// Pattern to separate individual violations
export const VIOLATION_SEPARATOR_PATTERN = /\n\s*\n|\r\n\s*\r\n|===+|---+/;

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Convert Arabic numerals to English
 */
export function convertArabicNumerals(text: string): string {
  let result = text;
  for (const [arabic, english] of Object.entries(ARABIC_NUMERALS)) {
    result = result.replace(new RegExp(arabic, 'g'), english);
  }
  return result;
}

/**
 * Normalize Arabic text for better matching
 */
export function normalizeArabicText(text: string): string {
  return text
    // Normalize alef variants
    .replace(/[آإأ]/g, 'ا')
    // Normalize ya variants
    .replace(/[ىي]/g, 'ي')
    // Normalize ta marbuta
    .replace(/ة/g, 'ه')
    // Remove diacritics
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract all matches from a pattern with their indices
 */
export function extractAllMatches(pattern: RegExp, text: string): Array<{ match: string; index: number; groups: string[] }> {
  const matches: Array<{ match: string; index: number; groups: string[] }> = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      groups: match.slice(1)
    });
  }

  return matches;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Normalize date to YYYY-MM-DD format
 */
export function normalizeDate(dateString: string): string | null {
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateString.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = dateString.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (ymdMatch) {
    return ymdMatch[0].replace(/\//g, '-');
  }

  return null;
}
