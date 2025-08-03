import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar, CreditCard, Clock } from "lucide-react";
import { useCreatePaymentSchedules } from "@/hooks/usePaymentSchedules";
import { toast } from "sonner";

interface PaymentScheduleSectionProps {
  contractId?: string;
  totalAmount: number;
  currency: string;
  onScheduleCreated?: () => void;
}

export const PaymentScheduleSection = ({ 
  contractId, 
  totalAmount, 
  currency,
  onScheduleCreated 
}: PaymentScheduleSectionProps) => {
  const [createSchedule, setCreateSchedule] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly');
  const [numberOfInstallments, setNumberOfInstallments] = useState<string>('');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>('');

  const createSchedules = useCreatePaymentSchedules();

  const getInstallmentInfo = () => {
    const installments = numberOfInstallments ? parseInt(numberOfInstallments) : getDefaultInstallments();
    const amountPerInstallment = totalAmount / installments;
    
    return {
      installments,
      amountPerInstallment,
      interval: getPaymentInterval()
    };
  };

  const getDefaultInstallments = () => {
    switch (installmentPlan) {
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semi_annual': return 2;
      case 'annual': return 1;
      default: return 1;
    }
  };

  const getPaymentInterval = () => {
    switch (installmentPlan) {
      case 'monthly': return 'شهرياً';
      case 'quarterly': return 'كل 3 أشهر';
      case 'semi_annual': return 'كل 6 أشهر';
      case 'annual': return 'سنوياً';
      default: return 'شهرياً';
    }
  };

  const handleCreateSchedule = async () => {
    if (!contractId) {
      toast.error("يجب اختيار عقد لإنشاء جدول دفع");
      return;
    }

    try {
      await createSchedules.mutateAsync({
        contract_id: contractId,
        installment_plan: installmentPlan,
        number_of_installments: numberOfInstallments ? parseInt(numberOfInstallments) : undefined
      });
      
      toast.success("تم إنشاء جدول الدفع بنجاح");
      onScheduleCreated?.();
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      toast.error("حدث خطأ في إنشاء جدول الدفع");
    }
  };

  const { installments, amountPerInstallment, interval } = getInstallmentInfo();

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">جدول الدفع</CardTitle>
          </div>
          <Switch
            checked={createSchedule}
            onCheckedChange={setCreateSchedule}
            disabled={!contractId}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {contractId 
            ? "قم بتفعيل هذا الخيار لإنشاء جدول دفع تلقائي للعقد المحدد"
            : "يجب اختيار عقد أولاً لإنشاء جدول دفع"
          }
        </p>
      </CardHeader>

      {createSchedule && contractId && (
        <CardContent className="space-y-6">
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installment-plan">نوع الأقساط</Label>
              <Select value={installmentPlan} onValueChange={(value: any) => setInstallmentPlan(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الأقساط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">أقساط شهرية</SelectItem>
                  <SelectItem value="quarterly">أقساط ربع سنوية</SelectItem>
                  <SelectItem value="semi_annual">أقساط نصف سنوية</SelectItem>
                  <SelectItem value="annual">دفعة سنوية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number-of-installments">عدد الأقساط (اختياري)</Label>
              <Input
                id="number-of-installments"
                type="number"
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(e.target.value)}
                placeholder={`افتراضي: ${getDefaultInstallments()}`}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-payment-date">تاريخ أول دفعة (اختياري)</Label>
              <Input
                id="first-payment-date"
                type="date"
                value={firstPaymentDate}
                onChange={(e) => setFirstPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Schedule Preview */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">معاينة جدول الدفع</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الأقساط:</span>
                <span className="font-medium">{installments} قسط</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">قيمة القسط:</span>
                <span className="font-medium">{amountPerInstallment.toFixed(3)} {currency}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">تكرار الدفع:</span>
                <span className="font-medium">{interval}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">إجمالي المبلغ:</span>
              <span className="font-bold text-lg">{totalAmount.toFixed(3)} {currency}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCreateSchedule}
              disabled={createSchedules.isPending}
              className="flex-1"
            >
              {createSchedules.isPending ? "جاري الإنشاء..." : "إنشاء جدول الدفع"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateSchedule(false)}
            >
              إلغاء
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            سيتم إنشاء جدول الدفع بعد حفظ الفاتورة وربطها بالعقد المحدد
          </p>
        </CardContent>
      )}
    </Card>
  );
};