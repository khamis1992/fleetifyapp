import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RiskScoreIndicatorProps {
  score: number;
  label?: string;
  labelEn?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskScoreIndicator: React.FC<RiskScoreIndicatorProps> = ({
  score,
  label,
  labelEn,
  showLabel = true,
  size = 'md',
  className,
}) => {
  // Determine color based on score
  const getColorClass = (score: number): string => {
    if (score >= 85) return 'bg-red-500 text-white border-red-600';
    if (score >= 70) return 'bg-red-400 text-white border-red-500';
    if (score >= 60) return 'bg-orange-500 text-white border-orange-600';
    if (score >= 40) return 'bg-yellow-500 text-white border-yellow-600';
    return 'bg-green-500 text-white border-green-600';
  };

  // Determine size classes
  const getSizeClasses = (size: string): { badge: string; text: string } => {
    switch (size) {
      case 'sm':
        return { badge: 'h-6 px-2 text-xs', text: 'text-xs' };
      case 'lg':
        return { badge: 'h-10 px-4 text-lg font-bold', text: 'text-sm' };
      case 'md':
      default:
        return { badge: 'h-8 px-3 text-sm', text: 'text-xs' };
    }
  };

  const colorClass = getColorClass(score);
  const sizeClasses = getSizeClasses(size);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        className={cn(
          'font-bold tabular-nums',
          colorClass,
          sizeClasses.badge
        )}
      >
        {score}
      </Badge>
      {showLabel && (label || labelEn) && (
        <span className={cn('text-muted-foreground', sizeClasses.text)}>
          {label || labelEn}
        </span>
      )}
    </div>
  );
};

export default RiskScoreIndicator;
