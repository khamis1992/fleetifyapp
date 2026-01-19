/**
 * Signed Agreements Upload Type Definitions
 *
 * Comprehensive types for the signed agreements upload feature including:
 * - File upload state management
 * - AI-powered contract matching
 * - Supabase storage operations
 * - Edge function communication
 * - Type guards and validators
 */

import { Database } from '@/integrations/supabase/types';

// ============================================================================
// Database Types (from generated types)
// ============================================================================

type ContractDocumentRow = Database['public']['Tables']['contract_documents']['Row'];
type ContractDocumentInsert = Database['public']['Tables']['contract_documents']['Insert'];
type ContractDocumentUpdate = Database['public']['Tables']['contract_documents']['Update'];

type ContractRow = Database['public']['Tables']['contracts']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];
type VehicleRow = Database['public']['Tables']['vehicles']['Row'];

// ============================================================================
// Document Type Constants
// ============================================================================

/**
 * Supported document types for contract documents
 */
export type ContractDocumentType =
  | 'signed_agreement'
  | 'contract_copy'
  | 'id_document'
  | 'driver_license'
  | 'vehicle_registration'
  | 'insurance_certificate'
  | 'receipt'
  | 'other';

/**
 * Valid MIME types for document uploads
 */
export type ValidMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/jpg';

/**
 * File processing states
 */
export type FileProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'matching'
  | 'completed'
  | 'failed'
  | 'cancelled';

// ============================================================================
// Upload File State Types
// ============================================================================

/**
 * Represents a single file being uploaded for AI matching
 */
export interface UploadedFile {
  /** Unique identifier for this upload session */
  id: string;
  /** The original File object */
  file: File;
  /** Current processing status */
  status: FileProcessingStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** AI matching result (populated after processing) */
  matchResult: MatchResult | null;
  /** Error message if status is 'failed' */
  error: string | null;
  /** Storage path after successful upload */
  storagePath: string | null;
  /** Public URL after successful upload */
  publicUrl: string | null;
  /** Timestamp when upload started */
  startedAt: Date;
  /** Timestamp when upload completed */
  completedAt: Date | null;
  /** Document metadata extracted from file */
  metadata: DocumentMetadata | null;
}

/**
 * Metadata extracted from the document during processing
 */
export interface DocumentMetadata {
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Original filename */
  fileName: string;
  /** File extension */
  extension: string;
  /** SHA-256 hash of file contents */
  fileHash?: string;
  /** Number of pages (for PDF) */
  pageCount?: number;
  /** PDF creation date if available */
  creationDate?: string;
  /** PDF author if available */
  author?: string;
  /** PDF subject if available */
  subject?: string;
  /** Extracted text preview (first 500 chars) */
  textPreview?: string;
}

/**
 * AI-powered matching result for linking document to contract
 */
export interface MatchResult {
  /** Overall confidence score (0-100) */
  confidence: number;
  /** Match status */
  status: MatchStatus;
  /** Matched contract information */
  contract: ContractMatch | null;
  /** Matched customer information */
  customer: CustomerMatch | null;
  /** Matched vehicle information */
  vehicle: VehicleMatch | null;
  /** Reasoning for the match */
  reasons: string[];
  /** Alternative matches with lower confidence */
  alternatives: AlternativeMatch[];
  /** Warnings about the match */
  warnings: string[];
  /** Raw AI response for debugging */
  rawResponse?: string;
  /** Extracted data from document */
  extractedData: ExtractedAgreementData;
  /** Processing timestamp */
  processedAt: Date;
}

/**
 * Match status indicating the quality of the match
 */
export type MatchStatus =
  | 'exact'           // Perfect match on all fields
  | 'high_confidence' // Strong match with minor discrepancies
  | 'moderate'        // Partial match, needs review
  | 'low'             // Weak match, likely incorrect
  | 'no_match';       // No matching entities found

/**
 * Contract match information
 */
export interface ContractMatch {
  /** Contract ID */
  id: string;
  /** Contract number */
  contractNumber: string;
  /** Match confidence for this specific contract (0-100) */
  confidence: number;
  /** Matching reasons specific to contract */
  reasons: string[];
}

/**
 * Customer match information
 */
export interface CustomerMatch {
  /** Customer ID */
  id: string;
  /** Customer display name (localized) */
  name: string;
  /** Customer type */
  customerType: 'individual' | 'corporate';
  /** Match confidence for this specific customer (0-100) */
  confidence: number;
  /** Matching reasons specific to customer */
  reasons: string[];
  /** Customer phone number if matched */
  phone?: string;
  /** Customer email if matched */
  email?: string;
}

/**
 * Vehicle match information
 */
export interface VehicleMatch {
  /** Vehicle ID */
  id: string;
  /** License plate number */
  licensePlate: string;
  /** Vehicle make */
  make: string;
  /** Vehicle model */
  model: string;
  /** Vehicle year */
  year: number;
  /** Match confidence for this specific vehicle (0-100) */
  confidence: number;
  /** Matching reasons specific to vehicle */
  reasons: string[];
}

/**
 * Alternative match with lower confidence
 */
export interface AlternativeMatch {
  /** Alternative match type */
  type: 'contract' | 'customer' | 'vehicle';
  /** Entity ID */
  id: string;
  /** Display name/number */
  name: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Reason for considering as alternative */
  reason: string;
}

/**
 * Data extracted from the signed agreement document
 */
export interface ExtractedAgreementData {
  /** Contract number if found */
  contractNumber?: string;
  /** Customer name if found */
  customerName?: string;
  /** Customer name in Arabic */
  customerNameAr?: string;
  /** Customer phone if found */
  customerPhone?: string;
  /** Customer ID/passport if found */
  customerIdNumber?: string;
  /** License plate if found */
  licensePlate?: string;
  /** Vehicle make/model if found */
  vehicleInfo?: string;
  /** Start date if found */
  startDate?: string;
  /** End date if found */
  endDate?: string;
  /** Monthly amount if found */
  monthlyAmount?: number;
  /** Contract amount if found */
  contractAmount?: number;
  /** Signature date */
  signatureDate?: string;
  /** Any other extracted text */
  additionalText?: string;
  /** All extracted text lines */
  rawLines?: string[];
}

/**
 * Overall upload state for the signed agreements component
 */
export interface UploadState {
  /** All files being processed */
  files: UploadedFile[];
  /** Overall processing status */
  processingStatus: 'idle' | 'processing' | 'completed' | 'partial' | 'failed';
  /** Number of files successfully processed */
  completedCount: number;
  /** Number of files currently processing */
  processingCount: number;
  /** Number of files that failed */
  failedCount: number;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Current operation message */
  currentMessage: string;
  /** Upload session started at */
  startedAt: Date | null;
  /** Upload session completed at */
  completedAt: Date | null;
}

/**
 * User confirmation for match result
 */
export interface MatchConfirmation {
  /** File ID being confirmed */
  fileId: string;
  /** Confirmed contract ID (or null to unlink) */
  contractId: string | null;
  /** Confirmed document type */
  documentType: ContractDocumentType;
  /** Document name override */
  documentName?: string;
  /** Additional notes */
  notes?: string;
  /** Whether to create a new contract if no match found */
  createNewContract?: boolean;
}

/**
 * Result of saving a confirmed document
 */
export interface SaveResult {
  /** Whether save was successful */
  success: boolean;
  /** Created/updated contract document record */
  document?: ContractDocumentRow;
  /** Error message if failed */
  error?: string;
  /** Storage path of saved document */
  storagePath?: string;
  /** Public URL of saved document */
  publicUrl?: string;
}

// ============================================================================
// Edge Function Types
// ============================================================================

/**
 * Request payload for AI matching edge function
 */
export interface AIMatchingRequest {
  /** Company ID for scoping the search */
  companyId: string;
  /** Base64 encoded PDF content */
  pdfBase64: string;
  /** Original filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Optional: Contract ID to verify against */
  expectedContractId?: string;
  /** Optional: Customer ID to verify against */
  expectedCustomerId?: string;
  /** Optional: Vehicle ID to verify against */
  expectedVehicleId?: string;
}

/**
 * Response payload from AI matching edge function
 */
export interface AIMatchingResponse {
  /** Whether processing was successful */
  success: boolean;
  /** Match result data */
  data?: MatchResultData;
  /** Overall confidence score */
  confidence?: number;
  /** Error message if failed */
  error?: string;
  /** Error code for specific handling */
  errorCode?: 'PDF_PARSE_ERROR' | 'NO_TEXT_FOUND' | 'AI_ERROR' | 'INVALID_REQUEST';
}

/**
 * Match result data from edge function
 */
export interface MatchResultData {
  /** Overall confidence */
  confidence: number;
  /** Match status */
  status: MatchStatus;
  /** Contract match */
  contract?: ContractMatch;
  /** Customer match */
  customer?: CustomerMatch;
  /** Vehicle match */
  vehicle?: VehicleMatch;
  /** Match reasons */
  reasons: string[];
  /** Alternative matches */
  alternatives?: AlternativeMatch[];
  /** Warnings */
  warnings: string[];
  /** Extracted agreement data */
  extractedData: ExtractedAgreementData;
}

/**
 * Response from document upload edge function
 */
export interface DocumentUploadResponse {
  /** Whether upload was successful */
  success: boolean;
  /** Storage path */
  path?: string;
  /** Public URL */
  publicUrl?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Supabase Storage Types
// ============================================================================

/**
 * Storage bucket configuration for contract documents
 */
export interface StorageBucketConfig {
  /** Bucket name */
  name: string;
  /** Whether bucket is public */
  public: boolean;
  /** Allowed MIME types */
  allowedMimeTypes: ValidMimeType[];
  /** Maximum file size in bytes */
  maxFileSize: number;
}

/**
 * Upload options for Supabase storage
 */
export interface StorageUploadOptions {
  /** Storage path (will be auto-generated if not provided) */
  path?: string;
  /** Whether to upsert (overwrite existing) */
  upsert?: boolean;
  /** Cache control header */
  cacheControl?: string;
  /** Content type (auto-detected from file) */
  contentType?: string;
  /** Metadata to attach to file */
  metadata?: Record<string, string>;
}

/**
 * Result of storage upload operation
 */
export interface StorageUploadResult {
  /** Full storage path */
  path: string;
  /** Public URL (if bucket is public) */
  publicUrl: string;
  /** Signed URL (if bucket is private) */
  signedUrl?: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** ETag for versioning */
  etag: string;
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Validates if a file is a valid PDF for upload
 */
export function validatePDFFile(file: File): PDFValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    errors.push('File must have .pdf extension');
  }

  // Check MIME type
  if (file.type !== 'application/pdf') {
    errors.push('File must be a PDF document');
  }

  // Check file size (max 25MB)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size === 0) {
    errors.push('File is empty');
  } else if (file.size > MAX_SIZE) {
    errors.push(`File size (${formatBytes(file.size)}) exceeds maximum of ${formatBytes(MAX_SIZE)}`);
  }

  // Warning for large files
  const WARNING_SIZE = 5 * 1024 * 1024;
  if (file.size > WARNING_SIZE) {
    warnings.push(`Large file detected (${formatBytes(file.size)}). Processing may take longer.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileSize: file.size,
    fileName: file.name
  };
}

/**
 * Result of PDF validation
 */
export interface PDFValidationResult {
  /** Whether file is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** File size in bytes */
  fileSize: number;
  /** File name */
  fileName: string;
}

/**
 * Type guard to check if value is a valid MatchResult
 */
export function isValidMatchResult(value: unknown): value is MatchResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const mr = value as Record<string, unknown>;

  return (
    typeof mr.confidence === 'number' &&
    mr.confidence >= 0 &&
    mr.confidence <= 100 &&
    typeof mr.status === 'string' &&
    isValidMatchStatus(mr.status) &&
    typeof mr.reasons === 'object' &&
    Array.isArray(mr.reasons) &&
    mr.reasons.every((r: unknown) => typeof r === 'string') &&
    typeof mr.extractedData === 'object' &&
    mr.extractedData !== null &&
    isValidExtractedAgreementData(mr.extractedData)
  );
}

/**
 * Type guard for MatchStatus
 */
function isValidMatchStatus(value: string): value is MatchStatus {
  return ['exact', 'high_confidence', 'moderate', 'low', 'no_match'].includes(value);
}

/**
 * Type guard for ExtractedAgreementData
 */
function isValidExtractedAgreementData(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;
  const allowedKeys = [
    'contractNumber', 'customerName', 'customerNameAr', 'customerPhone',
    'customerIdNumber', 'licensePlate', 'vehicleInfo', 'startDate',
    'endDate', 'monthlyAmount', 'contractAmount', 'signatureDate',
    'additionalText', 'rawLines'
  ];

  // Check that all keys are allowed
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      return false;
    }
  }

  // Validate rawLines if present
  if (data.rawLines !== undefined) {
    if (!Array.isArray(data.rawLines)) {
      return false;
    }
    if (!data.rawLines.every((item: unknown) => typeof item === 'string')) {
      return false;
    }
  }

  // Validate numeric fields
  if (data.monthlyAmount !== undefined && typeof data.monthlyAmount !== 'number') {
    return false;
  }
  if (data.contractAmount !== undefined && typeof data.contractAmount !== 'number') {
    return false;
  }

  return true;
}

/**
 * Parses AI response from edge function into MatchResult
 */
export function parseAIResponse(response: unknown, fileId: string): MatchResult | null {
  if (!isValidAIMatchingResponse(response)) {
    console.error('Invalid AI response:', response);
    return null;
  }

  if (!response.success || !response.data) {
    return null;
  }

  return {
    confidence: response.data.confidence,
    status: response.data.status,
    contract: response.data.contract || null,
    customer: response.data.customer || null,
    vehicle: response.data.vehicle || null,
    reasons: response.data.reasons,
    alternatives: response.data.alternatives || [],
    warnings: response.data.warnings || [],
    rawResponse: JSON.stringify(response),
    extractedData: response.data.extractedData,
    processedAt: new Date()
  };
}

/**
 * Type guard for AIMatchingResponse
 */
function isValidAIMatchingResponse(value: unknown): value is AIMatchingResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const r = value as Record<string, unknown>;

  return (
    typeof r.success === 'boolean' &&
    (r.data === undefined || typeof r.data === 'object') &&
    (r.confidence === undefined || typeof r.confidence === 'number') &&
    (r.error === undefined || typeof r.error === 'string') &&
    (r.errorCode === undefined || typeof r.errorCode === 'string')
  );
}

/**
 * Validates contract document insert data
 */
export function validateContractDocumentInsert(
  data: Record<string, unknown>
): data is ContractDocumentInsert {
  const required = ['contract_id', 'document_name', 'company_id'];

  for (const field of required) {
    if (typeof data[field] !== 'string') {
      return false;
    }
  }

  // Validate document_type if provided
  if (data.document_type !== undefined) {
    const validTypes: ContractDocumentType[] = [
      'signed_agreement', 'contract_copy', 'id_document', 'driver_license',
      'vehicle_registration', 'insurance_certificate', 'receipt', 'other'
    ];
    if (!validTypes.includes(data.document_type as ContractDocumentType)) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats bytes to human-readable string
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generates a storage path for uploaded document
 */
export function generateStoragePath(
  companyId: string,
  contractId: string,
  documentType: ContractDocumentType,
  fileName: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${companyId}/contracts/${contractId}/${documentType}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Generates a default document name from file
 */
export function generateDocumentName(
  file: File,
  documentType: ContractDocumentType
): string {
  const baseName = file.name.replace('.pdf', '');
  const timestamp = new Date().toISOString().split('T')[0];

  const typeLabels: Record<ContractDocumentType, string> = {
    signed_agreement: 'Signed Agreement',
    contract_copy: 'Contract Copy',
    id_document: 'ID Document',
    driver_license: "Driver's License",
    vehicle_registration: 'Vehicle Registration',
    insurance_certificate: 'Insurance Certificate',
    receipt: 'Receipt',
    other: 'Document'
  };

  return `${typeLabels[documentType]} - ${baseName} (${timestamp})`;
}

/**
 * Checks if a match result requires manual review
 */
export function requiresManualReview(matchResult: MatchResult): boolean {
  return (
    matchResult.status === 'moderate' ||
    matchResult.status === 'low' ||
    matchResult.status === 'no_match' ||
    matchResult.warnings.length > 0 ||
    matchResult.confidence < 70
  );
}

/**
 * Gets the best match from alternatives
 */
export function getBestMatch(
  alternatives: AlternativeMatch[],
  type: 'contract' | 'customer' | 'vehicle'
): AlternativeMatch | null {
  const filtered = alternatives
    .filter(a => a.type === type)
    .sort((a, b) => b.confidence - a.confidence);

  return filtered[0] || null;
}

/**
 * Calculates match quality metrics
 */
export interface MatchQualityMetrics {
  /** Overall quality score */
  score: number;
  /** Requires review flag */
  requiresReview: boolean;
  /** Can auto-save flag */
  canAutoSave: boolean;
  /** Quality label */
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export function calculateMatchQuality(matchResult: MatchResult): MatchQualityMetrics {
  const confidence = matchResult.confidence;
  const hasWarnings = matchResult.warnings.length > 0;
  const status = matchResult.status;

  let score = confidence;
  let quality: MatchQualityMetrics['quality'] = 'poor';
  let requiresReview = true;
  let canAutoSave = false;

  // Adjust score based on status
  if (status === 'exact') {
    score = Math.min(100, score + 10);
  } else if (status === 'high_confidence') {
    score = Math.max(70, score);
  } else if (status === 'moderate') {
    score = Math.max(50, score - 10);
  } else if (status === 'low') {
    score = Math.max(30, score - 20);
  }

  // Adjust for warnings
  if (hasWarnings) {
    score = Math.max(0, score - 15);
  }

  // Determine quality
  if (score >= 90 && status === 'exact' && !hasWarnings) {
    quality = 'excellent';
    requiresReview = false;
    canAutoSave = true;
  } else if (score >= 75 && status === 'high_confidence') {
    quality = 'good';
    requiresReview = hasWarnings;
    canAutoSave = !hasWarnings;
  } else if (score >= 50) {
    quality = 'fair';
    requiresReview = true;
    canAutoSave = false;
  } else {
    quality = 'poor';
    requiresReview = true;
    canAutoSave = false;
  }

  return { score, requiresReview, canAutoSave, quality };
}

/**
 * Merges multiple match results for the same file
 */
export function mergeMatchResults(results: MatchResult[]): MatchResult | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  // Take the result with highest confidence
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
  const base = sorted[0];

  // Merge reasons and warnings from all results
  const allReasons = new Set<string>();
  const allWarnings = new Set<string>();
  const allAlternatives: AlternativeMatch[] = [];

  for (const result of results) {
    result.reasons.forEach(r => allReasons.add(r));
    result.warnings.forEach(w => allWarnings.add(w));
    allAlternatives.push(...result.alternatives);
  }

  return {
    ...base,
    reasons: Array.from(allReasons),
    warnings: Array.from(allWarnings),
    alternatives: allAlternatives
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for upload failures
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: UploadErrorCode,
    public fileId?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Error codes for upload operations
 */
export type UploadErrorCode =
  | 'INVALID_FILE'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED'
  | 'AI_MATCHING_FAILED'
  | 'STORAGE_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'CANCELLED';

/**
 * Result of an upload operation that may have failed
 */
export type UploadResult<T = MatchResult> =
  | { success: true; data: T }
  | { success: false; error: UploadError };

/**
 * Wraps an async operation in error handling
 */
export async function handleUploadErrors<T>(
  operation: () => Promise<T>,
  fileId?: string
): Promise<UploadResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    let code: UploadErrorCode = 'UPLOAD_FAILED';
    let message = 'Upload failed';

    if (error instanceof UploadError) {
      return { success: false, error };
    }

    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        code = 'NETWORK_ERROR';
        message = 'Network connection failed';
      } else if (error.message.includes('permission') || error.message.includes('403')) {
        code = 'PERMISSION_DENIED';
        message = 'Permission denied';
      } else if (error.message.includes('storage') || error.message.includes('bucket')) {
        code = 'STORAGE_ERROR';
        message = 'Storage error occurred';
      } else if (error.message.includes('database') || error.message.includes('constraint')) {
        code = 'DATABASE_ERROR';
        message = 'Database error occurred';
      }
    }

    const uploadError = new UploadError(message, code, fileId, error);
    return { success: false, error: uploadError };
  }
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  ContractDocumentRow,
  ContractDocumentInsert,
  ContractDocumentUpdate,
  ContractRow,
  CustomerRow,
  VehicleRow
};
