import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Settings,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Shield,
  Database,
  Loader2,
} from 'lucide-react';
import {
  useFinancialDashboardStats,
  useEnhancedAgingReport,
  usePaymentAllocationReport,
  useRefreshCustomerBalances,
  useExportAgingReport,
} from '@/hooks/useEnhancedFinancialReports';
import { useActiveAlerts, useRunAlertsCheck } from '@/hooks/useEnhancedSmartAlerts';
import { FinancialObligationsTable } from './FinancialObligationsTable';
import { EnhancedSmartAlertsPanel } from './EnhancedSmartAlertsPanel';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ComprehensiveFinancialDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');

  const { data: dashboardStats, isLoading: statsLoading } = useFinancialDashboardStats();
  const { data: agingReport, isLoading: agingLoading } = useEnhancedAgingReport();
  const { data: allocationReport } = usePaymentAllocationReport();
  const { data: alerts } = useActiveAlerts();
  const refreshBalancesMutation = useRefreshCustomerBalances();
  const runAlertsCheckMutation = useRunAlertsCheck();
  const exportReportMutation = useExportAgingReport();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
    }).format(amount);
  };

  const handleRefreshData = async () => {
    await Promise.all([
      refreshBalancesMutation.mutateAsync(),
      runAlertsCheckMutation.mutateAsync(),
    ]);
  };

  const handleExportReport = async (format: 'csv' | 'excel' = 'csv') => {
    await exportReportMutation.mutateAsync(format);
  };

  // Prepare chart data
  const agingChartData = agingReport?.slice(0, 10).map(item => ({
    name: item.customer_name.length > 20 
      ? item.customer_name.substring(0, 20) + '...' 
      : item.customer_name,
    current: item.current_amount,
    aging_30: item.aging_30_days,
    aging_60: item.aging_60_days,
    aging_90: item.aging_over_90_days,
    total: item.total_balance,
  })) || [];

  const paymentTrendsData = dashboardStats ? [
    {
      name: 'الشهر الماضي',
      collections: dashboardStats.payment_trends.total_collections_last_month,
    },
    {
      name: 'الشهر الحالي',
      collections: dashboardStats.payment_trends.total_collections_this_month,
    },
  ] : [];

  const agingDistributionData = dashboardStats ? [
    { name: 'حالي', value: dashboardStats.aging_analysis.aging_30, color: '#00C49F' },
    { name: '1-30 يوم', value: dashboardStats.aging_analysis.aging_30, color: '#FFBB28' },
    { name: '31-60 يوم', value: dashboardStats.aging_analysis.aging_60, color: '#FF8042' },
    { name: '61-90 يوم', value: dashboardStats.aging_analysis.aging_90, color: '#8884D8' },
    { name: 'أكثر من 90 يوم', value: dashboardStats.aging_analysis.aging_over_90, color: '#FF0000' },
  ].filter(item => item.value > 0) : [];

  if (statsLoading || agingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin ml-2" />
        جاري تحميل لوحة التحكم المالية...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم المالية الشاملة</h1>
          <p className="text-gray-600">
            آخر تحديث: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshBalancesMutation.isPending || runAlertsCheckMutation.isPending}
          >
            {(refreshBalancesMutation.isPending || runAlertsCheckMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث البيانات
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportReport('csv')}
            disabled={exportReportMutation.isPending}
          >
            {exportReportMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستحقات</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(dashboardStats.total_outstanding)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {dashboardStats.customers_with_balance} عميل
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المتأخرات</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(dashboardStats.total_overdue)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((dashboardStats.total_overdue / dashboardStats.total_outstanding) * 100).toFixed(1)}% من الإجمالي
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المقبوضات الشهرية</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardStats.payment_trends.total_collections_this_month)}
                  </p>
                  <div className="flex items-center gap-1 text-sm">
                    {dashboardStats.payment_trends.total_collections_this_month > 
                     dashboardStats.payment_trends.total_collections_last_month ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">زيادة</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">انخفاض</span>
                      </>
                    )}
                  </div>
                </div>
                <TrendingUp className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">كفاءة التحصيل</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {dashboardStats.payment_trends.collection_efficiency.toFixed(1)}%
                  </p>
                  <Progress 
                    value={dashboardStats.payment_trends.collection_efficiency} 
                    className="mt-2"
                  />
                </div>
                <Activity className="h-12 w-12 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="aging">تحليل الأعمار</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  اتجاهات المقبوضات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="collections" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Aging Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  توزيع الأعمار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agingDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agingDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Overdue Customers */}
          {dashboardStats?.top_overdue_customers && dashboardStats.top_overdue_customers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  أكبر العملاء المتأخرين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardStats.top_overdue_customers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            متأخر {customer.days_overdue} يوم
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-red-600">
                          {formatCurrency(customer.overdue_amount)}
                        </p>
                        <Badge variant="destructive" className="text-xs">
                          متأخر
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تقرير تحليل الأعمار التفصيلي</CardTitle>
            </CardHeader>
            <CardContent>
              {agingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={agingChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="current" stackId="a" fill="#00C49F" name="حالي" />
                    <Bar dataKey="aging_30" stackId="a" fill="#FFBB28" name="1-30 يوم" />
                    <Bar dataKey="aging_60" stackId="a" fill="#FF8042" name="31-60 يوم" />
                    <Bar dataKey="aging_90" stackId="a" fill="#8884D8" name="أكثر من 90 يوم" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد بيانات أعمار متاحة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aging Report Table */}
          {agingReport && agingReport.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>جدول تحليل الأعمار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-right">العميل</th>
                        <th className="border border-gray-200 p-3 text-right">إجمالي الرصيد</th>
                        <th className="border border-gray-200 p-3 text-right">حالي</th>
                        <th className="border border-gray-200 p-3 text-right">1-30 يوم</th>
                        <th className="border border-gray-200 p-3 text-right">31-60 يوم</th>
                        <th className="border border-gray-200 p-3 text-right">أكثر من 90 يوم</th>
                        <th className="border border-gray-200 p-3 text-right">الحد الائتماني</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingReport.slice(0, 20).map((item) => (
                        <tr key={item.customer_id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3">
                            <div>
                              <p className="font-medium">{item.customer_name}</p>
                              <p className="text-sm text-gray-500">{item.phone}</p>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3 font-medium">
                            {formatCurrency(item.total_balance)}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {formatCurrency(item.current_amount)}
                          </td>
                          <td className="border border-gray-200 p-3 text-yellow-600">
                            {formatCurrency(item.aging_30_days)}
                          </td>
                          <td className="border border-gray-200 p-3 text-orange-600">
                            {formatCurrency(item.aging_60_days)}
                          </td>
                          <td className="border border-gray-200 p-3 text-red-600">
                            {formatCurrency(item.aging_over_90_days)}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {formatCurrency(item.credit_limit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Payment Allocation Report */}
          {allocationReport && allocationReport.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>تقرير تخصيص المدفوعات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-right">العميل</th>
                        <th className="border border-gray-200 p-3 text-right">نوع الالتزام</th>
                        <th className="border border-gray-200 p-3 text-right">المبلغ المخصص</th>
                        <th className="border border-gray-200 p-3 text-right">الاستراتيجية</th>
                        <th className="border border-gray-200 p-3 text-right">تاريخ التخصيص</th>
                        <th className="border border-gray-200 p-3 text-right">طريقة الدفع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationReport.slice(0, 50).map((allocation) => (
                        <tr key={allocation.allocation_id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3">
                            {allocation.customer_name}
                          </td>
                          <td className="border border-gray-200 p-3">
                            <Badge variant="outline">
                              {allocation.obligation_type}
                            </Badge>
                          </td>
                          <td className="border border-gray-200 p-3 font-medium">
                            {formatCurrency(allocation.allocated_amount)}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {allocation.allocation_strategy}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {format(new Date(allocation.allocation_date), 'dd/MM/yyyy', { locale: ar })}
                          </td>
                          <td className="border border-gray-200 p-3">
                            {allocation.payment_method || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <EnhancedSmartAlertsPanel />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  تقرير الأعمار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  تقرير شامل لتحليل أعمار المستحقات لجميع العملاء
                </p>
                <Button 
                  onClick={() => handleExportReport('csv')}
                  disabled={exportReportMutation.isPending}
                  className="w-full"
                >
                  {exportReportMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                  <Download className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  تقرير المدفوعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  تقرير تفصيلي لجميع المدفوعات وتخصيصاتها
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 ml-2" />
                  تصدير تقرير المدفوعات
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  تقرير الأمان
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  تقرير شامل للأنشطة الأمنية وسجل المراجعة
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 ml-2" />
                  تصدير تقرير الأمان
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
