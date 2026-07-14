import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { exportAnalyticsToCSV } from '@/utils/exportHelpers';
import type { Database, Json } from '@/integrations/supabase/types';

interface LandingAnalyticsParams {
  companyId?: string;
  dateRange: { from: Date; to: Date };
}

type AnalyticsRow = Database['public']['Tables']['landing_analytics']['Row'];

export interface LandingAnalyticsRecord extends AnalyticsRow {
  page_title: string | null;
  traffic_source: string | null;
  views: number;
  time_on_page: number;
  bounced: boolean;
  converted: boolean;
}

const asEventData = (value: Json | null): Record<string, Json | undefined> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

const getNumber = (value: Json | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getBoolean = (value: Json | undefined): boolean =>
  value === true || value === 1 || value === 'true';

const getString = (value: Json | undefined): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const normalizeAnalyticsRecord = (row: AnalyticsRow): LandingAnalyticsRecord => {
  const eventData = asEventData(row.event_data);

  return {
    ...row,
    page_title: getString(eventData.page_title),
    traffic_source: getString(eventData.traffic_source),
    views: eventData.views === undefined
      ? (row.event_type === 'page_view' ? 1 : 0)
      : getNumber(eventData.views),
    time_on_page: getNumber(eventData.time_on_page),
    bounced: getBoolean(eventData.bounced),
    converted: getBoolean(eventData.converted),
  };
};

export const useLandingAnalytics = ({ companyId, dateRange }: LandingAnalyticsParams) => {
  const [analytics, setAnalytics] = useState<LandingAnalyticsRecord[]>([]);
  const [previousPeriodAnalytics, setPreviousPeriodAnalytics] = useState<LandingAnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch current period data
      let currentQuery = supabase
        .from('landing_analytics')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (companyId && companyId !== 'all') currentQuery = currentQuery.eq('company_id', companyId);
      const { data, error } = await currentQuery;

      if (error) throw error;
      setAnalytics((data || []).map(normalizeAnalyticsRecord));

      // Calculate previous period date range (same duration)
      const periodDuration = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - periodDuration);
      const previousTo = new Date(dateRange.from.getTime() - 1); // End 1ms before current period starts

      // Fetch previous period data for trend calculations
      let previousQuery = supabase
        .from('landing_analytics')
        .select('*')
        .gte('created_at', previousFrom.toISOString())
        .lte('created_at', previousTo.toISOString());

      if (companyId && companyId !== 'all') previousQuery = previousQuery.eq('company_id', companyId);
      const { data: previousData, error: previousError } = await previousQuery;

      if (previousError) {
        console.warn('Error fetching previous period analytics:', previousError);
      } else {
        setPreviousPeriodAnalytics((previousData || []).map(normalizeAnalyticsRecord));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching analytics:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange]);

  const exportAnalytics = async ({ companyId, dateRange }: LandingAnalyticsParams) => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `landing-analytics-${companyId || 'all'}-${timestamp}`;

      if (analytics && analytics.length > 0) {
        exportAnalyticsToCSV(analytics, filename);
      } else {
        // If no data in current state, fetch fresh data for export
        let exportQuery = supabase
          .from('landing_analytics')
          .select('*')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .order('created_at', { ascending: false });

        if (companyId && companyId !== 'all') exportQuery = exportQuery.eq('company_id', companyId);
        const { data, error } = await exportQuery;

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

  return { analytics, previousPeriodAnalytics, loading, exportAnalytics };
};
