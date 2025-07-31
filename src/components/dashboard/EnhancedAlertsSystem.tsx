import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useBudgetAlerts } from '@/hooks/useBudgetIntegration';
import { useVehicleAlerts } from '@/hooks/useVehicleAlerts';
import { useAcknowledgeBudgetAlert } from '@/hooks/useBudgetIntegration';
import { useAcknowledgeVehicleAlert } from '@/hooks/useVehicleAlerts';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, UserNotification } from '@/hooks/useNotifications';

interface EnhancedAlertsSystemProps {
  compact?: boolean;
}

export const EnhancedAlertsSystem: React.FC<EnhancedAlertsSystemProps> = ({ 
  compact = false 
}) => {
  const { toast } = useToast();
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

  const handleDismissAlert = (alertId: string, type: 'smart' | 'budget' | 'vehicle' | 'notification') => {
    setDismissedAlerts(prev => [...prev, alertId]);
    
    if (type === 'budget') {
      acknowledgeBudget.mutate(alertId, {
        onSuccess: () => {
          toast({
            title: "تم تأكيد التنبيه",
            description: "تم تأكيد تنبيه الموازنة بنجاح"
          });
        }
      });
    } else if (type === 'vehicle') {
      acknowledgeVehicle.mutate(alertId, {
        onSuccess: () => {
          toast({
            title: "تم تأكيد التنبيه", 
            description: "تم تأكيد تنبيه المركبة بنجاح"
          });
        }
      });
    } else if (type === 'notification') {
      markNotificationAsRead.mutate(alertId, {
        onSuccess: () => {
          toast({
            title: "تم قراءة الإشعار",
            description: "تم وضع علامة على الإشعار كمقروء"
          });
        }
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
    <div className="space-y-3">
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
            <Alert variant={getAlertVariant(alert.type, alert.priority)} className="relative">
              <IconComponent className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm opacity-80 mt-1">{alert.message}</p>
                  {(alert.count || alert.amount) && (
                    <div className="flex gap-2 mt-2 text-xs">
                      {alert.count && (
                        <Badge variant="outline">العدد: {alert.count}</Badge>
                      )}
                      {alert.amount && (
                        <Badge variant="outline">المبلغ: {alert.amount} د.ك</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {alert.action && alert.actionUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={alert.actionUrl}>
                        {alert.action}
                        <ExternalLink className="h-3 w-3 mr-1" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismissAlert(alert.id, 'smart')}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
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
    <div className="space-y-3">
      {budgetAlerts.filter(alert => !alert.is_acknowledged && !dismissedAlerts.includes(alert.id)).map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.1 }}
        >
          <Alert variant="destructive" className="relative">
            <DollarSign className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{alert.message_ar || alert.message}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <Badge variant="outline">
                    تجاوز: {alert.current_percentage.toFixed(1)}%
                  </Badge>
                  <Badge variant="outline">
                    المبلغ: {alert.amount_exceeded.toFixed(0)} د.ك
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDismissAlert(alert.id, 'budget')}
                disabled={acknowledgeBudget.isPending}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                تأكيد
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      ))}
    </div>
  );

  const renderVehicleAlerts = () => (
    <div className="space-y-3">
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
            <Alert variant={getAlertVariant('warning', alert.priority)} className="relative">
              <Car className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{alert.alert_title}</p>
                  <p className="text-sm opacity-80 mt-1">{alert.alert_message}</p>
                  {alert.due_date && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>الاستحقاق: {new Date(alert.due_date).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismissAlert(alert.id, 'vehicle')}
                  disabled={acknowledgeVehicle.isPending}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  تأكيد
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        );
      })}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3">
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
            <Alert variant={getAlertVariant(notification.notification_type)} className="relative">
              <IconComponent className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm opacity-80 mt-1">{notification.message}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(notification.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismissAlert(notification.id, 'notification')}
                  disabled={markNotificationAsRead.isPending}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  قراءة
                </Button>
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              التنبيهات
              {totalAlerts > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {totalAlerts}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 p-0"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد تنبيهات</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {smartAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="text-sm p-2 bg-muted/30 rounded">
                  <p className="font-medium truncate">{alert.title}</p>
                </div>
              ))}
              {totalAlerts > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{totalAlerts - 3} تنبيهات أخرى
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            نظام التنبيهات المتقدم
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {totalAlerts}
              </Badge>
            )}
            {highPriorityAlerts > 0 && (
              <Badge variant="destructive" className="animate-bounce">
                عاجل: {highPriorityAlerts}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-2"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'تعطيل الصوت' : 'تفعيل الصوت'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-success mb-2">كل شيء تحت السيطرة</h3>
            <p className="text-muted-foreground">لا توجد تنبيهات تحتاج لانتباهك</p>
          </div>
        ) : (
          <Tabs defaultValue="smart" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="smart" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                ذكية ({smartAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                مالية ({budgetAlerts.filter(a => !a.is_acknowledged).length})
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                مركبات ({vehicleAlerts.filter(a => !a.is_acknowledged).length})
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                إشعارات ({unreadNotifications.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 max-h-96 overflow-y-auto">
              <AnimatePresence mode="wait">
                <TabsContent value="smart" className="mt-0">
                  {smartAlerts.length === 0 ? (
                    <div className="text-center py-6">
                      <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد تنبيهات ذكية</p>
                    </div>
                  ) : (
                    renderSmartAlerts()
                  )}
                </TabsContent>
                
                <TabsContent value="budget" className="mt-0">
                  {budgetAlerts.filter(a => !a.is_acknowledged).length === 0 ? (
                    <div className="text-center py-6">
                      <DollarSign className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">جميع الموازنات ضمن الحدود المقررة</p>
                    </div>
                  ) : (
                    renderBudgetAlerts()
                  )}
                </TabsContent>
                
                <TabsContent value="vehicle" className="mt-0">
                  {vehicleAlerts.filter(a => !a.is_acknowledged).length === 0 ? (
                    <div className="text-center py-6">
                      <Car className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">جميع المركبات في حالة جيدة</p>
                    </div>
                  ) : (
                    renderVehicleAlerts()
                  )}
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  {unreadNotifications.length === 0 ? (
                    <div className="text-center py-6">
                      <Bell className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد إشعارات جديدة</p>
                    </div>
                  ) : (
                    renderNotifications()
                  )}
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};