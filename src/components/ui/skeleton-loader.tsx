import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

/**
 * Skeleton Loader Component
 * Provides better UX during data loading
 */
export const Skeleton = ({
  className,
  variant = 'rectangular',
  width,
  height,
  count = 1,
  ...props
}: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-md",
    card: "rounded-lg",
  };

  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  if (count === 1) {
    return (
      <div
        className={cn(baseClasses, variantClasses[variant], className)}
        style={style}
        {...props}
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(baseClasses, variantClasses[variant], className, "mb-2")}
          style={style}
          {...props}
        />
      ))}
    </>
  );
};

/**
 * Card Skeleton - Common pattern for loading cards
 */
export const CardSkeleton = () => {
  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="40%" height={16} />
      <div className="space-y-2 mt-4">
        <Skeleton variant="text" count={3} />
      </div>
    </div>
  );
};

/**
 * Table Skeleton - For loading tables
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} variant="text" height={20} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard Stats Skeleton
 */
export const DashboardStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-card rounded-2xl p-6 space-y-3">
          <Skeleton variant="circular" width={48} height={48} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="50%" height={32} />
        </div>
      ))}
    </div>
  );
};
