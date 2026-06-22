import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WidgetSkeletonProps {
  className?: string;
  hasChart?: boolean;
  hasStats?: boolean;
  statCount?: number;
}

export const WidgetSkeleton: React.FC<WidgetSkeletonProps> = ({
  className,
  hasChart = false,
  hasStats = true,
  statCount = 2,
}) => {
  return (
    <Card className={cn('relative overflow-hidden bg-card/90 backdrop-blur-sm border-border/50', className)}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon placeholder */}
            <div className="h-10 w-10 rounded-lg bg-muted/50 animate-pulse" />
            {/* Title placeholder */}
            <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
          {/* Badge placeholder */}
          <div className="h-6 w-16 bg-muted/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Stats Row */}
        {hasStats && (
          <div className={cn('grid gap-4', statCount === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            {Array.from({ length: statCount }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
                <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Chart placeholder */}
        {hasChart && (
          <div className="pt-4">
            <div className="h-3 w-28 bg-muted/50 rounded animate-pulse mb-3" />
            <div className="h-40 w-full bg-muted/30 rounded-lg animate-pulse relative overflow-hidden">
              {/* Chart bars simulation */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around gap-2 p-4">
                {[40, 70, 50, 90, 60].map((height, i) => (
                  <div
                    key={i}
                    className="w-full bg-muted/50 rounded-t animate-pulse"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state placeholder (when no chart) */}
        {!hasChart && !hasStats && (
          <div className="text-center py-8 space-y-3">
            <div className="h-4 w-48 bg-muted/50 rounded animate-pulse mx-auto" />
            <div className="h-3 w-36 bg-muted/50 rounded animate-pulse mx-auto" />
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="px-6 pb-6">
        <div className="h-9 w-full bg-muted/30 rounded-md animate-pulse" />
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-muted/50 to-muted/20 w-full" />
    </Card>
  );
};

// Add shimmer animation to global CSS (will be added via index.css)
// @keyframes shimmer {
//   100% {
//     transform: translateX(100%);
//   }
// }
