import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePropertyPayments(contractId?: string) {
  return useQuery({
    queryKey: ['property-payments', contractId],
    queryFn: async () => {
      let query = supabase
        .from('property_payments')
        .select(`
          *,
          property_contracts!inner(
            id,
            contract_number,
            property_id,
            properties(property_name, property_code)
          ),
          journal_entries(
            id,
            journal_entry_number,
            entry_date,
            total_amount,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (contractId) {
        query = query.eq('property_contract_id', contractId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching property payments:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: true,
  });
}

export function usePropertyPayment(id?: string) {
  return useQuery({
    queryKey: ['property-payment', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('property_payments')
        .select(`
          *,
          property_contracts!inner(
            id,
            contract_number,
            property_id,
            properties(property_name, property_code)
          ),
          journal_entries(
            id,
            journal_entry_number,
            entry_date,
            total_amount,
            status,
            journal_entry_lines(
              id,
              account_id,
              description,
              debit_amount,
              credit_amount,
              chart_of_accounts(account_code, account_name, account_name_ar)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching property payment:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreatePropertyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: any) => {
      // Set status to paid to trigger accounting integration
      const paymentWithStatus = {
        ...paymentData,
        status: paymentData.status || 'paid',
        payment_date: paymentData.payment_date || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('property_payments')
        .insert(paymentWithStatus)
        .select(`
          *,
          journal_entries(
            id,
            journal_entry_number,
            entry_date,
            total_amount,
            status
          )
        `)
        .single();

      if (error) {
        console.error('Error creating property payment:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-payments'] });
      queryClient.invalidateQueries({ queryKey: ['property-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      
      // Show success message with accounting integration info
      if (data.journal_entry_id) {
        toast.success('تم تسجيل الدفعة والقيد المحاسبي بنجاح');
      } else {
        toast.success('تم تسجيل الدفعة بنجاح');
      }
    },
    onError: (error: any) => {
      console.error('Error creating property payment:', error);
      toast.error('فشل في تسجيل الدفعة');
    },
  });
}

export function useUpdatePropertyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('property_payments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          journal_entries(
            id,
            journal_entry_number,
            entry_date,
            total_amount,
            status
          )
        `)
        .single();

      if (error) {
        console.error('Error updating property payment:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-payments'] });
      queryClient.invalidateQueries({ queryKey: ['property-payment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      
      toast.success('تم تحديث الدفعة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating property payment:', error);
      toast.error('فشل في تحديث الدفعة');
    },
  });
}

export function useOverduePropertyPayments() {
  return useQuery({
    queryKey: ['property-payments', 'overdue'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('property_payments')
        .select(`
          *,
          property_contracts!inner(
            id,
            contract_number,
            property_id,
            properties(property_name, property_code)
          )
        `)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching overdue property payments:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: true,
  });
}

export function usePropertyPaymentsByDateRange(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['property-payments', 'date-range', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('property_payments')
        .select(`
          *,
          property_contracts!inner(
            id,
            contract_number,
            property_id,
            properties(property_name, property_code)
          ),
          journal_entries(
            id,
            journal_entry_number,
            entry_date,
            total_amount,
            status
          )
        `)
        .order('payment_date', { ascending: false });

      if (startDate) {
        query = query.gte('payment_date', startDate);
      }
      if (endDate) {
        query = query.lte('payment_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching property payments by date range:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: !!startDate || !!endDate,
  });
}