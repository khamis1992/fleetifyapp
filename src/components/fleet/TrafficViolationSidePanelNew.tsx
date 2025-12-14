import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Edit, 
  Printer, 
  XCircle,
  Car,
  User,
  MapPin,
  Calendar,
  DollarSign,
  FileWarning,
  Clock,
  Send,
  Gavel,
  MessageCircle,
  Phone,
  AlertTriangle,
  History,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TrafficViolation, useConfirmTrafficViolation, useUpdateTrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useSendViolationWhatsAppNotification } from '@/hooks/useTrafficViolationWhatsApp';
import { formatPhoneForWhatsApp } from '@/lib/phone';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TrafficViolationForm } from './TrafficViolationForm';

interface TrafficViolationSidePanelNewProps {
  violation: TrafficViolation | null;
  open: boolean;
  onClose: () => void;
  onAddPayment?: (violation: TrafficViolation) => void;
  onEscalateToLegal?: (violation: TrafficViolation) => void;
}

// Info Card Component
const InfoCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number | undefined;
  valueClassName?: string;
  copyable?: boolean;
}> = ({ icon: Icon, label, value, valueClassName = '', copyable }) => {
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      toast.success('تم النسخ!');
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`flex items-center gap-2 ${valueClassName}`}>
        <span className="font-medium text-sm">{value || 'غير متوفر'}</span>
        {copyable && value && (
          <button 
            onClick={handleCopy} 
            className="text-neutral-400 hover:text-coral-500 transition-colors"
            title="نسخ"
          >
            <FileText className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export const TrafficViolationSidePanelNew: React.FC<TrafficViolationSidePanelNewProps> = ({
  violation,
  open,
  onClose,
  onAddPayment,
  onEscalateToLegal
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const confirmMutation = useConfirmTrafficViolation();
  const updateMutation = useUpdateTrafficViolation();
  const sendWhatsAppNotification = useSendViolationWhatsAppNotification();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [companyCountry, setCompanyCountry] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const companyFilter = useCompanyFilter();

  // Get company country
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

  // Handlers
  const handleConfirm = () => {
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

  // Send WhatsApp to customer only (opens WhatsApp Web)
  const handleSendWhatsAppToCustomer = async () => {
    if (!violation) return;
    
    const customerPhone = violation.customers?.phone;
    
    if (!customerPhone) {
      toast.error('رقم الهاتف غير متوفر');
      return;
    }

    const { waNumber } = formatPhoneForWhatsApp(customerPhone, companyCountry);
    
    if (!waNumber) {
      toast.error('رقم غير صالح');
      return;
    }

    const customerName = violation.customers 
      ? `${violation.customers.first_name} ${violation.customers.last_name}`
      : 'العميل';
    
    const vehicleInfo = violation.vehicles
      ? `المركبة: ${violation.vehicles.make} ${violation.vehicles.model} - ${violation.vehicles.plate_number}`
      : violation.vehicle_plate 
      ? `رقم اللوحة: ${violation.vehicle_plate}`
      : '';

    const message = `*🚦 إشعار مخالفة مرورية*

مرحباً ${customerName} 👋

*تفاصيل المخالفة:*
• رقم المخالفة: ${violation.penalty_number}
• نوع المخالفة: ${violation.violation_type || '-'}
• التاريخ: ${violation.penalty_date ? format(new Date(violation.penalty_date), 'dd/MM/yyyy') : '-'}
• المبلغ: ${formatCurrency(violation.amount || 0)}
${vehicleInfo ? `• ${vehicleInfo}` : ''}
${violation.location ? `• الموقع: ${violation.location}` : ''}

يرجى التواصل معنا لتسوية المخالفة.
شكراً لتفهمكم.`.trim();

    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('تم فتح الواتساب لإرسال الرسالة');
  };

  // Send WhatsApp to customer AND all report recipients (via API)
  const handleSendWhatsAppToAll = () => {
    if (!violation) return;
    
    sendWhatsAppNotification.mutate({
      violation: violation as any,
      notificationType: 'new_violation',
    });
  };

  // Send payment reminder
  const handleSendPaymentReminder = () => {
    if (!violation) return;
    
    sendWhatsAppNotification.mutate({
      violation: violation as any,
      notificationType: 'payment_reminder',
    });
  };

  const handleCancel = () => {
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
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">قيد المراجعة</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">مؤكدة</Badge>;
      case 'cancelled':
        return <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200">ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-200">مسددة</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-700 border-red-200">غير مسددة</Badge>;
      case 'partially_paid':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">جزئي</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } overflow-hidden flex flex-col`}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-coral-500 to-coral-600 text-white p-5">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {getStatusBadge(violation.status)}
              {getPaymentStatusBadge(violation.payment_status || 'unpaid')}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileWarning className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{violation.penalty_number}</h2>
              <p className="text-coral-100 text-sm">
                {violation.violation_type || 'مخالفة مرورية'}
              </p>
            </div>
          </div>

          {/* Amount Display */}
          <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <span className="text-coral-100">قيمة المخالفة</span>
            <span className="text-2xl font-black">{formatCurrency(violation.amount || 0)}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 gap-1 p-2 bg-neutral-50 mx-4 mt-4 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg text-xs">
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg text-xs">
              المركبة
            </TabsTrigger>
            <TabsTrigger value="customer" className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg text-xs">
              العميل
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg text-xs">
              السجل
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 space-y-4">
              {/* Basic Info */}
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-coral-500" />
                  معلومات المخالفة
                </h3>
                <InfoCard icon={FileWarning} label="رقم المخالفة" value={violation.penalty_number} copyable />
                <InfoCard icon={FileText} label="نوع المخالفة" value={violation.violation_type || 'غير محدد'} />
                <InfoCard icon={Calendar} label="التاريخ" value={violation.penalty_date ? format(new Date(violation.penalty_date), 'dd/MM/yyyy') : '-'} />
                <InfoCard icon={MapPin} label="الموقع" value={violation.location} />
                <InfoCard icon={DollarSign} label="المبلغ" value={formatCurrency(violation.amount || 0)} valueClassName="text-coral-600 font-bold" />
              </div>

              {/* Reason & Notes */}
              {(violation.reason || violation.notes) && (
                <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-coral-500" />
                    التفاصيل
                  </h3>
                  {violation.reason && (
                    <div className="mb-3">
                      <p className="text-xs text-neutral-500 mb-1">السبب</p>
                      <p className="text-sm text-neutral-700">{violation.reason}</p>
                    </div>
                  )}
                  {violation.notes && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">ملاحظات</p>
                      <p className="text-sm text-neutral-700">{violation.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-coral-500" />
                  إجراءات سريعة
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl"
                    onClick={() => onAddPayment && onAddPayment(violation)}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    إضافة دفعة
                  </Button>
                  <Button
                    variant="outline"
                    className="border-coral-200 text-coral-600 hover:bg-coral-50 rounded-xl"
                    onClick={handleSendWhatsAppToCustomer}
                    disabled={!violation.customers?.phone}
                  >
                    <Send className="w-4 h-4 ml-2" />
                    إرسال للعميل
                  </Button>
                  {violation.status === 'pending' && (
                    <Button
                      variant="outline"
                      className="border-green-200 text-green-600 hover:bg-green-50 rounded-xl"
                      onClick={handleConfirm}
                      disabled={confirmMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 ml-2" />
                      تأكيد
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleEdit}
                    disabled={violation.status === 'cancelled'}
                  >
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                </div>
                
                {/* Additional WhatsApp Actions */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-600 hover:bg-green-50 rounded-xl"
                    onClick={handleSendWhatsAppToAll}
                    disabled={sendWhatsAppNotification.isPending}
                  >
                    <Users className="w-4 h-4 ml-2" />
                    {sendWhatsAppNotification.isPending ? 'جاري...' : 'إرسال للجميع'}
                  </Button>
                  {violation.payment_status === 'unpaid' && (
                    <Button
                      variant="outline"
                      className="border-amber-200 text-amber-600 hover:bg-amber-50 rounded-xl"
                      onClick={handleSendPaymentReminder}
                      disabled={sendWhatsAppNotification.isPending}
                    >
                      <Clock className="w-4 h-4 ml-2" />
                      تذكير بالسداد
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Vehicle Tab */}
            <TabsContent value="vehicle" className="m-0 space-y-4">
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-coral-500" />
                  معلومات المركبة
                </h3>
                {violation.vehicles ? (
                  <>
                    <div className="bg-neutral-50 rounded-xl p-4 mb-3 text-center">
                      <div className="text-2xl font-mono font-black text-neutral-800">
                        {violation.vehicles.plate_number}
                      </div>
                    </div>
                    <InfoCard icon={Car} label="الماركة" value={violation.vehicles.make} />
                    <InfoCard icon={Car} label="الموديل" value={violation.vehicles.model} />
                    {violation.vehicles.year && (
                      <InfoCard icon={Calendar} label="سنة الصنع" value={violation.vehicles.year} />
                    )}
                  </>
                ) : violation.vehicle_plate ? (
                  <div className="bg-neutral-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-mono font-black text-neutral-800">
                      {violation.vehicle_plate}
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">رقم اللوحة فقط (المركبة غير مربوطة)</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد بيانات مركبة</p>
                  </div>
                )}
              </div>

              {/* Contract Info */}
              {violation.contracts && (
                <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-coral-500" />
                    العقد المرتبط
                  </h3>
                  <InfoCard icon={FileText} label="رقم العقد" value={violation.contracts.contract_number} copyable />
                  <InfoCard icon={CheckCircle} label="الحالة" value={
                    violation.contracts.status === 'active' ? 'نشط' :
                    violation.contracts.status === 'completed' ? 'مكتمل' : 
                    violation.contracts.status
                  } />
                  {violation.contracts.start_date && (
                    <InfoCard icon={Calendar} label="تاريخ البداية" value={format(new Date(violation.contracts.start_date), 'dd/MM/yyyy')} />
                  )}
                  {violation.contracts.end_date && (
                    <InfoCard icon={Calendar} label="تاريخ النهاية" value={format(new Date(violation.contracts.end_date), 'dd/MM/yyyy')} />
                  )}
                </div>
              )}
            </TabsContent>

            {/* Customer Tab */}
            <TabsContent value="customer" className="m-0 space-y-4">
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-coral-500" />
                  معلومات العميل
                </h3>
                {violation.customers ? (
                  <>
                    <div className="bg-neutral-50 rounded-xl p-4 mb-3 text-center">
                      <div className="w-16 h-16 bg-coral-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <User className="w-8 h-8 text-coral-600" />
                      </div>
                      <div className="font-bold text-neutral-800">
                        {violation.customers.first_name} {violation.customers.last_name}
                      </div>
                      {violation.customers.company_name && (
                        <p className="text-xs text-neutral-500">{violation.customers.company_name}</p>
                      )}
                    </div>
                    <InfoCard icon={Phone} label="الهاتف" value={violation.customers.phone} copyable />
                    
                    {/* Contact Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl"
                        onClick={handleSendWhatsAppToCustomer}
                      >
                        <MessageCircle className="w-4 h-4 ml-2 text-green-500" />
                        واتساب
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl"
                        onClick={() => window.open(`tel:${violation.customers?.phone}`, '_self')}
                      >
                        <Phone className="w-4 h-4 ml-2 text-blue-500" />
                        اتصال
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد بيانات عميل</p>
                  </div>
                )}
              </div>

              {/* Escalate to Legal */}
              {violation.payment_status === 'unpaid' && onEscalateToLegal && (
                <div className="bg-amber-50 rounded-[1.25rem] border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-700 text-sm">تصعيد للشؤون القانونية</h4>
                      <p className="text-xs text-amber-600 mt-1">
                        يمكنك تصعيد هذه المخالفة للقسم القانوني للمتابعة
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl"
                        onClick={() => onEscalateToLegal(violation)}
                      >
                        <Gavel className="w-4 h-4 ml-2" />
                        تصعيد للقانونية
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="m-0 space-y-4">
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-coral-500" />
                  سجل المخالفة
                </h3>
                <InfoCard icon={Calendar} label="تاريخ الإنشاء" value={violation.created_at ? format(new Date(violation.created_at), 'dd/MM/yyyy HH:mm') : '-'} />
                <InfoCard icon={Clock} label="آخر تحديث" value={violation.updated_at ? format(new Date(violation.updated_at), 'dd/MM/yyyy HH:mm') : '-'} />
              </div>

              {/* Status Timeline */}
              <div className="bg-white rounded-[1.25rem] border border-neutral-100 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-neutral-700 mb-3">تسلسل الحالة</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      violation.status !== 'cancelled' ? 'bg-green-500' : 'bg-neutral-300'
                    }`} />
                    <span className="text-sm text-neutral-600">تم التسجيل</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      violation.status === 'confirmed' ? 'bg-green-500' : 
                      violation.status === 'pending' ? 'bg-amber-500' : 'bg-neutral-300'
                    }`} />
                    <span className="text-sm text-neutral-600">
                      {violation.status === 'confirmed' ? 'تم التأكيد' : 
                       violation.status === 'pending' ? 'قيد المراجعة' : 'ملغاة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      violation.payment_status === 'paid' ? 'bg-green-500' : 
                      violation.payment_status === 'partially_paid' ? 'bg-amber-500' : 'bg-neutral-300'
                    }`} />
                    <span className="text-sm text-neutral-600">
                      {violation.payment_status === 'paid' ? 'تم السداد' : 
                       violation.payment_status === 'partially_paid' ? 'سداد جزئي' : 'في انتظار السداد'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t border-neutral-100 p-4 bg-neutral-50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelConfirm(true)}
              disabled={violation.status === 'cancelled' || updateMutation.isPending}
            >
              <XCircle className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
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
              تراجع
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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

export default TrafficViolationSidePanelNew;

