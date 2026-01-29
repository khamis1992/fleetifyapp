import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface MonthlyCollectionItem {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  customer_id: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'overdue';
  due_date: string;
  payment_date?: string;
}

export interface MonthlyCollectionStats {
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
}

export const useMonthlyCollections = () => {
  const { user } = useAuth();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-collections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: collections = [], isLoading, refetch } = useQuery({
    queryKey: ['monthly-collections', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const today = new Date();
      const startDate = startOfMonth(today).toISOString();
      const endDate = endOfMonth(today).toISOString();

      // 1. Get contracts assigned to this employee
      // Fetch invoices where:
      // - The related contract is assigned to the user
      // - AND (Due date <= End of this month) [Includes overdue]
      // - AND Status != 'cancelled'
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          paid_amount,
          status,
          due_date,
          contract_id,
          contracts!inner (
            id,
            contract_number,
            assigned_to_profile_id,
            customers (
              id,
              first_name,
              last_name,
              first_name_ar,
              last_name_ar,
              company_name,
              company_name_ar,
              customer_type
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('contracts.assigned_to_profile_id', profile.id)
        .lte('due_date', endDate) // Include all invoices due up to end of this month (overdue included)
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true }); // Oldest first (priority)

      if (error) throw error;

      // Transform data
      return data
        .map(inv => {
          const contract = inv.contracts as any;
          const customer = contract.customers;
          const customerName = customer?.customer_type === 'corporate'
            ? (customer?.company_name_ar || customer?.company_name)
            : `${customer?.first_name_ar || customer?.first_name || ''} ${customer?.last_name_ar || customer?.last_name || ''}`.trim();

          let status: MonthlyCollectionItem['status'] = 'unpaid';
          if (inv.status === 'paid') status = 'paid';
          else if (inv.paid_amount && inv.paid_amount > 0 && inv.paid_amount < inv.total_amount) status = 'partially_paid';
          else if (new Date(inv.due_date) < new Date() && inv.status !== 'paid') status = 'overdue';

          return {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            customer_name: customerName,
            customer_id: customer.id,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            amount: inv.total_amount,
            paid_amount: inv.paid_amount || 0,
            status,
            due_date: inv.due_date,
          } as MonthlyCollectionItem;
        })
        .filter(item => {
          // Filter out paid invoices that are not from this month
          // We want to see:
          // 1. ALL Pending/Overdue/Partially Paid invoices (regardless of date)
          // 2. Paid invoices ONLY if they were due this month (to show recent success)
          
          if (item.status !== 'paid') return true;
          
          const dueDate = new Date(item.due_date);
          const startOfCurrentMonth = new Date(startDate);
          const endOfCurrentMonth = new Date(endDate);
          
          return dueDate >= startOfCurrentMonth && dueDate <= endOfCurrentMonth;
        });
    },
    enabled: !!profile?.id
  });

  const stats: MonthlyCollectionStats = {
    totalDue: collections.reduce((sum, item) => sum + item.amount, 0),
    totalCollected: collections.reduce((sum, item) => sum + item.paid_amount, 0),
    totalPending: collections.reduce((sum, item) => sum + (item.amount - item.paid_amount), 0),
    collectionRate: 0,
    paidCount: collections.filter(c => c.status === 'paid').length,
    pendingCount: collections.filter(c => c.status !== 'paid').length
  };

  stats.collectionRate = stats.totalDue > 0 
    ? Math.round((stats.totalCollected / stats.totalDue) * 100) 
    : 0;

  return {
    collections,
    stats,
    isLoading,
    refetch
  };
};
