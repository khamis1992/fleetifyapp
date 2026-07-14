import type { Database } from '@/integrations/supabase/types';

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

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

export type InvoiceWithDetails = Invoice & {
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

export type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'rental' | 'service' | 'penalty' | 'other';

