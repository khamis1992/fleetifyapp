/**
 * المركز المالي - التصميم المعاد تصميمه
 * Finance Hub - Redesigned
 * Professional SaaS Aesthetic
 *
 * @component FinanceHubRedesigned
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useFinanceRole } from '@/contexts/FinanceContext';
import { ActivityTimeline } from '@/components/finance/hub/ActivityTimeline';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useTreasurySummary } from '@/hooks/useTreasury';
import { useInvoices } from '@/hooks/finance/useInvoices';
import { useVehicleInstallmentSummary } from '@/hooks/useVehicleInstallments';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Calculator,
  BookOpen,
  Landmark,
  Building,
  Settings,
  AlertCircle,
  Wallet,
  PiggyBank,
  BarChart3,
  Receipt,
  ArrowDownLeft,
  ArrowUpLeft,
  ChevronRight,
  Activity,
  History,
  Briefcase,
  Car,
  RefreshCw,
  Clock,
  Users,
  Package,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// ===== Enhanced Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: 'emerald' | 'coral' | 'amber' | 'violet' | 'sky' | 'slate';
  subtitle?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtitle,
  onClick,
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
    coral: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
    violet: {
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
    sky: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      iconBg: 'bg-gradient-to-br from-sky-500 to-sky-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
      trendUp: 'text-emerald-600',
      trendDown: 'text-rose-600',
    },
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all cursor-pointer h-full group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20', styles.iconBg)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
            change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {change >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

// ===== Enhanced Module Card Component =====
interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  gradient?: string;
  path: string;
  badge?: string;
  badgeColor?: string;
  stats?: { label: string; value: string | number }[];
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  gradient,
  path,
  badge,
  badgeColor = 'bg-slate-100 text-slate-600',
  stats,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className={cn(
        "rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden border",
        gradient ? "border-white/20" : "border-slate-200"
      )}
      style={gradient ? { background: gradient } : { backgroundColor: 'white' }}
    >
      {/* Decorative background pattern */}
      {gradient && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
      )}

      <div className="relative flex items-start gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md',
          gradient ? 'bg-white/90' : bgColor
        )}>
          <Icon className={cn('w-5 h-5', gradient ? color : color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn(
              "font-bold text-sm truncate",
              gradient ? "text-white" : "text-slate-900"
            )}>{title}</h3>
            {badge && (
              <Badge className={cn('text-[9px]', gradient ? 'bg-white/20 text-white border-white/30' : badgeColor)}>
                {badge}
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-xs mt-0.5 line-clamp-2 leading-relaxed",
            gradient ? "text-white/80" : "text-slate-500"
          )}>{description}</p>

          {/* Stats mini display */}
          {stats && stats.length > 0 && (
            <div className="flex gap-3 mt-2.5">
              {stats.map((stat, idx) => (
                <div key={idx} className={cn(
                  "text-[10px]",
                  gradient ? "text-white/70" : "text-slate-400"
                )}>
                  <span className={cn(
                    "font-bold",
                    gradient ? "text-white" : "text-slate-700"
                  )}>{stat.value}</span>
                  {' '}{stat.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 transition-all flex-shrink-0 group-hover:translate-x-1",
          gradient ? "text-white/60 group-hover:text-white" : "text-slate-300 group-hover:text-rose-500"
        )} />
      </div>
    </motion.div>
  );
};

// ===== Activity Item Component =====
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
    payment: 'bg-emerald-50 text-emerald-600',
    invoice: 'bg-sky-50 text-sky-600',
    entry: 'bg-violet-50 text-violet-600',
    transfer: 'bg-amber-50 text-amber-600',
  };
  const Icon = icons[item.type];

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colors[item.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
        <p className="text-[10px] text-slate-400">{item.time}</p>
      </div>
      {item.amount && (
        <p className="text-xs font-bold text-slate-900">{formatCurrency(item.amount)}</p>
      )}
    </div>
  );
};

// ===== Main Component =====
const FinanceHubRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const userRole = useFinanceRole();

  // استخدام البيانات الحقيقية من الـ hooks
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: treasurySummary, isLoading: treasuryLoading } = useTreasurySummary();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ status: 'pending' });
  const { data: installmentSummary, isLoading: installmentsLoading } = useVehicleInstallmentSummary();

  // حساب الفواتير المعلقة والمتأخرة
  const pendingInvoicesCount = invoices?.length || 0;
  const pendingInvoicesTotal = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const overdueInvoices = invoices?.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  }) || [];

  // تحويل النشاطات الأخيرة للتنسيق المطلوب
  const activities: ActivityItem[] = useMemo(() => {
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

  // All Finance Modules - 9 sections
  const modules = [
    {
      title: 'الفواتير والمدفوعات',
      description: 'الفواتير، المدفوعات، الودائع، والإيجارات',
      icon: Receipt,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
      path: '/finance/billing',
      stats: pendingInvoicesCount > 0 ? [{ label: 'معلقة', value: pendingInvoicesCount }] : undefined
    },
    {
      title: 'المحاسبة العامة',
      description: 'دليل الحسابات، دفتر الأستاذ، والقيود',
      icon: BookOpen,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      path: '/finance/accounting'
    },
    {
      title: 'الخزينة والبنوك',
      description: 'إدارة النقدية والحسابات البنكية',
      icon: Landmark,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      path: '/finance/treasury'
    },
    {
      title: 'التقارير والتحليل',
      description: 'التقارير، التحليل، النسب المالية، والحاسبة',
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
      path: '/finance/reports-analysis'
    },
    {
      title: 'الموازنات ومراكز التكلفة',
      description: 'التخطيط المالي وتوزيع التكاليف',
      icon: PiggyBank,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      path: '/finance/budgets-centers'
    },
    {
      title: 'الموردون',
      description: 'إدارة حسابات الموردين',
      icon: Building,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      path: '/finance/vendors'
    },
    {
      title: 'أقساط المركبات',
      description: 'إدارة اتفاقيات الأقساط مع التجار',
      icon: Car,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
      path: '/fleet/vehicle-installments',
      badge: installmentSummary?.overdue_count && installmentSummary.overdue_count > 0
        ? `${installmentSummary.overdue_count} متأخر`
        : undefined,
      badgeColor: 'bg-rose-100 text-rose-600',
      stats: installmentSummary?.active_agreements
        ? [
            { label: 'نشط', value: installmentSummary.active_agreements },
            { label: 'إجمالي', value: installmentSummary.total_agreements }
          ]
        : undefined
    },
    {
      title: 'الأصول الثابتة',
      description: 'إدارة وإهلاك الأصول',
      icon: Briefcase,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      path: '/finance/assets'
    },
    {
      title: 'التدقيق والإعدادات',
      description: 'سجل التدقيق وإعدادات النظام',
      icon: Settings,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
      path: '/finance/audit-settings'
    },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30" dir="rtl">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* Hero Header - Professional SaaS Style */}
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 p-8 text-white shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <Banknote className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold">المركز المالي</h1>
                  <p className="text-white/80 text-sm mt-1">مرحباً، إليك نظرة شاملة على حالتك المالية</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تحديث
                </Button>

                <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1.5 backdrop-blur-sm">
                  {getRoleBadge()}
                </Badge>
              </div>
            </div>

            {/* Quick Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs font-medium">إجمالي الإيرادات</span>
                </div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs font-medium">رصيد الخزينة</span>
                </div>
                <p className="text-2xl font-bold">{treasuryLoading ? '...' : formatCurrency(treasurySummary?.totalBalance || 0)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs font-medium">الفواتير المعلقة</span>
                </div>
                <p className="text-2xl font-bold">{invoicesLoading ? '...' : pendingInvoicesCount}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs font-medium">أقساط نشطة</span>
                </div>
                <p className="text-2xl font-bold">{installmentsLoading ? '...' : installmentSummary?.active_agreements || 0}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard
              title="إجمالي الإيرادات"
              value={statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
              change={stats?.revenueChange || 0}
              icon={TrendingUp}
              color="emerald"
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/reports')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <StatCard
              title="صافي التدفق"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.netFlow || 0)}
              change={treasurySummary?.netFlow && treasurySummary.netFlow > 0 ? Math.round((treasurySummary.netFlow / (treasurySummary.monthlyDeposits || 1)) * 100) : 0}
              icon={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? TrendingUp : TrendingDown}
              color={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "emerald" : "coral"}
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/treasury')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatCard
              title="الفواتير المعلقة"
              value={invoicesLoading ? '...' : String(pendingInvoicesCount)}
              icon={FileText}
              color="amber"
              subtitle={formatCurrency(pendingInvoicesTotal)}
              onClick={() => navigate('/finance/billing')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <StatCard
              title="رصيد الخزينة"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.totalBalance || 0)}
              icon={Wallet}
              color="coral"
              subtitle="محدث الآن"
              onClick={() => navigate('/finance/treasury')}
            />
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Treasury Summary - Full Width */}
          <div className="col-span-12">
            <motion.div
              className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">ملخص الخزينة</h3>
                    <p className="text-sm text-slate-500">الإيداعات والسحوبات لهذا الشهر</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/finance/treasury')} className="hover:bg-teal-50 border-slate-200">
                  عرض التفاصيل
                  <ChevronRight className="w-4 h-4 mr-1" />
                </Button>
              </div>

              {treasuryLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-900">الإيداعات</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(treasurySummary?.monthlyDeposits || 0)}</p>
                    <p className="text-xs text-emerald-600 mt-1">هذا الشهر</p>
                  </div>

                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-5 border border-rose-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUpLeft className="w-5 h-5 text-rose-600" />
                      <span className="text-sm font-semibold text-rose-900">السحوبات</span>
                    </div>
                    <p className="text-2xl font-bold text-rose-700">{formatCurrency(treasurySummary?.monthlyWithdrawals || 0)}</p>
                    <p className="text-xs text-rose-600 mt-1">هذا الشهر</p>
                  </div>

                  <div className={cn(
                    "rounded-xl p-5 border",
                    treasurySummary?.netFlow && treasurySummary.netFlow >= 0
                      ? "bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200"
                      : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className={cn(
                        "w-5 h-5",
                        treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-sky-600" : "text-amber-600"
                      )} />
                      <span className={cn(
                        "text-sm font-semibold",
                        treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-sky-900" : "text-amber-900"
                      )}>صافي التدفق</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold",
                      treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-sky-700" : "text-amber-700"
                    )}>{formatCurrency(treasurySummary?.netFlow || 0)}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "text-sky-600" : "text-amber-600"
                    )}>الفرق</p>
                  </div>

                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-5 border border-violet-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-900">العملاء</span>
                    </div>
                    <p className="text-2xl font-bold text-violet-700">{stats?.totalCustomers || 0}</p>
                    <p className="text-xs text-violet-600 mt-1">إجمالي العملاء</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-900">العقود</span>
                    </div>
                    <p className="text-2xl font-bold text-indigo-700">{stats?.activeContracts || 0}</p>
                    <p className="text-xs text-indigo-600 mt-1">العقود النشطة</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* All Finance Modules - Enhanced Categorized Design */}
          <div className="col-span-12 space-y-6">
            {/* Featured/Quick Access Modules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">الوصول السريع</h3>
                  <p className="text-xs text-slate-500">الأقسام الأكثر استخداماً</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modules.slice(0, 3).map((module, index) => (
                  <motion.div
                    key={module.path}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + index * 0.08 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(module.path)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl p-5 cursor-pointer group shadow-sm hover:shadow-xl transition-all",
                        module.gradient ? "text-white" : "bg-white border border-slate-200"
                      )}
                      style={module.gradient ? { background: module.gradient } : {}}
                    >
                      {/* Decorative elements for gradient cards */}
                      {module.gradient && (
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                        </div>
                      )}

                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                            module.gradient ? "bg-white/20" : module.bgColor
                          )}>
                            <module.icon className={cn("w-7 h-7", module.gradient ? "text-white" : module.color)} />
                          </div>
                          <div className={cn(
                            "flex flex-col items-end gap-1",
                            !module.gradient && "opacity-0 group-hover:opacity-100 transition-opacity"
                          )}>
                            {module.badge && (
                              <Badge className={cn(
                                "text-xs",
                                module.gradient ? "bg-white/20 text-white border-white/30" : module.badgeColor
                              )}>
                                {module.badge}
                              </Badge>
                            )}
                            {module.stats && (
                              <div className="flex gap-2">
                                {module.stats.map((stat, idx) => (
                                  <div key={idx} className={cn(
                                    "text-[10px]",
                                    module.gradient ? "text-white/80" : "text-slate-500"
                                  )}>
                                    <span className={cn(
                                      "font-bold",
                                      module.gradient ? "text-white" : "text-slate-700"
                                    )}>{stat.value}</span>
                                    {' '}{stat.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className={cn(
                            "font-bold text-lg mb-1",
                            module.gradient ? "text-white" : "text-slate-900"
                          )}>{module.title}</h4>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            module.gradient ? "text-white/80" : "text-slate-500"
                          )}>{module.description}</p>
                        </div>
                        <div className={cn(
                          "absolute bottom-5 left-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0",
                          module.gradient ? "text-white" : "text-rose-500"
                        )}>
                          <span className="text-sm font-medium">افتح القسم</span>
                          <ChevronRight className="w-4 h-4 inline mr-1" />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Categorized Modules */}
            <motion.div
              className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">جميع الأقسام المالية</h3>
                    <p className="text-sm text-slate-500">مرتبة حسب الفئة</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs px-4 py-1.5">
                  {modules.length} قسم
                </Badge>
              </div>

              <div className="space-y-6">
                {/* Core Operations */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    <h4 className="text-sm font-semibold text-slate-700">العمليات الأساسية</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {modules.slice(0, 2).map((module, index) => (
                      <motion.div
                        key={module.path}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 + index * 0.05 }}
                      >
                        <ModuleCard {...module} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Accounting & Reports */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <h4 className="text-sm font-semibold text-slate-700">المحاسبة والتقارير</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modules.slice(2, 5).map((module, index) => (
                      <motion.div
                        key={module.path}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.05 }}
                      >
                        <ModuleCard {...module} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Planning & Management */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="text-sm font-semibold text-slate-700">التخطيط والإدارة</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {modules.slice(5, 7).map((module, index) => (
                      <motion.div
                        key={module.path}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 + index * 0.05 }}
                      >
                        <ModuleCard {...module} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Special & Settings */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    <h4 className="text-sm font-semibold text-slate-700">أقسام خاصة وإعدادات</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modules.slice(7).map((module, index) => (
                      <motion.div
                        key={module.path}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                      >
                        <ModuleCard {...module} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Vehicle Installments Summary */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div
              className="rounded-3xl p-6 shadow-lg h-full text-white relative overflow-hidden border border-sky-200/30"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">أقساط المركبات</h3>
                    <p className="text-white/70 text-xs">إدارة الاتفاقيات</p>
                  </div>
                </div>

                {installmentsLoading ? (
                  <div className="h-40 flex items-center justify-center">
                    <div className="animate-spin w-10 h-10 border-3 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <p className="text-white/70 text-xs mb-1">الاتفاقيات النشطة</p>
                        <p className="text-2xl font-bold">{installmentSummary?.active_agreements || 0}</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <p className="text-white/70 text-xs mb-1">المبلغ المستحق</p>
                        <p className="text-lg font-bold">{formatCurrency(installmentSummary?.total_outstanding || 0)}</p>
                      </div>
                    </div>

                    {installmentSummary?.overdue_count && installmentSummary.overdue_count > 0 && (
                      <div className="bg-rose-500/30 backdrop-blur-sm rounded-xl p-4 mb-4 flex items-center gap-3 border border-rose-400/30">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{installmentSummary.overdue_count} قسط متأخر</p>
                          <p className="text-xs text-white/80">{formatCurrency(installmentSummary.overdue_amount || 0)}</p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                      onClick={() => navigate('/fleet/vehicle-installments')}
                    >
                      إدارة الأقساط
                      <ChevronRight className="w-4 h-4 mr-1" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Invoice Status */}
          <div className="col-span-12 lg:col-span-6">
            <motion.div
              className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all h-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">حالة الفواتير</h3>
                  <p className="text-xs text-slate-500">نظرة سريعة</p>
                </div>
              </div>

              {invoicesLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-amber-700" />
                        </div>
                        <span className="text-sm font-semibold text-amber-900">معلقة</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-bold text-amber-700">{pendingInvoicesCount}</p>
                        <p className="text-xs text-amber-600">{formatCurrency(pendingInvoicesTotal)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl border border-rose-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-200 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-rose-700" />
                        </div>
                        <span className="text-sm font-semibold text-rose-900">متأخرة</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-bold text-rose-700">{overdueInvoices.length}</p>
                        <p className="text-xs text-rose-600">
                          {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-5"
                    onClick={() => navigate('/finance/billing')}
                  >
                    عرض جميع الفواتير
                    <ChevronRight className="w-4 h-4 mr-1" />
                  </Button>
                </>
              )}
            </motion.div>
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

export default FinanceHubRedesigned;
