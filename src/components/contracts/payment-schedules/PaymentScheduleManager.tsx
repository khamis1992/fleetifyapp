import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContractPaymentSchedules } from "@/hooks/usePaymentSchedules";
import { PaymentSchedulesList } from "./PaymentSchedulesList";
import { CreatePaymentScheduleDialog } from "./CreatePaymentScheduleDialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface PaymentScheduleManagerProps {
  contractId: string;
  onCreateInvoice?: (scheduleId: string) => void;
}

export const PaymentScheduleManager = ({ 
  contractId, 
  onCreateInvoice 
}: PaymentScheduleManagerProps) => {
  const { data: schedules = [], isLoading } = useContractPaymentSchedules(contractId);
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }

  // Calculate statistics
  const totalAmount = schedules.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = schedules.reduce((sum, s) => sum + s.paid_amount, 0);
  const pendingSchedules = schedules.filter(s => s.status === 'pending');
  const overdueSchedules = schedules.filter(s => s.status === 'overdue');
  const paidSchedules = schedules.filter(s => s.status === 'paid');
  const schedulesWithInvoices = schedules.filter(s => s.invoice_id);

  // Next payment due
  const nextPayment = pendingSchedules
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                <p className="text-lg font-semibold">{formatCurrency(totalAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                <p className="text-lg font-semibold">{formatCurrency(paidAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المعلقة</p>
                <p className="text-lg font-semibold">{pendingSchedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المتأخرة</p>
                <p className="text-lg font-semibold">{overdueSchedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مع فواتير</p>
                <p className="text-lg font-semibold">{schedulesWithInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Payment Due */}
      {nextPayment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">الدفعة القادمة</h4>
                <p className="text-sm text-muted-foreground">
                  القسط {nextPayment.installment_number} - {formatCurrency(nextPayment.amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">موعد الاستحقاق</p>
                <p className="font-medium">
                  {format(new Date(nextPayment.due_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Schedules Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>جدول الدفع</CardTitle>
            <CreatePaymentScheduleDialog contractId={contractId} />
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  لا يوجد جدول دفع
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  أنشئ جدول دفع لتنظيم الأقساط والمواعيد المالية لهذا العقد
                </p>
                <CreatePaymentScheduleDialog contractId={contractId} />
              </div>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  الكل ({schedules.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  معلقة ({pendingSchedules.length})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  متأخرة ({overdueSchedules.length})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  مدفوعة ({paidSchedules.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <PaymentSchedulesList 
                  schedules={schedules} 
                  onCreateInvoice={onCreateInvoice}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <PaymentSchedulesList 
                  schedules={pendingSchedules} 
                  onCreateInvoice={onCreateInvoice}
                />
              </TabsContent>

              <TabsContent value="overdue" className="mt-4">
                <PaymentSchedulesList 
                  schedules={overdueSchedules} 
                  onCreateInvoice={onCreateInvoice}
                />
              </TabsContent>

              <TabsContent value="paid" className="mt-4">
                <PaymentSchedulesList 
                  schedules={paidSchedules} 
                  onCreateInvoice={onCreateInvoice}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};