/**
 * المركز المالي - التصميم الجديد المحسّن
 * يغطي جميع خيارات الصفحة الحالية بتصميم Bento عصري
 * مع دعم الأدوار المختلفة والبحث الشامل
 * 
 * @component FinanceHub
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useFinanceRole } from '@/contexts/FinanceContext';
import { UniversalSearch } from '@/components/finance/hub/UniversalSearch';
import { ActivityTimeline } from '@/components/finance/hub/ActivityTimeline';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useTreasurySummary } from '@/hooks/useTreasury';
import { useInvoices } from '@/hooks/finance/useInvoices';
import { useVehicleInstallmentSummary } from '@/hooks/useVehicleInstallments';
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
  Car,
  RefreshCw,
  DollarSign,
  Clock,
  Users,
  Package,
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

// Module Card Component - Enhanced Design
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
  badgeColor = 'bg-neutral-100 text-neutral-600',
  stats,
}) => {
  const navigate = useNavigate();
  
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className={cn(
        "rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden",
        gradient ? gradient : "bg-white"
      )}
    >
      {/* Decorative background pattern */}
      {gradient && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
      )}
      
      <div className="relative flex items-start gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
          gradient ? 'bg-white/90' : bgColor
        )}>
          <Icon className={cn('w-5 h-5', gradient ? color : color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn(
              "font-bold text-sm truncate",
              gradient ? "text-white" : "text-neutral-900"
            )}>{title}</h3>
            {badge && (
              <Badge className={cn('text-[9px]', gradient ? 'bg-white/20 text-white border-white/30' : badgeColor)}>
                {badge}
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-xs mt-0.5 line-clamp-2",
            gradient ? "text-white/80" : "text-neutral-500"
          )}>{description}</p>
          
          {/* Stats mini display */}
          {stats && stats.length > 0 && (
            <div className="flex gap-3 mt-2">
              {stats.map((stat, idx) => (
                <div key={idx} className={cn(
                  "text-[10px]",
                  gradient ? "text-white/70" : "text-neutral-400"
                )}>
                  <span className={cn(
                    "font-bold",
                    gradient ? "text-white" : "text-neutral-700"
                  )}>{stat.value}</span>
                  {' '}{stat.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 transition-all flex-shrink-0 group-hover:translate-x-1",
          gradient ? "text-white/60 group-hover:text-white" : "text-neutral-300 group-hover:text-coral-500"
        )} />
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
  const { data: installmentSummary, isLoading: installmentsLoading } = useVehicleInstallmentSummary();

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

  // All Finance Modules - Consolidated 9 pages (including Vehicle Installments)
  const modules = [
    // 1️⃣ مركز الفواتير والمدفوعات (يشمل: الفواتير + المدفوعات + الودائع + الإيجارات)
    { 
      title: 'الفواتير والمدفوعات', 
      description: 'الفواتير، المدفوعات، الودائع، والإيجارات', 
      icon: Receipt, 
      color: 'text-coral-600', 
      bgColor: 'bg-coral-100', 
      gradient: 'bg-gradient-to-br from-coral-500 to-orange-500',
      path: '/finance/billing',
      stats: pendingInvoicesCount > 0 ? [{ label: 'معلقة', value: pendingInvoicesCount }] : undefined
    },
    
    // 2️⃣ المحاسبة العامة (يشمل: دليل الحسابات + دفتر الأستاذ + القيود)
    { 
      title: 'المحاسبة العامة', 
      description: 'دليل الحسابات، دفتر الأستاذ، والقيود', 
      icon: BookOpen, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100', 
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-500',
      path: '/finance/accounting' 
    },
    
    // 3️⃣ الخزينة والبنوك
    { 
      title: 'الخزينة والبنوك', 
      description: 'إدارة النقدية والحسابات البنكية', 
      icon: Landmark, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-100', 
      path: '/finance/treasury' 
    },
    
    // 4️⃣ التقارير والتحليل (يشمل: التقارير + التحليل + النسب + الحاسبة)
    { 
      title: 'التقارير والتحليل', 
      description: 'التقارير، التحليل، النسب المالية، والحاسبة', 
      icon: BarChart3, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-100', 
      gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500',
      path: '/finance/reports-analysis' 
    },
    
    // 5️⃣ الموازنات ومراكز التكلفة
    { 
      title: 'الموازنات ومراكز التكلفة', 
      description: 'التخطيط المالي وتوزيع التكاليف', 
      icon: PiggyBank, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-100', 
      path: '/finance/budgets-centers' 
    },
    
    // 6️⃣ الموردون
    { 
      title: 'الموردون', 
      description: 'إدارة حسابات الموردين', 
      icon: Building, 
      color: 'text-teal-600', 
      bgColor: 'bg-teal-100', 
      path: '/finance/vendors' 
    },
    
    // 7️⃣ أقساط المركبات - جديد ✨
    { 
      title: 'أقساط المركبات', 
      description: 'إدارة اتفاقيات الأقساط مع التجار', 
      icon: Car, 
      color: 'text-sky-600', 
      bgColor: 'bg-sky-100', 
      gradient: 'bg-gradient-to-br from-sky-500 to-cyan-500',
      path: '/fleet/vehicle-installments',
      badge: installmentSummary?.overdue_count && installmentSummary.overdue_count > 0 
        ? `${installmentSummary.overdue_count} متأخر` 
        : undefined,
      badgeColor: 'bg-red-100 text-red-600',
      stats: installmentSummary?.active_agreements 
        ? [
            { label: 'نشط', value: installmentSummary.active_agreements },
            { label: 'إجمالي', value: installmentSummary.total_agreements }
          ] 
        : undefined
    },
    
    // 8️⃣ الأصول الثابتة
    { 
      title: 'الأصول الثابتة', 
      description: 'إدارة وإهلاك الأصول', 
      icon: Briefcase, 
      color: 'text-slate-600', 
      bgColor: 'bg-slate-100', 
      path: '/finance/assets' 
    },
    
    // 9️⃣ التدقيق والإعدادات
    { 
      title: 'التدقيق والإعدادات', 
      description: 'سجل التدقيق وإعدادات النظام', 
      icon: Settings, 
      color: 'text-neutral-600', 
      bgColor: 'bg-neutral-100', 
      path: '/finance/audit-settings' 
    },
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
    
    // تنبيه أقساط المركبات المتأخرة
    if (installmentSummary?.overdue_count && installmentSummary.overdue_count > 0) {
      alertsList.push({
        type: 'danger',
        title: 'أقساط متأخرة',
        description: `${installmentSummary.overdue_count} قسط متأخر بإجمالي ${formatCurrency(installmentSummary.overdue_amount || 0)}`,
        action: 'عرض',
        onAction: () => navigate('/fleet/vehicle-installments')
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
  }, [overdueInvoices.length, pendingInvoicesCount, pendingInvoicesTotal, formatCurrency, navigate, installmentSummary]);

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
    <div className="min-h-screen bg-[#f0efed]" dir="rtl">
      <div className="p-5 max-w-[1600px] mx-auto">
        {/* Hero Header - Dashboard Style */}
        <motion.div 
          className="bg-gradient-to-r from-coral-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Banknote className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">المركز المالي</h1>
                <p className="text-white/80 text-sm">مرحباً، إليك نظرة سريعة على حالتك المالية</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="secondary" size="icon" className="relative bg-white/20 hover:bg-white/30 border-white/20">
                <Bell className="w-4 h-4 text-white" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -left-1 w-4 h-4 bg-white text-coral-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                تحديث
              </Button>

              {/* Role Badge */}
              <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                {getRoleBadge()}
              </Badge>
            </div>
          </div>
          
          {/* Quick Summary in Header */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs">إجمالي الإيرادات</span>
              </div>
              <p className="text-xl font-bold">{statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs">رصيد الخزينة</span>
              </div>
              <p className="text-xl font-bold">{treasuryLoading ? '...' : formatCurrency(treasurySummary?.totalBalance || 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs">الفواتير المعلقة</span>
              </div>
              <p className="text-xl font-bold">{invoicesLoading ? '...' : pendingInvoicesCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Car className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs">أقساط نشطة</span>
              </div>
              <p className="text-xl font-bold">{installmentsLoading ? '...' : installmentSummary?.active_agreements || 0}</p>
            </div>
          </div>
        </motion.div>

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
          
          {/* Quick Actions - Enhanced */}
          <div className="col-span-12 lg:col-span-6">
            <motion.div 
              className="bg-white rounded-2xl p-4 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                إجراءات سريعة
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-neutral-50 hover:shadow-md transition-all"
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-sm', action.bgColor)}>
                      <action.icon className={cn('w-5 h-5', action.color)} />
                    </div>
                    <span className="text-xs font-medium text-neutral-700">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Alerts - Enhanced */}
          <div className="col-span-12 lg:col-span-6">
            <motion.div 
              className="bg-white rounded-2xl p-4 shadow-sm h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-white" />
                </div>
                التنبيهات
                <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px]">
                  {alerts.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {alerts.map((alert, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <AlertCard {...alert} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Stats Row - بيانات حقيقية */}
          <motion.div 
            className="col-span-6 lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard
              title="إجمالي الإيرادات"
              value={statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
              change={stats?.revenueChange || 0}
              trend={stats?.revenueChange && stats.revenueChange >= 0 ? 'up' : 'down'}
              icon={TrendingUp}
              iconBg="bg-gradient-to-br from-green-400 to-emerald-500 text-white"
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/reports')}
            />
          </motion.div>
          <motion.div 
            className="col-span-6 lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <StatCard
              title="صافي التدفق"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.netFlow || 0)}
              change={treasurySummary?.netFlow && treasurySummary.netFlow > 0 ? Math.round((treasurySummary.netFlow / (treasurySummary.monthlyDeposits || 1)) * 100) : 0}
              trend={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? 'up' : 'down'}
              icon={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? TrendingUp : TrendingDown}
              iconBg={treasurySummary?.netFlow && treasurySummary.netFlow >= 0 ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white" : "bg-gradient-to-br from-red-400 to-rose-500 text-white"}
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/treasury')}
            />
          </motion.div>
          <motion.div 
            className="col-span-6 lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatCard
              title="الفواتير المعلقة"
              value={invoicesLoading ? '...' : String(pendingInvoicesCount)}
              icon={FileText}
              iconBg="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
              subtitle={formatCurrency(pendingInvoicesTotal)}
              onClick={() => navigate('/finance/billing')}
            />
          </motion.div>
          <motion.div 
            className="col-span-6 lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <StatCard
              title="رصيد الخزينة"
              value={treasuryLoading ? '...' : formatCurrency(treasurySummary?.totalBalance || 0)}
              icon={Wallet}
              iconBg="bg-gradient-to-br from-coral-400 to-orange-500 text-white"
              subtitle="محدث الآن"
              onClick={() => navigate('/finance/treasury')}
            />
          </motion.div>

          {/* ملخص الخزينة - بيانات حقيقية */}
          <div className="col-span-12 lg:col-span-8">
            <motion.div 
              className="bg-white rounded-2xl p-5 shadow-sm h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">ملخص الخزينة</h3>
                    <p className="text-xs text-neutral-400">الإيداعات والسحوبات لهذا الشهر</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/finance/treasury')} className="hover:bg-emerald-50">
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
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-500">إجمالي العملاء</span>
                  </div>
                  <span className="font-bold text-neutral-900">{stats?.totalCustomers || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-500">العقود النشطة</span>
                  </div>
                  <span className="font-bold text-neutral-900">{stats?.activeContracts || 0}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ملخص الفواتير - بيانات حقيقية */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div 
              className="bg-white rounded-2xl p-5 shadow-sm h-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-neutral-900">حالة الفواتير</h3>
              </div>
              
              {invoicesLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
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
            </motion.div>
          </div>
          
          {/* ملخص أقساط المركبات - جديد ✨ */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div 
              className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl p-5 shadow-lg h-full text-white relative overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">أقساط المركبات</h3>
                    <p className="text-white/70 text-xs">إدارة الاتفاقيات</p>
                  </div>
                </div>
                
                {installmentsLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/70 text-xs mb-1">الاتفاقيات النشطة</p>
                        <p className="text-2xl font-bold">{installmentSummary?.active_agreements || 0}</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/70 text-xs mb-1">المبلغ المستحق</p>
                        <p className="text-lg font-bold">{formatCurrency(installmentSummary?.total_outstanding || 0)}</p>
                      </div>
                    </div>
                    
                    {installmentSummary?.overdue_count && installmentSummary.overdue_count > 0 && (
                      <div className="bg-red-500/30 backdrop-blur-sm rounded-xl p-3 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                          <p className="text-sm font-semibold">{installmentSummary.overdue_count} قسط متأخر</p>
                          <p className="text-xs text-white/80">{formatCurrency(installmentSummary.overdue_amount || 0)}</p>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="secondary"
                      className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20"
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

          {/* Recent Activity - Enhanced */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div 
              className="bg-white rounded-2xl p-4 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm">النشاطات الأخيرة</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-coral-600 h-7 hover:text-coral-700">
                  عرض الكل
                </Button>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  <AnimatePresence>
                    {activities.length > 0 ? activities.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ActivityItemCard item={item} formatCurrency={formatCurrency} />
                      </motion.div>
                    )) : (
                      <div className="text-center py-8 text-neutral-400">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">لا توجد نشاطات حديثة</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          </div>

          {/* All Modules Grid - Enhanced */}
          <div className="col-span-12 lg:col-span-8">
            <motion.div 
              className="bg-white rounded-2xl p-5 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-coral-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-lg">جميع الأقسام المالية</h3>
                    <p className="text-xs text-neutral-500">اختر القسم للوصول السريع</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-coral-500 to-orange-500 text-white text-xs px-3 py-1">
                  {modules.length} قسم
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {modules.map((module, index) => (
                    <motion.div
                      key={module.path}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ModuleCard {...module} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
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

export default FinanceHub;

