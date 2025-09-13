import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface SmartLinkingSuggestion {
  paymentId: string;
  contractId?: string;
  customerId?: string;
  contractNumber?: string;
  customerName?: string;
  confidence: number;
  reasons: string[];
  matchType: 'contract_number' | 'amount_date' | 'customer_pattern' | 'notes_analysis';
  suggestedAction: 'auto_link' | 'review_required' | 'manual_link';
}

export interface SmartLinkingResult {
  paymentId: string;
  success: boolean;
  error?: string;
  confidence: number;
  action: 'linked' | 'skipped' | 'failed';
}

// Extract contract numbers from payment notes/descriptions
const extractContractNumbers = (text: string): string[] => {
  if (!text) return [];
  
  const patterns = [
    /LTO\d{4,6}/gi,           // LTO20242, LTO2024123
    /RNT\d{4,6}/gi,           // RNT20242
    /CT\d{4,6}/gi,            // CT20242
    /CONTRACT[_\-\s]*\d{4,6}/gi, // CONTRACT_20242, CONTRACT-20242
    /عقد[_\-\s]*\d{4,6}/gi,    // عقد_20242
    /\d{4,6}[_\-\s]*LTO/gi,   // 20242_LTO
  ];
  
  const matches = new Set<string>();
  patterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      found.forEach(match => matches.add(match.toUpperCase()));
    }
  });
  
  return Array.from(matches);
};

// Analyze payment type from notes
const analyzePaymentType = (notes: string): { type: string; confidence: number } => {
  if (!notes) return { type: 'unknown', confidence: 0 };
  
  const lowerNotes = notes.toLowerCase();
  
  // Security deposit patterns
  if (lowerNotes.includes('تأمين') || lowerNotes.includes('ضمان') || lowerNotes.includes('security') || lowerNotes.includes('deposit')) {
    return { type: 'security_deposit', confidence: 0.9 };
  }
  
  // Monthly rent patterns
  if (lowerNotes.includes('إيجار') || lowerNotes.includes('rent') || lowerNotes.includes('monthly')) {
    return { type: 'monthly_rent', confidence: 0.85 };
  }
  
  // Insurance patterns
  if (lowerNotes.includes('تأمين') || lowerNotes.includes('insurance')) {
    return { type: 'insurance', confidence: 0.8 };
  }
  
  // Fine/penalty patterns
  if (lowerNotes.includes('غرامة') || lowerNotes.includes('penalty') || lowerNotes.includes('fine')) {
    return { type: 'penalty', confidence: 0.8 };
  }
  
  return { type: 'other', confidence: 0.3 };
};

export const useSmartPaymentLinking = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  return useQuery({
    queryKey: ['smart-payment-suggestions', companyId],
    queryFn: async (): Promise<SmartLinkingSuggestion[]> => {
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      // Get unlinked payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .is('customer_id', null)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get all contracts and customers for matching
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          monthly_amount,
          contract_amount,
          start_date,
          end_date,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            national_id,
            phone
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      const suggestions: SmartLinkingSuggestion[] = [];
      setAnalysisProgress({ current: 0, total: payments?.length || 0 });

      for (let i = 0; i < (payments?.length || 0); i++) {
        const payment = payments[i];
        setAnalysisProgress({ current: i + 1, total: payments.length });

        const contractNumbers = extractContractNumbers(payment.notes || '');
        const paymentType = analyzePaymentType(payment.notes || '');
        
        // Method 1: Direct contract number match
        if (contractNumbers.length > 0) {
          for (const contractNumber of contractNumbers) {
            const contract = contracts?.find((c: any) => 
              c.contract_number?.toUpperCase().includes(contractNumber) ||
              contractNumber.includes(c.contract_number?.toUpperCase() || '')
            );
            
            if (contract) {
              suggestions.push({
                paymentId: payment.id,
                contractId: contract.id,
                customerId: contract.customer_id,
                contractNumber: contract.contract_number,
                customerName: contract.customers?.company_name || 
                            `${contract.customers?.first_name || ''} ${contract.customers?.last_name || ''}`.trim(),
                confidence: 0.95,
                reasons: [`تطابق رقم العقد: ${contractNumber}`, `نوع الدفعة: ${paymentType.type}`],
                matchType: 'contract_number',
                suggestedAction: 'auto_link'
              });
              continue;
            }
          }
        }

        // Method 2: Amount and date pattern matching
        if (suggestions.find(s => s.paymentId === payment.id)) continue;

        const paymentDate = new Date(payment.payment_date);
        const possibleContracts = contracts?.filter((contract: any) => {
          const startDate = new Date(contract.start_date);
          const endDate = new Date(contract.end_date);
          
          // Check if payment is within contract period
          if (paymentDate < startDate || paymentDate > endDate) return false;
          
          // Check amount match based on payment type
          if (paymentType.type === 'monthly_rent' && 
              Math.abs(payment.amount - (contract.monthly_amount || 0)) < 50) {
            return true;
          }
          
          if (paymentType.type === 'security_deposit' && 
              Math.abs(payment.amount - (contract.contract_amount || 0)) < 50) {
            return true;
          }
          
          return false;
        });

        if (possibleContracts && possibleContracts.length === 1) {
          const contract = possibleContracts[0];
          suggestions.push({
            paymentId: payment.id,
            contractId: contract.id,
            customerId: contract.customer_id,
            contractNumber: contract.contract_number,
            customerName: contract.customers?.company_name || 
                        `${contract.customers?.first_name || ''} ${contract.customers?.last_name || ''}`.trim(),
            confidence: 0.75 + (paymentType.confidence * 0.2),
            reasons: [
              `تطابق المبلغ مع ${paymentType.type === 'monthly_rent' ? 'الإيجار الشهري' : 'التأمين'}`,
              `التاريخ ضمن فترة العقد`,
              `نوع الدفعة: ${paymentType.type}`
            ],
            matchType: 'amount_date',
            suggestedAction: 'review_required'
          });
        } else if (possibleContracts && possibleContracts.length > 1) {
          // Multiple matches - need manual review
          const bestMatch = possibleContracts[0];
          suggestions.push({
            paymentId: payment.id,
            contractId: bestMatch.id,
            customerId: bestMatch.customer_id,
            contractNumber: bestMatch.contract_number,
            customerName: bestMatch.customers?.company_name || 
                        `${bestMatch.customers?.first_name || ''} ${bestMatch.customers?.last_name || ''}`.trim(),
            confidence: 0.5,
            reasons: [
              `${possibleContracts.length} عقود محتملة`,
              `تطابق المبلغ والتاريخ`,
              `يحتاج مراجعة يدوية`
            ],
            matchType: 'amount_date',
            suggestedAction: 'manual_link'
          });
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAutoLinkPayments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const [linkingProgress, setLinkingProgress] = useState({ current: 0, total: 0 });

  return useMutation({
    mutationFn: async (suggestions: SmartLinkingSuggestion[]): Promise<SmartLinkingResult[]> => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      const autoLinkSuggestions = suggestions.filter(s => 
        s.suggestedAction === 'auto_link' && s.confidence >= 0.8
      );

      setLinkingProgress({ current: 0, total: autoLinkSuggestions.length });
      const results: SmartLinkingResult[] = [];

      for (let i = 0; i < autoLinkSuggestions.length; i++) {
        const suggestion = autoLinkSuggestions[i];
        setLinkingProgress({ current: i + 1, total: autoLinkSuggestions.length });

        try {
          const updateData: any = {
            customer_id: suggestion.customerId,
            contract_id: suggestion.contractId,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', suggestion.paymentId)
            .eq('company_id', companyId);

          if (error) throw error;

          results.push({
            paymentId: suggestion.paymentId,
            success: true,
            confidence: suggestion.confidence,
            action: 'linked'
          });
        } catch (error) {
          results.push({
            paymentId: suggestion.paymentId,
            success: false,
            error: error.message,
            confidence: suggestion.confidence,
            action: 'failed'
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "اكتمل الربط الذكي التلقائي",
        description: `تم ربط ${successCount} دفعة تلقائياً${failCount > 0 ? `، فشل في ${failCount} دفعة` : ''}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-payments'] });
      queryClient.invalidateQueries({ queryKey: ['smart-payment-suggestions'] });
      setLinkingProgress({ current: 0, total: 0 });
    },
    onError: (error) => {
      console.error('Error in auto linking:', error);
      toast({
        title: "خطأ في الربط التلقائي",
        description: error.message,
        variant: "destructive",
      });
      setLinkingProgress({ current: 0, total: 0 });
    },
  });
};

export const useSmartLinkingStats = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['smart-linking-stats', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      // Get total payments
      const { count: totalPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Get linked payments
      const { count: linkedPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('customer_id', 'is', null);

      // Get auto-linked payments (assume payments with contract_id were auto-linked)
      const { count: autoLinkedPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('customer_id', 'is', null)
        .not('contract_id', 'is', null);

      return {
        totalPayments: totalPayments || 0,
        linkedPayments: linkedPayments || 0,
        unlinkedPayments: (totalPayments || 0) - (linkedPayments || 0),
        autoLinkedPayments: autoLinkedPayments || 0,
        linkingPercentage: totalPayments ? Math.round((linkedPayments / totalPayments) * 100) : 0,
        autoLinkingPercentage: linkedPayments ? Math.round((autoLinkedPayments / linkedPayments) * 100) : 0,
      };
    },
    enabled: !!companyId,
  });
};