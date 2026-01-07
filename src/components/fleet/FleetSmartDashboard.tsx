/**
 * FleetSmartDashboard - لوحة ذكية لإحصائيات الأسطول
 * بنمط Bento Dashboard متوافق مع ألوان الداشبورد الرئيسية
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVehicleStats } from '@/hooks/useVehicleStats';
import {
  Car,
  CheckCircle,
  TrendingUp,
  Wrench,
  AlertTriangle,
  Shield,
  Gauge,
  DollarSign,
  Clock,
  AlertCircle,
  FileWarning,
  Calendar,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ===== Smart Stat Card =====
interface SmartStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'coral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  isActive?: boolean;
}

const SmartStatCard: React.FC<SmartStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick,
  isActive,
}) => {
  const colorStyles = {
    coral: {
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
      iconBg: 'bg-rose-500',
      text: 'text-coral-600',
      border: 'border-rose-200',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
      iconBg: 'bg-green-500',
      text: 'text-green-600',
      border: 'border-green-200',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      iconBg: 'bg-amber-500',
      text: 'text-amber-600',
      border: 'border-amber-200',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      iconBg: 'bg-red-500',
      text: 'text-red-600',
      border: 'border-red-200',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      iconBg: 'bg-purple-500',
      text: 'text-purple-600',
      border: 'border-purple-200',
    },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-lg transition-all border',
        isActive ? style.border : 'border-neutral-100',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', style.iconBg)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <Badge
            className={cn(
              'text-[10px] px-2',
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className={cn('text-3xl font-black', style.text)}>{value}</p>
        <p className="text-sm text-neutral-500 font-medium mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

// ===== Health Score Display =====
interface HealthScoreDisplayProps {
  score: number;
  title: string;
}

const HealthScoreDisplay: React.FC<HealthScoreDisplayProps> = ({ score, title }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { text: 'text-green-600', bg: 'bg-green-500', label: 'ممتاز' };
    if (s >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'جيد' };
    if (s >= 40) return { text: 'text-orange-600', bg: 'bg-orange-500', label: 'متوسط' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'يحتاج تحسين' };
  };

  const scoreStyle = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
        <Badge className={cn('text-xs', scoreStyle.bg, 'text-white')}>
          {scoreStyle.label}
        </Badge>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="40"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="56"
              cy="56"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={scoreStyle.text}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-black', scoreStyle.text)}>{score}</span>
            <span className="text-xs text-neutral-400">من 100</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Quick Summary =====
interface QuickSummaryProps {
  utilizationRate: number;
  totalVehicles: number;
  rentedVehicles: number;
  availableVehicles: number;
}

const QuickSummary: React.FC<QuickSummaryProps> = ({
  utilizationRate,
  totalVehicles,
  rentedVehicles,
  availableVehicles,
}) => {
  return (
    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-700">ملخص الأسطول</h3>
      </div>
      
      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-neutral-500">معدل الإشغال</span>
          <span className="font-bold text-coral-600">{utilizationRate}%</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${utilizationRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-rose-500 to-coral-400 rounded-full"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-neutral-50 rounded-xl">
          <p className="text-lg font-bold text-neutral-800">{totalVehicles}</p>
          <p className="text-[10px] text-neutral-500">إجمالي</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-xl">
          <p className="text-lg font-bold text-green-600">{availableVehicles}</p>
          <p className="text-[10px] text-green-600">متاحة</p>
        </div>
        <div className="text-center p-2 bg-rose-50 rounded-xl">
          <p className="text-lg font-bold text-coral-600">{rentedVehicles}</p>
          <p className="text-[10px] text-coral-600">مؤجرة</p>
        </div>
      </div>
    </div>
  );
};

// ===== Alerts Panel =====
interface AlertsPanelProps {
  insuranceExpiringSoon: number;
  registrationExpiringSoon: number;
  serviceOverdue: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  insuranceExpiringSoon,
  registrationExpiringSoon,
  serviceOverdue,
}) => {
  const totalAlerts = insuranceExpiringSoon + registrationExpiringSoon + serviceOverdue;

  return (
    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-700">تنبيهات الأسطول</h3>
        </div>
        {totalAlerts > 0 && (
          <Badge className="bg-red-500 text-white">{totalAlerts}</Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Insurance Alert */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-xl transition-colors',
          insuranceExpiringSoon > 0 ? 'bg-red-50' : 'bg-neutral-50'
        )}>
          <div className="flex items-center gap-3">
            <Shield className={cn('w-5 h-5', insuranceExpiringSoon > 0 ? 'text-red-500' : 'text-neutral-400')} />
            <span className="text-sm text-neutral-700">تأمين ينتهي قريباً</span>
          </div>
          <span className={cn(
            'text-lg font-bold',
            insuranceExpiringSoon > 0 ? 'text-red-600' : 'text-neutral-400'
          )}>
            {insuranceExpiringSoon}
          </span>
        </div>

        {/* Registration Alert */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-xl transition-colors',
          registrationExpiringSoon > 0 ? 'bg-amber-50' : 'bg-neutral-50'
        )}>
          <div className="flex items-center gap-3">
            <FileWarning className={cn('w-5 h-5', registrationExpiringSoon > 0 ? 'text-amber-500' : 'text-neutral-400')} />
            <span className="text-sm text-neutral-700">فحص دوري ينتهي</span>
          </div>
          <span className={cn(
            'text-lg font-bold',
            registrationExpiringSoon > 0 ? 'text-amber-600' : 'text-neutral-400'
          )}>
            {registrationExpiringSoon}
          </span>
        </div>

        {/* Service Alert */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-xl transition-colors',
          serviceOverdue > 0 ? 'bg-orange-50' : 'bg-neutral-50'
        )}>
          <div className="flex items-center gap-3">
            <Calendar className={cn('w-5 h-5', serviceOverdue > 0 ? 'text-orange-500' : 'text-neutral-400')} />
            <span className="text-sm text-neutral-700">صيانة متأخرة</span>
          </div>
          <span className={cn(
            'text-lg font-bold',
            serviceOverdue > 0 ? 'text-orange-600' : 'text-neutral-400'
          )}>
            {serviceOverdue}
          </span>
        </div>
      </div>
    </div>
  );
};

// ===== Main Component =====
interface FleetSmartDashboardProps {
  onFilterByStatus?: (status: string) => void;
  activeStatus?: string;
}

export const FleetSmartDashboard: React.FC<FleetSmartDashboardProps> = ({
  onFilterByStatus,
  activeStatus,
}) => {
  const { data: stats, isLoading } = useVehicleStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100 animate-pulse">
            <div className="w-12 h-12 bg-neutral-200 rounded-xl mb-4" />
            <div className="h-8 bg-neutral-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmartStatCard
          title="المركبات المتاحة"
          value={stats.availableVehicles}
          subtitle={`من ${stats.totalVehicles} مركبة`}
          icon={CheckCircle}
          color="green"
          onClick={() => onFilterByStatus?.('available')}
          isActive={activeStatus === 'available'}
        />
        <SmartStatCard
          title="المركبات المؤجرة"
          value={stats.rentedVehicles}
          subtitle={`معدل إشغال ${stats.utilizationRate}%`}
          icon={TrendingUp}
          color="coral"
          onClick={() => onFilterByStatus?.('rented')}
          isActive={activeStatus === 'rented'}
        />
        <SmartStatCard
          title="قيد الصيانة"
          value={stats.maintenanceVehicles}
          icon={Wrench}
          color="amber"
          onClick={() => onFilterByStatus?.('maintenance')}
          isActive={activeStatus === 'maintenance'}
        />
        <SmartStatCard
          title="خارج الخدمة"
          value={stats.outOfServiceVehicles + stats.accidentVehicles}
          subtitle="حوادث + خارج الخدمة"
          icon={AlertTriangle}
          color="red"
          onClick={() => onFilterByStatus?.('out_of_service')}
          isActive={activeStatus === 'out_of_service'}
        />
      </div>

      {/* KPIs and Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fleet Health Score */}
        <HealthScoreDisplay
          score={stats.fleetHealthScore}
          title="صحة الأسطول"
        />

        {/* Quick Summary */}
        <QuickSummary
          utilizationRate={stats.utilizationRate}
          totalVehicles={stats.totalVehicles}
          rentedVehicles={stats.rentedVehicles}
          availableVehicles={stats.availableVehicles}
        />

        {/* Revenue Card */}
        <SmartStatCard
          title="الإيرادات الشهرية"
          value={formatCurrency(stats.totalMonthlyRevenue)}
          subtitle={`متوسط ${formatCurrency(stats.averageRevenuePerVehicle)} / مركبة`}
          icon={DollarSign}
          color="blue"
        />

        {/* Alerts Panel */}
        <AlertsPanel
          insuranceExpiringSoon={stats.insuranceExpiringSoon}
          registrationExpiringSoon={stats.registrationExpiringSoon}
          serviceOverdue={stats.serviceOverdue}
        />
      </div>
    </div>
  );
};

export default FleetSmartDashboard;

