import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonTableProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Show table header */
  showHeader?: boolean;
  /** Show pagination */
  showPagination?: boolean;
  /** Show search/filter area */
  showFilters?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 5,
  showHeader = true,
  showPagination = true,
  showFilters = false,
}) => {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 max-w-xs" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Table Header */}
          {showHeader && (
            <div className="flex items-center gap-4 pb-3 border-b">
              {Array.from({ length: columns }).map((_, index) => (
                <Skeleton key={`header-${index}`} className="h-4 flex-1" />
              ))}
            </div>
          )}

          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex items-center gap-4 py-3 border-b last:border-0">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="h-4 flex-1"
                  style={{
                    width: colIndex === 0 ? '20%' : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {showPagination && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkeletonTable;
