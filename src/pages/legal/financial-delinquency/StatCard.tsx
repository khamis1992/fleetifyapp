import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * بطاقة إحصائية مع أيقونة وقيمة
 */
export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: string; isPositive: boolean };
  onClick?: () => void;
  isActive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick,
  isActive,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300",
        "hover:shadow-lg",
        onClick && "cursor-pointer",
        isActive && "ring-2 ring-offset-2"
      )}
      style={{ 
        borderColor: `hsl(${color} / 0.2)`,
        ...(isActive && { ringColor: `hsl(${color})` })
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: `linear-gradient(135deg, hsl(${color}), transparent)` }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: `hsl(${color})` }}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              <TrendingUp className="w-3 h-3" />
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-md"
          style={{ backgroundColor: `hsl(${color} / 0.1)` }}
        >
          <Icon className="h-6 w-6" style={{ color: `hsl(${color})` }} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `hsl(${color})` }} />
    </motion.div>
  );
};
