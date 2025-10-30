import React from 'react';
import { X, FileText, CreditCard, CheckCircle, Edit, Printer, Mail, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TrafficViolationSidePanelProps {
  violation: TrafficViolation | null;
  open: boolean;
  onClose: () => void;
  onAddPayment?: (violation: TrafficViolation) => void;
}

export const TrafficViolationSidePanel: React.FC<TrafficViolationSidePanelProps> = ({
  violation,
  open,
  onClose,
  onAddPayment
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (!violation) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="status-pending">🟡 في الانتظار</Badge>;
      case 'confirmed':
        return <Badge className="status-confirmed">✅ مؤكدة</Badge>;
      case 'cancelled':
        return <Badge className="status-cancelled">⚪ ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="payment-paid">✅ مدفوع</Badge>;
      case 'unpaid':
        return <Badge className="payment-unpaid">❌ غير مدفوع</Badge>;
      case 'partially_paid':
        return <Badge className="payment-partial">🟠 مدفوع جزئياً</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`panel-backdrop ${open ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className={`side-panel ${open ? 'open' : ''}`}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل المخالفة #{violation.penalty_number}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* معلومات أساسية */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">🔖 معلومات أساسية</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">رقم المخالفة:</span>
                <span className="font-mono font-semibold">{violation.penalty_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">نوع المخالفة:</span>
                <span className="font-medium">{violation.violation_type || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">التاريخ:</span>
                <span>
                  {violation.penalty_date && format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المبلغ:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(violation.amount || 0)}</span>
              </div>
            </div>
          </div>

          {/* معلومات المركبة */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">🚗 معلومات المركبة</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">رقم اللوحة:</span>
                <span className="font-mono font-bold text-lg">
                  {violation.vehicles?.plate_number || violation.vehicle_plate || '-'}
                </span>
              </div>
              {violation.vehicles && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">المركبة:</span>
                    <span className="font-medium">
                      {violation.vehicles.make} {violation.vehicles.model}
                      {violation.vehicles.year && ` ${violation.vehicles.year}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">معرف المركبة:</span>
                    <span className="font-mono text-xs">{violation.vehicle_id}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* معلومات العميل */}
          {violation.customers && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">👤 معلومات العميل</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الاسم:</span>
                  <span className="font-medium">
                    {violation.customers.first_name} {violation.customers.last_name}
                  </span>
                </div>
                {violation.customers.company_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">الشركة:</span>
                    <span>{violation.customers.company_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الجوال:</span>
                  <span className="font-mono">{violation.customers.phone}</span>
                </div>
              </div>
            </div>
          )}

          {/* معلومات العقد */}
          {violation.agreements && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">📄 معلومات العقد</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">رقم العقد:</span>
                  <span className="font-mono font-semibold">{violation.agreements.contract_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الحالة:</span>
                  <span>
                    {violation.agreements.status === 'active' ? 'نشط' :
                     violation.agreements.status === 'completed' ? 'مكتمل' :
                     violation.agreements.status === 'cancelled' ? 'ملغي' : violation.agreements.status}
                  </span>
                </div>
                {violation.agreements.start_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">تاريخ البداية:</span>
                    <span>{format(new Date(violation.agreements.start_date), 'dd/MM/yyyy', { locale: ar })}</span>
                  </div>
                )}
                {violation.agreements.end_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">تاريخ النهاية:</span>
                    <span>{format(new Date(violation.agreements.end_date), 'dd/MM/yyyy', { locale: ar })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تفاصيل المخالفة */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">📍 تفاصيل المخالفة</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {violation.location && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">الموقع:</span>
                  <span className="font-medium">{violation.location}</span>
                </div>
              )}
              {violation.reason && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">السبب:</span>
                  <span>{violation.reason}</span>
                </div>
              )}
              {violation.notes && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">ملاحظات:</span>
                  <span className="text-sm">{violation.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* معلومات الحالة */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">📊 معلومات الحالة</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالة المخالفة:</span>
                {getStatusBadge(violation.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالة الدفع:</span>
                {getPaymentStatusBadge(violation.payment_status || 'unpaid')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المبلغ المتبقي:</span>
                <span className="text-lg font-bold text-destructive">{formatCurrency(violation.amount || 0)}</span>
              </div>
            </div>
          </div>

          {/* معلومات التدقيق */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">⏱️ معلومات التدقيق</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                <span className="font-mono text-xs">
                  {violation.created_at && format(new Date(violation.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">آخر تحديث:</span>
                <span className="font-mono text-xs">
                  {violation.updated_at && format(new Date(violation.updated_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </span>
              </div>
            </div>
          </div>

          {/* الإجراءات */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              className="w-full"
              onClick={() => onAddPayment && onAddPayment(violation)}
            >
              <CreditCard className="w-4 h-4 ml-2" />
              إضافة دفعة
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                تأكيد
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                إرسال
              </Button>
            </div>
            <Button variant="outline" className="w-full text-destructive flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" />
              إلغاء المخالفة
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

