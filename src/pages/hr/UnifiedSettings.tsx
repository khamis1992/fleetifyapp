import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Clock, 
  DollarSign, 
  Calendar, 
  Mail, 
  MessageSquare,
  Users,
  Building,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useHRSettings, HRSettings } from '@/hooks/useHRSettings';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export default function UnifiedSettings() {
  const { 
    settings, 
    isLoading, 
    updateSettings, 
    isUpdating,
    leaveTypes,
    leaveTypesLoading 
  } = useHRSettings();
 
   const { formatCurrency } = useCurrencyFormatter();

  const [formData, setFormData] = useState<Partial<HRSettings>>({
    daily_working_hours: 8,
    working_days_per_week: 5,
    work_start_time: '08:00',
    work_end_time: '17:00',
    auto_calculate_overtime: true,
    allow_negative_balance: false,
    late_threshold_minutes: 15,
    overtime_rate_percentage: 150,
    late_penalty_per_hour: 0,
    social_security_rate: 11,
    tax_rate: 0,
    payroll_frequency: 'monthly',
    pay_date: 1,
    require_manager_approval: true,
    email_notifications: true,
    sms_notifications: false,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const validateSettings = () => {
    const errors: string[] = [];

    if (formData.daily_working_hours! < 1 || formData.daily_working_hours! > 24) {
      errors.push('ساعات العمل اليومية يجب أن تكون بين 1 و 24 ساعة');
    }

    if (formData.working_days_per_week! < 1 || formData.working_days_per_week! > 7) {
      errors.push('أيام العمل الأسبوعية يجب أن تكون بين 1 و 7 أيام');
    }

    if (formData.overtime_rate_percentage! < 100) {
      errors.push('نسبة الوقت الإضافي يجب أن تكون أكبر من أو تساوي 100%');
    }

    if (formData.social_security_rate! < 0 || formData.social_security_rate! > 50) {
      errors.push('نسبة التأمينات الاجتماعية يجب أن تكون بين 0% و 50%');
    }

    if (formData.tax_rate! < 0 || formData.tax_rate! > 50) {
      errors.push('نسبة الضريبة يجب أن تكون بين 0% و 50%');
    }

    if (formData.pay_date! < 1 || formData.pay_date! > 31) {
      errors.push('يوم الراتب يجب أن يكون بين 1 و 31');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveSettings = () => {
    if (!validateSettings()) {
      toast.error('يرجى تصحيح الأخطاء المذكورة أولاً');
      return;
    }

    updateSettings(formData);
  };

  const handleInputChange = (field: keyof HRSettings, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const calculateMonthlySalaryExample = () => {
    if (!formData.daily_working_hours || !formData.working_days_per_week) return 0;
    const monthlyHours = formData.daily_working_hours * formData.working_days_per_week * 4.33;
    return Math.round(monthlyHours * 3); // 3 KWD per hour as example
  };

  const getIntegrationStatus = () => {
    const modules = [
      { name: 'الرواتب', status: settings ? 'integrated' : 'pending' },
      { name: 'الموظفين', status: settings ? 'integrated' : 'pending' },
      { name: 'الحضور', status: settings ? 'integrated' : 'pending' },
      { name: 'التقارير', status: settings ? 'integrated' : 'pending' },
      { name: 'الإجازات', status: leaveTypes?.length ? 'integrated' : 'partial' },
    ];

    return modules;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إعدادات الموارد البشرية الموحدة</h1>
          <p className="text-muted-foreground">
            إدارة جميع إعدادات الموارد البشرية من مكان واحد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={settings ? 'default' : 'secondary'}>
            {settings ? 'مكون' : 'غير مكون'}
          </Badge>
        </div>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            حالة التكامل مع الوحدات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {getIntegrationStatus().map((module) => (
              <div key={module.name} className="flex items-center gap-2 p-3 border rounded-lg">
                {module.status === 'integrated' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : module.status === 'partial' ? (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <Loader2 className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">{module.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              أخطاء في الإعدادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-red-600 text-sm">• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="integration">التكامل</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                إعدادات الحضور والانصراف
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily_working_hours">ساعات العمل اليومية</Label>
                <Input
                  id="daily_working_hours"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.daily_working_hours}
                  onChange={(e) => handleInputChange('daily_working_hours', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="working_days_per_week">أيام العمل الأسبوعية</Label>
                <Input
                  id="working_days_per_week"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.working_days_per_week}
                  onChange={(e) => handleInputChange('working_days_per_week', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="work_start_time">وقت بداية العمل</Label>
                <Input
                  id="work_start_time"
                  type="time"
                  value={formData.work_start_time}
                  onChange={(e) => handleInputChange('work_start_time', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="work_end_time">وقت نهاية العمل</Label>
                <Input
                  id="work_end_time"
                  type="time"
                  value={formData.work_end_time}
                  onChange={(e) => handleInputChange('work_end_time', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="late_threshold_minutes">عدد دقائق التأخير المسموحة</Label>
                <Input
                  id="late_threshold_minutes"
                  type="number"
                  min="0"
                  value={formData.late_threshold_minutes}
                  onChange={(e) => handleInputChange('late_threshold_minutes', parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                إعدادات الرواتب والحسابات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="overtime_rate_percentage">نسبة الوقت الإضافي (%)</Label>
                  <Input
                    id="overtime_rate_percentage"
                    type="number"
                    min="100"
                    value={formData.overtime_rate_percentage}
                    onChange={(e) => handleInputChange('overtime_rate_percentage', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    مثال: 150% يعني 1.5 ضعف الراتب العادي
                  </p>
                </div>
                <div>
                  <Label htmlFor="social_security_rate">نسبة التأمينات الاجتماعية (%)</Label>
                  <Input
                    id="social_security_rate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={formData.social_security_rate}
                    onChange={(e) => handleInputChange('social_security_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="tax_rate">نسبة الضريبة (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="payroll_frequency">تكرار الراتب</Label>
                  <Select 
                    value={formData.payroll_frequency} 
                    onValueChange={(value) => handleInputChange('payroll_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">أسبوعي</SelectItem>
                      <SelectItem value="monthly">شهري</SelectItem>
                      <SelectItem value="quarterly">ربع سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pay_date">يوم دفع الراتب من الشهر</Label>
                  <Input
                    id="pay_date"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.pay_date}
                    onChange={(e) => handleInputChange('pay_date', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.auto_calculate_overtime}
                  onCheckedChange={(checked) => handleInputChange('auto_calculate_overtime', checked)}
                />
                <Label>حساب الوقت الإضافي تلقائياً</Label>
              </div>
            </CardContent>
          </Card>

          {/* Salary Calculation Example */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-700">مثال على حساب الراتب</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-600">
              <p>بناءً على الإعدادات الحالية:</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• ساعات العمل الشهرية: {(formData.daily_working_hours! * formData.working_days_per_week! * 4.33).toFixed(1)} ساعة</li>
                <li>• الراتب المقترح الأدنى: {formatCurrency(calculateMonthlySalaryExample())}</li>
                <li>• معدل الساعة الإضافية: {formData.overtime_rate_percentage}% من المعدل العادي</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                إعدادات إدارة الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.require_manager_approval}
                  onCheckedChange={(checked) => handleInputChange('require_manager_approval', checked)}
                />
                <Label>تتطلب موافقة المدير</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.allow_negative_balance}
                  onCheckedChange={(checked) => handleInputChange('allow_negative_balance', checked)}
                />
                <Label>السماح برصيد إجازات سالب</Label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-yellow-700 text-sm">
                  هذه الإعدادات ستؤثر على جميع العمليات المتعلقة بالموظفين، بما في ذلك الإجازات والرواتب والحضور.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                />
                <Mail className="h-4 w-4" />
                <Label>إشعارات البريد الإلكتروني</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.sms_notifications}
                  onCheckedChange={(checked) => handleInputChange('sms_notifications', checked)}
                />
                <MessageSquare className="h-4 w-4" />
                <Label>إشعارات الرسائل النصية</Label>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-blue-700 text-sm">
                  ستؤثر هذه الإعدادات على جميع الإشعارات في النظام، بما في ذلك تقارير الرواتب وتنبيهات الحضور.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                حالة التكامل مع الوحدات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getIntegrationStatus().map((module) => (
                  <div key={module.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {module.status === 'integrated' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : module.status === 'partial' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-medium">{module.name}</span>
                    </div>
                    <Badge 
                      variant={
                        module.status === 'integrated' ? 'default' : 
                        module.status === 'partial' ? 'secondary' : 'outline'
                      }
                    >
                      {module.status === 'integrated' ? 'مدمج' : 
                       module.status === 'partial' ? 'جزئي' : 'قيد الانتظار'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex gap-4">
        <Button onClick={() => setFormData(settings || {})} variant="outline" disabled={isUpdating}>
          إلغاء التغييرات
        </Button>
        <Button onClick={handleSaveSettings} disabled={isUpdating || validationErrors.length > 0}>
          {isUpdating ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}