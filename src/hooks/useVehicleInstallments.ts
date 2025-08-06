import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { 
  VehicleInstallment, 
  VehicleInstallmentSchedule, 
  VehicleInstallmentCreateData,
  VehicleInstallmentPaymentData,
  VehicleInstallmentSummary,
  VehicleInstallmentWithDetails
} from "@/types/vehicle-installments";

export const useVehicleInstallments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vehicle-installments', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('vehicle_installments')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            plate_number,
            model,
            make,
            year
          ),
          customers:vendor_id (
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as VehicleInstallmentWithDetails[];
    },
    enabled: !!user?.id,
  });
};

export const useVehicleInstallmentSchedules = (installmentId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vehicle-installment-schedules', installmentId, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!installmentId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('vehicle_installment_schedules')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('installment_id', installmentId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      return data as VehicleInstallmentSchedule[];
    },
    enabled: !!user?.id && !!installmentId,
  });
};

export const useCreateVehicleInstallment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VehicleInstallmentCreateData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Create the installment agreement
      const { data: installment, error: installmentError } = await supabase
        .from('vehicle_installments')
        .insert({
          ...data,
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (installmentError) throw installmentError;

      // Create the installment schedule using the database function
      const { error: scheduleError } = await supabase.rpc(
        'create_vehicle_installment_schedule',
        {
          p_installment_id: installment.id,
          p_company_id: profile.company_id,
          p_total_amount: data.total_amount,
          p_down_payment: data.down_payment,
          p_installment_amount: data.installment_amount,
          p_number_of_installments: data.number_of_installments,
          p_interest_rate: data.interest_rate || 0,
          p_start_date: data.start_date,
        }
      );

      if (scheduleError) throw scheduleError;

      return installment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      toast.success('تم إنشاء اتفاقية الأقساط بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating vehicle installment:', error);
      toast.error('حدث خطأ أثناء إنشاء اتفاقية الأقساط');
    },
  });
};

export const useUpdateVehicleInstallment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleInstallment> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: updatedInstallment, error } = await supabase
        .from('vehicle_installments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedInstallment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      toast.success('تم تحديث اتفاقية الأقساط بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating vehicle installment:', error);
      toast.error('حدث خطأ أثناء تحديث اتفاقية الأقساط');
    },
  });
};

export const useProcessInstallmentPayment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: VehicleInstallmentPaymentData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: schedule, error: fetchError } = await supabase
        .from('vehicle_installment_schedules')
        .select('*')
        .eq('id', paymentData.schedule_id)
        .single();

      if (fetchError) throw fetchError;

      // Update the schedule with payment information
      const newStatus = paymentData.paid_amount >= schedule.amount ? 'paid' : 'partially_paid';
      
      const { data: updatedSchedule, error: updateError } = await supabase
        .from('vehicle_installment_schedules')
        .update({
          paid_amount: (schedule.paid_amount || 0) + paymentData.paid_amount,
          paid_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          payment_reference: paymentData.payment_reference,
          notes: paymentData.notes,
          status: newStatus,
        })
        .eq('id', paymentData.schedule_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Check if all installments are paid to update the main agreement status
      const { data: allSchedules } = await supabase
        .from('vehicle_installment_schedules')
        .select('status')
        .eq('installment_id', schedule.installment_id);

      const allPaid = allSchedules?.every(s => s.status === 'paid');
      
      if (allPaid) {
        await supabase
          .from('vehicle_installments')
          .update({ status: 'completed' })
          .eq('id', schedule.installment_id);
      }

      return updatedSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      toast.success('تم تسجيل الدفعة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error processing installment payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    },
  });
};

export const useVehicleInstallmentSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vehicle-installment-summary', user?.id],
    queryFn: async (): Promise<VehicleInstallmentSummary> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Get installments summary
      const { data: installments } = await supabase
        .from('vehicle_installments')
        .select('id, status, total_amount')
        .eq('company_id', profile.company_id);

      // Get schedules summary
      const { data: schedules } = await supabase
        .from('vehicle_installment_schedules')
        .select('status, amount, paid_amount, due_date')
        .eq('company_id', profile.company_id);

      const summary: VehicleInstallmentSummary = {
        total_agreements: installments?.length || 0,
        active_agreements: installments?.filter(i => i.status === 'active').length || 0,
        completed_agreements: installments?.filter(i => i.status === 'completed').length || 0,
        total_amount: installments?.reduce((sum, i) => sum + i.total_amount, 0) || 0,
        total_paid: schedules?.reduce((sum, s) => sum + (s.paid_amount || 0), 0) || 0,
        total_outstanding: schedules?.reduce((sum, s) => sum + (s.amount - (s.paid_amount || 0)), 0) || 0,
        overdue_count: schedules?.filter(s => s.status === 'overdue').length || 0,
        overdue_amount: schedules?.filter(s => s.status === 'overdue')
          .reduce((sum, s) => sum + (s.amount - (s.paid_amount || 0)), 0) || 0,
      };

      return summary;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateOverdueInstallments = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('update_vehicle_installment_status');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      if (count > 0) {
        toast.info(`تم تحديث ${count} قسط متأخر`);
      }
    },
    onError: (error: any) => {
      console.error('Error updating overdue installments:', error);
      toast.error('حدث خطأ أثناء تحديث الأقساط المتأخرة');
    },
  });
};