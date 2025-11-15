import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, Settings, Users, Clock, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLateFineSettings, useUpdateLateFineSettings, useCalculateLateFines } from '@/hooks/useLateFines';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useContractsData } from '@/hooks/useContractsData';

export const LateFinesSettings = () => {
  const { data: settings, isLoading } = useLateFineSettings();
  const updateSettings = useUpdateLateFineSettings();
  const calculateFines = useCalculateLateFines();
  const { contracts, statistics } = useContractsData({});
  
  const [formData, setFormData] = useState({
    fine_type: (settings as any)?.fine_type || 'fixed_amount',
    fine_rate: (settings as any)?.fine_rate || 120,
    grace_period_days: (settings as any)?.grace_period_days || 0,
    max_fine_amount: (settings as any)?.max_fine_amount || 0,
    is_active: (settings as any)?.is_active ?? true,
  });

  // حساب إحصائيات العقود المتأخرة
  const getOverdueContracts = () => {
    if (!contracts) return [];
    const today = new Date();
    return contracts.filter(contract => {
      if (contract.status !== 'active') return false;
      const endDate = new Date(contract.end_date);
      return endDate < today;
    });
  };

  const overdueContracts = getOverdueContracts();
  const activeContracts = contracts?.filter(c => c.status === 'active') || [];
  
  // حساب إجمالي الغرامات المحتملة
  const calculatePotentialFines = () => {
    let total = 0;
    overdueContracts.forEach(contract => {
      const today = new Date();
      const endDate = new Date(contract.end_date);
      const daysOverdue = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 3600 * 24));
      
      if (daysOverdue > formData.grace_period_days) {
        const actualOverdueDays = daysOverdue - formData.grace_period_days;
        let fineAmount = 0;
        
        if (formData.fine_type === 'percentage') {
          fineAmount = (contract.contract_amount * formData.fine_rate / 100) * actualOverdueDays;
        } else {
          fineAmount = formData.fine_rate * actualOverdueDays;
        }
        
        if (formData.max_fine_amount && fineAmount > formData.max_fine_amount) {
          fineAmount = formData.max_fine_amount;
        }
        
        total += fineAmount;
      }
    });
    return total;
  };

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
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">العقود النشطة</p>
                <p className="text-2xl font-bold">{activeContracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">العقود المتأخرة</p>
                <p className="text-2xl font-bold text-destructive">{overdueContracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-medium">الغرامات المحتملة</p>
                <p className="text-2xl font-bold text-warning">{calculatePotentialFines().toFixed(3)} د.ك</p>
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
            إعدادات الغرامات المتأخرة
          </CardTitle>
          <CardDescription>
            تكوين قواعد الغرامات التي تُطبق على العقود المتأخرة عن موعد الاستحقاق - سيتم تطبيقها على جميع العقود في الشركة
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
                       {formData.fine_type === 'percentage' ? 'النسبة المئوية (%)' : 'المبلغ اليومي (ريال)'}
                     </Label>
                     <Input
                       id="fine_rate"
                       type="number"
                       step="0.001"
                       min="0"
                       value={formData.fine_rate}
                       onChange={(e) => setFormData(prev => ({ ...prev, fine_rate: parseFloat(e.target.value) || 0 }))}
                       placeholder={formData.fine_type === 'percentage' ? '1.0' : '120'}
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
                     <Label htmlFor="max_fine_amount">الحد الأقصى للغرامة (ريال)</Label>
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
                       ? `عقد بقيمة 1000 ريال، متأخر 10 أيام (بعد فترة السماح): ${formData.fine_rate}% × 1000 × 10 = ${(formData.fine_rate * 1000 * 10 / 100).toFixed(3)} ريال`
                       : `عقد متأخر 10 أيام (بعد فترة السماح): ${formData.fine_rate} × 10 = ${(formData.fine_rate * 10).toFixed(3)} ريال`
                     }
                   </AlertDescription>
                 </Alert>

                 {/* معاينة العقود المتأثرة */}
                 {overdueContracts.length > 0 && (
                   <Alert className="border-warning">
                     <AlertCircle className="h-4 w-4 text-warning" />
                     <AlertDescription>
                       <strong>العقود المتأثرة:</strong><br />
                       يوجد {overdueContracts.length} عقد متأخر سيتم تطبيق الغرامات عليه.
                       إجمالي الغرامات المحتملة: <strong>{calculatePotentialFines().toFixed(3)} ريال</strong>
                     </AlertDescription>
                   </Alert>
                 )}
              </>
            )}

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? 'جاري الحفظ...' : 'حفظ وتطبيق على جميع العقود'}
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
                  {calculateFines.isPending ? 'جاري الحساب...' : 'حساب الغرامات لجميع العقود'}
                </Button>
              )}
            </div>
            
            {formData.is_active && overdueContracts.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ملاحظة مهمة:</strong> بعد حفظ الإعدادات، تأكد من الضغط على "حساب الغرامات لجميع العقود" 
                  لتطبيق الغرامات الجديدة على العقود المتأخرة الموجودة حالياً.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};