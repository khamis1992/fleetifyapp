import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calculator, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SmartPaymentAllocationSuggestion, PaymentAllocation } from '@/types/financial-obligations';

interface SmartPaymentAllocationProps {
  customerId: string;
  paymentAmount: number;
  onAllocationComplete: (allocations: PaymentAllocation[]) => void;
  onCancel: () => void;
}

export const SmartPaymentAllocation: React.FC<SmartPaymentAllocationProps> = ({
  customerId,
  paymentAmount,
  onAllocationComplete,
  onCancel
}) => {
  const [suggestion, setSuggestion] = useState<SmartPaymentAllocationSuggestion | null>(null);
  const [manualAllocations, setManualAllocations] = useState<PaymentAllocation[]>([]);
  const [allocationType, setAllocationType] = useState<'auto' | 'manual'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateSmartSuggestion();
  }, [customerId, paymentAmount]);

  const generateSmartSuggestion = async () => {
    setIsLoading(true);
    try {
      // محاكاة API call للحصول على اقتراح ذكي
      const mockSuggestion: SmartPaymentAllocationSuggestion = {
        payment_amount: paymentAmount,
        customer_id: customerId,
        suggested_allocations: [
          {
            obligation_id: 'obligation-1',
            allocated_amount: Math.min(paymentAmount * 0.6, 500),
            remaining_amount: Math.max(0, 500 - paymentAmount * 0.6),
            allocation_notes: 'أولوية عالية - متأخر 30 يوم'
          },
          {
            obligation_id: 'obligation-2',
            allocated_amount: Math.min(paymentAmount * 0.4, 300),
            remaining_amount: Math.max(0, 300 - paymentAmount * 0.4),
            allocation_notes: 'أولوية متوسطة - مستحق حالياً'
          }
        ],
        allocation_strategy: 'fifo',
        confidence_score: 0.95
      };
      
      setSuggestion(mockSuggestion);
      
      // Convert to proper PaymentAllocation format
      const formattedAllocations: PaymentAllocation[] = mockSuggestion.suggested_allocations.map((allocation, index) => ({
        id: `allocation-${index}`,
        company_id: 'mock-company',
        payment_id: 'mock-payment',
        obligation_id: allocation.obligation_id,
        allocated_amount: allocation.allocated_amount,
        remaining_amount: allocation.remaining_amount,
        allocation_type: 'manual' as const,
        allocation_strategy: 'fifo' as const,
        allocation_date: new Date().toISOString().split('T')[0],
        allocation_notes: allocation.allocation_notes,
        notes: '',
        created_by: null,
        created_at: new Date().toISOString()
      }));
      
      setManualAllocations(formattedAllocations);
    } catch (error) {
      toast({
        title: "خطأ في التوزيع الذكي",
        description: "حدث خطأ أثناء توليد اقتراح التوزيع",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAllocationChange = (index: number, field: keyof PaymentAllocation, value: any) => {
    const newAllocations = [...manualAllocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setManualAllocations(newAllocations);
  };

  const getTotalAllocated = () => {
    return manualAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  };

  const getRemainingAmount = () => {
    return paymentAmount - getTotalAllocated();
  };

  const getStrategyIcon = (strategy?: string) => {
    switch (strategy) {
      case 'fifo':
        return <TrendingUp className="h-4 w-4" />;
      case 'highest_interest':
        return <AlertCircle className="h-4 w-4" />;
      case 'nearest_due':
        return <Calculator className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStrategyLabel = (strategy?: string) => {
    switch (strategy) {
      case 'fifo':
        return 'الأقدم أولاً';
      case 'highest_interest':
        return 'أعلى فائدة';
      case 'nearest_due':
        return 'أقرب استحقاق';
      default:
        return 'تلقائي';
    }
  };

  const handleApplyAllocation = () => {
    if (Math.abs(getRemainingAmount()) > 0.01) {
      toast({
        title: "خطأ في التوزيع",
        description: "يجب توزيع كامل مبلغ الدفعة",
        variant: "destructive"
      });
      return;
    }

    onAllocationComplete(manualAllocations);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>جاري حساب التوزيع الذكي...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* معلومات الدفعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تفاصيل الدفعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Label className="text-sm text-muted-foreground">مبلغ الدفعة</Label>
              <p className="text-2xl font-bold text-primary">{paymentAmount.toFixed(3)} د.ك</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">المبلغ المخصص</Label>
              <p className="text-2xl font-bold text-green-600">{getTotalAllocated().toFixed(3)} د.ك</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">المبلغ المتبقي</Label>
              <p className={`text-2xl font-bold ${getRemainingAmount() > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {getRemainingAmount().toFixed(3)} د.ك
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الاقتراح الذكي */}
      {suggestion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStrategyIcon(suggestion.allocation_strategy)}
                التوزيع الذكي المقترح
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getStrategyLabel(suggestion.allocation_strategy)}
                </Badge>
                <Badge variant={suggestion.confidence_score && suggestion.confidence_score > 0.8 ? 'default' : 'secondary'}>
                  دقة {Math.round((suggestion.confidence_score || 0) * 100)}%
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={allocationType === 'auto' ? 'default' : 'outline'}
                onClick={() => setAllocationType('auto')}
                size="sm"
              >
                توزيع تلقائي
              </Button>
              <Button
                variant={allocationType === 'manual' ? 'default' : 'outline'}
                onClick={() => setAllocationType('manual')}
                size="sm"
              >
                توزيع يدوي
              </Button>
            </div>

            <div className="space-y-4">
              {manualAllocations.map((allocation, index) => (
                <div key={allocation.obligation_id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>المبلغ المخصص</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={allocation.allocated_amount}
                        onChange={(e) => handleManualAllocationChange(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                        disabled={allocationType === 'auto'}
                      />
                    </div>
                    <div>
                      <Label>المبلغ المتبقي</Label>
                      <Input
                        value={allocation.remaining_amount.toFixed(3)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  {allocation.allocation_notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {allocation.allocation_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ملخص التوزيع */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص التوزيع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>إجمالي المبلغ:</span>
              <span className="font-bold">{paymentAmount.toFixed(3)} د.ك</span>
            </div>
            <div className="flex justify-between">
              <span>المبلغ المخصص:</span>
              <span className="font-bold text-green-600">{getTotalAllocated().toFixed(3)} د.ك</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>المبلغ المتبقي:</span>
              <span className={`font-bold ${getRemainingAmount() !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {getRemainingAmount().toFixed(3)} د.ك
              </span>
            </div>
          </div>

          {Math.abs(getRemainingAmount()) < 0.01 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">التوزيع مكتمل ومتوازن</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* أزرار الإجراءات */}
      <div className="flex gap-4">
        <Button 
          onClick={handleApplyAllocation}
          disabled={Math.abs(getRemainingAmount()) > 0.01}
          className="flex-1"
        >
          تطبيق التوزيع
        </Button>
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </div>
  );
};