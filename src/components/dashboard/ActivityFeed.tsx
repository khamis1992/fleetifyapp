import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  time: string;
  icon: React.ElementType;
  color: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, className }) => {
  return (
    <Card className={cn("border-0 shadow-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>الأنشطة الأخيرة</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            عرض الكل
            <ChevronRight className="h-4 w-4 mr-2" />
          </Button>
        </div>
        <CardDescription>
          آخر التحديثات في نظامك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div 
              key={activity.id} 
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg transition-all duration-200",
                "bg-background-soft hover:bg-card-hover cursor-pointer",
                "border border-transparent hover:border-border"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  activity.color
                )}>
                  <activity.icon className="h-4 w-4 text-white" />
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute top-10 left-1/2 w-0.5 h-6 bg-border transform -translate-x-1/2" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-medium",
                      activity.priority === 'high' && "border-destructive text-destructive",
                      activity.priority === 'medium' && "border-warning text-warning",
                      activity.priority === 'low' && "border-muted-foreground text-muted-foreground"
                    )}
                  >
                    {activity.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};