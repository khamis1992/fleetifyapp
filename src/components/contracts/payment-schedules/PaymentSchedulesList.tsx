import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { PaymentSchedule } from "@/types/payment-schedules";
import { useMarkPaymentAsPaid } from "@/hooks/usePaymentSchedules";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface PaymentSchedulesListProps {
  schedules: PaymentSchedule[];
  onCreateInvoice?: (scheduleId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'partially_paid':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع';
    case 'partially_paid':
      return 'مدفوع جزئياً';
    case 'overdue':
      return 'متأخر';
    case 'cancelled':
      return 'ملغي';
    default:
      return 'معلق';
  }
};

const PaymentRecordDialog = ({ 
  schedule, 
  onRecord 
}: { 
  schedule: PaymentSchedule; 
  onRecord: (amount: number, date: string) => void; 
}) => {
  const [paidAmount, setPaidAmount] = useState(schedule.amount.toString());
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();

  const handleSubmit = () => {
    onRecord(parseFloat(paidAmount), paidDate);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Receipt className="h-4 w-4 ml-2" />
          تسجيل دفع
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفع للقسط #{schedule.installment_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="paid-amount">المبلغ المدفوع</Label>
            <Input
              id="paid-amount"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              step="0.01"
              min="0"
              max={schedule.amount}
            />
            <p className="text-sm text-muted-foreground mt-1">
              المبلغ المطلوب: {formatCurrency(schedule.amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </p>
          </div>
          <div>
            <Label htmlFor="paid-date">تاريخ الدفع</Label>
            <Input
              id="paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>
              تسجيل الدفع
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PaymentSchedulesList = ({ schedules, onCreateInvoice }: PaymentSchedulesListProps) => {
  const markAsPaid = useMarkPaymentAsPaid();
  const { formatCurrency } = useCurrencyFormatter();

  const handleRecordPayment = (scheduleId: string, amount: number, date: string) => {
    markAsPaid.mutate({
      id: scheduleId,
      paidAmount: amount,
      paidDate: date
    });
  };

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            لا يوجد جدول دفع لهذا العقد
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {schedule.installment_number}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      القسط {schedule.installment_number}
                    </p>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground">
                        {schedule.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(schedule.due_date), 'dd/MM/yyyy', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(schedule.amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                  </div>
                  {schedule.paid_amount > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <span>مدفوع: {formatCurrency(schedule.paid_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(schedule.status)}>
                  {getStatusText(schedule.status)}
                </Badge>

                {schedule.status === 'pending' || schedule.status === 'partially_paid' ? (
                  <PaymentRecordDialog
                    schedule={schedule}
                    onRecord={(amount, date) => handleRecordPayment(schedule.id, amount, date)}
                  />
                ) : null}

                {!schedule.invoice_id && schedule.status !== 'cancelled' && onCreateInvoice && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateInvoice(schedule.id)}
                  >
                    <Receipt className="h-4 w-4 ml-2" />
                    إنشاء فاتورة
                  </Button>
                )}

                {schedule.invoice_id && (
                  <Badge variant="outline">
                    فاتورة موجودة
                  </Badge>
                )}
              </div>
            </div>

            {schedule.paid_date && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    تاريخ الدفع: {format(new Date(schedule.paid_date), 'dd/MM/yyyy', { locale: ar })}
                  </span>
                </div>
              </div>
            )}

            {schedule.notes && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{schedule.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};