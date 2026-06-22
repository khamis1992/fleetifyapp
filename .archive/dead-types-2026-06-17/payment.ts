/**
 * Payment Types
 * أنواع البيانات للمدفوعات
 */

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string | null;
  contract_id: string | null;
  invoice_id: string | null;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  payment_status: string;
  transaction_type: 'income' | 'expense';
  reference_number: string | null;
  agreement_number: string | null;
  check_number: string | null;
  bank_id: string | null;
  bank_account: string | null;
  account_id: string | null;
  cost_center_id: string | null;
  journal_entry_id: string | null;
  currency: string | null;
  notes: string | null;
  description_type: string | null;
  allocation_status: string | null;
  reconciliation_status: string | null;
  processing_status: string | null;
  processing_notes: string | null;
  linking_confidence: number | null;
  due_date: string | null;
  original_due_date: string | null;
  late_fine_amount: number | null;
  late_fine_days_overdue: number | null;
  late_fine_type: string | null;
  late_fine_status: string | null;
  late_fine_waiver_reason: string | null;
  vendor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentCreationData {
  customer_id?: string;
  contract_id?: string;
  invoice_id?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type?: string;
  transaction_type?: 'income' | 'expense';
  reference_number?: string;
  agreement_number?: string;
  check_number?: string;
  bank_id?: string;
  notes?: string;
  created_by?: string;
}

export interface PaymentWithDetails extends Payment {
  customer?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_name_ar?: string;
    customer_type: 'individual' | 'company';
  } | null;
  contract?: {
    id: string;
    contract_number: string;
    contract_type: string;
    status: string;
  } | null;
}

export interface PaymentMatchSuggestion {
  invoice_id: string;
  invoice_number: string;
  amount: number;
  confidence: number;
  reason: string;
  customer_id?: string;
  contract_id?: string;
}

export interface PaymentMatchResult {
  success: boolean;
  payment_id: string;
  invoice_id?: string;
  confidence: number;
  message: string;
}

export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'cancelled' | 'failed';
export type PaymentType = 'advance' | 'regular' | 'final' | 'refund';

