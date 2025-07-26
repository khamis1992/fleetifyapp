import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatusItem {
  id: string;
  label: string;
  value: number;
  total?: number;
  color: string;
  bgColor?: string;
  percentage?: number;
}

interface StatusOverviewProps {
  title: string;
  icon?: React.ElementType;
  items: StatusItem[];
  showProgress?: boolean;
  className?: string;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({
  title,
  icon: Icon,
  items,
  showProgress = false,
  className
}) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={cn("border-0 shadow-card", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const percentage = item.total ? (item.value / item.total) * 100 : item.percentage || 0;
          
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <Badge 
                  variant="default" 
                  className={cn(
                    "font-bold text-white",
                    item.bgColor || item.color
                  )}
                >
                  {item.value}
                </Badge>
              </div>
              
              {showProgress && (
                <div className="space-y-1">
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}%</span>
                    {item.total && <span>من {item.total}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {!showProgress && total > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>المجموع</span>
              <Badge variant="outline" className="font-bold">
                {total}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};