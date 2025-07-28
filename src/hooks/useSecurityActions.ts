import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export const useSecurityActions = () => {
  const { companyId, hasGlobalAccess } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const refreshCacheMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company access');
      
      const { data, error } = await supabase.functions.invoke('refresh-stats-cache', {
        body: { company_id: companyId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-monitor'] });
      toast.success('تم تحديث الذاكرة المؤقتة بنجاح');
    },
    onError: (error) => {
      console.error('Error refreshing cache:', error);
      toast.error('خطأ في تحديث الذاكرة المؤقتة');
    }
  });

  const runSecurityScanMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company access');
      
      // Simulate security scan by checking for suspicious activities
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('severity', 'warning')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      return {
        suspicious_activities: data?.length || 0,
        scan_time: new Date().toISOString()
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-monitor'] });
      toast.success(`تم إجراء الفحص الأمني - تم العثور على ${data.suspicious_activities} أنشطة مشبوهة`);
    },
    onError: (error) => {
      console.error('Error running security scan:', error);
      toast.error('خطأ في إجراء الفحص الأمني');
    }
  });

  const cleanupDataMutation = useMutation({
    mutationFn: async (options: { archiveOldData?: boolean; removeOrphaned?: boolean }) => {
      if (!hasGlobalAccess) {
        throw new Error('Insufficient permissions for data cleanup');
      }
      
      const results = [];
      
      if (options.archiveOldData) {
        // Archive old contracts (older than 2 years and completed)
        const { data: archivedContracts, error: archiveError } = await supabase
          .from('contracts')
          .update({ status: 'archived' })
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .lt('end_date', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
          .select('id');
        
        if (archiveError) throw archiveError;
        results.push(`تم أرشفة ${archivedContracts?.length || 0} عقد قديم`);
      }
      
      if (options.removeOrphaned) {
        // Remove orphaned customer notes (customers that don't exist)
        const { data: orphanedNotes, error: orphanError } = await supabase
          .from('customer_notes')
          .delete()
          .not('customer_id', 'in', 
            `(SELECT id FROM customers WHERE company_id = '${companyId}')`
          )
          .eq('company_id', companyId)
          .select('id');
        
        if (orphanError) throw orphanError;
        results.push(`تم حذف ${orphanedNotes?.length || 0} ملاحظة معزولة`);
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['performance-monitor'] });
      results.forEach(result => toast.success(result));
    },
    onError: (error) => {
      console.error('Error during data cleanup:', error);
      toast.error('خطأ في تنظيف البيانات');
    }
  });

  const optimizePerformanceMutation = useMutation({
    mutationFn: async () => {
      if (!hasGlobalAccess) {
        throw new Error('Insufficient permissions for performance optimization');
      }
      
      // Clear old cache entries
      const oldCacheKeys = queryClient.getQueryCache().getAll()
        .filter(query => {
          const state = query.state;
          return state.dataUpdatedAt < Date.now() - 10 * 60 * 1000; // 10 minutes old
        });
      
      oldCacheKeys.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
      
      // Prefetch commonly used data
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['cost-centers', companyId],
          staleTime: 10 * 60 * 1000
        }),
        queryClient.prefetchQuery({
          queryKey: ['customers', companyId],
          staleTime: 5 * 60 * 1000
        })
      ]);
      
      return {
        clearedQueries: oldCacheKeys.length,
        optimizationTime: new Date().toISOString()
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-monitor'] });
      toast.success(`تم تحسين الأداء - تم مسح ${data.clearedQueries} استعلام قديم`);
    },
    onError: (error) => {
      console.error('Error optimizing performance:', error);
      toast.error('خطأ في تحسين الأداء');
    }
  });

  return {
    refreshCache: refreshCacheMutation.mutate,
    runSecurityScan: runSecurityScanMutation.mutate,
    cleanupData: cleanupDataMutation.mutate,
    optimizePerformance: optimizePerformanceMutation.mutate,
    
    isRefreshingCache: refreshCacheMutation.isPending,
    isRunningScan: runSecurityScanMutation.isPending,
    isCleaningData: cleanupDataMutation.isPending,
    isOptimizing: optimizePerformanceMutation.isPending,
    
    // Combined loading state
    isPerformingActions: 
      refreshCacheMutation.isPending || 
      runSecurityScanMutation.isPending || 
      cleanupDataMutation.isPending || 
      optimizePerformanceMutation.isPending
  };
};