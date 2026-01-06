import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Clock, DollarSign, Plus, Trash2, Edit, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useHRSettings, type HRSettings } from '@/hooks/useHRSettings';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function HRSettings() {
  const {
    settings,
    isLoading,
    updateSettings,
    isUpdating,
    leaveTypes,
    leaveTypesLoading,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    isCreatingLeaveType
  } = useHRSettings();

  const [formData, setFormData] = useState<Partial<HRSettings>>({});
  const [isLeaveTypeDialogOpen, setIsLeaveTypeDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<any>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    type_name: '',
    type_name_ar: '',
    max_days_per_year: 0,
    requires_approval: true,
    description: ''
  });

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: keyof HRSettings, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    if (Object.keys(formData).length === 0) {
      toast.error('لا توجد تغييرات للحفظ');
      return;
    }
    updateSettings(formData);
  };

  const handleCreateLeaveType = () => {
    if (!leaveTypeForm.type_name || !leaveTypeForm.type_name_ar) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    createLeaveType(leaveTypeForm);
    setLeaveTypeForm({
      type_name: '',
      type_name_ar: '',
      max_days_per_year: 0,
      requires_approval: true,
      description: ''
    });
    setIsLeaveTypeDialogOpen(false);
  };

  const handleEditLeaveType = (leaveType: any) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeForm({
      type_name: leaveType.type_name,
      type_name_ar: leaveType.type_name_ar || '',
      max_days_per_year: leaveType.max_days_per_year,
      requires_approval: leaveType.requires_approval,
      description: leaveType.description || ''
    });
    setIsLeaveTypeDialogOpen(true);
  };

  const handleUpdateLeaveType = () => {
    if (!editingLeaveType) return;
    
    updateLeaveType({
      id: editingLeaveType.id,
      updates: leaveTypeForm
    });
    
    setEditingLeaveType(null);
    setLeaveTypeForm({
      type_name: '',
      type_name_ar: '',
      max_days_per_year: 0,
      requires_approval: true,
      description: ''
    });
    setIsLeaveTypeDialogOpen(false);
  };

  const handleDeleteLeaveType = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا النوع من الإجازات؟')) {
      deleteLeaveType(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات الموارد البشرية</h1>
          <p className="text-gray-600">إدارة إعدادات النظام والرواتب</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* إعدادات الحضور */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-gray-900">إعدادات الحضور والانصراف</CardTitle>
            </div>
            <CardDescription className="text-gray-600">تكوين أوقات العمل وسياسات الحضور</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="working-hours" className="text-gray-700">ساعات العمل اليومية</Label>
                <Input
                  id="working-hours"
                  type="number"
                  value={formData.daily_working_hours || 8}
                  onChange={(e) => handleInputChange('daily_working_hours', parseFloat(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="working-days" className="text-gray-700">أيام العمل الأسبوعية</Label>
                <Input
                  id="working-days"
                  type="number"
                  value={formData.working_days_per_week || 5}
                  onChange={(e) => handleInputChange('working_days_per_week', parseInt(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-gray-700">وقت بداية العمل</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.work_start_time || '08:00'}
                  onChange={(e) => handleInputChange('work_start_time', e.target.value)}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-gray-700">وقت نهاية العمل</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.work_end_time || '17:00'}
                  onChange={(e) => handleInputChange('work_end_time', e.target.value)}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="late-threshold" className="text-gray-700">حد التأخير المسموح (بالدقائق)</Label>
              <Input
                id="late-threshold"
                type="number"
                value={formData.late_threshold_minutes || 15}
                onChange={(e) => handleInputChange('late_threshold_minutes', parseInt(e.target.value))}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            <Separator className="bg-gray-200/50" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-900">حساب الإضافي تلقائياً</Label>
                  <p className="text-sm text-gray-600">
                    حساب ساعات العمل الإضافية تلقائياً بعد انتهاء وقت العمل الرسمي
                  </p>
                </div>
                <Switch
                  checked={formData.auto_calculate_overtime ?? true}
                  onCheckedChange={(checked) => handleInputChange('auto_calculate_overtime', checked)}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-900">السماح بالأرصدة السالبة</Label>
                  <p className="text-sm text-gray-600">
                    السماح للموظفين بالحصول على راتب سالب في حالة الخصومات الكبيرة
                  </p>
                </div>
                <Switch
                  checked={formData.allow_negative_balance ?? false}
                  onCheckedChange={(checked) => handleInputChange('allow_negative_balance', checked)}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الرواتب */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-gray-900">إعدادات الرواتب</CardTitle>
            </div>
            <CardDescription className="text-gray-600">تكوين حسابات الرواتب والخصومات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="overtime-rate" className="text-gray-700">معدل الساعات الإضافية (%)</Label>
                <Input
                  id="overtime-rate"
                  type="number"
                  step="0.1"
                  value={formData.overtime_rate_percentage || 150}
                  onChange={(e) => handleInputChange('overtime_rate_percentage', parseFloat(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
                <p className="text-xs text-gray-600">نسبة الزيادة على الساعة العادية للساعات الإضافية</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-penalty" className="text-gray-700">غرامة التأخير (للساعة)</Label>
                <Input
                  id="late-penalty"
                  type="number"
                  step="0.01"
                  value={formData.late_penalty_per_hour || 0}
                  onChange={(e) => handleInputChange('late_penalty_per_hour', parseFloat(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="social-security" className="text-gray-700">نسبة التأمينات الاجتماعية (%)</Label>
                <Input
                  id="social-security"
                  type="number"
                  step="0.01"
                  value={formData.social_security_rate || 11}
                  onChange={(e) => handleInputChange('social_security_rate', parseFloat(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate" className="text-gray-700">نسبة الضريبة (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate || 0}
                  onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-frequency" className="text-gray-700">دورية الرواتب</Label>
                <Select
                  value={formData.payroll_frequency || 'monthly'}
                  onValueChange={(value) => handleInputChange('payroll_frequency', value)}
                >
                  <SelectTrigger className="border-gray-200 focus:border-teal-500 focus:ring-teal-500">
                    <SelectValue placeholder="اختر دورية الرواتب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="bi-weekly">كل أسبوعين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date" className="text-gray-700">يوم الدفع (من كل شهر)</Label>
                <Input
                  id="pay-date"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.pay_date || 1}
                  onChange={(e) => handleInputChange('pay_date', parseInt(e.target.value))}
                  className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الإجازات */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <div>
                  <CardTitle className="text-gray-900">إعدادات الإجازات</CardTitle>
                  <CardDescription className="text-gray-600">إدارة أنواع الإجازات والأرصدة من جدول واحد موحد</CardDescription>
                </div>
              </div>
              <Dialog open={isLeaveTypeDialogOpen} onOpenChange={setIsLeaveTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingLeaveType(null);
                      setLeaveTypeForm({
                        type_name: '',
                        type_name_ar: '',
                        max_days_per_year: 0,
                        requires_approval: true,
                        description: ''
                      });
                    }}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة نوع إجازة
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">
                      {editingLeaveType ? 'تعديل نوع الإجازة' : 'إضافة نوع إجازة جديد'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      {editingLeaveType ? 'تعديل تفاصيل نوع الإجازة' : 'إضافة نوع إجازة جديد للنظام'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="leave-type-name" className="text-gray-700">اسم النوع (بالإنجليزية) *</Label>
                      <Input
                        id="leave-type-name"
                        value={leaveTypeForm.type_name}
                        onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, type_name: e.target.value }))}
                        placeholder="Annual Leave"
                        className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leave-type-name-ar" className="text-gray-700">اسم النوع (بالعربية) *</Label>
                      <Input
                        id="leave-type-name-ar"
                        value={leaveTypeForm.type_name_ar}
                        onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, type_name_ar: e.target.value }))}
                        placeholder="إجازة سنوية"
                        className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-days" className="text-gray-700">عدد الأيام المسموحة سنوياً</Label>
                      <Input
                        id="max-days"
                        type="number"
                        value={leaveTypeForm.max_days_per_year}
                        onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, max_days_per_year: parseInt(e.target.value) }))}
                        className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-900">يتطلب موافقة المدير</Label>
                      <Switch
                        checked={leaveTypeForm.requires_approval}
                        onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, requires_approval: checked }))}
                        className="data-[state=checked]:bg-teal-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-gray-700">الوصف</Label>
                      <Textarea
                        id="description"
                        value={leaveTypeForm.description}
                        onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="وصف نوع الإجازة..."
                        className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsLeaveTypeDialogOpen(false)}
                      className="border-gray-200 hover:border-teal-500 hover:text-teal-600"
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={editingLeaveType ? handleUpdateLeaveType : handleCreateLeaveType}
                      disabled={isCreatingLeaveType}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                    >
                      {editingLeaveType ? 'تحديث' : 'إضافة'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                جميع أنواع الإجازات يتم إدارتها الآن من خلال نظام موحد. يمكنك إضافة وتعديل أنواع الإجازات أدناه.
              </p>

              {leaveTypesLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">أنواع الإجازات المتاحة</h4>
                  {leaveTypes && leaveTypes.length > 0 ? (
                    <div className="space-y-2">
                      {leaveTypes.map((leaveType) => (
                        <div key={leaveType.id} className="flex items-center justify-between p-3 border border-gray-200/50 rounded-xl hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10 transition-all bg-white/50 backdrop-blur-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-gray-900">{leaveType.type_name_ar || leaveType.type_name}</h5>
                              <Badge variant={leaveType.is_active ? "default" : "secondary"}>
                                {leaveType.is_active ? "نشط" : "غير نشط"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {leaveType.max_days_per_year} أيام سنوياً •
                              {leaveType.requires_approval ? " يتطلب موافقة" : " لا يتطلب موافقة"}
                            </p>
                            {leaveType.description && (
                              <p className="text-sm text-gray-600 mt-1">{leaveType.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditLeaveType(leaveType)}
                              className="border-gray-200 hover:border-teal-500 hover:text-teal-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLeaveType(leaveType.id)}
                              className="border-gray-200 hover:border-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 py-4">
                      لا توجد أنواع إجازات محددة
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* إعدادات النظام */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-gray-900">إعدادات النظام</CardTitle>
            <CardDescription className="text-gray-600">إعدادات عامة للنظام والإشعارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-900">موافقة المدير مطلوبة</Label>
                <p className="text-sm text-gray-600">
                  يتطلب موافقة المدير على طلبات الإجازات والحضور
                </p>
              </div>
              <Switch
                checked={formData.require_manager_approval ?? true}
                onCheckedChange={(checked) => handleInputChange('require_manager_approval', checked)}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-900">إشعارات البريد الإلكتروني</Label>
                <p className="text-sm text-gray-600">
                  إرسال إشعارات عبر البريد الإلكتروني للموظفين والمديرين
                </p>
              </div>
              <Switch
                checked={formData.email_notifications ?? true}
                onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-900">إشعارات الرسائل النصية</Label>
                <p className="text-sm text-gray-600">
                  إرسال إشعارات عبر الرسائل النصية للمناسبات المهمة
                </p>
              </div>
              <Switch
                checked={formData.sms_notifications ?? false}
                onCheckedChange={(checked) => handleInputChange('sms_notifications', checked)}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* أزرار الحفظ */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setFormData(settings || {})}
            className="border-gray-200 hover:border-teal-500 hover:text-teal-600"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isUpdating}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
          >
            {isUpdating ? (
              <LoadingSpinner />
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}