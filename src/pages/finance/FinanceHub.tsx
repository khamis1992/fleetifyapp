/**
 * المركز المالي - التصميم الجديد
 * يغطي جميع خيارات الصفحة الحالية بتصميم Bento عصري
 * مع دعم الأدوار المختلفة والبحث الشامل
 * 
 * @component FinanceHub
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useFinanceRole } from '@/contexts/FinanceContext';
import { UniversalSearch } from '@/components/finance/hub/UniversalSearch';
import { ActivityTimeline } from '@/components/finance/hub/ActivityTimeline';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useTreasurySummary } from '@/hooks/useTreasury';
import { useInvoices } from '@/hooks/finance/useInvoices';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Calculator,
  BookOpen,
  Landmark,
  Target,
  Building,
  Settings,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Bell,
  Wallet,
  PiggyBank,
  BarChart3,
  Receipt,
  LineChart,
  ArrowDownLeft,
  ArrowUpLeft,
  Calendar,
  Eye,
  ChevronRight,
  Sparkles,
  Percent,
  Activity,
  Shield,
  History,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Quick Action Item
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  badge?: string;
}

// Stat Card Component (Bento Style)
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down';
  subtitle?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  trend,
  subtitle,
  onClick,
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer h-full"
  >
    <div className="flex items-start justify-between">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon className="w-6 h-6" />
      </div>
      {change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
          trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        )}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
      )}
    </div>
  </motion.div>
);

// Module Card Component
interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  badge?: string;
  badgeColor?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  path,
  badge,
  badgeColor = 'bg-neutral-100 text-neutral-600',
}) => {
  const navigate = useNavigate();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-neutral-900 text-sm truncate">{title}</h3>
            {badge && (
              <Badge className={cn('text-[9px]', badgeColor)}>{badge}</Badge>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-coral-500 transition-colors flex-shrink-0" />
      </div>
    </motion.div>
  );
};

// Alert Card Component
interface AlertCardProps {
  type: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({
  type,
  title,
  description,
  action,
  onAction,
}) => {
  const colors = {
    warning: { bg: 'bg-amber-50', border: 'border-amber-500', icon: 'text-amber-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-500', icon: 'text-blue-600' },
    success: { bg: 'bg-green-50', border: 'border-green-500', icon: 'text-green-600' },
    danger: { bg: 'bg-red-50', border: 'border-red-500', icon: 'text-red-600' },
  };
  const icons = {
    warning: AlertCircle,
    info: AlertCircle,
    success: CheckCircle,
    danger: AlertCircle,
  };
  const IconComponent = icons[type];
  const c = colors[type];

  return (
    <div className={cn('p-3 rounded-xl border-r-4', c.bg, c.border)}>
      <div className="flex items-start gap-3">
        <IconComponent className={cn('w-5 h-5 flex-shrink-0 mt-0.5', c.icon)} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-neutral-900">{title}</p>
          <p className="text-xs text-neutral-600 mt-0.5">{description}</p>
        </div>
        {action && onAction && (
          <Button size="sm" variant="ghost" onClick={onAction} className="flex-shrink-0 h-7 text-xs">
            {action}
            <ArrowUpRight className="w-3 h-3 mr-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Activity Item Component
interface ActivityItem {
  id: string;
  type: 'payment' | 'invoice' | 'entry' | 'transfer';
  title: string;
  amount?: number;
  time: string;
  status?: 'completed' | 'pending' | 'cancelled';
}

const ActivityItemCard: React.FC<{ item: ActivityItem; formatCurrency: (n: number) => string }> = ({ 
  item, 
  formatCurrency 
}) => {
  const icons = {
    payment: CreditCard,
    invoice: FileText,
    entry: Calculator,
    transfer: ArrowUpLeft,
  };
  const colors = {
    payment: 'bg-green-100 text-green-600',
    invoice: 'bg-blue-100 text-blue-600',
    entry: 'bg-purple-100 text-purple-600',
    transfer: 'bg-amber-100 text-amber-600',
  };
  const Icon = icons[item.type];

  return (
    <div className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors[item.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-900 truncate">{item.title}</p>
        <p className="text-[10px] text-neutral-400">{item.time}</p>
      </div>
      {item.amount && (
        <p className="text-xs font-bold text-neutral-900">{formatCurrency(item.amount)}</p>
      )}
    </div>
  );
};

// Main Component
const FinanceHub: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const userRole = useFinanceRole();
  
  // استخدام البيانات الحقيقية من الـ hooks
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: treasurySummary, isLoading: treasuryLoading } = useTreasurySummary();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ status: 'pending' });

  // حساب الفواتير المعلقة والمتأخرة
  const pendingInvoicesCount = invoices?.length || 0;
  const pendingInvoicesTotal = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const overdueInvoices = invoices?.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  }) || [];

  // تحويل النشاطات الأخيرة للتنسيق المطلوب
  const activities: ActivityItem[] = React.useMemo(() => {
    if (!recentActivities || recentActivities.length === 0) return [];
    
    return recentActivities.slice(0, 5).map((activity, idx) => ({
      id: activity.id || String(idx),
      type: activity.type === 'contract' ? 'invoice' : 
            activity.type === 'payment' ? 'payment' : 
            activity.type === 'maintenance' ? 'entry' : 'transfer',
      title: activity.title || activity.description || 'نشاط غير معروف',
      amount: activity.amount,
      time: activity.time || 'منذ قليل',
      status: 'completed' as const
    }));
  }, [recentActivities]);

  // Quick Actions
  const quickActions: QuickAction[] = [
    { id: 'receive', label: 'استلام دفعة', icon: ArrowDownLeft, color: 'text-green-600', bgColor: 'bg-green-100', path: '/finance/operations/receive-payment' },
    { id: 'pay', label: 'صرف دفعة', icon: ArrowUpLeft, color: 'text-red-600', bgColor: 'bg-red-100', path: '/finance/billing' },
    { id: 'invoice', label: 'إنشاء فاتورة', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100', path: '/finance/billing' },
    { id: 'entry', label: 'قيد جديد', icon: Calculator, color: 'text-purple-600', bgColor: 'bg-purple-100', path: '/finance/new-entry' },
  ];

  // All Finance Modules - Complete list from original design
  const modules = [
    { title: 'الفواتير والمدفوعات', description: 'إدارة الفواتير والمقبوضات', icon: Receipt, color: 'text-coral-600', bgColor: 'bg-coral-100', path: '/finance/billing' },
    { title: 'دليل الحسابات', description: 'شجرة الحسابات المحاسبية', icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-100', path: '/finance/chart-of-accounts' },
    { title: 'دفتر الأستاذ', description: 'سجل الحركات المالية', icon: Calculator, color: 'text-amber-600', bgColor: 'bg-amber-100', path: '/finance/ledger' },
    { title: 'الخزينة والبنوك', description: 'إدارة النقدية والحسابات البنكية', icon: Landmark, color: 'text-coral-600', bgColor: 'bg-coral-100', path: '/finance/treasury' },
    { title: 'التقارير المالية', description: 'تقارير وتحليلات شاملة', icon: BarChart3, color: 'text-indigo-600', bgColor: 'bg-indigo-100', path: '/finance/reports' },
    { title: 'التحليل المالي', description: 'تحليل الأداء والاتجاهات', icon: LineChart, color: 'text-emerald-600', bgColor: 'bg-emerald-100', path: '/finance/analysis' },
    { title: 'لوحة المحاسب', description: 'نظرة شاملة للحالة المالية', icon: Activity, color: 'text-sky-600', bgColor: 'bg-sky-100', path: '/finance/accountant-dashboard' },
    { title: 'مراكز التكلفة', description: 'توزيع المصروفات والإيرادات', icon: Target, color: 'text-pink-600', bgColor: 'bg-pink-100', path: '/finance/cost-centers' },
    { title: 'الموردون', description: 'إدارة حسابات الموردين', icon: Building, color: 'text-teal-600', bgColor: 'bg-teal-100', path: '/finance/vendors' },
    { title: 'الموازنات', description: 'التخطيط والرقابة المالية', icon: PiggyBank, color: 'text-orange-600', bgColor: 'bg-orange-100', path: '/finance/budgets' },
    { title: 'الأصول الثابتة', description: 'إدارة وإهلاك الأصول', icon: Briefcase, color: 'text-slate-600', bgColor: 'bg-slate-100', path: '/finance/assets' },
    { title: 'القيود اليومية', description: 'سجل القيود المحاسبية', icon: History, color: 'text-violet-600', bgColor: 'bg-violet-100', path: '/finance/ledger' },
    { title: 'الودائع', description: 'إدارة الودائع والتأمينات', icon: Shield, color: 'text-cyan-600', bgColor: 'bg-cyan-100', path: '/finance/deposits' },
    { title: 'الحاسبة المالية', description: 'حساب القروض والفوائد', icon: Calculator, color: 'text-lime-600', bgColor: 'bg-lime-100', path: '/finance/calculator' },
    { title: 'متابعة الإيجارات', description: 'تتبع الإيجارات الشهرية', icon: Calendar, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100', path: '/finance/monthly-rent-tracking' },
    { title: 'النسب المالية', description: 'تحليل الأداء المالي', icon: Percent, color: 'text-rose-600', bgColor: 'bg-rose-100', path: '/finance/financial-ratios' },
    { title: 'سجل المراجعة', description: 'تتبع التغييرات والعمليات', icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100', path: '/finance/audit-trail' },
    { title: 'الإعدادات', description: 'إعدادات النظام المالي', icon: Settings, color: 'text-neutral-600', bgColor: 'bg-neutral-100', path: '/finance/settings' },
  ];

  // التنبيهات الحقيقية بناءً على البيانات
  const alerts = React.useMemo(() => {
    const alertsList: Array<{ type: 'warning' | 'info' | 'success' | 'danger'; title: string; description: string; action?: string; onAction?: () => void }> = [];
    
    // تنبيه الفواتير المتأخرة
    if (overdueInvoices.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'فواتير متأخرة',
        description: `${overdueInvoices.length} فاتورة تجاوزت تاريخ الاستحقاق`,
        action: 'عرض',
        onAction: () => navigate('/finance/billing')
      });
    }
    
    // تنبيه الفواتير المعلقة
    if (pendingInvoicesCount > 5) {
      alertsList.push({
        type: 'info',
        title: 'فواتير معلقة',
        description: `لديك ${pendingInvoicesCount} فاتورة معلقة بإجمالي ${formatCurrency(pendingInvoicesTotal)}`,
        action: 'عرض',
        onAction: () => navigate('/finance/billing')
      });
    }
    
    // إذا لم توجد تنبيهات
    if (alertsList.length === 0) {
      alertsList.push({
        type: 'success',
        title: 'لا توجد تنبيهات',
        description: 'جميع العمليات المالية تسير بشكل طبيعي'
      });
    }
    
    return alertsList;
  }, [overdueInvoices.length, pendingInvoicesCount, pendingInvoicesTotal, formatCurrency, navigate]);

  // Get role badge text
  const getRoleBadge = () => {
    switch (userRole) {
      case 'cashier': return 'أمين صندوق';
      case 'accountant': return 'محاسب';
      case 'manager': return 'مدير مالي';
      case 'admin': return 'مدير النظام';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="p-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-coral-500 to-coral-600 rounded-xl flex items-center justify-center shadow-lg">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">المركز المالي</h1>
              <p className="text-sm text-neutral-500">مرحباً، إليك نظرة سريعة على حالتك المالية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="outline" size="icon" className="relative bg-white">
              <Bell className="w-4 h-4 text-neutral-500" />
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-coral-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Role Badge */}
            <Badge variant="outline" className="text-sm bg-white">
              {getRoleBadge()}
            </Badge>
          </div>
        </header>

        {/* Universal Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <UniversalSearch />
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Quick Actions */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                إجراءات سريعة
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', action.bgColor)}>
                      <action.icon className={cn('w-5 h-5', action.color)} />
                    </div>
                    <span className="text-xs font-medium text-neutral-700">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm h-full">
              <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                التنبيهات
                <Badge className="bg-red-100 text-red-600 text-[10px]">{alerts.length}</Badge>
              </h3>
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <AlertCard key={idx} {...alert} />
                ))}
              </div>
            </div>
          </div>

          {/* Stats Row - بيانات حقيقية */}
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="إجمالي الإيرادات"
              value={statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
              change={stats?.revenueChange || 0}
              trend={stats?.revenueChange && stats.revenueChange >= 0 ? 'up' : 'down'}
              icon={TrendingUp}
              iconBg="bg-green-100 text-green-600"
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/reports')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="صافي التدفق"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.netFlow || 0)}
              change={treasurySummary?.netFlow && treasurySummary.netFlow > 0 ? Math.round((treasurySummary.netFlow / (treasurySummary.monthlyDeposits || 1)) * 100) : 0}
              trend={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? 'up' : 'down'}
              icon={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? TrendingUp : TrendingDown}
              iconBg={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/treasury')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="الفواتير المعلقة"
              value={invoicesLoading ? '...' : String(pendingInvoicesCount)}
              icon={FileText}
              iconBg="bg-amber-100 text-amber-600"
              subtitle={formatCurrency(pendingInvoicesTotal)}
              onClick={() => navigate('/finance/billing')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="رصيد الخزينة"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.totalBalance || 0)}
              icon={Wallet}
              iconBg="bg-coral-100 text-coral-600"
              subtitle="محدث الآن"
              onClick={() => navigate('/finance/treasury')}
            />
          </div>

          {/* ملخص الخزينة - بيانات حقيقية */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-neutral-900">ملخص الخزينة</h3>
                  <p className="text-xs text-neutral-400">الإيداعات والسحوبات لهذا الشهر</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/finance/treasury')}>
                  عرض التفاصيل
                  <ChevronRight className="w-4 h-4 mr-1" />
                </Button>
              </div>
              
              {treasuryLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">الإيداعات</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(treasurySummary?.monthlyDeposits || 0)}</p>
                    <p className="text-xs text-green-600 mt-1">هذا الشهر</p>
                  </div>
                  
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpLeft className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">السحوبات</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(treasurySummary?.monthlyWithdrawals || 0)}</p>
                    <p className="text-xs text-red-600 mt-1">هذا الشهر</p>
                  </div>
                  
                  <div className={cn(
                    "rounded-xl p-4",
                    treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "bg-blue-50" : "bg-orange-50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={cn(
                        "w-5 h-5",
                        treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-blue-600" : "text-orange-600"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-blue-800" : "text-orange-800"
                      )}>صافي التدفق</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold",
                      treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-blue-700" : "text-orange-700"
                    )}>{formatCurrency(treasurySummary?.netFlow || 0)}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-blue-600" : "text-orange-600"
                    )}>الفرق</p>
                  </div>
                </div>
              )}
              
              {/* إحصائيات إضافية */}
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">إجمالي العملاء</span>
                  <span className="font-bold text-neutral-900">{stats?.totalCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-neutral-500">العقود النشطة</span>
                  <span className="font-bold text-neutral-900">{stats?.activeContracts || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ملخص الفواتير - بيانات حقيقية */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm h-full">
              <h3 className="font-bold text-neutral-900 mb-2">حالة الفواتير</h3>
              
              {invoicesLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-800">معلقة</span>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-amber-700">{pendingInvoicesCount}</p>
                        <p className="text-xs text-amber-600">{formatCurrency(pendingInvoicesTotal)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-800">متأخرة</span>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-red-700">{overdueInvoices.length}</p>
                        <p className="text-xs text-red-600">
                          {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate('/finance/billing')}
                  >
                    عرض جميع الفواتير
                    <ChevronRight className="w-4 h-4 mr-1" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-neutral-900 text-sm">النشاطات الأخيرة</h3>
                <Button variant="ghost" size="sm" className="text-xs text-coral-600 h-7">
                  عرض الكل
                </Button>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {activities.map((item) => (
                    <ActivityItemCard key={item.id} item={item} formatCurrency={formatCurrency} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* All Modules Grid */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-neutral-900">جميع الأقسام المالية</h3>
                <Badge className="bg-neutral-100 text-neutral-600 text-xs">{modules.length} قسم</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map((module) => (
                  <ModuleCard key={module.path} {...module} />
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline - Full Width */}
          <div className="col-span-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <ActivityTimeline />
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FinanceHub;

