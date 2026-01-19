import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerInvoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  invoice_type: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  currency?: string;
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerInvoicesSummary {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  draftInvoices: number;
  sentInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export const useCustomerInvoices = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          contracts:contract_id (
            id,
            contract_number,
            vehicle_number,
            vehicles:vehicle_id (
              plate_number,
              make,
              model
            )
          )
        `)
        .eq('customer_id', customerId)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('Error fetching customer invoices:', error);
        throw error;
      }

      // Map vehicle number to invoice
      return (data || []).map(invoice => ({
        ...invoice,
        vehicle_number: invoice.contracts?.vehicle_number || 
                       invoice.contracts?.vehicles?.plate_number || ''
      }));
    },
    enabled: !!customerId
  });
};

export const useCustomerInvoicesSummary = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-invoices-summary', customerId],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error fetching customer invoices summary:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        return {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          draftInvoices: 0,
          sentInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0
        };
      }

      const now = new Date();
      const summary = invoices.reduce((acc, invoice) => {
        acc.totalInvoices += 1;
        acc.totalAmount += invoice.total_amount || 0;
        acc.totalPaid += invoice.paid_amount || 0;
        acc.totalOutstanding += invoice.balance_due || 0;

        // Count by status
        if (invoice.status === 'draft') acc.draftInvoices += 1;
        if (invoice.status === 'sent') acc.sentInvoices += 1;
        if (invoice.payment_status === 'paid') acc.paidInvoices += 1;
        
        // Count overdue invoices
        if (invoice.due_date && new Date(invoice.due_date) < now && invoice.payment_status !== 'paid') {
          acc.overdueInvoices += 1;
        }

        return acc;
      }, {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        draftInvoices: 0,
        sentInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0
      });

      return summary;
    },
    enabled: !!customerId
  });
};