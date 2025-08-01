import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
// import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart3, TrendingUp, Users, MousePointer, Eye, Download } from 'lucide-react';
import { useLandingAnalytics } from '@/hooks/useLandingAnalytics';

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

  const handleExport = async () => {
    try {
      await exportAnalytics({ companyId: selectedCompany, dateRange });
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const mockMetrics = {
    totalViews: 12547,
    uniqueVisitors: 8932,
    conversionRate: 3.2,
    averageTimeOnPage: '2:34',
    bounceRate: 42.1,
    topPages: [
      { path: '/', views: 8934, title: 'Homepage' },
      { path: '/features', views: 2156, title: 'Features' },
      { path: '/pricing', views: 1457, title: 'Pricing' }
    ],
    deviceBreakdown: {
      desktop: 58.2,
      mobile: 36.8,
      tablet: 5.0
    },
    trafficSources: {
      direct: 34.2,
      organic: 28.9,
      social: 18.3,
      referral: 12.4,
      email: 6.2
    }
  };

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
              {/* TODO: Add company options */}
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            Date Range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </Button>
        </div>
        
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalViews.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{mockMetrics.uniqueVisitors.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{mockMetrics.conversionRate}%</div>
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
            <div className="text-2xl font-bold">{mockMetrics.averageTimeOnPage}</div>
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
            <div className="text-2xl font-bold">{mockMetrics.bounceRate}%</div>
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
              {mockMetrics.topPages.map((page, index) => (
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
              ))}
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
              {Object.entries(mockMetrics.deviceBreakdown).map(([device, percentage]) => (
                <div key={device} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="capitalize">{device}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
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
              {Object.entries(mockMetrics.trafficSources).map(([source, percentage]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {source}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{percentage}%</p>
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