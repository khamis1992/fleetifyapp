import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Car,
  Building,
  X
} from 'lucide-react';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AlertsNotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    alerts,
    totalAlerts,
    criticalAlerts,
    highPriorityAlerts,
    dismissAlert,
    markAllAsRead,
    isLoading
  } = useRealTimeAlerts();

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === 'critical') return AlertTriangle;
    if (type === 'budget') return DollarSign;
    if (type === 'vehicle') return Car;
    if (type === 'property') return Building;
    return Bell;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="text-xs">عاجل</Badge>;
      case 'high': return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">هام</Badge>;
      case 'medium': return <Badge variant="outline" className="text-xs">متوسط</Badge>;
      default: return <Badge variant="outline" className="text-xs">منخفض</Badge>;
    }
  };

  const handleDismissAlert = async (alertId: string, alertType: string) => {
    await dismissAlert(alertId, alertType);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50 transition-colors"
        >
          <motion.div
            animate={totalAlerts > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {totalAlerts > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </motion.div>
          
          <AnimatePresence>
            {totalAlerts > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant={criticalAlerts > 0 ? "destructive" : "secondary"}
                  className={`min-w-[20px] h-5 text-xs px-1 ${
                    criticalAlerts > 0 ? 'animate-pulse' : ''
                  }`}
                >
                  {totalAlerts > 99 ? '99+' : totalAlerts}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end" sideOffset={5}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                التنبيهات
                {totalAlerts > 0 && (
                  <Badge variant="secondary">{totalAlerts}</Badge>
                )}
              </div>
              {totalAlerts > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                  className="text-xs h-auto p-2"
                >
                  تأكيد الكل
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : totalAlerts === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
                <p className="text-sm font-medium text-success">لا توجد تنبيهات</p>
                <p className="text-xs text-muted-foreground mt-1">كل شيء تحت السيطرة</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-1 p-2">
                  <AnimatePresence>
                    {alerts.map((alert, index) => {
                      const IconComponent = getAlertIcon(alert.type, alert.severity);
                      
                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg bg-background/80 ${getSeverityColor(alert.severity)}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium truncate">{alert.title}</h4>
                                {getSeverityBadge(alert.severity)}
                              </div>
                              
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {alert.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {formatDistanceToNow(new Date(alert.created_at), {
                                      addSuffix: true,
                                      locale: ar
                                    })}
                                  </span>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDismissAlert(alert.id, alert.type)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
          
          {totalAlerts > 0 && (
            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>المجموع: {totalAlerts}</span>
                {highPriorityAlerts > 0 && (
                  <span className="text-destructive font-medium">
                    عاجل: {highPriorityAlerts}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
};