import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocumentExpiryAlerts } from '@/hooks/useDocumentExpiryAlerts';
import { AlertTriangle, Calendar, CreditCard, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const DocumentExpiryAlerts: React.FC = () => {
  const { alerts, isLoading, acknowledgeAlert, acknowledgeAllAlerts, syncAlerts } = useDocumentExpiryAlerts();

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'national_id':
        return 'البطاقة المدنية';
      case 'license':
        return 'رخصة القيادة';
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'national_id':
        return <CreditCard className="h-4 w-4" />;
      case 'license':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (alertType: string) => {
    switch (alertType) {
      case 'expired':
        return 'destructive';
      case 'expiring_soon':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getAlertMessage = (alertType: string, days: number) => {
    if (alertType === 'expired') {
      return `منتهية الصلاحية منذ ${Math.abs(days)} يوم`;
    } else if (alertType === 'expiring_soon') {
      return `تنتهي الصلاحية خلال ${days} يوم`;
    }
    return '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            تنبيهات انتهاء الصلاحية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              تنبيهات انتهاء الصلاحية
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAlerts.mutate()}
              disabled={syncAlerts.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncAlerts.isPending ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>لا توجد تنبيهات حالياً</p>
            <p className="text-sm">جميع الوثائق سارية المفعول</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiredAlerts = alerts.filter(alert => alert.alert_type === 'expired');
  const expiringSoonAlerts = alerts.filter(alert => alert.alert_type === 'expiring_soon');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            تنبيهات انتهاء الصلاحية
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAlerts.mutate()}
              disabled={syncAlerts.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncAlerts.isPending ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => acknowledgeAllAlerts.mutate()}
              disabled={acknowledgeAllAlerts.isPending}
            >
              تأكيد الكل
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {/* Expired Documents */}
            {expiredAlerts.length > 0 && (
              <div>
                <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  وثائق منتهية الصلاحية ({expiredAlerts.length})
                </h4>
                <div className="space-y-2">
                  {expiredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentTypeIcon(alert.document_type)}
                        <div>
                          <div className="font-medium text-sm">{alert.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            عقد رقم: {alert.contract_number}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getAlertVariant(alert.alert_type)} className="text-xs">
                              {getDocumentTypeLabel(alert.document_type)}
                            </Badge>
                            <span className="text-xs text-destructive font-medium">
                              {getAlertMessage(alert.alert_type, alert.days_until_expiry)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(alert.expiry_date), 'dd/MM/yyyy', { locale: ar })}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert.mutate(alert.id)}
                        disabled={acknowledgeAlert.isPending}
                      >
                        تأكيد
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring Soon Documents */}
            {expiringSoonAlerts.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  وثائق تنتهي قريباً ({expiringSoonAlerts.length})
                </h4>
                <div className="space-y-2">
                  {expiringSoonAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentTypeIcon(alert.document_type)}
                        <div>
                          <div className="font-medium text-sm">{alert.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            عقد رقم: {alert.contract_number}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getDocumentTypeLabel(alert.document_type)}
                            </Badge>
                            <span className="text-xs text-orange-600 font-medium">
                              {getAlertMessage(alert.alert_type, alert.days_until_expiry)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(alert.expiry_date), 'dd/MM/yyyy', { locale: ar })}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert.mutate(alert.id)}
                        disabled={acknowledgeAlert.isPending}
                      >
                        تأكيد
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};