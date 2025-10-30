import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrafficViolationPayment {
  id: string;
  company_id: string;
  traffic_violation_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  payment_type: 'full' | 'partial';
  bank_account?: string;
  check_number?: string;
  reference_number?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'cancelled';
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTrafficViolationPaymentData {
  traffic_violation_id: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  payment_type?: 'full' | 'partial';
  payment_date?: string;
  bank_account?: string;
  check_number?: string;
  reference_number?: string;
  notes?: string;
}

// Hook لجلب مدفوعات مخالفة محددة
export function useTrafficViolationPayments(violationId: string) {
  return useQuery({
    queryKey: ['traffic-violation-payments', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_violation_payments')
        .select('*')
        .eq('traffic_violation_id', violationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching traffic violation payments:', error);
        throw error;
      }

      return data as TrafficViolationPayment[];
    },
    enabled: !!violationId
  });
}

// Hook to fetch all traffic violation payments for the company
export function useAllTrafficViolationPayments() {
  return useQuery({
    queryKey: ['all-traffic-violation-payments'],
    queryFn: async () => {
      // الحصول على company_id من المستخدم الحالي
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات المستخدم');

      const { data, error } = await supabase
        .from('traffic_violation_payments')
        .select(`
          *,
          penalties:traffic_violation_id (
            penalty_number,
            violation_type,
            amount,
            vehicle_id,
            contract_id,
            customer_id,
            customers (
              first_name,
              last_name,
              company_name
            ),
            contracts (
              id,
              contract_number,
              status,
              start_date,
              end_date,
              customer_id
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching traffic violations:', error);
        throw error;
      }

      return data;
    }
  });
}

// Hook لإنشاء دفعة جديدة
export function useCreateTrafficViolationPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTrafficViolationPaymentData) => {
      // الحصول على company_id من المستخدم الحالي
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      // توليد رقم الدفع
      const { data: paymentNumber, error: numberError } = await supabase
        .rpc('generate_traffic_payment_number', {
          company_id_param: profile.company_id
        });

      if (numberError) {
        console.error('Error generating payment number:', numberError);
        throw numberError;
      }

      // إنشاء الدفعة
      const { data: payment, error } = await supabase
        .from('traffic_violation_payments')
        .insert([{
          company_id: profile.company_id,
          traffic_violation_id: data.traffic_violation_id,
          payment_number: paymentNumber,
          payment_date: data.payment_date || new Date().toISOString().split('T')[0],
          amount: data.amount,
          payment_method: data.payment_method,
          payment_type: data.payment_type || 'full',
          bank_account: data.bank_account,
          check_number: data.check_number,
          reference_number: data.reference_number,
          notes: data.notes,
          status: 'completed',
          created_by: user.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating traffic violation payment:', error);
        throw error;
      }

      return payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      toast.success('تم تسجيل الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error creating traffic violation payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفع');
    }
  });
}

// Hook لتحديث دفعة
export function useUpdateTrafficViolationPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<CreateTrafficViolationPaymentData>) => {
      const { data: payment, error } = await supabase
        .from('traffic_violation_payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating traffic violation payment:', error);
        throw error;
      }

      return payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      toast.success('تم تحديث الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error updating traffic violation payment:', error);
      toast.error('حدث خطأ أثناء تحديث الدفع');
    }
  });
}

// Hook لحذف دفعة
export function useDeleteTrafficViolationPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('traffic_violation_payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting traffic violation payment:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-traffic-violation-payments'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      toast.success('تم حذف الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting traffic violation payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفع');
    }
  });
}

// Hook للحصول على إحصائيات المدفوعات
export function useTrafficViolationPaymentsStats() {
  return useQuery({
    queryKey: ['traffic-violation-payments-stats'],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('traffic_violation_payments')
        .select('amount, payment_method, status, created_at');

      if (error) {
        console.error('Error fetching payment stats:', error);
        throw error;
      }

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        completedPayments: payments.filter(p => p.status === 'completed').length,
        completedAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
        methodBreakdown: {
          cash: payments.filter(p => p.payment_method === 'cash').length,
          bank_transfer: payments.filter(p => p.payment_method === 'bank_transfer').length,
          check: payments.filter(p => p.payment_method === 'check').length,
          credit_card: payments.filter(p => p.payment_method === 'credit_card').length
        }
      };

      return stats;
    }
  });
}