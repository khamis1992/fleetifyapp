import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTrafficViolationJournalIntegration } from '@/hooks/useTrafficViolationJournalIntegration';

export interface TrafficViolation {
  id: string;
  penalty_number: string;
  violation_type: string;
  penalty_date: string;
  amount: number;
  location: string;
  vehicle_plate?: string;
  vehicle_id?: string;
  customer_id?: string;
  contract_id?: string;
  reason: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'partially_paid';
  created_at: string;
  updated_at: string;
  vehicles?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year?: number;
  };
  customers?: {
    first_name: string;
    last_name: string;
    company_name?: string;
    phone: string;
  };
  contracts?: {
    id: string;
    contract_number: string;
    status: string;
    start_date?: string;
    end_date?: string;
    customer_id?: string;
  };
  agreements?: {
    id: string;
    contract_number: string;
    status: string;
    start_date?: string;
    end_date?: string;
    customer_id?: string;
  };
}

export interface CreateTrafficViolationData {
  penalty_number?: string; // اجعله اختيارياً لأنه سيتم توليده تلقائياً
  violation_type: string;
  penalty_date: string;
  amount: number;
  location: string;
  vehicle_plate?: string;
  vehicle_id?: string;
  customer_id?: string;
  contract_id?: string;
  reason: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  payment_status?: 'unpaid' | 'paid' | 'partially_paid';
}

export interface UpdateTrafficViolationData extends Partial<CreateTrafficViolationData> {
  id: string;
}

// Hook لجلب جميع المخالفات المرورية مع التحسين
export function useTrafficViolations(options?: { limit?: number; offset?: number }) {
  const { limit = 100, offset = 0 } = options || {};
  
  return useQuery({
    queryKey: ['traffic-violations', limit, offset],
    queryFn: async () => {
      try {
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
          .from('penalties')
          .select(`
            id,
            penalty_number,
            violation_type,
            penalty_date,
            amount,
            location,
            vehicle_plate,
            vehicle_id,
            reason,
            notes,
            status,
            payment_status,
            customer_id,
            contract_id,
            created_at,
            updated_at,
            vehicles (
              id,
              plate_number,
              make,
              model,
              year
            ),
            customers (
              id,
              first_name,
              last_name,
              company_name,
              phone
            ),
            contracts (
              id,
              contract_number,
              status,
              start_date,
              end_date,
              customer_id,
              customers (
                id,
                first_name,
                last_name,
                company_name,
                phone
              )
            )
          `)
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching traffic violations:', error);
          throw error;
        }

        return data as any[];
      } catch (error) {
        console.error('Error in useTrafficViolations:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // 5 minutes in memory
  });
}

// Hook لجلب مخالفة واحدة
export function useTrafficViolation(id: string) {
  return useQuery({
    queryKey: ['traffic-violation', id],
    queryFn: async () => {
      // الحصول على company_id من المستخدم الحالي
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      const { data, error } = await supabase
        .from('penalties')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            phone
          )
        `)
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching traffic violation:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!id
  });
}

// Hook لإنشاء مخالفة جديدة
export function useCreateTrafficViolation() {
  const queryClient = useQueryClient();
  const { createViolationJournalEntry } = useTrafficViolationJournalIntegration();

  return useMutation({
    mutationFn: async (data: CreateTrafficViolationData) => {
      // الحصول على company_id من المستخدم الحالي
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      // توليد رقم المخالفة إذا لم يتم توفيره
      let penaltyNumber = data.penalty_number;
      if (!penaltyNumber) {
        const { count } = await supabase
          .from('penalties')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id);
        
        penaltyNumber = `PEN-${String(((count || 0) + 1)).padStart(6, '0')}`;
      }

      const { data: violation, error } = await supabase
        .from('penalties')
        .insert([{
          company_id: profile.company_id,
          penalty_number: penaltyNumber,
          violation_type: data.violation_type,
          penalty_date: data.penalty_date,
          amount: data.amount,
          location: data.location,
          vehicle_plate: data.vehicle_plate,
          vehicle_id: data.vehicle_id,
          customer_id: data.customer_id,
          contract_id: data.contract_id,
          reason: data.reason,
          notes: data.notes,
          status: data.status || 'pending',
          payment_status: data.payment_status || 'unpaid',
          created_by: user.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating traffic violation:', error);
        throw error;
      }

      return violation;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      
      // Create journal entry for traffic violation
      try {
        await createViolationJournalEntry({
          violationId: data.id,
          amount: data.amount,
          isCompanyLiability: !data.customer_id, // If no customer, company pays
          customerId: data.customer_id,
          date: data.penalty_date
        });
      } catch (error) {
        console.error('Failed to create traffic violation journal entry:', error);
      }
      
      toast.success('تم إنشاء المخالفة بنجاح');
    },
    onError: (error) => {
      console.error('Error creating traffic violation:', error);
      toast.error('حدث خطأ أثناء إنشاء المخالفة');
    }
  });
}

// Hook لتحديث مخالفة
export function useUpdateTrafficViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTrafficViolationData) => {
      const { id, ...updateData } = data;
      
      const { data: violation, error } = await supabase
        .from('penalties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating traffic violation:', error);
        throw error;
      }

      return violation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violation', data.id] });
      toast.success('تم تحديث المخالفة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating traffic violation:', error);
      toast.error('حدث خطأ أثناء تحديث المخالفة');
    }
  });
}

// Hook لحذف مخالفة
export function useDeleteTrafficViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('penalties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting traffic violation:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      toast.success('تم حذف المخالفة بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting traffic violation:', error);
      toast.error('حدث خطأ أثناء حذف المخالفة');
    }
  });
}

// Hook لتأكيد المخالفة (تغيير الحالة إلى مؤكدة)
export function useConfirmTrafficViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: violation, error } = await supabase
        .from('penalties')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error confirming traffic violation:', error);
        throw error;
      }

      return violation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violation', data.id] });
      toast.success('تم تأكيد المخالفة بنجاح - سيتم إنشاء قيد محاسبي تلقائياً');
    },
    onError: (error) => {
      console.error('Error confirming traffic violation:', error);
      toast.error('حدث خطأ أثناء تأكيد المخالفة');
    }
  });
}

// Hook لتحديث حالة الدفع
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: 'unpaid' | 'paid' | 'partially_paid' }) => {
      const { data: violation, error } = await supabase
        .from('penalties')
        .update({ payment_status: paymentStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }

      return violation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violation', data.id] });
      toast.success('تم تحديث حالة الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error updating payment status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الدفع');
    }
  });
}

// Hook للحصول على إحصائيات المخالفات
export function useTrafficViolationsStats() {
  return useQuery({
    queryKey: ['traffic-violations-stats'],
    queryFn: async () => {
      const { data: violations, error } = await supabase
        .from('penalties')
        .select('status, payment_status, amount')
        .not('violation_type', 'is', null); // فقط المخالفات المرورية

      if (error) {
        console.error('Error fetching violations stats:', error);
        throw error;
      }

      const stats = {
        total: violations.length,
        pending: violations.filter(v => v.status === 'pending').length,
        confirmed: violations.filter(v => v.status === 'confirmed').length,
        cancelled: violations.filter(v => v.status === 'cancelled').length,
        totalAmount: violations.reduce((sum, v) => sum + (v.amount || 0), 0),
        paidAmount: violations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0),
        unpaidAmount: violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + (v.amount || 0), 0),
        partiallyPaidAmount: violations.filter(v => v.payment_status === 'partially_paid').reduce((sum, v) => sum + (v.amount || 0), 0)
      };

      return stats;
    }
  });
}