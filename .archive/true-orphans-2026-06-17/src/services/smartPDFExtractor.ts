/**
 * Smart PDF Extractor
 * 
 * Intelligent PDF extraction that:
 * 1. Processes only priority pages first (pages 1-2 usually have all important data)
 * 2. Uses learned templates to find data faster
 * 3. Stops processing when all required fields are found
 * 4. Learns from successful extractions
 */

import { getContractTemplateService, ContractTemplate } from './contractTemplateService';
import { extractContractFields, ExtractedContractFields } from './contractDataExtractor';

interface SmartExtractionResult {
  fields: ExtractedContractFields;
  pagesProcessed: number;
  totalPages: number;
  extractionTimeMs: number;
  usedTemplate: string;
  isComplete: boolean;
}

interface SmartExtractionConfig {
  // Maximum pages to process (default: 3)
  maxPages?: number;
  // Minimum confidence to stop (default: 0.6)
  minConfidence?: number;
  // Required fields that must be extracted
  requiredFields?: (keyof ExtractedContractFields)[];
  // Progress callback
  onProgress?: (progress: { stage: string; percent: number; message?: string }) => void;
}

/**
 * Check if all required fields are extracted
 */
function hasRequiredFields(
  fields: ExtractedContractFields,
  required: (keyof ExtractedContractFields)[]
): boolean {
  for (const field of required) {
    const value = fields[field];
    if (value === undefined || value === null || value === '') {
      return false;
    }
  }
  return true;
}

/**
 * Merge two extraction results, preferring non-empty values
 */
function mergeExtractions(
  existing: ExtractedContractFields,
  newExtraction: ExtractedContractFields
): ExtractedContractFields {
  const merged = { ...existing };
  
  for (const [key, value] of Object.entries(newExtraction)) {
    if (key === 'rawText') {
      // Append raw text
      merged.rawText = (merged.rawText || '') + '\n\n' + (value as string || '');
    } else if (key === 'extractionErrors') {
      // Merge errors
      merged.extractionErrors = [...(merged.extractionErrors || []), ...(value as string[] || [])];
    } else if (key === 'confidence') {
      // Take higher confidence
      merged.confidence = Math.max(merged.confidence || 0, value as number || 0);
    } else if (key === 'phoneNumbers') {
      // Merge phone numbers
      const phones = new Set([...(merged.phoneNumbers || []), ...(value as string[] || [])]);
      merged.phoneNumbers = Array.from(phones);
    } else if (value !== undefined && value !== null && value !== '') {
      // Take non-empty value
      if ((merged as Record<string, unknown>)[key] === undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  
  return merged;
}

/**
 * Smart extraction - processes pages intelligently
 */
export async function smartExtractFromPages(
  pageTexts: string[],
  config: SmartExtractionConfig = {}
): Promise<SmartExtractionResult> {
  const startTime = Date.now();
  const templateService = getContractTemplateService();
  
  const maxPages = config.maxPages ?? 3;
  const minConfidence = config.minConfidence ?? 0.6;
  const requiredFields = config.requiredFields ?? ['customerName', 'qatariId'];
  
  // Get best template based on learned patterns
  const template = templateService.getBestTemplate();
  const priorityPages = templateService.getPriorityPages(template, pageTexts.length);
  
  console.log(`[Smart Extractor] Using template: ${template.name}`);
  console.log(`[Smart Extractor] Priority pages: ${priorityPages.join(', ')} of ${pageTexts.length} total`);
  
  config.onProgress?.({
    stage: 'analyzing',
    percent: 10,
    message: `تحليل ${pageTexts.length} صفحة باستخدام نمط محفوظ`,
  });
  
  let mergedFields: ExtractedContractFields = {
    confidence: 0,
    rawText: '',
    extractionErrors: [],
  };
  
  let pagesProcessed = 0;
  const processedPageNumbers: number[] = [];
  
  // Process priority pages first
  for (const pageNum of priorityPages) {
    if (pagesProcessed >= maxPages) break;
    if (pageNum >= pageTexts.length) continue;
    
    const pageText = pageTexts[pageNum];
    if (!pageText || pageText.trim().length < 50) continue;
    
    console.log(`[Smart Extractor] Processing priority page ${pageNum + 1}...`);
    config.onProgress?.({
      stage: 'extracting',
      percent: 20 + (pagesProcessed / maxPages) * 60,
      message: `استخراج البيانات من الصفحة ${pageNum + 1}`,
    });
    
    const pageFields = extractContractFields(pageText);
    mergedFields = mergeExtractions(mergedFields, pageFields);
    processedPageNumbers.push(pageNum);
    pagesProcessed++;
    
    // Check if we have enough data to stop early
    if (mergedFields.confidence >= minConfidence && 
        hasRequiredFields(mergedFields, requiredFields as (keyof ExtractedContractFields)[])) {
      console.log(`[Smart Extractor] Early stop: Found all required fields with ${Math.round(mergedFields.confidence * 100)}% confidence`);
      break;
    }
  }
  
  // If we still need more data, process remaining pages
  if (mergedFields.confidence < minConfidence || 
      !hasRequiredFields(mergedFields, requiredFields as (keyof ExtractedContractFields)[])) {
    
    for (let i = 0; i < pageTexts.length && pagesProcessed < maxPages; i++) {
      if (processedPageNumbers.includes(i)) continue;
      
      const pageText = pageTexts[i];
      if (!pageText || pageText.trim().length < 50) continue;
      
      console.log(`[Smart Extractor] Processing additional page ${i + 1}...`);
      config.onProgress?.({
        stage: 'extracting_more',
        percent: 20 + (pagesProcessed / maxPages) * 60,
        message: `البحث في الصفحة ${i + 1}`,
      });
      
      const pageFields = extractContractFields(pageText);
      mergedFields = mergeExtractions(mergedFields, pageFields);
      processedPageNumbers.push(i);
      pagesProcessed++;
      
      // Check again if we can stop
      if (mergedFields.confidence >= minConfidence && 
          hasRequiredFields(mergedFields, requiredFields as (keyof ExtractedContractFields)[])) {
        break;
      }
    }
  }
  
  const extractionTime = Date.now() - startTime;
  const isComplete = hasRequiredFields(mergedFields, requiredFields as (keyof ExtractedContractFields)[]);
  
  // Learn from this extraction if it was successful
  if (isComplete && mergedFields.confidence >= 0.3) {
    const successfulPatterns: Record<string, string> = {};
    // In a real implementation, we'd track which patterns matched
    templateService.learnFromExtraction(
      template.id,
      mergedFields,
      processedPageNumbers,
      mergedFields.confidence,
      successfulPatterns
    );
  }
  
  config.onProgress?.({
    stage: 'complete',
    percent: 100,
    message: `تم استخراج البيانات من ${pagesProcessed} صفحة`,
  });
  
  console.log(`[Smart Extractor] Completed in ${extractionTime}ms`);
  console.log(`[Smart Extractor] Processed ${pagesProcessed}/${pageTexts.length} pages`);
  console.log(`[Smart Extractor] Confidence: ${Math.round(mergedFields.confidence * 100)}%`);
  
  return {
    fields: mergedFields,
    pagesProcessed,
    totalPages: pageTexts.length,
    extractionTimeMs: extractionTime,
    usedTemplate: template.name,
    isComplete,
  };
}

/**
 * Quick extraction - only processes first 2 pages
 * Use this for faster preview/validation
 */
export async function quickExtract(
  pageTexts: string[],
  onProgress?: (progress: { stage: string; percent: number }) => void
): Promise<ExtractedContractFields> {
  const result = await smartExtractFromPages(pageTexts.slice(0, 2), {
    maxPages: 2,
    minConfidence: 0.4,
    requiredFields: ['customerName'],
    onProgress,
  });
  
  return result.fields;
}

/**
 * Full extraction - processes all pages but still uses smart ordering
 */
export async function fullExtract(
  pageTexts: string[],
  onProgress?: (progress: { stage: string; percent: number }) => void
): Promise<SmartExtractionResult> {
  return smartExtractFromPages(pageTexts, {
    maxPages: pageTexts.length,
    minConfidence: 0.6,
    requiredFields: ['customerName', 'qatariId', 'startDate'],
    onProgress,
  });
}
