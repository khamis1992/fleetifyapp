/**
 * Hook لإدارة عمليات ربط المدفوعات بالعقود
 * يوفر وظائف شاملة للبحث والربط والتحقق من المدفوعات والعقود
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import {
  PaymentData,
  ContractData,
  ValidationResult,
  LinkingAttempt,
  PaymentContractValidator,
  generateLinkingReport
} from '@/utils/paymentContractValidation';

export interface PaymentLinkingStats {
  total_payments: number;
  linked_payments: number;
  unlinked_payments: number;
  linking_percentage: number;
}

export interface ContractSearchResult {
  contract: ContractData;
  confidence: number;
  matchReason: string;
}

export const usePaymentContractLinking = () => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // جلب إحصائيات ربط المدفوعات
  const { data: linkingStats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-linking-stats', companyId],
    queryFn: async (): Promise<PaymentLinkingStats> => {
      if (!companyId) throw new Error('Company ID is required');
      
      // استخدام استعلام مباشر بدلاً من RPC غير موجود
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('id, contract_id')
        .eq('company_id', companyId);
      
      if (error) throw error;
      
      const totalPayments = paymentsData?.length || 0;
      const linkedPayments = paymentsData?.filter(p => p.contract_id).length || 0;
      const unlinkedPayments = totalPayments - linkedPayments;
      const linkingPercentage = totalPayments > 0 ? (linkedPayments / totalPayments) * 100 : 0;
      
      return { 
        total_payments: totalPayments, 
        linked_payments: linkedPayments, 
        unlinked_payments: unlinkedPayments, 
        linking_percentage: linkingPercentage 
      };
    },
    enabled: !!companyId
  });

  // جلب المدفوعات غير المربوطة
  const { data: unlinkablePayments, isLoading: unlinkedLoading } = useQuery({
    queryKey: ['unlinked-payments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            phone
          )
        `)
        .eq('company_id', companyId)
        .is('contract_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // جلب المدفوعات المربوطة
  const { data: linkedPayments, isLoading: linkedLoading } = useQuery({
    queryKey: ['linked-payments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          contracts (
            id,
            contract_number,
            contract_amount,
            balance_due,
            payment_status,
            customers (
              first_name,
              last_name,
              company_name
            )
          )
        `)
        .eq('company_id', companyId)
        .not('contract_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // التحقق من صحة UUID
  const isValidUUID = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // البحث عن العقود المحتملة للربط
  const searchPotentialContracts = useCallback(async (
    payment: PaymentData
  ): Promise<ContractSearchResult[]> => {
    if (!companyId) return [];
    
    try {
      // بناء استعلام ديناميكي مع التحقق من صحة البيانات
      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            phone
          )
        `)
        .eq('company_id', companyId);

      // بناء شروط البحث بناءً على البيانات المتوفرة
      const searchConditions: string[] = [];
      
      // البحث برقم الاتفاقية/العقد
      if (payment.agreement_number?.trim()) {
        searchConditions.push(`contract_number.eq.${payment.agreement_number.trim()}`);
      }
      
      if (payment.contract_number?.trim()) {
        searchConditions.push(`contract_number.eq.${payment.contract_number.trim()}`);
      }

      // البحث بمعرف العميل (مع التحقق من صحة UUID)
      if (payment.customer_id && isValidUUID(payment.customer_id)) {
        searchConditions.push(`customer_id.eq.${payment.customer_id}`);
      }

      // إذا لم نجد أي شروط بحث صالحة، نبحث في الوصف
      if (searchConditions.length === 0) {
        if (payment.agreement_number?.trim()) {
          searchConditions.push(`description.ilike.%${payment.agreement_number.trim()}%`);
        }
      }

      // تطبيق شروط البحث إذا وجدت
      if (searchConditions.length > 0) {
        query = query.or(searchConditions.join(','));
      } else {
        // إذا لم نجد أي شروط، نعيد مصفوفة فارغة
        return [];
      }

      const { data: contractResults, error } = await query;
      
      if (error) {
        console.error('خطأ في استعلام العقود:', error);
        throw error;
      }
      
      // معالجة النتائج وحساب مستوى الثقة
      const results: ContractSearchResult[] = [];
      
      for (const contract of (contractResults || [])) {
        let confidence = 0.5; // مستوى ثقة افتراضي
        let matchReason = 'تطابق عام';
        
        // حساب مستوى الثقة بناءً على نوع التطابق
        if (payment.agreement_number === contract.contract_number) {
          confidence = 0.95;
          matchReason = 'تطابق تام برقم الاتفاقية';
        } else if (payment.contract_number === contract.contract_number) {
          confidence = 0.9;
          matchReason = 'تطابق برقم العقد';
        } else if (payment.customer_id === contract.customer_id) {
          confidence = 0.8;
          matchReason = 'تطابق بالعميل';
        } else if (contract.description?.includes(payment.agreement_number || '')) {
          confidence = 0.6;
          matchReason = 'تطابق جزئي في الوصف';
        }
        
        results.push({
          contract: contract as ContractData,
          confidence,
          matchReason
        });
      }
      
      return results.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('خطأ في البحث عن العقود:', error);
      return [];
    }
  }, [companyId]);

  // ربط دفعة بعقد
  const linkPaymentToContract = useMutation({
    mutationFn: async ({
      paymentId,
      contractId,
      linkingMethod,
      confidence
    }: {
      paymentId: string;
      contractId: string;
      linkingMethod: string;
      confidence: number;
    }) => {
      if (!companyId || !user?.id) throw new Error('بيانات المستخدم أو الشركة غير متوفرة');
      
      // تحديث الدفعة بربطها بالعقد
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          contract_id: contractId,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('company_id', companyId);
      
      if (updateError) throw updateError;
      
      // تسجيل محاولة الربط (تعليق مؤقت حتى إنشاء الجدول)
      // const { error: logError } = await supabase
      //   .from('payment_contract_linking_attempts')
      //   .insert({
      //     payment_id: paymentId,
      //     selected_contract_id: contractId,
      //     linking_confidence: confidence,
      //     linking_method: linkingMethod,
      //     created_by: user.id,
      //     company_id: companyId,
      //     attempted_contract_identifiers: {},
      //     matching_contracts: []
      //   });
      
      // if (logError) {
      //   console.warn('فشل في تسجيل محاولة الربط:', logError);
      //   // لا نرمي خطأ هنا لأن الربط نفسه نجح
      // }
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم ربط الدفعة بالعقد بنجاح');
      // تحديث البيانات المحفوظة مؤقتاً
      queryClient.invalidateQueries({ queryKey: ['payment-linking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-payments'] });
      queryClient.invalidateQueries({ queryKey: ['linked-payments'] });
    },
    onError: (error) => {
      console.error('خطأ في ربط الدفعة:', error);
      toast.error('فشل في ربط الدفعة بالعقد');
    }
  });

  // إلغاء ربط دفعة من عقد
  const unlinkPaymentFromContract = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!companyId) throw new Error('معرف الشركة غير متوفر');
      
      const { error } = await supabase
        .from('payments')
        .update({ 
          contract_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('company_id', companyId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم إلغاء ربط الدفعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['payment-linking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-payments'] });
      queryClient.invalidateQueries({ queryKey: ['linked-payments'] });
    },
    onError: (error) => {
      console.error('خطأ في إلغاء ربط الدفعة:', error);
      toast.error('فشل في إلغاء ربط الدفعة');
    }
  });

  // ربط تلقائي للمدفوعات غير المربوطة
  const autoLinkPayments = useMutation({
    mutationFn: async (options: {
      minConfidence?: number;
      dryRun?: boolean;
    } = {}) => {
      const { minConfidence = 0.8, dryRun = false } = options;
      
      if (!companyId || !user?.id) throw new Error('بيانات المستخدم أو الشركة غير متوفرة');
      
      setIsProcessing(true);
      
      const results = {
        processed: 0,
        linked: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      try {
        // جلب المدفوعات غير المربوطة التي تحتوي على معرفات عقود
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('company_id', companyId)
          .is('contract_id', null)
          .or('agreement_number.not.is.null,contract_number.not.is.null');
        
        if (paymentsError) throw paymentsError;
        
        for (const payment of payments || []) {
          results.processed++;
          
          try {
            // البحث عن عقود محتملة
            const potentialContracts = await searchPotentialContracts(payment);
            
            // اختيار أفضل تطابق
            const bestMatch = potentialContracts.find(c => c.confidence >= minConfidence);
            
            if (bestMatch) {
              // التحقق من صحة الربط
              const validation = PaymentContractValidator.validatePaymentContractMatch(
                payment,
                bestMatch.contract
              );
              
              if (validation.isValid && !dryRun) {
                // تنفيذ الربط
                await linkPaymentToContract.mutateAsync({
                  paymentId: payment.id,
                  contractId: bestMatch.contract.id,
                  linkingMethod: 'auto',
                  confidence: bestMatch.confidence
                });
                
                results.linked++;
              } else if (validation.isValid && dryRun) {
                results.linked++; // عد فقط في وضع المحاكاة
              } else {
                results.skipped++;
                results.errors.push(`الدفعة ${payment.payment_number}: ${validation.errors.join(', ')}`);
              }
            } else {
              results.skipped++;
            }
          } catch (error) {
            results.errors.push(`الدفعة ${payment.payment_number}: ${error}`);
          }
        }
        
        return results;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (results) => {
      const message = `تم معالجة ${results.processed} دفعة: ${results.linked} مربوطة، ${results.skipped} متجاهلة`;
      toast.success(message);
      
      if (!results.errors.length) {
        queryClient.invalidateQueries({ queryKey: ['payment-linking-stats'] });
        queryClient.invalidateQueries({ queryKey: ['unlinked-payments'] });
        queryClient.invalidateQueries({ queryKey: ['linked-payments'] });
      }
    },
    onError: (error) => {
      console.error('خطأ في الربط التلقائي:', error);
      toast.error('فشل في عملية الربط التلقائي');
    }
  });

  // التحقق من صحة ربط دفعة بعقد
  const validateLinking = useCallback((
    payment: PaymentData,
    contract: ContractData,
    method: string = 'manual'
  ) => {
    const linkingAttempt: LinkingAttempt = {
      attempted_identifiers: {
        agreement_number: payment.agreement_number,
        contract_number: payment.contract_number,
        customer_id: payment.customer_id
      },
      matching_contracts: [contract],
      selected_contract: contract,
      confidence: 0.8,
      method: method as any
    };
    
    return generateLinkingReport(payment, contract, linkingAttempt);
  }, []);

  return {
    // البيانات
    linkingStats,
    unlinkablePayments,
    linkedPayments,
    
    // حالات التحميل
    statsLoading,
    unlinkedLoading,
    linkedLoading,
    isProcessing,
    
    // الوظائف
    searchPotentialContracts,
    linkPaymentToContract,
    unlinkPaymentFromContract,
    autoLinkPayments,
    validateLinking,
    
    // حالات العمليات
    isLinking: linkPaymentToContract.isPending,
    isUnlinking: unlinkPaymentFromContract.isPending,
    isAutoLinking: autoLinkPayments.isPending
  };
};

export default usePaymentContractLinking;
