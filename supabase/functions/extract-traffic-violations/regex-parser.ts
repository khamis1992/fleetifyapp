// ============================================================================
// MOI Qatar Traffic Violation Regex Parser
// Deterministic pattern matching for traffic violation extraction
// ============================================================================

import {
  ExtractedViolation,
  PDFHeaderData,
  ExtractedViolationsResult,
  ParserOptions,
  MatchResult,
} from './types.ts';

import {
  VIOLATION_NUMBER_PATTERNS,
  DATE_PATTERNS,
  TIME_PATTERNS,
  PLATE_PATTERNS,
  AMOUNT_PATTERNS,
  VIOLATION_TYPE_PATTERNS,
  LOCATION_PATTERNS,
  FILE_NUMBER_PATTERN,
  OWNER_NAME_PATTERN,
  TOTAL_VIOLATIONS_PATTERN,
  TOTAL_AMOUNT_PATTERN,
  VIOLATION_SEPARATOR_PATTERN,
  convertArabicNumerals,
  normalizeArabicText,
  extractAllMatches,
  isValidDate,
  normalizeDate,
  LOCATION_KEYWORDS,
  ARABIC_MONTH_NAMES,
} from './patterns.ts';

const PARSER_VERSION = '1.0.0';

// ============================================================================
// Main Parser Class
// ============================================================================

export class TrafficViolationRegexParser {
  private readonly rawText: string;
  private readonly normalizedText: string;
  private readonly options: Required<ParserOptions>;
  private readonly startTime: number;

  constructor(text: string, options: ParserOptions = {}) {
    this.rawText = text;
    this.normalizedText = this.preprocessText(text);
    this.options = {
      strict: options.strict ?? false,
      require_all_fields: options.require_all_fields ?? false,
      min_confidence: options.min_confidence ?? 0.5,
      validate_dates: options.validate_dates ?? true,
    };
    this.startTime = performance.now();
  }

  // --------------------------------------------------------------------------
  // Main Extraction Method
  // --------------------------------------------------------------------------

  public extract(): ExtractedViolationsResult {
    console.log(`[RegexParser] Starting extraction...`);
    console.log(`[RegexParser] Text length: ${this.rawText.length} chars`);
    console.log(`[RegexParser] Normalized length: ${this.normalizedText.length} chars`);

    const header = this.extractHeader();
    const violations = this.extractViolations();

    // Calculate totals from violations if not in header
    if (!header.total_violations) {
      header.total_violations = violations.length;
    }
    if (!header.total_amount && violations.length > 0) {
      header.total_amount = violations.reduce((sum, v) => sum + v.fine_amount, 0);
    }

    const processingTime = performance.now() - this.startTime;

    console.log(`[RegexParser] Extraction complete in ${processingTime.toFixed(2)}ms`);
    console.log(`[RegexParser] Found ${violations.length} violations`);

    return {
      header,
      violations,
      metadata: {
        processing_time_ms: processingTime,
        text_length: this.rawText.length,
        parser_version: PARSER_VERSION,
        extraction_method: 'regex',
      },
    };
  }

  // --------------------------------------------------------------------------
  // Text Preprocessing
  // --------------------------------------------------------------------------

  private preprocessText(text: string): string {
    return convertArabicNumerals(
      normalizeArabicText(text)
    );
  }

  // --------------------------------------------------------------------------
  // Header Extraction
  // --------------------------------------------------------------------------

  private extractHeader(): PDFHeaderData {
    const header: PDFHeaderData = {};

    // Extract file number (format: 86-2015-17)
    const fileNumberMatch = this.extractFirstMatch(FILE_NUMBER_PATTERN, this.normalizedText);
    if (fileNumberMatch) {
      header.file_number = fileNumberMatch;
    }

    // Extract vehicle plate
    const plateMatch = this.extractPlateWithContext();
    if (plateMatch) {
      header.vehicle_plate = plateMatch;
    }

    // Extract owner name
    const ownerMatch = this.extractOwnerName();
    if (ownerMatch) {
      header.owner_name = ownerMatch;
    }

    return header;
  }

  private extractFirstMatch(pattern: RegExp, text: string): string | null {
    const matches = extractAllMatches(pattern, text);
    if (matches.length > 0 && matches[0].groups[0]) {
      return matches[0].groups[0].trim();
    }
    return null;
  }

  private extractPlateWithContext(): string | null {
    // Try to find plate in header section (first 500 chars)
    const headerSection = this.normalizedText.substring(0, 500);

    for (const pattern of PLATE_PATTERNS) {
      const matches = extractAllMatches(pattern, headerSection);
      if (matches.length > 0) {
        const match = matches[0].match.trim();
        // Validate plate format
        if (this.isValidPlate(match)) {
          return match;
        }
      }
    }

    return null;
  }

  private isValidPlate(plate: string): boolean {
    // Check if it matches known Qatar plate formats
    const simplePlate = /^\d{5,6}$/.test(plate);
    const monthPlate = /^\d{1,2}\/\d{4}$/.test(plate);
    const qatarPlate = /^[A-Z]{2}-\d{4}$/.test(plate);

    return simplePlate || monthPlate || qatarPlate;
  }

  private extractOwnerName(): string | null {
    // Look for owner name in header section
    const headerSection = this.normalizedText.substring(0, 500);
    const matches = extractAllMatches(OWNER_NAME_PATTERN, headerSection);

    if (matches.length > 0 && matches[0].groups[0]) {
      return matches[0].groups[0].trim();
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Violation Extraction
  // --------------------------------------------------------------------------

  private extractViolations(): ExtractedViolation[] {
    const violations: ExtractedViolation[] = [];
    const seenViolationNumbers = new Set<string>();

    // Pattern 1: MOI Qatar table format - row with violation number, date, plate, amount
    // Format: [seq] [points] [amount] [violation_type] [location] [plate]/[type] [date] [time] [violation_number] [row_number]
    // Note: Arabic PDFs are RTL, so columns may appear reversed
    // Violation numbers start with 14, 16, or 33
    const moiPattern = /(\d{5,6})\/[^\s]+\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s+([1-3]\d{9})\s+\d+\s+\d+\s+(\d+\.?\d*)/g;
    let match: RegExpExecArray | null;

    while ((match = moiPattern.exec(this.normalizedText)) !== null) {
      if (!seenViolationNumbers.has(match[4])) {
        violations.push({
          violation_number: match[4],
          plate_number: match[1],
          date: match[2],
          time: match[3],
          fine_amount: Math.round(parseFloat(match[5]) || 0),
          confidence_score: 1.0,
          violation_type: '',
          location: '',
        });
        seenViolationNumbers.add(match[4]);
      }
    }

    console.log(`[RegexParser] Pattern 1 (MOI table format): ${violations.length} violations`);

    // Pattern 2: Alternative format - violation number with date nearby
    // Looks for 10-digit numbers (14xx, 16xx, 33xx) followed by date
    const altPattern1 = /([1-3]\d{9})\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/g;
    while ((match = altPattern1.exec(this.normalizedText)) !== null) {
      if (!seenViolationNumbers.has(match[1])) {
        violations.push({
          violation_number: match[1],
          plate_number: '',
          date: match[2],
          time: match[3],
          fine_amount: 0,
          confidence_score: 0.7,
          violation_type: '',
          location: '',
        });
        seenViolationNumbers.add(match[1]);
      }
    }

    console.log(`[RegexParser] Pattern 2 (alt format): ${violations.length} total violations`);

    // Pattern 3: Reverse format (date before violation number)
    // Date followed by violation number
    const altPattern2 = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s+([1-3]\d{9})/g;
    while ((match = altPattern2.exec(this.normalizedText)) !== null) {
      if (!seenViolationNumbers.has(match[3])) {
        violations.push({
          violation_number: match[3],
          plate_number: '',
          date: match[1],
          time: match[2],
          fine_amount: 0,
          confidence_score: 0.7,
          violation_type: '',
          location: '',
        });
        seenViolationNumbers.add(match[3]);
      }
    }

    console.log(`[RegexParser] Pattern 3 (reverse format): ${violations.length} total violations`);

    // Pattern 4: Structured format without amount (some PDF rows omit this field)
    const partialPattern = /(\d{5,6})\/[^\s]+\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s+([1-3]\d{9})\s+\d+/g;

    while ((match = partialPattern.exec(this.normalizedText)) !== null) {
      if (!seenViolationNumbers.has(match[4])) {
        violations.push({
          violation_number: match[4],
          plate_number: match[1],
          date: match[2],
          time: match[3],
          fine_amount: 500, // Default amount for missing values
          confidence_score: 0.8, // Lower confidence since amount is estimated
          violation_type: '',
          location: '',
        });
        seenViolationNumbers.add(match[4]);
      }
    }

    console.log(`[RegexParser] Pattern 4 (partial format): ${violations.length} total violations`);

    // If we found structured violations, return them
    if (violations.length > 0) {
      console.log(`[RegexParser] Found ${violations.length} structured violations (tabular format)`);
      return violations;
    }

    // Fallback: Find all violation numbers first - they are our anchors
    const violationNumbers = this.extractViolationNumbers();

    console.log(`[RegexParser] Found ${violationNumbers.length} violation numbers`);

    // For each violation number, extract the surrounding data
    for (const vn of violationNumbers) {
      const violation = this.extractViolationContext(vn);
      if (violation && this.isValidViolation(violation)) {
        violations.push(violation);
      }
    }

    // Deduplicate violations by violation_number
    return this.deduplicateViolations(violations);
  }

  private extractViolationNumbers(): Array<{ number: string; index: number }> {
    const numbers: Array<{ number: string; index: number }> = [];

    for (const pattern of VIOLATION_NUMBER_PATTERNS) {
      const matches = extractAllMatches(pattern, this.normalizedText);
      for (const match of matches) {
        const number = match.groups[0] || match.match;
        // Match 10-digit violation numbers starting with 14, 16, or 33
        if (/^[1-3]\d{9}$/.test(number)) {
          numbers.push({ number, index: match.index });
        }
      }
    }

    // Deduplicate and sort
    const uniqueNumbers = new Map<string, { number: string; index: number }>();
    for (const n of numbers) {
      if (!uniqueNumbers.has(n.number)) {
        uniqueNumbers.set(n.number, n);
      }
    }

    return Array.from(uniqueNumbers.values()).sort((a, b) => a.index - b.index);
  }

  private extractViolationContext(anchor: { number: string; index: number }): ExtractedViolation | null {
    // Define context window around the violation number
    const windowSize = 500; // characters before and after
    const start = Math.max(0, anchor.index - windowSize);
    const end = Math.min(this.normalizedText.length, anchor.index + windowSize);
    const context = this.normalizedText.substring(start, end);

    const violation: ExtractedViolation = {
      violation_number: anchor.number,
      plate_number: '',
      violation_type: '',
      fine_amount: 0,
      date: '',
      confidence_score: 0,
    };

    let totalConfidence = 0;

    // Extract date
    const date = this.extractDate(context);
    if (date) {
      violation.date = date;
      totalConfidence += 0.2;
    }

    // Extract time
    const time = this.extractTime(context);
    if (time) {
      violation.time = time;
      totalConfidence += 0.1;
    }

    // Extract plate number
    const plate = this.extractPlate(context);
    if (plate) {
      violation.plate_number = plate;
      totalConfidence += 0.15;
    }

    // Extract violation type
    const vType = this.extractViolationType(context);
    if (vType) {
      violation.violation_type = vType;
      totalConfidence += 0.2;
    }

    // Extract location
    const location = this.extractLocation(context);
    if (location) {
      violation.location = location;
      totalConfidence += 0.1;
    }

    // Extract fine amount
    const amount = this.extractAmount(context);
    if (amount !== null) {
      violation.fine_amount = amount;
      totalConfidence += 0.25;
    }

    // Calculate confidence score (sum of weights, not average)
    // Max possible: 0.2 (date) + 0.1 (time) + 0.15 (plate) + 0.2 (type) + 0.1 (location) + 0.25 (amount) = 1.0
    violation.confidence_score = totalConfidence;

    return violation;
  }

  private extractDate(context: string): string | null {
    // Try each date pattern
    for (const pattern of DATE_PATTERNS) {
      const matches = extractAllMatches(pattern, context);
      for (const match of matches) {
        const dateString = match.match;

        // Convert Arabic month names if present
        let normalizedDate = dateString;
        for (const [arabicMonth, monthNum] of Object.entries(ARABIC_MONTH_NAMES)) {
          if (dateString.includes(arabicMonth)) {
            const day = match.groups[0];
            const year = match.groups[2];
            const paddedMonth = monthNum.toString().padStart(2, '0');
            normalizedDate = `${year}-${paddedMonth}-${day.padStart(2, '0')}`;
            break;
          }
        }

        // Normalize date format
        const normalized = normalizeDate(normalizedDate);
        if (normalized && isValidDate(normalized)) {
          return normalized;
        }
      }
    }

    return null;
  }

  private extractTime(context: string): string | null {
    for (const pattern of TIME_PATTERNS) {
      const matches = extractAllMatches(pattern, context);
      if (matches.length > 0 && matches[0].groups[0]) {
        const hours = matches[0].groups[0].padStart(2, '0');
        const minutes = matches[0].groups[1];
        return `${hours}:${minutes}`;
      }
    }
    return null;
  }

  private extractPlate(context: string): string | null {
    for (const pattern of PLATE_PATTERNS) {
      const matches = extractAllMatches(pattern, context);
      if (matches.length > 0) {
        const match = matches[0].match.trim();
        if (this.isValidPlate(match)) {
          return match;
        }
      }
    }
    return null;
  }

  private extractViolationType(context: string): string | null {
    for (const { pattern, type } of VIOLATION_TYPE_PATTERNS) {
      if (pattern.test(context)) {
        // Reset regex state
        pattern.lastIndex = 0;
        return type;
      }
    }

    // Try to extract from context using keywords
    for (const { keywords, type } of VIOLATION_TYPE_PATTERNS) {
      for (const keyword of keywords) {
        if (context.includes(keyword)) {
          return type;
        }
      }
    }

    return null;
  }

  private extractLocation(context: string): string | null {
    // First check for known location keywords
    for (const keyword of LOCATION_KEYWORDS) {
      if (context.includes(keyword)) {
        // Find the full location mention
        const index = context.indexOf(keyword);
        const start = Math.max(0, index - 20);
        const end = Math.min(context.length, index + keyword.length + 20);
        let location = context.substring(start, end).trim();

        // Clean up the location
        location = location.replace(/^(?:في|مكان|موقع|المنطقة)[:\s]*/, '');
        location = location.split(/[\n\r]/)[0]; // Take only first line

        if (location.length > 3) {
          return location;
        }
      }
    }

    // Try pattern matching
    for (const pattern of LOCATION_PATTERNS) {
      const matches = extractAllMatches(pattern, context);
      if (matches.length > 0 && matches[0].groups[0]) {
        return matches[0].groups[0].trim();
      }
    }

    return null;
  }

  private extractAmount(context: string): number | null {
    for (const pattern of AMOUNT_PATTERNS) {
      const matches = extractAllMatches(pattern, context);
      if (matches.length > 0 && matches[0].groups[0]) {
        const amount = parseInt(matches[0].groups[0], 10);
        if (!isNaN(amount) && amount > 0 && amount < 100000) {
          return amount;
        }
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  private isValidViolation(violation: ExtractedViolation): boolean {
    // Required field: violation_number (10 digits starting with 1-3)
    const hasViolationNumber = /^[1-3]\d{9}$/.test(violation.violation_number || '');

    if (!hasViolationNumber) {
      return false;
    }

    // Check confidence threshold
    if (violation.confidence_score < this.options.min_confidence) {
      return false;
    }

    // Validate date if required and present
    if (this.options.validate_dates && violation.date) {
      if (!isValidDate(violation.date)) {
        return false;
      }
    }

    // Check if strict mode requires all fields
    if (this.options.strict && this.options.require_all_fields) {
      return !!violation.date && !!violation.time && !!violation.location && 
             !!violation.plate_number && violation.fine_amount > 0;
    }

    return true;
  }

  private deduplicateViolations(violations: ExtractedViolation[]): ExtractedViolation[] {
    const seen = new Set<string>();
    const deduplicated: ExtractedViolation[] = [];

    for (const violation of violations) {
      const key = `${violation.violation_number}-${violation.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(violation);
      }
    }

    return deduplicated;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Main entry point for parsing traffic violations from text
 */
export async function parseTrafficViolations(
  text: string,
  options?: ParserOptions
): Promise<ExtractedViolationsResult> {
  const parser = new TrafficViolationRegexParser(text, options);
  return parser.extract();
}
