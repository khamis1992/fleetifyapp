import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
// import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart3, TrendingUp, Users, MousePointer, Eye, Download, FileText } from 'lucide-react';
import { useLandingAnalytics } from '@/hooks/useLandingAnalytics';
import { useCompanies } from '@/hooks/useCompanies';
import { exportAnalyticsSummaryToPDF } from '@/utils/exportHelpers';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface RecentEvent {
  id: string;
  event_type?: string;
  page_path?: string;
  created_at: string;
}

interface EventStats {
  event_type: string;
  count: number;
  conversion_rate: number;
  category: string;
}

export const LandingAnalytics: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);

  const { analytics, previousPeriodAnalytics, loading, exportAnalytics } = useLandingAnalytics({
    companyId: selectedCompany,
    dateRange
  });
  const { data: companies, isLoading: companiesLoading } = useCompanies();

  const handleExportCSV = async () => {
    try {
      await exportAnalytics({ companyId: selectedCompany, dateRange });
    } catch (error) {
      console.error('Failed to export analytics to CSV:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const companyName = companies?.find(c => c.id === selectedCompany)?.name || 'All Companies';
      await exportAnalyticsSummaryToPDF(metrics, companyName, dateRange);
    } catch (error) {
      console.error('Failed to export analytics to PDF:', error);
    }
  };

  // Fetch active users (sessions active in last 5 minutes)
  useEffect(() => {
    const fetchActiveUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { data, error } = await supabase
        .from('landing_analytics')
        .select('visitor_id')
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (!error && data) {
        const uniqueVisitors = new Set(data.map(item => item.visitor_id).filter(Boolean));
        setActiveUsers(uniqueVisitors.size);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch recent events
  useEffect(() => {
    const fetchRecentEvents = async () => {
      const { data, error } = await supabase
        .from('landing_analytics')
        .select('id, event_type, page_path, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentEvents(data as RecentEvent[]);
      }
    };

    fetchRecentEvents();
    const interval = setInterval(fetchRecentEvents, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch event statistics grouped by event_type
  useEffect(() => {
    const fetchEventStats = async () => {
      const { data, error } = await supabase
        .from('landing_analytics')
        .select('event_type, converted')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (!error && data) {
        const eventMap = new Map<string, { count: number; conversions: number }>();

        data.forEach(item => {
          const eventType = item.event_type || 'page_view';
          const existing = eventMap.get(eventType) || { count: 0, conversions: 0 };
          existing.count++;
          if (item.converted) existing.conversions++;
          eventMap.set(eventType, existing);
        });

        const stats: EventStats[] = Array.from(eventMap.entries()).map(([event_type, { count, conversions }]) => ({
          event_type,
          count,
          conversion_rate: count > 0 ? (conversions / count) * 100 : 0,
          category: categorizeEvent(event_type)
        }));

        setEventStats(stats);
      }
    };

    fetchEventStats();
  }, [dateRange]);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('landing_analytics_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landing_analytics' }, () => {
        // Refetch recent events and active users when new data arrives
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        supabase
          .from('landing_analytics')
          .select('visitor_id')
          .gte('created_at', fiveMinutesAgo.toISOString())
          .then(({ data }) => {
            if (data) {
              const uniqueVisitors = new Set(data.map(item => item.visitor_id).filter(Boolean));
              setActiveUsers(uniqueVisitors.size);
            }
          });

        supabase
          .from('landing_analytics')
          .select('id, event_type, page_path, created_at')
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => {
            if (data) setRecentEvents(data as RecentEvent[]);
          });
      })
      .subscribe();

    return () => {
      // Properly unsubscribe before removing channel
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper function to categorize events
  const categorizeEvent = (eventType: string): string => {
    if (eventType.includes('button') || eventType.includes('click')) return 'CTA';
    if (eventType.includes('form') || eventType.includes('submit')) return 'Lead';
    if (eventType.includes('video') || eventType.includes('play')) return 'Engagement';
    return 'Other';
  };

  // Helper function to calculate trend percentage
  const calculateTrend = (currentValue: number, previousValue: number): { value: number; isPositive: boolean } => {
    if (previousValue === 0) return { value: 0, isPositive: true };
    const percentChange = ((currentValue - previousValue) / previousValue) * 100;
    return { value: Math.abs(percentChange), isPositive: percentChange >= 0 };
  };

  // Calculate previous period metrics for trend comparison
  const previousMetrics = previousPeriodAnalytics && Array.isArray(previousPeriodAnalytics) && previousPeriodAnalytics.length > 0
    ? {
        totalViews: previousPeriodAnalytics.reduce((sum, item) => sum + (item.views || 0), 0),
        uniqueVisitors: new Set(previousPeriodAnalytics.map(item => item.visitor_id).filter(Boolean)).size,
        conversionRate: previousPeriodAnalytics.filter(item => item.converted).length / previousPeriodAnalytics.length * 100 || 0,
        bounceRate: previousPeriodAnalytics.filter(item => item.bounced).length / previousPeriodAnalytics.length * 100 || 0,
        averageTimeSeconds: previousPeriodAnalytics.reduce((sum, item) => sum + (item.time_on_page || 0), 0) / previousPeriodAnalytics.length
      }
    : { totalViews: 0, uniqueVisitors: 0, conversionRate: 0, bounceRate: 0, averageTimeSeconds: 0 };

  // Core metrics calculated from live analytics data
  // Source: landing_analytics table via useLandingAnalytics hook
  const currentTotalViews = analytics && Array.isArray(analytics) && analytics.length > 0
    ? analytics.reduce((sum, item) => sum + (item.views || 0), 0)
    : 0;
  const currentUniqueVisitors = analytics && Array.isArray(analytics) && analytics.length > 0
    ? new Set(analytics.map(item => item.visitor_id).filter(Boolean)).size
    : 0;
  const currentConversionRate = analytics && Array.isArray(analytics) && analytics.length > 0
    ? analytics.filter(item => item.converted).length / analytics.length * 100
    : 0;
  const currentBounceRate = analytics && Array.isArray(analytics) && analytics.length > 0
    ? analytics.filter(item => item.bounced).length / analytics.length * 100
    : 0;
  const currentTimeSeconds = analytics && Array.isArray(analytics) && analytics.length > 0
    ? analytics.reduce((sum, item) => sum + (item.time_on_page || 0), 0) / analytics.length
    : 0;

  // Calculate trends
  const viewsTrend = calculateTrend(currentTotalViews, previousMetrics.totalViews);
  const visitorsTrend = calculateTrend(currentUniqueVisitors, previousMetrics.uniqueVisitors);
  const conversionTrend = calculateTrend(currentConversionRate, previousMetrics.conversionRate);
  const bounceTrend = calculateTrend(currentBounceRate, previousMetrics.bounceRate);
  const timeTrend = {
    value: Math.abs(currentTimeSeconds - previousMetrics.averageTimeSeconds),
    isPositive: currentTimeSeconds >= previousMetrics.averageTimeSeconds
  };

  const metrics = analytics && Array.isArray(analytics) && analytics.length > 0
    ? {
        totalViews: currentTotalViews,
        uniqueVisitors: currentUniqueVisitors,
        conversionRate: currentConversionRate,
        averageTimeOnPage: calculateAverageTime(analytics),
        bounceRate: currentBounceRate,
        topPages: getTopPages(analytics),
        deviceBreakdown: getDeviceBreakdown(analytics),
        trafficSources: getTrafficSources(analytics),
        trends: {
          views: viewsTrend,
          visitors: visitorsTrend,
          conversion: conversionTrend,
          bounce: bounceTrend,
          time: timeTrend
        }
      }
    : {
        // Default fallback data when no analytics available
        totalViews: 0,
        uniqueVisitors: 0,
        conversionRate: 0,
        averageTimeOnPage: '0:00',
        bounceRate: 0,
        topPages: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        trafficSources: { direct: 0, organic: 0, social: 0, referral: 0, email: 0 },
        trends: {
          views: { value: 0, isPositive: true },
          visitors: { value: 0, isPositive: true },
          conversion: { value: 0, isPositive: true },
          bounce: { value: 0, isPositive: true },
          time: { value: 0, isPositive: true }
        }
      };

  function calculateAverageTime(data: unknown[]): string {
    if (!data.length) return '0:00';
    const avgSeconds = data.reduce((sum, item) => sum + (item.time_on_page || 0), 0) / data.length;
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.floor(avgSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function getTopPages(data: unknown[]) {
    const pageCounts: Record<string, {path: string; title: string; views: number}> = {};
    data.forEach(item => {
      if (item.page_path) {
        if (!pageCounts[item.page_path]) {
          pageCounts[item.page_path] = { path: item.page_path, title: item.page_title || item.page_path, views: 0 };
        }
        pageCounts[item.page_path].views++;
      }
    });
    return Object.values(pageCounts).sort((a, b) => b.views - a.views).slice(0, 3);
  }

  function getDeviceBreakdown(data: unknown[]) {
    if (!data.length) return { desktop: 0, mobile: 0, tablet: 0 };
    const counts = { desktop: 0, mobile: 0, tablet: 0 };
    data.forEach(item => {
      const device = item.device_type?.toLowerCase() || 'desktop';
      if (device in counts) counts[device as keyof typeof counts]++;
    });
    const total = data.length;
    return {
      desktop: (counts.desktop / total * 100) || 0,
      mobile: (counts.mobile / total * 100) || 0,
      tablet: (counts.tablet / total * 100) || 0,
    };
  }

  function getTrafficSources(data: unknown[]) {
    if (!data.length) return { direct: 0, organic: 0, social: 0, referral: 0, email: 0 };
    const counts = { direct: 0, organic: 0, social: 0, referral: 0, email: 0 };
    data.forEach(item => {
      const source = item.traffic_source?.toLowerCase() || 'direct';
      if (source in counts) counts[source as keyof typeof counts]++;
    });
    const total = data.length;
    return {
      direct: (counts.direct / total * 100) || 0,
      organic: (counts.organic / total * 100) || 0,
      social: (counts.social / total * 100) || 0,
      referral: (counts.referral / total * 100) || 0,
      email: (counts.email / total * 100) || 0,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companiesLoading ? (
                <SelectItem value="" disabled>Loading companies...</SelectItem>
              ) : (
                companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name_ar || company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            Date Range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileText className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={metrics.trends.views.isPositive ? "text-green-600" : "text-red-600"}>
                {metrics.trends.views.isPositive ? '+' : '-'}{metrics.trends.views.value.toFixed(1)}%
              </span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.uniqueVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={metrics.trends.visitors.isPositive ? "text-green-600" : "text-red-600"}>
                {metrics.trends.visitors.isPositive ? '+' : '-'}{metrics.trends.visitors.value.toFixed(1)}%
              </span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <span className={metrics.trends.conversion.isPositive ? "text-green-600" : "text-red-600"}>
                {metrics.trends.conversion.isPositive ? '+' : '-'}{metrics.trends.conversion.value.toFixed(1)}%
              </span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.averageTimeOnPage}</div>
            <p className="text-xs text-muted-foreground">
              <span className={metrics.trends.time.isPositive ? "text-green-600" : "text-red-600"}>
                {metrics.trends.time.isPositive ? '+' : '-'}{Math.floor(metrics.trends.time.value / 60)}:{Math.floor(metrics.trends.time.value % 60).toString().padStart(2, '0')}
              </span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.bounceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <span className={!metrics.trends.bounce.isPositive ? "text-green-600" : "text-red-600"}>
                {metrics.trends.bounce.isPositive ? '+' : '-'}{metrics.trends.bounce.value.toFixed(1)}%
              </span> from previous period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No page data available</p>
              ) : (
                metrics.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{page.title}</p>
                    <p className="text-sm text-muted-foreground">{page.path}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{page.views.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">views</p>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.deviceBreakdown).map(([device, percentage]) => (
                <div key={device} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="capitalize">{device}</span>
                    <span>{typeof percentage === 'number' ? percentage.toFixed(1) : percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${typeof percentage === 'number' ? percentage : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.trafficSources).map(([source, percentage]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {source}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{typeof percentage === 'number' ? percentage.toFixed(1) : percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Active users now</span>
                <Badge variant="default">{activeUsers}</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recent Events</h4>
                <div className="space-y-2 text-sm">
                  {recentEvents.length > 0 ? (
                    recentEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex justify-between">
                        <span>{event.event_type || 'Page view'}: {event.page_path || 'Unknown'}</span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No recent events</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Event Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Count</th>
                  <th className="text-left p-2">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {eventStats.length > 0 ? (
                  eventStats.map((stat) => (
                    <tr key={stat.event_type} className="border-b">
                      <td className="p-2">{stat.event_type}</td>
                      <td className="p-2">{stat.category}</td>
                      <td className="p-2">{stat.count.toLocaleString()}</td>
                      <td className="p-2">{stat.conversion_rate.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No event data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};