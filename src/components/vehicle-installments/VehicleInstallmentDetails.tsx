import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CreditCard, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { useVehicleInstallmentSchedules, useProcessInstallmentPayment } from "@/hooks/useVehicleInstallments";
import { useContractVehicles } from "@/hooks/useContractVehicles";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { VehicleInstallmentWithDetails, VehicleInstallmentSchedule } from "@/types/vehicle-installments";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VehicleInstallmentDetailsProps {
  installment: VehicleInstallmentWithDetails;
  onBack: () => void;
}

const VehicleInstallmentDetails = ({ installment, onBack }: VehicleInstallmentDetailsProps) => {
  const [selectedSchedule, setSelectedSchedule] = useState<VehicleInstallmentSchedule | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: schedules, isLoading } = useVehicleInstallmentSchedules(installment.id);
  const { data: contractVehicles } = useContractVehicles(installment.id);
  const processPayment = useProcessInstallmentPayment();
  
  const isMultiVehicle = installment.contract_type === 'multi_vehicle' || (contractVehicles && contractVehicles.length > 1);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      partially_paid: 'bg-blue-100 text-blue-800 border-blue-200',
    };

    const labels = {
      pending: 'معلق',
      paid: 'مدفوع',
      overdue: 'متأخر',
      partially_paid: 'مدفوع جزئياً',
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'partially_paid':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <Calendar className="h-4 w-4 text-yellow-600" />;
    }
  };

  const handlePayment = async () => {
    if (!selectedSchedule || !paymentAmount) return;

    const paymentData = {
      schedule_id: selectedSchedule.id,
      paid_amount: parseFloat(paymentAmount),
      payment_reference: paymentReference || undefined,
      notes: paymentNotes || undefined,
      payment_date: paymentDate,
    };

    await processPayment.mutateAsync(paymentData);
    
    // Reset form
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSelectedSchedule(null);
    setIsPaymentDialogOpen(false);
  };

  const openPaymentDialog = (schedule: VehicleInstallmentSchedule) => {
    setSelectedSchedule(schedule);
    const remainingAmount = schedule.amount - (schedule.paid_amount || 0);
    setPaymentAmount(remainingAmount.toString());
    setIsPaymentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div>
          <h1 className="text-3xl font-bold">تفاصيل اتفاقية الأقساط</h1>
          <p className="text-muted-foreground">{installment.agreement_number}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الاتفاقية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">رقم الاتفاقية:</span>
                <p className="font-semibold">{installment.agreement_number}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">الحالة:</span>
                <div className="mt-1">{getStatusBadge(installment.status)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">التاجر:</span>
                <p className="font-semibold">
                  {installment.customers?.customer_type === 'individual' 
                    ? `${installment.customers?.first_name} ${installment.customers?.last_name}`
                    : installment.customers?.company_name}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  {isMultiVehicle ? 'المركبات:' : 'المركبة:'}
                </span>
                {isMultiVehicle ? (
                  <div className="space-y-2 mt-2">
                    {contractVehicles?.map((cv) => (
                      <div key={cv.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="font-semibold">
                          {cv.vehicles?.plate_number} - {cv.vehicles?.make} {cv.vehicles?.model}
                        </span>
                        <Badge variant="outline">
                          {formatCurrency(cv.allocated_amount)}
                        </Badge>
                      </div>
                    ))}
                    <div className="text-sm text-muted-foreground">
                      إجمالي {contractVehicles?.length || 0} مركبة
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold">
                    {installment.vehicles?.plate_number} - {installment.vehicles?.make} {installment.vehicles?.model}
                  </p>
                )}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">تاريخ الاتفاقية:</span>
                <p className="font-semibold">
                  {format(new Date(installment.agreement_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">فترة الأقساط:</span>
                <p className="font-semibold">
                  {format(new Date(installment.start_date), 'dd/MM/yyyy', { locale: ar })} - {format(new Date(installment.end_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
            </div>
            {installment.notes && (
              <div>
                <span className="font-medium text-muted-foreground">ملاحظات:</span>
                <p className="mt-1">{installment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التفاصيل المالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">المبلغ الإجمالي:</span>
                <p className="text-lg font-bold">{formatCurrency(installment.total_amount)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">الدفعة المقدمة:</span>
                <p className="text-lg font-semibold">{formatCurrency(installment.down_payment)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">مبلغ القسط:</span>
                <p className="text-lg font-semibold">{formatCurrency(installment.installment_amount)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">عدد الأقساط:</span>
                <p className="text-lg font-semibold">{installment.number_of_installments}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">معدل الفائدة:</span>
                <p className="text-lg font-semibold">{installment.interest_rate || 0}%</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">المبلغ المتبقي:</span>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(
                    (schedules?.reduce((sum, s) => sum + (s.amount - (s.paid_amount || 0)), 0) || 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جدول الأقساط</CardTitle>
          <CardDescription>تفاصيل جميع الأقساط ومواعيد استحقاقها</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : schedules?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد أقساط مجدولة
            </div>
          ) : (
            <div className="space-y-3">
              {schedules?.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(schedule.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">القسط رقم {schedule.installment_number}</span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        تاريخ الاستحقاق: {format(new Date(schedule.due_date), 'dd/MM/yyyy', { locale: ar })}
                      </div>
                      {schedule.paid_date && (
                        <div className="text-sm text-green-600">
                          تاريخ الدفع: {format(new Date(schedule.paid_date), 'dd/MM/yyyy', { locale: ar })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold">{formatCurrency(schedule.amount)}</div>
                    {schedule.paid_amount && schedule.paid_amount > 0 && (
                      <div className="text-sm text-green-600">
                        مدفوع: {formatCurrency(schedule.paid_amount)}
                      </div>
                    )}
                    {schedule.status !== 'paid' && (
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => openPaymentDialog(schedule)}
                      >
                        تسجيل دفعة
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل دفعة قسط</DialogTitle>
            <DialogDescription>
              تسجيل دفعة للقسط رقم {selectedSchedule?.installment_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment_amount">مبلغ الدفعة</Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="أدخل مبلغ الدفعة"
              />
              {selectedSchedule && (
                <p className="text-sm text-muted-foreground mt-1">
                  المبلغ المستحق: {formatCurrency(selectedSchedule.amount - (selectedSchedule.paid_amount || 0))}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_date">تاريخ الدفعة</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="payment_reference">مرجع الدفعة</Label>
              <Input
                id="payment_reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="رقم الشيك، مرجع التحويل، إلخ"
              />
            </div>

            <div>
              <Label htmlFor="payment_notes">ملاحظات</Label>
              <Textarea
                id="payment_notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!paymentAmount || processPayment.isPending}
              >
                {processPayment.isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleInstallmentDetails;