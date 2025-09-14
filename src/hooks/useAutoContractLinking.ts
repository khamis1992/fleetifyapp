import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoLinkingResult {
  totalProcessed: number;
  successfullyLinked: number;
  alreadyLinked: number;
  errors: string[];
}

export const useAutoContractLinking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AutoLinkingResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('المستخدم غير مسجل الدخول');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('لم يتم العثور على بيانات الشركة');
      }

      // Get unlinked payments that have agreement_number
      const { data: unlinkedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, agreement_number')
        .eq('company_id', profile.company_id)
        .is('contract_id', null)
        .not('agreement_number', 'is', null)
        .neq('agreement_number', '');

      if (paymentsError) {
        throw new Error(`خطأ في جلب المدفوعات: ${paymentsError.message}`);
      }

      if (!unlinkedPayments || unlinkedPayments.length === 0) {
        return {
          totalProcessed: 0,
          successfullyLinked: 0,
          alreadyLinked: 0,
          errors: ['لا توجد مدفوعات غير مربوطة تحتوي على رقم اتفاقية']
        };
      }

      const result: AutoLinkingResult = {
        totalProcessed: unlinkedPayments.length,
        successfullyLinked: 0,
        alreadyLinked: 0,
        errors: []
      };

      // Process each payment
      for (const payment of unlinkedPayments) {
        try {
          // Find matching contract by contract_number
          const { data: matchingContract } = await supabase
            .from('contracts')
            .select('id, customer_id, contract_number')
            .eq('company_id', profile.company_id)
            .eq('contract_number', payment.agreement_number)
            .maybeSingle();

          if (matchingContract) {
            // Update payment with contract and customer info
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                contract_id: matchingContract.id,
                customer_id: matchingContract.customer_id
              })
              .eq('id', payment.id);

            if (updateError) {
              result.errors.push(`خطأ في ربط الدفعة ${payment.agreement_number}: ${updateError.message}`);
            } else {
              result.successfullyLinked++;
            }
          } else {
            result.errors.push(`لم يتم العثور على عقد برقم: ${payment.agreement_number}`);
          }
        } catch (error) {
          result.errors.push(`خطأ في معالجة الدفعة ${payment.agreement_number}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-payments'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      // Show success message
      if (result.successfullyLinked > 0) {
        toast.success(`تم ربط ${result.successfullyLinked} دفعة بنجاح من أصل ${result.totalProcessed}`);
      }

      // Show warnings if any
      if (result.errors.length > 0 && result.errors.length <= 5) {
        result.errors.forEach(error => {
          toast.warning(error);
        });
      } else if (result.errors.length > 5) {
        toast.warning(`فشل في ربط ${result.errors.length} دفعة. راجع السجلات للتفاصيل.`);
      }
    },
    onError: (error) => {
      console.error('Auto linking error:', error);
      toast.error(error instanceof Error ? error.message : 'خطأ في عملية الربط التلقائي');
    },
  });
};