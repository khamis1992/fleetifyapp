/**
 * Invoice Types
 * أنواع البيانات للفواتير
 */

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number | null;
  balance: number | null;
  status: 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  payment_status: string | null;
  invoice_type: string;
  description: string | null;
  notes: string | null;
  reference_number: string | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number;
  currency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreationData {
  customer_id: string;
  contract_id?: string;
  invoice_date?: string;
  due_date: string;
  amount: number;
  invoice_type?: string;
  description?: string;
  notes?: string;
  tax_amount?: number;
  discount_amount?: number;
  created_by?: string;
}

export interface InvoiceWithDetails extends Invoice {
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

export type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'rental' | 'service' | 'penalty' | 'other';

