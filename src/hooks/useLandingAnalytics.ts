import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingAnalytics = ({ companyId, dateRange }: any) => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
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
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async ({ companyId, dateRange }: any) => {
    // Mock export functionality
    console.log('Exporting analytics for:', { companyId, dateRange });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [companyId, dateRange]);

  return { analytics, loading, exportAnalytics };
};