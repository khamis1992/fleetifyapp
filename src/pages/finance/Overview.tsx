/**
 * FinanceHub - Professional SaaS Dashboard Redesign
 * Clean minimal design with dark sidebar, KPIs, charts, and alerts
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  BookOpen,
  Landmark,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CreditCard,
  Receipt,
  Calculator,
  Building,
  Car,
  PiggyBank,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useFinanceRole } from '@/contexts/FinanceContext';
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

interface NavigationItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string | number;
  badgeColor?: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPED = 64;

const FinanceHub: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats } = useDashboardStats();
  const { data: recentActivities } = useRecentActivities();
  const { data: treasurySummary } = useTreasurySummary();
  const { data: invoices } = useInvoices({ status: 'pending' });
  const { data: installmentSummary } = useVehicleInstallmentSummary();
  const userRole = useFinanceRole();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('finance-sidebar-collapsed');
    return saved === 'true';
  });

  const pendingInvoicesCount = invoices?.length || 0;
  const pendingInvoicesTotal = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const overdueInvoices = invoices?.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  }) || [];

  const navigationGroups: NavigationGroup[] = [
    {
      label: 'العمليات',
      items: [
        { icon: Wallet, label: 'المدفوعات', path: '/finance/unified-payments' },
        { icon: FileText, label: 'الفواتير', path: '/finance/billing', badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined, badgeColor: 'bg-amber-500' },
        { icon: Landmark, label: 'الخزينة والبنوك', path: '/finance/treasury' },
      ],
    },
    {
      label: 'المحاسبة',
      items: [
        { icon: BookOpen, label: 'دفتر الأستاذ', path: '/finance/ledger' },
        { icon: Calculator, label: 'القيود المحاسبية', path: '/finance/journal-entries' },
        { icon: FileText, label: 'دليل الحسابات', path: '/finance/chart-of-accounts' },
      ],
    },
    {
      label: 'التقارير',
      items: [
        { icon: BarChart3, label: 'قائمة الدخل', path: '/finance/unified-reports' },
        { icon: Building, label: 'الميزانية', path: '/finance/unified-reports' },
        { icon: TrendingUp, label: 'التدفقات النقدية', path: '/finance/unified-reports' },
      ],
    },
    {
      label: 'الإعدادات',
      items: [
        { icon: Settings, label: 'الإعدادات', path: '/finance/settings' },
      ],
    },
  ];

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPED : SIDEBAR_WIDTH_EXPANDED;

  const kpiCards = [
    {
      title: 'إيرادات الشهر',
      value: stats?.monthlyRevenue || 0,
      change: stats?.revenueChange || 0,
      icon: TrendingUp,
      color: 'emerald',
      path: '/finance/reports',
    },
    {
      title: 'نسبة التحصيل',
      value: '85%',
      change: 12,
      icon: CreditCard,
      color: 'sky',
      path: '/finance/billing',
    },
    {
      title: 'الفواتير المتأخرة',
      value: overdueInvoices.length,
      change: -5,
      icon: AlertTriangle,
      color: 'coral',
      path: '/finance/billing',
    },
    {
      title: 'رصيد الخزينة',
      value: treasurySummary?.totalBalance || 0,
      icon: Landmark,
      color: 'violet',
      path: '/finance/treasury',
    },
  ];

  const colorStyles = {
    emerald: 'border-r-4 border-emerald-500',
    sky: 'border-r-4 border-sky-500',
    coral: 'border-r-4 border-rose-500',
    violet: 'border-r-4 border-violet-500',
  };

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
    return recentActivities.slice(0, 8).map((activity, idx) => ({
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
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        className="fixed right-0 top-0 h-screen bg-slate-900 text-white shadow-xl z-40"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h1 className="font-bold text-lg">النظام المالي</h1>
                  <p className="text-xs text-slate-400">إدارة شاملة</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="mb-6">
                {!sidebarCollapsed && (
                  <p className="px-4 text-xs text-slate-500 uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1 px-2">
                  {group.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    const isActive = window.location.pathname === item.path;
                    return (
                      <motion.button
                        key={itemIdx}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative",
                          isActive
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-right">{item.label}</span>
                            {item.badge && (
                              <Badge className={cn("text-xs", item.badgeColor || 'bg-rose-500')}>
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <button
              onClick={() => {
                const newState = !sidebarCollapsed;
                setSidebarCollapsed(newState);
                localStorage.setItem('finance-sidebar-collapsed', String(newState));
              }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <>
                  <ChevronRight className="w-5 h-5" />
                  <span className="text-sm">طي القائمة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginRight: sidebarWidth }}
        className="flex-1 overflow-hidden"
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم المالية</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  className="w-64 pr-10 pl-4 h-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>

              {/* Refresh Button */}
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4" />
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                    "bg-white rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all",
                    colorStyles[kpi.color as keyof typeof colorStyles]
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
                  <ChevronLeft className="w-4 h-4 mr-1" />
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
                    <Bell className="w-5 h-5 text-rose-600" />
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
                <ChevronLeft className="w-4 h-4 mr-1" />
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
      </motion.main>
    </div>
  );
};

export default FinanceHub;