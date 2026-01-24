import React, { Suspense } from 'react';
import { Skeleton } from '../ui/skeleton';

interface SuspenseBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string;
}

const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = ({
  children,
  fallback,
  height = 'min-h-[200px]'
}) => {
  const defaultFallback = (
    <div className={`flex flex-col space-y-3 p-4 ${height}`}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-4 w-3/6" />
      <Skeleton className="h-4 w-2/6" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default SuspenseBoundary;