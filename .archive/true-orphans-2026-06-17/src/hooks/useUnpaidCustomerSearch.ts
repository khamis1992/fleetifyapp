import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnpaidCustomerResult {
  customer_id: string;
  customer_name: string;
  customer_name_ar: string;
  customer_type: 'individual' | 'corporate';
  email: string;
  phone: string;
  overdue_amount: number;
  overdue_days: number;
  total_outstanding: number;
  last_payment_date: string | null;
  oldest_overdue_date: string;
  contract_count: number;
  invoice_count: number;
  payment_history_score: number;
}

export interface PaymentStatusFilters {
  minOverdueAmount?: number;
  maxOverdueAmount?: number;
  minOverdueDays?: number;
  maxOverdueDays?: number;
  customerType?: 'individual' | 'corporate';
  hasContract?: boolean;
  paymentHistoryScore?: 'poor' | 'fair' | 'good';
}

export const useUnpaidCustomerSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const searchUnpaidCustomers = useCallback(async (
    searchTerm?: string,
    filters?: PaymentStatusFilters
  ): Promise<UnpaidCustomerResult[]> => {
    if (!user?.profile?.company_id) {
      throw new Error('User company not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_name,
          company_name_ar,
          email,
          phone,
          contracts:contracts(count),
          invoices:invoices(
            id,
            total_amount,
            paid_amount,
            balance_due,
            due_date,
            payment_status,
            status,
            created_at
          )
        `)
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Add search term filter
      if (searchTerm) {
        query = query.or(`
          first_name.ilike.%${searchTerm}%,
          last_name.ilike.%${searchTerm}%,
          first_name_ar.ilike.%${searchTerm}%,
          last_name_ar.ilike.%${searchTerm}%,
          company_name.ilike.%${searchTerm}%,
          company_name_ar.ilike.%${searchTerm}%,
          phone.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%
        `);
      }

      // Add customer type filter
      if (filters?.customerType) {
        query = query.eq('customer_type', filters.customerType);
      }

      const { data: customers, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (!customers) {
        return [];
      }

      // Process and filter customers with overdue payments
      const unpaidCustomers: UnpaidCustomerResult[] = customers
        .map(customer => {
          const invoices = customer.invoices || [];
          const now = new Date();
          
          // Calculate overdue invoices
          const overdueInvoices = invoices.filter(invoice => 
            invoice.payment_status !== 'paid' && 
            invoice.due_date && 
            new Date(invoice.due_date) < now
          );

          if (overdueInvoices.length === 0) {
            return null; // Skip customers with no overdue invoices
          }

          const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
          const totalOutstanding = invoices
            .filter(inv => inv.payment_status !== 'paid')
            .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

          // Calculate oldest overdue date
          const oldestOverdueDate = overdueInvoices
            .map(inv => new Date(inv.due_date))
            .sort((a, b) => a.getTime() - b.getTime())[0];

          const overdueDays = Math.floor((now.getTime() - oldestOverdueDate.getTime()) / (1000 * 60 * 60 * 24));

          // Calculate payment history score
          const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
          const paymentHistoryScore = invoices.length > 0 
            ? Math.round((paidInvoices.length / invoices.length) * 100)
            : 0;

          // Find last payment date
          const lastPaymentDate = paidInvoices
            .map(inv => inv.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

          // Customer name logic
          const customerName = customer.customer_type === 'individual'
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : customer.company_name || '';

          const customerNameAr = customer.customer_type === 'individual'
            ? `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim()
            : customer.company_name_ar || '';

          return {
            customer_id: customer.id,
            customer_name: customerName,
            customer_name_ar: customerNameAr,
            customer_type: customer.customer_type,
            email: customer.email || '',
            phone: customer.phone || '',
            overdue_amount: overdueAmount,
            overdue_days: overdueDays,
            total_outstanding: totalOutstanding,
            last_payment_date: lastPaymentDate,
            oldest_overdue_date: oldestOverdueDate.toISOString(),
            contract_count: customer.contracts?.[0]?.count || 0,
            invoice_count: invoices.length,
            payment_history_score: paymentHistoryScore
          };
        })
        .filter((customer): customer is UnpaidCustomerResult => customer !== null);

      // Apply additional filters
      let filteredCustomers = unpaidCustomers;

      if (filters?.minOverdueAmount) {
        filteredCustomers = filteredCustomers.filter(c => c.overdue_amount >= filters.minOverdueAmount!);
      }

      if (filters?.maxOverdueAmount) {
        filteredCustomers = filteredCustomers.filter(c => c.overdue_amount <= filters.maxOverdueAmount!);
      }

      if (filters?.minOverdueDays) {
        filteredCustomers = filteredCustomers.filter(c => c.overdue_days >= filters.minOverdueDays!);
      }

      if (filters?.maxOverdueDays) {
        filteredCustomers = filteredCustomers.filter(c => c.overdue_days <= filters.maxOverdueDays!);
      }

      if (filters?.hasContract) {
        filteredCustomers = filteredCustomers.filter(c => c.contract_count > 0);
      }

      if (filters?.paymentHistoryScore) {
        const scoreFilter = filters.paymentHistoryScore;
        filteredCustomers = filteredCustomers.filter(c => {
          if (scoreFilter === 'poor') return c.payment_history_score < 50;
          if (scoreFilter === 'fair') return c.payment_history_score >= 50 && c.payment_history_score < 80;
          if (scoreFilter === 'good') return c.payment_history_score >= 80;
          return true;
        });
      }

      // Sort by overdue amount descending
      return filteredCustomers.sort((a, b) => b.overdue_amount - a.overdue_amount);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching unpaid customers';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  const getUnpaidCustomerDetails = useCallback(async (customerId: string) => {
    if (!user?.profile?.company_id) {
      throw new Error('User company not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('customers')
        .select(`
          *,
          contracts:contracts(*),
          invoices:invoices(
            *,
            invoice_items:invoice_items(*)
          )
        `)
        .eq('id', customerId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (queryError) {
        throw queryError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching customer details';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  const generateLegalNoticeData = useCallback(async (customerId: string) => {
    const customerDetails = await getUnpaidCustomerDetails(customerId);
    
    // Generate structured data for legal notice generation
    return {
      customer: customerDetails,
      overdueInvoices: customerDetails.invoices?.filter(inv => 
        inv.payment_status !== 'paid' && 
        inv.due_date && 
        new Date(inv.due_date) < new Date()
      ) || [],
      totalOverdueAmount: customerDetails.invoices?.reduce((sum, inv) => {
        if (inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()) {
          return sum + (inv.balance_due || 0);
        }
        return sum;
      }, 0) || 0,
      contracts: customerDetails.contracts || []
    };
  }, [getUnpaidCustomerDetails]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    searchUnpaidCustomers,
    getUnpaidCustomerDetails,
    generateLegalNoticeData,
    isLoading,
    error,
    clearError
  };
};