import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  trend?: number[];
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  trend,
  className
}) => {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <Card className={cn(
      "border-0 shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-2">
              {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
              <span className={cn(
                "text-sm font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                changeType === 'neutral' && "text-muted-foreground"
              )}>
                {change}
              </span>
            </div>
          </div>
          <div className="relative">
            <div className={cn(
              "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
              "bg-gradient-to-br from-primary/10 to-primary/20",
              "group-hover:from-primary/20 group-hover:to-primary/30"
            )}>
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Mini trend visualization */}
        {trend && (
          <div className="mt-4 flex items-end justify-between h-8">
            {trend.map((value, index) => (
              <div
                key={index}
                className="bg-primary/20 rounded-sm w-2 transition-all duration-300 group-hover:bg-primary/30"
                style={{ height: `${(value / Math.max(...trend)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};