import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartSkeletonProps {
  className?: string;
  type?: 'bar' | 'line' | 'pie' | 'area';
  height?: number;
  hasLegend?: boolean;
  hasTitle?: boolean;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  className,
  type = 'bar',
  height = 300,
  hasLegend = true,
  hasTitle = true,
}) => {
  return (
    <Card className={cn('relative overflow-hidden bg-card/90 backdrop-blur-sm p-6', className)}>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Title section */}
      {hasTitle && (
        <div className="mb-6 space-y-2">
          <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted/30 rounded animate-pulse" />
        </div>
      )}

      {/* Chart area */}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="absolute inset-0 bg-muted/10 rounded-lg overflow-hidden">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3 w-8 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>

          {/* Chart content based on type */}
          <div className="absolute left-14 right-4 top-2 bottom-12">
            {type === 'bar' && <BarChartSkeleton />}
            {type === 'line' && <LineChartSkeleton />}
            {type === 'pie' && <PieChartSkeleton />}
            {type === 'area' && <AreaChartSkeleton />}
          </div>

          {/* X-axis labels */}
          <div className="absolute left-14 right-4 bottom-0 h-8 flex justify-around items-center">
            {Array.from({ length: type === 'pie' ? 0 : 6 }).map((_, i) => (
              <div key={i} className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {hasLegend && (
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted/50 animate-pulse" />
              <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// Bar chart skeleton
const BarChartSkeleton: React.FC = () => (
  <div className="h-full flex items-end justify-around gap-2">
    {[60, 80, 45, 90, 70, 55].map((height, i) => (
      <div
        key={i}
        className="flex-1 bg-muted/50 rounded-t animate-pulse"
        style={{
          height: `${height}%`,
          animationDelay: `${i * 100}ms`,
        }}
      />
    ))}
  </div>
);

// Line chart skeleton
const LineChartSkeleton: React.FC = () => (
  <div className="h-full relative">
    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" className="animate-pulse" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
          <stop offset="50%" className="animate-pulse" stopColor="hsl(var(--muted))" stopOpacity="0.8" />
          <stop offset="100%" className="animate-pulse" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path
        d="M 0,120 L 80,80 L 160,100 L 240,40 L 320,60 L 400,30"
        fill="none"
        stroke="url(#line-gradient)"
        strokeWidth="3"
        className="animate-pulse"
      />
      {[0, 80, 160, 240, 320, 400].map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={[120, 80, 100, 40, 60, 30][i]}
          r="4"
          fill="hsl(var(--muted))"
          className="animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </svg>
  </div>
);

// Pie chart skeleton
const PieChartSkeleton: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="relative w-48 h-48">
      {[0, 90, 180, 270].map((rotation, i) => (
        <div
          key={i}
          className="absolute inset-0 animate-pulse"
          style={{
            animationDelay: `${i * 150}ms`,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="20"
              strokeDasharray={`${62.8 / 4} ${62.8 * 3 / 4}`}
              strokeDashoffset="0"
              transform={`rotate(${rotation} 50 50)`}
              opacity={0.3 + i * 0.15}
            />
          </svg>
        </div>
      ))}
    </div>
  </div>
);

// Area chart skeleton
const AreaChartSkeleton: React.FC = () => (
  <div className="h-full relative">
    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        d="M 0,120 L 80,80 L 160,100 L 240,40 L 320,60 L 400,30 L 400,200 L 0,200 Z"
        fill="url(#area-gradient)"
        className="animate-pulse"
      />
      <path
        d="M 0,120 L 80,80 L 160,100 L 240,40 L 320,60 L 400,30"
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  </div>
);
