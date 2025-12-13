/**
 * لوحة تحكم ذكية لإدارة علاقات العملاء
 * تعرض إحصائيات متقدمة وتنبيهات ذكية
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
  CheckCircle,
  XCircle,
  FileText,
  Scale,
  Car,
  Bell,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// مكون بطاقة إحصائية محسّنة
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
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow' | 'cyan' | 'pink';
  isUrgent?: boolean;
  onClick?: () => void;
  subValue?: string;
}) {
  const colorStyles = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      icon: 'bg-blue-500 text-white',
      text: 'text-blue-600',
      ring: 'ring-blue-200',
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      icon: 'bg-emerald-500 text-white',
      text: 'text-emerald-600',
      ring: 'ring-emerald-200',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      icon: 'bg-[#F15555] text-white',
      text: 'text-[#F15555]',
      ring: 'ring-red-200',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
      icon: 'bg-orange-500 text-white',
      text: 'text-orange-600',
      ring: 'ring-orange-200',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      icon: 'bg-purple-500 text-white',
      text: 'text-purple-600',
      ring: 'ring-purple-200',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50',
      icon: 'bg-yellow-500 text-white',
      text: 'text-yellow-600',
      ring: 'ring-yellow-200',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50',
      icon: 'bg-cyan-500 text-white',
      text: 'text-cyan-600',
      ring: 'ring-cyan-200',
    },
    pink: {
      bg: 'bg-gradient-to-br from-pink-50 to-pink-100/50',
      icon: 'bg-pink-500 text-white',
      text: 'text-pink-600',
      ring: 'ring-pink-200',
    },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-2xl border transition-all cursor-pointer',
        style.bg,
        isUrgent ? `ring-2 ${style.ring} shadow-lg` : 'shadow-sm hover:shadow-md'
      )}
    >
      {/* Urgent indicator */}
      {isUrgent && (
        <span className="absolute top-3 left-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl shadow-sm', style.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        <span className={cn('text-3xl font-black tracking-tight', style.text)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {subValue && (
          <span className="text-sm text-gray-500 mr-2">{subValue}</span>
        )}
        <p className="text-sm text-gray-600 font-medium mt-1">{title}</p>
      </div>
    </motion.div>
  );
}

// مكون التنبيهات الذكية
function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Bell className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 mb-6">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4 text-[#F15555]" />
        تنبيهات ذكية
      </h3>
      <div className="space-y-2">
        {alerts.slice(0, 3).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition hover:shadow-sm',
              getAlertStyles(alert.type)
            )}
            onClick={alert.onClick}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
            </div>
            {alert.action && (
              <span className="text-xs font-medium bg-white/50 px-2 py-1 rounded-full flex-shrink-0">
                {alert.action}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// مكون الملخص السريع
function QuickSummary({ stats }: { stats: DashboardStats }) {
  const summaryItems = useMemo(() => [
    {
      label: 'إجمالي العملاء',
      value: stats.totalCustomers,
      icon: Users,
    },
    {
      label: 'عقود نشطة',
      value: stats.activeContracts,
      icon: Car,
    },
    {
      label: 'عملاء نشطين',
      value: stats.activeCustomers,
      icon: CheckCircle,
    },
    {
      label: 'عملاء جدد',
      value: stats.newCustomers,
      icon: TrendingUp,
    },
  ], [stats]);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          ملخص سريع
        </h3>
        <span className="text-xs text-white/60">تحديث مباشر</span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {summaryItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <item.icon className="w-5 h-5 text-white/40" />
            </div>
            <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
            <p className="text-xs text-white/60 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CRMSmartDashboard({ stats, alerts = [], onStatClick }: CRMSmartDashboardProps) {
  // توليد التنبيهات الذكية تلقائياً
  const autoAlerts = useMemo(() => {
    const generatedAlerts: Alert[] = [];

    if (stats.latePayments > 0) {
      generatedAlerts.push({
        id: 'late-payments',
        type: 'urgent',
        title: `${stats.latePayments} عميل متأخر بالدفع`,
        description: 'يحتاجون متابعة عاجلة لتحصيل المستحقات',
        action: 'عرض',
        onClick: () => onStatClick?.('late'),
      });
    }

    if (stats.needsContact > 5) {
      generatedAlerts.push({
        id: 'needs-contact',
        type: 'warning',
        title: `${stats.needsContact} عميل لم يتم التواصل معهم`,
        description: 'مضى أكثر من 7 أيام منذ آخر تواصل',
        action: 'تواصل الآن',
        onClick: () => onStatClick?.('needs_contact'),
      });
    }

    if (stats.expiringContracts > 0) {
      generatedAlerts.push({
        id: 'expiring',
        type: 'warning',
        title: `${stats.expiringContracts} عقد قريب الانتهاء`,
        description: 'عقود ستنتهي خلال 30 يوم القادمة',
        action: 'مراجعة',
        onClick: () => onStatClick?.('expiring'),
      });
    }

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SmartStatCard
          title="اتصالات الشهر"
          value={stats.callsThisMonth}
          icon={Phone}
          color="green"
          trend={stats.callsThisMonth > 50 ? 'up' : 'stable'}
          trendValue={stats.callsThisMonth > 50 ? 'نشط' : '-'}
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
          color="red"
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
          color="yellow"
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
              color="red"
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
              color="pink"
              onClick={() => onStatClick?.('legal')}
            />
          )}
        </div>
      )}
    </div>
  );
}

