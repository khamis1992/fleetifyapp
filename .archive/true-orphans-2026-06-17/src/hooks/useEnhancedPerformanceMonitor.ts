import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

interface PerformanceMetrics {
  queryExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
  totalQueries: number;
  slowQueries: number;
  memoryUsage: number;
  lastOptimizationRun: string;
}

interface SecurityMetrics {
  suspiciousAccessAttempts: number;
  failedAuthentications: number;
  crossCompanyAccessAttempts: number;
  lastSecurityScan: string;
}

interface CompanyPerformanceStats {
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  dataIntegrity: {
    orphanedRecords: number;
    inconsistentData: number;
    lastIntegrityCheck: string;
  };
  recommendations: string[];
}

export const usePerformanceMonitor = () => {
  const { companyId, getQueryKey, hasGlobalAccess } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: getQueryKey(['performance-monitor']),
    queryFn: async (): Promise<CompanyPerformanceStats> => {
      if (!companyId) {
        throw new Error("No company access available");
      }
      
      const startTime = performance.now();
      
      // Get performance metrics
      const [
        suspiciousAccessData,
        queryPerformanceData,
        dataIntegrityData
      ] = await Promise.all([
        // Get suspicious access attempts
        supabase
          .from('audit_logs')
          .select('*')
          .eq('company_id', companyId)
          .eq('severity', 'warning')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        
        // Mock query performance data (would be from pg_stat_statements in real implementation)
        Promise.resolve({ count: 0 }),
        
        // Check data integrity - simplified since we don't have this RPC function yet
        Promise.resolve({ orphaned: 0, inconsistent: 0 })
      ]);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Calculate cache metrics
      const cacheQueries = queryClient.getQueryCache().getAll();
      const companyCacheQueries = cacheQueries.filter(query => 
        query.queryKey.includes(companyId)
      );
      const staleCacheQueries = companyCacheQueries.filter(query => query.isStale());
      
      const cacheHitRate = companyCacheQueries.length > 0 
        ? ((companyCacheQueries.length - staleCacheQueries.length) / companyCacheQueries.length) * 100 
        : 0;
      
      // Security metrics
      const suspiciousAccess = suspiciousAccessData.data || [];
      const crossCompanyAttempts = suspiciousAccess.filter((log: any) => {
        const newValues = log.new_values as any;
        return newValues?.suspicious_access === true;
      }).length;
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (executionTime > 1000) {
        recommendations.push('Consider optimizing database queries - response time is above 1 second');
      }
      
      if (cacheHitRate < 70) {
        recommendations.push('Cache hit rate is low - consider increasing cache duration for stable data');
      }
      
      if (crossCompanyAttempts > 0) {
        recommendations.push(`${crossCompanyAttempts} suspicious cross-company access attempts detected`);
      }
      
      if (dataIntegrityData.orphaned > 0) {
        recommendations.push(`${dataIntegrityData.orphaned} orphaned records found - run data cleanup`);
      }
      
      return {
        performance: {
          queryExecutionTime: executionTime,
          cacheHitRate,
          errorRate: 0, // Would be calculated from error logs
          totalQueries: companyCacheQueries.length,
          slowQueries: 0, // Would be from pg_stat_statements
          memoryUsage: (window.performance as any)?.memory?.usedJSHeapSize || 0,
          lastOptimizationRun: new Date().toISOString()
        },
        security: {
          suspiciousAccessAttempts: suspiciousAccess.length,
          failedAuthentications: 0, // Would be from auth logs
          crossCompanyAccessAttempts: crossCompanyAttempts,
          lastSecurityScan: new Date().toISOString()
        },
        dataIntegrity: {
          orphanedRecords: dataIntegrityData.orphaned || 0,
          inconsistentData: dataIntegrityData.inconsistent || 0,
          lastIntegrityCheck: new Date().toISOString()
        },
        recommendations
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: hasGlobalAccess ? 60 * 1000 : 5 * 60 * 1000 // More frequent for admins
  });
};

export const useOptimizationSuggestions = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['optimization-suggestions']),
    queryFn: async () => {
      if (!companyId) return [];
      
      const suggestions = [];
      
      // Check for common optimization opportunities
      const [contractsCount, customersCount, vehiclesCount] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
      ]);
      
      if ((contractsCount.count || 0) > 1000) {
        suggestions.push({
          type: 'performance',
          priority: 'high',
          title: 'Large contracts table detected',
          description: 'Consider implementing pagination and archiving old contracts',
          impact: 'Query performance improvement'
        });
      }
      
      if ((customersCount.count || 0) > 500) {
        suggestions.push({
          type: 'performance',
          priority: 'medium',
          title: 'Customer data optimization',
          description: 'Enable customer search indexing for better performance',
          impact: 'Search performance improvement'
        });
      }
      
      return suggestions;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
};