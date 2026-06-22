/**
 * لوحة الإحصائيات الذكية للصيانة
 * تصميم Bento Dashboard متوافق مع الداشبورد الرئيسية
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Car,
  TrendingUp,
  Banknote,
  RefreshCw,
  ShieldCheck,
  Target,
  Calendar,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'coral' | 'green' | 'amber' | 'blue' | 'purple' | 'neutral';
  subtitle?: string;
  progressValue?: number;
  trend?: 'up' | 'down';
  trendValue?: string;
  onClick?: () => void;
}

const colorClasses = {
  coral: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-coral-600',
    text: 'text-coral-600',
    progress: 'bg-rose-500',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
    progress: 'bg-green-500',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
    progress: 'bg-amber-500',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
    progress: 'bg-blue-500',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
    progress: 'bg-purple-500',
  },
  neutral: {
    bg: 'bg-neutral-50',
    icon: 'bg-neutral-100 text-neutral-600',
    text: 'text-neutral-600',
    progress: 'bg-neutral-500',
  },
};

function StatCard({ title, value, icon: Icon, color, subtitle, progressValue, trend, trendValue, onClick }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100 cursor-pointer transition-all duration-200",
        onClick && "hover:border-rose-200"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-coral-700'
          )}>
            <TrendingUp className={cn("w-3 h-3", trend === 'down' && "rotate-180")} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      
      <p className="text-xs text-neutral-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      
      {subtitle && (
        <p className={cn("text-xs mt-1", colors.text)}>{subtitle}</p>
      )}
      
      {progressValue !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn("h-full rounded-full", colors.progress)}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface MaintenanceSmartDashboardProps {
  onFilterChange?: (filter: string) => void;
}

export function MaintenanceSmartDashboard({ onFilterChange }: MaintenanceSmartDashboardProps) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useMaintenanceStats();

  // حساب معدل الإنجاز
  const completionRate = useMemo(() => {
    if (!stats) return 0;
    if (stats.totalRecords === 0) return 0;
    return Math.round((stats.completedCount / stats.totalRecords) * 100);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-[1.25rem] p-4 h-32 animate-pulse">
            <div className="w-10 h-10 bg-neutral-200 rounded-xl mb-3" />
            <div className="h-3 bg-neutral-200 rounded w-16 mb-2" />
            <div className="h-6 bg-neutral-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الصف الأول: الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="طلبات نشطة"
          value={stats?.pendingCount || 0}
          icon={Clock}
          color="coral"
          subtitle={`${stats?.inProgressCount || 0} قيد المعالجة`}
          onClick={() => onFilterChange?.('pending')}
        />
        <StatCard
          title="قيد المعالجة"
          value={stats?.inProgressCount || 0}
          icon={Wrench}
          color="amber"
          subtitle={`${stats?.vehiclesInMaintenance || 0} مركبة`}
          onClick={() => onFilterChange?.('in_progress')}
        />
        <StatCard
          title="مكتمل هذا الشهر"
          value={stats?.completedThisMonth || 0}
          icon={CheckCircle}
          color="green"
          progressValue={completionRate}
          subtitle={`${completionRate}% معدل الإنجاز`}
          onClick={() => onFilterChange?.('completed')}
        />
        <StatCard
          title="إجمالي التكاليف"
          value={`${((stats?.costThisMonth || 0) / 1000).toFixed(1)}K`}
          icon={Banknote}
          color="blue"
          subtitle="ر.ق هذا الشهر"
          onClick={() => navigate('/fleet/maintenance?tab=costs')}
        />
      </div>

      {/* الصف الثاني: ملخص سريع وتنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ملخص سريع */}
        <div className="lg:col-span-2 bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-neutral-900">ملخص سريع</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/reports/maintenance')}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              عرض التقارير
            </motion.button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <div>
                <span className="text-xs text-neutral-500 block">دورية</span>
                <span className="text-sm font-semibold text-neutral-900">{stats?.routineCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl">
              <Wrench className="w-4 h-4 text-purple-500" />
              <div>
                <span className="text-xs text-neutral-500 block">إصلاح</span>
                <span className="text-sm font-semibold text-neutral-900">{stats?.repairCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <div>
                <span className="text-xs text-neutral-500 block">طوارئ</span>
                <span className="text-sm font-semibold text-neutral-900">{stats?.emergencyCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <div>
                <span className="text-xs text-neutral-500 block">وقائية</span>
                <span className="text-sm font-semibold text-neutral-900">{stats?.preventiveCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-700">مركبات متوقفة: {stats?.vehiclesInMaintenance || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-700">متوسط الإنجاز: {stats?.averageCompletionDays || 0} يوم</span>
              </div>
            </div>
            <div className="text-sm text-neutral-500">
              متوسط التكلفة: <span className="font-semibold text-neutral-900">{(stats?.averageCost || 0).toLocaleString('en-US')} ر.ق</span>
            </div>
          </div>
        </div>

        {/* تنبيهات */}
        <div className="lg:col-span-1 bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-coral-600" />
            </div>
            <span className="font-semibold text-neutral-900">التنبيهات</span>
          </div>

          <div className="space-y-3">
            {(stats?.overdueCount || 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-rose-50 rounded-xl cursor-pointer hover:bg-rose-100 transition-colors"
                onClick={() => onFilterChange?.('overdue')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-sm text-coral-800">صيانة متأخرة</span>
                </div>
                <span className="text-sm font-bold text-coral-700">{stats?.overdueCount}</span>
              </motion.div>
            )}

            {(stats?.urgentCount || 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => onFilterChange?.('urgent')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm text-amber-800">طلبات عاجلة</span>
                </div>
                <span className="text-sm font-bold text-amber-700">{stats?.urgentCount}</span>
              </motion.div>
            )}

            {(stats?.upcomingScheduled || 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => onFilterChange?.('scheduled')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">مجدولة هذا الأسبوع</span>
                </div>
                <span className="text-sm font-bold text-blue-700">{stats?.upcomingScheduled}</span>
              </motion.div>
            )}

            {(stats?.overdueCount || 0) === 0 && (stats?.urgentCount || 0) === 0 && (stats?.upcomingScheduled || 0) === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-neutral-500">لا توجد تنبيهات حالياً</p>
              </div>
            )}
          </div>

          {/* إجمالي التكاليف المعلقة */}
          {(stats?.estimatedPendingCost || 0) > 0 && (
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">تكاليف معلقة متوقعة</span>
                <span className="text-sm font-bold text-coral-600">
                  {(stats?.estimatedPendingCost || 0).toLocaleString('en-US')} ر.ق
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

