import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

async function getUserCompanyId(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  if (!profile?.company_id) throw new Error('Company not found');
  return profile.company_id;
}

export const buildVehicleInstallmentPaymentRpcArgs = (
  companyId: string,
  actorId: string,
  paymentData: VehicleInstallmentPaymentData,
  defaultDate: string,
) => {
  const amount = Number(paymentData.paid_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر');
  }

  return {
    p_company_id: companyId,
    p_schedule_id: paymentData.schedule_id,
    p_amount: amount,
    p_payment_date: paymentData.payment_date || defaultDate,
    p_payment_method: paymentData.payment_method,
    p_payment_reference: paymentData.payment_reference || null,
    p_notes: paymentData.notes || null,
    p_actor_id: actorId,
  };
};

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

      console.log('Fetching vehicle installments for company:', profile.company_id);

      const { data, error } = await supabase
        .from('vehicle_installments')
        .select(`
          *,
          vehicles (
            id,
            plate_number,
            model,
            make,
            year
          ),
          customers!vehicle_installments_vendor_id_fkey (
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      console.log('Vehicle installments query result:', { data, error });
      
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

      // Determine contract type
      const companyId = profile.company_id;
      const isMultiVehicle = data.contract_type === 'multi_vehicle' || (data.vehicle_ids && data.vehicle_ids.length > 1);
      
      // Prepare installment data
      const installmentData = {
        vendor_id: data.vendor_id,
        vehicle_id: isMultiVehicle ? null : data.vehicle_id,
        agreement_number: data.agreement_number,
        total_amount: data.total_amount,
        down_payment: data.down_payment,
        installment_amount: data.installment_amount,
        number_of_installments: data.number_of_installments,
        interest_rate: data.interest_rate,
        start_date: data.start_date,
        end_date: data.end_date,
        agreement_date: data.agreement_date,
        notes: data.notes,
        status: 'active' as const,
        contract_type: isMultiVehicle ? 'multi_vehicle' as const : 'single_vehicle' as const,
        total_vehicles_count: isMultiVehicle ? (data.vehicle_ids?.length || 1) : 1,
        company_id: companyId,
        created_by: user.id,
      };

      // Create the installment agreement
      const { data: installment, error: installmentError } = await supabase
        .from('vehicle_installments')
        .insert(installmentData)
        .select()
        .single();

      if (installmentError) throw installmentError;

      // Store allocations in the existing vehicle-installment junction table.
      if (isMultiVehicle && data.vehicle_ids && data.vehicle_ids.length > 0) {
        const vehicleAmounts = data.vehicle_amounts || {};
        const allocations = data.vehicle_ids.map(vehicleId => ({
          company_id: companyId,
          installment_id: installment.id,
          vehicle_id: vehicleId,
          allocated_amount: vehicleAmounts[vehicleId] || 0,
        }));

        const { error: allocationError } = await supabase
          .from('contract_vehicles')
          .insert(allocations.map(({ installment_id, ...allocation }) => ({
            ...allocation,
            vehicle_installment_id: installment_id,
          })));

        if (allocationError) {
          await supabase.from('vehicle_installments').delete().eq('id', installment.id).eq('company_id', companyId);
          throw allocationError;
        }
      }

      // Create the installment schedule directly
      const scheduleEntries = [];
      const startDate = new Date(data.start_date);
      
      for (let i = 1; i <= data.number_of_installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        
        scheduleEntries.push({
          company_id: companyId,
          installment_id: installment.id,
          installment_number: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount: data.installment_amount,
          principal_amount: data.installment_amount * (1 - (data.interest_rate || 0) / 100),
          interest_amount: data.installment_amount * ((data.interest_rate || 0) / 100),
          status: 'pending',
          paid_amount: 0,
        });
      }

      const { error: scheduleError } = await supabase
        .from('vehicle_installment_schedules')
        .insert(scheduleEntries);

      if (scheduleError) {
        await supabase.from('contract_vehicles').delete().eq('vehicle_installment_id', installment.id).eq('company_id', companyId);
        await supabase.from('vehicle_installments').delete().eq('id', installment.id).eq('company_id', companyId);
        throw scheduleError;
      }

      return installment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      toast.success('تم إنشاء اتفاقية الأقساط بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating vehicle installment:', error);
      const errorMessage = error?.message || error?.details || 'حدث خطأ أثناء إنشاء اتفاقية الأقساط';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateVehicleInstallment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleInstallment> }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const companyId = await getUserCompanyId(user.id);
      const { data: existing, error: existingError } = await supabase
        .from('vehicle_installments')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      if (existingError) throw existingError;

      const { data: schedules, error: schedulesError } = await supabase
        .from('vehicle_installment_schedules')
        .select('status, paid_amount, journal_entry_id, invoice_id')
        .eq('installment_id', id)
        .eq('company_id', companyId);
      if (schedulesError) throw schedulesError;

      const financialFields = [
        'total_amount',
        'down_payment',
        'installment_amount',
        'number_of_installments',
        'interest_rate',
        'start_date',
        'end_date',
        'vendor_id',
        'vehicle_id',
      ] as const;
      const changesFinancialTerms = financialFields.some(
        (field) => data[field] !== undefined && data[field] !== existing[field]
      );
      if (changesFinancialTerms) {
        throw new Error('لا يمكن تعديل الشروط المالية بعد إنشاء جدول الأقساط. ألغِ الاتفاقية غير المدفوعة وأنشئ اتفاقية جديدة.')
      }

      const hasFinancialHistory = (schedules || []).some(
        (schedule) => Number(schedule.paid_amount || 0) > 0 || schedule.journal_entry_id || schedule.invoice_id
      );
      if (data.status === 'cancelled' && hasFinancialHistory) {
        throw new Error('لا يمكن إلغاء اتفاقية لها دفعات أو قيود أو فواتير دون إجراء عكس محاسبي معتمد.')
      }
      if (data.status === 'completed' && !(schedules || []).every((schedule) => schedule.status === 'paid')) {
        throw new Error('لا يمكن إكمال الاتفاقية قبل سداد جميع الأقساط.')
      }

      const updatePayload = {
        agreement_number: data.agreement_number,
        notes: data.notes,
        status: data.status,
      };

      const { data: updatedInstallment, error } = await supabase
        .from('vehicle_installments')
        .update(updatePayload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return updatedInstallment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      toast.success('تم تحديث اتفاقية الأقساط بنجاح');
    },
    onError: (error: unknown) => {
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

      const companyId = await getUserCompanyId(user.id);
      const rpcArgs = buildVehicleInstallmentPaymentRpcArgs(
        companyId,
        user.id,
        paymentData,
        new Date().toISOString().split('T')[0],
      );
      const { data, error } = await supabase.rpc('process_vehicle_installment_payment_v1', rpcArgs);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-installment-summary'] });
      toast.success('تم تسجيل الدفعة وترحيل قيدها المحاسبي بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error processing installment payment:', error);
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدفعة';
      const translated = message.includes('VEHICLE_INSTALLMENT_PAYABLE')
        ? 'اربط حساب التزامات أقساط المركبات قبل تسجيل الدفعة.'
        : message.includes('VEHICLE_INSTALLMENT_INTEREST_EXPENSE')
          ? 'اربط حساب مصروف فوائد أقساط المركبات قبل تسجيل الدفعة.'
          : message.includes('CASH') || message.includes('BANK')
            ? 'اربط حساب النقد أو البنك المناسب قبل تسجيل الدفعة.'
            : message.includes('closed accounting period')
              ? 'لا يمكن ترحيل الدفعة داخل فترة محاسبية مغلقة.'
              : message;
      toast.error(translated);
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
    onError: (error: unknown) => {
      console.error('Error updating overdue installments:', error);
      toast.error('حدث خطأ أثناء تحديث الأقساط المتأخرة');
    },
  });
};

export const useDeleteVehicleInstallment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (installmentId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const companyId = await getUserCompanyId(user.id);
      const { error: installmentLookupError } = await supabase
        .from('vehicle_installments')
        .select('id')
        .eq('id', installmentId)
        .eq('company_id', companyId)
        .single();
      if (installmentLookupError) throw installmentLookupError;

      const { data: schedules, error: scheduleLookupError } = await supabase
        .from('vehicle_installment_schedules')
        .select('paid_amount, journal_entry_id, invoice_id')
        .eq('installment_id', installmentId)
        .eq('company_id', companyId);
      if (scheduleLookupError) throw scheduleLookupError;
      const hasFinancialHistory = (schedules || []).some(
        (schedule) => Number(schedule.paid_amount || 0) > 0 || schedule.journal_entry_id || schedule.invoice_id
      );
      if (hasFinancialHistory) {
        throw new Error('لا يمكن إلغاء اتفاقية لها دفعات أو قيود أو فواتير دون إجراء عكس محاسبي معتمد.')
      }

      const { error: installmentError } = await supabase
        .from('vehicle_installments')
        .update({ status: 'cancelled' })
        .eq('id', installmentId)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .select('id')
        .single();

      if (installmentError) throw installmentError;

      return installmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-installments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-installment-summary'] });
      toast.success('تم إلغاء الاتفاقية مع الاحتفاظ بسجلها بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error cancelling vehicle installment:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء الاتفاقية');
    },
  });
};
