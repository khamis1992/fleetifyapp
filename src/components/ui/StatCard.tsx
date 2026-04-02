import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations } from '@/lib/design-tokens';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'coral' | 'emerald' | 'violet' | 'amber' | 'sky' | 'slate';
  trend?: 'up' | 'down' | 'neutral';
  change?: string | number;
  changePercent?: number;
  delay?: number;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<string, { gradient: string; bg: string; textDark: string; textLight: string }> = {
  default: { gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-100', textDark: 'text-slate-700', textLight: 'text-slate-500' },
  success: { gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-100', textDark: 'text-green-700', textLight: 'text-green-500' },
  warning: { gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-100', textDark: 'text-amber-700', textLight: 'text-amber-500' },
  danger: { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-100', textDark: 'text-red-700', textLight: 'text-red-500' },
  coral: { gradient: 'from-rose-500 to-orange-500', bg: 'bg-rose-100', textDark: 'text-rose-700', textLight: 'text-rose-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-100', textDark: 'text-emerald-700', textLight: 'text-emerald-500' },
  violet: { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-100', textDark: 'text-violet-700', textLight: 'text-violet-500' },
  amber: { gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-100', textDark: 'text-amber-700', textLight: 'text-amber-500' },
  sky: { gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-100', textDark: 'text-sky-700', textLight: 'text-sky-500' },
  slate: { gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-100', textDark: 'text-slate-700', textLight: 'text-slate-500' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  variant = 'coral',
  trend = 'neutral',
  change,
  changePercent,
  delay = 0,
  loading = false,
  onClick,
  className,
}) => {
  const style = variantStyles[variant] || variantStyles.default;
  const iconBgClass = iconBg || `bg-gradient-to-br ${style.gradient}`;

  const trendStyles = {
    up: 'bg-green-100 text-green-600',
    down: 'bg-red-100 text-red-600',
    neutral: 'bg-slate-100 text-slate-600',
  };

  if (loading) {
    return (
      <motion.div
        className={cn(
          'bg-white rounded-2xl p-5 shadow-sm border border-slate-100',
          'animate-pulse',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: animations.durationMs.normal / 1000, delay }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-12 h-12 rounded-xl', style.bg)} />
        </div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
        <div className="h-6 bg-slate-200 rounded w-3/4" />
        {subtitle && <div className="h-3 bg-slate-200 rounded w-1/3 mt-2" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-slate-100',
        onClick && 'cursor-pointer hover:border-primary/30',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animations.durationMs.normal / 1000, delay }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgClass)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {(change !== undefined || changePercent !== undefined) && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg',
              trendStyles[trend]
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {changePercent !== undefined ? `${changePercent}%` : change}
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
    </motion.div>
  );
};

export default StatCard;