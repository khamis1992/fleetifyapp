/**
 * Enhanced Customer Types
 * Comprehensive type definitions to replace 'any' types in customer domain
 */

import { BaseEntity, ContactInfo, EmergencyContact, DocumentCollection, FinancialMetrics, VerificationStatus } from '../core';

// === Customer Entity Types ===

export interface Customer extends BaseEntity {
  customer_code?: string;
  customer_type: 'individual' | 'corporate';

  // Individual customer fields
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  date_of_birth?: string;
  national_id?: string;
  nationality?: string;
  passport_number?: string;
  license_number?: string;

  // Corporate customer fields
  company_name?: string;
  company_name_ar?: string;
  commercial_register?: string;
  tax_id?: string;

  // Contact information
  email?: string;
  phone: string;
  alternative_phone?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;

  // Credit and financial information
  credit_limit?: number;
  credit_rating?: 'excellent' | 'good' | 'fair' | 'poor';
  payment_terms?: number; // days

  // Status and risk management
  is_active?: boolean;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  risk_score?: number; // 0-100

  // Emergency contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact?: EmergencyContact;

  // Document expiry tracking
  license_expiry?: string;
  national_id_expiry?: string;
  passport_expiry?: string;

  // Relationships and metadata
  documents: DocumentCollection;
  notes?: string;
  tags?: string[];

  // Computed fields
  contracts_count?: number;
  active_contracts?: number;
  total_revenue?: number;
  last_contract_date?: string;

  // Relationships (lazy loaded)
  contracts?: Contract[];
  customer_accounts?: CustomerAccount[];
  payments?: Payment[];
  driver_licenses?: DriverLicense[];
}

export interface CustomerAccount extends BaseEntity {
  customer_id: string;
  account_number: string;
  account_type: 'receivable' | 'payable' | 'deposit';
  currency: string;
  opening_balance: number;
  current_balance: number;
  credit_limit?: number;
  is_active: boolean;
  last_activity_date?: string;
  notes?: string;
}

export interface DriverLicense extends BaseEntity {
  customer_id: string;
  license_number: string;
  issue_date?: string;
  expiry_date: string;
  issuing_country: string;
  license_type: 'standard' | 'commercial' | 'international';
  license_class?: string;
  restrictions?: string[];

  // Verification
  verification_status: VerificationStatus;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;

  // Documents
  front_image_url?: string;
  back_image_url?: string;

  // Metadata
  is_primary: boolean;
  notes?: string;
  scanned_data?: Record<string, unknown>;
}

// === Form Data Types ===

export interface CustomerFormData {
  customer_code?: string;
  customer_type: 'individual' | 'corporate';

  // Individual fields
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  date_of_birth?: string;
  national_id?: string;
  nationality?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry?: string;
  national_id_expiry?: string;

  // Corporate fields
  company_name?: string;
  company_name_ar?: string;
  commercial_register?: string;
  tax_id?: string;

  // Contact information
  email?: string;
  phone: string;
  alternative_phone?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;

  // Financial
  credit_limit?: number;
  credit_rating?: 'excellent' | 'good' | 'fair' | 'poor';
  payment_terms?: number;

  // Emergency contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Other
  notes?: string;
  tags?: string[];
  documents?: DocumentCollection;
  selectedCompanyId?: string;
}

export interface DriverLicenseFormData {
  license_number: string;
  issue_date?: string;
  expiry_date: string;
  issuing_country: string;
  license_type: 'standard' | 'commercial' | 'international';
  license_class?: string;
  restrictions?: string[];
  is_primary?: boolean;
  notes?: string;
  front_image?: File;
  back_image?: File;
}

// === Filter and Search Types ===

export interface CustomerFilters {
  customer_type?: 'individual' | 'corporate';
  is_blacklisted?: boolean;
  is_active?: boolean;
  search?: string;
  customer_code?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  credit_rating?: 'excellent' | 'good' | 'fair' | 'poor';
  risk_score_min?: number;
  risk_score_max?: number;
  tags?: string[];
  created_after?: string;
  created_before?: string;
  has_active_contracts?: boolean;
  has_overdue_payments?: boolean;

  // Pagination
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CustomerSearchResult {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  search_time: number;
}

// === Financial and Account Types ===

export interface CustomerAccountTransaction {
  id: string;
  account_id: string;
  customer_id: string;
  transaction_date: string;
  transaction_type: 'payment' | 'invoice' | 'opening_balance' | 'journal_debit' | 'journal_credit' | 'refund' | 'adjustment';
  description: string;
  reference_number: string;
  reference_type: 'contract' | 'invoice' | 'payment' | 'journal' | 'manual';
  reference_id?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  currency: string;
  exchange_rate?: number;

  // Metadata
  created_by: string;
  notes?: string;
  attachments?: string[];
  reconciled_at?: string;
  reconciled_by?: string;
}

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_paid: number;
  balance_due: number;
  overdue_amount: number;
  credit_limit_used: number;
  credit_limit_available: number;
  average_payment_delay_days: number;
  last_payment_date?: string;
  next_payment_due?: string;
  payment_history_score: number; // 0-100
  account_age_months: number;
  active_contracts_count: number;
  total_contracts_count: number;
}

// === Analytics and Reporting Types ===

export interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  new_customers_this_year: number;
  customer_retention_rate: number;
  average_customer_value: number;
  customer_satisfaction_score?: number;

  // Breakdown by type
  individual_customers: number;
  corporate_customers: number;

  // Risk analysis
  high_risk_customers: number;
  blacklisted_customers: number;

  // Geographic distribution
  customers_by_city: Record<string, number>;
  customers_by_country: Record<string, number>;
}

export interface CustomerActivityReport {
  customer_id: string;
  period_start: string;
  period_end: string;

  // Contract activity
  new_contracts: number;
  renewed_contracts: number;
  cancelled_contracts: number;

  // Payment activity
  total_payments: number;
  on_time_payments: number;
  late_payments: number;
  payment_completion_rate: number;

  // Communication
  emails_sent: number;
  calls_made: number;
  meetings_held: number;

  // Support tickets
  support_tickets_opened: number;
  support_tickets_resolved: number;
  average_resolution_time_hours: number;
}

// === Validation and Compliance Types ===

export interface CustomerValidationResult {
  valid: boolean;
  errors: CustomerValidationError[];
  warnings: CustomerValidationWarning[];
  score: number; // 0-100
  recommendations: string[];
}

export interface CustomerValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CustomerValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface CustomerComplianceCheck {
  customer_id: string;
  check_date: string;

  // Document compliance
  valid_id_document: boolean;
  valid_license: boolean;
  valid_address_proof: boolean;

  // Financial compliance
  credit_check_passed: boolean;
  sanctions_check_passed: boolean;
  aml_check_passed: boolean;

  // Risk assessment
  risk_score: number;
  risk_factors: string[];
  recommended_actions: string[];

  // Status
  overall_status: 'compliant' | 'non_compliant' | 'requires_review';
  next_review_date?: string;
}

// === Import/Export Types ===

export interface CustomerImportData {
  customer_code?: string;
  customer_type: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  credit_limit?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface CustomerImportResult {
  success: boolean;
  total_records: number;
  imported_count: number;
  failed_count: number;
  updated_count: number;
  errors: CustomerImportError[];
  warnings: CustomerImportWarning[];
  duplicates_found: string[];
}

export interface CustomerImportError {
  row_number: number;
  field: string;
  value: string;
  error: string;
  suggestion?: string;
}

export interface CustomerImportWarning {
  row_number: number;
  field: string;
  value: string;
  warning: string;
}

// === Lazy-loaded relationship types (to avoid circular dependencies) ===
interface Contract {
  id: string;
  contract_number: string;
  status: string;
  contract_amount: number;
  start_date: string;
  end_date: string;
}

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_status: string;
}