import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WidgetSkeletonProps {
  hasChart?: boolean;
  hasStats?: boolean;
  statCount?: number;
  hasHeader?: boolean;
  hasFooter?: boolean;
  className?: string;
}

export const WidgetSkeleton: React.FC<WidgetSkeletonProps> = ({
  hasChart = false,
  hasStats = false,
  statCount = 4,
  hasHeader = true,
  hasFooter = false,
  className,
}) => {
  return (
    <Card className={className}>
      {hasHeader && (
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
        {hasStats && (
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
        {hasChart && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-end gap-2 h-32">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex-1">
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
        )}

        {/* Footer */}
        {hasFooter && <Skeleton className="h-10 w-full rounded-lg" />}
      </CardContent>
    </Card>
  );
};

// Re-export Skeleton for convenience
export { Skeleton } from '@/components/ui/skeleton';

export default WidgetSkeleton;
