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

interface TrafficViolationSummary {
  id: string;
  penalty_number: string;
  violation_type: string | null;
  amount: number;
  vehicle_id: string | null;
  contract_id: string | null;
  status: string | null;
  payment_status: string | null;
  violation_number: string;
  fine_amount: number;
  total_amount: number;
}

function getTrafficPaymentErrorMessage(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';

  if (message.includes('TRAFFIC_FINE_EXPENSE')) {
    return 'يجب تعيين حساب مصروف المخالفات المرورية من إعدادات ربط الحسابات قبل سداد مخالفة تتحملها الشركة';
  }
  if (message.includes('RECEIVABLES')) {
    return 'يجب تعيين حساب ذمم العملاء من إعدادات ربط الحسابات قبل سداد مخالفة يتحملها العميل';
  }
  if (message.includes('BANK')) {
    return 'يجب تعيين حساب البنك من إعدادات ربط الحسابات قبل استخدام طريقة الدفع المختارة';
  }
  if (message.includes('CASH')) {
    return 'يجب تعيين حساب الصندوق من إعدادات ربط الحسابات قبل استخدام الدفع النقدي';
  }
  if (message.includes('create_traffic_violation_payment_with_journal') || message.includes('PGRST202')) {
    return 'تحديث قاعدة البيانات الخاص بسداد المخالفات لم يُنشر بعد';
  }

  return message || 'حدث خطأ أثناء تسجيل سداد المخالفة';
}

export function calculateRemainingViolationAmount(
  violationAmount: number,
  payments: Array<{ amount: number; status: string }>
) {
  const normalizedAmount = Number.isFinite(violationAmount) ? Math.max(violationAmount, 0) : 0;
  const paidAmount = payments
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0), 0);

  return Math.max(normalizedAmount - paidAmount, 0);
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

async function refreshViolationPaymentStatus(violationId?: string, knownCompanyId?: string) {
  if (!violationId) return;

  const companyId = knownCompanyId || (await getCompanyId()).companyId;
  const [penaltyResult, trafficViolationResult, paymentsResult] = await Promise.all([
    supabase
      .from('penalties')
      .select('id, amount')
      .eq('id', violationId)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('traffic_violations')
      .select('id, fine_amount')
      .eq('id', violationId)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('traffic_violation_payments')
      .select('amount, status')
      .eq('traffic_violation_id', violationId)
      .eq('company_id', companyId),
  ]);

  if (penaltyResult.error) throw penaltyResult.error;
  if (trafficViolationResult.error) throw trafficViolationResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const penalty = penaltyResult.data;
  const trafficViolation = trafficViolationResult.data;
  if (!penalty && !trafficViolation) {
    throw new Error('المخالفة غير موجودة أو لا تتبع الشركة الحالية');
  }

  const violationAmount = Number(penalty?.amount ?? trafficViolation?.fine_amount ?? 0);
  const paidAmount = (paymentsResult.data || [])
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const paymentStatus =
    paidAmount <= 0
      ? 'unpaid'
      : paidAmount >= violationAmount
        ? 'paid'
        : 'partially_paid';

  if (penalty) {
    const { error } = await supabase
      .from('penalties')
      .update({ payment_status: paymentStatus })
      .eq('id', violationId)
      .eq('company_id', companyId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('traffic_violations')
    .update({
      status: paymentStatus === 'paid' ? 'paid' : 'pending',
      payment_date: paymentStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', violationId)
    .eq('company_id', companyId);
  if (error) throw error;
}

function invalidateTrafficPaymentQueries(queryClient: ReturnType<typeof useQueryClient>, violationId?: string) {
  queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments'] });
  queryClient.invalidateQueries({ queryKey: ['all-traffic-violation-payments'] });
  queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
  queryClient.invalidateQueries({ queryKey: ['contract-violations'] });
  if (violationId) {
    queryClient.invalidateQueries({ queryKey: ['traffic-violation-payments', violationId] });
    queryClient.invalidateQueries({ queryKey: ['traffic-violation', violationId] });
  }
}

export function useTrafficViolationPayments(violationId: string) {
  return useQuery({
    queryKey: ['traffic-violation-payments', violationId],
    queryFn: async () => {
      const { companyId } = await getCompanyId();
      const { data, error } = await supabase
        .from('traffic_violation_payments')
        .select('*')
        .eq('traffic_violation_id', violationId)
        .eq('company_id', companyId)
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
      let violationsMap: Record<string, TrafficViolationSummary> = {};

      if (violationIds.length > 0) {
        const { data: violations } = await supabase
          .from('penalties')
          .select('id, penalty_number, violation_type, amount, vehicle_id, contract_id, status, payment_status')
          .in('id', violationIds)
          .eq('company_id', companyId);

        violationsMap = (violations || []).reduce((acc, violation) => {
          acc[violation.id] = {
            ...violation,
            violation_number: violation.penalty_number,
            fine_amount: violation.amount,
            total_amount: violation.amount,
          };
          return acc;
        }, {} as Record<string, TrafficViolationSummary>);
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
        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر');
        }

        const [penaltyResult, trafficViolationResult, existingPaymentsResult] = await Promise.all([
          supabase
            .from('penalties')
            .select('id, amount')
            .eq('id', data.traffic_violation_id)
            .eq('company_id', companyId)
            .maybeSingle(),
          supabase
            .from('traffic_violations')
            .select('id, fine_amount')
            .eq('id', data.traffic_violation_id)
            .eq('company_id', companyId)
            .maybeSingle(),
          supabase
            .from('traffic_violation_payments')
            .select('amount, status')
            .eq('traffic_violation_id', data.traffic_violation_id)
            .eq('company_id', companyId),
        ]);

        if (penaltyResult.error) throw penaltyResult.error;
        if (trafficViolationResult.error) throw trafficViolationResult.error;
        if (existingPaymentsResult.error) throw existingPaymentsResult.error;

        const violationAmount = Number(
          penaltyResult.data?.amount ?? trafficViolationResult.data?.fine_amount ?? 0
        );
        if (!penaltyResult.data && !trafficViolationResult.data) {
          throw new Error('المخالفة غير موجودة أو لا تتبع الشركة الحالية');
        }

        const remainingAmount = calculateRemainingViolationAmount(
          violationAmount,
          existingPaymentsResult.data || []
        );
        if (remainingAmount <= 0) throw new Error('المخالفة مسددة بالكامل بالفعل');
        if (amount > remainingAmount + 0.001) {
          throw new Error(`مبلغ الدفعة يتجاوز المتبقي ${remainingAmount.toFixed(2)} ر.ق`);
        }

        const { data: payment, error } = await supabase
          .rpc('create_traffic_violation_payment_with_journal', {
            p_company_id: companyId,
            p_violation_id: data.traffic_violation_id,
            p_amount: amount,
            p_payment_method: data.payment_method,
            p_payment_type: data.payment_type || 'full',
            p_payment_date: data.payment_date || new Date().toISOString().split('T')[0],
            p_bank_account: data.bank_account,
            p_check_number: data.check_number,
            p_reference_number: data.reference_number,
            p_notes: data.notes,
            p_actor_id: userId,
          });

        if (error) throw error;
        return payment as TrafficViolationPayment;
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'create' }, extra: { data } });
        throw error;
      }
    },
    onSuccess: (data) => {
      invalidateTrafficPaymentQueries(queryClient, data.traffic_violation_id);
      toast.success('تم تسجيل سداد الشركة وترحيل القيد المحاسبي بنجاح');
    },
    onError: (error) => {
      console.error('Error creating traffic violation payment:', error);
      toast.error(getTrafficPaymentErrorMessage(error));
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
        const { companyId } = await getCompanyId();
        const { data: existingPayment, error: existingError } = await supabase
          .from('traffic_violation_payments')
          .select('*')
          .eq('id', id)
          .eq('company_id', companyId)
          .single();
        if (existingError) throw existingError;
        if (existingPayment.journal_entry_id || existingPayment.status === 'completed') {
          throw new Error('لا يمكن تعديل دفعة مكتملة. استخدم عملية عكس أو تسوية معتمدة، أو دع وكيل التدقيق يصلح الدفعة القديمة غير المرحلة.');
        }

        const violationId = updateData.traffic_violation_id ?? existingPayment.traffic_violation_id;
        const amount = Number(updateData.amount ?? existingPayment.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر');
        }

        const [penaltyResult, trafficViolationResult, otherPaymentsResult] = await Promise.all([
          supabase.from('penalties').select('id, amount').eq('id', violationId).eq('company_id', companyId).maybeSingle(),
          supabase.from('traffic_violations').select('id, fine_amount').eq('id', violationId).eq('company_id', companyId).maybeSingle(),
          supabase
            .from('traffic_violation_payments')
            .select('amount, status')
            .eq('traffic_violation_id', violationId)
            .eq('company_id', companyId)
            .neq('id', id),
        ]);
        if (penaltyResult.error) throw penaltyResult.error;
        if (trafficViolationResult.error) throw trafficViolationResult.error;
        if (otherPaymentsResult.error) throw otherPaymentsResult.error;
        if (!penaltyResult.data && !trafficViolationResult.data) {
          throw new Error('المخالفة غير موجودة أو لا تتبع الشركة الحالية');
        }

        const violationAmount = Number(penaltyResult.data?.amount ?? trafficViolationResult.data?.fine_amount ?? 0);
        const remainingAmount = calculateRemainingViolationAmount(violationAmount, otherPaymentsResult.data || []);
        if (amount > remainingAmount + 0.001) {
          throw new Error(`مبلغ الدفعة يتجاوز المتبقي ${remainingAmount.toFixed(2)} ر.ق`);
        }

        const { data: payment, error } = await supabase
          .from('traffic_violation_payments')
          .update({ ...updateData, amount, traffic_violation_id: violationId })
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw error;
        return {
          payment: payment as TrafficViolationPayment,
          previousViolationId: existingPayment.traffic_violation_id,
          companyId,
        };
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'update' }, extra: { paymentId: id, updateData } });
        throw error;
      }
    },
    onSuccess: async ({ payment, previousViolationId, companyId }) => {
      await refreshViolationPaymentStatus(payment.traffic_violation_id, companyId);
      if (previousViolationId !== payment.traffic_violation_id) {
        await refreshViolationPaymentStatus(previousViolationId, companyId);
      }
      invalidateTrafficPaymentQueries(queryClient, payment.traffic_violation_id);
      invalidateTrafficPaymentQueries(queryClient, previousViolationId);
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
        const { companyId } = await getCompanyId();
        const { data: existingPayment, error: existingError } = await supabase
          .from('traffic_violation_payments')
          .select('traffic_violation_id, journal_entry_id, status')
          .eq('id', id)
          .eq('company_id', companyId)
          .single();
        if (existingError) throw existingError;
        if (existingPayment.journal_entry_id) {
          throw new Error('لا يمكن حذف دفعة مرتبطة بقيد محاسبي. استخدم عملية عكس أو تسوية معتمدة.');
        }

        const { data: cancelledPayment, error } = await supabase
          .from('traffic_violation_payments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('company_id', companyId)
          .neq('status', 'cancelled')
          .select('id')
          .single();
        if (error) throw error;

        try {
          await refreshViolationPaymentStatus(existingPayment.traffic_violation_id, companyId);
        } catch (statusError) {
          const { error: rollbackError } = await supabase
            .from('traffic_violation_payments')
            .update({ status: existingPayment.status, updated_at: new Date().toISOString() })
            .eq('id', cancelledPayment.id)
            .eq('company_id', companyId);
          if (rollbackError) {
            throw new Error(`فشل تحديث حالة المخالفة وفشل التراجع عن إلغاء الدفعة: ${rollbackError.message}`);
          }
          throw statusError;
        }

        return { id, violationId: existingPayment.traffic_violation_id, companyId };
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'traffic_payments', action: 'delete' }, extra: { paymentId: id } });
        throw error;
      }
    },
    onSuccess: (data) => {
      invalidateTrafficPaymentQueries(queryClient, data.violationId);
      toast.success('تم إلغاء الدفعة مع الاحتفاظ بسجلها');
    },
    onError: (error) => {
      console.error('Error cancelling traffic violation payment:', error);
      toast.error(getTrafficPaymentErrorMessage(error));
    },
  });
}

export function useTrafficViolationPaymentsStats() {
  return useQuery({
    queryKey: ['traffic-violation-payments-stats'],
    queryFn: async () => {
      const { companyId } = await getCompanyId();
      const { data: payments, error } = await supabase
        .from('traffic_violation_payments')
        .select('amount, payment_method, status, created_at')
        .eq('company_id', companyId);

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
