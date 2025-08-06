import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import { useVehicleInstallments, useVehicleInstallmentSummary } from "@/hooks/useVehicleInstallments";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import VehicleInstallmentForm from "./VehicleInstallmentForm";
import VehicleInstallmentDetails from "./VehicleInstallmentDetails";
import type { VehicleInstallmentWithDetails } from "@/types/vehicle-installments";

const VehicleInstallmentsDashboard = () => {
  const [selectedInstallment, setSelectedInstallment] = useState<VehicleInstallmentWithDetails | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: installments, isLoading } = useVehicleInstallments();
  const { data: summary } = useVehicleInstallmentSummary();

  const filteredInstallments = installments?.filter(installment => 
    statusFilter === 'all' || installment.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels = {
      active: 'نشط',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      draft: 'مسودة',
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.draft}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (selectedInstallment) {
    return (
      <VehicleInstallmentDetails
        installment={selectedInstallment}
        onBack={() => setSelectedInstallment(null)}
      />
    );
  }

  if (showForm) {
    return (
      <VehicleInstallmentForm
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">أقساط المركبات</h1>
          <p className="text-muted-foreground">إدارة اتفاقيات الأقساط مع التجار</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة اتفاقية جديدة
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الاتفاقيات</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_agreements}</div>
              <p className="text-xs text-muted-foreground">
                {summary.active_agreements} نشط، {summary.completed_agreements} مكتمل
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</div>
              <p className="text-xs text-muted-foreground">
                مدفوع: {formatCurrency(summary.total_paid)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_outstanding)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.overdue_count} قسط متأخر
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الأقساط المتأخرة</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.overdue_amount)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.overdue_count} قسط
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>اتفاقيات الأقساط</CardTitle>
              <CardDescription>قائمة جميع اتفاقيات الأقساط مع التجار</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                نشط
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                مكتمل
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : filteredInstallments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد اتفاقيات أقساط
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInstallments?.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedInstallment(installment)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{installment.agreement_number}</h3>
                      {getStatusBadge(installment.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">المركبة: </span>
                        {installment.vehicles?.plate_number} - {installment.vehicles?.make} {installment.vehicles?.model}
                      </div>
                      <div>
                        <span className="font-medium">التاجر: </span>
                        {installment.customers?.customer_type === 'individual' 
                          ? `${installment.customers?.first_name} ${installment.customers?.last_name}`
                          : installment.customers?.company_name}
                      </div>
                      <div>
                        <span className="font-medium">تاريخ البداية: </span>
                        {format(new Date(installment.start_date), 'dd/MM/yyyy', { locale: ar })}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold">{formatCurrency(installment.total_amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      {installment.number_of_installments} قسط
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleInstallmentsDashboard;