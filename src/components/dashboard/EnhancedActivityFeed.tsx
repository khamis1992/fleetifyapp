import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  Users, 
  Car, 
  FileText, 
  DollarSign, 
  Clock, 
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActivityItem {
  id: string;
  type: 'customer' | 'vehicle' | 'contract' | 'payment' | 'system';
  title: string;
  description: string;
  user?: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

interface EnhancedActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  title?: string;
  onRefresh?: () => void;
  showFilters?: boolean;
}

const EnhancedActivityFeed: React.FC<EnhancedActivityFeedProps> = React.memo(({
  activities = [],
  loading = false,
  title = 'النشاطات الأخيرة',
  onRefresh,
  showFilters = true
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer': return Users;
      case 'vehicle': return Car;
      case 'contract': return FileText;
      case 'payment': return DollarSign;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'from-blue-500/10 to-blue-600/5 border-blue-200/20';
      case 'vehicle': return 'from-green-500/10 to-green-600/5 border-green-200/20';
      case 'contract': return 'from-purple-500/10 to-purple-600/5 border-purple-200/20';
      case 'payment': return 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/20';
      default: return 'from-gray-500/10 to-gray-600/5 border-gray-200/20';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.type === filter);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // عرض 5 عناصر فقط بدلاً من كل النشاطات
  const displayedActivities = filteredActivities.slice(0, 5);

  const ActivitySkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-fit">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-2 rounded-lg bg-primary/10 text-primary"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Activity size={20} />
              </motion.div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredActivities.length} نشاط
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {showFilters && (
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <Filter size={14} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="customer">العملاء</SelectItem>
                    <SelectItem value="vehicle">المركبات</SelectItem>
                    <SelectItem value="contract">العقود</SelectItem>
                    <SelectItem value="payment">المدفوعات</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <motion.div
                    animate={{ rotate: isRefreshing ? 360 : 0 }}
                    transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <ActivitySkeleton />
          ) : (
            <ScrollArea className="h-[600px]">
              <AnimatePresence mode="popLayout">
                {filteredActivities.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">لا توجد نشاطات حديثة</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {displayedActivities.map((activity, index) => {
                      const ActivityIcon = getActivityIcon(activity.type);
                      
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          layout
                        >
                          <Card className={`group cursor-pointer transition-all duration-300 bg-gradient-to-br ${getActivityColor(activity.type)} hover:shadow-md border`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {/* Activity Icon */}
                                <motion.div 
                                  className="p-2 rounded-lg bg-white/50 group-hover:bg-white/70 transition-colors duration-300"
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <ActivityIcon size={18} className="text-foreground/80" />
                                </motion.div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-foreground group-hover:text-foreground/90 transition-colors text-sm">
                                        {activity.title}
                                      </h4>
                                      <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors mt-1">
                                        {activity.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Footer */}
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                                    <div className="flex items-center gap-2">
                                      {activity.user && (
                                        <>
                                          <Avatar className="w-5 h-5">
                                            <AvatarFallback className="text-xs">{activity.user.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-muted-foreground">{activity.user}</span>
                                        </>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock size={10} />
                                      <span>{formatTimeAgo(activity.timestamp)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

EnhancedActivityFeed.displayName = 'EnhancedActivityFeed';

export default EnhancedActivityFeed;