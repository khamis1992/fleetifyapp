import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import * as Sentry from '@sentry/react';
import {
  PaymentSchedule,
  PaymentScheduleCreationData,
  PaymentScheduleUpdateData,
  CreateScheduleRequest,
} from "@/types/payment-schedules";

// Hook to fetch payment schedules for a specific contract
export const useContractPaymentSchedules = (contractId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-schedules', contractId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'payment_schedules', message: 'Fetching contract payment schedules', level: 'info', data: { contractId } });
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data, error } = await supabase
        .from('contract_payment_schedules')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number', { ascending: true });

      if (error) {
        Sentry.captureException(error, { tags: { feature: 'payment_schedules', action: 'fetch_contract_schedules', component: 'useContractPaymentSchedules' }, extra: { contractId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'payment_schedules', message: 'Contract payment schedules fetched', level: 'info', data: { count: data?.length || 0 } });
      return data as PaymentSchedule[];
    },
    enabled: !!user?.id && !!contractId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};

// Hook to fetch all payment schedules with contract and customer info
export const usePaymentSchedules = (filters?: {
  status?: string;
  overdue?: boolean;
  contractId?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-schedules', filters],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'payment_schedules', message: 'Fetching payment schedules', level: 'info', data: { filters } });
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('contract_payment_schedules')
        .select(`
          *,
          contracts!inner (
            id,
            contract_number,
            customer_id,
            contract_amount,
            customers!inner (
              id,
              first_name_ar,
              last_name_ar,
              company_name_ar,
              customer_type
            )
          )
        `)
        .order('due_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.overdue) {
        query = query
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString().split('T')[0]);
      }

      if (filters?.contractId) {
        query = query.eq('contract_id', filters.contractId);
      }

      const { data, error } = await query;

      if (error) {
        Sentry.captureException(error, { tags: { feature: 'payment_schedules', action: 'fetch_schedules', component: 'usePaymentSchedules' }, extra: { filters } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'payment_schedules', message: 'Payment schedules fetched', level: 'info', data: { count: data?.length || 0 } });
      return data as PaymentSchedule[];
    },
    enabled: !!user?.id,
  });
};

// Hook to create payment schedules for a contract with automatic invoice generation
export const useCreatePaymentSchedules = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleRequest) => {
      // Permission check
      if (!hasPermission('payment_schedules:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء جداول الدفع');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'create',
            component: 'useCreatePaymentSchedules'
          },
          extra: { userId: user?.id, contractId: data.contract_id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Creating payment schedules with invoices',
        level: 'info',
        data: { contractId: data.contract_id, installmentPlan: data.installment_plan }
      });
      
      // Validate input data
      if (!data.contract_id) {
        throw new Error('Contract ID is required');
      }
      
      if (!data.installment_plan) {
        throw new Error('Installment plan is required');
      }
      
      if (data.number_of_installments && data.number_of_installments <= 0) {
        throw new Error('Number of installments must be greater than 0');
      }
      
      const { data: result, error } = await supabase.rpc(
        'create_payment_schedule_invoices',
        {
          p_contract_id: data.contract_id,
          p_installment_plan: data.installment_plan,
          p_number_of_installments: data.number_of_installments,
          p_first_payment_date: data.first_payment_date || null
        }
      );

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'create',
            component: 'useCreatePaymentSchedules',
            step: 'rpc_call'
          },
          extra: { userId: user?.id, contractId: data.contract_id, requestData: data }
        });
        
        // Provide more user-friendly error messages
        let errorMessage = 'Failed to create payment schedules';
        
        if (error.message?.includes('Contract not found')) {
          errorMessage = 'Contract not found. Please verify the contract exists.';
        } else if (error.message?.includes('Invalid contract amount')) {
          errorMessage = 'Invalid contract amount. Please check the contract details.';
        } else if (error.message?.includes('Invalid installment count')) {
          errorMessage = 'Invalid installment configuration. Please check your plan settings.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      if (!result || !Array.isArray(result)) {
        throw new Error('No payment schedules were created');
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Payment schedules and invoices created successfully',
        level: 'info',
        data: { scheduleCount: result.length, contractId: data.contract_id }
      });

      return result;
    },
    onSuccess: (result, variables) => {
      const scheduleCount = Array.isArray(result) ? result.length : 0;
      
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules', variables.contract_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['invoices'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['contract-invoices', variables.contract_id] 
      });
      
      toast({
        title: "تم إنشاء جدول الدفع",
        description: `تم إنشاء جدول الدفع بنجاح مع ${scheduleCount} فاتورة`,
      });
    },
    onError: (error) => {
      console.error('Error creating payment schedules with invoices:', error);
      
      // Extract user-friendly error message
      const errorMessage = error.message || 'حدث خطأ أثناء إنشاء جدول الدفع والفواتير';
      
      toast({
        title: "خطأ في إنشاء جدول الدفع",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Hook to create a single payment schedule
export const useCreatePaymentSchedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PaymentScheduleCreationData) => {
      // Permission check
      if (!hasPermission('payment_schedules:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء دفعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'create_single',
            component: 'useCreatePaymentSchedule'
          },
          extra: { userId: user?.id, contractId: data.contract_id }
        });
        throw error;
      }

      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Creating single payment schedule',
        level: 'info',
        data: { contractId: data.contract_id, amount: data.amount }
      });

      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const { data: result, error } = await supabase
        .from('contract_payment_schedules')
        .insert({
          ...data,
          company_id: profile.company_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'create_single',
            component: 'useCreatePaymentSchedule',
            step: 'insert'
          },
          extra: { userId: user?.id, contractId: data.contract_id, scheduleData: data }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Payment schedule created successfully',
        level: 'info',
        data: { scheduleId: result.id, contractId: data.contract_id }
      });

      return result as PaymentSchedule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules', variables.contract_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules'] 
      });
      
      toast({
        title: "تم إضافة الدفعة",
        description: "تم إضافة الدفعة إلى جدول الدفع بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error creating payment schedule:', error);
      toast({
        title: "خطأ في إضافة الدفعة",
        description: "حدث خطأ أثناء إضافة الدفعة",
        variant: "destructive",
      });
    },
  });
};

// Hook to update a payment schedule
export const useUpdatePaymentSchedule = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentScheduleUpdateData }) => {
      // Permission check
      if (!hasPermission('payment_schedules:update')) {
        const error = new Error('ليس لديك صلاحية لتعديل جداول الدفع');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'update',
            component: 'useUpdatePaymentSchedule'
          },
          extra: { userId: user?.id, scheduleId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Updating payment schedule',
        level: 'info',
        data: { scheduleId: id, updateData: data }
      });
      const { data: result, error } = await supabase
        .from('contract_payment_schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'update',
            component: 'useUpdatePaymentSchedule',
            step: 'update'
          },
          extra: { userId: user?.id, scheduleId: id, updateData: data }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Payment schedule updated successfully',
        level: 'info',
        data: { scheduleId: id }
      });

      return result as PaymentSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      
      toast({
        title: "تم تحديث الدفعة",
        description: "تم تحديث معلومات الدفعة بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error updating payment schedule:', error);
      toast({
        title: "خطأ في تحديث الدفعة",
        description: "حدث خطأ أثناء تحديث معلومات الدفعة",
        variant: "destructive",
      });
    },
  });
};

// Hook to delete a payment schedule
export const useDeletePaymentSchedule = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Permission check
      if (!hasPermission('payment_schedules:delete')) {
        const error = new Error('ليس لديك صلاحية لحذف جداول الدفع');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'delete',
            component: 'useDeletePaymentSchedule'
          },
          extra: { userId: user?.id, scheduleId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Deleting payment schedule',
        level: 'info',
        data: { scheduleId: id }
      });
      const { error } = await supabase
        .from('contract_payment_schedules')
        .delete()
        .eq('id', id);

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'delete',
            component: 'useDeletePaymentSchedule',
            step: 'delete'
          },
          extra: { userId: user?.id, scheduleId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Payment schedule deleted successfully',
        level: 'info',
        data: { scheduleId: id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      
      toast({
        title: "تم حذف الدفعة",
        description: "تم حذف الدفعة من جدول الدفع بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error deleting payment schedule:', error);
      toast({
        title: "خطأ في حذف الدفعة",
        description: "حدث خطأ أثناء حذف الدفعة",
        variant: "destructive",
      });
    },
  });
};

// Hook to mark payment as paid
export const useMarkPaymentAsPaid = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      paidAmount, 
      paidDate 
    }: { 
      id: string; 
      paidAmount: number; 
      paidDate: string; 
    }) => {
      // Permission check
      if (!hasPermission('payment_schedules:update')) {
        const error = new Error('ليس لديك صلاحية لتسجيل الدفعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'mark_paid',
            component: 'useMarkPaymentAsPaid'
          },
          extra: { userId: user?.id, scheduleId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Marking payment as paid',
        level: 'info',
        data: { scheduleId: id, paidAmount, paidDate }
      });
      const { data: schedule } = await supabase
        .from('contract_payment_schedules')
        .select('amount')
        .eq('id', id)
        .single();

      if (!schedule) throw new Error('Payment schedule not found');

      const status = paidAmount >= schedule.amount ? 'paid' : 'partially_paid';

      const { data: result, error } = await supabase
        .from('contract_payment_schedules')
        .update({
          status,
          paid_amount: paidAmount,
          paid_date: paidDate
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'mark_paid',
            component: 'useMarkPaymentAsPaid',
            step: 'update'
          },
          extra: { userId: user?.id, scheduleId: id, paidAmount, paidDate }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Payment marked as paid successfully',
        level: 'info',
        data: { scheduleId: id, status, paidAmount }
      });

      return result as PaymentSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      
      toast({
        title: "تم تسجيل الدفع",
        description: "تم تسجيل الدفع بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error marking payment as paid:', error);
      toast({
        title: "خطأ في تسجيل الدفع",
        description: "حدث خطأ أثناء تسجيل الدفع",
        variant: "destructive",
      });
    },
  });
};

// Hook to generate payment schedules from existing invoices - Updated for HMR fix
export const useGeneratePaymentSchedulesFromInvoices = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      // Permission check
      if (!hasPermission('payment_schedules:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء جداول الدفع');
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'generate_from_invoices',
            component: 'useGeneratePaymentSchedulesFromInvoices'
          },
          extra: { userId: user?.id, contractId }
        });
        throw error;
      }

      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      Sentry.addBreadcrumb({
        category: 'payment_schedules',
        message: 'Generating payment schedules from invoices',
        level: 'info',
        data: { contractId }
      });

      const { data: result, error } = await supabase.rpc(
        'generate_payment_schedules_for_contract',
        {
          p_contract_id: contractId,
          p_dry_run: false
        }
      );

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payment_schedules',
            action: 'generate_from_invoices',
            component: 'useGeneratePaymentSchedulesFromInvoices',
            step: 'rpc_call'
          },
          extra: { userId: user?.id, contractId }
        });
        throw error;
      }

      return result;
    },
    onSuccess: (result, variables) => {
      const schedulesCreated = result?.schedules_created || 0;
      const invoicesProcessed = result?.invoices_processed || 0;
      const schedulesSkipped = result?.schedules_skipped || 0;

      queryClient.invalidateQueries({
        queryKey: ['payment-schedules', variables]
      });
      queryClient.invalidateQueries({
        queryKey: ['payment-schedules']
      });
      queryClient.invalidateQueries({
        queryKey: ['contract-invoices', variables]
      });

      toast({
        title: "تم إنشاء جدول الدفعات",
        description: `تم إنشاء ${schedulesCreated} جدول دفعات من ${invoicesProcessed} فاتورة${schedulesSkipped > 0 ? ` (${schedulesSkipped} تم تخطيها)` : ''}`,
      });
    },
    onError: (error) => {
      console.error('Error generating payment schedules from invoices:', error);

      const errorMessage = error.message || 'حدث خطأ أثناء إنشاء جدول الدفعات من الفواتير';

      toast({
        title: "خطأ في إنشاء جدول الدفعات",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};