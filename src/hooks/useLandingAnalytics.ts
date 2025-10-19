import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { exportAnalyticsToCSV } from '@/utils/exportHelpers';

interface LandingAnalyticsParams {
  companyId?: string;
  dateRange: { from: Date; to: Date };
}

interface AnalyticsRecord {
  id?: string;
  created_at?: string;
  page_path?: string;
  page_title?: string;
  visitor_id?: string;
  device_type?: string;
  traffic_source?: string;
  views?: number;
  time_on_page?: number;
  bounced?: boolean;
  converted?: boolean;
  [key: string]: unknown;
}

export const useLandingAnalytics = ({ companyId, dateRange }: LandingAnalyticsParams) => {
  const [analytics, setAnalytics] = useState<AnalyticsRecord[]>([]);
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

  const exportAnalytics = async ({ companyId, dateRange }: LandingAnalyticsParams) => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `landing-analytics-${companyId || 'all'}-${timestamp}`;

      if (analytics && analytics.length > 0) {
        exportAnalyticsToCSV(analytics, filename);
      } else {
        // If no data in current state, fetch fresh data for export
        const { data, error } = await supabase
          .from('landing_analytics')
          .select('*')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          exportAnalyticsToCSV(data, filename);
        } else {
          throw new Error('No analytics data available to export');
        }
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, exportAnalytics };
};