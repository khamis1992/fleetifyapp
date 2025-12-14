/**
 * لوحة تحكم ذكية لصفحة العملاء
 * تعرض إحصائيات شاملة وتنبيهات ذكية
 * متوافقة مع تصميم Bento Dashboard
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Building2,
  Star,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Calendar,
  Phone,
  Banknote,
  Target,
  ExternalLink,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerStats } from '@/hooks/useCustomerStats';
import { DocumentAlertsPanel, DocumentAlertsBadge } from './DocumentAlertsPanel';

interface CustomersSmartDashboardProps {
  onFilterChange?: (filter: string) => void;
  onCustomerClick?: (customerId: string) => void;
}

// بطاقة إحصائية - متوافقة مع Bento
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
  trendValue,
  onClick,
  progressValue,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'coral' | 'blue' | 'green' | 'amber' | 'purple' | 'cyan';
  subtitle?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  onClick?: () => void;
  progressValue?: number;
}) {
  const colorStyles = {
    coral: { bg: 'bg-coral-100', text: 'text-coral-600', fill: 'bg-coral-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', fill: 'bg-blue-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', fill: 'bg-green-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', fill: 'bg-amber-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', fill: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', fill: 'bg-cyan-500' },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center', style.bg, style.text)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <div className="flex items-center gap-2">
          {trend && trendValue && (
            <motion.span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-coral-100 text-coral-600'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {trendValue}
            </motion.span>
          )}
          <ExternalLink className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 font-medium mb-1">{title}</p>
      <motion.p
        className="text-2xl font-bold text-neutral-900 leading-none"
        key={String(value)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </motion.p>
      {subtitle && <p className="text-[10px] text-neutral-400 mt-1">{subtitle}</p>}

      {progressValue !== undefined && (
        <div className="mt-auto pt-3">
          <div className="h-[5px] bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', style.fill)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressValue, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>
      )}

      <motion.div
        className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ y: 5 }}
        animate={{ y: 0 }}
      >
        <span className="text-[8px] text-coral-500 font-medium">انقر للتفاصيل ←</span>
      </motion.div>
    </motion.div>
  );
}

export function CustomersSmartDashboard({ onFilterChange, onCustomerClick }: CustomersSmartDashboardProps) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useCustomerStats();

  // حساب نسبة العقود النشطة
  const activeContractRate = useMemo(() => {
    if (!stats) return 0;
    if (stats.totalCustomers === 0) return 0;
    return Math.round((stats.customersWithActiveContracts / stats.totalCustomers) * 100);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-[1.25rem] p-4 h-32 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 rounded-xl mb-3" />
              <div className="h-3 bg-neutral-200 rounded w-16 mb-2" />
              <div className="h-6 bg-neutral-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const documentsAlertCount = (stats?.expiredLicenses || 0) + (stats?.expiredNationalIds || 0) +
    (stats?.expiringLicenses || 0) + (stats?.expiringNationalIds || 0);

  return (
    <div className="space-y-6">
      {/* الصف الأول: الإحصائيات الرئيسية */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="إجمالي العملاء"
          value={stats?.totalCustomers || 0}
          icon={Users}
          color="coral"
          subtitle={`${stats?.activeCustomers || 0} نشط`}
          onClick={() => onFilterChange?.('all')}
        />
        <StatCard
          title="عملاء أفراد"
          value={stats?.individualCount || 0}
          icon={UserCheck}
          color="blue"
          onClick={() => onFilterChange?.('individual')}
        />
        <StatCard
          title="عملاء شركات"
          value={stats?.corporateCount || 0}
          icon={Building2}
          color="purple"
          onClick={() => onFilterChange?.('corporate')}
        />
        <StatCard
          title="عملاء VIP"
          value={stats?.vipCount || 0}
          icon={Star}
          color="amber"
          onClick={() => onFilterChange?.('vip')}
        />
        <StatCard
          title="عقود نشطة"
          value={stats?.customersWithActiveContracts || 0}
          icon={FileText}
          color="green"
          progressValue={activeContractRate}
          subtitle={`${activeContractRate}% من العملاء`}
          onClick={() => onFilterChange?.('with_contracts')}
        />
        <StatCard
          title="جدد هذا الأسبوع"
          value={stats?.newCustomersThisWeek || 0}
          icon={TrendingUp}
          color="cyan"
          trend={stats?.newCustomersThisWeek && stats.newCustomersThisWeek > 0 ? 'up' : undefined}
          trendValue={stats?.newCustomersThisWeek && stats.newCustomersThisWeek > 0 ? 'جديد' : undefined}
          onClick={() => onFilterChange?.('new')}
        />
      </div>

      {/* الصف الثاني: المالي والتنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* بطاقات مالية */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="مستحقات متأخرة"
            value={stats?.customersWithOverdue || 0}
            icon={AlertTriangle}
            color="coral"
            subtitle="عميل متأخر"
            onClick={() => onFilterChange?.('overdue')}
          />
          <StatCard
            title="إجمالي المستحق"
            value={`${((stats?.totalOutstanding || 0) / 1000).toFixed(1)}K`}
            icon={Banknote}
            color="amber"
            subtitle="ر.ق"
            onClick={() => onFilterChange?.('pending')}
          />
          <StatCard
            title="بدون عقود"
            value={stats?.customersWithoutContracts || 0}
            icon={UserX}
            color="purple"
            subtitle="فرصة بيع"
            onClick={() => onFilterChange?.('no_contracts')}
          />
          <StatCard
            title="تفاعلات اليوم"
            value={stats?.interactionsToday || 0}
            icon={Phone}
            color="green"
            subtitle={`${stats?.interactionsThisWeek || 0} هذا الأسبوع`}
            onClick={() => navigate('/customers/crm')}
          />
        </div>

        {/* تنبيهات الوثائق */}
        {documentsAlertCount > 0 && (
          <div className="lg:col-span-1">
            <DocumentAlertsPanel
              onCustomerClick={onCustomerClick}
              maxItems={4}
              compact
            />
          </div>
        )}
      </div>

      {/* تنبيه القائمة السوداء */}
      {stats?.blacklistedCount && stats.blacklistedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-coral-50 border border-coral-200 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <p className="font-semibold text-coral-800">{stats.blacklistedCount} عميل في القائمة السوداء</p>
              <p className="text-xs text-coral-600">انقر لعرض التفاصيل</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange?.('blacklisted')}
            className="px-4 py-2 bg-coral-100 text-coral-700 rounded-lg text-sm font-medium hover:bg-coral-200 transition-colors"
          >
            عرض
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

