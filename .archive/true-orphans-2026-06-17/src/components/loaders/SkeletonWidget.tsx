import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonWidgetProps {
  /** Show header section */
  showHeader?: boolean;
  /** Number of stat items to show */
  statCount?: number;
  /** Show chart area */
  showChart?: boolean;
  /** Show footer action button */
  showFooter?: boolean;
  /** Custom height */
  height?: string;
}

export const SkeletonWidget: React.FC<SkeletonWidgetProps> = ({
  showHeader = true,
  statCount = 4,
  showChart = true,
  showFooter = true,
  height,
}) => {
  return (
    <Card className="h-full" style={height ? { height } : undefined}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        {statCount > 0 && (
          <div className={`grid grid-cols-${Math.min(statCount, 2)} gap-3`}>
            {Array.from({ length: statCount }).map((_, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border bg-muted/20 space-y-2"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Chart Area */}
        {showChart && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
              {/* Animated shimmer bars */}
              <div className="flex items-end gap-2 h-32">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex-1 relative overflow-hidden">
                    <Skeleton
                      className="w-full rounded-t"
                      style={{
                        height: `${40 + Math.random() * 60}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {showFooter && (
          <Skeleton className="h-10 w-full rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
};

export default SkeletonWidget;
