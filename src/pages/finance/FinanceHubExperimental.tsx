/**
 * المركز المالي - تصميم تجريبي جديد
 * يغطي جميع خيارات الصفحة الحالية بتصميم Bento عصري
 * 
 * @component FinanceHubExperimental
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useFinanceRole } from '@/contexts/FinanceContext';
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
  BarChart,
  Bar,
} from 'recharts';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  CreditCard,
  Calculator,
  BookOpen,
  Landmark,
  Target,
  Building,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  Search,
  Bell,
  Plus,
  Receipt,
  Wallet,
  PiggyBank,
  BarChart3,
  LineChart,
  DollarSign,
  ArrowDownLeft,
  ArrowUpLeft,
  Calendar,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  ChevronRight,
  Sparkles,
  FlaskConical,
  LayoutGrid,
  Percent,
  Activity,
  Shield,
  History,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
const FinanceHubExperimental: React.FC = () => {
  const navigate = useNavigate();
  const companyId = useCurrentCompanyId();
  const { formatCurrency } = useCurrencyFormatter();
  const { stats } = useDashboardStats();
  const userRole = useFinanceRole();
  const [searchQuery, setSearchQuery] = useState('');

  // Sample revenue data for chart
  const revenueData = [
    { name: 'يناير', revenue: 45000, expenses: 32000 },
    { name: 'فبراير', revenue: 52000, expenses: 38000 },
    { name: 'مارس', revenue: 48000, expenses: 35000 },
    { name: 'أبريل', revenue: 70000, expenses: 42000 },
    { name: 'مايو', revenue: 65000, expenses: 40000 },
    { name: 'يونيو', revenue: 80000, expenses: 45000 },
  ];

  // Cash flow data
  const cashFlowData = [
    { name: 'نقدي', value: 45, color: '#e85a4f' },
    { name: 'بنكي', value: 35, color: '#3b82f6' },
    { name: 'شيكات', value: 15, color: '#22c55e' },
    { name: 'آجل', value: 5, color: '#f59e0b' },
  ];

  // Sample activities
  const activities: ActivityItem[] = [
    { id: '1', type: 'payment', title: 'استلام دفعة - شركة الخليج', amount: 15000, time: 'منذ 5 دقائق', status: 'completed' },
    { id: '2', type: 'invoice', title: 'فاتورة جديدة #INV-2024-156', amount: 8500, time: 'منذ 30 دقيقة', status: 'pending' },
    { id: '3', type: 'entry', title: 'قيد محاسبي - مصروفات', amount: 2300, time: 'منذ ساعة', status: 'completed' },
    { id: '4', type: 'transfer', title: 'تحويل داخلي - الصندوق → البنك', amount: 50000, time: 'منذ ساعتين', status: 'completed' },
  ];

  // Quick Actions
  const quickActions: QuickAction[] = [
    { id: 'receive', label: 'استلام دفعة', icon: ArrowDownLeft, color: 'text-green-600', bgColor: 'bg-green-100', path: '/finance/operations/receive-payment' },
    { id: 'pay', label: 'صرف دفعة', icon: ArrowUpLeft, color: 'text-red-600', bgColor: 'bg-red-100', path: '/finance/payments' },
    { id: 'invoice', label: 'إنشاء فاتورة', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100', path: '/finance/invoices' },
    { id: 'entry', label: 'قيد جديد', icon: Calculator, color: 'text-purple-600', bgColor: 'bg-purple-100', path: '/finance/new-entry' },
  ];

  // All Finance Modules
  const modules = [
    { title: 'الفواتير', description: 'إدارة فواتير العملاء', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100', path: '/finance/invoices', badge: '12 معلق' },
    { title: 'المدفوعات', description: 'تتبع المقبوضات والمصروفات', icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100', path: '/finance/payments' },
    { title: 'دليل الحسابات', description: 'شجرة الحسابات المحاسبية', icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-100', path: '/finance/chart-of-accounts' },
    { title: 'دفتر الأستاذ', description: 'سجل الحركات المالية', icon: Calculator, color: 'text-amber-600', bgColor: 'bg-amber-100', path: '/finance/ledger' },
    { title: 'الخزينة والبنوك', description: 'إدارة النقدية والحسابات البنكية', icon: Landmark, color: 'text-coral-600', bgColor: 'bg-coral-100', path: '/finance/treasury' },
    { title: 'التقارير المالية', description: 'تقارير وتحليلات شاملة', icon: BarChart3, color: 'text-indigo-600', bgColor: 'bg-indigo-100', path: '/finance/reports' },
    { title: 'مراكز التكلفة', description: 'توزيع المصروفات والإيرادات', icon: Target, color: 'text-pink-600', bgColor: 'bg-pink-100', path: '/finance/cost-centers' },
    { title: 'الموردون', description: 'إدارة حسابات الموردين', icon: Building, color: 'text-teal-600', bgColor: 'bg-teal-100', path: '/finance/vendors' },
    { title: 'الموازنات', description: 'التخطيط والرقابة المالية', icon: PiggyBank, color: 'text-orange-600', bgColor: 'bg-orange-100', path: '/finance/budgets' },
    { title: 'الأصول الثابتة', description: 'إدارة وإهلاك الأصول', icon: Briefcase, color: 'text-slate-600', bgColor: 'bg-slate-100', path: '/finance/assets' },
    { title: 'القيود اليومية', description: 'سجل القيود المحاسبية', icon: History, color: 'text-violet-600', bgColor: 'bg-violet-100', path: '/finance/journal-entries' },
    { title: 'الودائع', description: 'إدارة الودائع والتأمينات', icon: Shield, color: 'text-cyan-600', bgColor: 'bg-cyan-100', path: '/finance/deposits' },
    { title: 'النسب المالية', description: 'تحليل الأداء المالي', icon: Percent, color: 'text-rose-600', bgColor: 'bg-rose-100', path: '/finance/financial-ratios' },
    { title: 'سجل المراجعة', description: 'تتبع التغييرات والعمليات', icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100', path: '/finance/audit-trail' },
    { title: 'الإعدادات', description: 'إعدادات النظام المالي', icon: Settings, color: 'text-neutral-600', bgColor: 'bg-neutral-100', path: '/finance/settings' },
  ];

  // Alerts
  const alerts = [
    { type: 'warning' as const, title: 'فواتير متأخرة', description: '5 فواتير تجاوزت تاريخ الاستحقاق', action: 'عرض', onAction: () => navigate('/finance/invoices') },
    { type: 'info' as const, title: 'إقفال شهري', description: 'يجب إقفال شهر نوفمبر قبل 10 ديسمبر', action: 'إقفال', onAction: () => {} },
  ];

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Test Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 text-center text-sm">
        <FlaskConical className="w-4 h-4 inline ml-2" />
        <span className="font-medium">وضع الاختبار</span> - تصميم جديد للمركز المالي
        <Link to="/finance/hub" className="mr-4 underline hover:no-underline">
          العودة للتصميم الأصلي
        </Link>
      </div>

      <div className="p-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/finance/hub">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 bg-gradient-to-br from-coral-500 to-coral-600 rounded-xl flex items-center justify-center shadow-lg">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                المركز المالي
                <Badge className="bg-purple-100 text-purple-700 text-xs">تجريبي</Badge>
              </h1>
              <p className="text-sm text-neutral-500">إدارة شاملة للعمليات المالية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64 hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="بحث في المالية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white border-neutral-200"
              />
            </div>

            {/* Notifications */}
            <Button variant="outline" size="icon" className="relative bg-white">
              <Bell className="w-4 h-4 text-neutral-500" />
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-coral-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Back to original */}
            <Link to="/finance/hub">
              <Button variant="outline" className="gap-2 bg-white">
                التصميم الأصلي
              </Button>
            </Link>
          </div>
        </header>

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

          {/* Stats Row */}
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="إجمالي الإيرادات"
              value={formatCurrency(stats?.monthlyRevenue || 125000)}
              change={12}
              trend="up"
              icon={TrendingUp}
              iconBg="bg-green-100 text-green-600"
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/reports')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="المصروفات"
              value={formatCurrency(45000)}
              change={-5}
              trend="down"
              icon={TrendingDown}
              iconBg="bg-red-100 text-red-600"
              subtitle="هذا الشهر"
              onClick={() => navigate('/finance/reports')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="الفواتير المعلقة"
              value="12"
              icon={FileText}
              iconBg="bg-amber-100 text-amber-600"
              subtitle={formatCurrency(85000)}
              onClick={() => navigate('/finance/invoices')}
            />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <StatCard
              title="رصيد الخزينة"
              value={formatCurrency(320000)}
              icon={Wallet}
              iconBg="bg-coral-100 text-coral-600"
              subtitle="محدث الآن"
              onClick={() => navigate('/finance/treasury')}
            />
          </div>

          {/* Revenue Chart */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-neutral-900">الأداء المالي</h3>
                  <p className="text-xs text-neutral-400">مقارنة الإيرادات والمصروفات</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-coral-500" />
                    <span className="text-neutral-600">الإيرادات</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-neutral-600">المصروفات</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e85a4f" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#e85a4f" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${v/1000}K`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                    <Area type="monotone" dataKey="revenue" stroke="#e85a4f" strokeWidth={2} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="expenses" stroke="#3b82f6" strokeWidth={2} fill="url(#colorExpenses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cash Flow Pie */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm h-full">
              <h3 className="font-bold text-neutral-900 mb-2">توزيع طرق الدفع</h3>
              <div className="h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashFlowData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      dataKey="value"
                    >
                      {cashFlowData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-neutral-900">100%</p>
                  <p className="text-[10px] text-neutral-400">إجمالي</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {cashFlowData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-neutral-600">{item.name}</span>
                    <span className="text-xs font-bold text-neutral-900 mr-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
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

        </div>
      </div>
    </div>
  );
};

export default FinanceHubExperimental;

