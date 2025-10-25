import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerFinancialSummary {
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  daysOverdue: number;
  creditLimit: number;
  creditAvailable: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  invoiceCount: number;
  paymentCount: number;
}

export const useCustomerFinancialSummary = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-financial-summary', customerId],
    queryFn: async (): Promise<CustomerFinancialSummary> => {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Get customer to get credit limit
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('credit_limit')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      // Get all invoices for the customer
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, balance_due, due_date, status')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled');

      if (invoicesError) throw invoicesError;

      // Get all payments for the customer
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('customer_id', customerId)
        .in('payment_status', ['completed', 'paid', 'approved'])
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate totals
      const totalInvoices = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
      const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;

      // Calculate overdue amount (invoices past due date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let overdueAmount = 0;
      let oldestOverdueDate: Date | null = null;

      invoices?.forEach(invoice => {
        if (invoice.due_date && invoice.balance_due && invoice.balance_due > 0) {
          const dueDate = new Date(invoice.due_date);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            overdueAmount += invoice.balance_due;
            if (!oldestOverdueDate || dueDate < oldestOverdueDate) {
              oldestOverdueDate = dueDate;
            }
          }
        }
      });

      // Calculate days overdue
      const daysOverdue = oldestOverdueDate 
        ? Math.floor((today.getTime() - oldestOverdueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Get last payment info
      const lastPayment = payments && payments.length > 0 ? payments[0] : null;

      // Calculate credit available
      const creditLimit = customer?.credit_limit || 0;
      const creditAvailable = Math.max(0, creditLimit - totalOutstanding);

      return {
        totalInvoices,
        totalPaid,
        totalOutstanding,
        overdueAmount,
        daysOverdue,
        creditLimit,
        creditAvailable,
        lastPaymentDate: lastPayment?.payment_date || null,
        lastPaymentAmount: lastPayment?.amount || 0,
        invoiceCount: invoices?.length || 0,
        paymentCount: payments?.length || 0,
      };
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};
