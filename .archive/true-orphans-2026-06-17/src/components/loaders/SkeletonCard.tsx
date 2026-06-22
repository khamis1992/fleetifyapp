import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  /** Show header with icon and title */
  showHeader?: boolean;
  /** Number of content lines */
  lines?: number;
  /** Show action button at bottom */
  showAction?: boolean;
  /** Card variant */
  variant?: 'default' | 'compact' | 'metric';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showHeader = true,
  lines = 3,
  showAction = false,
  variant = 'default',
}) => {
  if (variant === 'metric') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-16 mt-2" />
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-4"
            style={{ width: `${85 - index * 10}%` }}
          />
        ))}
        {showAction && (
          <Skeleton className="h-9 w-full mt-4 rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
};

export default SkeletonCard;

