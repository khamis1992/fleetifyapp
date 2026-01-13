/**
 * Violation Notification Settings Component
 * إعدادات إشعارات المخالفات المرورية
 * 
 * Allows users to configure notification preferences when importing violations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  MessageCircle,
  Mail,
  Users,
  Car,
  Send,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Info,
} from 'lucide-react';
import { NotificationSettings, NotificationResult } from '@/hooks/useViolationNotifications';
import { cn } from '@/lib/utils';

interface ViolationNotificationSettingsProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
  onSendNotifications?: () => Promise<void>;
  violationCount?: number;
  customerCount?: number;
  isSending?: boolean;
  lastResult?: NotificationResult | null;
  compact?: boolean;
  showSendButton?: boolean;
}

export const ViolationNotificationSettings: React.FC<ViolationNotificationSettingsProps> = ({
  settings,
  onSettingsChange,
  onSendNotifications,
  violationCount = 0,
  customerCount = 0,
  isSending = false,
  lastResult = null,
  compact = false,
  showSendButton = true,
}) => {
  const [expanded, setExpanded] = useState(!compact);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const hasAnyNotification = settings.notifyCustomerBySystem || 
    settings.notifyCustomerByWhatsApp || 
    settings.notifyCustomerByEmail ||
    settings.notifyManagers ||
    settings.notifyFleetManager;

  if (compact && !expanded) {
    return (
      <div 
        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">إعدادات الإشعارات</span>
          {hasAnyNotification && (
            <Badge variant="secondary" className="text-xs">
              نشط
            </Badge>
          )}
        </div>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={cn(
      "border-2 border-dashed",
      hasAnyNotification ? "border-primary/30 bg-primary/5" : "border-muted"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">إشعارات المخالفات</CardTitle>
              <CardDescription>
                إرسال تنبيهات تلقائية عند تسجيل المخالفات
              </CardDescription>
            </div>
          </div>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              إغلاق
            </Button>
          )}
        </div>

        {/* Stats badges */}
        {(violationCount > 0 || customerCount > 0) && (
          <div className="flex gap-2 mt-3">
            {violationCount > 0 && (
              <Badge variant="outline" className="bg-background">
                <AlertCircle className="h-3 w-3 mr-1" />
                {violationCount} مخالفة
              </Badge>
            )}
            {customerCount > 0 && (
              <Badge variant="outline" className="bg-background">
                <Users className="h-3 w-3 mr-1" />
                {customerCount} عميل
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Manager Notifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            إشعار الإدارة
          </div>
          
          <div className="grid gap-3 pr-6">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="notify-managers" className="font-medium cursor-pointer">
                    المديرين والمحاسبين
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إشعار جميع المديرين المسؤولين
                  </p>
                </div>
              </div>
              <Switch
                id="notify-managers"
                checked={settings.notifyManagers}
                onCheckedChange={(checked) => updateSetting('notifyManagers', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-orange-500/10">
                  <Car className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <Label htmlFor="notify-fleet" className="font-medium cursor-pointer">
                    مدير الأسطول
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إشعار خاص لمدير الأسطول
                  </p>
                </div>
              </div>
              <Switch
                id="notify-fleet"
                checked={settings.notifyFleetManager}
                onCheckedChange={(checked) => updateSetting('notifyFleetManager', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Customer Notifications */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            إشعار العملاء
          </div>

          <div className="grid gap-3 pr-6">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="notify-system" className="font-medium cursor-pointer">
                    إشعار النظام
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إشعار داخلي في التطبيق
                  </p>
                </div>
              </div>
              <Switch
                id="notify-system"
                checked={settings.notifyCustomerBySystem}
                onCheckedChange={(checked) => updateSetting('notifyCustomerBySystem', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-green-500/10">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <Label htmlFor="notify-whatsapp" className="font-medium cursor-pointer">
                    واتساب
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إرسال رسالة عبر واتساب
                  </p>
                </div>
              </div>
              <Switch
                id="notify-whatsapp"
                checked={settings.notifyCustomerByWhatsApp}
                onCheckedChange={(checked) => updateSetting('notifyCustomerByWhatsApp', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors opacity-60">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-purple-500/10">
                  <Mail className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <Label htmlFor="notify-email" className="font-medium cursor-pointer">
                    البريد الإلكتروني
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    قريباً - إرسال بريد إلكتروني
                  </p>
                </div>
              </div>
              <Switch
                id="notify-email"
                checked={settings.notifyCustomerByEmail}
                onCheckedChange={(checked) => updateSetting('notifyCustomerByEmail', checked)}
                disabled
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Notice */}
        {settings.notifyCustomerByWhatsApp && (
          <Alert className="bg-green-50 border-green-200">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 text-sm">
              سيتم فتح رابط واتساب لكل عميل لإرسال الرسالة يدوياً.
              للإرسال التلقائي، يلزم الاشتراك في WhatsApp Business API.
            </AlertDescription>
          </Alert>
        )}

        {/* Last Result */}
        {lastResult && (
          <Alert className={cn(
            lastResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}>
            {lastResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={cn(
              "text-sm",
              lastResult.success ? "text-green-800" : "text-red-800"
            )}>
              {lastResult.success ? (
                <>
                  تم إرسال الإشعارات بنجاح:
                  {lastResult.systemNotifications > 0 && ` ${lastResult.systemNotifications} إشعار نظام`}
                  {lastResult.whatsappNotifications > 0 && ` • ${lastResult.whatsappNotifications} واتساب`}
                </>
              ) : (
                <>
                  فشل إرسال بعض الإشعارات: {lastResult.errors.join(', ')}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        {showSendButton && onSendNotifications && hasAnyNotification && violationCount > 0 && (
          <Button 
            onClick={onSendNotifications}
            disabled={isSending}
            className="w-full gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الإشعارات ({violationCount} مخالفة)
              </>
            )}
          </Button>
        )}

        {/* Info */}
        {!hasAnyNotification && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <Info className="h-4 w-4" />
            قم بتفعيل أحد خيارات الإشعارات لإرسال تنبيهات عند حفظ المخالفات
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViolationNotificationSettings;
