import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, EmptyStateType } from '@/components/ui/EmptyState';

export interface DataListProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => string | number;
  renderCard: (item: T, index: number) => React.ReactNode;
  className?: string;
  loading?: boolean;
  loadingCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyType?: EmptyStateType;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /**
   * Controls the number of skeleton cards to show while loading.
   * @default 4
   */
  skeletonCount?: number;
}

export function DataList<T>({
  items,
  keyExtractor,
  renderCard,
  className,
  loading = false,
  loadingCount = 4,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emptyAction,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataListProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        type={emptyType || 'no-data'}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)} role="list">
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)} role="listitem">
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}
