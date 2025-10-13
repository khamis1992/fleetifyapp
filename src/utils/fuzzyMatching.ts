/**
 * Advanced Fuzzy Matching Utilities for Invoice Processing
 * Fixed version with correct database schema and caching integration
 */

import { supabase } from '@/integrations/supabase/client';
import { invoiceScannerCache } from './invoiceScannerCache';

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

export interface MatchCandidate {
  id: string;
  name: string;
  phone?: string;
  plate_number?: string;
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

interface ExtractedData {
  customer_name?: string;
  amount?: number;
  contract_number?: string;
  car_number?: string;
  date?: string;
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
    .replace(/[^\u0600-\u06FF\u0750-\u077F\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Normalize Arabic
  if (/[\u0600-\u06FF]/.test(cleaned)) {
    cleaned = normalizeArabicText(cleaned);
  }
  
  return cleaned;
}

/**
 * Calculate name similarity with transliteration support
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  // Direct similarity
  const directSimilarity = jaroWinklerSimilarity(norm1, norm2);
  
  // Try transliteration if one is Arabic and other is English
  let transliterationSimilarity = 0;
  
  for (const [arabic, englishVariants] of Object.entries(ARABIC_TRANSLITERATION)) {
    if (norm1.includes(arabic.toLowerCase())) {
      for (const english of englishVariants) {
        if (norm2.includes(english.toLowerCase())) {
          transliterationSimilarity = Math.max(transliterationSimilarity, 0.8);
        }
      }
    }
  }
  
  return Math.max(directSimilarity, transliterationSimilarity);
}

/**
 * Calculate car/plate number match score
 */
function calculateCarMatchScore(rawText: string, plateNumber?: string): number {
  if (!plateNumber || !rawText) return 0;
  
  const normalizedPlate = plateNumber.replace(/[\s-]/g, '').toLowerCase();
  const normalizedText = rawText.replace(/[\s-]/g, '').toLowerCase();
  
  if (normalizedText.includes(normalizedPlate)) {
    return 1.0;
  }
  
  // Partial matching
  const plateChunks = normalizedPlate.match(/.{1,3}/g) || [];
  let matches = 0;
  
  for (const chunk of plateChunks) {
    if (normalizedText.includes(chunk)) {
      matches++;
    }
  }
  
  return plateChunks.length > 0 ? matches / plateChunks.length : 0;
}

/**
 * Calculate context match score based on amount and other factors
 */
function calculateContextMatchScore(extractedData: ExtractedData, record: any, rawText: string): number {
  let score = 0;
  let factors = 0;
  
  // Amount matching
  if (extractedData.amount && record.monthly_amount) {
    const amountSimilarity = 1 - Math.abs(extractedData.amount - record.monthly_amount) / Math.max(extractedData.amount, record.monthly_amount);
    score += Math.max(0, amountSimilarity);
    factors++;
  }
  
  // Contract number matching
  if (extractedData.contract_number && record.contract_number) {
    const contractSimilarity = jaroWinklerSimilarity(extractedData.contract_number, record.contract_number);
    score += contractSimilarity;
    factors++;
  }
  
  // Default score for records with some context
  if (factors === 0 && (record.monthly_amount || record.contract_number)) {
    score = 0.1;
    factors = 1;
  }
  
  return factors > 0 ? score / factors : 0;
}

/**
 * Main fuzzy matching function with caching integration
 */
export async function performFuzzyMatching(
  companyId: string,
  extractedData: ExtractedData,
  rawText: string,
  ocrConfidence: number = 85
): Promise<FuzzyMatchResult> {
  const candidates: MatchCandidate[] = [];
  
  try {
    // 1. Try to get customers from cache first
    let customers = invoiceScannerCache.getCachedCustomers(companyId);
    
    if (!customers) {
      // 2. Fetch customers from database with proper vehicle joins
      const { data: fetchedCustomers } = await supabase
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
            status,
            vehicle_id,
            vehicles(
              id,
              plate_number
            )
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (!fetchedCustomers) {
        return { 
          all_matches: [], 
          total_confidence: 0, 
          ocr_confidence: ocrConfidence, 
          name_similarity: 0, 
          car_match_score: 0, 
          context_match_score: 0 
        };
      }
      
      customers = fetchedCustomers;
      
      // Cache the customers for future use
      const processedCustomers = customers.map((customer: any) => ({
        id: customer.id,
        name: customer.company_name_ar || customer.company_name || 
              `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim(),
        phone: customer.phone,
        contracts: customer.contracts?.map((contract: any) => ({
          id: contract.id,
          contract_number: contract.contract_number,
          plate_number: contract.vehicles?.plate_number,
          monthly_amount: contract.monthly_amount
        })) || []
      }));
      
      invoiceScannerCache.cacheCustomers(companyId, processedCustomers);
    }

    // 3. Process each customer
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
          const plateNumber = contract.vehicles?.plate_number;
          const carMatchScore = calculateCarMatchScore(rawText, plateNumber);
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
            plate_number: plateNumber,
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
    
    // 4. Sort by confidence and cache the result
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    if (candidates.length > 0 && extractedData.customer_name) {
      invoiceScannerCache.cacheMatchingResult(
        extractedData.customer_name, 
        extractedData.car_number || '', 
        candidates.slice(0, 5)
      );
    }
    
    // 5. Calculate aggregate scores
    const bestMatch = candidates[0];
    const avgNameSimilarity = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateNameSimilarity(extractedData.customer_name || '', c.name), 0) / candidates.length : 0;
    
    const avgCarMatch = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateCarMatchScore(rawText, c.plate_number), 0) / candidates.length : 0;
    
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
 * Extract car numbers from text
 */
export function extractCarNumbers(text: string): string[] {
  const patterns = [
    /\d{1,4}[-\s]?[A-Z]{1,3}/gi,     // 123-ABC format
    /[A-Z]{1,3}[-\s]?\d{1,4}/gi,     // ABC-123 format
    /\d{1,4}[أ-ي]{1,3}/g,            // Arabic letters with numbers
    /[أ-ي]{1,3}\d{1,4}/g             // Arabic letters with numbers
  ];
  
  const matches: string[] = [];
  
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
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