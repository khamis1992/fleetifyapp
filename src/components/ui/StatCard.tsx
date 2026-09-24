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
  default: { icon: 'bg-[#5b6b52]', bg: 'bg-[#f1f4ec]', textDark: 'text-[#405a33]', textLight: 'text-[#5b6b52]' },
  success: { icon: 'bg-[#2f7966]', bg: 'bg-[#edf4e6]', textDark: 'text-[#487038]', textLight: 'text-[#2f7966]' },
  warning: { icon: 'bg-[#9b7c36]', bg: 'bg-[#faf5e7]', textDark: 'text-[#9b7c36]', textLight: 'text-[#9b7c36]' },
  danger: { icon: 'bg-[#b3694c]', bg: 'bg-[#fdf1eb]', textDark: 'text-[#b3694c]', textLight: 'text-[#b3694c]' },
  coral: { icon: 'bg-[#b3694c]', bg: 'bg-[#fdf1eb]', textDark: 'text-[#b3694c]', textLight: 'text-[#b3694c]' },
  emerald: { icon: 'bg-[#2f7966]', bg: 'bg-[#edf4e6]', textDark: 'text-[#487038]', textLight: 'text-[#2f7966]' },
  violet: { icon: 'bg-[#5b6b52]', bg: 'bg-[#f1f4ec]', textDark: 'text-[#5b6b52]', textLight: 'text-[#5b6b52]' },
  amber: { icon: 'bg-[#9b7c36]', bg: 'bg-[#faf5e7]', textDark: 'text-[#9b7c36]', textLight: 'text-[#9b7c36]' },
  sky: { icon: 'bg-[#4a707c]', bg: 'bg-[#e9f1f3]', textDark: 'text-[#4a707c]', textLight: 'text-[#4a707c]' },
  slate: { icon: 'bg-[#5b6b52]', bg: 'bg-[#f1f4ec]', textDark: 'text-[#405a33]', textLight: 'text-[#5b6b52]' },
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
    up: 'bg-[#edf4e6] text-[#487038]',
    down: 'bg-[#fdf1eb] text-[#b3694c]',
    neutral: 'bg-[#f1f4ec] text-[#5b6b52]',
  };

  if (loading) {
    return (
      <motion.div
        className={cn(
          'min-h-[148px] bg-white rounded-lg p-5 shadow-sm border border-[#dfe5d9]',
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
        'min-h-[148px] bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-all border border-[#dfe5d9]',
        onClick && 'cursor-pointer hover:border-[#9db88a]',
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
      <p className="text-sm text-[#6f7c68] mb-1">{title}</p>
      <p className="text-2xl font-bold text-[#2c4136]">{value}</p>
      {subtitle && <p className="text-xs text-[#829074] mt-1">{subtitle}</p>}
    </motion.div>
  );
};

export default StatCard;
