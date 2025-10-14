import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loading component for UnifiedFinancialDashboard
 * Provides progressive loading experience while data is being fetched
 */
export const FinancialDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Key Metrics Overview Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Health Score Skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>

        {/* Tab Content Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact skeleton for metric cards
 */
export const MetricCardSkeleton: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

/**
 * Chart skeleton loader
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <Card className="animate-pulse">
    <CardHeader>
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <div className="flex items-end justify-around gap-2" style={{ height: `${height}px` }}>
        {[40, 60, 45, 80, 55, 70, 50, 65].map((h, i) => (
          <Skeleton 
            key={i} 
            className="w-full rounded-t" 
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Table skeleton loader
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <Card className="animate-pulse">
    <CardHeader>
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex gap-4 pb-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default FinancialDashboardSkeleton;
