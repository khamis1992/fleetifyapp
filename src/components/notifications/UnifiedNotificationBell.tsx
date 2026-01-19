import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Volume2, VolumeX, Settings, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUnifiedNotificationCount } from "@/hooks/useUnifiedNotificationCount";
import { useRealTimeAlerts } from "@/hooks/useRealTimeAlerts";
import { useToast } from "@/hooks/use-toast";
import { NotificationItem } from "./NotificationItem";

interface UnifiedNotificationBellProps {
  onOpenChange?: (open: boolean) => void;
}

export const UnifiedNotificationBell: React.FC<UnifiedNotificationBellProps> = ({ 
  onOpenChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'high' | 'budget' | 'vehicle' | 'notification'>('all');
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem('notificationSoundEnabled') !== 'false'
  );
  const [showSettings, setShowSettings] = useState(false);
  
  const { totalAlerts, criticalAlerts, highPriorityAlerts, isLoading } = useUnifiedNotificationCount();
  const { alerts, dismissAlert, markAllAsRead } = useRealTimeAlerts();
  const { toast } = useToast();

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem('notificationSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Play sound for critical alerts
  useEffect(() => {
    if (soundEnabled && criticalAlerts > 0) {
      const playAlertSound = () => {
        try {
          const audio = new Audio('/sounds/alert.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Fallback to system beep
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
      playAlertSound();
    }
  }, [criticalAlerts, soundEnabled]);

  // Browser notifications for critical alerts
  useEffect(() => {
    if (criticalAlerts > 0 && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('تنبيه هام', {
          body: `لديك ${criticalAlerts} تنبيهات هامة تحتاج لمراجعة`,
          icon: '/favicon.ico',
          tag: 'critical-alerts'
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [criticalAlerts]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const filteredAlerts = alerts.filter(alert => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!alert.title.toLowerCase().includes(searchLower) && 
          !alert.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Type filter
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'critical') return alert.severity === 'critical';
    if (selectedFilter === 'high') return alert.severity === 'high' || alert.severity === 'critical';
    if (selectedFilter === 'budget') return alert.type === 'budget';
    if (selectedFilter === 'vehicle') return alert.type === 'vehicle';
    if (selectedFilter === 'notification') return alert.type === 'notification';
    
    return true;
  });

  const handleDismissAlert = async (alertId: string, alertType: string) => {
    try {
      await dismissAlert(alertId, alertType);
      toast({
        title: "تم تأكيد التنبيه",
        description: "تم تأكيد التنبيه بنجاح"
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد التنبيه",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: "تم تأكيد جميع التنبيهات",
        description: "تم تأكيد جميع التنبيهات بنجاح"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد التنبيهات",
        variant: "destructive"
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
      
      <PopoverContent 
        className="w-96 p-0 shadow-lg border-border"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">التنبيهات</h3>
                {totalAlerts > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalAlerts}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8 p-0"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في التنبيهات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 pr-10 h-9 text-sm"
                />
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchQuery("")}
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <Tabs value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as any)}>
                <TabsList className="grid w-full grid-cols-6 h-8">
                  <TabsTrigger value="all" className="text-xs px-1">الكل</TabsTrigger>
                  <TabsTrigger value="critical" className="text-xs px-1">هام</TabsTrigger>
                  <TabsTrigger value="high" className="text-xs px-1">عالي</TabsTrigger>
                  <TabsTrigger value="budget" className="text-xs px-1">موازنة</TabsTrigger>
                  <TabsTrigger value="vehicle" className="text-xs px-1">مركبة</TabsTrigger>
                  <TabsTrigger value="notification" className="text-xs px-1">إشعار</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-enabled" className="text-sm">الإشعارات الصوتية</Label>
                      <Switch
                        id="sound-enabled"
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">إشعارات المتصفح</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if ('Notification' in window && Notification.permission === 'default') {
                            Notification.requestPermission();
                          }
                        }}
                        disabled={!('Notification' in window) || Notification.permission === 'granted'}
                        className="h-7 text-xs"
                      >
                        {Notification?.permission === 'granted' ? 'مفعل' : 'تفعيل'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery || selectedFilter !== 'all' ? 'لا توجد تنبيهات مطابقة' : 'لا توجد تنبيهات'}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  جميع التنبيهات تم التعامل معها
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 max-h-[400px]">
                  <div className="p-2 space-y-2">
                    <AnimatePresence>
                      {filteredAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <NotificationItem
                            alert={alert}
                            onDismiss={() => handleDismissAlert(alert.id, alert.type)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                {/* Footer Actions */}
                {totalAlerts > 0 && (
                  <>
                    <Separator />
                    <div className="p-3 bg-card/50">
                      <Button
                        onClick={handleMarkAllAsRead}
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-sm"
                      >
                        تأكيد جميع التنبيهات ({totalAlerts})
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};