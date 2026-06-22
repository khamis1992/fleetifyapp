import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonFormProps {
  /** Number of form fields */
  fields?: number;
  /** Show form header/title */
  showHeader?: boolean;
  /** Number of columns (1 or 2) */
  columns?: 1 | 2;
  /** Show submit button */
  showActions?: boolean;
}

export const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 4,
  showHeader = true,
  columns = 1,
  showActions = true,
}) => {
  const FieldSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" /> {/* Label */}
      <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
    </div>
  );

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {columns === 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: fields }).map((_, index) => (
              <FieldSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: fields }).map((_, index) => (
              <FieldSkeleton key={index} />
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkeletonForm;

