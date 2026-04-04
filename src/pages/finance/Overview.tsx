/**
 * FinanceHub - Finance Dashboard (No Internal Sidebar)
 * Clean dashboard page that works with BentoSidebar navigation
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
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
} from 'recharts';

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { companyId } = useUnifiedCompanyAccess();
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

  const { data: revenueDataRaw } = useQuery({
    queryKey: ['finance-revenue-chart', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_date, total_amount')
        .eq('company_id', companyId)
        .gte('invoice_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('invoice_date', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: topCustomersRaw } = useQuery({
    queryKey: ['finance-top-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          customer_id,
          total_paid,
          customer:customers!customer_id(
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type
          )
        `)
        .eq('company_id', companyId);
      if (error) return [];
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: collectionRate } = useQuery({
    queryKey: ['finance-collection-rate', companyId],
    queryFn: async () => {
      if (!companyId) return { rate: 0, change: 0 };
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount')
        .eq('company_id', companyId)
        .neq('payment_status', 'cancelled');
      if (!invoicesData || invoicesData.length === 0) return { rate: 0, change: 0 };
      const totalAmount = invoicesData.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const paidAmount = invoicesData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      const rate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
      return { rate, change: 0 };
    },
    enabled: !!companyId,
  });

  const revenueData = useMemo(() => {
    if (!revenueDataRaw || revenueDataRaw.length === 0) {
      const now = new Date();
      return Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          name: date.toLocaleDateString('ar-SA', { month: 'short' }),
          revenue: 0,
          expenses: 0,
        };
      });
    }
    const now = new Date();
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('ar-SA', { month: 'short' });
      months[key] = 0;
    }
    revenueDataRaw.forEach(inv => {
      if (inv.invoice_date) {
        const date = new Date(inv.invoice_date);
        const key = date.toLocaleDateString('ar-SA', { month: 'short' });
        if (months[key] !== undefined) {
          months[key] += inv.total_amount || 0;
        }
      }
    });
    return Object.entries(months).map(([name, revenue]) => ({
      name,
      revenue,
      expenses: 0,
    }));
  }, [revenueDataRaw]);

  const topCustomersData = useMemo(() => {
    if (!topCustomersRaw || topCustomersRaw.length === 0) {
      return [
        { name: 'لا توجد بيانات', revenue: 0 },
      ];
    }
    const customerRevenue: Record<string, { name: string; revenue: number }> = {};
    topCustomersRaw.forEach((c: any) => {
      if (!c.customer) return;
      const customer = c.customer;
      const name = customer.customer_type === 'corporate'
        ? (customer.company_name_ar || customer.company_name || 'شركة')
        : (customer.first_name_ar || customer.first_name || '') + ' ' + (customer.last_name_ar || customer.last_name || '');
      if (!customerRevenue[c.customer_id]) {
        customerRevenue[c.customer_id] = { name: name.trim() || 'عميل', revenue: 0 };
      }
      customerRevenue[c.customer_id].revenue += c.total_paid || 0;
    });
    return Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [topCustomersRaw]);

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
      value: `${collectionRate?.rate || 0}%`,
      change: collectionRate?.change || 0,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">النظام المالي</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">لوحة التحكم المالية الشاملة</p>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/finance/billing')}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors min-h-[44px]"
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-semibold">إنشاء فاتورة</span>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/finance/treasury')}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors min-h-[44px]"
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-sm font-semibold">تسجيل دفعة</span>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/finance/reports')}
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors min-h-[44px]"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-semibold">عرض التقارير</span>
          </motion.button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(kpi.path)}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm hover:shadow-sm cursor-pointer transition-all border border-slate-200 dark:border-slate-800",
                  kpi.color === 'emerald' && "border-r-4 border-r-emerald-500",
                  kpi.color === 'sky' && "border-r-4 border-r-sky-500",
                  kpi.color === 'coral' && "border-r-4 border-r-rose-500",
                  kpi.color === 'violet' && "border-r-4 border-r-violet-500"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    kpi.color === 'emerald' && "bg-emerald-50 dark:bg-emerald-500/10",
                    kpi.color === 'sky' && "bg-sky-50 dark:bg-sky-500/10",
                    kpi.color === 'coral' && "bg-rose-50 dark:bg-rose-500/10",
                    kpi.color === 'violet' && "bg-violet-50 dark:bg-violet-500/10"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      kpi.color === 'emerald' && "text-emerald-600 dark:text-emerald-400",
                      kpi.color === 'sky' && "text-sky-600 dark:text-sky-400",
                      kpi.color === 'coral' && "text-rose-600 dark:text-rose-400",
                      kpi.color === 'violet' && "text-violet-600 dark:text-violet-400",
                    )} />
                  </div>
                  {kpi.change !== undefined && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold",
                      kpi.change >= 0 ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    )}>
                      {kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpi.change)}%
                    </span>
                  )}
                </div>
                <h3 className="text-xs text-slate-500 dark:text-slate-400 mb-1">{kpi.title}</h3>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
                </p>
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
            className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">تطور الإيرادات</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">آخر 6 أشهر</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize="12" />
                  <YAxis stroke="#94a3b8" fontSize="12" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(15 23 42)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
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

          {/* Top Customers - Simplified List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">أفضل العملاء</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">حسب الإيرادات</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
                عرض الكل
              </Button>
            </div>
            <div className="space-y-2">
              {topCustomersData.length === 0 || (topCustomersData.length === 1 && topCustomersData[0].name === 'لا توجد بيانات') ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">لا توجد بيانات</p>
              ) : (
                topCustomersData.map((customer, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(customer.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
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
            className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">التنبيهات</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">تحتاج انتباه</p>
                </div>
              </div>
              <Badge className="bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
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
                      alert.severity === 'danger' && "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
                      alert.severity === 'warning' && "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
                      alert.severity === 'info' && "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      alert.severity === 'danger' && "bg-red-100 dark:bg-red-500/20",
                      alert.severity === 'warning' && "bg-amber-100 dark:bg-amber-500/20",
                      alert.severity === 'info' && "bg-sky-100 dark:bg-sky-500/20"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        alert.severity === 'danger' && "text-red-600 dark:text-red-400",
                        alert.severity === 'warning' && "text-amber-600 dark:text-amber-400",
                        alert.severity === 'info' && "text-sky-600 dark:text-sky-400"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{alert.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{alert.description}</p>
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

export default Overview;