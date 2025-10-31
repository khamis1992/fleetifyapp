import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, AlertCircle, CheckCircle, DollarSign, FileText, FilePlus, CheckCheck, AlertTriangle } from "lucide-react";
import { useVehicleInstallments, useVehicleInstallmentSummary } from "@/hooks/useVehicleInstallments";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import VehicleInstallmentForm from "./VehicleInstallmentForm";
import MultiVehicleContractForm from "./MultiVehicleContractForm";
import VehicleInstallmentDetails from "./VehicleInstallmentDetails";
import type { VehicleInstallmentWithDetails } from "@/types/vehicle-installments";
import "./vehicle-installments.css";

const VehicleInstallmentsDashboard = () => {
  const [selectedInstallment, setSelectedInstallment] = useState<VehicleInstallmentWithDetails | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: installments, isLoading } = useVehicleInstallments();
  const { data: summary } = useVehicleInstallmentSummary();
  const { formatCurrency } = useCurrencyFormatter();


  const filteredInstallments = (installments || []).filter(installment => 
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
      {/* Header Section */}
      <header className="animate-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">أقساط المركبات</h1>
            <p className="text-muted-foreground text-base">إدارة اتفاقيات الأقساط مع التجار</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              اتفاقية مركبة واحدة
            </Button>
            <MultiVehicleContractForm />
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      {summary && (
        <section className="mt-8">
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Agreements Card */}
            <div className="stat-card animate-card-appear delay-100">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  إجمالي الاتفاقيات
                </h3>
                <div className="p-2 bg-accent-light rounded-lg">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{summary.total_agreements}</div>
              <p className="text-xs text-muted-foreground">
                {summary.active_agreements} نشط، {summary.completed_agreements} مكتمل
              </p>
            </div>

            {/* Total Amount Card */}
            <div className="stat-card animate-card-appear delay-200">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  إجمالي المبلغ
                </h3>
                <div className="p-2 bg-success-light rounded-lg">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{formatCurrency(summary.total_amount)}</div>
              <p className="text-xs text-muted-foreground">
                مدفوع: {formatCurrency(summary.total_paid)}
              </p>
            </div>

            {/* Outstanding Amount Card */}
            <div className="stat-card animate-card-appear delay-300">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  المبلغ المستحق
                </h3>
                <div className="p-2 bg-warning-light rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{formatCurrency(summary.total_outstanding)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.overdue_count} قسط متبقي
              </p>
            </div>

            {/* Overdue Amount Card */}
            <div className="stat-card animate-card-appear delay-400">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  الأقساط المتأخرة
                </h3>
                <div className="p-2 bg-destructive-light rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <div className="text-3xl font-bold text-destructive mb-2">{formatCurrency(summary.overdue_amount)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.overdue_count} أقساط متأخرة
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Agreements List Section */}
      <section className="mt-10">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* List Header */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">اتفاقيات الأقساط</h2>
              <p className="text-sm text-muted-foreground">
                قائمة جميع اتفاقيات الأقساط مع التجار
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                className={`btn-filter ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                الكل
              </button>
              <button
                className={`btn-filter ${statusFilter === 'draft' ? 'active' : ''}`}
                onClick={() => setStatusFilter('draft')}
              >
                مسودة
              </button>
              <button
                className={`btn-filter ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                نشط
              </button>
              <button
                className={`btn-filter ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                مكتمل
              </button>
            </div>
          </div>

          {/* Agreements List */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
          ) : filteredInstallments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد اتفاقيات أقساط
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredInstallments.map((installment, index) => (
                <div
                  key={installment.id}
                  className={`agreement-card animate-list-item delay-${Math.min((index + 1) * 100, 500)} ${
                    installment.status === 'active' && summary && summary.overdue_count > 0 ? 'animate-overdue-glow' : ''
                  }`}
                  onClick={() => setSelectedInstallment(installment)}
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-base font-semibold">{installment.agreement_number}</h3>
                        {getStatusBadge(installment.status)}
                        {installment.status === 'active' && summary && summary.overdue_count > 0 && index === 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-destructive-light text-destructive border border-destructive/20 animate-badge-pulse">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {summary.overdue_count} قسط متأخر
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-semibold text-foreground">المركبة: </span>
                          {installment.contract_type === 'multi_vehicle'
                            ? `عقد متعدد المركبات (${installment.total_vehicles_count || 0} مركبة)`
                            : installment.vehicles?.plate_number
                            ? `${installment.vehicles.plate_number} - ${installment.vehicles.make} ${installment.vehicles.model}`
                            : 'غير محدد'}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">التاجر: </span>
                          {installment.customers?.customer_type === 'individual'
                            ? `${installment.customers?.first_name} ${installment.customers?.last_name}`
                            : installment.customers?.company_name}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">تاريخ البداية: </span>
                          {format(new Date(installment.start_date), 'dd/MM/yyyy', { locale: ar })}
                        </div>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <div className="text-xl font-bold mb-1">
                        {formatCurrency(installment.total_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {installment.number_of_installments} قسط
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default VehicleInstallmentsDashboard;