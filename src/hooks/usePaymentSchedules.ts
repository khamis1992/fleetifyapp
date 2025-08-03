import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  PaymentSchedule, 
  PaymentScheduleCreationData, 
  PaymentScheduleUpdateData,
  CreateScheduleRequest,
  PaymentScheduleWithContract
} from "@/types/payment-schedules";

// Hook to fetch payment schedules for a specific contract
export const useContractPaymentSchedules = (contractId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-schedules', contractId],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data, error } = await supabase
        .from('contract_payment_schedules')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number', { ascending: true });

      if (error) throw error;

      return data as PaymentSchedule[];
    },
    enabled: !!user?.id && !!contractId,
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

      if (error) throw error;

      return data as any[];
    },
    enabled: !!user?.id,
  });
};

// Hook to create payment schedules for a contract
export const useCreatePaymentSchedules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleRequest) => {
      const { data: result, error } = await supabase.rpc(
        'create_contract_payment_schedule',
        {
          contract_id_param: data.contract_id,
          installment_plan: data.installment_plan,
          number_of_installments: data.number_of_installments
        }
      );

      if (error) throw error;

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules', variables.contract_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payment-schedules'] 
      });
      
      toast({
        title: "تم إنشاء جدول الدفع",
        description: "تم إنشاء جدول الدفع بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error creating payment schedules:', error);
      toast({
        title: "خطأ في إنشاء جدول الدفع",
        description: "حدث خطأ أثناء إنشاء جدول الدفع",
        variant: "destructive",
      });
    },
  });
};

// Hook to create a single payment schedule
export const useCreatePaymentSchedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PaymentScheduleCreationData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

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

      if (error) throw error;

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentScheduleUpdateData }) => {
      const { data: result, error } = await supabase
        .from('contract_payment_schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contract_payment_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
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

      if (error) throw error;

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