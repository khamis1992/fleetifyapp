import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Eye,
  Play,
  Settings,
  TrendingUp,
  X,
  Zap,
  Loader2,
} from 'lucide-react';
import {
  useActiveAlerts,
  useAlertStatistics,
  useAlertConfigs,
  useRunAlertsCheck,
  useAcknowledgeAlert,
  useUpdateAlertStatus,
  useUpdateAlertConfig,
  type SmartAlert,
  type SmartAlertConfig,
} from '@/hooks/useEnhancedSmartAlerts';

export const EnhancedSmartAlertsPanel: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  const { data: alerts, isLoading: alertsLoading } = useActiveAlerts();
  const { data: statistics } = useAlertStatistics();
  const { data: configs } = useAlertConfigs();
  const runAlertsCheckMutation = useRunAlertsCheck();
  const acknowledgeAlertMutation = useAcknowledgeAlert();
  const updateAlertStatusMutation = useUpdateAlertStatus();
  const updateConfigMutation = useUpdateAlertConfig();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <Bell className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Bell className="h-4 w-4 text-red-600" />;
      case 'acknowledged':
        return <Eye className="h-4 w-4 text-yellow-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'dismissed':
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_due_reminder: 'تذكير باستحقاق دفعة',
      payment_overdue: 'دفعة متأخرة',
      credit_limit_warning: 'تحذير الحد الائتماني',
      credit_limit_exceeded: 'تجاوز الحد الائتماني',
      high_overdue_amount: 'مبلغ متأخر مرتفع',
      contract_expiry_warning: 'تحذير انتهاء عقد',
      vehicle_registration_expiry: 'انتهاء تسجيل مركبة',
      vehicle_insurance_expiry: 'انتهاء تأمين مركبة',
    };
    return labels[type] || type;
  };

  const handleViewDetails = (alert: SmartAlert) => {
    setSelectedAlert(alert);
    setIsDetailsOpen(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await acknowledgeAlertMutation.mutateAsync(alertId);
  };

  const handleUpdateAlertStatus = async (alertId: string, status: 'acknowledged' | 'resolved' | 'dismissed') => {
    await updateAlertStatusMutation.mutateAsync({ alertId, status });
  };

  const handleRunAlertsCheck = async () => {
    await runAlertsCheckMutation.mutateAsync();
  };

  const handleToggleConfig = async (configId: string, isEnabled: boolean) => {
    await updateConfigMutation.mutateAsync({ configId, isEnabled });
  };

  if (alertsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin ml-2" />
          جاري تحميل التنبيهات...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات التنبيهات */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي التنبيهات</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">نشطة</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.active}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">تم الإقرار</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.acknowledged}</p>
                </div>
                <Eye className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">تم الحل</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* لوحة التنبيهات الرئيسية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              التنبيهات الذكية
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRunAlertsCheck}
                disabled={runAlertsCheckMutation.isPending}
              >
                {runAlertsCheckMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                <Play className="h-4 w-4 ml-2" />
                فحص التنبيهات
              </Button>
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 ml-2" />
                    الإعدادات
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>إعدادات التنبيهات الذكية</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>نوع التنبيه</TableHead>
                          <TableHead>مفعل</TableHead>
                          <TableHead>شروط التفعيل</TableHead>
                          <TableHead>إعدادات الإشعار</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configs?.map((config) => (
                          <TableRow key={config.id}>
                            <TableCell>
                              {getAlertTypeLabel(config.alert_type)}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={config.is_enabled}
                                onCheckedChange={(checked) => 
                                  handleToggleConfig(config.id, checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {JSON.stringify(config.trigger_conditions)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {config.notification_settings?.email && '📧 '}
                                {config.notification_settings?.sms && '📱 '}
                                {config.notification_settings?.in_app && '🔔 '}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="alerts">التنبيهات النشطة</TabsTrigger>
              <TabsTrigger value="statistics">الإحصائيات</TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="space-y-4">
              {!alerts || alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>لا توجد تنبيهات نشطة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4" style={{
                      borderLeftColor: alert.priority === 'critical' ? '#ef4444' :
                                      alert.priority === 'high' ? '#f97316' :
                                      alert.priority === 'medium' ? '#eab308' : '#3b82f6'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getPriorityIcon(alert.priority)}
                              <h4 className="font-medium">{alert.alert_title}</h4>
                              <Badge className={getPriorityColor(alert.priority)}>
                                {alert.priority}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getStatusIcon(alert.status)}
                                {alert.status === 'active' ? 'نشط' :
                                 alert.status === 'acknowledged' ? 'تم الإقرار' :
                                 alert.status === 'resolved' ? 'تم الحل' : 'مرفوض'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-2">{alert.alert_message}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{getAlertTypeLabel(alert.alert_type)}</span>
                              <span>•</span>
                              <span>{format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(alert)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {alert.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                disabled={acknowledgeAlertMutation.isPending}
                              >
                                إقرار
                              </Button>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateAlertStatus(alert.id, 'resolved')}
                                disabled={updateAlertStatusMutation.isPending}
                              >
                                حل
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* إحصائيات الأولوية */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        توزيع الأولوية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            حرجة
                          </span>
                          <span className="font-medium">{statistics.byPriority.critical}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            عالية
                          </span>
                          <span className="font-medium">{statistics.byPriority.high}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            متوسطة
                          </span>
                          <span className="font-medium">{statistics.byPriority.medium}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            منخفضة
                          </span>
                          <span className="font-medium">{statistics.byPriority.low}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* إحصائيات الأنواع */}
                  <Card>
                    <CardHeader>
                      <CardTitle>توزيع الأنواع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(statistics.byType).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span>{getAlertTypeLabel(type)}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog لتفاصيل التنبيه */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التنبيه</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>العنوان</Label>
                  <div className="mt-1 font-medium">{selectedAlert.alert_title}</div>
                </div>
                <div>
                  <Label>النوع</Label>
                  <div className="mt-1">{getAlertTypeLabel(selectedAlert.alert_type)}</div>
                </div>
                <div>
                  <Label>الأولوية</Label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(selectedAlert.priority)}>
                      {selectedAlert.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getStatusIcon(selectedAlert.status)}
                      {selectedAlert.status === 'active' ? 'نشط' :
                       selectedAlert.status === 'acknowledged' ? 'تم الإقرار' :
                       selectedAlert.status === 'resolved' ? 'تم الحل' : 'مرفوض'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>تاريخ الإنشاء</Label>
                  <div className="mt-1">
                    {format(new Date(selectedAlert.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                  </div>
                </div>
                {selectedAlert.acknowledged_at && (
                  <div>
                    <Label>تاريخ الإقرار</Label>
                    <div className="mt-1">
                      {format(new Date(selectedAlert.acknowledged_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label>الرسالة</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  {selectedAlert.alert_message}
                </div>
              </div>

              {selectedAlert.alert_data && Object.keys(selectedAlert.alert_data).length > 0 && (
                <div>
                  <Label>بيانات إضافية</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(selectedAlert.alert_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {selectedAlert.status === 'active' && (
                  <Button
                    onClick={() => {
                      handleUpdateAlertStatus(selectedAlert.id, 'acknowledged');
                      setIsDetailsOpen(false);
                    }}
                    disabled={updateAlertStatusMutation.isPending}
                  >
                    إقرار
                  </Button>
                )}
                {selectedAlert.status === 'acknowledged' && (
                  <Button
                    onClick={() => {
                      handleUpdateAlertStatus(selectedAlert.id, 'resolved');
                      setIsDetailsOpen(false);
                    }}
                    disabled={updateAlertStatusMutation.isPending}
                  >
                    حل
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleUpdateAlertStatus(selectedAlert.id, 'dismissed');
                    setIsDetailsOpen(false);
                  }}
                  disabled={updateAlertStatusMutation.isPending}
                >
                  تجاهل
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
