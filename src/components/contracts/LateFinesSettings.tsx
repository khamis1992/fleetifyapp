import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Calculator, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLateFineSettings, useUpdateLateFineSettings, useCalculateLateFines } from '@/hooks/useLateFines';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const LateFinesSettings = () => {
  const { data: settings, isLoading } = useLateFineSettings();
  const updateSettings = useUpdateLateFineSettings();
  const calculateFines = useCalculateLateFines();
  
  const [formData, setFormData] = useState({
    fine_type: settings?.fine_type || 'percentage',
    fine_rate: settings?.fine_rate || 1,
    grace_period_days: settings?.grace_period_days || 7,
    max_fine_amount: settings?.max_fine_amount || 0,
    is_active: settings?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleCalculateFines = () => {
    calculateFines.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات الغرامات المتأخرة
          </CardTitle>
          <CardDescription>
            تكوين قواعد الغرامات التي تُطبق على العقود المتأخرة عن موعد الاستحقاق
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">تفعيل نظام الغرامات</Label>
                <p className="text-sm text-muted-foreground">
                  تشغيل أو إيقاف نظام الغرامات المتأخرة
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fine_type">نوع الغرامة</Label>
                    <Select
                      value={formData.fine_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fine_type: value as 'percentage' | 'fixed_amount' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">نسبة مئوية من مبلغ العقد</SelectItem>
                        <SelectItem value="fixed_amount">مبلغ ثابت يومي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fine_rate">
                      {formData.fine_type === 'percentage' ? 'النسبة المئوية (%)' : 'المبلغ اليومي (د.ك)'}
                    </Label>
                    <Input
                      id="fine_rate"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.fine_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, fine_rate: parseFloat(e.target.value) || 0 }))}
                      placeholder={formData.fine_type === 'percentage' ? '1.0' : '5.000'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grace_period_days">فترة السماح (أيام)</Label>
                    <Input
                      id="grace_period_days"
                      type="number"
                      min="0"
                      value={formData.grace_period_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, grace_period_days: parseInt(e.target.value) || 0 }))}
                      placeholder="7"
                    />
                    <p className="text-xs text-muted-foreground">
                      عدد الأيام بعد تاريخ الاستحقاق قبل تطبيق الغرامة
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_fine_amount">الحد الأقصى للغرامة (د.ك)</Label>
                    <Input
                      id="max_fine_amount"
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.max_fine_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_fine_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0 (غير محدود)"
                    />
                    <p className="text-xs text-muted-foreground">
                      اتركه فارغاً أو 0 لعدم تحديد حد أقصى
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>مثال على الحساب:</strong><br />
                    {formData.fine_type === 'percentage' 
                      ? `عقد بقيمة 1000 د.ك، متأخر 10 أيام (بعد فترة السماح): ${formData.fine_rate}% × 1000 × 10 = ${(formData.fine_rate * 1000 * 10 / 100).toFixed(3)} د.ك`
                      : `عقد متأخر 10 أيام (بعد فترة السماح): ${formData.fine_rate} × 10 = ${(formData.fine_rate * 10).toFixed(3)} د.ك`
                    }
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
              
              {formData.is_active && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculateFines}
                  disabled={calculateFines.isPending}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {calculateFines.isPending ? 'جاري الحساب...' : 'حساب الغرامات الآن'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};