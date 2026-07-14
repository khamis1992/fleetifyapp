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

const variantStyles: Record<string, { icon: string; bg: string; textDark: string; textLight: string }> = {
  default: { icon: 'bg-[#64748B]', bg: 'bg-[#F1F5F9]', textDark: 'text-[#334155]', textLight: 'text-[#64748B]' },
  success: { icon: 'bg-[#22C7A1]', bg: 'bg-[#E8FBF6]', textDark: 'text-[#16836D]', textLight: 'text-[#22C7A1]' },
  warning: { icon: 'bg-[#F59E0B]', bg: 'bg-[#FFFBEB]', textDark: 'text-[#B45309]', textLight: 'text-[#F59E0B]' },
  danger: { icon: 'bg-[#FB6B7A]', bg: 'bg-[#FFF0F2]', textDark: 'text-[#C53F51]', textLight: 'text-[#FB6B7A]' },
  coral: { icon: 'bg-[#FB6B7A]', bg: 'bg-[#FFF0F2]', textDark: 'text-[#C53F51]', textLight: 'text-[#FB6B7A]' },
  emerald: { icon: 'bg-[#22C7A1]', bg: 'bg-[#E8FBF6]', textDark: 'text-[#16836D]', textLight: 'text-[#22C7A1]' },
  violet: { icon: 'bg-[#7C83F6]', bg: 'bg-[#ECEEFE]', textDark: 'text-[#555CCB]', textLight: 'text-[#7C83F6]' },
  amber: { icon: 'bg-[#F59E0B]', bg: 'bg-[#FFFBEB]', textDark: 'text-[#B45309]', textLight: 'text-[#F59E0B]' },
  sky: { icon: 'bg-[#38BDF8]', bg: 'bg-[#EAF8FE]', textDark: 'text-[#087EA4]', textLight: 'text-[#38BDF8]' },
  slate: { icon: 'bg-[#64748B]', bg: 'bg-[#F1F5F9]', textDark: 'text-[#334155]', textLight: 'text-[#64748B]' },
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
  const iconBgClass = iconBg || style.icon;

  const trendStyles = {
    up: 'bg-green-100 text-green-600',
    down: 'bg-red-100 text-red-600',
    neutral: 'bg-slate-100 text-slate-600',
  };

  if (loading) {
    return (
      <motion.div
        className={cn(
          'min-h-[148px] bg-white rounded-lg p-5 shadow-sm border border-slate-200',
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
        'min-h-[148px] bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-all border border-slate-200',
        onClick && 'cursor-pointer hover:border-primary/30',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animations.durationMs.normal / 1000, delay }}
      onClick={onClick}
      {...(onClick
        ? {
            whileHover: { scale: 1.02, y: -4 },
            whileTap: { scale: 0.98 },
          }
        : {})}
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
