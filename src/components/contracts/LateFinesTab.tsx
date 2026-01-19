import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { 
  AlertTriangle, 
  Calculator, 
  Calendar, 
  DollarSign, 
  Settings,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useLateFineSettings, useCalculateLateFines, calculateLateFine } from '@/hooks/useLateFines';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { LateFinesSettings } from './LateFinesSettings';
import { formatDateInGregorian } from '@/utils/dateFormatter';

interface LateFinesTabProps {
  contract: any;
}

export const LateFinesTab: React.FC<LateFinesTabProps> = ({ contract }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { data: lateFineSettings, isLoading } = useLateFineSettings();
  const { mutate: calculateFines, isPending: isCalculating } = useCalculateLateFines();
  const [showSettings, setShowSettings] = React.useState(false);

  // حساب الغرامة للعقد الحالي
  const fineCalculation = React.useMemo(() => {
    if (!contract || !lateFineSettings) return null;
    return calculateLateFine(
      contract.contract_amount,
      contract.end_date,
      lateFineSettings as any
    );
  }, [contract, lateFineSettings]);

  // تحديد حالة العقد من ناحية التأخير
  const getContractStatus = () => {
    if (!fineCalculation) return { status: 'no_fine', icon: CheckCircle, color: 'text-green-600' };
    
    if (fineCalculation.days_overdue <= 0) {
      return { status: 'active', icon: CheckCircle, color: 'text-green-600' };
    } else if (fineCalculation.fine_amount > 0) {
      return { status: 'overdue_with_fine', icon: AlertTriangle, color: 'text-red-600' };
    } else {
      return { status: 'overdue_grace', icon: Clock, color: 'text-yellow-600' };
    }
  };

  const contractStatus = getContractStatus();
  const StatusIcon = contractStatus.icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* إعدادات الغرامات */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات الغرامات المتأخرة
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? 'إخفاء الإعدادات' : 'إدارة الإعدادات'}
            </Button>
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent>
            <LateFinesSettings />
          </CardContent>
        )}
      </Card>

      {/* حالة العقد والغرامات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${contractStatus.color}`} />
            حالة العقد والغرامات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!lateFineSettings || !lateFineSettings.is_active ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                نظام الغرامات المتأخرة غير مفعل. قم بتفعيله من الإعدادات أعلاه.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* معلومات أساسية */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاريخ انتهاء العقد</span>
                  <span className="font-medium">
                    {formatDateInGregorian(contract.end_date)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">قيمة العقد</span>
                  <span className="font-medium">
                    <NumberDisplay value={formatCurrency(contract.contract_amount)} />
                  </span>
                </div>

                {fineCalculation && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">أيام التأخير</span>
                      <Badge variant={fineCalculation.days_overdue > 0 ? "destructive" : "default"}>
                        {fineCalculation.days_overdue} يوم
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">مبلغ الغرامة</span>
                      <span className={`font-bold text-lg ${fineCalculation.fine_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        <NumberDisplay value={formatCurrency(fineCalculation.fine_amount)} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">إجمالي المبلغ المستحق</span>
                      <span className="font-bold text-primary">
                        <NumberDisplay value={formatCurrency(fineCalculation.total_amount_due)} />
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* إعدادات الغرامة المطبقة */}
              <div className="space-y-3">
                <h4 className="font-medium">إعدادات الغرامة المطبقة:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">نوع الغرامة</span>
                    <span>{lateFineSettings.fine_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">معدل الغرامة</span>
                    <span>
                      {lateFineSettings.fine_rate}
                      {lateFineSettings.fine_type === 'percentage' ? '%' : ' دينار يومياً'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">فترة السماح</span>
                    <span>{lateFineSettings.grace_period_days} يوم</span>
                  </div>
                  
                  {lateFineSettings.max_fine_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الحد الأقصى للغرامة</span>
                      <span><NumberDisplay value={formatCurrency(lateFineSettings.max_fine_amount)} /></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* أزرار الإجراءات */}
          {lateFineSettings?.is_active && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => calculateFines()}
                disabled={isCalculating}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {isCalculating ? 'جاري الحساب...' : 'إعادة حساب الغرامات'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* توضيح طريقة الحساب */}
      {lateFineSettings?.is_active && fineCalculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              تفاصيل حساب الغرامة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>طريقة الحساب:</strong></p>
              
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p>• أيام التأخير الإجمالية: {fineCalculation.days_overdue} يوم</p>
                <p>• فترة السماح: {lateFineSettings.grace_period_days} يوم</p>
                <p>• أيام التأخير الفعلية (بعد فترة السماح): {Math.max(0, fineCalculation.days_overdue - lateFineSettings.grace_period_days)} يوم</p>
                
                {lateFineSettings.fine_type === 'percentage' ? (
                  <>
                    <p>• نسبة الغرامة: {lateFineSettings.fine_rate}% يومياً</p>
                    <p>• حساب الغرامة: {formatCurrency(contract.contract_amount)} × {lateFineSettings.fine_rate}% × {Math.max(0, fineCalculation.days_overdue - lateFineSettings.grace_period_days)} أيام</p>
                  </>
                ) : (
                  <>
                    <p>• مبلغ الغرامة اليومي: {formatCurrency(lateFineSettings.fine_rate)}</p>
                    <p>• حساب الغرامة: {formatCurrency(lateFineSettings.fine_rate)} × {Math.max(0, fineCalculation.days_overdue - lateFineSettings.grace_period_days)} أيام</p>
                  </>
                )}
                
                <p><strong>النتيجة النهائية: {formatCurrency(fineCalculation.fine_amount)}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};