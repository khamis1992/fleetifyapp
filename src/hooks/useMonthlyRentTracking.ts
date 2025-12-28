import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MonthlyRentStatus {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_type: 'individual' | 'corporate';
  phone: string | null;
  email: string | null;
  contract_id: string;
  contract_number: string;
  vehicle_plate: string | null;
  monthly_rent: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  amount_paid: number;
  amount_due: number;
  last_payment_date: string | null;
  days_overdue: number;
}

// نوع الفلترة: حسب تاريخ الدفع الفعلي أو تاريخ التسجيل
export type DateFilterType = 'payment_date' | 'created_at';

export const useMonthlyRentTracking = (year: number, month: number, dateFilter: DateFilterType = 'payment_date') => {
  return useQuery({
    queryKey: ['monthly-rent-tracking', year, month, dateFilter],
    queryFn: async (): Promise<MonthlyRentStatus[]> => {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get all active contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          vehicle_id,
          monthly_amount,
          start_date,
          end_date,
          status,
          customers!inner(
            id,
            customer_code,
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            email
          ),
          vehicles(
            plate_number
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      if (!contracts || contracts.length === 0) {
        return [];
      }

      // Get start and end of the target month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all payments for the target month based on selected date filter
      // dateFilter = 'payment_date' -> تاريخ الدفع الفعلي
      // dateFilter = 'created_at' -> تاريخ التسجيل في النظام (المدخول الفعلي)
      const dateColumn = dateFilter === 'created_at' ? 'created_at' : 'payment_date';
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('customer_id, amount, payment_date, payment_status, created_at')
        .eq('company_id', profile.company_id)
        .gte(dateColumn, startDate.toISOString())
        .lte(dateColumn, endDate.toISOString())
        .in('payment_status', ['completed', 'paid', 'approved']);

      if (paymentsError) throw paymentsError;

      // Calculate payment status for each contract
      const today = new Date();
      const daysInMonth = today.getDate();

      const rentStatuses: MonthlyRentStatus[] = contracts.map(contract => {
        const customer = contract.customers as any;
        const vehicle = contract.vehicles as any;
        
        // Get customer name
        const customerName = customer.customer_type === 'individual'
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : customer.company_name || 'Unknown';

        // Calculate payments for this customer in the target month
        const customerPayments = payments?.filter(p => p.customer_id === contract.customer_id) || [];
        const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Get last payment date
        const lastPaymentDate = customerPayments.length > 0
          ? customerPayments.sort((a, b) => 
              new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            )[0].payment_date
          : null;

        const monthlyRent = contract.monthly_amount || 0;
        const amountDue = monthlyRent - totalPaid;

        // Determine payment status
        let paymentStatus: 'paid' | 'unpaid' | 'partial';
        if (totalPaid >= monthlyRent) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'unpaid';
        }

        // Calculate days overdue (if we're past the 5th of the month and not paid)
        let daysOverdue = 0;
        if (paymentStatus !== 'paid' && today.getDate() > 5) {
          const dueDate = new Date(year, month - 1, 5);
          daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          customer_id: contract.customer_id,
          customer_name: customerName,
          customer_code: customer.customer_code || '',
          customer_type: customer.customer_type,
          phone: customer.phone,
          email: customer.email,
          contract_id: contract.id,
          contract_number: contract.contract_number,
          vehicle_plate: vehicle?.plate_number || null,
          monthly_rent: monthlyRent,
          payment_status: paymentStatus,
          amount_paid: totalPaid,
          amount_due: Math.max(0, amountDue),
          last_payment_date: lastPaymentDate,
          days_overdue: Math.max(0, daysOverdue),
        };
      });

      // Sort: unpaid first, then partial, then paid
      return rentStatuses.sort((a, b) => {
        const statusOrder = { unpaid: 0, partial: 1, paid: 2 };
        return statusOrder[a.payment_status] - statusOrder[b.payment_status];
      });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useRentPaymentSummary = (year: number, month: number, dateFilter: DateFilterType = 'payment_date') => {
  const { data: rentStatuses, isLoading } = useMonthlyRentTracking(year, month, dateFilter);

  if (isLoading || !rentStatuses) {
    return {
      totalCustomers: 0,
      paidCount: 0,
      unpaidCount: 0,
      partialCount: 0,
      totalRentExpected: 0,
      totalRentCollected: 0,
      totalRentOutstanding: 0,
      collectionRate: 0,
    };
  }

  const paidCount = rentStatuses.filter(r => r.payment_status === 'paid').length;
  const unpaidCount = rentStatuses.filter(r => r.payment_status === 'unpaid').length;
  const partialCount = rentStatuses.filter(r => r.payment_status === 'partial').length;
  
  const totalRentExpected = rentStatuses.reduce((sum, r) => sum + r.monthly_rent, 0);
  const totalRentCollected = rentStatuses.reduce((sum, r) => sum + r.amount_paid, 0);
  const totalRentOutstanding = rentStatuses.reduce((sum, r) => sum + r.amount_due, 0);
  
  const collectionRate = totalRentExpected > 0 
    ? (totalRentCollected / totalRentExpected) * 100 
    : 0;

  return {
    totalCustomers: rentStatuses.length,
    paidCount,
    unpaidCount,
    partialCount,
    totalRentExpected,
    totalRentCollected,
    totalRentOutstanding,
    collectionRate: Math.round(collectionRate * 10) / 10,
  };
};

