import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { professionalPaymentLinking, type SmartLinkingResult, type LinkingCriteria } from '@/utils/professionalPaymentLinking';
import { paymentAllocationEngine, type AllocationResult } from '@/utils/paymentAllocationEngine';
import { accountingIntegration, type JournalEntryData } from '@/utils/accountingIntegration';
import { auditTrailSystem } from '@/utils/auditTrailSystem';
import { logger } from '@/lib/logger';

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
    mutationFn: async ({ paymentId, criteria }: { paymentId: string; criteria: LinkingCriteria }) => {
      logger.debug('Starting smart linking process', { paymentId });
      return await professionalPaymentLinking.performSmartLinking(paymentId, criteria);
    },
    onSuccess: (result: SmartLinkingResult, { paymentId }) => {
      if (result.success) {
        toast({
          title: 'تم الربط بنجاح',
          description: `تم ربط ${result.linkedContracts.length} عقد بالدفعة`,
        });
        
        // Log audit trail
        auditTrailSystem.logPaymentAction(
          'linked',
          paymentId,
          'current-user-id', // Would get from auth context
          companyId,
          undefined,
          { linkedContracts: result.linkedContracts.length }
        );
      } else {
        toast({
          title: 'فشل في الربط',
          description: 'لم يتم العثور على عقود مناسبة للربط',
          variant: 'destructive'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['pending-payments', companyId] });
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
    customCriteria?: LinkingCriteria;
  } = {}) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Get payment data
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          customers (customer_name),
          contracts (contract_number)
        `)
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        throw new Error('لم يتم العثور على المدفوعة');
      }

      const results = {
        linking: null as SmartLinkingResult | null,
        allocation: null as AllocationResult | null,
        journalEntry: null as any
      };

      // Step 1: Smart linking
      if (options.enableSmartLinking) {
        const linkingCriteria: LinkingCriteria = {
          customerId: payment.customer_id,
          amount: payment.amount,
          referenceNumber: payment.reference_number,
          paymentDate: payment.payment_date,
          ...options.customCriteria
        };

        results.linking = await smartLinkingMutation.mutateAsync({
          paymentId,
          criteria: linkingCriteria
        });
      }

      // Step 2: Payment allocation
      if (options.enableAllocation) {
        results.allocation = await allocationMutation.mutateAsync({
          id: payment.id,
          amount: payment.amount,
          customerId: payment.customer_id,
          contractId: payment.contract_id,
          paymentMethod: payment.payment_method,
          companyId: payment.company_id
        });
      }

      // Step 3: Journal entry
      if (options.enableJournalEntry && results.allocation?.journalEntryPreview) {
        results.journalEntry = await journalEntryMutation.mutateAsync(
          results.allocation.journalEntryPreview as JournalEntryData
        );
      }

      toast({
        title: 'تم معالجة المدفوعة بنجاح',
        description: 'تم تطبيق جميع العمليات المحددة على المدفوعة',
      });

      return results;
    } catch (error) {
      logger.error('Payment processing failed', { error, paymentId });
      toast({
        title: 'خطأ في معالجة المدفوعة',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, smartLinkingMutation, allocationMutation, journalEntryMutation, toast]);

  return {
    // Data
    stats,
    pendingPayments,
    
    // Loading states
    statsLoading,
    pendingLoading,
    isProcessing,
    
    // Actions
    processPayment,
    performSmartLinking: smartLinkingMutation.mutate,
    allocatePayment: allocationMutation.mutate,
    createJournalEntry: journalEntryMutation.mutate,
    
    // Mutation states
    isLinking: smartLinkingMutation.isPending,
    isAllocating: allocationMutation.isPending,
    isCreatingJournal: journalEntryMutation.isPending,
  };
};