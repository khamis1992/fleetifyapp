import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useVehicleAlerts, useAcknowledgeVehicleAlert, useCreateVehicleAlert } from "@/hooks/useVehicleAlerts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

interface VehicleAlertsPanelProps {
  vehicleId: string;
}

interface AlertFormData {
  alert_type: 'insurance_expiry' | 'maintenance_due' | 'inspection_due' | 'license_expiry' | 'warranty_expiry' | 'service_overdue';
  alert_title: string;
  alert_message: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export function VehicleAlertsPanel({ vehicleId }: VehicleAlertsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: alerts, isLoading } = useVehicleAlerts(vehicleId);
  const acknowledgeAlert = useAcknowledgeVehicleAlert();
  const createAlert = useCreateVehicleAlert();

  const { register, handleSubmit, reset } = useForm<AlertFormData>({
    defaultValues: {
      priority: 'medium',
    }
  });

  const onSubmit = async (data: AlertFormData) => {
    await createAlert.mutateAsync({
      ...data,
      vehicle_id: vehicleId,
      is_acknowledged: false,
    });
    
    reset();
    setShowForm(false);
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert.mutateAsync(alertId);
  };

  const unacknowledgedAlerts = alerts?.filter(alert => !alert.is_acknowledged) || [];
  const acknowledgedAlerts = alerts?.filter(alert => alert.is_acknowledged) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels = {
      insurance_expiry: 'انتهاء التأمين',
      maintenance_due: 'صيانة مستحقة',
      inspection_due: 'فحص مستحق',
      license_expiry: 'انتهاء الرخصة',
      warranty_expiry: 'انتهاء الضمان',
      service_overdue: 'صيانة متأخرة'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          التنبيهات والإشعارات
        </CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              إضافة تنبيه
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة تنبيه جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert_type">نوع التنبيه</Label>
                <Select onValueChange={(value) => register('alert_type').onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التنبيه" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance_expiry">انتهاء التأمين</SelectItem>
                    <SelectItem value="maintenance_due">صيانة مستحقة</SelectItem>
                    <SelectItem value="inspection_due">فحص مستحق</SelectItem>
                    <SelectItem value="license_expiry">انتهاء الرخصة</SelectItem>
                    <SelectItem value="warranty_expiry">انتهاء الضمان</SelectItem>
                    <SelectItem value="service_overdue">صيانة متأخرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_title">عنوان التنبيه</Label>
                <Input {...register('alert_title', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_message">رسالة التنبيه</Label>
                <Textarea {...register('alert_message', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">تاريخ الاستحقاق (اختياري)</Label>
                <Input type="date" {...register('due_date')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">الأولوية</Label>
                <Select onValueChange={(value) => register('priority').onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="critical">حرجة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={createAlert.isPending}>
                {createAlert.isPending ? 'جاري الحفظ...' : 'حفظ التنبيه'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {unacknowledgedAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              التنبيهات غير المقروءة ({unacknowledgedAlerts.length})
            </h4>
            {unacknowledgedAlerts.map((alert) => (
              <div key={alert.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityColor(alert.priority)}>
                        {getAlertTypeLabel(alert.alert_type)}
                      </Badge>
                      <Badge variant="outline">{alert.priority}</Badge>
                    </div>
                    <p className="font-medium">{alert.alert_title}</p>
                    <p className="text-sm text-muted-foreground">{alert.alert_message}</p>
                    {alert.due_date && (
                      <p className="text-sm text-muted-foreground">
                        تاريخ الاستحقاق: {format(new Date(alert.due_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledgeAlert.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}

        {acknowledgedAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              التنبيهات المقروءة
            </h4>
            {acknowledgedAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 border rounded-lg opacity-60 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                </div>
                <p className="font-medium">{alert.alert_title}</p>
                <p className="text-sm text-muted-foreground">{alert.alert_message}</p>
                <p className="text-xs text-muted-foreground">
                  تم قراءته في: {alert.acknowledged_at && format(new Date(alert.acknowledged_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}

        {alerts?.length === 0 && (
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا توجد تنبيهات</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}