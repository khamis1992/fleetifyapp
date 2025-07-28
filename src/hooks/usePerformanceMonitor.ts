import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PerformanceMetrics {
  queryTime: number;
  renderTime: number;
  memoryUsage: number;
  errorRate: number;
  cacheHitRate: number;
  lastOptimized: string;
}

export const usePerformanceMonitor = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['performance-metrics', user?.profile?.company_id],
    queryFn: async (): Promise<PerformanceMetrics> => {
      if (!user?.profile?.company_id) {
        return getDefaultMetrics();
      }

      const startTime = performance.now();
      
      try {
        // For now, just measure query performance directly
        const queryTime = performance.now() - startTime;

        return {
          queryTime,
          renderTime: 0,
          memoryUsage: getMemoryUsage(),
          errorRate: 0,
          cacheHitRate: 0,
          lastOptimized: new Date().toISOString()
        };

      } catch (error) {
        console.error('Error fetching performance metrics:', error);
        return getDefaultMetrics();
      }
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
};

function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
  }
  return 0;
}

function getDefaultMetrics(): PerformanceMetrics {
  return {
    queryTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    errorRate: 0,
    cacheHitRate: 0,
    lastOptimized: new Date().toISOString()
  };
}

// Hook to trigger cache refresh manually
export const useRefreshCache = () => {
  const { user } = useAuth();

  const refreshCache = async () => {
    if (!user?.profile?.company_id) return;

    try {
      const { data, error } = await supabase.functions.invoke('refresh-stats-cache', {
        body: { company_id: user.profile.company_id }
      });

      if (error) {
        console.error('Error refreshing cache:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      throw error;
    }
  };

  return { refreshCache };
};