/**
 * Contract Data Extraction Service
 * Parses extracted text from contract PDFs and identifies key fields
 * 
 * Features:
 * - Smart pattern matching with learned patterns
 * - Caching of extraction results
 * - Confidence-based field validation
 */

import { getContractTemplateService } from './contractTemplateService';

export interface ExtractedContractFields {
  // Customer information
  customerName?: string;
  qatariId?: string;
  phoneNumbers?: string[];
  licenseNumber?: string;

  // Vehicle information
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  plateNumber?: string;

  // Contract information
  contractNumber?: string;
  contractDate?: string;
  startDate?: string;
  endDate?: string;

  // Financial information
  contractAmount?: number;
  monthlyAmount?: number;
  paymentMethod?: string; // بنكي, نقدي, etc.
  paymentCycle?: string; // شهري, أسبوعي, etc.

  // Raw extraction data
  confidence: number;
  rawText: string;
  extractionErrors: string[];
  
  // Metadata
  extractionTimeMs?: number;
  usedLearnedPatterns?: boolean;
}

// Cache for recently extracted texts (avoids re-processing)
const extractionCache = new Map<string, ExtractedContractFields>();
const CACHE_MAX_SIZE = 20;

/**
 * Generate a cache key from text (first 200 chars + length)
 */
function getCacheKey(text: string): string {
  return `${text.substring(0, 200)}_${text.length}`;
}

/**
 * Main function to extract contract fields from text
 * Uses learned patterns when available for faster extraction
 */
export function extractContractFields(text: string): ExtractedContractFields {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = getCacheKey(text);
  const cached = extractionCache.get(cacheKey);
  if (cached) {
    console.log('📝 [Contract Extractor] Using cached result');
    return { ...cached };
  }
  
  const errors: string[] = [];
  const fields: ExtractedContractFields = {
    confidence: 0,
    rawText: text,
    extractionErrors: errors,
  };

  // Get learned patterns from template service
  let usedLearnedPatterns = false;
  try {
    const templateService = getContractTemplateService();
    const template = templateService.getBestTemplate();
    
    // Try learned patterns first (faster)
    if (template.successCount > 0) {
      console.log('📝 [Contract Extractor] Using learned patterns from template:', template.name);
      usedLearnedPatterns = true;
      
      // Extract using learned patterns
      fields.customerName = extractWithLearnedPatterns(text, template.patterns.customerName) || extractCustomerName(text);
      fields.qatariId = extractWithLearnedPatterns(text, template.patterns.qatariId) || extractQatariId(text);
      fields.plateNumber = extractWithLearnedPatterns(text, template.patterns.plateNumber) || extractPlateNumber(text);
      fields.startDate = extractWithLearnedPatterns(text, template.patterns.startDate) || extractStartDate(text);
      fields.endDate = extractWithLearnedPatterns(text, template.patterns.endDate) || extractEndDate(text);
      
      const monthlyStr = extractWithLearnedPatterns(text, template.patterns.monthlyAmount);
      if (monthlyStr) {
        const parsed = parseFloat(monthlyStr.replace(/,/g, ''));
        if (!isNaN(parsed)) fields.monthlyAmount = parsed;
      }
    }
  } catch (error) {
    console.warn('📝 [Contract Extractor] Template service not available, using default patterns');
  }

  // Log for debugging (only first extraction)
  if (!usedLearnedPatterns) {
    console.log('📝 [Contract Extractor] Raw text length:', text.length);
    console.log('📝 [Contract Extractor] First 300 chars:', text.substring(0, 300));
  }

  // Fill in any missing fields with default extraction
  if (!fields.customerName) fields.customerName = extractCustomerName(text);
  if (!fields.qatariId) fields.qatariId = extractQatariId(text);
  if (!fields.phoneNumbers) fields.phoneNumbers = extractPhoneNumbers(text);
  if (!fields.licenseNumber) fields.licenseNumber = extractLicenseNumber(text);

  // Extract vehicle information
  if (!fields.vehicleMake) fields.vehicleMake = extractVehicleMake(text);
  if (!fields.vehicleModel) fields.vehicleModel = extractVehicleModel(text);
  if (!fields.vehicleYear) fields.vehicleYear = extractVehicleYear(text);
  if (!fields.plateNumber) fields.plateNumber = extractPlateNumber(text);

  // Extract contract number and dates
  if (!fields.contractNumber) fields.contractNumber = extractContractNumber(text);
  if (!fields.contractDate) fields.contractDate = extractContractDate(text);
  if (!fields.startDate) fields.startDate = extractStartDate(text);
  if (!fields.endDate) fields.endDate = extractEndDate(text);

  // Extract financial information
  if (!fields.contractAmount) fields.contractAmount = extractContractAmount(text);
  if (!fields.monthlyAmount) fields.monthlyAmount = extractMonthlyAmount(text);
  if (!fields.paymentMethod) fields.paymentMethod = extractPaymentMethod(text);
  if (!fields.paymentCycle) fields.paymentCycle = extractPaymentCycle(text);

  // Calculate confidence based on extracted fields
  fields.confidence = calculateConfidence(fields);
  fields.extractionTimeMs = Date.now() - startTime;
  fields.usedLearnedPatterns = usedLearnedPatterns;

  // Cache the result
  if (extractionCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry
    const firstKey = extractionCache.keys().next().value;
    if (firstKey) extractionCache.delete(firstKey);
  }
  extractionCache.set(cacheKey, { ...fields, rawText: '' }); // Don't cache rawText

  console.log(`📝 [Contract Extractor] Completed in ${fields.extractionTimeMs}ms, confidence: ${Math.round(fields.confidence * 100)}%`);

  return fields;
}

/**
 * Extract using learned regex patterns
 */
function extractWithLearnedPatterns(text: string, patterns: string[]): string | undefined {
  if (!patterns || patterns.length === 0) return undefined;
  
  for (const patternStr of patterns) {
    try {
      const pattern = new RegExp(patternStr, 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (error) {
      // Invalid regex pattern, skip
    }
  }
  
  return undefined;
}

/**
 * Clear extraction cache
 */
export function clearExtractionCache(): void {
  extractionCache.clear();
  console.log('📝 [Contract Extractor] Cache cleared');
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract customer name (Arabic or English)
 */
function extractCustomerName(text: string): string | undefined {
  // Look for patterns like "اسم العميل: يوسف الخليلي" or "Second Party: YOUSSEF KHALILI"
  const patterns = [
    /اسم\s*العميل[:\s]+([أ-ي\s]+)/i,
    /العميل[:\s]+([أ-ي\s]+)/i,
    /اسم\s*المستأجر[:\s]+([أ-ي\s]+)/i,
    /المستأجر[:\s]+([أ-ي\s]+)/i,
    /الطرف\s*الثاني[:\s]+([أ-ي\s]+)/i,
    // English patterns
    /Second\s*Party[:\s]+([A-Z\s]+)/i,
    /Lessee[:\s]+([A-Z\s]+)/i,
    /Name[:\s]+([A-Z\s]+)/i,
    // Mixed patterns - look for Arabic name after English label
    /يوسف\s+[\u0600-\u06FF\s]+/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length > 2 && name.length < 100) {
        return name;
      }
    } else if (match && match[0]) {
      // For patterns without capture groups
      const name = match[0].trim().replace(/\s+/g, ' ');
      if (name.length > 2 && name.length < 100) {
        return name;
      }
    }
  }

  return undefined;
}

/**
 * Extract Qatari ID (11 digits)
 */
function extractQatariId(text: string): string | undefined {
  // Qatari ID pattern: 11 digits, optionally formatted with spaces/dashes
  const patterns = [
    /رقم\s*الهوية[:\s]*([\d\s\-]+)/i,
    /الهوية[:\s]*([\d\s\-]+)/i,
    /رقم\s*البطاقة[:\s]*([\d\s\-]+)/i,
    /البطاقة[:\s]*([\d\s\-]+)/i,
    /رقم\s*الشخصي[:\s]*([\d\s\-]+)/i,
    /(?:الإثارة|الإثارة)\s*الشخصية[:\s]*([\d\s\-]+)/i,
    // English patterns
    /QID\s*(?:No)?[:\s]*([\d\s\-]+)/i,
    /License\s*No[:\s]*([\d\s\-]+)/i,
    // Direct 11-digit pattern
    /\b(\d{11})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const id = match[1].replace(/[\s\-]/g, '');
      if (/^\d{11}$/.test(id)) {
        return id;
      }
    }
  }

  return undefined;
}

/**
 * Extract phone numbers (Qatar format: 8 digits, optionally with +974 or 33/55/66/77 prefix)
 */
function extractPhoneNumbers(text: string): string[] | undefined {
  const patterns = [
    /\+?974?\s*([345678]\d{7})\b/g,
    /(\d{4})\s*(\d{4})/g,
  ];

  const phones = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phone = match[1] || (match[2] ? match[1] + match[2] : '');
      if (phone && phone.length >= 7) {
        phones.add(phone.replace(/\s/g, ''));
      }
    }
  }

  // Look for phone keywords
  const phoneKeywordPattern = /(?:الهاتف|الجوال|رقم\s*الهاتف|رقم\s*الجوال)[:\s]*([+\d\s]+)/gi;
  let keywordMatch;
  while ((keywordMatch = phoneKeywordPattern.exec(text)) !== null) {
    const phone = keywordMatch[1].replace(/[\s\-\(\)]/g, '').replace(/^\+?974/, '');
    if (/^\d{8}$/.test(phone)) {
      phones.add(phone);
    }
  }

  return phones.size > 0 ? Array.from(phones) : undefined;
}

/**
 * Extract license number
 */
function extractLicenseNumber(text: string): string | undefined {
  const patterns = [
    /رقم\s*الرخصة[:\s]*([\d\s\-]+)/i,
    /الرخصة[:\s]*([\d\s\-]+)/i,
    /رقم\s*القيادة[:\s]*([\d\s\-]+)/i,
    /رخصة\s*القيادة[:\s]*([\d\s\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const license = match[1].replace(/[\s\-]/g, '');
      if (/^\d{6,10}$/.test(license)) {
        return license;
      }
    }
  }

  return undefined;
}

/**
 * Vehicle make to models mapping for validation
 */
const VEHICLE_DATABASE: { [make: string]: { arabic: string; models: string[] } } = {
  'toyota': { arabic: 'تويوتا', models: ['hilux', 'corolla', 'camry', 'yaris', 'land cruiser', 'fortuner', 'rav4', 'prado'] },
  'nissan': { arabic: 'نيسان', models: ['sentra', 'altima', 'patrol', 'sunny', 'kicks', 'x-trail', 'navara'] },
  'hyundai': { arabic: 'هيونداي', models: ['accent', 'elantra', 'sonata', 'tucson', 'santa fe', 'creta', 'i10', 'i20'] },
  'kia': { arabic: 'كيا', models: ['cerato', 'sportage', 'sorento', 'seltos', 'k5', 'rio', 'picanto', 'carnival'] },
  'honda': { arabic: 'هوندا', models: ['accord', 'civic', 'cr-v', 'crv', 'hr-v', 'hrv', 'city', 'pilot'] },
  'ford': { arabic: 'فورد', models: ['f-150', 'f150', 'explorer', 'escape', 'fusion', 'mustang', 'ranger'] },
  'chevrolet': { arabic: 'شفروليه', models: ['impala', 'malibu', 'captiva', 'tahoe', 'silverado', 'trax', 'equinox'] },
  'mitsubishi': { arabic: 'ميتسوبيشي', models: ['pajero', 'outlander', 'montero', 'lancer', 'attrage', 'eclipse'] },
  'mazda': { arabic: 'مازدا', models: ['3', '6', 'cx-5', 'cx5', 'cx-30', 'cx30', 'cx-9', 'cx9'] },
  'bmw': { arabic: 'بي إم دبليو', models: ['x1', 'x3', 'x5', 'x7', '3 series', '5 series', '7 series'] },
  'mercedes': { arabic: 'مرسيدس', models: ['c-class', 'e-class', 's-class', 'gla', 'glc', 'gle', 'gls', 'a-class'] },
  'volkswagen': { arabic: 'فولكس واجن', models: ['golf', 'passat', 'tiguan', 'jetta', 'arteon', 'id.4'] },
  'audi': { arabic: 'أودي', models: ['a3', 'a4', 'a6', 'a8', 'q3', 'q5', 'q7', 'q8'] },
  'lexus': { arabic: 'لكزس', models: ['es', 'is', 'ls', 'rx', 'nx', 'lx', 'gx', 'ux'] },
  'bestune': { arabic: 'بيستون', models: ['t77', 't99', 't55', 't33', 'b70', 'b90'] },
  'geely': { arabic: 'جيلي', models: ['coolray', 'emgrand', 'azkarra', 'okavango', 'starray'] },
  'chery': { arabic: 'شيري', models: ['tiggo 7', 'tiggo 8', 'arrizo', 'x70', 'x90', 'x95'] },
  'haval': { arabic: 'هافال', models: ['jolion', 'h6', 'h9', 'dargo', 'big dog'] },
  'mg': { arabic: 'إم جي', models: ['5', 'zs', 'hs', 'rx5', 'gt', 'marvel r'] },
  'jac': { arabic: 'جاك', models: ['s2', 's3', 's4', 's7', 'j7', 't6', 't8'] },
  'changan': { arabic: 'شانجان', models: ['cs35', 'cs55', 'cs75', 'cs85', 'eado', 'uni-t', 'uni-k'] },
  'great wall': { arabic: 'جريت وول', models: ['poer', 'wingle', 'tank 300', 'tank 500'] },
};

/**
 * Extract vehicle make - improved to validate with model context
 */
function extractVehicleMake(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // First, try to find make-model combinations to ensure accuracy
  for (const [make, info] of Object.entries(VEHICLE_DATABASE)) {
    // Check if make exists in text
    if (!lowerText.includes(make) && !text.includes(info.arabic)) {
      continue;
    }

    // If make is found, check if any of its models are also present
    const hasModel = info.models.some(model => lowerText.includes(model.toLowerCase()));
    
    if (hasModel) {
      // Validated: both make and one of its models found
      console.log(`[Vehicle Extractor] Validated: ${make} with matching model`);
      return info.arabic;
    }
  }

  // Second pass: just find any make without validation (less reliable)
  for (const [make, info] of Object.entries(VEHICLE_DATABASE)) {
    if (lowerText.includes(make) || text.includes(info.arabic)) {
      console.log(`[Vehicle Extractor] Found make without model validation: ${make}`);
      return info.arabic;
    }
  }

  return undefined;
}

/**
 * Extract vehicle model - improved to work with VEHICLE_DATABASE
 */
function extractVehicleModel(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  // Extended models list with Arabic names
  const modelsWithArabic: { [key: string]: string } = {
    'hilux': 'هيلكس',
    'corolla': 'كورولا',
    'camry': 'كامري',
    'yaris': 'يارس',
    'sentra': 'سنترا',
    'altima': 'ألتيما',
    'patrol': 'باترول',
    'land cruiser': 'لاند كروزر',
    'fortuner': 'فورتشنر',
    'rav4': 'راف فور',
    'cr-v': 'سي آر في',
    'crv': 'سي آر في',
    'accord': 'أكورد',
    'civic': 'سيفيك',
    'accent': 'أكسنت',
    'elantra': 'إلنترا',
    'sonata': 'سوناتا',
    'sportage': 'سبورتاج',
    'cerato': 'سيراتو',
    'tucson': 'توسان',
    'impala': 'إمبالا',
    'captiva': 'كابتيفا',
    'f-150': 'إف-150',
    'f150': 'إف-150',
    't77': 'تي77',
    't99': 'تي99',
    't55': 'تي55',
    't33': 'تي33',
    'x70': 'إكس70',
    'x90': 'إكس90',
    'jolion': 'جوليون',
    'h6': 'إتش6',
    'h9': 'إتش9',
    'coolray': 'كول راي',
    'emgrand': 'إمجراند',
    'prado': 'برادو',
    'sunny': 'صني',
    'kicks': 'كيكس',
    'creta': 'كريتا',
    'seltos': 'سيلتوس',
    'sorento': 'سورينتو',
    'santa fe': 'سانتا في',
    'city': 'سيتي',
    'pilot': 'بايلوت',
    'explorer': 'إكسبلورر',
    'ranger': 'رينجر',
    'tahoe': 'تاهو',
    'silverado': 'سلفرادو',
    'pajero': 'باجيرو',
    'outlander': 'أوتلاندر',
    'attrage': 'أتراج',
  };

  // Check for model keywords first
  const modelKeywordPatterns = [
    /(?:Model|الموديل|النوع)[:\s]*([A-Za-z0-9\s\-]+)/i,
  ];
  
  for (const pattern of modelKeywordPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const modelName = match[1].trim();
      if (modelName.length > 1 && modelName.length < 30) {
        console.log(`[Vehicle Extractor] Found model from keyword: ${modelName}`);
        return modelName;
      }
    }
  }

  // Search for known models
  for (const [english, arabic] of Object.entries(modelsWithArabic)) {
    if (lowerText.includes(english) || text.includes(arabic)) {
      console.log(`[Vehicle Extractor] Found model: ${english}`);
      return english.charAt(0).toUpperCase() + english.slice(1);
    }
  }

  return undefined;
}

/**
 * Extract vehicle year
 */
function extractVehicleYear(text: string): string | undefined {
  // Match years between 2000 and 2030
  const match = text.match(/\b(20[0-2][0-9]|2030)\b/);
  if (match) {
    return match[1];
  }

  // Check for Hijri years (1440-1460)
  const hijriMatch = text.match(/\b(14[4-5][0-9]|1460)\b/);
  if (hijriMatch) {
    return hijriMatch[1];
  }

  return undefined;
}

/**
 * Extract plate number
 */
function extractPlateNumber(text: string): string | undefined {
  const patterns = [
    /رقم\s*اللوحة[:\s]*([A-Z0-9\s\-]+)/i,
    /اللوحة[:\s]*([A-Z0-9\s\-]+)/i,
    /لوحة\s*المركبة[:\s]*([A-Z0-9\s\-]+)/i,
    // English patterns
    /Reg\.?\s*(?:No?|N)[:\s]*(\d{4,7})/i,
    /Registration\s*(?:No?|N)[:\s]*(\d{4,7})/i,
    /Plate\s*(?:No?|N)?[:\s]*(\d{4,7})/i,
    // Specific keyword followed by number
    /(?:اللوحة|لوحة)[:\s]*(\d{4,7})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const plate = match[1].replace(/[\s\-]/g, '');
      // Qatar plates can be 4-7 digits, but exclude years (2000-2030)
      if (/^\d{4,7}$/.test(plate)) {
        const asNumber = parseInt(plate);
        // Exclude values that look like years
        if (asNumber < 2000 || asNumber > 2030) {
          return plate;
        }
      }
    }
  }

  // Second pass: look for plate-like numbers that aren't years
  const allNumbers = text.match(/\b(\d{4,7})\b/g) || [];
  for (const numStr of allNumbers) {
    const num = parseInt(numStr);
    // Skip if it looks like a year (2000-2030)
    if (num >= 2000 && num <= 2030) continue;
    // Skip if it's the Qatari ID
    if (numStr.length === 11) continue;
    // Valid plate number
    return numStr;
  }

  return undefined;
}

/**
 * Extract contract number
 */
function extractContractNumber(text: string): string | undefined {
  const patterns = [
    /رقم\s*العقد[:\s]*([A-Z0-9\-\s]+)/i,
    /العقد\s*رقم[:\s]*([A-Z0-9\-\s]+)/i,
    // English patterns
    /Agreement\s*(?:No?|N)[:\s]*([A-Z0-9\-\s]+)/i,
    /Contract\s*(?:No?|N)[:\s]*([A-Z0-9\-\s]+)/i,
    /(?:LTO|CON|AGR)[:\s\-]*(\d{4}[\-\s]*\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const contractNum = match[1].trim().replace(/\s+/g, ' ');
      if (contractNum.length > 2 && contractNum.length < 50) {
        return contractNum;
      }
    }
  }

  return undefined;
}

/**
 * Extract contract date
 */
function extractContractDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*العقد[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /عقد\s*بتاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /التاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /اعتبارا\s*من\s*تاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /من\s*تاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    // English patterns
    /effective\s*on[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /dated?[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    // Generic date pattern at start
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Flexible date pattern that matches multiple formats
 */
const DATE_PATTERN = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g;

/**
 * Parse date string to standardized format (DD/MM/YYYY)
 */
function parseDate(dateStr: string): string | undefined {
  const match = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!match) return undefined;
  
  let [, day, month, year] = match;
  
  // Handle 2-digit years
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
  }
  
  // Validate
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1990 || yearNum > 2050) {
    return undefined;
  }
  
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Extract all dates from text
 */
function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  let match;
  
  while ((match = DATE_PATTERN.exec(text)) !== null) {
    const parsed = parseDate(match[0]);
    if (parsed) {
      dates.push(parsed);
    }
  }
  
  return dates;
}

/**
 * Extract start date
 */
function extractStartDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*البداية[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /من\s*تاريخ[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /ابتداء\s*من[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /يبدأ\s*من[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /اعتبارا\s*من[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    // English patterns
    /(?:Start|From|Effective)\s*(?:Date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Commencing|Beginning)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) {
        console.log(`[Date Extractor] Found start date: ${parsed}`);
        return parsed;
      }
    }
  }

  // Fallback: if we found dates, assume first date is start date
  const allDates = extractAllDates(text);
  if (allDates.length > 0) {
    console.log(`[Date Extractor] Using first date as start: ${allDates[0]}`);
    return allDates[0];
  }

  return undefined;
}

/**
 * Extract end date
 */
function extractEndDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*النهاية[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /إلى\s*تاريخ[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /وينتهي\s*بتاريخ[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /حتى[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /ينتهي\s*في[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    // English patterns
    /(?:End|To|Until|Expiry)\s*(?:Date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Ending|Termination)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) {
        console.log(`[Date Extractor] Found end date: ${parsed}`);
        return parsed;
      }
    }
  }

  // Fallback: if we found multiple dates, assume second date is end date
  const allDates = extractAllDates(text);
  if (allDates.length > 1) {
    console.log(`[Date Extractor] Using second date as end: ${allDates[1]}`);
    return allDates[1];
  }

  return undefined;
}

/**
 * Extract contract amount
 */
function extractContractAmount(text: string): number | undefined {
  const patterns = [
    /قيمة\s*العقد[:\s]*[\d,]+\.?\d*/i,
    /القيمة\s*الإجمالية[:\s]*[\d,]+\.?\d*/i,
    /إجمالي\s*المبلغ[:\s]*[\d,]+\.?\d*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      const amount = match[0].match(/[\d,]+\.?\d*/);
      if (amount) {
        const parsed = parseFloat(amount[0].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract monthly amount
 */
function extractMonthlyAmount(text: string): number | undefined {
  const patterns = [
    /القيمة\s*الشهرية[:\s]*[\d,]+\.?\d*/i,
    /المبلغ\s*الشهري[:\s]*[\d,]+\.?\d*/i,
    /الإيجار\s*الشهري[:\s]*[\d,]+\.?\d*/i,
    /شهريا[:\s]*[\d,]+\.?\d*/i,
    /ريال\s*شهريا[:\s]*[\d,]+\.?\d*/i,
    /ر\.ق\s*شهريا[:\s]*[\d,]+\.?\d*/i,
    // English patterns
    /monthly\s*rental[:\s]*(?:QAR\s*)?([\d,]+\.?\d*)/i,
    /QAR\s*([\d,]+\.?\d*)\s*(?:monthly|شهري)/i,
    /rent[:\s]*(?:QAR\s*)?([\d,]+\.?\d*)/i,
    // Direct QAR amount pattern
    /QAR\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to get the captured group first, then fall back to the whole match
      const amountStr = match[1] || match[0];
      const amountMatch = amountStr.match(/[\d,]+\.?\d*/);
      if (amountMatch) {
        const parsed = parseFloat(amountMatch[0].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract payment method
 */
function extractPaymentMethod(text: string): string | undefined {
  if (/بنكي/i.test(text)) {
    return 'بنكي';
  }
  if (/نقدي/i.test(text) || /كاش/i.test(text)) {
    return 'نقدي';
  }
  if (/شيك/i.test(text)) {
    return 'شيك';
  }

  return undefined;
}

/**
 * Extract payment cycle
 */
function extractPaymentCycle(text: string): string | undefined {
  if (/شهري/i.test(text)) {
    return 'شهري';
  }
  if (/أسبوعي/i.test(text)) {
    return 'أسبوعي';
  }
  if (/يومي/i.test(text)) {
    return 'يومي';
  }

  return undefined;
}

/**
 * Calculate extraction confidence based on number of extracted fields
 */
function calculateConfidence(fields: ExtractedContractFields): number {
  const importantFields = [
    fields.customerName,
    fields.qatariId,
    fields.plateNumber,
    fields.startDate,
    fields.endDate,
    fields.monthlyAmount,
  ];

  const extractedCount = importantFields.filter(Boolean).length;
  const totalCount = importantFields.length;

  return extractedCount / totalCount;
}
