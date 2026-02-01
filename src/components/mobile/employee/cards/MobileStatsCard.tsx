/**
 * Mobile Stats Card
 * بطاقة عرض الإحصائيات
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileStatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string; // Tailwind gradient class (e.g., 'from-blue-500 to-blue-600')
  onClick?: () => void;
  className?: string;
}

export const MobileStatsCard: React.FC<MobileStatsCardProps> = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  onClick,
  className,
}) => {
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-5 text-right',
        onClick && 'cursor-pointer hover:shadow-lg hover:border-teal-200/50 active:scale-[0.98]',
        'transition-all duration-200',
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        'p-2.5 rounded-2xl bg-gradient-to-br shadow-lg mb-3 w-fit',
        color,
        'shadow-teal-500/20'
      )}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-slate-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Label */}
      <p className="text-sm text-slate-500 mb-1">{label}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-teal-600 font-medium">{subtitle}</p>
      )}
    </Component>
  );
};

export default MobileStatsCard;
