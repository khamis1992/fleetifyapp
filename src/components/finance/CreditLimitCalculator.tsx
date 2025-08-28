import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface CreditLimitCalculatorProps {
  onCreditLimitCalculated: (amount: number) => void;
  customerType: 'individual' | 'corporate';
  initialAmount?: number;
}

export const CreditLimitCalculator: React.FC<CreditLimitCalculatorProps> = ({
  onCreditLimitCalculated,
  customerType,
  initialAmount = 0
}) => {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [existingDebts, setExistingDebts] = useState<number>(0);
  const [businessType, setBusinessType] = useState<string>('');
  const [creditHistory, setCreditHistory] = useState<string>('good');
  const [requestedAmount, setRequestedAmount] = useState<number>(initialAmount);
  const [calculatedLimit, setCalculatedLimit] = useState<number>(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    calculateCreditLimit();
  }, [monthlyIncome, existingDebts, businessType, creditHistory, customerType]);

  const calculateCreditLimit = () => {
    if (!monthlyIncome) {
      setCalculatedLimit(0);
      return;
    }

    let baseLimit = 0;
    
    if (customerType === 'individual') {
      // For individuals: 3-6 months of net income
      const netIncome = monthlyIncome - existingDebts;
      baseLimit = netIncome * 4; // 4 months as base
    } else {
      // For companies: Different logic based on business type
      const businessMultiplier = getBusinessMultiplier(businessType);
      baseLimit = monthlyIncome * businessMultiplier;
    }

    // Apply credit history adjustment
    const creditMultiplier = getCreditHistoryMultiplier(creditHistory);
    const adjustedLimit = baseLimit * creditMultiplier;

    // Risk assessment
    const debtToIncomeRatio = existingDebts / monthlyIncome;
    let risk: 'low' | 'medium' | 'high' = 'medium';
    
    if (debtToIncomeRatio < 0.3) risk = 'low';
    else if (debtToIncomeRatio > 0.6) risk = 'high';

    setRiskLevel(risk);
    setCalculatedLimit(Math.max(0, adjustedLimit));
  };

  const getBusinessMultiplier = (type: string) => {
    switch (type) {
      case 'retail': return 6;
      case 'wholesale': return 8;
      case 'manufacturing': return 10;
      case 'services': return 5;
      case 'construction': return 7;
      default: return 6;
    }
  };

  const getCreditHistoryMultiplier = (history: string) => {
    switch (history) {
      case 'excellent': return 1.2;
      case 'good': return 1.0;
      case 'fair': return 0.8;
      case 'poor': return 0.5;
      default: return 1.0;
    }
  };

  const handleApplyCalculatedLimit = () => {
    onCreditLimitCalculated(calculatedLimit);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return CheckCircle;
      case 'medium': return AlertCircle;
      case 'high': return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          حاسبة حد الائتمان الذكية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {customerType === 'individual' ? 'الدخل الشهري' : 'الإيرادات الشهرية'}
            </label>
            <Input
              type="number"
              value={monthlyIncome || ''}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              placeholder="0.00"
              className="text-left"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {customerType === 'individual' ? 'الالتزامات الشهرية' : 'المصروفات الشهرية'}
            </label>
            <Input
              type="number"
              value={existingDebts || ''}
              onChange={(e) => setExistingDebts(Number(e.target.value))}
              placeholder="0.00"
              className="text-left"
            />
          </div>
        </div>

        {/* Business Type (for companies) */}
        {customerType === 'corporate' && (
          <div>
            <label className="text-sm font-medium mb-2 block">نوع النشاط التجاري</label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع النشاط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">تجارة تجزئة</SelectItem>
                <SelectItem value="wholesale">تجارة جملة</SelectItem>
                <SelectItem value="manufacturing">تصنيع</SelectItem>
                <SelectItem value="services">خدمات</SelectItem>
                <SelectItem value="construction">إنشاءات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Credit History */}
        <div>
          <label className="text-sm font-medium mb-2 block">السجل الائتماني</label>
          <Select value={creditHistory} onValueChange={setCreditHistory}>
            <SelectTrigger>
              <SelectValue placeholder="تقييم السجل الائتماني" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">ممتاز</SelectItem>
              <SelectItem value="good">جيد</SelectItem>
              <SelectItem value="fair">مقبول</SelectItem>
              <SelectItem value="poor">ضعيف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">حد الائتمان المحسوب:</span>
            <span className="text-lg font-bold text-primary">
              {calculatedLimit.toLocaleString()} د.ك
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">مستوى المخاطر:</span>
            <Badge className={getRiskColor(riskLevel)}>
              {React.createElement(getRiskIcon(riskLevel), { className: "h-3 w-3 mr-1" })}
              {riskLevel === 'low' ? 'منخفض' : riskLevel === 'medium' ? 'متوسط' : 'عالي'}
            </Badge>
          </div>

          {monthlyIncome > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span>نسبة الدين إلى الدخل:</span>
                <span>{((existingDebts / monthlyIncome) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>الدخل الصافي الشهري:</span>
                <span>{(monthlyIncome - existingDebts).toLocaleString()} د.ك</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApplyCalculatedLimit}
            disabled={calculatedLimit === 0}
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            تطبيق حد الائتمان المحسوب
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setMonthlyIncome(0);
              setExistingDebts(0);
              setBusinessType('');
              setCreditHistory('good');
              setCalculatedLimit(0);
            }}
          >
            إعادة تعيين
          </Button>
        </div>

        {/* Custom Amount Override */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={requestedAmount || ''}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              placeholder="حد ائتمان مخصص"
              className="text-left"
            />
            <Button
              variant="outline"
              onClick={() => onCreditLimitCalculated(requestedAmount)}
              disabled={requestedAmount === 0}
            >
              تطبيق
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            يمكنك تحديد حد ائتمان مخصص بدلاً من المحسوب
          </p>
        </div>
      </CardContent>
    </Card>
  );
};