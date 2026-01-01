/**
 * لوحة تحكم ذكية لإدارة علاقات العملاء
 * تعرض إحصائيات متقدمة وتنبيهات ذكية
 * متوافق مع تصميم Bento Dashboard
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  AlertTriangle, 
  Phone, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Banknote,
  Target,
  Scale,
  Car,
  Bell,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ألوان متوافقة مع Bento Dashboard
const COLORS = {
  coral: {
    bg: 'bg-coral-100',
    text: 'text-coral-600',
    fill: 'bg-coral-500',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    fill: 'bg-green-500',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    fill: 'bg-blue-500',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    fill: 'bg-amber-500',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    fill: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    fill: 'bg-orange-500',
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-600',
    fill: 'bg-cyan-500',
  },
  rose: {
    bg: 'bg-rose-100',
    text: 'text-rose-600',
    fill: 'bg-rose-500',
  },
};

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  latePayments: number;
  needsContact: number;
  expiringContracts: number;
  callsToday: number;
  callsThisMonth: number;
  newCustomers: number;
  activeContracts: number;
  // إحصائيات متقدمة
  totalOutstanding?: number;
  promisesToday?: number;
  upcomingFollowups?: number;
  activeLegalCases?: number;
  pendingPenalties?: number;
}

interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
  onClick?: () => void;
}

interface CRMSmartDashboardProps {
  stats: DashboardStats;
  alerts?: Alert[];
  onStatClick?: (statType: string) => void;
}

// مكون بطاقة إحصائية محسّنة - متوافق مع Bento Dashboard
function SmartStatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
  isUrgent,
  onClick,
  subValue,
  progressValue,
  progressLabel,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: 'blue' | 'green' | 'coral' | 'orange' | 'purple' | 'amber' | 'cyan' | 'rose';
  isUrgent?: boolean;
  onClick?: () => void;
  subValue?: string;
  progressValue?: number;
  progressLabel?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; fill: string }> = {
    blue: COLORS.blue,
    green: COLORS.green,
    coral: COLORS.coral,
    orange: COLORS.orange,
    purple: COLORS.purple,
    amber: COLORS.amber,
    cyan: COLORS.cyan,
    rose: COLORS.rose,
  };

  const colorStyle = colorMap[color] || COLORS.coral;

  return (
    <motion.div
      className={cn(
        "bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer relative",
        isUrgent && "ring-2 ring-coral-200"
      )}
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Urgent indicator */}
      {isUrgent && (
        <span className="absolute top-3 left-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-coral-500" />
        </span>
      )}

      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colorStyle.bg, colorStyle.text)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
        <div className="flex items-center gap-2">
          {trend && trendValue && (
            <motion.span 
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                trend === 'up' ? 'bg-green-100 text-green-600' : 
                trend === 'down' ? 'bg-red-100 text-red-600' : 
                'bg-neutral-100 text-neutral-600'
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : 
               trend === 'down' ? <TrendingDown className="w-2.5 h-2.5" /> : null}
              {trendValue}
            </motion.span>
          )}
          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ x: -5 }}
            animate={{ x: 0 }}
          >
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </motion.div>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 font-medium mb-1">{title}</p>
      <motion.div 
        className="flex items-baseline gap-1"
        key={String(value)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-[1.75rem] font-bold text-neutral-900 leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {subValue && (
          <span className="text-xs text-neutral-500">{subValue}</span>
        )}
      </motion.div>

      {/* Progress bar */}
      {progressValue !== undefined && (
        <div className="mt-auto pt-3">
          {progressLabel && (
            <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
              <span>{progressLabel}</span>
              <span className={cn('font-semibold', colorStyle.text)}>{progressValue}%</span>
            </div>
          )}
          <div className="h-[5px] bg-neutral-100 rounded-full overflow-hidden">
            <motion.div 
              className={cn('h-full rounded-full', colorStyle.fill)} 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressValue, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Hover hint */}
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

// مكون التنبيهات الذكية - متوافق مع Bento Dashboard
function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-coral-50 border-coral-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-coral-500" />;
      case 'warning':
        return <Bell className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-[1.25rem] shadow-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-[11px] text-neutral-500 font-medium mb-3 flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-coral-500" />
        تنبيهات ذكية
      </h3>
      <div className="space-y-2">
        {alerts.slice(0, 3).map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: index * 0.1 } }}
            whileHover={{ x: 4 }}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm group',
              getAlertStyles(alert.type)
            )}
            onClick={alert.onClick}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-800">{alert.title}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">{alert.description}</p>
            </div>
            {alert.action && (
              <motion.span 
                className="text-[10px] font-semibold bg-white px-2.5 py-1 rounded-full flex-shrink-0 text-coral-600 shadow-sm"
                whileHover={{ scale: 1.05 }}
              >
                {alert.action}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// مكون الملخص السريع - متوافق مع Bento Dashboard
function QuickSummary({ stats }: { stats: DashboardStats }) {
  const summaryItems = useMemo(() => [
    {
      label: 'إجمالي العملاء',
      value: stats.totalCustomers,
      icon: Users,
      color: COLORS.blue,
    },
    {
      label: 'عقود نشطة',
      value: stats.activeContracts,
      icon: Car,
      color: COLORS.green,
    },
    {
      label: 'عملاء نشطين',
      value: stats.activeCustomers,
      icon: Target,
      color: COLORS.cyan,
    },
    {
      label: 'عملاء جدد',
      value: stats.newCustomers,
      icon: TrendingUp,
      color: COLORS.purple,
    },
  ], [stats]);

  return (
    <motion.div 
      className="bg-white rounded-[1.25rem] p-5 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-neutral-500 font-medium flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-coral-500" />
          ملخص سريع
        </h3>
        <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">تحديث مباشر</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryItems.map((item, index) => (
          <motion.div 
            key={index} 
            className="text-center p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -2 }}
          >
            <motion.div 
              className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2', item.color.bg, item.color.text)}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <item.icon className="w-5 h-5" />
            </motion.div>
            <motion.p 
              className="text-xl font-bold text-neutral-900"
              key={item.value}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {item.value.toLocaleString()}
            </motion.p>
            <p className="text-[10px] text-neutral-500 mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function CRMSmartDashboard({ stats, alerts = [], onStatClick }: CRMSmartDashboardProps) {
  // توليد التنبيهات الذكية تلقائياً
  const autoAlerts = useMemo(() => {
    const generatedAlerts: Alert[] = [];

    // تنبيه المتأخرين (فقط إذا أكثر من 10% من العملاء)
    const latePercentage = stats.totalCustomers > 0 
      ? (stats.latePayments / stats.totalCustomers) * 100 
      : 0;

    if (stats.latePayments > 0 && latePercentage > 10) {
      generatedAlerts.push({
        id: 'late-payments',
        type: 'urgent',
        title: `${stats.latePayments} عميل متأخر بالدفع (${latePercentage.toFixed(1)}%)`,
        description: 'يحتاجون متابعة عاجلة لتحصيل المستحقات',
        action: 'عرض',
        onClick: () => onStatClick?.('late'),
      });
    }

    // تنبيه من يحتاجون اتصال (فقط إذا أكثر من 10 عملاء)
    if (stats.needsContact > 10) {
      generatedAlerts.push({
        id: 'needs-contact',
        type: 'warning',
        title: `${stats.needsContact} عميل لم يتم التواصل معهم`,
        description: 'مضى أكثر من 7 أيام منذ آخر تواصل',
        action: 'تواصل الآن',
        onClick: () => onStatClick?.('needs_contact'),
      });
    }

    // تنبيه العقود المنتهية قريباً (عاجل إذا أكثر من 5 عقود)
    if (stats.expiringContracts > 0) {
      generatedAlerts.push({
        id: 'expiring',
        type: stats.expiringContracts > 5 ? 'urgent' : 'warning',
        title: `${stats.expiringContracts} عقد قريب الانتهاء`,
        description: 'عقود ستنتهي خلال 30 يوم القادمة',
        action: 'مراجعة',
        onClick: () => onStatClick?.('expiring'),
      });
    }

    // تنبيه إذا لا توجد اتصالات هذا الشهر
    if (stats.callsThisMonth === 0) {
      generatedAlerts.push({
        id: 'no-calls',
        type: 'warning',
        title: 'لم يتم تسجيل اتصالات هذا الشهر',
        description: 'تأكد من تسجيل جميع الاتصالات في النظام',
        action: 'ابدأ التواصل',
        onClick: () => onStatClick?.('all'),
      });
    }

    // تنبيه القضايا القانونية
    if (stats.activeLegalCases && stats.activeLegalCases > 0) {
      generatedAlerts.push({
        id: 'legal',
        type: 'info',
        title: `${stats.activeLegalCases} قضية قانونية نشطة`,
        description: 'تحتاج متابعة قانونية',
        action: 'تفاصيل',
        onClick: () => onStatClick?.('legal'),
      });
    }

    return [...generatedAlerts, ...alerts].slice(0, 5);
  }, [stats, alerts, onStatClick]);

  return (
    <div className="space-y-6">
      {/* Quick Summary */}
      <QuickSummary stats={stats} />

      {/* Alerts */}
      {autoAlerts.length > 0 && <AlertsPanel alerts={autoAlerts} />}

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SmartStatCard
          title="اتصالات الشهر"
          value={stats.callsThisMonth}
          icon={Phone}
          color="green"
          trend={stats.callsThisMonth > 50 ? 'up' : 'stable'}
          trendValue={stats.callsThisMonth > 50 ? 'نشط' : undefined}
          progressValue={Math.min((stats.callsThisMonth / 100) * 100, 100)}
          progressLabel="الهدف الشهري"
          onClick={() => onStatClick?.('calls')}
        />
        <SmartStatCard
          title="اتصالات اليوم"
          value={stats.callsToday}
          icon={Phone}
          color="blue"
          onClick={() => onStatClick?.('calls_today')}
        />
        <SmartStatCard
          title="متأخر بالدفع"
          value={stats.latePayments}
          icon={AlertTriangle}
          color="coral"
          isUrgent={stats.latePayments > 0}
          onClick={() => onStatClick?.('late')}
        />
        <SmartStatCard
          title="يحتاج اتصال"
          value={stats.needsContact}
          icon={Clock}
          color="orange"
          onClick={() => onStatClick?.('needs_contact')}
        />
        <SmartStatCard
          title="عقود نشطة"
          value={stats.activeContracts}
          icon={Car}
          color="cyan"
          onClick={() => onStatClick?.('contracts')}
        />
        <SmartStatCard
          title="قريب الانتهاء"
          value={stats.expiringContracts}
          icon={Calendar}
          color="amber"
          isUrgent={stats.expiringContracts > 3}
          onClick={() => onStatClick?.('expiring')}
        />
      </div>

      {/* Additional Stats Row */}
      {(stats.totalOutstanding || stats.promisesToday || stats.upcomingFollowups) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.totalOutstanding !== undefined && (
            <SmartStatCard
              title="إجمالي المستحقات"
              value={stats.totalOutstanding.toLocaleString()}
              subValue="ر.ق"
              icon={Banknote}
              color="coral"
              onClick={() => onStatClick?.('outstanding')}
            />
          )}
          {stats.promisesToday !== undefined && (
            <SmartStatCard
              title="وعود اليوم"
              value={stats.promisesToday}
              icon={Target}
              color="purple"
              onClick={() => onStatClick?.('promises')}
            />
          )}
          {stats.upcomingFollowups !== undefined && (
            <SmartStatCard
              title="متابعات قادمة"
              value={stats.upcomingFollowups}
              icon={Calendar}
              color="blue"
              onClick={() => onStatClick?.('followups')}
            />
          )}
          {stats.activeLegalCases !== undefined && (
            <SmartStatCard
              title="قضايا نشطة"
              value={stats.activeLegalCases}
              icon={Scale}
              color="rose"
              onClick={() => onStatClick?.('legal')}
            />
          )}
        </div>
      )}
    </div>
  );
}

