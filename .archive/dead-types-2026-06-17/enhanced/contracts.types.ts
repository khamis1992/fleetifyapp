/**
 * Enhanced Contract Types
 * Comprehensive type definitions to replace 'any' types in contracts domain
 */

import { BaseEntity, DocumentCollection, Money } from '../core';

// === Contract Entity Types ===

export interface Contract extends BaseEntity {
  // Basic identification
  contract_number: string;
  contract_type: ContractType;
  contract_date: string;

  // Dates and duration
  start_date: string;
  end_date: string;
  actual_end_date?: string;
  duration_days: number;
  extended_days?: number;

  // Parties involved
  customer_id: string;
  vehicle_id?: string;
  driver_id?: string;
  created_by: string;
  approved_by?: string;
  sales_representative_id?: string;

  // Financial information
  contract_amount: number;
  currency: string;
  deposit_amount?: number;
  deposit_paid?: boolean;
  deposit_refunded?: boolean;
  deposit_refund_date?: string;

  // Pricing structure
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  flat_rate?: number;
  mileage_charges?: ContractMileageCharges;

  // Payment terms
  payment_terms: PaymentTerms;
  payment_schedule?: PaymentSchedule[];
  billing_cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
  advance_payment_required?: number;
  advance_payment_paid?: number;

  // Status and workflow
  status: ContractStatus;
  previous_status?: ContractStatus;
  activation_date?: string;
  cancellation_date?: string;
  cancellation_reason?: string;
  renewal_count?: number;
  is_template?: boolean;
  template_id?: string;

  // Vehicle information
  vehicle_delivery_date?: string;
  vehicle_return_date?: string;
  vehicle_delivery_location?: string;
  vehicle_return_location?: string;
  vehicle_condition_start?: VehicleConditionReport;
  vehicle_condition_end?: VehicleConditionReport;
  odometer_start?: number;
  odometer_end?: number;
  fuel_level_start?: number;
  fuel_level_end?: number;

  // Driver information
  primary_driver?: DriverInfo;
  additional_drivers?: DriverInfo[];
  driver_license_verified?: boolean;
  driver_license_expiry?: string;

  // Insurance and liability
  insurance_included: boolean;
  insurance_type?: 'basic' | 'comprehensive' | 'premium';
  insurance_coverage_limit?: number;
  deductible_amount?: number;
  customer_insurance_required?: boolean;
  customer_insurance_policy?: string;
  liability_coverage?: LiabilityCoverage;

  // Terms and conditions
  description?: string;
  terms?: string;
  special_conditions?: string[];
  prohibited_uses?: string[];
  maintenance_responsibility: 'company' | 'customer' | 'shared';
  fuel_policy: FuelPolicy;

  // Mileage and usage limits
  mileage_limit_type: 'unlimited' | 'included' | 'charged';
  included_mileage?: number;
  excess_mileage_rate?: number;
  usage_restrictions?: UsageRestrictions[];

  // Late fees and penalties
  late_fee_policy: LateFeePolicy;
  late_fine_amount?: number;
  days_overdue?: number;
  grace_period_days?: number;

  // Extensions and renewals
  extension_allowed?: boolean;
  extension_terms?: ExtensionTerms;
  auto_renewal?: boolean;
  renewal_terms?: RenewalTerms;

  // Taxes and fees
  tax_rate?: number;
  tax_amount?: number;
  service_fees?: ServiceFee[];
  government_fees?: GovernmentFee[];

  // Discounts and promotions
  discounts?: ContractDiscount[];
  promotional_code?: string;
  corporate_discount?: number;

  // Documents and attachments
  documents: DocumentCollection;
  signed_contract_url?: string;
  electronic_signature?: ElectronicSignatureInfo;
  required_documents?: RequiredDocument[];
  provided_documents?: ProvidedDocument[];

  // Integration with financial systems
  cost_center_id?: string;
  journal_entry_id?: string;
  invoice_ids?: string[];
  payment_ids?: string[];
  accounting_sync_status: 'pending' | 'synced' | 'failed' | 'not_required';

  // Metadata
  notes?: string;
  internal_notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  source: 'web' | 'mobile' | 'api' | 'import' | 'manual';

  // Relationships (lazy loaded)
  customer?: Customer;
  vehicle?: Vehicle;
  payments?: Payment[];
  invoices?: Invoice[];
  amendments?: ContractAmendment[];
  maintenance_records?: VehicleMaintenance[];
  violations?: TrafficViolation[];
}

// === Type Definitions ===

export type ContractType =
  | 'rental'
  | 'daily_rental'
  | 'weekly_rental'
  | 'monthly_rental'
  | 'yearly_rental'
  | 'rent_to_own'
  | 'lease'
  | 'subscription'
  | 'corporate'
  | 'government'
  | 'insurance_replacement'
  | 'long_term'
  | 'short_term'
  | 'trial'
  | 'demo';

export type ContractStatus =
  | 'draft'
  | 'under_review'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'cancelled'
  | 'terminated'
  | 'renewed'
  | 'completed'
  | 'archived';

export type PaymentTerms = {
  due_within_days: number;
  late_fee_applied_after_days?: number;
  payment_methods: PaymentMethod[];
  auto_payment_enabled?: boolean;
  auto_payment_day?: number;
  reminder_days_before_due?: number[];
};

export type PaymentMethod =
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'online_payment'
  | 'mobile_wallet'
  | 'cryptocurrency'
  | 'other';

export type FuelPolicy =
  | 'full_to_full'
  | 'same_level'
  | 'prepaid'
  | 'not_included'
  | 'company_provided';

export type LiabilityCoverage = {
  property_damage_limit: number;
  bodily_injury_limit: number;
  personal_injury_limit: number;
  uninsured_motorist_coverage: boolean;
  underinsured_motorist_coverage: boolean;
};

// === Supporting Types ===

export interface ContractMileageCharges {
  type: 'per_km' | 'per_mile' | 'tiered';
  rate: number;
  included_mileage?: number;
  tiered_rates?: {
    from_mileage: number;
    to_mileage?: number;
    rate: number;
  }[];
}

export interface PaymentSchedule {
  id: string;
  due_date: string;
  amount: number;
  description?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  payment_method?: string;
  invoice_id?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  license_number: string;
  license_expiry: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  relationship_to_customer: 'self' | 'employee' | 'family_member' | 'authorized_driver';
  is_primary: boolean;
  license_verified?: boolean;
  verification_date?: string;
  restrictions?: string[];
}

export interface VehicleConditionReport {
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  exterior_condition: string;
  interior_condition: string;
  mechanical_condition: string;
  tire_condition: string;
  battery_condition: string;
  fuel_level?: number;
  existing_damage?: ExistingDamage[];
  photos?: string[];
  inspector_name?: string;
  inspection_date?: string;
  notes?: string;
}

export interface ExistingDamage {
  id: string;
  location: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  photo_url?: string;
  repair_cost_estimate?: number;
  customer_acknowledged?: boolean;
}

export interface LateFeePolicy {
  enabled: boolean;
  type: 'fixed_amount' | 'percentage' | 'daily_rate' | 'custom';
  amount?: number;
  percentage?: number;
  maximum_late_fee?: number;
  compounding_interest?: boolean;
  grace_period_days: number;
  calculation_method: 'daily' | 'weekly' | 'monthly';
}

export interface ExtensionTerms {
  max_extension_days: number;
  extension_rate_type: 'same_rate' | 'increased_rate' | 'custom_rate';
  extension_rate_percentage?: number;
  requires_approval: boolean;
  approval_required_before_days?: number;
  auto_approval_limit_days?: number;
}

export interface RenewalTerms {
  auto_renewal_enabled: boolean;
  renewal_notice_days: number;
  renewal_rate_type: 'same_rate' | 'market_rate' | 'custom_rate';
  renewal_rate_percentage?: number;
  max_auto_renewals: number;
  renewal_duration_days?: number;
}

export interface UsageRestrictions {
  type: 'geographic' | 'time' | 'mileage' | 'purpose' | 'driver' | 'other';
  description: string;
  restriction: string;
  penalty_description?: string;
  penalty_amount?: number;
}

export interface ServiceFee {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage' | 'per_day';
  taxable: boolean;
  required: boolean;
}

export interface GovernmentFee {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage' | 'per_day';
  authority: string;
  tax_deductible: boolean;
}

export interface ContractDiscount {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage' | 'per_day';
  applicable_to: 'base_rate' | 'total_amount' | 'specific_item';
  conditions?: string;
  valid_until?: string;
  stackable: boolean;
}

export interface ElectronicSignatureInfo {
  signature_id: string;
  signed_by: string;
  signed_at: string;
  signature_method: 'typed' | 'drawn' | 'uploaded';
  ip_address?: string;
  user_agent?: string;
  certificate_id?: string;
  verification_status: 'pending' | 'verified' | 'failed';
}

export interface RequiredDocument {
  document_type: string;
  description: string;
  required: boolean;
  expiry_date?: string;
  upload_required: boolean;
  verification_required: boolean;
}

export interface ProvidedDocument {
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  uploaded_by: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  expiry_date?: string;
  notes?: string;
}

// === Contract Amendments ===

export interface ContractAmendment extends BaseEntity {
  contract_id: string;
  amendment_number: string;
  amendment_type: AmendmentType;
  description: string;
  original_terms?: Record<string, unknown>;
  amended_terms: Record<string, unknown>;
  effective_date: string;
  reason: string;
  approved_by?: string;
  approved_at?: string;
  customer_notified?: boolean;
  customer_notified_at?: string;
  additional_cost?: number;
  cost_allocation?: 'company' | 'customer' | 'shared';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'expired';
  documents?: DocumentCollection;
}

export type AmendmentType =
  | 'extension'
  | 'rate_change'
  | 'vehicle_change'
  | 'driver_change'
  | 'mileage_adjustment'
  | 'insurance_change'
  | 'payment_terms_change'
  | 'cancellation'
  | 'termination'
  | 'other';

// === Form Data Types ===

export interface ContractFormData {
  // Basic information
  customer_id: string;
  vehicle_id?: string;
  contract_number?: string;
  contract_type: ContractType;
  contract_date?: string;

  // Dates
  start_date: string;
  end_date: string;
  actual_end_date?: string;

  // Financial information
  contract_amount?: number;
  currency?: string;
  deposit_amount?: number;
  deposit_required?: boolean;

  // Pricing
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  flat_rate?: number;

  // Mileage
  mileage_limit_type: 'unlimited' | 'included' | 'charged';
  included_mileage?: number;
  excess_mileage_rate?: number;

  // Payment terms
  billing_cycle?: string;
  due_within_days?: number;
  auto_payment_enabled?: boolean;
  advance_payment_required?: number;

  // Insurance
  insurance_included?: boolean;
  insurance_type?: string;
  insurance_coverage_limit?: number;
  deductible_amount?: number;
  customer_insurance_required?: boolean;

  // Terms
  description?: string;
  terms?: string;
  special_conditions?: string[];
  maintenance_responsibility?: 'company' | 'customer' | 'shared';
  fuel_policy?: FuelPolicy;

  // Late fees
  late_fee_enabled?: boolean;
  late_fee_type?: 'fixed_amount' | 'percentage' | 'daily_rate';
  late_fee_amount?: number;
  late_fee_percentage?: number;
  grace_period_days?: number;

  // Vehicle details
  vehicle_delivery_date?: string;
  vehicle_return_date?: string;
  vehicle_delivery_location?: string;
  vehicle_return_location?: string;
  odometer_start?: number;
  fuel_level_start?: number;

  // Driver information
  driver_id?: string;
  additional_drivers?: DriverInfo[];
  driver_license_required?: boolean;

  // Documents
  required_documents?: RequiredDocument[];
  documents?: DocumentCollection;

  // Integration
  cost_center_id?: string;
  journal_entry_required?: boolean;
  invoice_schedule?: 'immediate' | 'contract_start' | 'custom';

  // Other
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  auto_approval_enabled?: boolean;
  selectedCompanyId?: string;
}

export interface ContractCreationData {
  customer_id: string;
  vehicle_id?: string;
  contract_number?: string;
  contract_type: ContractType;
  contract_date?: string;
  start_date: string;
  end_date: string;
  contract_amount?: number;
  currency?: string;
  description?: string;
  terms?: string;
  cost_center_id?: string;
  created_by?: string;
  auto_generate_invoice?: boolean;
  skip_customer_eligibility_check?: boolean;
  skip_vehicle_availability_check?: boolean;
}

// === Validation and Processing Types ===

export interface ContractValidationResult {
  valid: boolean;
  errors: ContractValidationError[];
  warnings: ContractValidationWarning[];
  score: number; // 0-100
  recommendations: string[];
  auto_approval_recommended: boolean;
}

export interface ContractValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  blocking: boolean;
}

export interface ContractValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ContractCreationResult {
  success: boolean;
  contract_id?: string;
  contract_number?: string;
  journal_entry_id?: string;
  journal_entry_number?: string;
  warnings?: string[];
  requires_manual_entry?: boolean;
  errors?: string[];
  error?: string;
  error_code?: string;
  error_message?: string;
  processing_time?: number;
  steps_completed?: string[];
  next_steps?: string[];
}

export interface CustomerEligibilityResult {
  eligible: boolean;
  reason: string;
  risk_score?: number;
  required_deposit?: number;
  additional_requirements?: string[];
  restrictions?: string[];
  eligibility_score?: number; // 0-100
  approved_by?: string;
  approved_at?: string;
}

export interface VehicleAvailabilityResult {
  available: boolean;
  reason: string;
  alternative_vehicles?: Vehicle[];
  next_available_date?: string;
  conflicts?: {
    contract_id: string;
    contract_number: string;
    conflict_start: string;
    conflict_end: string;
  }[];
}

export interface AccountMappingResult {
  success: boolean;
  created: string[];
  existing: string[];
  errors: string[];
  warnings: string[];
  journal_entry_id?: string;
  journal_entry_number?: string;
}

// === Analytics and Reporting Types ===

export interface ContractMetrics {
  total_contracts: number;
  active_contracts: number;
  draft_contracts: number;
  expired_contracts: number;
  cancelled_contracts: number;
  new_contracts_this_month: number;
  new_contracts_this_year: number;

  // Revenue metrics
  total_contract_value: number;
  average_contract_value: number;
  monthly_recurring_revenue: number;
  annual_recurring_revenue: number;
  revenue_growth_rate?: number;

  // Performance metrics
  average_contract_duration: number;
  contract_renewal_rate: number;
  customer_retention_rate: number;
  utilization_rate: number;

  // Breakdown by type
  contracts_by_type: Record<ContractType, number>;
  revenue_by_type: Record<ContractType, number>;

  // Geographic distribution
  contracts_by_city: Record<string, number>;
  contracts_by_country: Record<string, number>;
}

export interface ContractFinancialSummary {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  contract_amount: number;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
  overdue_amount: number;
  next_payment_due?: string;
  payment_completion_rate: number;
  average_payment_delay_days: number;
  last_payment_date?: string;
  currency: string;
}

export interface ContractActivityReport {
  contract_id: string;
  period_start: string;
  period_end: string;

  // Usage metrics
  actual_usage_days: number;
  planned_usage_days: number;
  usage_compliance_rate: number;
  total_km_driven?: number;
  average_km_per_day?: number;

  // Financial activity
  payments_received: number;
  late_payments: number;
  partial_payments: number;
  total_amount_paid: number;
  late_fees_charged: number;
  discounts_applied: number;

  // Maintenance and issues
  maintenance_requests: number;
  maintenance_completed: number;
  average_maintenance_cost: number;
  downtime_days: number;
  customer_complaints: number;
  violations?: number;

  // Extensions and changes
  extensions_granted: number;
  amendments_created: number;
  rate_changes: number;
  vehicle_changes: number;

  // Communication
  communications_sent: number;
  customer_responses: number;
  satisfaction_rating?: number;
}

// === Import/Export Types ===

export interface ContractImportData {
  contract_number?: string;
  customer_code?: string;
  customer_name?: string;
  vehicle_plate?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: string;
  daily_rate?: string;
  currency?: string;
  status?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface ContractImportResult {
  success: boolean;
  total_records: number;
  imported_count: number;
  failed_count: number;
  updated_count: number;
  errors: ContractImportError[];
  warnings: ContractImportWarning[];
  duplicates_found: string[];
  processing_time: number;
}

export interface ContractImportError {
  row_number: number;
  field: string;
  value: string;
  error: string;
  suggestion?: string;
}

export interface ContractImportWarning {
  row_number: number;
  field: string;
  value: string;
  warning: string;
  action_taken?: string;
}

// === Lazy-loaded relationship types ===
interface Customer {
  id: string;
  customer_code?: string;
  name: string;
  email?: string;
  phone: string;
  customer_type: 'individual' | 'corporate';
}

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  status: string;
  daily_rate?: number;
}

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_status: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
}

interface VehicleMaintenance {
  id: string;
  maintenance_type: string;
  status: string;
  cost?: number;
}

interface TrafficViolation {
  id: string;
  violation_type: string;
  fine_amount: number;
  status: string;
}