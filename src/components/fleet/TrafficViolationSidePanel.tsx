import React, { useState, useEffect } from 'react';
import { X, FileText, CreditCard, CheckCircle, Edit, Printer, Mail, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TrafficViolation, useConfirmTrafficViolation, useUpdateTrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatPhoneForWhatsApp } from '@/lib/phone';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { TrafficViolationForm } from './TrafficViolationForm';

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
  const confirmMutation = useConfirmTrafficViolation();
  const updateMutation = useUpdateTrafficViolation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [companyCountry, setCompanyCountry] = useState<string>('');
  const companyFilter = useCompanyFilter();

  // الحصول على دولة الشركة
  useEffect(() => {
    const fetchCompanyCountry = async () => {
      try {
        if (!companyFilter?.company_id) return;
        const { data, error } = await supabase
          .from('companies')
          .select('country')
          .eq('id', companyFilter.company_id)
          .single();
        
        if (!error && data?.country) {
          setCompanyCountry(data.country);
        }
      } catch (error) {
        console.error('Error fetching company country:', error);
      }
    };
    fetchCompanyCountry();
  }, [companyFilter?.company_id]);

  if (!violation) return null;

  // معالجات الأزرار
  const handleConfirm = () => {
    if (!violation) return;
    confirmMutation.mutate(violation.id, {
      onSuccess: () => {
        toast.success('تم تأكيد المخالفة بنجاح');
        onClose();
      }
    });
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    toast.success('تم تحديث المخالفة بنجاح');
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    if (!violation) return;
    
    // الحصول على رقم هاتف العميل
    const customerPhone = violation.customers?.phone;
    
    if (!customerPhone) {
      toast.error('رقم الهاتف غير متوفر', {
        description: 'لا يوجد رقم هاتف للعميل لإرسال الرسالة عبر واتساب'
      });
      return;
    }

    // تنسيق رقم الهاتف للواتساب
    const { waNumber } = formatPhoneForWhatsApp(customerPhone, companyCountry);
    
    if (!waNumber) {
      toast.error('رقم غير صالح', {
        description: 'تعذر تنسيق رقم الهاتف لإرسال الرسالة'
      });
      return;
    }

    // إنشاء رسالة المخالفة
    const customerName = violation.customers 
      ? `${violation.customers.first_name} ${violation.customers.last_name}`
      : 'العميل';
    
    const vehicleInfo = violation.vehicles
      ? `المركبة: ${violation.vehicles.make} ${violation.vehicles.model} - ${violation.vehicles.plate_number}`
      : violation.vehicle_plate 
      ? `رقم اللوحة: ${violation.vehicle_plate}`
      : '';

    const statusText = violation.status === 'pending' 
      ? 'في الانتظار' 
      : violation.status === 'confirmed' 
      ? 'مؤكدة' 
      : 'ملغاة';

    const paymentStatusText = violation.payment_status === 'unpaid' 
      ? 'غير مدفوع' 
      : violation.payment_status === 'paid' 
      ? 'مدفوع' 
      : 'مدفوع جزئياً';

    const message = `*إشعار مخالفة مرورية*

مرحباً ${customerName} 👋

*تفاصيل المخالفة:*
• رقم المخالفة: ${violation.penalty_number}
• نوع المخالفة: ${violation.violation_type || '-'}
• التاريخ: ${violation.penalty_date ? format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
• المبلغ: ${formatCurrency(violation.amount || 0)}
${vehicleInfo ? `• ${vehicleInfo}` : ''}
${violation.location ? `• الموقع: ${violation.location}` : ''}
${violation.reason ? `• السبب: ${violation.reason}` : ''}

*حالة المخالفة:* ${statusText}
*حالة الدفع:* ${paymentStatusText}

${violation.notes ? `*ملاحظات:*\n${violation.notes}\n` : ''}

يرجى التواصل معنا لتسوية المخالفة.
شكراً لتفهمكم.`.trim();

    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('تم فتح الواتساب لإرسال الرسالة');
  };

  const handleCancel = () => {
    if (!violation) return;
    updateMutation.mutate({
      id: violation.id,
      status: 'cancelled'
    }, {
      onSuccess: () => {
        toast.success('تم إلغاء المخالفة بنجاح');
        setShowCancelConfirm(false);
        onClose();
      }
    });
  };

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
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={handleConfirm}
                disabled={confirmMutation.isPending || violation.status === 'confirmed'}
              >
                <CheckCircle className="w-4 h-4" />
                {confirmMutation.isPending ? 'جاري...' : 'تأكيد'}
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={handleEdit}
                disabled={violation.status === 'cancelled'}
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={handleSendWhatsApp}
                disabled={!violation.customers?.phone}
                title={!violation.customers?.phone ? 'رقم الهاتف غير متوفر' : 'إرسال عبر واتساب'}
              >
                <Mail className="w-4 h-4" />
                إرسال
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="w-full text-destructive flex items-center justify-center gap-2"
              onClick={() => setShowCancelConfirm(true)}
              disabled={violation.status === 'cancelled' || updateMutation.isPending}
            >
              <XCircle className="w-4 h-4" />
              {updateMutation.isPending ? 'جاري الإلغاء...' : 'إلغاء المخالفة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog للتأكيد على الإلغاء */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الإلغاء</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء هذه المخالفة؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog للتعديل */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المخالفة #{violation.penalty_number}</DialogTitle>
          </DialogHeader>
          <TrafficViolationForm 
            onSuccess={handleEditSuccess}
            vehicleId={violation.vehicle_id}
            violation={violation}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

