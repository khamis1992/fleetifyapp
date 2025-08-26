
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings, Users, Clock, DollarSign, Layers } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccountMovementSettings, useUpdateAccountMovementSettings } from '@/hooks/useAccountMovementSettings';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const AccountMovementSettings = () => {
  const { data: settings, isLoading } = useAccountMovementSettings();
  const updateSettings = useUpdateAccountMovementSettings();
  
  const [formData, setFormData] = useState({
    auto_create_movements: true,
    default_movement_type: 'journal_entry',
    require_approval: false,
    approval_threshold: 1000,
    is_active: true,
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        auto_create_movements: settings.auto_create_movements,
        default_movement_type: settings.default_movement_type || 'journal_entry',
        require_approval: settings.require_approval,
        approval_threshold: settings.approval_threshold || 1000,
        is_active: settings.is_active,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">الحركات النشطة</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-medium">في انتظار الموافقة</p>
                <p className="text-2xl font-bold text-warning">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-medium">إجمالي المبلغ</p>
                <p className="text-2xl font-bold text-success">0.000 د.ك</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">حالة النظام</p>
                <Badge variant={formData.is_active ? "default" : "secondary"}>
                  {formData.is_active ? "مفعل" : "معطل"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات حركة الحسابات
          </CardTitle>
          <CardDescription>
            تكوين قواعد إنشاء وإدارة حركات الحسابات المحاسبية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">تفعيل نظام حركة الحسابات</Label>
                <p className="text-sm text-muted-foreground">
                  تشغيل أو إيقاف نظام حركة الحسابات المحاسبية
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {formData.is_active && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_create_movements">إنشاء الحركات تلقائياً</Label>
                    <p className="text-sm text-muted-foreground">
                      إنشاء قيود محاسبية تلقائياً عند إنشاء الفواتير والمعاملات
                    </p>
                  </div>
                  <Switch
                    id="auto_create_movements"
                    checked={formData.auto_create_movements}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_create_movements: checked }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_movement_type">نوع الحركة الافتراضي</Label>
                    <Select
                      value={formData.default_movement_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, default_movement_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="journal_entry">قيد يومية</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="cash_transaction">معاملة نقدية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approval_threshold">حد الموافقة (د.ك)</Label>
                    <Input
                      id="approval_threshold"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.approval_threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, approval_threshold: parseFloat(e.target.value) || 0 }))}
                      placeholder="1000"
                    />
                    <p className="text-xs text-muted-foreground">
                      المبلغ الذي يتطلب موافقة لإنشاء الحركة
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="require_approval">طلب الموافقة</Label>
                    <p className="text-sm text-muted-foreground">
                      طلب موافقة للحركات التي تتجاوز الحد المحدد
                    </p>
                  </div>
                  <Switch
                    id="require_approval"
                    checked={formData.require_approval}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_approval: checked }))}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ملاحظة:</strong> هذه الإعدادات تؤثر على جميع الحركات المحاسبية الجديدة في الشركة.
                    تأكد من مراجعة الإعدادات بعناية قبل الحفظ.
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
