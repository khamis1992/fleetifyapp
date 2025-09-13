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

  // البحث المحسن عن العقود مع cache وتحسينات أداء
  const searchPotentialContracts = useCallback(async (
    payment: PaymentData
  ): Promise<ContractSearchResult[]> => {
    if (!companyId) return [];
    
    try {
      // إضافة timeout أقصر للعملية كاملة (3 ثوان)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Search timeout after 3 seconds')), 3000);
      });
      
      const searchPromise = async (): Promise<ContractSearchResult[]> => {
        // استخراج رقم العقد من النصوص أولاً
        const { extractContractFromPaymentData, compareContractNumbers } = await import('@/utils/contractNumberExtraction');
        const extractedContract = extractContractFromPaymentData(payment);
        
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
          .eq('company_id', companyId)
          .limit(10); // حد أقل للنتائج لتحسين الأداء

        // بناء شروط البحث بناءً على البيانات المتوفرة
        const searchConditions: string[] = [];
        
        // البحث برقم الاتفاقية/العقد
        const contractToSearch = extractedContract?.contractNumber || payment.agreement_number || payment.contract_number;
        
        if (contractToSearch?.trim()) {
          searchConditions.push(`contract_number.eq.${contractToSearch.trim()}`);
          searchConditions.push(`description.ilike.%${contractToSearch.trim()}%`);
        }

        // البحث بمعرف العميل (مع التحقق من صحة UUID)
        if (payment.customer_id && isValidUUID(payment.customer_id)) {
          searchConditions.push(`customer_id.eq.${payment.customer_id}`);
        }
        
        // البحث بالمبلغ المتقارب (في حالة عدم وجود معرفات أخرى)
        if (searchConditions.length === 0 && payment.amount) {
          const minAmount = payment.amount * 0.8;
          const maxAmount = payment.amount * 1.2;
          searchConditions.push(`monthly_amount.gte.${minAmount},monthly_amount.lte.${maxAmount}`);
        }

        // تطبيق شروط البحث إذا وجدت
        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','));
        } else {
          // كحل أخير، جلب العقود النشطة لنفس الشركة (حد أقل)
          query = query.eq('status', 'active').limit(5);
        }

        const { data: contractResults, error } = await query;
        
        if (error) {
          console.error('خطأ في استعلام العقود:', error);
          throw error;
        }
        
        // معالجة النتائج وحساب مستوى الثقة
        const results: ContractSearchResult[] = [];
        
        for (const contract of (contractResults || [])) {
          let confidence = 0.3; // مستوى ثقة افتراضي منخفض
          let matchReason = 'تطابق عام';
          
          // استخدام المقارنة الذكية لأرقام العقود
          const contractToCompare = extractedContract?.contractNumber || payment.agreement_number || payment.contract_number;
          
          if (contractToCompare) {
            const numberMatch = compareContractNumbers(contractToCompare, contract.contract_number);
            if (numberMatch >= 0.95) {
              confidence = 0.95;
              matchReason = 'تطابق تام برقم العقد';
            } else if (numberMatch >= 0.8) {
              confidence = 0.85;
              matchReason = 'تطابق قوي برقم العقد';
            } else if (contract.description?.includes(contractToCompare)) {
              confidence = 0.6;
              matchReason = 'موجود في وصف العقد';
            }
          }
          
          // تحسين الثقة بناءً على معايير إضافية
          if (payment.customer_id === contract.customer_id) {
            confidence = Math.max(confidence, 0.8);
            matchReason += ' + تطابق العميل';
          }
          
          // مطابقة المبلغ
          if (payment.amount && contract.monthly_amount) {
            const amountDiff = Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount;
            if (amountDiff <= 0.05) { // 5% tolerance
              confidence += 0.1;
              matchReason += ' + تطابق المبلغ';
            }
          }
          
          // مطابقة التاريخ
          if (payment.payment_date && contract.start_date) {
            const paymentDate = new Date(payment.payment_date);
            const startDate = new Date(contract.start_date);
            const endDate = contract.end_date ? new Date(contract.end_date) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            
            if (paymentDate >= startDate && paymentDate <= endDate) {
              confidence += 0.05;
              matchReason += ' + ضمن فترة العقد';
            }
          }
          
          // التأكد من أن الثقة لا تتجاوز 1.0
          confidence = Math.min(confidence, 1.0);
          
          // إضافة النتيجة فقط إذا كان مستوى الثقة معقول
          if (confidence >= 0.3) {
            results.push({
              contract: contract as ContractData,
              confidence,
              matchReason
            });
          }
        }
        
        return results.sort((a, b) => b.confidence - a.confidence);
      };
      
      // تنفيذ البحث مع timeout
      return await Promise.race([searchPromise(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('انتهت مهلة البحث عن العقود - العودة إلى نتائج فارغة');
        return [];
      }
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
