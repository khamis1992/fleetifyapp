import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface Activity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  amount?: number;
  created_at?: string;
}

interface CleanActivityFeedProps {
  activities?: Activity[];
  loading?: boolean;
}

const CleanActivityFeed: React.FC<CleanActivityFeedProps> = ({ 
  activities = [], 
  loading = false 
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock size={16} />
            الأنشطة الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted/50 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities.length) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock size={16} />
            الأنشطة الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد أنشطة حديثة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock size={16} />
          الأنشطة الأخيرة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 6).map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">
                  {activity.type.charAt(0)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                  {activity.priority && activity.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      عاجل
                    </Badge>
                  )}
                  {activity.status && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {activity.status}
                    </Badge>
                  )}
                </div>
              </div>
              
              {activity.amount && (
                <span className="text-sm font-medium text-success">
                  {formatCurrency(activity.amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              )}
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            عرض جميع الأنشطة
            <ArrowLeft size={14} className="mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CleanActivityFeed;