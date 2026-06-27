import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

export interface TrafficViolationPayment {
  id: string;
  company_id: string;
  traffic_violation_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  payment_type: 'full' | 'partial';
  bank_account?: string | null;
  check_number?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  journal_entry_id?: string | null;
  created_by?: string | null;
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

async function getCompanyId() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('المستخدم غير مسجل الدخول');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.user.id)
    .single();

  if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات الشركة');
  return { companyId: profile.company_id, userId: user.user.id };
}

async function refreshPenaltyPaymentStatus(violationId?: string) {
  if (!violationId) return;

  const [{ data: penalty }, { data: payments }] = await Promise.all([
    supabase.from('penalties').select('amount').eq('id', violationId).maybeSingle(),
    supabase.from('traffic_violation_payments').select('amount, status').eq('traffic_violation_id', violationId),
  ]);

  if (!penalty) return;

  const penaltyAmount = Number(penalty.amount || 0);
  const paidAmount = (payments || [])
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const paymentStatus =
    paidAmount <= 0
      ? 'unpaid'
      : paidAmount >= penaltyAmount
        ? 'paid'
        : 'partially_paid';

  await supabase.from('penalties').update({ payment_status: paymentStatus }).eq('id', violationId);
}

function invalidateTrafficPaymentQueries(queryClient: ReturnType<typeof useQueryClient>, violationId?: string) {
  queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments'] });
  queryClient.invalidateQueries({ queryKey: ['all-traffic-violation-payments'] });
  queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
  if (violationId) {
    queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments', violationId] });
    queryClient.invalidateQueries({ queryKey: ['traffic-violation', violationId] });
  }
}

export function useTrafficViolationPayments(violationId: string) {
  return useQuery({
    queryKey: ['traffic-violation-payments', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_violation_payments')
        .select('*')
        .eq('traffic_violation_id', violationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrafficViolationPayment[];
    },
    enabled: !!violationId,
  });
}

export function useAllTrafficViolationPayments() {
  return useQuery({
    queryKey: ['all-traffic-violation-payments'],
    queryFn: async () => {
      const { companyId } = await getCompanyId();

      const { data, error } = await supabase
        .from('traffic_violation_payments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const violationIds = Array.from(new Set((data || []).map((payment) => payment.traffic_violation_id).filter(Boolean)));
      let violationsMap: Record<string, any> = {};

      if (violationIds.length > 0) {
        const { data: violations } = await supabase
          .from('penalties')
          .select('id, penalty_number, violation_type, amount, vehicle_id, contract_id, status, payment_status')
          .in('id', violationIds);

        violationsMap = (violations || []).reduce((acc, violation) => {
          acc[violation.id] = {
            ...violation,
            violation_number: violation.penalty_number,
            fine_amount: violation.amount,
            total_amount: violation.amount,
          };
          return acc;
        }, {} as Record<string, any>);
      }

      return (data || []).map((payment) => ({
        ...payment,
        penalties: violationsMap[payment.traffic_violation_id] || null,
      }));
    },
  });
}

export function useCreateTrafficViolationPayment() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (data: CreateTrafficViolationPaymentData) => {
      if (!hasPermission('traffic_payments:create')) {
        throw new Error('ليس لديك صلاحية لإنشاء دفعات المخالفات المرورية');
      }

      try {
        const { companyId, userId } = await getCompanyId();
        const { data: paymentNumber, error: numberError } = await supabase.rpc('generate_traffic_payment_number', {
          company_id_param: companyId,
        });
        if (numberError) throw numberError;

        const { data: payment, error } = await supabase
          .from('traffic_violation_payments')
          .insert({
            company_id: companyId,
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
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return payment as TrafficViolationPayment;
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'create' }, extra: { data } });
        throw error;
      }
    },
    onSuccess: async (data) => {
      await refreshPenaltyPaymentStatus(data.traffic_violation_id);
      invalidateTrafficPaymentQueries(queryClient, data.traffic_violation_id);
      toast.success('تم تسجيل الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error creating traffic violation payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفع');
    },
  });
}

export function useUpdateTrafficViolationPayment() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<CreateTrafficViolationPaymentData>) => {
      if (!hasPermission('traffic_payments:update')) {
        throw new Error('ليس لديك صلاحية لتحديث دفعات المخالفات المرورية');
      }

      try {
        const { data: payment, error } = await supabase
          .from('traffic_violation_payments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return payment as TrafficViolationPayment;
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'update' }, extra: { paymentId: id, updateData } });
        throw error;
      }
    },
    onSuccess: async (data) => {
      await refreshPenaltyPaymentStatus(data.traffic_violation_id);
      invalidateTrafficPaymentQueries(queryClient, data.traffic_violation_id);
      toast.success('تم تحديث الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error updating traffic violation payment:', error);
      toast.error('حدث خطأ أثناء تحديث الدفع');
    },
  });
}

export function useDeleteTrafficViolationPayment() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!hasPermission('traffic_payments:delete')) {
        throw new Error('ليس لديك صلاحية لحذف دفعات المخالفات المرورية');
      }

      try {
        const { data: existingPayment } = await supabase
          .from('traffic_violation_payments')
          .select('traffic_violation_id')
          .eq('id', id)
          .maybeSingle();

        const { error } = await supabase.from('traffic_violation_payments').delete().eq('id', id);
        if (error) throw error;

        return { id, violationId: existingPayment?.traffic_violation_id };
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'delete' }, extra: { paymentId: id } });
        throw error;
      }
    },
    onSuccess: async (data) => {
      await refreshPenaltyPaymentStatus(data.violationId);
      invalidateTrafficPaymentQueries(queryClient, data.violationId);
      toast.success('تم حذف الدفع بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting traffic violation payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفع');
    },
  });
}

export function useTrafficViolationPaymentsStats() {
  return useQuery({
    queryKey: ['traffic-violation-payments-stats'],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('traffic_violation_payments')
        .select('amount, payment_method, status, created_at');

      if (error) throw error;

      const completedPayments = (payments || []).filter((payment) => payment.status === 'completed');
      const pendingPayments = (payments || []).filter((payment) => payment.status === 'pending');

      return {
        totalPayments: payments?.length || 0,
        totalAmount: (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        completedPayments: completedPayments.length,
        completedAmount: completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        pendingPayments: pendingPayments.length,
        pendingAmount: pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        methodBreakdown: {
          cash: (payments || []).filter((payment) => payment.payment_method === 'cash').length,
          bank_transfer: (payments || []).filter((payment) => payment.payment_method === 'bank_transfer').length,
          check: (payments || []).filter((payment) => payment.payment_method === 'check').length,
          credit_card: (payments || []).filter((payment) => payment.payment_method === 'credit_card').length,
        },
      };
    },
  });
}
