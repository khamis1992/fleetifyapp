import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { AlertTriangle, Calculator, Info, CheckCircle } from 'lucide-react';
import { useContractWizard } from './ContractWizardProvider';
import { useLateFineSettings } from '@/hooks/useLateFines';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const LateFinesStep: React.FC = () => {
  const { data, updateData } = useContractWizard();
  const { data: globalSettings, isLoading } = useLateFineSettings();
  const { formatCurrency } = useCurrencyFormatter();

  // إعدادات الغرامة للعقد الحالي (تبدأ من الإعدادات العامة)
  const fineSettings = React.useMemo(() => ({
    is_active: data.late_fines_enabled ?? globalSettings?.is_active ?? false,
    fine_type: data.late_fine_type ?? globalSettings?.fine_type ?? 'percentage',
    fine_rate: data.late_fine_rate ?? globalSettings?.fine_rate ?? 0,
    grace_period_days: data.late_fine_grace_period ?? globalSettings?.grace_period_days ?? 0,
    max_fine_amount: data.late_fine_max_amount ?? globalSettings?.max_fine_amount ?? null
  }), [data, globalSettings]);

  // حساب مثال توضيحي للغرامة
  const calculateExampleFine = () => {
    if (!fineSettings.is_active || !data.contract_amount || fineSettings.fine_rate <= 0) {
      return null;
    }

    const exampleDaysOverdue = 10; // مثال: 10 أيام تأخير
    const effectiveOverdueDays = Math.max(0, exampleDaysOverdue - fineSettings.grace_period_days);
    
    let fineAmount = 0;
    if (fineSettings.fine_type === 'percentage') {
      fineAmount = (data.contract_amount * fineSettings.fine_rate / 100) * effectiveOverdueDays;
    } else {
      fineAmount = fineSettings.fine_rate * effectiveOverdueDays;
    }

    // تطبيق الحد الأقصى إذا كان محدداً
    if (fineSettings.max_fine_amount && fineAmount > fineSettings.max_fine_amount) {
      fineAmount = fineSettings.max_fine_amount;
    }

    return {
      daysOverdue: exampleDaysOverdue,
      effectiveOverdueDays,
      fineAmount,
      totalAmount: data.contract_amount + fineAmount
    };
  };

  const exampleCalculation = calculateExampleFine();

  const updateFineSettings = (updates: Partial<typeof fineSettings>) => {
    const newSettings = { ...fineSettings, ...updates };
    updateData({
      late_fines_enabled: newSettings.is_active,
      late_fine_type: newSettings.fine_type as 'percentage' | 'fixed_amount',
      late_fine_rate: newSettings.fine_rate,
      late_fine_grace_period: newSettings.grace_period_days,
      late_fine_max_amount: newSettings.max_fine_amount
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          إعدادات الغرامات المتأخرة
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          اختر إعدادات الغرامات التي ستطبق على هذا العقد في حالة التأخير في السداد
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* إعدادات عامة */}
        {globalSettings && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              تم تطبيق الإعدادات العامة للغرامات تلقائياً. يمكنك تخصيصها لهذا العقد أو استخدام الإعدادات العامة.
            </AlertDescription>
          </Alert>
        )}

        {/* تفعيل/إلغاء تفعيل الغرامات */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>تفعيل الغرامات المتأخرة</Label>
            <p className="text-sm text-muted-foreground">
              فعل هذا الخيار لتطبيق غرامات على التأخير في سداد هذا العقد
            </p>
          </div>
          <Switch
            checked={fineSettings.is_active}
            onCheckedChange={(checked) => updateFineSettings({ is_active: checked })}
          />
        </div>

        {fineSettings.is_active && (
          <div className="space-y-4 border-t pt-4">
            {/* نوع الغرامة */}
            <div className="space-y-2">
              <Label>نوع الغرامة</Label>
              <Select
                value={fineSettings.fine_type}
                onValueChange={(value) => 
                  updateFineSettings({ fine_type: value as 'percentage' | 'fixed_amount' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية من قيمة العقد</SelectItem>
                  <SelectItem value="fixed_amount">مبلغ ثابت يومي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* معدل الغرامة */}
            <div className="space-y-2">
              <Label>
                معدل الغرامة 
                {fineSettings.fine_type === 'percentage' ? '(%)' : '(دينار كويتي)'}
              </Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={fineSettings.fine_rate}
                onChange={(e) => updateFineSettings({ fine_rate: parseFloat(e.target.value) || 0 })}
                placeholder={fineSettings.fine_type === 'percentage' ? 'مثال: 0.1' : 'مثال: 5.000'}
              />
              <p className="text-xs text-muted-foreground">
                {fineSettings.fine_type === 'percentage' 
                  ? 'نسبة مئوية يومية من قيمة العقد (مثال: 0.1% يومياً)' 
                  : 'مبلغ ثابت يطبق كل يوم تأخير'
                }
              </p>
            </div>

            {/* فترة السماح */}
            <div className="space-y-2">
              <Label>فترة السماح (أيام)</Label>
              <Input
                type="number"
                min="0"
                value={fineSettings.grace_period_days}
                onChange={(e) => updateFineSettings({ grace_period_days: parseInt(e.target.value) || 0 })}
                placeholder="مثال: 7"
              />
              <p className="text-xs text-muted-foreground">
                عدد الأيام المسموح بها بعد انتهاء العقد قبل تطبيق الغرامة
              </p>
            </div>

            {/* الحد الأقصى للغرامة (اختياري) */}
            <div className="space-y-2">
              <Label>الحد الأقصى للغرامة (اختياري)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={fineSettings.max_fine_amount || ''}
                onChange={(e) => updateFineSettings({ 
                  max_fine_amount: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="اتركه فارغاً لعدم تحديد حد أقصى"
              />
              <p className="text-xs text-muted-foreground">
                الحد الأقصى لمبلغ الغرامة (اختياري)
              </p>
            </div>
          </div>
        )}

        {/* معاينة حساب الغرامة */}
        {fineSettings.is_active && exampleCalculation && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Calculator className="h-4 w-4" />
                مثال توضيحي لحساب الغرامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>قيمة العقد:</strong> <NumberDisplay value={formatCurrency(data.contract_amount || 0)} /></p>
                  <p><strong>أيام التأخير (مثال):</strong> {exampleCalculation.daysOverdue} يوم</p>
                  <p><strong>فترة السماح:</strong> {fineSettings.grace_period_days} يوم</p>
                  <p><strong>أيام التأخير الفعلية:</strong> {exampleCalculation.effectiveOverdueDays} يوم</p>
                </div>
                <div>
                  <p><strong>معدل الغرامة:</strong> {fineSettings.fine_rate}{fineSettings.fine_type === 'percentage' ? '%' : ' دينار'}</p>
                  <p><strong>مبلغ الغرامة:</strong> <span className="text-red-600 font-bold"><NumberDisplay value={formatCurrency(exampleCalculation.fineAmount)} /></span></p>
                  <p><strong>المبلغ الإجمالي:</strong> <span className="text-blue-600 font-bold"><NumberDisplay value={formatCurrency(exampleCalculation.totalAmount)} /></span></p>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                <strong>طريقة الحساب:</strong>
                {fineSettings.fine_type === 'percentage' ? (
                  <span> {formatCurrency(data.contract_amount || 0)} × {fineSettings.fine_rate}% × {exampleCalculation.effectiveOverdueDays} أيام = {formatCurrency(exampleCalculation.fineAmount)}</span>
                ) : (
                  <span> {formatCurrency(fineSettings.fine_rate)} × {exampleCalculation.effectiveOverdueDays} أيام = {formatCurrency(exampleCalculation.fineAmount)}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* تأكيد الإعدادات */}
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">
            {fineSettings.is_active 
              ? 'سيتم تطبيق إعدادات الغرامات على هذا العقد'
              : 'لن يتم تطبيق غرامات على هذا العقد'
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
};