/**
 * Advanced Fuzzy Matching Utilities for Invoice Processing
 * Supports Arabic/English names, transliteration, and intelligent similarity scoring
 */

import { supabase } from '@/integrations/supabase/client';

// Arabic to English transliteration mapping
const ARABIC_TRANSLITERATION: Record<string, string[]> = {
  'محمد': ['Mohammed', 'Muhammad', 'Mohamed', 'Mohammad'],
  'أحمد': ['Ahmed', 'Ahmad'],
  'علي': ['Ali', 'Aly'],
  'عبدالله': ['Abdullah', 'Abdulla', 'Abdallah'],
  'خالد': ['Khalid', 'Khaled'],
  'سالم': ['Salem', 'Salim'],
  'فاطمة': ['Fatima', 'Fatema'],
  'عائشة': ['Aisha', 'Aysha'],
  'مريم': ['Mariam', 'Maryam'],
  'نور': ['Noor', 'Nour'],
  'جمال': ['Jamal', 'Gamal'],
  'كريم': ['Kareem', 'Karim'],
  'عمر': ['Omar', 'Umar'],
  'يوسف': ['Youssef', 'Yousef', 'Joseph'],
  'إبراهيم': ['Ibrahim', 'Abraham']
};

// Common Arabic name prefixes and titles
const ARABIC_PREFIXES = ['أبو', 'أم', 'بن', 'بنت', 'آل', 'عبد', 'الشيخ', 'الدكتور', 'المهندس'];
const ENGLISH_PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Eng.', 'Prof.', 'Sheikh'];

// Vehicle plate number patterns
const PLATE_PATTERNS = [
  /\d{1,4}[-\s]?[A-Z]{1,3}/i,     // 123-ABC format
  /[A-Z]{1,3}[-\s]?\d{1,4}/i,     // ABC-123 format
  /\d{1,4}[أ-ي]{1,3}/,            // Arabic letters with numbers
  /[أ-ي]{1,3}\d{1,4}/             // Arabic letters with numbers
];

// Month names in Arabic and English
const MONTH_MAPPING: Record<string, number> = {
  // Arabic months
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
  'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  // English months
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  // Short forms
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

export interface MatchCandidate {
  id: string;
  name: string;
  phone?: string;
  car_number?: string;
  contract_number?: string;
  agreement_id?: string;
  customer_type?: string;
  confidence: number;
  match_reasons: string[];
  source_table: 'customers' | 'contracts';
}

export interface FuzzyMatchResult {
  best_match?: MatchCandidate;
  all_matches: MatchCandidate[];
  total_confidence: number;
  ocr_confidence: number;
  name_similarity: number;
  car_match_score: number;
  context_match_score: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
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

  return matrix[len2][len1];
}

/**
 * Calculate Jaro-Winkler similarity
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Normalize Arabic text for better matching
 */
function normalizeArabicText(text: string): string {
  return text
    .replace(/[أإآ]/g, 'ا')  // Normalize alef variations
    .replace(/[ىئ]/g, 'ي')   // Normalize ya variations
    .replace(/ة/g, 'ه')      // Normalize ta marbuta
    .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();
}

/**
 * Clean and normalize name for comparison
 */
function normalizeName(name: string): string {
  if (!name) return '';
  
  let cleaned = name.toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\w\s]/g, ' ') // Keep Arabic, Latin, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove common prefixes
  const allPrefixes = [...ARABIC_PREFIXES, ...ENGLISH_PREFIXES];
  for (const prefix of allPrefixes) {
    const prefixPattern = new RegExp(`^${prefix.toLowerCase()}\\s+`, 'i');
    cleaned = cleaned.replace(prefixPattern, '');
  }
  
  // Normalize Arabic
  if (/[\u0600-\u06FF]/.test(cleaned)) {
    cleaned = normalizeArabicText(cleaned);
  }
  
  return cleaned;
}

/**
 * Get transliteration variants for Arabic names
 */
function getTransliterationVariants(arabicName: string): string[] {
  const variants: string[] = [arabicName];
  
  for (const [arabic, english] of Object.entries(ARABIC_TRANSLITERATION)) {
    if (arabicName.includes(arabic)) {
      english.forEach(eng => {
        variants.push(arabicName.replace(arabic, eng.toLowerCase()));
      });
    }
  }
  
  return variants;
}

/**
 * Calculate name similarity with transliteration support
 */
function calculateNameSimilarity(extracted: string, candidate: string): number {
  const normalizedExtracted = normalizeName(extracted);
  const normalizedCandidate = normalizeName(candidate);
  
  if (!normalizedExtracted || !normalizedCandidate) return 0;
  
  // Direct comparison
  const directSimilarity = jaroWinklerSimilarity(normalizedExtracted, normalizedCandidate);
  
  // Levenshtein similarity
  const levenshtein = 1 - (levenshteinDistance(normalizedExtracted, normalizedCandidate) / 
                          Math.max(normalizedExtracted.length, normalizedCandidate.length));
  
  // Transliteration variants
  let maxTransliterationSimilarity = 0;
  const extractedVariants = getTransliterationVariants(normalizedExtracted);
  const candidateVariants = getTransliterationVariants(normalizedCandidate);
  
  for (const extVariant of extractedVariants) {
    for (const candVariant of candidateVariants) {
      const similarity = jaroWinklerSimilarity(extVariant, candVariant);
      maxTransliterationSimilarity = Math.max(maxTransliterationSimilarity, similarity);
    }
  }
  
  // Partial matching (for compound names)
  const extractedParts = normalizedExtracted.split(' ');
  const candidateParts = normalizedCandidate.split(' ');
  let partialMatches = 0;
  
  for (const extPart of extractedParts) {
    for (const candPart of candidateParts) {
      if (extPart.length > 2 && candPart.length > 2) {
        const partSimilarity = jaroWinklerSimilarity(extPart, candPart);
        if (partSimilarity > 0.8) {
          partialMatches++;
          break;
        }
      }
    }
  }
  
  const partialScore = partialMatches / Math.max(extractedParts.length, candidateParts.length);
  
  // Combine scores
  return Math.max(directSimilarity, levenshtein, maxTransliterationSimilarity, partialScore);
}

/**
 * Extract vehicle/car numbers from text
 */
function extractCarNumbers(text: string): string[] {
  const carNumbers: string[] = [];
  
  for (const pattern of PLATE_PATTERNS) {
    const matches = text.match(new RegExp(pattern, 'g'));
    if (matches) {
      carNumbers.push(...matches);
    }
  }
  
  return [...new Set(carNumbers)]; // Remove duplicates
}

/**
 * Extract month references from text
 */
function extractMonthReferences(text: string): number[] {
  const months: number[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [month, number] of Object.entries(MONTH_MAPPING)) {
    if (lowerText.includes(month)) {
      months.push(number);
    }
  }
  
  return [...new Set(months)];
}

/**
 * Calculate car number match score
 */
function calculateCarMatchScore(extractedText: string, candidateCarNumber?: string): number {
  if (!candidateCarNumber) return 0;
  
  const extractedCarNumbers = extractCarNumbers(extractedText);
  if (extractedCarNumbers.length === 0) return 0;
  
  for (const extracted of extractedCarNumbers) {
    const similarity = jaroWinklerSimilarity(
      extracted.replace(/[-\s]/g, '').toLowerCase(),
      candidateCarNumber.replace(/[-\s]/g, '').toLowerCase()
    );
    if (similarity > 0.8) {
      return similarity;
    }
  }
  
  return 0;
}

/**
 * Calculate context match score based on amounts, dates, agreement numbers
 */
function calculateContextMatchScore(
  extractedData: any,
  candidate: any,
  rawText: string
): number {
  let score = 0;
  let factors = 0;
  
  // Amount matching
  if (extractedData.total_amount && candidate.monthly_amount) {
    const amountRatio = Math.min(extractedData.total_amount, candidate.monthly_amount) / 
                       Math.max(extractedData.total_amount, candidate.monthly_amount);
    if (amountRatio > 0.8) {
      score += amountRatio * 0.4;
    }
    factors++;
  }
  
  // Agreement/Contract number matching
  if (extractedData.contract_number && candidate.contract_number) {
    const contractSimilarity = jaroWinklerSimilarity(
      extractedData.contract_number.toString(),
      candidate.contract_number.toString()
    );
    score += contractSimilarity * 0.3;
    factors++;
  }
  
  // Month context matching
  const extractedMonths = extractMonthReferences(rawText);
  if (extractedMonths.length > 0 && extractedData.invoice_date) {
    const invoiceMonth = new Date(extractedData.invoice_date).getMonth() + 1;
    if (extractedMonths.includes(invoiceMonth)) {
      score += 0.3;
    }
    factors++;
  }
  
  return factors > 0 ? score / factors : 0;
}

/**
 * Main fuzzy matching function
 */
export async function performFuzzyMatching(
  extractedData: any,
  rawText: string,
  companyId: string,
  ocrConfidence: number = 50
): Promise<FuzzyMatchResult> {
  
  const candidates: MatchCandidate[] = [];
  
  try {
    // 1. Fetch customers with their contract information
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        id,
        first_name_ar,
        last_name_ar,
        first_name,
        last_name,
        company_name_ar,
        company_name,
        phone,
        customer_type,
        contracts(
          id,
          contract_number,
          monthly_amount,
          car_number,
          status
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (!customers) {
      return { all_matches: [], total_confidence: 0, ocr_confidence: ocrConfidence, name_similarity: 0, car_match_score: 0, context_match_score: 0 };
    }
    
    // 2. Process each customer
    for (const customer of customers) {
      const customerName = customer.company_name_ar || customer.company_name || 
                          `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim();
      
      if (!customerName || !extractedData.customer_name) continue;
      
      // Calculate name similarity
      const nameSimilarity = calculateNameSimilarity(extractedData.customer_name, customerName);
      
      if (nameSimilarity < 0.3) continue; // Skip low similarity matches
      
      // Process contracts for this customer
      if (customer.contracts && Array.isArray(customer.contracts)) {
        for (const contract of customer.contracts) {
          const carMatchScore = calculateCarMatchScore(rawText, contract.car_number);
          const contextMatchScore = calculateContextMatchScore(extractedData, contract, rawText);
          
          // Calculate total confidence
          const totalConfidence = (
            ocrConfidence * 0.3 +
            nameSimilarity * 100 * 0.4 +
            carMatchScore * 100 * 0.2 +
            contextMatchScore * 100 * 0.1
          );
          
          const matchReasons: string[] = [];
          if (nameSimilarity > 0.7) matchReasons.push('تطابق قوي في الاسم');
          if (nameSimilarity > 0.5) matchReasons.push('تطابق جيد في الاسم');
          if (carMatchScore > 0.8) matchReasons.push('تطابق رقم المركبة');
          if (contextMatchScore > 0.7) matchReasons.push('تطابق السياق والمبلغ');
          if (contract.contract_number && extractedData.contract_number) {
            const contractSim = jaroWinklerSimilarity(contract.contract_number, extractedData.contract_number);
            if (contractSim > 0.8) matchReasons.push('تطابق رقم العقد');
          }
          
          candidates.push({
            id: customer.id,
            name: customerName,
            phone: customer.phone,
            car_number: contract.car_number,
            contract_number: contract.contract_number,
            agreement_id: contract.id,
            customer_type: customer.customer_type,
            confidence: Math.round(totalConfidence),
            match_reasons: matchReasons,
            source_table: 'customers'
          });
        }
      } else {
        // Customer without contracts
        const contextMatchScore = calculateContextMatchScore(extractedData, customer, rawText);
        
        const totalConfidence = (
          ocrConfidence * 0.3 +
          nameSimilarity * 100 * 0.5 +
          contextMatchScore * 100 * 0.2
        );
        
        const matchReasons: string[] = [];
        if (nameSimilarity > 0.7) matchReasons.push('تطابق قوي في الاسم');
        if (nameSimilarity > 0.5) matchReasons.push('تطابق جيد في الاسم');
        
        candidates.push({
          id: customer.id,
          name: customerName,
          phone: customer.phone,
          customer_type: customer.customer_type,
          confidence: Math.round(totalConfidence),
          match_reasons: matchReasons,
          source_table: 'customers'
        });
      }
    }
    
    // 3. Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // 4. Calculate aggregate scores
    const bestMatch = candidates[0];
    const avgNameSimilarity = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateNameSimilarity(extractedData.customer_name || '', c.name), 0) / candidates.length : 0;
    
    const avgCarMatch = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateCarMatchScore(rawText, c.car_number), 0) / candidates.length : 0;
    
    const avgContextMatch = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateContextMatchScore(extractedData, c, rawText), 0) / candidates.length : 0;
    
    return {
      best_match: bestMatch,
      all_matches: candidates.slice(0, 10), // Top 10 matches
      total_confidence: bestMatch ? bestMatch.confidence : 0,
      ocr_confidence: ocrConfidence,
      name_similarity: Math.round(avgNameSimilarity * 100),
      car_match_score: Math.round(avgCarMatch * 100),
      context_match_score: Math.round(avgContextMatch * 100)
    };
    
  } catch (error) {
    console.error('Error in fuzzy matching:', error);
    return { 
      all_matches: [], 
      total_confidence: 0, 
      ocr_confidence: ocrConfidence, 
      name_similarity: 0, 
      car_match_score: 0, 
      context_match_score: 0 
    };
  }
}

/**
 * Language detection helper
 */
export function detectLanguage(text: string): 'arabic' | 'english' | 'mixed' {
  const arabicRegex = /[\u0600-\u06FF]/g;
  const englishRegex = /[a-zA-Z]/g;
  
  const arabicMatches = text.match(arabicRegex);
  const englishMatches = text.match(englishRegex);
  
  const arabicCount = arabicMatches ? arabicMatches.length : 0;
  const englishCount = englishMatches ? englishMatches.length : 0;
  
  if (arabicCount > 0 && englishCount > 0) return 'mixed';
  if (arabicCount > englishCount) return 'arabic';
  return 'english';
}

/**
 * Extract key information from raw OCR text
 */
export function extractKeyInformation(rawText: string) {
  const language = detectLanguage(rawText);
  const carNumbers = extractCarNumbers(rawText);
  const months = extractMonthReferences(rawText);
  
  // Extract potential amounts (numbers with currency indicators)
  const amountPattern = /(?:[\d,]+\.?\d*)\s*(?:د\.ك|KD|دينار|dinar)/gi;
  const amounts = rawText.match(amountPattern) || [];
  
  // Extract agreement/contract numbers
  const agreementPattern = /(?:عقد|اتفاق|agreement|contract)\s*(?:رقم|no\.?|#)?\s*(\w+)/gi;
  const agreements = [];
  let match;
  while ((match = agreementPattern.exec(rawText)) !== null) {
    agreements.push(match[1]);
  }
  
  return {
    language,
    car_numbers: carNumbers,
    months,
    potential_amounts: amounts,
    agreement_numbers: agreements,
    text_length: rawText.length,
    has_arabic: /[\u0600-\u06FF]/.test(rawText),
    has_english: /[a-zA-Z]/.test(rawText)
  };
}