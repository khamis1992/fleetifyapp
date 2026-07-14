import type { Database } from '@/integrations/supabase/types';

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export interface PaymentCreationData {
  customer_id?: string;
  contract_id?: string;
  invoice_id?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type?: string;
  transaction_type?: 'income' | 'expense' | 'payment' | 'receipt';
  reference_number?: string;
  agreement_number?: string;
  check_number?: string;
  bank_id?: string;
  notes?: string;
  created_by?: string;
}

export type PaymentWithDetails = Payment & {
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
};

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

