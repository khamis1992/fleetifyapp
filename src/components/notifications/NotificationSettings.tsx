import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, BellOff, Clock, Shield } from 'lucide-react';
import { useNotificationThrottling } from '@/hooks/useNotificationThrottling';

export const NotificationSettings: React.FC = () => {
  const {
    settings,
    updateSettings,
    throttledNotifications,
    getThrottledSummary,
    clearThrottledNotifications,
    isInQuietHours,
    notificationCount
  } = useNotificationThrottling();

  return (
    <div className="space-y-6">
      {/* Settings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات التنبيهات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">تفعيل التحكم في التنبيهات</Label>
              <p className="text-xs text-muted-foreground">
                تفعيل نظام التحكم الذكي في التنبيهات
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Cooldown Period */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">فترة التهدئة (دقائق)</Label>
                  <Badge variant="outline">{settings.cooldownMinutes} دقيقة</Badge>
                </div>
                <Slider
                  value={[settings.cooldownMinutes]}
                  onValueChange={([value]) => updateSettings({ cooldownMinutes: value })}
                  max={30}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  المدة الزمنية بين التنبيهات المتشابهة
                </p>
              </div>

              {/* Hourly Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">الحد الأقصى للتنبيهات في الساعة</Label>
                  <Badge variant="outline">{settings.maxPerHour} تنبيه</Badge>
                </div>
                <Slider
                  value={[settings.maxPerHour]}
                  onValueChange={([value]) => updateSettings({ maxPerHour: value })}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  أقصى عدد تنبيهات يمكن عرضها في الساعة الواحدة
                </p>
              </div>

              {/* Group Similar Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">تجميع التنبيهات المتشابهة</Label>
                  <p className="text-xs text-muted-foreground">
                    دمج التنبيهات من نفس النوع في تنبيه واحد
                  </p>
                </div>
                <Switch
                  checked={settings.groupSimilar}
                  onCheckedChange={(groupSimilar) => updateSettings({ groupSimilar })}
                />
              </div>

              {/* Critical Notifications Override */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    السماح بالتنبيهات الحرجة دائماً
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إظهار التنبيهات الحرجة حتى في وضع عدم الإزعاج
                  </p>
                </div>
                <Switch
                  checked={settings.allowCritical}
                  onCheckedChange={(allowCritical) => updateSettings({ allowCritical })}
                />
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      ساعات عدم الإزعاج
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      تقليل التنبيهات خلال ساعات محددة
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableQuietHours}
                    onCheckedChange={(enableQuietHours) => updateSettings({ enableQuietHours })}
                  />
                </div>

                {settings.enableQuietHours && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">بداية ساعات عدم الإزعاج</Label>
                      <Input
                        type="time"
                        value={settings.quietStart}
                        onChange={(e) => updateSettings({ quietStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">نهاية ساعات عدم الإزعاج</Label>
                      <Input
                        type="time"
                        value={settings.quietEnd}
                        onChange={(e) => updateSettings({ quietEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isInQuietHours ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            الحالة الحالية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">حالة التنبيهات:</span>
            <Badge variant={isInQuietHours ? "secondary" : "default"}>
              {isInQuietHours ? "وضع عدم الإزعاج" : "نشط"}
            </Badge>
          </div>

          {notificationCount > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">التنبيهات المحجوبة:</span>
                <Badge variant="outline">{getThrottledSummary()}</Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearThrottledNotifications}
                className="w-full"
              >
                مسح التنبيهات المحجوبة
              </Button>
            </>
          )}

          {throttledNotifications.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">التنبيهات المحجوبة مؤخراً:</Label>
              <div className="space-y-1">
                {throttledNotifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="text-xs p-2 bg-muted rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{notification.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {notification.count}x
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};