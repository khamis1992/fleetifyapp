import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingAnalytics = ({ companyId, dateRange }: any) => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('landing_analytics')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching analytics:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const exportAnalytics = async ({ companyId, dateRange }: any) => {
    // Export functionality would be implemented here
    if (process.env.NODE_ENV === 'development') {
      console.log('Exporting analytics for:', { companyId, dateRange });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, exportAnalytics };
};