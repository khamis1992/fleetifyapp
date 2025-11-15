import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useCreatePaymentSchedules } from "@/hooks/usePaymentSchedules";

interface CreatePaymentScheduleDialogProps {
  contractId: string;
  trigger?: React.ReactNode;
}

export const CreatePaymentScheduleDialog = ({ 
  contractId, 
  trigger 
}: CreatePaymentScheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly');
  const [numberOfInstallments, setNumberOfInstallments] = useState<string>('');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>('');

  const createSchedules = useCreatePaymentSchedules();

  const handleSubmit = () => {
    createSchedules.mutate({
      contract_id: contractId,
      installment_plan: installmentPlan,
      number_of_installments: numberOfInstallments ? parseInt(numberOfInstallments) : undefined,
      first_payment_date: firstPaymentDate || undefined
    });
    setOpen(false);
    setNumberOfInstallments('');
    setFirstPaymentDate('');
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 ml-2" />
      إنشاء جدول دفع
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء جدول دفع للعقد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="installment-plan">نوع الأقساط</Label>
            <Select value={installmentPlan} onValueChange={(value: unknown) => setInstallmentPlan(value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الأقساط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">شهرية</SelectItem>
                <SelectItem value="quarterly">ربع سنوية</SelectItem>
                <SelectItem value="semi_annual">نصف سنوية</SelectItem>
                <SelectItem value="annual">سنوية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="number-of-installments">
              عدد الأقساط (اختياري)
            </Label>
            <Input
              id="number-of-installments"
              type="number"
              value={numberOfInstallments}
              onChange={(e) => setNumberOfInstallments(e.target.value)}
              placeholder="سيتم حسابه تلقائياً حسب مدة العقد"
              min="1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              إذا لم تحدد عدد الأقساط، سيتم حسابه تلقائياً حسب مدة العقد ونوع الأقساط
            </p>
          </div>

          <div>
            <Label htmlFor="first-payment-date">
              تاريخ أول دفعة (اختياري)
            </Label>
            <Input
              id="first-payment-date"
              type="date"
              value={firstPaymentDate}
              onChange={(e) => setFirstPaymentDate(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              إذا لم تحدد تاريخ أول دفعة، سيتم حسابه تلقائياً (تاريخ بداية العقد + الفترة الزمنية)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createSchedules.isPending}
            >
              {createSchedules.isPending ? 'جاري الإنشاء...' : 'إنشاء جدول الدفع'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};