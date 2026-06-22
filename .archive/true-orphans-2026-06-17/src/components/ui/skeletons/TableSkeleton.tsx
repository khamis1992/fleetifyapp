import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  hasActions?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  className,
  rows = 5,
  columns = 5,
  hasHeader = true,
  hasActions = true,
}) => {
  return (
    <Card className={cn('relative overflow-hidden bg-card/90 backdrop-blur-sm', className)}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header section */}
      {hasHeader && (
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted/30 rounded animate-pulse" />
            </div>
            {/* Action buttons */}
            {hasActions && (
              <div className="flex gap-2">
                <div className="h-10 w-24 bg-muted/50 rounded animate-pulse" />
                <div className="h-10 w-32 bg-muted/50 rounded animate-pulse" />
              </div>
            )}
          </div>

          {/* Search and filters */}
          <div className="mt-4 flex gap-3">
            <div className="h-10 flex-1 bg-muted/50 rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted/50 rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      )}

      {/* Table content */}
      <div className="p-6">
        <div className="border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="bg-muted/20 p-4 border-b border-border/50">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-4 bg-muted/50 rounded animate-pulse',
                    i === 0 ? 'w-24' : i === columns - 1 ? 'w-20' : 'flex-1'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Table rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                'p-4 border-b border-border/30 last:border-0',
                rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'
              )}
            >
              <div className="flex gap-4 items-center">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className={cn(
                      'bg-muted/40 rounded animate-pulse',
                      colIndex === 0 ? 'h-4 w-24' : colIndex === columns - 1 ? 'h-8 w-20' : 'h-4 flex-1'
                    )}
                    style={{
                      animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="mt-4 flex items-center justify-between">
          <div className="h-4 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-9 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
