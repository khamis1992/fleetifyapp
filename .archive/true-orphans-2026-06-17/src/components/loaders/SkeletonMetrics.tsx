import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonMetricsProps {
  /** Number of metric cards */
  count?: number;
  /** Grid columns on different screens */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** Show trend indicator */
  showTrend?: boolean;
}

export const SkeletonMetrics: React.FC<SkeletonMetricsProps> = ({
  count = 4,
  columns = { sm: 2, md: 2, lg: 4 },
  showTrend = true,
}) => {
  const MetricCardSkeleton = () => (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {/* Label */}
          <Skeleton className="h-4 w-20" />
          {/* Value */}
          <Skeleton className="h-8 w-28" />
          {/* Trend */}
          {showTrend && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          )}
        </div>
        {/* Icon */}
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );

  const gridClass = `grid gap-4 grid-cols-${columns.sm || 2} md:grid-cols-${columns.md || 2} lg:grid-cols-${columns.lg || 4}`;

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default SkeletonMetrics;

