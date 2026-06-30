import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  CreditCard,
  CheckCircle,
  Edit,
  Printer,
  Mail,
  XCircle,
  Car,
  User,
  Calendar,
  MapPin,
  ReceiptText,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrafficViolation, useConfirmTrafficViolation, useUpdateTrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatPhoneForWhatsApp } from '@/lib/phone';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { TrafficViolationForm } from './TrafficViolationForm';

interface TrafficViolationSidePanelProps {
  violation: TrafficViolation | null;
  open: boolean;
  onClose: () => void;
  onAddPayment?: (violation: TrafficViolation) => void;
}

const DetailRow = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 rounded-[8px] bg-[#F8FAFC] px-3 py-2.5">
    <span className="text-sm font-bold text-[#64748B]">{label}</span>
    <span className={`text-left text-sm ${strong ? 'font-black text-[#020617]' : 'font-bold text-[#102B4E]'}`}>
      {value || '-'}
    </span>
  </div>
);

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[8px] border border-[#DDE5EF] bg-white p-4">
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAF8FE] text-[#38BDF8]">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-base font-black text-[#020617]">{title}</h3>
    </div>
    <div className="space-y-2">{children}</div>
  </section>
);

export const TrafficViolationSidePanel: React.FC<TrafficViolationSidePanelProps> = ({
  violation,
  open,
  onClose,
  onAddPayment,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const confirmMutation = useConfirmTrafficViolation();
  const updateMutation = useUpdateTrafficViolation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [companyCountry, setCompanyCountry] = useState<string>('');
  const companyFilter = useCompanyFilter();

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

  const customerName = violation.customers
    ? [violation.customers.first_name, violation.customers.last_name].filter(Boolean).join(' ') ||
      violation.customers.company_name
    : '-';

  const vehicleName = violation.vehicles
    ? `${violation.vehicles.make || ''} ${violation.vehicles.model || ''}${violation.vehicles.year ? ` ${violation.vehicles.year}` : ''}`.trim()
    : '-';

  const contract = violation.contracts || violation.agreements;
  const penaltyDate = violation.penalty_date
    ? format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar })
    : '-';

  const statusLabel =
    violation.status === 'confirmed' ? 'مؤكدة' :
    violation.status === 'cancelled' ? 'ملغاة' :
    'في الانتظار';

  const paymentLabel =
    violation.payment_status === 'paid' ? 'مدفوعة' :
    violation.payment_status === 'partially_paid' ? 'مدفوعة جزئياً' :
    'غير مدفوعة';

  const handleConfirm = () => {
    confirmMutation.mutate(violation.id, {
      onSuccess: () => {
        toast.success('تم تأكيد المخالفة بنجاح');
        onClose();
      },
    });
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    toast.success('تم تحديث المخالفة بنجاح');
    onClose();
  };

  const handleSendWhatsApp = async () => {
    const customerPhone = violation.customers?.phone;

    if (!customerPhone) {
      toast.error('رقم الهاتف غير متوفر', {
        description: 'لا يوجد رقم هاتف للعميل لإرسال الرسالة عبر واتساب',
      });
      return;
    }

    const { waNumber } = formatPhoneForWhatsApp(customerPhone, companyCountry);

    if (!waNumber) {
      toast.error('رقم غير صالح', {
        description: 'تعذر تنسيق رقم الهاتف لإرسال الرسالة',
      });
      return;
    }

    const message = `*إشعار مخالفة مرورية*

مرحباً ${customerName}

تفاصيل المخالفة:
- رقم المخالفة: ${violation.penalty_number}
- نوع المخالفة: ${violation.violation_type || '-'}
- التاريخ: ${penaltyDate}
- المبلغ: ${formatCurrency(violation.amount || 0)}
${vehicleName !== '-' ? `- المركبة: ${vehicleName}` : ''}
${violation.location ? `- الموقع: ${violation.location}` : ''}

حالة المخالفة: ${statusLabel}
حالة الدفع: ${paymentLabel}

يرجى التواصل معنا لتسوية المخالفة.`;

    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('تم فتح واتساب لإرسال الرسالة');
  };

  const handleCancel = () => {
    updateMutation.mutate(
      {
        id: violation.id,
        status: 'cancelled',
      },
      {
        onSuccess: () => {
          toast.success('تم إلغاء المخالفة بنجاح');
          setShowCancelConfirm(false);
          onClose();
        },
      },
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm transition-opacity duration-200 print:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        dir="rtl"
        className={`fixed inset-y-0 left-0 z-[90] flex w-full max-w-[620px] flex-col border-r border-[#DDE5EF] bg-[#F6F8FB] shadow-[-24px_0_70px_-42px_rgba(15,23,42,.85)] transition-transform duration-300 ease-out print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="border-b border-[#DDE5EF] bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#102B4E] text-white">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-[#38BDF8]">تفاصيل المخالفة المرورية</p>
                <h2 className="truncate text-xl font-black text-[#020617]">#{violation.penalty_number}</h2>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={onClose} className="h-10 w-10 rounded-[8px] border-[#DDE5EF]">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Badge className="justify-center rounded-[8px] bg-[#EAF8FE] py-2 font-black text-[#38BDF8] hover:bg-[#EAF8FE]">
              {statusLabel}
            </Badge>
            <Badge
              className={`justify-center rounded-[8px] py-2 font-black hover:bg-current/0 ${
                violation.payment_status === 'paid'
                  ? 'bg-[#E8FBF6] text-[#22C7A1]'
                  : violation.payment_status === 'partially_paid'
                    ? 'bg-[#EAF8FE] text-[#38BDF8]'
                    : 'bg-[#FFF0F2] text-[#FB6B7A]'
              }`}
            >
              {paymentLabel}
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 rounded-[8px] border border-[#DDE5EF] bg-white p-4">
            <p className="text-sm font-bold text-[#64748B]">المبلغ المستحق</p>
            <p className="mt-1 text-3xl font-black text-[#020617]">{formatCurrency(violation.amount || 0)}</p>
            <p className="mt-1 text-xs font-bold text-[#94A3B8]">تاريخ المخالفة: {penaltyDate}</p>
          </div>

          <div className="space-y-4">
            <Section icon={ReceiptText} title="معلومات أساسية">
              <DetailRow label="رقم المخالفة" value={violation.penalty_number} strong />
              <DetailRow label="نوع المخالفة" value={violation.violation_type || 'مخالفة مرورية'} />
              <DetailRow label="التاريخ" value={penaltyDate} />
              <DetailRow label="المبلغ" value={formatCurrency(violation.amount || 0)} strong />
            </Section>

            <Section icon={Car} title="معلومات المركبة">
              <DetailRow label="رقم اللوحة" value={violation.vehicles?.plate_number || violation.vehicle_plate || '-'} strong />
              <DetailRow label="المركبة" value={vehicleName} />
              <DetailRow label="معرف المركبة" value={violation.vehicle_id || '-'} />
            </Section>

            <Section icon={User} title="معلومات العميل">
              <DetailRow label="الاسم" value={customerName} strong />
              <DetailRow label="الشركة" value={violation.customers?.company_name || '-'} />
              <DetailRow label="الجوال" value={violation.customers?.phone || '-'} />
            </Section>

            {contract && (
              <Section icon={FileText} title="معلومات العقد">
                <DetailRow label="رقم العقد" value={contract.contract_number} strong />
                <DetailRow label="الحالة" value={contract.status || '-'} />
                <DetailRow
                  label="تاريخ البداية"
                  value={contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                />
                <DetailRow
                  label="تاريخ النهاية"
                  value={contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                />
              </Section>
            )}

            <Section icon={MapPin} title="تفاصيل المخالفة">
              <DetailRow label="الموقع" value={violation.location || '-'} />
              <DetailRow label="السبب" value={violation.reason || '-'} />
              {violation.notes && (
                <div className="rounded-[8px] bg-[#F8FAFC] px-3 py-2.5">
                  <p className="text-sm font-bold text-[#64748B]">ملاحظات</p>
                  <p className="mt-1 text-sm font-bold leading-7 text-[#102B4E]">{violation.notes}</p>
                </div>
              )}
            </Section>

            <Section icon={Clock} title="معلومات التدقيق">
              <DetailRow
                label="تاريخ الإنشاء"
                value={violation.created_at ? format(new Date(violation.created_at), 'dd/MM/yyyy HH:mm', { locale: ar }) : '-'}
              />
              <DetailRow
                label="آخر تحديث"
                value={violation.updated_at ? format(new Date(violation.updated_at), 'dd/MM/yyyy HH:mm', { locale: ar }) : '-'}
              />
            </Section>
          </div>
        </div>

        <div className="border-t border-[#DDE5EF] bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11 rounded-[8px] bg-[#22C7A1] font-black text-white hover:bg-[#1DAE8D]"
              onClick={() => onAddPayment?.(violation)}
            >
              <CreditCard className="ml-2 h-4 w-4" />
              إضافة دفعة
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[8px] border-[#DDE5EF] font-black"
              onClick={() => window.print()}
            >
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[8px] border-[#DDE5EF] font-black text-[#22C7A1]"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || violation.status === 'confirmed'}
            >
              <CheckCircle className="ml-2 h-4 w-4" />
              تأكيد
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[8px] border-[#DDE5EF] font-black text-[#38BDF8]"
              onClick={() => setShowEditDialog(true)}
              disabled={violation.status === 'cancelled'}
            >
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[8px] border-[#DDE5EF] font-black"
              onClick={handleSendWhatsApp}
              disabled={!violation.customers?.phone}
            >
              <Mail className="ml-2 h-4 w-4" />
              إرسال
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[8px] border-[#FFD5DC] font-black text-[#FB6B7A]"
              onClick={() => setShowCancelConfirm(true)}
              disabled={violation.status === 'cancelled' || updateMutation.isPending}
            >
              <XCircle className="ml-2 h-4 w-4" />
              إلغاء المخالفة
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الإلغاء</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء هذه المخالفة؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              تراجع
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المخالفة #{violation.penalty_number}</DialogTitle>
          </DialogHeader>
          <TrafficViolationForm onSuccess={handleEditSuccess} vehicleId={violation.vehicle_id} violation={violation} />
        </DialogContent>
      </Dialog>
    </>
  );
};
