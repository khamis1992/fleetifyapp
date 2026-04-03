import React, { useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconGradient?: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  description?: string;
  progress?: number;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconGradient = 'bg-teal-500',
  change,
  changeType = 'increase',
  description,
  progress,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPositive = changeType === 'increase';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-all duration-300 shadow-sm',
        isHovered && 'border-teal-500/50 shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl shadow-sm', iconGradient)}>
          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        {change !== undefined && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
              isPositive
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {Math.abs(change)}%
          </motion.span>
        )}
      </div>

      <div className="mb-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-slate-900 dark:text-slate-100"
        >
          {value}
        </motion.p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{title}</p>
      </div>

      {description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{description}</p>
      )}

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-teal-500 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
