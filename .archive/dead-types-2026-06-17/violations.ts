// ============================================================================
// Traffic Violation Types
// Types and interfaces for MOI Qatar PDF import system
// ============================================================================

import { Database } from '@/integrations/supabase/types';

// ----------------------------------------------------------------------------
// Database Types
// ----------------------------------------------------------------------------

export type TrafficViolation = Database['public']['Tables']['traffic_violations']['Row'];
export type TrafficViolationInsert = Database['public']['Tables']['traffic_violations']['Insert'];
export type TrafficViolationUpdate = Database['public']['Tables']['traffic_violations']['Update'];

// ----------------------------------------------------------------------------
// Match Confidence Levels
// ----------------------------------------------------------------------------

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

export const MATCH_CONFIDENCE_LABELS: Record<MatchConfidence, string> = {
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
  none: 'غير محدد'
};

export const MATCH_CONFIDENCE_COLORS: Record<MatchConfidence, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-orange-600',
  none: 'text-slate-400'
};

// ----------------------------------------------------------------------------
// Import Source Types
// ----------------------------------------------------------------------------

export type ImportSource = 'moi_pdf' | 'manual' | 'api' | 'bulk_import';

export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  moi_pdf: 'وزارة الداخلية (PDF)',
  manual: 'إدخال يدوي',
  api: 'API',
  bulk_import: 'استيراد دفعي'
};

// ----------------------------------------------------------------------------
// Extracted Violation (from PDF/AI)
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
// AI Extraction Response
// ----------------------------------------------------------------------------

export interface MOIViolationExtractionResponse {
  header?: PDFHeaderData;
  violations: ExtractedViolation[];
}

// ----------------------------------------------------------------------------
// Matched Violation (with linking info)
// ----------------------------------------------------------------------------

export interface MatchedViolation extends ExtractedViolation {
  id: string; // Temporary ID for UI
  vehicle_id?: string | null;
  contract_id?: string | null;
  customer_id?: string | null;
  customer_name?: string;
  contract_number?: string;
  match_confidence: MatchConfidence;
  status: 'extracted' | 'matched' | 'partial' | 'error';
  errors: string[];
  warnings: string[];
  is_duplicate?: boolean;
  existing_violation_id?: string;
}

// ----------------------------------------------------------------------------
// Contract Match Result
// ----------------------------------------------------------------------------

export interface ContractMatchResult {
  contract_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  contract_number: string | null;
  confidence: MatchConfidence;
  reason: string;
}

// ----------------------------------------------------------------------------
// Vehicle Match Result
// ----------------------------------------------------------------------------

export interface VehicleMatchResult {
  vehicle_id: string | null;
  plate_number: string;
  confidence: MatchConfidence;
  reason: string;
}

// ----------------------------------------------------------------------------
// Duplicate Check Result
// ----------------------------------------------------------------------------

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  existing_violation?: TrafficViolation;
  duplicate_type: 'reference_number' | 'composite' | 'similar' | 'none';
  confidence: 'exact' | 'high' | 'medium' | 'low';
}

// ----------------------------------------------------------------------------
// Import Processing Result
// ----------------------------------------------------------------------------

export interface ImportProcessingResult {
  total_extracted: number;
  successful_matches: number;
  partial_matches: number;
  errors: number;
  duplicates_found: number;
  violations: MatchedViolation[];
  header?: PDFHeaderData;
  total_amount: number;
}

// ----------------------------------------------------------------------------
// Violation Import Options
// ----------------------------------------------------------------------------

export interface ViolationImportOptions {
  auto_link: boolean;
  save_unmatched: boolean;
  check_duplicates: boolean;
  skip_duplicates: boolean;
  company_id: string;
}

// ----------------------------------------------------------------------------
// Contract Search Filters
// ----------------------------------------------------------------------------

export interface ContractSearchFilters {
  vehicle_id: string;
  violation_date: string;
  status?: string;
}

// ----------------------------------------------------------------------------
// Vehicle Search Options
// ----------------------------------------------------------------------------

export interface VehicleSearchOptions {
  plate_number: string;
  company_id: string;
  include_variations?: boolean;
}

// ----------------------------------------------------------------------------
// Match Confidence Calculation
// ----------------------------------------------------------------------------

export interface MatchConfidenceInput {
  has_active_contract: boolean;
  date_range_match: boolean;
  vehicle_match: boolean;
  customer_found: boolean;
  days_from_violation?: number;
}

// ----------------------------------------------------------------------------
// Import Error Types
// ----------------------------------------------------------------------------

export interface ImportError {
  violation_id: string;
  violation_number: string;
  error_type: 'vehicle_not_found' | 'contract_not_found' | 'duplicate' | 'invalid_data' | 'save_failed';
  error_message: string;
  can_retry: boolean;
}

// ----------------------------------------------------------------------------
// Statistics Types
// ----------------------------------------------------------------------------

export interface ViolationStatistics {
  total: number;
  by_status: Record<string, number>;
  by_confidence: Record<MatchConfidence, number>;
  by_vehicle: Record<string, number>;
  by_customer: Record<string, number>;
  total_amount: number;
  unpaid_amount: number;
  paid_amount: number;
}

// ----------------------------------------------------------------------------
// Manual Link Request
// ----------------------------------------------------------------------------

export interface ManualLinkRequest {
  violation_id: string;
  vehicle_id?: string;
  contract_id?: string;
  customer_id?: string;
}
