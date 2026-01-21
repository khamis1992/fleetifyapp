/**
 * Type definitions for Vehicle Fleet HTML Report
 */

import { Vehicle } from '@/hooks/useVehicles';

/**
 * Extended vehicle interface with document and quality metadata
 */
export interface VehicleWithDocuments extends Vehicle {
  /**
   * List of missing field names (Arabic)
   * Example: ['رقم اللوحة', 'اللون', 'رقم الهيكل (VIN)']
   */
  missingFields?: string[];

  /**
   * List of missing document types (Arabic)
   * Example: ['صورة الاستمارة', 'وثيقة التأمين']
   */
  missingDocuments?: string[];
}

/**
 * Report metadata containing generation information and statistics
 */
export interface ReportMetadata {
  /**
   * Timestamp when the report was generated
   */
  generatedAt: Date;

  /**
   * Name of the user/system that generated the report
   * Example: 'أحمد محمد' or 'النظام'
   */
  generatedBy: string;

  /**
   * Human-readable description of applied filters (optional)
   * Example: 'الحالة: متاحة | البحث: toyota'
   */
  filters?: string;

  /**
   * Total number of vehicles in the report
   */
  totalCount: number;

  /**
   * Number of vehicles with complete data
   */
  completeCount: number;

  /**
   * Number of vehicles with missing/incomplete data
   */
  incompleteCount: number;

  /**
   * Number of vehicles with documents expiring soon (within 30 days)
   */
  expiringDocumentsCount: number;
}

/**
 * Status color configuration for badges
 */
export interface StatusColorConfig {
  /**
   * Background color in hex format
   * Example: '#dcfce7'
   */
  bg: string;

  /**
   * Text color in hex format
   * Example: '#166534'
   */
  text: string;
}

/**
 * Company information for the report header
 */
export interface CompanyInfo {
  /** Company name in Arabic */
  name_ar: string;
  /** Company name in English */
  name_en: string;
  /** Path to company logo image */
  logo: string;
  /** Company address in Arabic */
  address: string;
  /** Company address in English (optional) */
  address_en?: string;
  /** Company phone number */
  phone: string;
  /** Company email address */
  email: string;
  /** Company website URL */
  website: string;
  /** Commercial registration number */
  cr_number: string;
}

/**
 * Report generation options
 */
export interface ReportGenerationOptions {
  /**
   * Whether to include a print button
   * @default true
   */
  includePrintButton?: boolean;

  /**
   * Whether to include animated effects (disabled for print)
   * @default true
   */
  includeAnimations?: boolean;

  /**
   * Custom CSS to inject into the report
   */
  customCSS?: string;

  /**
   * Maximum width of the report in mm
   * @default 210 (A4 width)
   */
  maxWidth?: number;
}

/**
 * Vehicle statistics for summary section
 */
export interface VehicleStatistics {
  /** Total number of vehicles */
  total: number;
  /** Number of available vehicles */
  available: number;
  /** Number of rented vehicles */
  rented: number;
  /** Number of vehicles in maintenance */
  maintenance: number;
  /** Number of out-of-service vehicles */
  outOfService: number;
  /** Number of reserved vehicles */
  reserved: number;
  /** Number of vehicles with accidents */
  accident: number;
  /** Number of stolen vehicles */
  stolen: number;
  /** Number of vehicles at police station */
  policeStation: number;
}

/**
 * Document expiry information
 */
export interface DocumentExpiryInfo {
  /** Registration expiry date */
  registrationExpiry?: string;
  /** Insurance expiry date */
  insuranceExpiry?: string;
  /** Whether registration is expired */
  isRegistrationExpired: boolean;
  /** Whether registration is expiring soon (30 days) */
  isRegistrationExpiring: boolean;
  /** Whether insurance is expired */
  isInsuranceExpired: boolean;
  /** Whether insurance is expiring soon (30 days) */
  isInsuranceExpiring: boolean;
  /** Days until registration expiry */
  daysUntilRegistrationExpiry?: number;
  /** Days until insurance expiry */
  daysUntilInsuranceExpiry?: number;
}

/**
 * Complete vehicle report data
 */
export interface VehicleReportData {
  /** Vehicle basic information */
  vehicle: VehicleWithDocuments;
  /** Document expiry information */
  expiryInfo: DocumentExpiryInfo;
  /** Data quality score (0-100) */
  dataQualityScore: number;
  /** Whether data is complete */
  isDataComplete: boolean;
  /** List of data quality issues */
  qualityIssues: string[];
}

/**
 * Report export format
 */
export type ReportExportFormat = 'html' | 'pdf' | 'print';

/**
 * Report export result
 */
export interface ReportExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Export format used */
  format: ReportExportFormat;
  /** URL to the exported report (for HTML) */
  url?: string;
  /** Blob data (for download) */
  blob?: Blob;
  /** Error message if export failed */
  error?: string;
}

/**
 * Export options
 */
export interface ReportExportOptions {
  /** Export format */
  format: ReportExportFormat;
  /** Whether to open in new window (HTML only) */
  openInNewWindow?: boolean;
  /** Filename for download (optional) */
  filename?: string;
  /** Whether to show print dialog (print format) */
  showPrintDialog?: boolean;
}
