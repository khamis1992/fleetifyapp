import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { differenceInDays, isAfter, startOfDay } from "date-fns";

export interface LatePaymentCustomer {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  contract_id?: string;
  contract_number?: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  total_outstanding: number;
  oldest_unpaid_date: string;
  days_overdue: number;
  unpaid_months: number;
  last_payment_date?: string;
  monthly_rent: number;
  total_fines: number;
}

/**
 * Hook to get customers with late payments (after 10th of month)
 */
export const useLatePaymentCustomers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['late-payment-customers'],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Get all active contracts with their customers
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
          customers (
            id,
            full_name,
            phone,
            email
          ),
          vehicles (
            id,
            plate_number
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      if (!contracts || contracts.length === 0) {
        return [];
      }

      // Get payment receipts for these contracts
      const contractIds = contracts.map(c => c.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('rental_payment_receipts')
        .select('*')
        .in('contract_id', contractIds)
        .eq('company_id', profile.company_id);

      if (paymentsError) throw paymentsError;

      // Calculate late payment customers
      const lateCustomers: LatePaymentCustomer[] = [];
      const today = startOfDay(new Date());
      const currentDay = today.getDate();

      for (const contract of contracts) {
        // Group payments by customer
        const customerPayments = payments?.filter(p => p.contract_id === contract.id) || [];
        
        // Calculate total paid and outstanding
        const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const totalFines = customerPayments.reduce((sum, p) => sum + (p.late_fee || 0), 0);
        
        // Get oldest unpaid month
        const paidMonths = customerPayments.map(p => p.payment_month).filter(Boolean);
        const contractStart = new Date(contract.start_date);
        const monthsSinceStart = Math.floor((today.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
        
        // Check if customer has unpaid months
        const unpaidMonths = monthsSinceStart - paidMonths.length;
        
        if (unpaidMonths > 0) {
          // Find oldest unpaid date (assuming monthly payments)
          const oldestUnpaidDate = new Date(contractStart);
          oldestUnpaidDate.setMonth(oldestUnpaidDate.getMonth() + paidMonths.length);
          
          const daysOverdue = differenceInDays(today, oldestUnpaidDate);
          
          // Check if payment is late (after 10th of month or 30+ days overdue)
          const isLate = currentDay > 10 || daysOverdue >= 30;
          
          if (isLate) {
            const lastPayment = customerPayments
              .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

            lateCustomers.push({
              customer_id: contract.customer_id,
              customer_name: (contract.customers as any)?.full_name || 'غير معروف',
              customer_phone: (contract.customers as any)?.phone,
              customer_email: (contract.customers as any)?.email,
              contract_id: contract.id,
              contract_number: contract.contract_number,
              vehicle_id: contract.vehicle_id,
              vehicle_plate: (contract.vehicles as any)?.plate_number,
              total_outstanding: unpaidMonths * (contract.monthly_amount || 0),
              oldest_unpaid_date: oldestUnpaidDate.toISOString(),
              days_overdue: daysOverdue,
              unpaid_months: unpaidMonths,
              last_payment_date: lastPayment?.payment_date,
              monthly_rent: contract.monthly_amount || 0,
              total_fines: totalFines,
            });
          }
        }
      }

      return lateCustomers;
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
  });
};

/**
 * Hook to automatically create legal cases for customers with 30+ days overdue
 */
export const useAutoCreateLegalCases = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customers: LatePaymentCustomer[]) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Filter customers with 30+ days overdue
      const eligibleCustomers = customers.filter(c => c.days_overdue >= 30);

      if (eligibleCustomers.length === 0) {
        return { created: 0, skipped: 0 };
      }

      let created = 0;
      let skipped = 0;

      for (const customer of eligibleCustomers) {
        // Check if case already exists for this customer
        const { data: existingCase } = await supabase
          .from('legal_cases')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('client_id', customer.customer_id)
          .eq('case_type', 'rental')
          .in('case_status', ['active', 'on_hold'])
          .single();

        if (existingCase) {
          skipped++;
          continue;
        }

        // Generate case number
        const { data: caseNumber, error: numberError } = await supabase
          .rpc('generate_legal_case_number', { company_id_param: profile.company_id });

        if (numberError) {
          console.error('Error generating case number:', numberError);
          skipped++;
          continue;
        }

        // Create legal case
        const { error: caseError } = await supabase
          .from('legal_cases')
          .insert({
            company_id: profile.company_id,
            case_number: caseNumber,
            case_title: `Late Rent Payment - ${customer.customer_name}`,
            case_title_ar: `تأخر دفع الإيجار - ${customer.customer_name}`,
            case_type: 'rental',
            case_status: 'active',
            priority: customer.days_overdue >= 60 ? 'high' : 'medium',
            client_id: customer.customer_id,
            client_name: customer.customer_name,
            client_phone: customer.customer_phone,
            client_email: customer.customer_email,
            description: `العميل متأخر عن دفع الإيجار لمدة ${customer.days_overdue} يوم. إجمالي المبلغ المستحق: ${customer.total_outstanding} ريال`,
            case_value: customer.total_outstanding,
            legal_fees: 0,
            court_fees: 0,
            other_expenses: 0,
            total_costs: 0,
            billing_status: 'pending',
            tags: ['تأخر دفع', 'إيجار', 'تلقائي'],
            legal_team: [],
            is_confidential: false,
            created_by: user.id,
          });

        if (caseError) {
          console.error('Error creating legal case:', caseError);
          skipped++;
        } else {
          created++;
        }
      }

      return { created, skipped, total: eligibleCustomers.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['late-payment-customers'] });
      
      if (result.created > 0) {
        toast.success(`تم إنشاء ${result.created} قضية قانونية تلقائياً`);
      }
    },
    onError: (error: unknown) => {
      console.error('Error auto-creating legal cases:', error);
      toast.error('حدث خطأ أثناء إنشاء القضايا التلقائية');
    },
  });
};

/**
 * Hook to remove customer from legal cases when they pay
 */
export const useRemoveFromLegalCases = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Find active rental cases for this customer
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('id, case_number')
        .eq('company_id', profile.company_id)
        .eq('client_id', customerId)
        .eq('case_type', 'rental')
        .eq('case_status', 'active');

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        return { closed: 0 };
      }

      // Close all active rental cases for this customer
      const caseIds = cases.map(c => c.id);
      const { error: updateError } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          notes: `تم إغلاق القضية تلقائياً بسبب سداد المبلغ المستحق`,
        })
        .in('id', caseIds);

      if (updateError) throw updateError;

      // Create activity logs
      for (const legalCase of cases) {
        await supabase
          .from('legal_case_activities')
          .insert({
            case_id: legalCase.id,
            company_id: profile.company_id,
            activity_type: 'case_closed',
            activity_title: 'تم إغلاق القضية تلقائياً',
            activity_description: `تم إغلاق القضية ${legalCase.case_number} تلقائياً بسبب سداد المبلغ المستحق`,
            created_by: user.id,
          });
      }

      return { closed: cases.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      
      if (result.closed > 0) {
        toast.success(`تم إغلاق ${result.closed} قضية تلقائياً بعد السداد`);
      }
    },
    onError: (error: unknown) => {
      console.error('Error closing legal cases:', error);
      toast.error('حدث خطأ أثناء إغلاق القضايا');
    },
  });
};

