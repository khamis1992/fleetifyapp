/**
 * FinanceHub - Finance Dashboard (No Internal Sidebar)
 * Clean dashboard page that works with BentoSidebar navigation
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CreditCard,
  Receipt,
  Calculator,
  Building2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useTreasurySummary } from '@/hooks/useTreasury';
import { useInvoices } from '@/hooks/finance/useInvoices';
import { useVehicleInstallmentSummary } from '@/hooks/useVehicleInstallments';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const FinanceHub: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats } = useDashboardStats();
  const { data: recentActivities } = useRecentActivities();
  const { data: treasurySummary } = useTreasurySummary();
  const { data: invoices } = useInvoices({ status: 'pending' });
  const { data: installmentSummary } = useVehicleInstallmentSummary();

  const invoicesData = Array.isArray(invoices) ? invoices : (invoices as any)?.data || [];
  const pendingInvoicesCount = invoicesData.length || 0;
  const overdueInvoices = invoicesData.filter((inv: any) => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  });

  const kpiCards = [
    {
      title: 'إيرادات الشهر',
      value: (stats as any)?.monthlyRevenue || 0,
      change: (stats as any)?.revenueChange || 0,
      icon: TrendingUp,
      color: 'emerald' as const,
      path: '/finance/reports',
    },
    {
      title: 'نسبة التحصيل',
      value: '85%',
      change: 12,
      icon: CreditCard,
      color: 'sky' as const,
      path: '/finance/billing',
    },
    {
      title: 'الفواتير المتأخرة',
      value: overdueInvoices.length,
      change: -5,
      icon: AlertTriangle,
      color: 'coral' as const,
      path: '/finance/billing',
    },
    {
      title: 'رصيد الخزينة',
      value: treasurySummary?.totalBalance || 0,
      icon: Building2,
      color: 'violet' as const,
      path: '/finance/treasury',
    },
  ];

  const alerts = [
    {
      id: '1',
      icon: AlertTriangle,
      title: 'فواتير متأخرة',
      description: `${overdueInvoices.length} فواتير تحتاج متابعة`,
      severity: 'danger' as const,
    },
    {
      id: '2',
      icon: Clock,
      title: 'أقساط مستحقة',
      description: `${installmentSummary?.overdue_count || 0} أقساط متأخرة`,
      severity: 'warning' as const,
    },
    {
      id: '3',
      icon: Receipt,
      title: 'فواتير معلقة',
      description: `${pendingInvoicesCount} فواتير بالمعلقة`,
      severity: 'info' as const,
    },
  ];

  const recentActivity = useMemo(() => {
    if (!recentActivities || recentActivities.length === 0) return [];
    return recentActivities.slice(0, 8).map((activity: any, idx: number) => ({
      id: activity.id || String(idx),
      type: activity.type === 'contract' ? 'invoice' : activity.type === 'payment' ? 'payment' : 'entry',
      title: activity.title || activity.description || 'نشاط',
      amount: activity.amount,
      time: activity.time || 'منذ قليل',
      status: 'completed' as const,
    }));
  }, [recentActivities]);

  const revenueData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ar-SA', { month: 'short' });
      data.push({
        name: monthName,
        revenue: Math.floor(Math.random() * 50000) + 30000,
        expenses: Math.floor(Math.random() * 30000) + 15000,
      });
    }
    return data;
  }, []);

  const topCustomersData = [
    { name: 'شركة الأمل', revenue: 120000 },
    { name: 'شركة النور', revenue: 95000 },
    { name: 'شركة الفجر', revenue: 87500 },
    { name: 'شركة السلام', revenue: 72000 },
    { name: 'شركة الوفاء', revenue: 65000 },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">النظام المالي</h1>
          <p className="text-sm text-slate-500 mt-1">لوحة التحكم المالية الشاملة</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                onClick={() => navigate(kpi.path)}
                className={cn(
                  "bg-white rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all border-r-4",
                  kpi.color === 'emerald' && "border-emerald-500",
                  kpi.color === 'sky' && "border-sky-500",
                  kpi.color === 'coral' && "border-rose-500",
                  kpi.color === 'violet' && "border-violet-500"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <Icon className={cn(
                      "w-6 h-6",
                      kpi.color === 'emerald' && "text-emerald-600",
                      kpi.color === 'sky' && "text-sky-600",
                      kpi.color === 'coral' && "text-rose-600",
                      kpi.color === 'violet' && "text-violet-600",
                    )} />
                  </div>
                  {kpi.change !== undefined && (
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      kpi.change >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {kpi.change >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {Math.abs(kpi.change)}%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
                </p>
                <p className="text-sm text-slate-500">{kpi.title}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">تطور الإيرادات</h3>
                <p className="text-sm text-slate-500">آخر 6 أشهر</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize="12" />
                  <YAxis stroke="#94a3b8" fontSize="12" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">أفضل العملاء</h3>
                <p className="text-sm text-slate-500">حسب الإيرادات</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
                عرض الكل
              </Button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#94a3b8" fontSize="12" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize="12" width={80} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
                  />
                  <Bar dataKey="revenue" fill="#e85a4f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Alerts and Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Alerts Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">التنبيهات</h3>
                  <p className="text-xs text-slate-500">تحتاج انتباه</p>
                </div>
              </div>
              <Badge className="bg-rose-100 text-rose-700">
                {alerts.filter(a => a.severity === 'danger').length} حرج
              </Badge>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border",
                      alert.severity === 'danger' && "bg-red-50 border-red-200",
                      alert.severity === 'warning' && "bg-amber-50 border-amber-200",
                      alert.severity === 'info' && "bg-sky-50 border-sky-200"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      alert.severity === 'danger' && "bg-red-100",
                      alert.severity === 'warning' && "bg-amber-100",
                      alert.severity === 'info' && "bg-sky-100"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        alert.severity === 'danger' && "text-red-600",
                        alert.severity === 'warning' && "text-amber-600",
                        alert.severity === 'info' && "text-sky-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{alert.title}</p>
                      <p className="text-sm text-slate-600">{alert.description}</p>
                    </div>
                    {alert.severity === 'danger' && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/finance/alerts')}>
              عرض الكل
            </Button>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">آخر العمليات</h3>
                  <p className="text-xs text-slate-500">آخر 8 أنشطة</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 relative">
              <div className="absolute right-4 top-2 bottom-2 w-0.5 bg-slate-200" />
              
              {recentActivity.length === 0 ? (
                <p className="text-center text-slate-500 py-8">لا توجد أنشطة حديثة</p>
              ) : (
                recentActivity.map((item, idx) => {
                  const Icon = item.type === 'invoice' ? Receipt : item.type === 'payment' ? CreditCard : Calculator;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 pr-12 relative"
                    >
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-sm" />
                      <div className="flex items-center gap-3 flex-1 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.time}</p>
                        </div>
                        {item.amount && (
                          <Badge variant="outline" className="font-medium">
                            {formatCurrency(item.amount)}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">إجراءات سريعة</h3>
              <p className="text-xs text-slate-500">وصول سريع للعمليات الشائعة</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg"
              onClick={() => navigate('/finance/billing')}
            >
              <FileText className="w-4 h-4 ml-2" />
              فاتورة جديدة
            </Button>
            <Button variant="outline" onClick={() => navigate('/finance/unified-payments')}>
              <CreditCard className="w-4 h-4 ml-2" />
              تسجيل دفعة
            </Button>
            <Button variant="outline" onClick={() => navigate('/finance/unified-reports')}>
              <BarChart3 className="w-4 h-4 ml-2" />
              تقرير مالي
            </Button>
            <Button variant="outline" onClick={() => navigate('/finance/ledger')}>
              <Calculator className="w-4 h-4 ml-2" />
              ميزان المراجعة
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FinanceHub;