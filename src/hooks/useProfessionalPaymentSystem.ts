import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { smartPaymentLinker, type SmartLinkingResult } from '@/utils/smartPaymentLinker';
import { paymentAllocationEngine, type AllocationResult } from '@/utils/paymentAllocationEngine';
import { accountingIntegration, type JournalEntryData } from '@/utils/accountingIntegration';
import { auditTrailSystem } from '@/utils/auditTrailSystem';
import { logger } from '@/lib/logger';

// دالة حساب مستوى الثقة في الربط
const calculateLinkingConfidence = (payment: any, contract: any): number => {
  let confidence = 0.3; // أساس

  // تطابق المبلغ
  if (payment.amount === contract.monthly_amount) {
    confidence += 0.4;
  } else if (Math.abs(payment.amount - contract.monthly_amount) / contract.monthly_amount <= 0.1) {
    confidence += 0.2;
  }

  // تطابق رقم الاتفاقية
  if (payment.agreement_number && contract.contract_number && 
      contract.contract_number.includes(payment.agreement_number)) {
    confidence += 0.3;
  }

  // وجود رقم مرجعي
  if (payment.reference_number) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
};

export interface ProfessionalPaymentStats {
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  autoLinkedPercentage: number;
  pendingReview: number;
  monthlyTrend: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface PendingPayment {
  id: string;
  paymentNumber: string;
  amount: number;
  customerName: string;
  paymentDate: string;
  status: string;
  confidence: number;
  suggestedActions: string[];
}

export const useProfessionalPaymentSystem = (companyId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLinkingAll, setIsLinkingAll] = useState(false);

  // Get professional payment statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['professional-payment-stats', companyId],
    queryFn: async (): Promise<ProfessionalPaymentStats> => {
      logger.debug('Fetching professional payment stats', { companyId });
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_status, created_at')
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const payments = data || [];
      const totalProcessed = payments.length;
      const successRate = payments.filter(p => p.payment_status === 'completed').length / totalProcessed * 100;
      
      // Calculate monthly trend
      const monthlyTrend = payments.reduce((acc, payment) => {
        const month = new Date(payment.payment_date).toLocaleDateString('ar', { year: 'numeric', month: 'long' });
        const existing = acc.find(item => item.month === month);
        
        if (existing) {
          existing.count += 1;
          existing.amount += payment.amount;
        } else {
          acc.push({ month, count: 1, amount: payment.amount });
        }
        
        return acc;
      }, [] as Array<{ month: string; count: number; amount: number }>);

      // Get count of payments needing review (completed but not linked to contracts)
      const { count: pendingReviewCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .is('contract_id', null);

      logger.debug('Stats computed', { totalProcessed, pendingReview: pendingReviewCount || 0, months: monthlyTrend.length });
      return {
        totalProcessed,
        averageProcessingTime: 2.5, // Mock data - would calculate from actual processing times
        successRate: successRate || 0,
        autoLinkedPercentage: 75, // Mock data - would calculate from linking data
        pendingReview: pendingReviewCount || 0,
        monthlyTrend
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes,
    enabled: !!companyId,
  });

  // Get pending payments for review - completed payments without contract links
  const { data: pendingPayments, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-payments', companyId],
    queryFn: async (): Promise<PendingPayment[]> => {
      logger.debug('Fetching pending payments', { companyId });
      
      // Step 1: Fetch payments without customer data to avoid RLS issues
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          amount,
          payment_date,
          payment_status,
          contract_id,
          reference_number,
          payment_method,
          customer_id
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .is('contract_id', null)
        .order('payment_date', { ascending: false })
        .limit(100);

      if (paymentsError) {
        logger.error('Failed to fetch payments', paymentsError);
        throw paymentsError;
      }

      const payments = paymentsData || [];
      logger.debug('Payments fetched successfully', { count: payments.length });

      // Step 2: Get unique customer IDs and fetch customer names separately
      const customerIds = [...new Set(payments.map(p => p.customer_id).filter(Boolean))];
      let customersMap = new Map<string, string>();

      if (customerIds.length > 0) {
        try {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, customer_type, first_name, last_name, company_name')
            .eq('company_id', companyId)
            .in('id', customerIds);

          if (customersError) {
            logger.warn('Failed to fetch customers, proceeding without customer names', customersError);
            toast({
              title: 'تحذير',
              description: 'لا يمكن عرض أسماء العملاء بسبب صلاحيات الوصول',
              variant: 'destructive'
            });
          } else {
            customersData?.forEach(customer => {
              // Construct customer name based on type
              const customerName = customer.customer_type === 'corporate' 
                ? customer.company_name || 'شركة غير محددة'
                : `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'فرد غير محدد';
              customersMap.set(customer.id, customerName);
            });
            logger.debug('Customers fetched successfully', { count: customersData?.length || 0 });
          }
        } catch (error) {
          logger.warn('Exception while fetching customers', error);
        }
      }

      // Step 3: Map payments with customer names
      const mapped = payments.map(payment => {
        // Calculate confidence based on available data
        let confidence = 0.3; // Base confidence
        
        if (payment.reference_number) confidence += 0.2;
        if (payment.amount > 0) confidence += 0.1;
        if (payment.customer_id && customersMap.has(payment.customer_id)) confidence += 0.2;
        if (payment.payment_method !== 'cash') confidence += 0.1;
        
        // Determine suggested actions based on payment characteristics
        const suggestedActions = ['ربط ذكي بعقد'];
        
        if (payment.amount > 1000) {
          suggestedActions.push('إنشاء فاتورة');
        }
        
        if (!payment.reference_number) {
          suggestedActions.push('إضافة رقم مرجعي');
        }
        
        suggestedActions.push('مراجعة يدوية');

        return {
          id: payment.id,
          paymentNumber: payment.payment_number,
          amount: payment.amount,
          customerName: payment.customer_id ? (customersMap.get(payment.customer_id) || 'غير محدد') : 'غير محدد',
          paymentDate: payment.payment_date,
          status: 'needs_review', // Custom status for pending review
          confidence: Math.min(confidence, 0.95),
          suggestedActions
        };
      });
      
      logger.debug('Pending payments mapped successfully', { count: mapped.length });
      return mapped;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes,
    enabled: !!companyId,
  });

  // Smart linking mutation
  const smartLinkingMutation = useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      logger.debug('Starting smart linking process', { paymentId });
      const payment = await supabase.from('payments').select('*').eq('id', paymentId).single();
      if (payment.error) throw payment.error;
      return await smartPaymentLinker.findBestContract(payment.data);
    },
    onSuccess: (result: SmartLinkingResult, { paymentId }) => {
      if (result.success) {
        toast({
          title: 'تم الربط بنجاح',
          description: `تم ربط الدفعة بأفضل عقد مطابق`,
        });
        
        // Log audit trail
        auditTrailSystem.logPaymentAction(
          'linked',
          paymentId,
          'current-user-id', // Would get from auth context
          companyId,
          undefined,
          { confidence: result.confidence }
        );
      } else {
        toast({
          title: 'فشل في الربط',
          description: 'لم يتم العثور على عقود مناسبة للربط',
          variant: 'destructive'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['pending-payments', companyId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['active-contracts'] });
    },
    onError: (error) => {
      logger.error('Smart linking failed', error);
      toast({
        title: 'خطأ في الربط الذكي',
        description: 'حدث خطأ أثناء محاولة ربط المدفوعة',
        variant: 'destructive'
      });
    }
  });

  // Payment allocation mutation
  const allocationMutation = useMutation({
    mutationFn: async (paymentData: {
      id: string;
      amount: number;
      customerId?: string;
      contractId?: string;
      paymentMethod: string;
      companyId: string;
    }) => {
      logger.debug('Starting payment allocation', { paymentId: paymentData.id });
      return await paymentAllocationEngine.allocatePayment(paymentData);
    },
    onSuccess: (result: AllocationResult, paymentData) => {
      if (result.success) {
        toast({
          title: 'تم توزيع المدفوعة',
          description: `تم توزيع المبلغ على ${result.allocations.length} حساب`,
        });
        
        auditTrailSystem.logPaymentAction(
          'allocated',
          paymentData.id,
          'current-user-id',
          companyId,
          undefined,
          { allocations: result.allocations.length }
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ['professional-payment-stats', companyId] });
    },
    onError: (error) => {
      logger.error('Payment allocation failed', error);
      toast({
        title: 'خطأ في التوزيع',
        description: 'حدث خطأ أثناء توزيع المدفوعة',
        variant: 'destructive'
      });
    }
  });

  // Journal entry creation mutation
  const journalEntryMutation = useMutation({
    mutationFn: async (entryData: JournalEntryData) => {
      logger.debug('Creating journal entry', { entryNumber: entryData.entryNumber });
      return await accountingIntegration.createJournalEntry(entryData, companyId);
    },
    onSuccess: (result, entryData) => {
      if (result.success) {
        toast({
          title: 'تم إنشاء القيد المحاسبي',
          description: `القيد رقم: ${result.journalEntryNumber}`,
        });
        
        if (result.journalEntryId) {
          auditTrailSystem.logJournalEntryAction(
            'created',
            result.journalEntryId,
            'current-user-id',
            companyId,
            undefined,
            { entryNumber: entryData.entryNumber, totalAmount: entryData.totalAmount }
          );
        }
      } else {
        toast({
          title: 'فشل في إنشاء القيد',
          description: result.validationErrors?.join(', ') || 'خطأ غير معروف',
          variant: 'destructive'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['journal-entries', companyId] });
    },
    onError: (error) => {
      logger.error('Journal entry creation failed', error);
      toast({
        title: 'خطأ في القيد المحاسبي',
        description: 'حدث خطأ أثناء إنشاء القيد المحاسبي',
        variant: 'destructive'
      });
    }
  });

  // Process payment with full professional features
  const processPayment = useCallback(async (paymentId: string, options: {
    enableSmartLinking?: boolean;
    enableAllocation?: boolean;
    enableJournalEntry?: boolean;
  } = {}) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      logger.debug('Starting comprehensive payment processing', { paymentId, options });
      
      // Step 1: Get payment data safely (avoid RLS issues)
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          amount,
          customer_id,
          contract_id,
          payment_method,
          payment_date,
          reference_number,
          company_id,
          payment_status
        `)
        .eq('id', paymentId)
        .maybeSingle();

      if (paymentError || !payment) {
        logger.error('Payment not found', { paymentError, paymentId });
        throw new Error('لم يتم العثور على المدفوعة أو ليس لديك صلاحية للوصول إليها');
      }

      logger.debug('Payment data retrieved successfully', { payment });

      const results = {
        linking: { success: false, error: null as string | null },
        allocation: { success: false, error: null as string | null },
        journalEntry: { success: false, error: null as string | null },
        partialSuccess: false
      };

      let successCount = 0;
      let totalOperations = 0;

      // تحديث حالة المعالجة إلى 'processing'
      await supabase
        .from('payments')
        .update({ 
          processing_status: 'processing',
          processing_notes: 'بدء المعالجة الاحترافية'
        })
        .eq('id', paymentId);

      // Step 2: Smart linking (independent operation)
      if (options.enableSmartLinking) {
        totalOperations++;
        try {
          logger.debug('Starting smart linking process');
          
          const linkingResult = await smartPaymentLinker.findBestContract(payment);
          
          if (linkingResult.success) {
            results.linking = { success: true, error: null };
            successCount++;
            logger.debug('Smart linking completed successfully', { confidence: linkingResult.confidence });
          } else {
            results.linking = { success: false, error: 'لم يتم العثور على عقود مناسبة للربط' };
            logger.warn('Smart linking failed - no suitable contracts found');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'خطأ في الربط الذكي';
          results.linking = { success: false, error: errorMsg };
          logger.error('Smart linking exception', { error, paymentId });
        }
      }

      // Step 3: Payment allocation (independent operation)
      if (options.enableAllocation) {
        totalOperations++;
        try {
          logger.debug('Starting payment allocation');
          
          const allocationResult = await paymentAllocationEngine.allocatePayment({
            id: payment.id,
            amount: payment.amount,
            customerId: payment.customer_id,
            contractId: payment.contract_id,
            paymentMethod: payment.payment_method,
            companyId: payment.company_id
          });

          if (allocationResult.success && allocationResult.allocations.length > 0) {
            results.allocation = { success: true, error: null };
            successCount++;
            logger.debug('Payment allocation completed successfully', { allocations: allocationResult.allocations.length });
            
            // Step 4: Journal entry (depends on allocation)
            if (options.enableJournalEntry && allocationResult.journalEntryPreview) {
              totalOperations++;
              try {
                logger.debug('Creating journal entry from allocation preview');
                
                const journalResult = await accountingIntegration.createJournalEntry(
                  allocationResult.journalEntryPreview as JournalEntryData,
                  companyId
                );

                if (journalResult.success) {
                  results.journalEntry = { success: true, error: null };
                  successCount++;
                  logger.debug('Journal entry created successfully', { journalEntryId: journalResult.journalEntryId });
                } else {
                  const errorMsg = journalResult.validationErrors?.join(', ') || 'فشل في إنشاء القيد المحاسبي';
                  results.journalEntry = { success: false, error: errorMsg };
                  logger.warn('Journal entry creation failed', { errors: journalResult.validationErrors });
                }
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'خطأ في إنشاء القيد المحاسبي';
                results.journalEntry = { success: false, error: errorMsg };
                logger.error('Journal entry creation exception', { error, paymentId });
              }
            }
          } else {
            const errorMsg = allocationResult.errors?.join(', ') || 'فشل في توزيع المدفوعة';
            results.allocation = { success: false, error: errorMsg };
            logger.warn('Payment allocation failed', { errors: allocationResult.errors });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'خطأ في توزيع المدفوعة';
          results.allocation = { success: false, error: errorMsg };
          logger.error('Payment allocation exception', { error, paymentId });
        }
      } else if (options.enableJournalEntry) {
        // Handle journal entry without allocation (direct journal creation)
        totalOperations++;
        try {
          logger.debug('Creating direct journal entry (without allocation)');
          
          // Create a simple journal entry for the payment
          const directJournalData: JournalEntryData = {
            entryNumber: `PAY-${payment.payment_number}-${Date.now()}`,
            entryDate: payment.payment_date,
            description: `دفعة رقم ${payment.payment_number}`,
            totalAmount: payment.amount,
            sourceType: 'payment',
            sourceId: payment.id,
            lines: [
              {
                accountId: 'default-cash-account', // This should be replaced with actual account lookup
                description: `استلام دفعة - ${payment.payment_number}`,
                debitAmount: payment.amount,
                creditAmount: 0
              },
              {
                accountId: 'default-revenue-account', // This should be replaced with actual account lookup
                description: `إيراد دفعة - ${payment.payment_number}`,
                debitAmount: 0,
                creditAmount: payment.amount
              }
            ]
          };

          const journalResult = await accountingIntegration.createJournalEntry(directJournalData, companyId);

          if (journalResult.success) {
            results.journalEntry = { success: true, error: null };
            successCount++;
            logger.debug('Direct journal entry created successfully', { journalEntryId: journalResult.journalEntryId });
          } else {
            const errorMsg = journalResult.validationErrors?.join(', ') || 'فشل في إنشاء القيد المحاسبي المباشر';
            results.journalEntry = { success: false, error: errorMsg };
            logger.warn('Direct journal entry creation failed', { errors: journalResult.validationErrors });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'خطأ في إنشاء القيد المحاسبي المباشر';
          results.journalEntry = { success: false, error: errorMsg };
          logger.error('Direct journal entry creation exception', { error, paymentId });
        }
      }

      // Determine overall success
      results.partialSuccess = successCount > 0;
      const isFullSuccess = successCount === totalOperations && totalOperations > 0;

      // Show appropriate message
      if (isFullSuccess) {
        toast({
          title: 'تم معالجة المدفوعة بنجاح',
          description: `تم تطبيق جميع العمليات المحددة (${successCount}/${totalOperations}) على المدفوعة`,
        });
        
        // Log successful processing
        auditTrailSystem.logPaymentAction(
          'linked',
          paymentId,
          'current-user-id',
          companyId,
          undefined,
          { operations: totalOperations, successCount }
        );
      } else if (results.partialSuccess) {
        const errorDetails = [];
        if (results.linking.error) errorDetails.push(`الربط: ${results.linking.error}`);
        if (results.allocation.error) errorDetails.push(`التوزيع: ${results.allocation.error}`);
        if (results.journalEntry.error) errorDetails.push(`القيد: ${results.journalEntry.error}`);
        
        toast({
          title: 'معالجة جزئية للمدفوعة',
          description: `نجحت ${successCount} من ${totalOperations} عمليات. ${errorDetails.length > 0 ? 'أخطاء: ' + errorDetails.join(', ') : ''}`,
          variant: 'default'
        });
        
        logger.warn('Partial payment processing success', { successCount, totalOperations, results });
      } else {
        toast({
          title: 'فشل في معالجة المدفوعة',
          description: `فشلت جميع العمليات. يرجى التحقق من البيانات والمحاولة مرة أخرى.`,
          variant: 'destructive'
        });
        
        logger.error('Complete payment processing failure', { results, paymentId });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pending-payments', companyId] });
      queryClient.invalidateQueries({ queryKey: ['professional-payment-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['active-contracts'] });

      return results;
    } catch (error) {
      logger.error('Payment processing critical failure', { error, paymentId });
      toast({
        title: 'خطأ حرج في معالجة المدفوعة',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء معالجة المدفوعة',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, companyId, toast, queryClient]);

  // Link all payments function
  const linkAllPayments = useCallback(async () => {
    if (isLinkingAll) return { success: false, error: 'جاري الربط حالياً' };
    
    setIsLinkingAll(true);
    
    try {
      logger.debug('Starting bulk linking process for all payments', { companyId });
      
      // Get all pending payments (completed but not linked)
      const { data: unlinkedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          amount,
          customer_id,
          reference_number,
          payment_date,
          payment_method,
          company_id
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .is('contract_id', null)
        .limit(100);

      if (paymentsError) {
        throw new Error('فشل في جلب المدفوعات غير المربوطة');
      }

      if (!unlinkedPayments?.length) {
        return { success: true, linkedCount: 0, totalProcessed: 0, error: null };
      }

      let linkedCount = 0;
      let processedCount = 0;
      const errors: string[] = [];

      // Process each payment
      for (const payment of unlinkedPayments) {
        try {
          processedCount++;
          
          const result = await smartPaymentLinker.findBestContract(payment);
          
          if (result.success && result.suggested_contract_id) {
            // Update payment with the suggested contract
            await supabase
              .from('payments')
              .update({
                contract_id: result.suggested_contract_id,
                linking_confidence: result.confidence,
                linking_method: 'bulk_auto'
              })
              .eq('id', payment.id);
              
            linkedCount++;
            logger.debug('Payment linked successfully in bulk process', { 
              paymentId: payment.id, 
              confidence: result.confidence 
            });
          } else {
            logger.debug('Payment could not be linked in bulk process', { 
              paymentId: payment.id,
              reason: 'No suitable contracts found'
            });
          }
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
          errors.push(`دفعة ${payment.payment_number}: ${errorMsg}`);
          logger.warn('Payment linking failed in bulk process', { 
            paymentId: payment.id, 
            error: errorMsg 
          });
        }
      }

      // Log audit trail for bulk operation
      auditTrailSystem.logPaymentAction(
        'linked',
        'bulk-operation',
        'current-user-id',
        companyId,
        undefined,
        { 
          totalProcessed: processedCount,
          linkedCount,
          errorsCount: errors.length,
          operationType: 'bulk_linking'
        }
      );

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['pending-payments', companyId] });
      queryClient.invalidateQueries({ queryKey: ['professional-payment-stats', companyId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['active-contracts'] });

      logger.debug('Bulk linking process completed', { 
        processedCount, 
        linkedCount, 
        errorsCount: errors.length 
      });

      return {
        success: true,
        linkedCount,
        totalProcessed: processedCount,
        errors: errors.length > 0 ? errors : null
      };
      
    } catch (error) {
      logger.error('Bulk linking process failed', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الربط الجماعي';
      
      return {
        success: false,
        linkedCount: 0,
        totalProcessed: 0,
        error: errorMessage
      };
    } finally {
      setIsLinkingAll(false);
    }
  }, [isLinkingAll, companyId, queryClient, toast]);

  return {
    // Data
    stats,
    pendingPayments,
    
    // Loading states
    statsLoading,
    pendingLoading,
    isProcessing,
    isLinkingAll,
    
    // Actions
    processPayment,
    performSmartLinking: smartLinkingMutation.mutate,
    allocatePayment: allocationMutation.mutate,
    createJournalEntry: journalEntryMutation.mutate,
    linkAllPayments,
    
    // Mutation states
    isLinking: smartLinkingMutation.isPending,
    isAllocating: allocationMutation.isPending,
    isCreatingJournal: journalEntryMutation.isPending,
  };
};