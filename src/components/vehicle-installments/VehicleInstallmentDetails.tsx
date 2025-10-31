import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CreditCard, Calendar, AlertCircle, CheckCircle, Check, CalendarClock, X } from "lucide-react";
import { useVehicleInstallmentSchedules, useProcessInstallmentPayment } from "@/hooks/useVehicleInstallments";
import { useContractVehicles } from "@/hooks/useContractVehicles";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { VehicleInstallmentWithDetails, VehicleInstallmentSchedule } from "@/types/vehicle-installments";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./vehicle-installments.css";

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
  const { formatCurrency } = useCurrencyFormatter();
  
  
  const isMultiVehicle = installment.contract_type === 'multi_vehicle' || (contractVehicles && contractVehicles.length > 1);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-warning-light text-warning border-warning/20',
      paid: 'bg-success-light text-success border-success/20',
      overdue: 'bg-destructive-light text-destructive border-destructive/20',
      partially_paid: 'bg-info-light text-info border-info/20',
      active: 'bg-success-light text-success border-success/20',
      completed: 'bg-info-light text-info border-info/20',
      draft: 'bg-muted text-muted-foreground border-border',
      cancelled: 'bg-destructive-light text-destructive border-destructive/20',
    };

    const labels = {
      pending: 'معلق',
      paid: 'مدفوع',
      overdue: 'متأخر',
      partially_paid: 'مدفوع جزئياً',
      active: 'نشط',
      completed: 'مكتمل',
      draft: 'مسودة',
      cancelled: 'ملغي',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${variants[status as keyof typeof variants] || variants.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'partially_paid':
        return <CreditCard className="h-5 w-5 text-info" />;
      default:
        return <Calendar className="h-5 w-5 text-warning" />;
    }
  };
  
  const getStatusIconBg = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success-light';
      case 'overdue':
        return 'bg-destructive-light';
      case 'partially_paid':
        return 'bg-info-light';
      default:
        return 'bg-warning-light';
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
      {/* Header with Back Button */}
      <header className="mb-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">تفاصيل اتفاقية الأقساط</h1>
          <p className="text-muted-foreground text-base">{installment.agreement_number}</p>
        </div>
      </header>

      {/* Info Cards Grid */}
      <section className="mb-8">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Agreement Info Card */}
          <div className="info-card animate-slide-up delay-100">
            <h2 className="text-xl font-bold mb-5">معلومات الاتفاقية</h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <span className="block text-sm text-muted-foreground mb-1">رقم الاتفاقية</span>
                <p className="font-semibold">{installment.agreement_number}</p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">الحالة</span>
                {getStatusBadge(installment.status)}
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">التاجر</span>
                <p className="font-semibold">
                  {installment.customers?.customer_type === 'individual' 
                    ? `${installment.customers?.first_name} ${installment.customers?.last_name}`
                    : installment.customers?.company_name}
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">
                  {isMultiVehicle ? 'المركبات' : 'المركبة'}
                </span>
                {isMultiVehicle ? (
                  <div className="space-y-2 mt-2">
                    {contractVehicles?.map((cv) => (
                      <div key={cv.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="font-semibold text-sm">
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
                <span className="block text-sm text-muted-foreground mb-1">تاريخ الاتفاقية</span>
                <p className="font-semibold">
                  {format(new Date(installment.agreement_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">فترة الأقساط</span>
                <p className="font-semibold">
                  {format(new Date(installment.start_date), 'dd/MM/yyyy', { locale: ar })} - {format(new Date(installment.end_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
            </div>
            {installment.notes && (
              <div className="mt-5 pt-5 border-t border-border">
                <span className="block text-sm text-muted-foreground mb-2">ملاحظات</span>
                <p className="leading-relaxed">{installment.notes}</p>
              </div>
            )}
          </div>

          {/* Financial Details Card */}
          <div className="info-card animate-slide-up delay-200">
            <h2 className="text-xl font-bold mb-5">التفاصيل المالية</h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <span className="block text-sm text-muted-foreground mb-1">المبلغ الإجمالي</span>
                <p className="text-xl font-bold">
                  {formatCurrency(installment.total_amount)}
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">الدفعة المقدمة</span>
                <p className="text-xl font-bold">
                  {formatCurrency(installment.down_payment)}
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">مبلغ القسط</span>
                <p className="text-xl font-bold">
                  {formatCurrency(installment.installment_amount)}
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">عدد الأقساط</span>
                <p className="text-xl font-bold">
                  {installment.number_of_installments} <span className="text-sm text-muted-foreground">قسط</span>
                </p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">معدل الفائدة</span>
                <p className="text-xl font-bold">{installment.interest_rate || 0}%</p>
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1">المبلغ المتبقي</span>
                <p className="text-xl font-bold text-warning">
                  {formatCurrency(
                    (schedules?.reduce((sum, s) => sum + (s.amount - (s.paid_amount || 0)), 0) || 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Installments Schedule Table */}
      <section>
        <div className="info-card animate-slide-up delay-300">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">جدول الأقساط</h2>
            <p className="text-sm text-muted-foreground">
              تفاصيل جميع الأقساط ومواعيد استحقاقها
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : schedules?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد أقساط مجدولة
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {schedules?.map((schedule, index) => (
                <div
                  key={schedule.id}
                  className={`installment-card ${schedule.status === 'overdue' ? 'overdue' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex gap-4 items-start flex-1">
                      <div className={`p-2 ${getStatusIconBg(schedule.status)} rounded-lg flex-shrink-0`}>
                        {getStatusIcon(schedule.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold">القسط رقم {schedule.installment_number}</span>
                          {getStatusBadge(schedule.status)}
                          {schedule.status === 'overdue' && index === 0 && (
                            <span className="animate-badge-pulse"></span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          تاريخ الاستحقاق: {format(new Date(schedule.due_date), 'dd/MM/yyyy', { locale: ar })}
                        </div>
                        {schedule.paid_date && (
                          <div className="text-sm text-success flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            تاريخ الدفع: {format(new Date(schedule.paid_date), 'dd/MM/yyyy', { locale: ar })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <div className="text-lg font-bold mb-1">
                        {formatCurrency(schedule.amount)}
                      </div>
                      {schedule.paid_amount && schedule.paid_amount > 0 && (
                        <div className="text-sm text-success mb-2">
                          مدفوع: {formatCurrency(schedule.paid_amount)}
                        </div>
                      )}
                      {schedule.status !== 'paid' && (
                        <Button
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentDialog(schedule);
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          تسجيل دفعة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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