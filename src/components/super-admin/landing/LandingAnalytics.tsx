import React, { useState } from 'react';
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

export const LandingAnalytics: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });

  const { analytics, loading, exportAnalytics } = useLandingAnalytics({
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

  // Use analytics data from hook, or fallback to defaults if not available
  const metrics = analytics && Array.isArray(analytics) && analytics.length > 0
    ? {
        totalViews: analytics.reduce((sum, item) => sum + (item.views || 0), 0),
        uniqueVisitors: new Set(analytics.map(item => item.visitor_id).filter(Boolean)).size,
        conversionRate: analytics.filter(item => item.converted).length / analytics.length * 100 || 0,
        averageTimeOnPage: calculateAverageTime(analytics),
        bounceRate: analytics.filter(item => item.bounced).length / analytics.length * 100 || 0,
        topPages: getTopPages(analytics),
        deviceBreakdown: getDeviceBreakdown(analytics),
        trafficSources: getTrafficSources(analytics),
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
      };

  function calculateAverageTime(data: any[]): string {
    if (!data.length) return '0:00';
    const avgSeconds = data.reduce((sum, item) => sum + (item.time_on_page || 0), 0) / data.length;
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.floor(avgSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function getTopPages(data: any[]) {
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

  function getDeviceBreakdown(data: any[]) {
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

  function getTrafficSources(data: any[]) {
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
              <span className="text-green-600">+12.5%</span> from last month
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
              <span className="text-green-600">+8.3%</span> from last month
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
              <span className="text-red-600">-0.4%</span> from last month
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
              <span className="text-green-600">+0:12</span> from last month
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
              <span className="text-green-600">-2.1%</span> from last month
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
                <Badge variant="default">47</Badge>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Recent Events</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Page view: /features</span>
                    <span className="text-muted-foreground">2s ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Form submit: Contact</span>
                    <span className="text-muted-foreground">15s ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Button click: Get Started</span>
                    <span className="text-muted-foreground">28s ago</span>
                  </div>
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
                  <th className="text-left p-2">Conversion</th>
                  <th className="text-left p-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Button Click: Get Started</td>
                  <td className="p-2">CTA</td>
                  <td className="p-2">1,247</td>
                  <td className="p-2">8.9%</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-green-600">+5.2%</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Form Submit: Contact</td>
                  <td className="p-2">Lead</td>
                  <td className="p-2">423</td>
                  <td className="p-2">3.0%</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-green-600">+2.1%</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Video Play: Demo</td>
                  <td className="p-2">Engagement</td>
                  <td className="p-2">789</td>
                  <td className="p-2">5.6%</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-red-600">-1.3%</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};