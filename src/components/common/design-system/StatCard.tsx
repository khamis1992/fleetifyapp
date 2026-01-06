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

/**
 * StatCard - Statistics card with icon, value, and optional trend
 *
 * Usage:
 * <StatCard
 *   title="Total Revenue"
 *   value="QAR 45,231"
 *   icon={Banknote}
 *   change={12.5}
 *   changeType="increase"
 *   progress={75}
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconGradient = 'from-teal-500 to-teal-600',
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
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'relative bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl',
        isHovered && 'border-teal-500/30 shadow-xl shadow-teal-500/10',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${iconGradient} shadow-lg shadow-teal-500/20`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        {change !== undefined && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
              isPositive
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
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
          className="text-2xl font-bold text-gray-900"
        >
          {value}
        </motion.p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
      </div>

      {description && (
        <p className="text-xs text-gray-400 mt-2">{description}</p>
      )}

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
