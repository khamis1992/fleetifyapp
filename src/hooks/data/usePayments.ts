/**
 * usePayments Hook
 * 
 * React Query hooks for payment data management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services';
import { queryKeys } from '@/lib/queryClient';
import { toast } from 'sonner';
import type { PaymentCreationData } from '@/types/payment';

/**
 * Get all payments
 */
export function usePayments(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.payments.all(companyId),
    queryFn: () => companyId ? paymentService.getByCompany(companyId) : paymentService.getAll(),
    enabled: !!companyId
  });
}

/**
 * Get payment with details
 */
export function usePaymentWithDetails(id: string) {
  return useQuery({
    queryKey: ['payment-with-details', id],
    queryFn: () => paymentService.getPaymentWithDetails(id),
    enabled: !!id
  });
}

/**
 * Get unmatched payments
 */
export function useUnmatchedPayments(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.payments.unmatched(companyId!),
    queryFn: () => paymentService.getUnmatchedPayments(companyId),
    enabled: !!companyId
  });
}

/**
 * Get payment matching suggestions
 */
export function usePaymentMatchSuggestions(paymentId: string) {
  return useQuery({
    queryKey: queryKeys.payments.matches(paymentId),
    queryFn: async () => {
      const payment = await paymentService.getById(paymentId);
      if (!payment) throw new Error('Payment not found');
      return paymentService.findMatchingSuggestions(payment);
    },
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

/**
 * Get payment statistics
 */
export function usePaymentStats(companyId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['payment-stats', companyId, startDate, endDate],
    queryFn: () => paymentService.getPaymentStats(companyId, startDate, endDate),
    enabled: !!companyId
  });
}

/**
 * Create payment mutation
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      data: PaymentCreationData;
      userId: string;
      companyId: string;
    }) => paymentService.createPayment(variables.data, variables.userId, variables.companyId),
    
    onSuccess: (payment, variables) => {
      toast.success('✅ تم تسجيل الدفعة بنجاح', {
        description: `رقم الدفعة: ${payment.payment_number}`
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all(variables.companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.unmatched(variables.companyId) });
    }
  });
}

/**
 * Match payment mutation
 */
export function useMatchPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      paymentId: string;
      targetType: 'invoice' | 'contract';
      targetId: string;
    }) => paymentService.matchPayment(variables.paymentId, variables.targetType, variables.targetId),
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('✅ تم ربط الدفعة بنجاح', {
          description: `الثقة: ${result.confidence}%`
        });

        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    }
  });
}

