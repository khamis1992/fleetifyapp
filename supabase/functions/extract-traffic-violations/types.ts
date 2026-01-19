// ============================================================================
// Regex Parser Types
// Type definitions for MOI Qatar traffic violation regex parser
// ============================================================================

// ----------------------------------------------------------------------------
// Extracted Violation (from regex parser)
// ----------------------------------------------------------------------------

export interface ExtractedViolation {
  violation_number: string;
  reference_number?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  plate_number: string;
  violation_type: string;
  violation_description?: string;
  location?: string;
  fine_amount: number;
  total_amount?: number;
  issuing_authority?: string;
  confidence_score: number; // 0-1
}

// ----------------------------------------------------------------------------
// PDF Header Data
// ----------------------------------------------------------------------------

export interface PDFHeaderData {
  company_id?: string;
  file_number?: string;
  vehicle_plate?: string;
  owner_name?: string;
  total_violations?: number;
  total_amount?: number;
}

// ----------------------------------------------------------------------------
// Extraction Result
// ----------------------------------------------------------------------------

export interface ExtractedViolationsResult {
  header: PDFHeaderData;
  violations: ExtractedViolation[];
  metadata: {
    processing_time_ms: number;
    text_length: number;
    parser_version: string;
    extraction_method: 'regex' | 'ai_fallback';
  };
}

// ----------------------------------------------------------------------------
// Violation Type Categories
// ----------------------------------------------------------------------------

export interface ViolationTypePattern {
  pattern: RegExp;
  category: string;
  keywords: string[];
}

// ----------------------------------------------------------------------------
// Match Result
// ----------------------------------------------------------------------------

export interface MatchResult {
  found: boolean;
  value?: string;
  confidence: number;
  raw_match?: string;
}

// ----------------------------------------------------------------------------
// Parser Options
// ----------------------------------------------------------------------------

export interface ParserOptions {
  strict?: boolean;
  require_all_fields?: boolean;
  min_confidence?: number;
  validate_dates?: boolean;
}
