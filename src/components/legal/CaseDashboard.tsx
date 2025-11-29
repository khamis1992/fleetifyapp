import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useLegalCases, useLegalCaseStats } from '@/hooks/useLegalCases';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

// Helper functions - moved outside component to avoid temporal dead zone issues
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: 'نشطة',
    closed: 'مغلقة',
    suspended: 'معلقة',
    on_hold: 'قيد الانتظار',
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    urgent: 'عاجل',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض',
  };
  return labels[priority] || priority;
};

const statusColors: Record<string, string> = {
  active: '#ef4444',
  closed: '#10b981',
  suspended: '#f59e0b',
  on_hold: '#8b5cf6',
};

const priorityColors: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#10b981',
};

export const CaseDashboard: React.FC = () => {
  const { data: casesResponse, isLoading } = useLegalCases();
  const cases = casesResponse?.data || [];
  const { data: stats } = useLegalCaseStats();

  // Calculate case statistics
  const caseStats = useMemo(() => {
    if (!cases || cases.length === 0) {
      return {
        totalCases: 0,
        activeCases: 0,
        closedCases: 0,
        totalClaimAmount: 0,
        averageTimeToResolution: 0,
        successRate: 0,
        casesByStatus: [],
        casesByPriority: [],
        timeToResolutionData: [],
        priorityBreakdown: [],
      };
    }

    // Calculate totals
    const activeCases = cases.filter((c) => c.case_status === 'active').length;
    const closedCases = cases.filter((c) => c.case_status === 'closed').length;
    const totalClaimAmount = cases.reduce((sum, c) => sum + (c.total_costs || 0), 0);

    // Calculate success rate (won cases / closed cases)
    const wonCases = cases.filter((c) => c.case_status === 'closed' && c.case_outcome === 'won').length;
    const successRate = closedCases > 0 ? (wonCases / closedCases) * 100 : 0;

    // Calculate average time to resolution
    let totalDays = 0;
    let resolvedCount = 0;
    const resolutionDates: { date: string; daysToResolve: number }[] = [];

    cases.forEach((c) => {
      if (c.case_status === 'closed' && c.created_at && c.closed_date) {
        const createdDate = new Date(c.created_at);
        const closedDate = new Date(c.closed_date);
        const daysToResolve = Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += daysToResolve;
        resolvedCount += 1;
        resolutionDates.push({
          date: new Date(c.created_at).toLocaleDateString('ar-KW'),
          daysToResolve,
        });
      }
    });

    const averageTimeToResolution = resolvedCount > 0 ? Math.round(totalDays / resolvedCount) : 0;

    // Cases by status
    const statusCounts: Record<string, number> = {};
    cases.forEach((c) => {
      statusCounts[c.case_status] = (statusCounts[c.case_status] || 0) + 1;
    });

    const casesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: getStatusLabel(status),
      value: count,
      status,
    }));

    // Cases by priority
    const priorityCounts: Record<string, number> = {};
    cases.forEach((c) => {
      priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
    });

    const casesByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      name: getPriorityLabel(priority),
      value: count,
      priority,
    }));

    const priorityBreakdown = Object.entries(priorityCounts).map(([priority, count]) => ({
      name: getPriorityLabel(priority),
      cases: count,
      percentage: ((count / cases.length) * 100).toFixed(1),
    }));

    return {
      totalCases: cases.length,
      activeCases,
      closedCases,
      totalClaimAmount,
      averageTimeToResolution,
      successRate: successRate.toFixed(1),
      casesByStatus,
      casesByPriority,
      timeToResolutionData: resolutionDates.slice(0, 10),
      priorityBreakdown,
    };
  }, [cases]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Total Active Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القضايا النشطة</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseStats.activeCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              من أصل {caseStats.totalCases} قضية
            </p>
          </CardContent>
        </Card>

        {/* Total Claim Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المطالبات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(caseStats.totalClaimAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              قيمة القضايا النشطة
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseStats.successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              من القضايا المغلقة
            </p>
          </CardContent>
        </Card>

        {/* Average Time to Resolution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الوقت</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseStats.averageTimeToResolution}</div>
            <p className="text-xs text-muted-foreground mt-1">
              يوم لتصفية القضية
            </p>
          </CardContent>
        </Card>

        {/* Closed Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القضايا المغلقة</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseStats.closedCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              انتهت هذه الشهر
            </p>
          </CardContent>
        </Card>

        {/* High Priority Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عالية الأولوية</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {caseStats.casesByPriority.find((p) => p.priority === 'urgent' || p.priority === 'high')?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تحتاج متابعة فورية
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cases by Status */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع القضايا حسب الحالة</CardTitle>
            <CardDescription>نسبة القضايا المقسمة حسب الحالة الحالية</CardDescription>
          </CardHeader>
          <CardContent>
            {caseStats.casesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={caseStats.casesByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {caseStats.casesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.status] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات متاحة
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cases by Priority */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع القضايا حسب الأولوية</CardTitle>
            <CardDescription>تصنيف القضايا حسب درجة الأولوية</CardDescription>
          </CardHeader>
          <CardContent>
            {caseStats.casesByPriority.length > 0 ? (
              <div className="space-y-4">
                {caseStats.priorityBreakdown.map((priority, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{priority.name}</span>
                      <Badge variant="outline">{priority.cases} قضية ({priority.percentage}%)</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${priority.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات متاحة
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Case Resolution Timeline */}
      {caseStats.timeToResolutionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>وقت تصفية القضايا</CardTitle>
            <CardDescription>عدد أيام تصفية كل قضية من القضايا المغلقة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={caseStats.timeToResolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="daysToResolve"
                  stroke="#3b82f6"
                  name="أيام التصفية"
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص الإحصائيات</CardTitle>
          <CardDescription>نظرة عامة على أداء القضايا</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">إجمالي القضايا:</span>
                <span className="text-lg font-bold">{caseStats.totalCases}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">القضايا النشطة:</span>
                <span className="text-lg font-bold text-blue-600">{caseStats.activeCases}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">القضايا المغلقة:</span>
                <span className="text-lg font-bold text-green-600">{caseStats.closedCases}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">إجمالي المطالبات:</span>
                <span className="text-lg font-bold">{formatCurrency(caseStats.totalClaimAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">متوسط وقت التصفية:</span>
                <span className="text-lg font-bold">{caseStats.averageTimeToResolution} يوم</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">معدل النجاح:</span>
                <span className="text-lg font-bold text-green-600">{caseStats.successRate}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">نسبة الإغلاق:</span>
                <span className="text-lg font-bold">
                  {caseStats.totalCases > 0
                    ? ((caseStats.closedCases / caseStats.totalCases) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">نسبة النشاط:</span>
                <span className="text-lg font-bold text-orange-600">
                  {caseStats.totalCases > 0
                    ? ((caseStats.activeCases / caseStats.totalCases) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">القضايا قيد الانتظار:</span>
                <span className="text-lg font-bold text-purple-600">
                  {caseStats.casesByStatus.find((s) => s.status === 'on_hold')?.value || 0}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseDashboard;
