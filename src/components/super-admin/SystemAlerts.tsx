import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissible: boolean;
}

export const SystemAlerts: React.FC = () => {
  const [alerts, setAlerts] = React.useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'استخدام عالي للنظام',
      message: 'استخدام المعالج يصل إلى 85%. يُنصح بتوسيع الموارد.',
      timestamp: 'منذ 5 دقائق',
      dismissible: true
    },
    {
      id: '2',
      type: 'error',
      title: 'فشل في معالجة المدفوعات',
      message: 'فشلت 3 عمليات دفع في الساعة الماضية.',
      timestamp: 'منذ 15 دقيقة',
      dismissible: true
    },
    {
      id: '3',
      type: 'info',
      title: 'صيانة مجدولة',
      message: 'صيانة النظام مجدولة الليلة في الساعة 2 صباحاً بتوقيت غرينتش.',
      timestamp: 'منذ ساعة',
      dismissible: true
    },
    {
      id: '4',
      type: 'success',
      title: 'اكتملت النسخة الاحتياطية',
      message: 'تمت النسخة الاحتياطية اليومية لقاعدة البيانات بنجاح.',
      timestamp: 'منذ ساعتين',
      dismissible: true
    }
  ]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      default:
        return Info;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      default:
        return 'outline';
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            تنبيهات النظام
          </CardTitle>
          <Badge variant="secondary">
            {alerts.length} نشط
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.type)} relative group`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <p className="text-xs opacity-75">{alert.timestamp}</p>
                  </div>
                  {alert.dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          
          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>جميع الأنظمة تعمل بشكل طبيعي</p>
              <p className="text-sm">لا توجد تنبيهات نشطة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};