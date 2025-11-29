/**
 * مكون بطاقات المؤشرات الرئيسية للأسطول
 * Fleet KPI Cards Component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Car,
  Wallet,
  Gauge,
  Wrench,
  Target,
  CircleDollarSign,
  Activity,
  BarChart3,
} from 'lucide-react';
import type { FleetAnalyticsSummary } from '../types/reports.types';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  current?: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
  isDark: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  target,
  current,
  icon,
  color,
  delay = 0,
  isDark,
}) => {
  const showProgress = target !== undefined && current !== undefined;
  const progressValue = showProgress ? Math.min((current / target) * 100, 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5",
        "backdrop-blur-xl border",
        isDark 
          ? "bg-gray-900/60 border-gray-800/50" 
          : "bg-white/80 border-gray-200/50",
        "shadow-xl"
      )}
    >
      {/* Glow Effect */}
      <div 
        className={cn("absolute inset-0 opacity-10 blur-2xl", color)}
        style={{ background: `radial-gradient(circle at 30% 30%, currentColor, transparent)` }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2.5 rounded-xl",
            isDark ? "bg-gray-800/80" : "bg-gray-100",
            color
          )}>
            {icon}
          </div>
          {change && (
            <Badge 
              variant="outline" 
              className={cn(
                "font-medium text-xs",
                trend === 'up' && "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
                trend === 'down' && "text-rose-500 border-rose-500/30 bg-rose-500/10",
                trend === 'neutral' && "text-gray-500 border-gray-500/30 bg-gray-500/10"
              )}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3 ml-1" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 ml-1" />}
              {change}
            </Badge>
          )}
        </div>
        
        <h3 className={cn(
          "text-sm font-medium mb-1",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          {title}
        </h3>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
          className={cn(
            "text-2xl font-bold tracking-tight",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          {value}
        </motion.p>
        
        {showProgress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                الهدف: {target}
              </span>
              <span className={cn(
                progressValue >= 100 ? "text-emerald-500" : 
                progressValue >= 70 ? "text-amber-500" : "text-rose-500"
              )}>
                {progressValue.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface FleetKPICardsProps {
  analytics: FleetAnalyticsSummary | null;
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

export const FleetKPICards: React.FC<FleetKPICardsProps> = ({
  analytics,
  isDark,
  formatCurrency,
}) => {
  if (!analytics) return null;
  
  const kpiData = [
    {
      title: 'إجمالي المركبات',
      value: analytics.totalVehicles,
      change: '+5%',
      trend: 'up' as const,
      icon: <Car className="w-5 h-5 text-violet-500" />,
      color: 'text-violet-500',
    },
    {
      title: 'معدل الاستخدام',
      value: `${analytics.utilizationRate.toFixed(1)}%`,
      change: analytics.utilizationRate >= 70 ? '+12%' : '-5%',
      trend: analytics.utilizationRate >= 70 ? 'up' as const : 'down' as const,
      target: 80,
      current: analytics.utilizationRate,
      icon: <Gauge className="w-5 h-5 text-cyan-500" />,
      color: 'text-cyan-500',
    },
    {
      title: 'قيمة الأسطول',
      value: formatCurrency(analytics.totalBookValue),
      change: '-3%',
      trend: 'down' as const,
      icon: <CircleDollarSign className="w-5 h-5 text-emerald-500" />,
      color: 'text-emerald-500',
    },
    {
      title: 'تكلفة الصيانة',
      value: formatCurrency(analytics.monthlyMaintenanceCost),
      change: analytics.maintenanceRate <= 10 ? '-8%' : '+15%',
      trend: analytics.maintenanceRate <= 10 ? 'up' as const : 'down' as const,
      icon: <Wrench className="w-5 h-5 text-amber-500" />,
      color: 'text-amber-500',
    },
    {
      title: 'الإيرادات الشهرية',
      value: formatCurrency(analytics.totalRevenue),
      change: '+18%',
      trend: 'up' as const,
      icon: <Wallet className="w-5 h-5 text-rose-500" />,
      color: 'text-rose-500',
    },
    {
      title: 'صافي الربح',
      value: formatCurrency(analytics.totalProfit),
      change: `${analytics.profitMargin.toFixed(1)}%`,
      trend: analytics.profitMargin >= 20 ? 'up' as const : 'neutral' as const,
      icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
      color: 'text-indigo-500',
    },
    {
      title: 'المركبات المتاحة',
      value: analytics.availableVehicles,
      change: `${((analytics.availableVehicles / analytics.totalVehicles) * 100).toFixed(0)}%`,
      trend: 'neutral' as const,
      icon: <Activity className="w-5 h-5 text-teal-500" />,
      color: 'text-teal-500',
    },
    {
      title: 'معدل الإشغال',
      value: `${((analytics.rentedVehicles / analytics.totalVehicles) * 100).toFixed(1)}%`,
      change: '+7%',
      trend: 'up' as const,
      target: 75,
      current: (analytics.rentedVehicles / analytics.totalVehicles) * 100,
      icon: <BarChart3 className="w-5 h-5 text-orange-500" />,
      color: 'text-orange-500',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi, index) => (
        <KPICard
          key={kpi.title}
          {...kpi}
          delay={index * 0.1}
          isDark={isDark}
        />
      ))}
    </div>
  );
};

export default FleetKPICards;

