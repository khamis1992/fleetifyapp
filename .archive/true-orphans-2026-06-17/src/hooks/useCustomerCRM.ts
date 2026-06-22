import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  CRMCustomer, 
  CRMStats, 
  CustomerCommunication, 
  AddCommunicationInput 
} from '@/types/crm';

/**
 * Hook لجلب إحصائيات CRM
 */
export function useCRMStats(companyId: string | null) {
  return useQuery({
    queryKey: ['crm-stats', companyId],
    queryFn: async (): Promise<CRMStats> => {
      if (!companyId) throw new Error('No company selected');
      
      // Get active contracts count
      const { count: activeCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');
      
      // Get today's communications count
      const today = new Date().toISOString().split('T')[0];
      const { count: callsToday } = await supabase
        .from('customer_communications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('communication_type', 'phone')
        .gte('communication_date', today)
        .lte('communication_date', today + 'T23:59:59');
      
      // Get pending follow-ups count
      const { count: pendingFollowUps } = await supabase
        .from('customer_communications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('follow_up_status', 'pending')
        .eq('follow_up_scheduled', true);
      
      // Get completed this month count
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const { count: completedThisMonth } = await supabase
        .from('customer_communications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', firstDayOfMonth.toISOString());
      
      return {
        total_active_customers: activeCount || 0,
        total_calls_today: callsToday || 0,
        pending_follow_ups: pendingFollowUps || 0,
        completed_this_month: completedThisMonth || 0,
        expiring_contracts_count: 0, // TODO: Calculate from contracts
        high_priority_count: 0, // TODO: Calculate based on business logic
      };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook لجلب قائمة عملاء CRM
 */
export function useCRMCustomers(companyId: string | null) {
  return useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async (): Promise<CRMCustomer[]> => {
      if (!companyId) return [];
      
      // Get customers with active contracts
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          agreement_number,
          start_date,
          end_date,
          status,
          customer_id,
          customers (
            id,
            code,
            name,
            phone,
            email
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to CRM customers
      return contracts
        .filter(contract => contract.customers)
        .map((contract): CRMCustomer => {
          const customer = contract.customers as any;
          const endDate = contract.end_date ? new Date(contract.end_date) : null;
          const today = new Date();
          const daysUntilExpiry = endDate 
            ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) 
            : null;
          
          let contractStatus: 'active' | 'expiring_soon' | 'expired' = 'active';
          if (daysUntilExpiry !== null) {
            if (daysUntilExpiry < 0) contractStatus = 'expired';
            else if (daysUntilExpiry <= 30) contractStatus = 'expiring_soon';
          }

          return {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            has_active_contract: contract.status === 'active',
            contract_number: contract.agreement_number,
            contract_start_date: contract.start_date,
            contract_end_date: contract.end_date,
            contract_status: contractStatus,
            days_until_expiry: daysUntilExpiry,
            total_communications: 0, // TODO: Join with communications table
            pending_follow_ups: 0,
            needs_follow_up: daysUntilExpiry !== null && daysUntilExpiry <= 10,
            follow_up_reason: daysUntilExpiry !== null && daysUntilExpiry <= 10 
              ? 'العقد ينتهي قريباً' 
              : undefined,
            company_id: companyId,
          };
        });
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
}

/**
 * Hook لجلب سجل التواصل مع عميل محدد
 */
export function useCustomerCommunications(customerId: string | null, companyId: string | null) {
  return useQuery({
    queryKey: ['customer-communications', customerId, companyId],
    queryFn: async (): Promise<CustomerCommunication[]> => {
      if (!customerId || !companyId) return [];
      
      const { data, error } = await supabase
        .from('customer_communications')
        .select(`
          *,
          profiles (
            first_name_ar,
            last_name_ar,
            first_name,
            last_name
          )
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('communication_date', { ascending: false })
        .order('communication_time', { ascending: false });

      if (error) throw error;

      return (data || []).map((comm: any) => ({
        ...comm,
        employee_name: comm.profiles?.first_name_ar 
          ? `${comm.profiles.first_name_ar} ${comm.profiles.last_name_ar}`
          : `${comm.profiles?.first_name || ''} ${comm.profiles?.last_name || ''}`.trim(),
      }));
    },
    enabled: !!customerId && !!companyId,
  });
}

/**
 * Hook لإضافة متابعة جديدة
 */
export function useAddCommunication(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCommunicationInput) => {
      if (!companyId) throw new Error('No company selected');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('customer_communications')
        .insert({
          ...input,
          company_id: companyId,
          employee_id: user.id,
          follow_up_status: input.follow_up_scheduled ? 'pending' : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['crm-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-communications', variables.customer_id] });
      
      toast.success('تم حفظ المتابعة بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء حفظ المتابعة');
    },
  });
}

/**
 * Hook لتحديث حالة متابعة
 */
export function useUpdateCommunicationStatus(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      communicationId, 
      status 
    }: { 
      communicationId: string; 
      status: 'pending' | 'completed' | 'cancelled' 
    }) => {
      const { data, error } = await supabase
        .from('customer_communications')
        .update({ follow_up_status: status })
        .eq('id', communicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-communications'] });
      
      toast.success('تم تحديث حالة المتابعة');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الحالة');
    },
  });
}

/**
 * Hook لحذف متابعة
 */
export function useDeleteCommunication(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communicationId: string) => {
      const { error } = await supabase
        .from('customer_communications')
        .delete()
        .eq('id', communicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-communications'] });
      
      toast.success('تم حذف المتابعة');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف المتابعة');
    },
  });
}


