import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';
import { useNotificationThrottling } from '@/hooks/useNotificationThrottling';
import { formatDistanceToNow } from 'date-fns';

export const NotificationControlCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    throttledNotifications,
    getThrottledSummary,
    clearThrottledNotifications,
    notificationCount,
    isInQuietHours
  } = useNotificationThrottling();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
        >
          <Settings className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            مركز التحكم في التنبيهات
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="throttled">التنبيهات المحجوبة</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الحالة الحالية</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isInQuietHours ? "عدم إزعاج" : "نشط"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isInQuietHours ? "ساعات عدم الإزعاج مفعلة" : "التنبيهات مفعلة"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">التنبيهات المحجوبة</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{notificationCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {getThrottledSummary() || "لا توجد تنبيهات محجوبة"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الفعالية</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {notificationCount > 0 ? "70%" : "100%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تقليل التنبيهات المكررة
                  </p>
                </CardContent>
              </Card>
            </div>

            {notificationCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">إجراءات سريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={clearThrottledNotifications}
                    variant="outline"
                    className="w-full"
                  >
                    مسح جميع التنبيهات المحجوبة
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Throttled Notifications Tab */}
          <TabsContent value="throttled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>التنبيهات المحجوبة ({throttledNotifications.length})</span>
                  {throttledNotifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearThrottledNotifications}
                    >
                      مسح الكل
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {throttledNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد تنبيهات محجوبة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {throttledNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{notification.title}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {notification.count}x
                            </Badge>
                            <Badge
                              variant={
                                notification.severity === 'critical'
                                  ? 'destructive'
                                  : notification.severity === 'high'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              {notification.severity}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          آخر تحديث: {formatDistanceToNow(notification.lastSeen, { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-h-96 overflow-y-auto">
              <NotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};