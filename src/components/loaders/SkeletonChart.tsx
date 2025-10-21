import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut';

interface SkeletonChartProps {
  /** Type of chart to render */
  type?: ChartType;
  /** Show legend */
  showLegend?: boolean;
  /** Show axis labels */
  showAxis?: boolean;
  /** Custom height */
  height?: number;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  type = 'bar',
  showLegend = true,
  showAxis = true,
  height = 300,
}) => {
  const renderBarChart = () => (
    <div className="flex items-end justify-between gap-2 h-full px-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton
            className="w-full rounded-t"
            style={{
              height: `${40 + Math.random() * 60}%`,
            }}
          />
          {showAxis && <Skeleton className="h-3 w-8" />}
        </div>
      ))}
    </div>
  );

  const renderLineChart = () => (
    <div className="relative h-full px-4">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        <defs>
          <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={i * 40}
            x2="400"
            y2={i * 40}
            stroke="hsl(var(--muted))"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}

        {/* Line path */}
        <path
          d="M 0 150 Q 50 100, 100 120 T 200 80 T 300 100 T 400 60"
          fill="none"
          stroke="url(#skeleton-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data points */}
        {[0, 100, 200, 300, 400].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={[150, 120, 80, 100, 60][i]}
            r="4"
            fill="hsl(var(--muted-foreground))"
            opacity="0.5"
          />
        ))}
      </svg>

      {showAxis && (
        <div className="flex justify-between mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      )}
    </div>
  );

  const renderPieChart = () => (
    <div className="flex items-center justify-center h-full">
      <div className="relative" style={{ width: height * 0.6, height: height * 0.6 }}>
        <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100">
          {/* Pie slices */}
          {[
            { start: 0, size: 0.3, color: 'hsl(var(--primary))' },
            { start: 0.3, size: 0.25, color: 'hsl(var(--accent))' },
            { start: 0.55, size: 0.2, color: 'hsl(var(--muted))' },
            { start: 0.75, size: 0.15, color: 'hsl(var(--secondary))' },
            { start: 0.9, size: 0.1, color: 'hsl(var(--muted-foreground))' },
          ].map((slice, index) => {
            const startAngle = slice.start * 2 * Math.PI - Math.PI / 2;
            const endAngle = (slice.start + slice.size) * 2 * Math.PI - Math.PI / 2;
            const x1 = 50 + 40 * Math.cos(startAngle);
            const y1 = 50 + 40 * Math.sin(startAngle);
            const x2 = 50 + 40 * Math.cos(endAngle);
            const y2 = 50 + 40 * Math.sin(endAngle);
            const largeArc = slice.size > 0.5 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={slice.color}
                opacity="0.3"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );

  const renderAreaChart = () => (
    <div className="relative h-full px-4">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        <defs>
          <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d="M 0 150 Q 50 100, 100 120 T 200 80 T 300 100 T 400 60 L 400 200 L 0 200 Z"
          fill="url(#area-gradient)"
        />

        {/* Line */}
        <path
          d="M 0 150 Q 50 100, 100 120 T 200 80 T 300 100 T 400 60"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          opacity="0.5"
        />
      </svg>
    </div>
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div style={{ height }}>
            {type === 'bar' && renderBarChart()}
            {type === 'line' && renderLineChart()}
            {type === 'pie' && renderPieChart()}
            {type === 'donut' && renderPieChart()}
            {type === 'area' && renderAreaChart()}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex flex-wrap gap-4 justify-center">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SkeletonChart;
