/**
 * FleetSmartDashboard - لوحة ذكية لإحصائيات الأسطول
 * تصميم احترافي يعتمد على التجميع المنطقي وشريط التوزيع المرئي
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
  Clock,
  DollarSign,
  AlertCircle,
  FileWarning,
  MapPin,
  Building2,
  Lock,
  UserCheck,
  Ban,
  MoreHorizontal,
  LayoutGrid,
  PieChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ===== Color Maps =====
const colorMap = {
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    textDark: 'text-purple-700',
    iconBg: 'bg-purple-100',
    ring: 'ring-purple-200',
    bar: 'bg-purple-500'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    textDark: 'text-amber-700',
    iconBg: 'bg-amber-100',
    ring: 'ring-amber-200',
    bar: 'bg-amber-500'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    textDark: 'text-red-700',
    iconBg: 'bg-red-100',
    ring: 'ring-red-200',
    bar: 'bg-red-500'
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    textDark: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    ring: 'ring-emerald-200',
    bar: 'bg-emerald-500'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    iconBg: 'bg-blue-100',
    ring: 'ring-blue-200',
    bar: 'bg-blue-600'
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    textDark: 'text-teal-700',
    iconBg: 'bg-teal-100',
    ring: 'ring-teal-200',
    bar: 'bg-teal-500'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    textDark: 'text-indigo-700',
    iconBg: 'bg-indigo-100',
    ring: 'ring-indigo-200',
    bar: 'bg-indigo-500'
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    textDark: 'text-rose-700',
    iconBg: 'bg-rose-100',
    ring: 'ring-rose-200',
    bar: 'bg-rose-500'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    textDark: 'text-orange-700',
    iconBg: 'bg-orange-100',
    ring: 'ring-orange-200',
    bar: 'bg-orange-500'
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    textDark: 'text-slate-700',
    iconBg: 'bg-slate-100',
    ring: 'ring-slate-200',
    bar: 'bg-slate-500'
  }
};

type ColorKey = keyof typeof colorMap;

// ===== Status Group Component =====
interface StatusGroupProps {
  title: string;
  total: number;
  color: ColorKey;
  items: Array<{
    label: string;
    value: number;
    icon: React.ElementType;
    statusKey: string;
    color: ColorKey;
  }>;
  onFilter: (status: string) => void;
  activeStatus?: string;
}

const StatusGroup: React.FC<StatusGroupProps> = ({
  title,
  total,
  color,
  items,
  onFilter,
  activeStatus,
}) => {
  const groupStyles = colorMap[color];

  if (total === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-neutral-700 dark:text-slate-200">{title}</h3>
        <Badge variant="secondary" className={cn("text-xs font-mono", groupStyles.bg, groupStyles.text)}>
          {total}
        </Badge>
      </div>
      
      <div className="space-y-1.5 flex-1">
        {items.map((item) => {
          const itemStyles = colorMap[item.color];
          return (
            <button
              key={item.statusKey}
              onClick={() => onFilter(item.statusKey)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all group",
                activeStatus === item.statusKey
                  ? cn(itemStyles.bg, "dark:bg-opacity-20", "ring-1", itemStyles.ring)
                  : "hover:bg-neutral-50 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                  itemStyles.iconBg
                )}>
                  <item.icon className={cn("w-3.5 h-3.5", itemStyles.text)} />
                </div>
                <span className={cn(
                  "font-medium text-xs",
                  activeStatus === item.statusKey ? itemStyles.textDark : "text-neutral-600 dark:text-slate-300"
                )}>
                  {item.label}
                </span>
              </div>
              <span className={cn(
                "font-bold font-mono text-sm",
                activeStatus === item.statusKey ? itemStyles.text : "text-neutral-900 dark:text-slate-100"
              )}>
                {item.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ===== Main Stats Header =====
interface StatHeaderProps {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'red';
  onClick: () => void;
  isActive: boolean;
}

const StatHeader: React.FC<StatHeaderProps> = ({
  label,
  value,
  total,
  icon: Icon,
  color,
  onClick,
  isActive
}) => {
  const percentage = Math.round((value / total) * 100) || 0;
  
  const colors = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500' },
    blue: { bg: 'bg-blue-600', light: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500' },
    red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500' },
  };
  const style = colors[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-sm transition-all text-right relative overflow-hidden group min-h-[44px]",
        isActive && `ring-2 ${style.ring}`
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.light)}>
          <Icon className={cn("w-4 h-4", style.text)} />
        </div>
        <div className="text-right">
          <h4 className="text-lg font-bold text-neutral-800 dark:text-slate-100">{value}</h4>
          <p className="text-xs text-neutral-500 dark:text-slate-400">{label}</p>
        </div>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", style.light, style.text)}>
          {percentage}%
        </span>
      </div>
    </button>
  );
};

// ===== Fleet Smart Dashboard =====
interface FleetSmartDashboardProps {
  onFilterByStatus?: (status: string) => void;
  activeStatus?: string;
}

export const FleetSmartDashboard: React.FC<FleetSmartDashboardProps> = ({
  onFilterByStatus,
  activeStatus,
}) => {
  const { data: stats, isLoading } = useVehicleStats();

  if (isLoading || !stats) {
    return <div className="h-64 bg-neutral-50 rounded-xl animate-pulse" />;
  }

  // Group Definitions
  const groups: Array<{
    title: string;
    total: number;
    color: ColorKey;
    items: Array<{
      label: string;
      value: number;
      icon: React.ElementType;
      statusKey: string;
      color: ColorKey;
    }>;
  }> = [
    {
      title: 'التشغيل والتوقف المؤقت',
      total: stats.street52Vehicles + stats.reservedEmployeeVehicles + stats.municipalityVehicles,
      color: 'purple',
      items: [
        { label: 'شارع 52', value: stats.street52Vehicles, icon: MapPin, statusKey: 'street_52', color: 'purple' },
        { label: 'البلدية', value: stats.municipalityVehicles, icon: Building2, statusKey: 'municipality', color: 'teal' },
        { label: 'محجوزة لموظف', value: stats.reservedEmployeeVehicles, icon: UserCheck, statusKey: 'reserved_employee', color: 'indigo' },
      ]
    },
    {
      title: 'الصيانة والأعطال',
      total: stats.maintenanceVehicles + stats.outOfServiceVehicles + stats.accidentVehicles,
      color: 'amber',
      items: [
        { label: 'صيانة دورية', value: stats.maintenanceVehicles, icon: Wrench, statusKey: 'maintenance', color: 'amber' },
        { label: 'خارج الخدمة', value: stats.outOfServiceVehicles, icon: Ban, statusKey: 'out_of_service', color: 'red' },
        { label: 'حوادث', value: stats.accidentVehicles, icon: AlertTriangle, statusKey: 'accident', color: 'rose' },
      ]
    },
    {
      title: 'قضايا ومخالفات',
      total: stats.policeStationVehicles + stats.stolenVehicles,
      color: 'red',
      items: [
        { label: 'مركز الشرطة', value: stats.policeStationVehicles, icon: Shield, statusKey: 'police_station', color: 'orange' },
        { label: 'مسروقة', value: stats.stolenVehicles, icon: Lock, statusKey: 'stolen', color: 'slate' },
      ]
    }
  ];

  const totalIssues = groups[1].total + groups[2].total;

  return (
    <div className="space-y-4">
      
      {/* 1. Compact KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatHeader 
          label="المتاحة" 
          value={stats.availableVehicles} 
          total={stats.totalVehicles}
          icon={CheckCircle}
          color="emerald"
          onClick={() => onFilterByStatus?.('available')}
          isActive={activeStatus === 'available'}
        />
        <StatHeader 
          label="المؤجرة" 
          value={stats.rentedVehicles} 
          total={stats.totalVehicles}
          icon={TrendingUp}
          color="blue"
          onClick={() => onFilterByStatus?.('rented')}
          isActive={activeStatus === 'rented'}
        />
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400">الإيرادات</p>
                 <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(stats.totalMonthlyRevenue)}
                 </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500 dark:text-slate-400">الصحة</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{stats.fleetHealthScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Status Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {groups.map((group, idx) => (
          <StatusGroup 
            key={idx}
            title={group.title}
            total={group.total}
            color={group.color}
            items={group.items}
            onFilter={(s) => onFilterByStatus?.(s)}
            activeStatus={activeStatus}
          />
        ))}
      </div>

      {/* 3. Alerts Banner (Only if needed) */}
      {(stats.insuranceExpired > 0 || stats.registrationExpired > 0) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">تنبيهات هامة</p>
              <p className="text-xs text-red-600 dark:text-red-400">
                يوجد {stats.insuranceExpired} تأمين منتهي و {stats.registrationExpired} فحص دوري منتهي
              </p>
            </div>
          </div>
          <button className="text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg font-semibold text-red-700 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800 min-h-[44px]">
            عرض التفاصيل
          </button>
        </div>
      )}
    </div>
  );
};

// Helper for mini health score
const HealthScoreDisplayMini = ({ score }: { score: number }) => {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
        <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="4" fill="none" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {score}
      </div>
    </div>
  );
};

export default FleetSmartDashboard;
