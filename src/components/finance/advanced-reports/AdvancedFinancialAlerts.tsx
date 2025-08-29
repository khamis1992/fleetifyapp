import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Bell, TrendingDown, Clock, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FinancialAlert {
  id: string;
  type: 'overdue_increase' | 'collection_drop' | 'customer_risk' | 'payment_delay' | 'cash_flow';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  amount?: number;
  customer_id?: string;
  customer_name?: string;
  days_overdue?: number;
  percentage_change?: number;
  created_at: string;
  is_acknowledged: boolean;
}

interface AdvancedFinancialAlertsProps {
  alerts: FinancialAlert[];
  onConfigureAlert: (config: AlertConfig) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

interface AlertConfig {
  type: string;
  threshold: number;
  notification_method: string;
  recipients: string[];
  is_active: boolean;
}

const formatCurrency = (amount: number) => `${amount.toFixed(3)} د.ك`;

export const AdvancedFinancialAlerts: React.FC<AdvancedFinancialAlertsProps> = ({
  alerts,
  onConfigureAlert,
  onAcknowledgeAlert
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    type: 'overdue_increase',
    threshold: 1000,
    notification_method: 'email',
    recipients: [],
    is_active: true
  });
  const { toast } = useToast();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue_increase':
        return <AlertTriangle className="h-4 w-4" />;
      case 'collection_drop':
        return <TrendingDown className="h-4 w-4" />;
      case 'customer_risk':
        return <Users className="h-4 w-4" />;
      case 'payment_delay':
        return <Clock className="h-4 w-4" />;
      case 'cash_flow':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'حرج';
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return 'غير محدد';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'overdue_increase':
        return 'زيادة المتأخرات';
      case 'collection_drop':
        return 'انخفاض التحصيلات';
      case 'customer_risk':
        return 'مخاطر العملاء';
      case 'payment_delay':
        return 'تأخير المدفوعات';
      case 'cash_flow':
        return 'التدفق النقدي';
      default:
        return 'تنبيه عام';
    }
  };

  const handleConfigureAlert = () => {
    onConfigureAlert(alertConfig);
    setShowConfig(false);
    toast({
      title: "تم حفظ إعدادات التنبيه",
      description: "سيتم تطبيق الإعدادات الجديدة"
    });
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.is_acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.is_acknowledged);

  return (
    <div className="space-y-6">
      {/* شريط التحكم */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              التنبيهات المالية المتقدمة
            </CardTitle>
            <Button onClick={() => setShowConfig(!showConfig)} variant="outline">
              إعدادات التنبيهات
            </Button>
          </div>
        </CardHeader>
        {showConfig && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>نوع التنبيه</Label>
                <Select value={alertConfig.type} onValueChange={(value) => setAlertConfig({...alertConfig, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overdue_increase">زيادة المتأخرات</SelectItem>
                    <SelectItem value="collection_drop">انخفاض التحصيلات</SelectItem>
                    <SelectItem value="customer_risk">مخاطر العملاء</SelectItem>
                    <SelectItem value="payment_delay">تأخير المدفوعات</SelectItem>
                    <SelectItem value="cash_flow">التدفق النقدي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>العتبة</Label>
                <Input
                  type="number"
                  value={alertConfig.threshold}
                  onChange={(e) => setAlertConfig({...alertConfig, threshold: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleConfigureAlert}>حفظ الإعدادات</Button>
              <Button variant="outline" onClick={() => setShowConfig(false)}>إلغاء</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* التنبيهات غير المؤكدة */}
      {unacknowledgedAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">تنبيهات تتطلب انتباه ({unacknowledgedAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unacknowledgedAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                        <Badge variant="outline">
                          {getAlertTypeLabel(alert.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {alert.amount && (
                          <span>المبلغ: {formatCurrency(alert.amount)}</span>
                        )}
                        {alert.customer_name && (
                          <span>العميل: {alert.customer_name}</span>
                        )}
                        {alert.days_overdue && (
                          <span>أيام التأخير: {alert.days_overdue}</span>
                        )}
                        {alert.percentage_change && (
                          <span>التغيير: {alert.percentage_change.toFixed(1)}%</span>
                        )}
                        <span>التاريخ: {new Date(alert.created_at).toLocaleDateString('ar')}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcknowledgeAlert(alert.id)}
                  >
                    تأكيد
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* التنبيهات المؤكدة */}
      {acknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">تنبيهات مؤكدة ({acknowledgedAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acknowledgedAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">مؤكد</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleDateString('ar')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد تنبيهات حالياً</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};