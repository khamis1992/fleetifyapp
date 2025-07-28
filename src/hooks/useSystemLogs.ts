import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyScope } from '@/hooks/useCompanyScope';

export interface SystemLog {
  id: string;
  company_id: string;
  user_id?: string;
  level: string;
  category: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  message: string;
  metadata?: any;
  created_at: string;
  duration_ms?: number;
  ip_address?: string;
  user_agent?: string;
  user_profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export const useSystemLogs = (filters?: {
  level?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}) => {
  const { user } = useAuth();
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['system-logs', companyId, filters],
    queryFn: async (): Promise<SystemLog[]> => {
      if (!user || !companyId) {
        return [];
      }

      let query = supabase
        .from('system_logs')
        .select(`
          *,
          user_profile:profiles(first_name, last_name, email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply filters
      if (filters?.level && filters.level !== 'all') {
        query = query.eq('level', filters.level);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters?.search) {
        query = query.or(
          `message.ilike.%${filters.search}%,action.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching system logs:', error);
        throw error;
      }

      return (data || []) as SystemLog[];
    },
    enabled: !!(user && companyId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSystemLogStats = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['system-log-stats', companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        return {
          total: 0,
          today: 0,
          errors: 0,
          warnings: 0,
          byCategory: {},
          recentActivity: []
        };
      }

      const today = new Date().toISOString().split('T')[0];

      // Get total count
      const { count: total } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Get today's count
      const { count: todayCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', today);

      // Get error count
      const { count: errorCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('level', 'error');

      // Get warning count
      const { count: warningCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('level', 'warning');

      // Get category breakdown
      const { data: categoryData } = await supabase
        .from('system_logs')
        .select('category')
        .eq('company_id', companyId);

      const byCategory = categoryData?.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get recent activity (last 10 logs)
      const { data: recentActivity } = await supabase
        .from('system_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total: total || 0,
        today: todayCount || 0,
        errors: errorCount || 0,
        warnings: warningCount || 0,
        byCategory,
        recentActivity: recentActivity || []
      };
    },
    enabled: !!(user && companyId),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};