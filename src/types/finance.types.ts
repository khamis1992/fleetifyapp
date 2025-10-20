/**
 * Finance Module Type Definitions
 *
 * Centralized type definitions for all finance-related entities.
 * Extracted from useFinance hook for better reusability and maintainability.
 */

// Import ChartOfAccount from useChartOfAccounts to avoid conflicts
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

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
