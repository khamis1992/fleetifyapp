/**
 * Finance Module Type Definitions
 *
 * Centralized type definitions for all finance-related entities.
 * Extracted from useFinance hook for better reusability and maintainability.
 */

// Import ChartOfAccount from useChartOfAccounts to avoid conflicts
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

// ============================================
// Multi-Currency Types
// ============================================

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: 'fixer_io' | 'exchangerate_api' | 'manual' | 'calculation';
  effective_date: string;
  expires_at?: string;
  is_active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CurrencyExposure {
  id: string;
  company_id: string;
  currency: string;
  exposure_amount: number;
  exposure_type: 'receivable' | 'payable' | 'investment' | 'loan';
  base_currency_amount?: number;
  exchange_rate_at_creation?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  hedged_amount: number;
  hedging_instrument?: 'forward' | 'option' | 'swap' | 'natural';
  entity_type?: string;
  entity_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CurrencyConfiguration {
  id: string;
  company_id: string;
  base_currency: string;
  supported_currencies: string[];
  auto_update_rates: boolean;
  rate_update_frequency: 'hourly' | 'daily' | 'weekly';
  preferred_rate_provider: string;
  rate_tolerance_percentage: number;
  last_rate_update?: string;
  created_at: string;
  updated_at: string;
}

export interface CurrencyConversionRequest {
  amount: number;
  from_currency: string;
  to_currency: string;
  date?: string;
  company_id?: string;
}

export interface CurrencyConversionResult {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  target_currency: string;
  exchange_rate: number;
  conversion_date: string;
  rate_source: string;
}

export interface CurrencyExposureReport {
  currency: string;
  total_exposure: number;
  receivables: number;
  payables: number;
  investments: number;
  loans: number;
  hedged_amount: number;
  net_exposure: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  hedging_recommendations: HedgingRecommendation[];
}

export interface HedgingRecommendation {
  strategy: 'forward_contract' | 'currency_option' | 'natural_hedging' | 'currency_swap';
  amount: number;
  maturity_date: string;
  estimated_cost: number;
  risk_reduction: number;
  description: string;
}

// ============================================
// Compliance Types
// ============================================

export interface ComplianceRule {
  id: string;
  company_id?: string;
  rule_name: string;
  rule_code: string;
  rule_category: 'gaap' | 'tax' | 'aml' | 'kyc' | 'reporting' | 'operational';
  rule_type: 'validation' | 'threshold' | 'workflow' | 'calculation';
  rule_description?: string;
  rule_config: Record<string, any>;
  jurisdiction?: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  auto_execute: boolean;
  execution_frequency?: 'real_time' | 'daily' | 'weekly' | 'monthly';
  notification_config?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ComplianceValidation {
  id: string;
  company_id: string;
  rule_id: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  validation_result: 'pass' | 'fail' | 'warning' | 'error' | 'pending';
  validation_score?: number;
  validation_details: Record<string, any>;
  risk_assessment?: 'low' | 'medium' | 'high' | 'critical';
  action_required: boolean;
  action_description?: string;
  action_deadline?: string;
  assigned_to?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  validated_at: string;
  created_at: string;
}

export interface RegulatoryReport {
  id: string;
  company_id: string;
  report_type: string;
  report_subtype?: string;
  jurisdiction: string;
  reporting_period_start: string;
  reporting_period_end: string;
  report_data: Record<string, any>;
  report_summary?: string;
  status: 'draft' | 'pending_review' | 'submitted' | 'approved' | 'rejected' | 'amended';
  submission_deadline?: string;
  submission_date?: string;
  submission_method?: string;
  submission_reference?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  file_attachments?: string[];
  compliance_score?: number;
  findings_count: number;
  violations_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AMLKYCDiligence {
  id: string;
  company_id: string;
  entity_type: 'customer' | 'vendor' | 'beneficial_owner';
  entity_id: string;
  entity_name: string;
  risk_rating: 'low' | 'medium' | 'high' | 'prohibited';
  verification_status: 'pending' | 'verified' | 'rejected' | 'additional_info_required';
  verification_method?: string;
  verification_score?: number;
  documents_verified?: string[];
  screening_results: Record<string, any>;
  due_diligence_level: 'simplified' | 'standard' | 'enhanced';
  enhanced_due_diligence: boolean;
  ongoing_monitoring: boolean;
  last_review_date?: string;
  next_review_date?: string;
  pep_status?: string;
  sanctions_status?: string;
  adverse_media_findings: number;
  risk_factors: Record<string, any>;
  mitigating_factors: Record<string, any>;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAuditTrail {
  id: string;
  company_id: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  action_description: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  action_timestamp: string;
  system_generated: boolean;
  compliance_impact: 'low' | 'medium' | 'high' | 'critical';
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface ComplianceCalendar {
  id: string;
  company_id: string;
  event_type: string;
  event_title: string;
  event_description?: string;
  jurisdiction?: string;
  due_date: string;
  reminder_days: number;
  recurring_pattern?: 'monthly' | 'quarterly' | 'annually';
  recurring_end_date?: string;
  responsible_user_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_date?: string;
  completion_notes?: string;
  file_attachments?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceDashboardSummary {
  total_rules: number;
  active_validations: number;
  pending_actions: number;
  overdue_reports: number;
  high_risk_entities: number;
  compliance_score: number;
  upcoming_deadlines: ComplianceCalendar[];
  recent_validations: ComplianceValidation[];
  risk_exposure: CurrencyExposureReport[];
}

// ============================================
// Enhanced Finance Types with Multi-Currency Support
// ============================================

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  accounting_period_id?: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  currency: string;
  exchange_rate?: number;
  base_currency_debit?: number;
  base_currency_credit?: number;
  compliance_status?: 'compliant' | 'non_compliant' | 'pending_review';
  compliance_notes?: string;
  validated_by?: string;
  validated_at?: string;
  status: 'draft' | 'posted' | 'reversed';
  created_by?: string;
  posted_by?: string;
  posted_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  reversal_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  cost_center_id?: string | null;
  asset_id?: string | null;
  employee_id?: string | null;
  line_description?: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
  created_at: string;
  account?: ChartOfAccount;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_id?: string;
  vendor_id?: string;
  cost_center_id?: string;
  fixed_asset_id?: string;
  invoice_type: 'sales' | 'purchase' | 'service';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  terms?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  payment_number: string;
  payment_date: string;
  payment_type: 'cash' | 'check' | 'bank_transfer' | 'credit_card';
  payment_method: 'received' | 'made';
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  agreement_number?: string;
  amount: number;
  currency: string;
  reference_number?: string;
  bank_account?: string;
  check_number?: string;
  notes?: string;
  payment_status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  contracts?: {
    contract_number: string;
  };
}

export interface Vendor {
  id: string;
  company_id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_name_ar?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  address_ar?: string;
  tax_number?: string;
  payment_terms: number;
  credit_limit: number;
  current_balance: number;
  category_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCategory {
  id: string;
  company_id: string;
  category_name: string;
  category_name_ar?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  company_id: string;
  contact_name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  company_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  file_size?: number;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorPerformance {
  id: string;
  vendor_id: string;
  company_id: string;
  rating?: number;
  on_time_delivery_rate?: number;
  quality_score?: number;
  response_time_hours?: number;
  notes?: string;
  measured_at: string;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  company_id: string;
  center_code: string;
  center_name: string;
  center_name_ar?: string;
  description?: string;
  parent_center_id?: string;
  manager_id?: string;
  budget_amount?: number;
  actual_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedAsset {
  id: string;
  company_id: string;
  asset_code: string;
  asset_name: string;
  asset_name_ar?: string;
  category: string;
  serial_number?: string;
  location?: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value?: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production';
  accumulated_depreciation?: number;
  book_value: number;
  condition_status?: 'excellent' | 'good' | 'fair' | 'poor';
  disposal_date?: string;
  disposal_amount?: number;
  asset_account_id?: string;
  depreciation_account_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  company_id: string;
  budget_name: string;
  budget_year: number;
  accounting_period_id?: string;
  total_revenue?: number;
  total_expenses?: number;
  net_income?: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  balance_after: number;
  description: string;
  reference_number?: string;
  check_number?: string;
  counterpart_bank_id?: string;
  status: 'pending' | 'completed' | 'cancelled';
  reconciled?: boolean;
  reconciled_at?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
