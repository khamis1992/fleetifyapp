import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== Risk Badge Component =====
export interface RiskBadgeProps {
  level: string;
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const config: Record<string, {
    bg: string;
    text: string;
    label: string;
    color: string;
    icon: React.ElementType;
  }> = {
    CRITICAL: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      text: 'text-red-700 dark:text-red-400',
      label: 'حرج',
      color: 'bg-red-500',
      icon: AlertCircle,
    },
    HIGH: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'عالي',
      color: 'bg-orange-500',
      icon: AlertTriangle,
    },
    MEDIUM: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'متوسط',
      color: 'bg-amber-500',
      icon: Clock,
    },
    LOW: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'منخفض',
      color: 'bg-emerald-500',
      icon: CheckCircle,
    },
    MONITOR: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'مراقبة',
      color: 'bg-blue-500',
      icon: Eye,
    },
  };

  const { bg, text, label, color, icon: Icon } = config[level] || config.MONITOR;
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Badge className={cn(bg, text, sizeClasses[size], 'font-semibold gap-1 border-0')}>
          <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          {label}
        </Badge>
        <span className="text-xs text-muted-foreground font-medium">{score}%</span>
      </div>
      {/* Visual Risk Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(score, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={cn('h-full rounded-full', color)}
          />
        </div>
        {score >= 80 && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
        {score >= 60 && score < 80 && <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default RiskBadge;
