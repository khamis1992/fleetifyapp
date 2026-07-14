import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrafficViolation {
  id: string;
  penalty_number: string;
  violation_type: string;
  penalty_date: string;
  amount: number;
  location: string;
  vehicle_plate?: string;
  vehicle_id?: string;
  customer_id?: string | null;
  contract_id?: string | null;
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
    registration_expiry?: string;
    status?: string;
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
    customers?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      company_name?: string;
      phone?: string;
    };
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

async function getCurrentCompanyContext() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('المستخدم غير مسجل الدخول');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', authData.user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات الشركة');

  return { companyId: profile.company_id, userId: authData.user.id };
}

// Hook لجلب جميع المخالفات المرورية مع التحسين
export function useTrafficViolations(options?: { limit?: number; offset?: number; enabled?: boolean }) {
  const { limit = 100, offset = 0, enabled = true } = options || {};
  
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
              year,
              registration_expiry,
              status
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
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1); // Apply pagination with range

        if (error) {
          console.error('Error fetching traffic violations:', error);
          throw error;
        }

        return data as unknown as TrafficViolation[];
      } catch (error) {
        console.error('Error in useTrafficViolations:', error);
        throw error;
      }
    },
    enabled,
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
      
      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات المستخدم');

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

      return data as unknown as TrafficViolation;
    },
    enabled: !!id
  });
}

// Hook لإنشاء مخالفة جديدة
export function useCreateTrafficViolation() {
  const queryClient = useQueryClient();

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
      
      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات المستخدم');

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
          payment_status: 'unpaid',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-stats'] });

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
      const { companyId } = await getCurrentCompanyContext();

      if (updateData.payment_status !== undefined) {
        throw new Error('حالة سداد المخالفة تُحسب من سجلات الدفع ولا يمكن تعديلها يدويًا');
      }

      const protectedFields: Array<keyof typeof updateData> = [
        'amount',
        'customer_id',
        'contract_id',
        'vehicle_id',
        'penalty_date',
        'status',
      ];
      const changesProtectedField = protectedFields.some((field) => updateData[field] !== undefined);
      if (changesProtectedField) {
        const { data: payments, error: paymentsError } = await supabase
          .from('traffic_violation_payments')
          .select('id')
          .eq('traffic_violation_id', id)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .limit(1);
        if (paymentsError) throw paymentsError;
        if ((payments || []).length > 0) {
          throw new Error('لا يمكن تعديل البيانات المالية أو الارتباطات بعد تسجيل دفعة للمخالفة');
        }
      }
      
      const { data: violation, error } = await supabase
        .from('penalties')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
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
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-stats'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violation', data.id] });
      toast.success('تم تحديث المخالفة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating traffic violation:', error);
      toast.error('حدث خطأ أثناء تحديث المخالفة');
    }
  });
}

// Preserve the violation audit trail by cancelling unpaid records instead of deleting them.
export function useDeleteTrafficViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { companyId } = await getCurrentCompanyContext();
      const { data: payments, error: paymentsError } = await supabase
        .from('traffic_violation_payments')
        .select('id')
        .eq('traffic_violation_id', id)
        .eq('company_id', companyId)
        .or('status.is.null,status.neq.cancelled')
        .limit(1);
      if (paymentsError) throw paymentsError;
      if ((payments || []).length > 0) {
        throw new Error('لا يمكن إلغاء مخالفة لها دفعات. اعكس الدفعات أولًا بإجراء محاسبي معتمد.');
      }

      const { error } = await supabase
        .from('penalties')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .select('id')
        .single();

      if (error) {
        console.error('Error deleting traffic violation:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-stats'] });
      toast.success('تم إلغاء المخالفة مع الاحتفاظ بسجلها');
    },
    onError: (error) => {
      console.error('Error cancelling traffic violation:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء المخالفة');
    }
  });
}

export function useDeleteAllTrafficViolations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات الشركة');

      const { data: paymentRows, error: paymentsError } = await supabase
        .from('traffic_violation_payments')
        .select('traffic_violation_id')
        .eq('company_id', profile.company_id)
        .or('status.is.null,status.neq.cancelled');
      if (paymentsError) throw paymentsError;

      const { data: violationRows, error: violationsError } = await supabase
        .from('penalties')
        .select('id')
        .eq('company_id', profile.company_id)
        .neq('status', 'cancelled');
      if (violationsError) throw violationsError;

      const activeViolationIds = new Set((violationRows || []).map((row) => row.id));
      const blockedIds = new Set(
        (paymentRows || [])
          .map((row) => row.traffic_violation_id)
          .filter((id) => activeViolationIds.has(id))
      );
      const cancellableIds = (violationRows || [])
        .map((row) => row.id)
        .filter((id) => !blockedIds.has(id));

      if (cancellableIds.length === 0) {
        return { cancelledCount: 0, blockedCount: blockedIds.size };
      }

      const { data: cancelledRows, error } = await supabase
        .from('penalties')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .in('id', cancellableIds)
        .eq('company_id', profile.company_id)
        .neq('status', 'cancelled')
        .select('id');

      if (error) {
        console.error('Error deleting all traffic violations:', error);
        throw error;
      }

      return {
        cancelledCount: cancelledRows?.length || 0,
        blockedCount: blockedIds.size,
      };
    },
    onSuccess: ({ cancelledCount, blockedCount }) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].includes('traffic-violations'),
      });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-stats'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-all-for-report'] });
      const blockedMessage = blockedCount > 0 ? `، وتم حماية ${blockedCount.toLocaleString('en-US')} مخالفة لها دفعات` : '';
      toast.success(`تم إلغاء ${cancelledCount.toLocaleString('en-US')} مخالفة${blockedMessage}`);
    },
    onError: (error) => {
      console.error('Error cancelling traffic violations:', error);
      toast.error('حدث خطأ أثناء إلغاء المخالفات المرورية');
    },
  });
}

export function useConfirmTrafficViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { companyId } = await getCurrentCompanyContext();
      const { data: violation, error } = await supabase
        .from('penalties')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .eq('company_id', companyId)
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
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-stats'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violation', data.id] });
      toast.success('تم تأكيد المخالفة بنجاح');
    },
    onError: (error) => {
      console.error('Error confirming traffic violation:', error);
      toast.error('حدث خطأ أثناء تأكيد المخالفة');
    }
  });
}

// Hook للحصول على إحصائيات المخالفات من جميع السجلات (بدون تحديد limit)
export function useTrafficViolationsStats() {
  return useQuery({
    queryKey: ['traffic-violations-stats'],
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

      // Fetch ALL violations for accurate stats (without limit)
      const { data: violations, error } = await supabase
        .from('penalties')
        .select('status, payment_status, amount, penalty_date, customer_id, contract_id')
        .eq('company_id', profile.company_id);

      if (error) {
        console.error('Error fetching violations stats:', error);
        throw error;
      }

      const paidCount = violations.filter(v => v.payment_status === 'paid').length;
      const unpaidCount = violations.filter(v => v.payment_status === 'unpaid').length;
      const partiallyPaidCount = violations.filter(v => v.payment_status === 'partially_paid').length;

      const stats = {
        total: violations.length,
        pending: violations.filter(v => v.status === 'pending').length,
        confirmed: violations.filter(v => v.status === 'confirmed').length,
        cancelled: violations.filter(v => v.status === 'cancelled').length,
        totalAmount: violations.reduce((sum, v) => sum + (v.amount || 0), 0),
        paidAmount: violations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0),
        unpaidAmount: violations.filter(v => v.payment_status !== 'paid').reduce((sum, v) => sum + (v.amount || 0), 0),
        partiallyPaidAmount: violations.filter(v => v.payment_status === 'partially_paid').reduce((sum, v) => sum + (v.amount || 0), 0),
        paidCount,
        unpaidCount,
        partiallyPaidCount,
        unlinkedCount: violations.filter(v => !v.customer_id || !v.contract_id).length,
        collectionRate: violations.length ? Math.round((paidCount / violations.length) * 100) : 0,
        violations: violations // Return raw data for dashboard calculations
      };

      return stats;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}
