import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Volume2, 
  VolumeX, 
  Bell,
  Clock,
  TrendingUp,
  DollarSign,
  Car,
  Users,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useBudgetAlerts } from '@/hooks/useBudgetIntegration';
import { useVehicleAlerts } from '@/hooks/useVehicleAlerts';
import { useAcknowledgeBudgetAlert } from '@/hooks/useBudgetIntegration';
import { useAcknowledgeVehicleAlert } from '@/hooks/useVehicleAlerts';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, UserNotification } from '@/hooks/useNotifications';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface EnhancedAlertsSystemProps {
  compact?: boolean;
}

export const EnhancedAlertsSystem: React.FC<EnhancedAlertsSystemProps> = ({ 
  compact = false 
}) => {
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const { getQueryKey } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem('alertSoundEnabled') !== 'false'
  );
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  // Fetch all types of alerts
  const { data: smartAlerts = [], isLoading: smartLoading } = useSmartAlerts();
  const { data: budgetAlerts = [], isLoading: budgetLoading } = useBudgetAlerts();
  const { data: vehicleAlerts = [], isLoading: vehicleLoading } = useVehicleAlerts();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  
  // Acknowledgment mutations
  const acknowledgeBudget = useAcknowledgeBudgetAlert();
  const acknowledgeVehicle = useAcknowledgeVehicleAlert();
  const markNotificationAsRead = useMarkNotificationAsRead();
  const markAllNotificationsAsRead = useMarkAllNotificationsAsRead();

  // Combined alerts count including notifications
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const totalAlerts = smartAlerts.length + budgetAlerts.length + vehicleAlerts.length + unreadNotifications.length;
  const highPriorityAlerts = [
    ...smartAlerts.filter(alert => alert.priority === 'high'),
    ...budgetAlerts.filter(alert => alert.alert_type === 'budget_exceeded'),
    ...vehicleAlerts.filter(alert => alert.priority === 'high'),
    ...unreadNotifications.filter(n => n.notification_type === 'error')
  ].length;

  // Sound management
  useEffect(() => {
    localStorage.setItem('alertSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Play alert sound for new alerts
  useEffect(() => {
    if (soundEnabled && highPriorityAlerts > 0) {
      const playSound = () => {
        try {
          const audio = new Audio('/sounds/alert.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Fallback to system beep if audio file not available
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.2);
          });
        } catch (error) {
          console.log('Could not play alert sound:', error);
        }
      };
      playSound();
    }
  }, [highPriorityAlerts, soundEnabled]);

  const handleDismissAlert = async (alertId: string, type: 'smart' | 'budget' | 'vehicle' | 'notification') => {
    setDismissedAlerts(prev => [...prev, alertId]);
    
    try {
      if (type === 'budget') {
        await acknowledgeBudget.mutateAsync(alertId);
        toast({
          title: "تم تأكيد التنبيه",
          description: "تم تأكيد تنبيه الموازنة بنجاح"
        });
      } else if (type === 'vehicle') {
        await acknowledgeVehicle.mutateAsync(alertId);
        toast({
          title: "تم تأكيد التنبيه", 
          description: "تم تأكيد تنبيه المركبة بنجاح"
        });
      } else if (type === 'notification') {
        await markNotificationAsRead.mutateAsync(alertId);
        toast({
          title: "تم قراءة الإشعار",
          description: "تم وضع علامة على الإشعار كمقروء"
        });
      }
      
      // Force refresh of unified notification count
      queryClient.invalidateQueries({ queryKey: getQueryKey(['unified-notification-count']) });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد التنبيه",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (type: string, priority?: string) => {
    if (priority === 'high' || type === 'error') return AlertCircle;
    if (type === 'warning') return AlertTriangle;
    if (type === 'success') return CheckCircle;
    return Info;
  };

  const getAlertVariant = (type: string, priority?: string): "default" | "destructive" => {
    if (priority === 'high' || type === 'error') return 'destructive';
    return 'default';
  };

  const renderSmartAlerts = () => (
    <div className="space-y-2">
      {smartAlerts.filter(alert => !dismissedAlerts.includes(alert.id)).map((alert, index) => {
        const IconComponent = getAlertIcon(alert.type, alert.priority);
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Alert variant={getAlertVariant(alert.type, alert.priority)} className="relative p-3 md:p-4">
              <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription className="space-y-2">
                <div className="space-y-1">
                  <p className="font-medium text-sm md:text-base leading-tight">{alert.title}</p>
                  <p className="text-xs md:text-sm opacity-80 leading-tight">{alert.message}</p>
                </div>
                
                {(alert.count || alert.amount) && (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.count && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">العدد: {alert.count}</Badge>
                    )}
                    {alert.amount && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">المبلغ: {formatCurrency(alert.amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Badge>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                  {alert.action && alert.actionUrl && (
                    <Button size="sm" variant="outline" asChild className="text-xs h-7 flex-shrink-0">
                      <a href={alert.actionUrl} className="flex items-center gap-1">
                        {alert.action}
                        <ChevronRight className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismissAlert(alert.id, 'smart')}
                    className="h-7 px-3 text-xs ml-auto sm:ml-0"
                  >
                    إخفاء
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        );
      })}
    </div>
  );

  const renderBudgetAlerts = () => (
    <div className="space-y-2">
      {budgetAlerts.filter(alert => !alert.is_acknowledged && !dismissedAlerts.includes(alert.id)).map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.1 }}
        >
          <Alert variant="destructive" className="relative p-3 md:p-4">
            <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <AlertDescription className="space-y-2">
              <div>
                <p className="font-medium text-sm md:text-base leading-tight">{alert.message_ar || alert.message}</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-destructive/10 border-destructive/20">
                  تجاوز: {alert.current_percentage.toFixed(1)}%
                </Badge>
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-destructive/10 border-destructive/20">
                  المبلغ: {formatCurrency(alert.amount_exceeded, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Badge>
              </div>
              
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismissAlert(alert.id, 'budget')}
                  disabled={acknowledgeBudget.isPending}
                  className="h-7 text-xs bg-background"
                >
                  <CheckCircle className="h-3 w-3 ml-1" />
                  تأكيد
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      ))}
    </div>
  );

  const renderVehicleAlerts = () => (
    <div className="space-y-2">
      {vehicleAlerts.filter(alert => !alert.is_acknowledged && !dismissedAlerts.includes(alert.id)).map((alert, index) => {
        const IconComponent = getAlertIcon('warning', alert.priority);
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Alert variant={getAlertVariant('warning', alert.priority)} className="relative p-3 md:p-4">
              <Car className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription className="space-y-2">
                <div className="space-y-1">
                  <p className="font-medium text-sm md:text-base leading-tight">{alert.alert_title}</p>
                  <p className="text-xs md:text-sm opacity-80 leading-tight">{alert.alert_message}</p>
                </div>
                
                {alert.due_date && (
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>الاستحقاق: {new Date(alert.due_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
                
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissAlert(alert.id, 'vehicle')}
                    disabled={acknowledgeVehicle.isPending}
                    className="h-7 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 ml-1" />
                    تأكيد
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        );
      })}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-2">
      {unreadNotifications.filter(notification => !dismissedAlerts.includes(notification.id)).map((notification, index) => {
        const IconComponent = getAlertIcon(notification.notification_type);
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Alert variant={getAlertVariant(notification.notification_type)} className="relative p-3 md:p-4">
              <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription className="space-y-2">
                <div className="space-y-1">
                  <p className="font-medium text-sm md:text-base leading-tight">{notification.title}</p>
                  <p className="text-xs md:text-sm opacity-80 leading-tight">{notification.message}</p>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>{new Date(notification.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissAlert(notification.id, 'notification')}
                    disabled={markNotificationAsRead.isPending}
                    className="h-7 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 ml-1" />
                    قراءة
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        );
      })}
    </div>
  );

  const isLoading = smartLoading || budgetLoading || vehicleLoading || notificationsLoading;

  if (compact) {
    return (
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-3 px-3 md:px-6">
          <CardTitle className="flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="truncate">التنبيهات</span>
              {totalAlerts > 0 && (
                <Badge variant="destructive" className="animate-pulse text-xs px-1.5 py-0.5">
                  {totalAlerts > 99 ? "99+" : totalAlerts}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-6 w-6 md:h-8 md:w-8 p-0 flex-shrink-0"
            >
              {soundEnabled ? <Volume2 className="h-3 w-3 md:h-4 md:w-4" /> : <VolumeX className="h-3 w-3 md:h-4 md:w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : totalAlerts === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-success mx-auto mb-2" />
              <p className="text-xs md:text-sm text-muted-foreground">لا توجد تنبيهات</p>
            </div>
          ) : (
            <ScrollArea className="max-h-32 md:max-h-40">
              <div className="space-y-1.5">
                {smartAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="text-xs md:text-sm p-2 bg-muted/30 rounded border-r-2 border-primary/40">
                    <p className="font-medium truncate leading-tight">{alert.title}</p>
                    {alert.message && (
                      <p className="text-muted-foreground truncate text-xs mt-0.5">{alert.message}</p>
                    )}
                  </div>
                ))}
                {totalAlerts > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      +{totalAlerts - 3} تنبيهات أخرى
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-4 px-3 md:px-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 md:p-2 bg-warning/10 rounded-lg flex-shrink-0">
              <Bell className="h-4 w-4 md:h-5 md:w-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm md:text-base font-semibold truncate">نظام التنبيهات المتقدم</h3>
              <div className="flex items-center gap-2 mt-1">
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="animate-pulse text-xs px-1.5 py-0.5">
                    المجموع: {totalAlerts > 99 ? "99+" : totalAlerts}
                  </Badge>
                )}
                {highPriorityAlerts > 0 && (
                  <Badge variant="destructive" className="animate-bounce text-xs px-1.5 py-0.5">
                    عاجل: {highPriorityAlerts}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-1.5 h-8 text-xs flex-shrink-0"
          >
            {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            <span className="hidden sm:inline">{soundEnabled ? 'تعطيل الصوت' : 'تفعيل الصوت'}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : totalAlerts === 0 ? (
          <div className="text-center py-6 md:py-8">
            <CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-success mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-success mb-1 md:mb-2">كل شيء تحت السيطرة</h3>
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات تحتاج لانتباهك</p>
          </div>
        ) : (
          <Tabs defaultValue="smart" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="smart" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="leading-tight text-center">
                  ذكية
                  <span className="block md:inline"> ({smartAlerts.length})</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="leading-tight text-center">
                  مالية
                  <span className="block md:inline"> ({budgetAlerts.filter(a => !a.is_acknowledged).length})</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
                <Car className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="leading-tight text-center">
                  مركبات
                  <span className="block md:inline"> ({vehicleAlerts.filter(a => !a.is_acknowledged).length})</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 text-xs md:text-sm">
                <Bell className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="leading-tight text-center">
                  إشعارات
                  <span className="block md:inline"> ({unreadNotifications.length})</span>
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-3 md:mt-4">
              <ScrollArea className="max-h-80 md:max-h-96">
                <AnimatePresence mode="wait">
                  <TabsContent value="smart" className="mt-0">
                    {smartAlerts.length === 0 ? (
                      <div className="text-center py-6">
                        <Info className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-muted-foreground">لا توجد تنبيهات ذكية</p>
                      </div>
                    ) : (
                      renderSmartAlerts()
                    )}
                  </TabsContent>
                  
                  <TabsContent value="budget" className="mt-0">
                    {budgetAlerts.filter(a => !a.is_acknowledged).length === 0 ? (
                      <div className="text-center py-6">
                        <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-success mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-muted-foreground">جميع الموازنات ضمن الحدود المقررة</p>
                      </div>
                    ) : (
                      renderBudgetAlerts()
                    )}
                  </TabsContent>
                  
                  <TabsContent value="vehicle" className="mt-0">
                    {vehicleAlerts.filter(a => !a.is_acknowledged).length === 0 ? (
                      <div className="text-center py-6">
                        <Car className="h-6 w-6 md:h-8 md:w-8 text-success mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-muted-foreground">جميع المركبات في حالة جيدة</p>
                      </div>
                    ) : (
                      renderVehicleAlerts()
                    )}
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0">
                    {unreadNotifications.length === 0 ? (
                      <div className="text-center py-6">
                        <Bell className="h-6 w-6 md:h-8 md:w-8 text-success mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-muted-foreground">لا توجد إشعارات جديدة</p>
                      </div>
                    ) : (
                      renderNotifications()
                    )}
                  </TabsContent>
                </AnimatePresence>
              </ScrollArea>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};