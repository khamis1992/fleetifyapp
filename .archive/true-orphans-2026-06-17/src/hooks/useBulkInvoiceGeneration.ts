import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkInvoiceStats {
  total_payments_without_invoices: number;
  total_amount: number;
  by_contract: Array<{
    contract_id: string;
    contract_number: string;
    customer_name: string;
    payments_count: number;
    total_amount: number;
  }>;
}

interface BulkInvoiceResult {
  success: boolean;
  total_processed: number;
  created: number;
  skipped: number;
  errors: number;
  error_messages: string[];
  processing_time_seconds: number;
  message: string;
  error?: string;
}

export const useBulkInvoiceGeneration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Get statistics about payments without invoices
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['payments-without-invoices-stats'],
    queryFn: async (): Promise<BulkInvoiceStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase.rpc('get_payments_without_invoices_stats', {
        target_company_id: profile.company_id
      });

      if (error) throw error;
      return data as unknown as BulkInvoiceStats;
    },
  });

  // Bulk invoice generation mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: async (): Promise<BulkInvoiceResult> => {
      setIsProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase.rpc('backfill_all_contract_invoices', {
        target_company_id: profile.company_id
      });

      if (error) throw error;
      return data as unknown as BulkInvoiceResult;
    },
    onSuccess: (result) => {
      setIsProcessing(false);
      
      if (result.success) {
        toast.success(result.message, {
          description: `تم إنشاء ${result.created} فاتورة في ${result.processing_time_seconds.toFixed(2)} ثانية`
        });
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        refetchStats();
      } else {
        toast.error('حدث خطأ أثناء إنشاء الفواتير', {
          description: result.error || 'خطأ غير معروف'
        });
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error('فشل في إنشاء الفواتير', {
        description: error.message
      });
    }
  });

  return {
    stats,
    isLoadingStats,
    isProcessing,
    generateBulkInvoices: bulkGenerateMutation.mutate,
    isGenerating: bulkGenerateMutation.isPending,
    refetchStats
  };
};