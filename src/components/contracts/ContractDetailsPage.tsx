/**
 * مكون صفحة تفاصيل العقد - صفحة كاملة
 * صفحة شاملة لعرض جميع معلومات وتفاصيل العقد مع البيانات الحقيقية
 * 
 * @component ContractDetailsPage
 */

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Printer,
  Download,
  FileText,
  User,
  Car,
  RefreshCw,
  FileEdit,
  XCircle,
  DollarSign,
  Calendar,
  CreditCard,
  ClipboardCheck,
  Info,
  Wallet,
  LogIn,
  LogOut,
  AlertTriangle,
  AlertCircle,
  Folder,
  GitBranch,
  Activity,
  CheckCircle,
  Clock,
  Circle,
  Plus,
  Eye,
  Upload,
  IdCard,
  FileBadge,
  PlusCircle,
  CalendarCheck,
  CalendarX,
  Check,
  FilePlus,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ContractDocuments } from './ContractDocuments';
import { OfficialContractView } from './OfficialContractView';
import { LateFinesTab } from './LateFinesTab';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractStatusManagement } from './ContractStatusManagement';
import { VehicleCheckInOut } from '@/components/vehicles/VehicleCheckInOut';
import { PayInvoiceDialog } from '@/components/finance/PayInvoiceDialog';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { ContractInvoiceDialog } from '@/components/contracts/ContractInvoiceDialog';
import { ContractRenewalDialog } from './ContractRenewalDialog';
import { ContractAmendmentForm } from './ContractAmendmentForm';
import { ContractPrintDialog } from './ContractPrintDialog';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';

/**
 * مكون صفحة تفاصيل العقد الرئيسية
 */
const ContractDetailsPage = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('details');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isStatusManagementOpen, setIsStatusManagementOpen] = useState(false);

  // جلب بيانات العقد مع العلاقات
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract-details', contractNumber, companyId],
    queryFn: async () => {
      if (!contractNumber || !companyId) {
        throw new Error('رقم العقد أو الشركة مفقود');
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers!customer_id(
            id,
            customer_code,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type,
            phone,
            email,
            national_id
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year,
            color,
            status
          )
        `)
        .eq('contract_number', contractNumber)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Contract;
    },
    enabled: !!contractNumber && !!companyId,
  });

  // جلب الفواتير المرتبطة
  const { data: invoices = [] } = useQuery({
    queryKey: ['contract-invoices', contract?.id],
    queryFn: async () => {
      if (!contract?.id) {
        console.log('⚠️ [CONTRACT_INVOICES] No contract ID available');
        return [];
      }
      
      console.log('🔍 [CONTRACT_INVOICES] Fetching invoices for contract:', contract.id);
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [CONTRACT_INVOICES] Error fetching invoices:', error);
        throw error;
      }
      
      console.log('✅ [CONTRACT_INVOICES] Found invoices:', data?.length || 0, data);
      return data as Invoice[] || [];
    },
    enabled: !!contract?.id,
  });

  // جلب المدفوعات المرتبطة بالعقد
  const { data: contractPayments = [] } = useQuery({
    queryKey: ['contract-payments', contract?.id, companyId],
    queryFn: async () => {
      if (!contract?.id || !companyId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contract?.id && !!companyId,
  });

  // جلب المخالفات المرورية المرتبطة بالعقد
  const { data: trafficViolations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['contract-traffic-violations', contract?.id, companyId],
    queryFn: async () => {
      if (!contract?.id || !companyId) return [];
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contract?.id && !!companyId,
  });

  // جلب فحوصات المركبة
  const { data: inspections, refetch: refetchInspections } = useVehicleInspections({
    contractId: contract?.id || '',
    enabled: !!contract?.id && !!contract?.vehicle_id,
  });

  // الحصول على فحوصات الاستلام والتسليم
  const checkInInspection = inspections?.find((i) => i.inspection_type === 'check_in');
  const checkOutInspection = inspections?.find((i) => i.inspection_type === 'check_out');

  // حساب إحصائيات العقد
  const contractStats = useMemo(() => {
    if (!contract) return null;

    const totalAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = totalAmount - totalPaid;
    
    const startDate = contract.start_date ? new Date(contract.start_date) : null;
    const endDate = contract.end_date ? new Date(contract.end_date) : null;
    const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;
    const totalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
    const progressPercentage = totalDays > 0 ? Math.round(((totalDays - daysRemaining) / totalDays) * 100) : 0;

    // حساب عدد الدفعات
    const monthlyAmount = contract.monthly_amount || 0;
    const totalPayments = monthlyAmount > 0 ? Math.ceil(totalAmount / monthlyAmount) : 0;
    const paidPayments = monthlyAmount > 0 ? Math.floor(totalPaid / monthlyAmount) : 0;

    return {
      totalAmount,
      monthlyAmount,
      totalPaid,
      balanceDue,
      daysRemaining,
      progressPercentage,
      totalPayments,
      paidPayments,
      hasCheckIn: !!checkInInspection,
      hasCheckOut: !!checkOutInspection,
    };
  }, [contract, checkInInspection, checkOutInspection]);

  // معالجات الأحداث
  const handleBack = useCallback(() => {
    navigate('/contracts');
  }, [navigate]);

  const handlePrint = useCallback(() => {
    setIsPrintDialogOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    toast({
      title: 'تصدير العقد',
      description: 'جاري تصدير العقد...',
    });
  }, [toast]);

  const handleRenew = useCallback(() => {
    if (contract) {
      setIsRenewalDialogOpen(true);
    }
  }, [contract]);

  const handleAmend = useCallback(() => {
    if (contract) {
      setIsAmendmentDialogOpen(true);
    }
  }, [contract]);

  const handleInvoicePay = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayDialogOpen(true);
  }, []);

  const handleInvoicePreview = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  }, []);

  const handleInvoiceDownload = useCallback(async (invoice: Invoice) => {
    try {
      // استيراد دالة التصدير
      const { exportToPDF } = await import('@/utils/exportHelpers');
      const elementId = `invoice-${invoice.id}`;
      
      // إنشاء عنصر مؤقت للفاتورة
      const tempDiv = document.createElement('div');
      tempDiv.id = elementId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      
      // هنا يمكنك استخدام ProfessionalInvoiceTemplate لعرض الفاتورة
      // ثم تصديرها كـ PDF
      toast({
        title: 'جاري تحميل الفاتورة',
        description: 'سيتم تحميل الفاتورة كملف PDF',
      });
      
      // فتح معاينة الفاتورة أولاً
      handleInvoicePreview(invoice);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'خطأ في التحميل',
        description: 'فشل تحميل الفاتورة',
        variant: 'destructive',
      });
    }
  }, [toast, handleInvoicePreview]);

  const handleInvoicePrint = useCallback((invoice: Invoice) => {
    // فتح معاينة الفاتورة ثم الطباعة
    handleInvoicePreview(invoice);
    // سيتم الطباعة من داخل معاينة الفاتورة
  }, [handleInvoicePreview]);

  const handleTerminate = useCallback(() => {
    toast({
      title: 'إنهاء العقد',
      description: 'هل أنت متأكد من إنهاء هذا العقد؟',
      variant: 'destructive',
    });
  }, [toast]);

  // دوال مساعدة
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'status-active',
      draft: 'status-draft',
      expired: 'status-expired',
      suspended: 'status-suspended',
      cancelled: 'status-cancelled',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      active: 'نشط',
      draft: 'مسودة',
      expired: 'منتهي',
      suspended: 'معلق',
      cancelled: 'ملغي',
    };
    return texts[status] || status;
  };

  const getPaymentStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      paid: 'payment-paid',
      unpaid: 'payment-unpaid',
      partially_paid: 'payment-partial',
      overdue: 'payment-overdue',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      paid: 'مدفوعة',
      unpaid: 'غير مدفوعة',
      partially_paid: 'مدفوعة جزئياً',
      overdue: 'متأخرة',
    };
    return texts[status] || status;
  };

  const getCustomerName = (customer: any): string => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar || customer.company_name || 'شركة';
    }
    return `${customer.first_name_ar || customer.first_name} ${customer.last_name_ar || customer.last_name}`;
  };

  // معالجة حالات التحميل والأخطاء
  // انتظار تحميل بيانات المصادقة أولاً - يجب انتظار companyId
  // isAuthenticating: جارٍ التحقق من الجلسة
  // !companyId: لم يتم تحميل بيانات الشركة بعد (الـ full profile)
  // isLoading: الـ query قيد التنفيذ
  if (isAuthenticating || !companyId || isLoading) {
    return <PageSkeletonFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">حدث خطأ</h3>
            <p className="text-gray-600 mb-4">فشل في تحميل بيانات العقد</p>
            <Button onClick={() => navigate('/contracts')}>
              العودة لصفحة العقود
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">العقد غير موجود</h3>
            <p className="text-gray-600 mb-4">لم يتم العثور على هذا العقد</p>
            <Button onClick={() => navigate('/contracts')}>
              العودة لصفحة العقود
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName = getCustomerName(contract.customer);
  const vehicleName = contract.vehicle
    ? `${contract.vehicle.make} ${contract.vehicle.model} ${contract.vehicle.year || ''}`
    : 'غير محدد';
  const plateNumber = contract.vehicle?.plate_number || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* الجانب الأيمن - زر الرجوع والعنوان */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-lg"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">تفاصيل العقد</h1>
                <p className="text-xs text-gray-500">إدارة ومتابعة تفاصيل العقد</p>
              </div>
            </div>

            {/* الجانب الأيسر - الإجراءات */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* بطاقة رأس العقد */}
        <Card className="mb-6 animate-in fade-in-50 duration-350">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* الصف الأول - رقم العقد والحالة */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      عقد #{contract.contract_number}
                    </h2>
                    <p className="text-sm text-gray-600">
                      نوع العقد: {contract.contract_type === 'rental' ? 'إيجار' : contract.contract_type}
                    </p>
                  </div>
                </div>
                <ContractStatusBadge 
                  status={contract.status} 
                  clickable={true}
                  onClick={() => setIsStatusManagementOpen(true)}
                  className="px-4 py-2 text-sm"
                />
              </div>

              {/* الصف الأوسط - معلومات العميل والسيارة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-gray-200">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-xs text-gray-500">العميل</p>
                    <p className="font-semibold text-gray-900">{customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-xs text-gray-500">السيارة</p>
                    <p className="font-semibold text-gray-900">
                      {vehicleName} {plateNumber && `• ${plateNumber}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* معلومات التواريخ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">البداية:</span>
                  <span className="font-semibold">
                    {contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-red-600" />
                  <span className="text-gray-600">النهاية:</span>
                  <span className="font-semibold">
                    {contract.end_date ? format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-600">المتبقي:</span>
                  <span className="font-semibold text-orange-600">
                    {contractStats?.daysRemaining || 0} يوماً ({contractStats?.progressPercentage || 0}%)
                  </span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {contract.status === 'active' && (
                  <>
                    <Button onClick={handleRenew} className="gap-2 bg-green-600 hover:bg-green-700">
                      <RefreshCw className="w-4 h-4" />
                      تجديد العقد
                    </Button>
                    <Button onClick={handleAmend} variant="outline" className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50">
                      <FileEdit className="w-4 h-4" />
                      تعديل العقد
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={handleTerminate}
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  إنهاء العقد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* بطاقة المبلغ الإجمالي */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-xs text-gray-500">إجمالي القيمة</span>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {formatCurrency(contractStats?.totalAmount || 0)}
              </div>
              <div className="text-sm text-gray-600">
                شهرياً: {formatCurrency(contractStats?.monthlyAmount || 0)}
              </div>
            </CardContent>
          </Card>

          {/* بطاقة المدة */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs text-gray-500">المدة</span>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {contractStats?.totalPayments || 0} شهر
              </div>
              <div className="text-sm text-gray-600">
                متبقي: {contractStats?.daysRemaining || 0} يوم
              </div>
            </CardContent>
          </Card>

          {/* بطاقة حالة الدفع */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500">حالة الدفع</span>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {contractStats?.paidPayments}/{contractStats?.totalPayments}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                متبقي: {formatCurrency(contractStats?.balanceDue || 0)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${contractStats?.totalPayments && contractStats.totalPayments > 0
                      ? Math.round((contractStats.paidPayments / contractStats.totalPayments) * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* بطاقة حالة الفحص */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500">حالة الفحص</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">استلام المركبة</span>
                  {contractStats?.hasCheckIn ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      مكتمل
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Circle className="w-4 h-4" />
                      قادم
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">تسليم المركبة</span>
                  {contractStats?.hasCheckOut ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      مكتمل
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Circle className="w-4 h-4" />
                      قادم
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قسم التبويبات */}
        <Card className="animate-in fade-in-50 duration-500">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 overflow-x-auto">
              <TabsList className="w-full justify-start bg-transparent h-auto p-2 rounded-none flex gap-1">
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Info className="w-4 h-4" />
                  التفاصيل
                </TabsTrigger>
                <TabsTrigger
                  value="official"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <FileText className="w-4 h-4" />
                  العقد الرسمي
                </TabsTrigger>
                <TabsTrigger
                  value="invoices"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <FileText className="w-4 h-4" />
                  الفواتير
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  جدول الدفعات
                </TabsTrigger>
                <TabsTrigger
                  value="checkin"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2 relative"
                >
                  <LogIn className="w-4 h-4" />
                  استلام المركبة
                  {checkInInspection && (
                    <span className="absolute top-2 left-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="checkout"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2 relative"
                >
                  <LogOut className="w-4 h-4" />
                  تسليم المركبة
                  {checkOutInspection && (
                    <span className="absolute top-2 left-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="fines"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  الغرامات
                </TabsTrigger>
                <TabsTrigger
                  value="violations"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  المخالفات المرورية
                  {trafficViolations.length > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-1.5 mr-1">
                      {trafficViolations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Folder className="w-4 h-4" />
                  المستندات
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <GitBranch className="w-4 h-4" />
                  الجدول الزمني
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Activity className="w-4 h-4" />
                  سجل النشاط
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* تبويب التفاصيل */}
              <TabsContent value="details" className="mt-0">
                <ContractDetailsTab contract={contract} formatCurrency={formatCurrency} />
              </TabsContent>

              {/* تبويب العقد الرسمي */}
              <TabsContent value="official" className="mt-0">
                <OfficialContractView contract={contract} />
              </TabsContent>

              {/* تبويب الفواتير */}
              <TabsContent value="invoices" className="mt-0">
                <InvoicesTab
                  invoices={invoices}
                  contract={contract}
                  contractId={contract.id}
                  companyId={companyId}
                  onPay={handleInvoicePay}
                  onPreview={handleInvoicePreview}
                  onCreateInvoice={() => setIsInvoiceDialogOpen(true)}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              {/* تبويب جدول الدفعات */}
              <TabsContent value="payments" className="mt-0">
                <PaymentScheduleTab
                  contract={contract}
                  formatCurrency={formatCurrency}
                  payments={contractPayments}
                />
              </TabsContent>

              {/* تبويب استلام المركبة */}
              <TabsContent value="checkin" className="mt-0">
                <VehicleCheckInOut
                  contract={contract}
                  inspectionType="check_in"
                  existingInspection={checkInInspection}
                  onInspectionComplete={() => refetchInspections()}
                />
              </TabsContent>

              {/* تبويب تسليم المركبة */}
              <TabsContent value="checkout" className="mt-0">
                <VehicleCheckInOut
                  contract={contract}
                  inspectionType="check_out"
                  existingInspection={checkOutInspection}
                  onInspectionComplete={() => refetchInspections()}
                />
              </TabsContent>

              {/* تبويب الغرامات */}
              <TabsContent value="fines" className="mt-0">
                <LateFinesTab contract={contract} />
              </TabsContent>

              {/* تبويب المخالفات المرورية */}
              <TabsContent value="violations" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">المخالفات المرورية</h3>
                      <p className="text-sm text-gray-500">المخالفات المرورية المسجلة على هذا العقد</p>
                    </div>
                    <Badge variant={trafficViolations.length > 0 ? "destructive" : "secondary"}>
                      {trafficViolations.length} مخالفة
                    </Badge>
                  </div>

                  {loadingViolations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : trafficViolations.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">لا توجد مخالفات مرورية مسجلة على هذا العقد</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-right">رقم المخالفة</TableHead>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">نوع المخالفة</TableHead>
                            <TableHead className="text-right">الموقع</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trafficViolations.map((violation: any) => (
                            <TableRow key={violation.id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm">{violation.violation_number}</TableCell>
                              <TableCell>
                                {violation.violation_date && format(new Date(violation.violation_date), 'dd/MM/yyyy', { locale: ar })}
                                {violation.violation_time && (
                                  <span className="text-xs text-gray-500 mr-2">
                                    {violation.violation_time}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{violation.violation_type}</span>
                                  {violation.violation_description && (
                                    <p className="text-xs text-gray-500 mt-1">{violation.violation_description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{violation.location || '-'}</TableCell>
                              <TableCell className="font-semibold text-red-600">
                                {formatCurrency(violation.total_amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    violation.status === 'paid' ? 'default' :
                                    violation.status === 'pending' ? 'destructive' :
                                    'secondary'
                                  }
                                  className={
                                    violation.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    violation.status === 'pending' ? 'bg-red-100 text-red-700' :
                                    ''
                                  }
                                >
                                  {violation.status === 'paid' ? 'مدفوعة' :
                                   violation.status === 'pending' ? 'غير مدفوعة' :
                                   violation.status === 'contested' ? 'معترض عليها' :
                                   violation.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* ملخص المخالفات */}
                      <div className="bg-gray-50 p-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">إجمالي المخالفات غير المدفوعة:</span>
                          <span className="font-bold text-red-600">
                            {formatCurrency(
                              trafficViolations
                                .filter((v: any) => v.status === 'pending')
                                .reduce((sum: number, v: any) => sum + (v.total_amount || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* تبويب المستندات */}
              <TabsContent value="documents" className="mt-0">
                <ContractDocuments contractId={contract.id} />
              </TabsContent>

              {/* تبويب الجدول الزمني */}
              <TabsContent value="timeline" className="mt-0">
                <TimelineTab contract={contract} contractStats={contractStats} />
              </TabsContent>

              {/* تبويب سجل النشاط */}
              <TabsContent value="activity" className="mt-0">
                <ActivityLogTab contractId={contract.id} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </main>

      {/* Dialogs */}
      {contract && (
        <>
          <ContractInvoiceDialog
            open={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            contract={contract}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
              setIsInvoiceDialogOpen(false);
              toast({
                title: 'تم إنشاء الفاتورة بنجاح',
                description: 'تم إنشاء الفاتورة بنجاح',
              });
            }}
          />
          
          <ContractRenewalDialog
            open={isRenewalDialogOpen}
            onOpenChange={setIsRenewalDialogOpen}
            contract={contract}
          />
          
          <ContractAmendmentForm
            open={isAmendmentDialogOpen}
            onOpenChange={setIsAmendmentDialogOpen}
            contract={contract}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['contract-details'] });
              setIsAmendmentDialogOpen(false);
              toast({
                title: 'تم تعديل العقد بنجاح',
                description: 'تم تعديل العقد بنجاح',
              });
            }}
          />
          
          <ContractPrintDialog
            open={isPrintDialogOpen}
            onOpenChange={setIsPrintDialogOpen}
            contract={contract}
          />
        </>
      )}
      
      {selectedInvoice && (
        <>
          <PayInvoiceDialog
            open={isPayDialogOpen}
            onOpenChange={setIsPayDialogOpen}
            invoice={{
              ...selectedInvoice,
              contract_id: selectedInvoice.contract_id || contract?.id,
              company_id: selectedInvoice.company_id || contract?.company_id || companyId,
            }}
            onPaymentCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
              queryClient.invalidateQueries({ queryKey: ['contract-payments'] });
              queryClient.invalidateQueries({ queryKey: ['invoice-late-fees'] });
              setIsPayDialogOpen(false);
              toast({
                title: 'تم الدفع بنجاح',
                description: `تم دفع الفاتورة #${selectedInvoice.invoice_number}`,
              });
            }}
          />
          <InvoicePreviewDialog
            open={isPreviewDialogOpen}
            onOpenChange={setIsPreviewDialogOpen}
            invoice={selectedInvoice}
          />
        </>
      )}
      
      {/* Dialog إدارة حالة العقد */}
      <ContractStatusManagement
        open={isStatusManagementOpen}
        onOpenChange={setIsStatusManagementOpen}
        contract={contract || {}}
      />
    </div>
  );
};

// مكون تبويب التفاصيل
interface ContractDetailsTabProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
}

const ContractDetailsTab = ({ contract, formatCurrency }: ContractDetailsTabProps) => {
  const customerName = contract.customer
    ? contract.customer.customer_type === 'corporate'
      ? contract.customer.company_name_ar || contract.customer.company_name
      : `${contract.customer.first_name_ar || contract.customer.first_name} ${contract.customer.last_name_ar || contract.customer.last_name}`
    : 'غير محدد';

  const vehicleInfo = contract.vehicle
    ? `${contract.vehicle.make} ${contract.vehicle.model}`
    : 'غير محدد';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* معلومات العقد */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            معلومات العقد الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="رقم العقد" value={contract.contract_number} mono />
          <InfoRow label="نوع العقد" value={contract.contract_type === 'rental' ? 'إيجار' : contract.contract_type} />
          <InfoRow
            label="تاريخ الإنشاء"
            value={contract.contract_date ? format(new Date(contract.contract_date), 'dd/MM/yyyy') : '-'}
          />
          <InfoRow
            label="الحالة"
            value={
              <Badge className={contract.status === 'active' ? 'status-active' : 'bg-gray-100'}>
                {contract.status === 'active' ? 'نشط' : contract.status}
              </Badge>
            }
          />
          <InfoRow
            label="مدة العقد"
            value={
              contract.start_date && contract.end_date
                ? `${differenceInDays(new Date(contract.end_date), new Date(contract.start_date))} يوم`
                : '-'
            }
          />
        </CardContent>
      </Card>

      {/* معلومات العميل */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            معلومات العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="الاسم" value={customerName} />
          <InfoRow label="رقم الجوال" value={contract.customer?.phone || '-'} mono dir="ltr" />
          <InfoRow label="البريد الإلكتروني" value={contract.customer?.email || '-'} />
          <InfoRow label="رقم الهوية" value={contract.customer?.national_id || '-'} mono />
        </CardContent>
      </Card>

      {/* معلومات السيارة */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-orange-600" />
            معلومات السيارة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="النوع" value={vehicleInfo} />
          <InfoRow label="الموديل" value={contract.vehicle?.year?.toString() || '-'} />
          <InfoRow label="رقم اللوحة" value={contract.vehicle?.plate_number || '-'} mono />
          <InfoRow label="اللون" value={contract.vehicle?.color || '-'} />
          <InfoRow
            label="الحالة"
            value={
              <Badge className={contract.vehicle?.status === 'available' ? 'status-active' : 'bg-gray-100'}>
                {contract.vehicle?.status || '-'}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* المعلومات المالية */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            المعلومات المالية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="القيمة الإجمالية" value={formatCurrency(contract.contract_amount || 0)} />
          <InfoRow label="المبلغ الشهري" value={formatCurrency(contract.monthly_amount || 0)} />
          <InfoRow label="المدفوع" value={formatCurrency(contract.total_paid || 0)} />
          <InfoRow label="المتبقي" value={formatCurrency((contract.contract_amount || 0) - (contract.total_paid || 0))} />
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="text-gray-900 font-semibold">الحساب المحاسبي</span>
            <span className="font-semibold text-red-600">
              {contract.account_id ? 'مربوط' : '-'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// مكون صف المعلومات
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  dir?: 'ltr' | 'rtl';
}

const InfoRow = ({ label, value, mono, dir }: InfoRowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600">{label}</span>
    <span className={cn('font-semibold', mono && 'font-mono')} dir={dir}>
      {value}
    </span>
  </div>
);

// مكون تبويب الفواتير
interface InvoicesTabProps {
  invoices: Invoice[];
  contract: Contract;
  contractId: string;
  companyId?: string;
  onPay: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
  formatCurrency: (amount: number) => string;
}

const InvoicesTab = ({ invoices, contract, contractId, companyId, onPay, onPreview, onCreateInvoice, formatCurrency }: InvoicesTabProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // حساب عدد الفواتير المتوقعة
  const expectedInvoicesCount = useMemo(() => {
    if (!contract.start_date || !contract.monthly_amount) return 0;
    
    const totalAmount = contract.contract_amount || 0;
    const monthlyAmount = contract.monthly_amount;
    
    if (totalAmount > 0) {
      return Math.ceil(totalAmount / monthlyAmount);
    }
    
    // إذا لم يكن contract_amount موجود، احسب من التواريخ
    if (contract.end_date) {
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      return months;
    }
    
    return 12; // افتراضياً سنة واحدة
  }, [contract]);

  // التحقق من وجود فواتير ناقصة
  const missingInvoicesCount = expectedInvoicesCount - invoices.length;
  const hasMissingInvoices = missingInvoicesCount > 0;
  
  const handleInvoiceDownload = useCallback(async (invoice: Invoice) => {
    try {
      // فتح معاينة الفاتورة أولاً
      onPreview(invoice);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  }, [onPreview]);

  const handleInvoicePrint = useCallback((invoice: Invoice) => {
    // فتح معاينة الفاتورة ثم الطباعة
    onPreview(invoice);
  }, [onPreview]);

  // دالة لإنشاء فواتير من جدول الدفعات
  const handleGenerateInvoicesFromSchedule = useCallback(async () => {
    console.log('🔵 [INVOICE_GEN] Starting invoice generation', { contractId, companyId });
    
    if (!contractId || !companyId) {
      console.error('❌ [INVOICE_GEN] Missing required data', { contractId, companyId });
      toast({
        title: "خطأ",
        description: "معلومات العقد غير متوفرة",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('📞 [INVOICE_GEN] Calling RPC function', { p_contract_id: contractId });
      
      let createdCount = 0;
      
      // محاولة استخدام RPC function أولاً
      try {
        const { data, error } = await supabase.rpc('generate_invoices_from_payment_schedule', {
          p_contract_id: contractId
        });

        console.log('📥 [INVOICE_GEN] RPC response', { data, error });

        if (error) {
          console.warn('⚠️ [INVOICE_GEN] RPC error, trying direct method', error);
          
          // استخدام الطريقة البديلة - إنشاء الفواتير مباشرة
          if (!contract) {
            throw new Error('بيانات العقد غير متوفرة');
          }

          const monthlyAmount = contract.monthly_amount || 0;
          const totalAmount = contract.contract_amount || 0;
          
          if (!monthlyAmount || monthlyAmount <= 0) {
            throw new Error('المبلغ الشهري غير محدد في العقد');
          }

          // حساب عدد الفواتير المطلوبة
          const numberOfInvoices = totalAmount > 0 
            ? Math.ceil(totalAmount / monthlyAmount)
            : expectedInvoicesCount;

          const startDate = new Date(contract.start_date);

          for (let i = 0; i < numberOfInvoices; i++) {
            // حساب تاريخ الاستحقاق
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + i + 1);
            dueDate.setDate(1); // أول يوم من الشهر

            const invoiceNumber = `INV-${contract.contract_number}-${String(i + 1).padStart(3, '0')}`;

            // التحقق من عدم وجود الفاتورة
            const { data: existing } = await supabase
              .from('invoices')
              .select('id')
              .eq('invoice_number', invoiceNumber)
              .eq('company_id', companyId)
              .maybeSingle();

            if (!existing) {
              const invoiceDate = new Date(dueDate);
              invoiceDate.setDate(invoiceDate.getDate() - 5);

              const { error: insertError } = await supabase.from('invoices').insert({
                company_id: companyId,
                customer_id: contract.customer_id,
                contract_id: contractId,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                total_amount: monthlyAmount,
                payment_status: 'unpaid',
                invoice_type: 'rental',
                description: `فاتورة إيجار شهرية - الشهر ${i + 1} من ${numberOfInvoices}`,
              });

              if (insertError) {
                console.error('Error creating invoice:', invoiceNumber, insertError);
              } else {
                createdCount++;
                console.log('✅ Created invoice:', invoiceNumber);
              }
            }
          }
        } else {
          createdCount = data || 0;
        }
      } catch (rpcError) {
        console.error('❌ [INVOICE_GEN] Complete RPC failure', rpcError);
        throw rpcError;
      }

      console.log('✅ [INVOICE_GEN] Created invoices count:', createdCount);
      
      toast({
        title: "تم بنجاح ✓",
        description: createdCount > 0 
          ? `تم إنشاء ${createdCount} فاتورة جديدة من جدول الدفعات` 
          : 'جميع الفواتير موجودة مسبقاً',
        variant: createdCount > 0 ? "default" : "default"
      });

      // إعادة تحميل الفواتير بشكل فوري
      console.log('🔄 [INVOICE_GEN] Invalidating and refetching queries');
      await queryClient.invalidateQueries({ queryKey: ['contract-invoices', contractId] });
      await queryClient.refetchQueries({ queryKey: ['contract-invoices', contractId] });
      
      // إعادة تحميل بيانات العقد أيضاً
      await queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      
      console.log('✅ [INVOICE_GEN] Queries invalidated and refetched');
    } catch (error: any) {
      console.error('❌ [INVOICE_GEN] Error generating invoices:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء الفواتير. " + (error.message || ''),
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      console.log('🏁 [INVOICE_GEN] Generation process completed');
    }
  }, [contractId, companyId, queryClient, toast, contract, expectedInvoicesCount]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">فواتير العقد</h3>
            <p className="text-sm text-gray-500 mt-1">
              {invoices.length} من {expectedInvoicesCount} فاتورة متوقعة
              {hasMissingInvoices && (
                <span className="text-orange-600 font-semibold mr-2">
                  ({missingInvoicesCount} فاتورة ناقصة)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {hasMissingInvoices && (
              <Button 
                onClick={handleGenerateInvoicesFromSchedule} 
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {invoices.length === 0 ? 'إنشاء فواتير تلقائية' : `إكمال الفواتير الناقصة (${missingInvoicesCount})`}
                  </>
                )}
              </Button>
            )}
            <Button onClick={onCreateInvoice} className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4" />
              إنشاء فاتورة
            </Button>
          </div>
        </div>
        
        {/* تنبيه للفواتير الناقصة */}
        {hasMissingInvoices && invoices.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              تنقص هذا العقد <strong>{missingInvoicesCount} فاتورة</strong> من أصل {expectedInvoicesCount} فاتورة متوقعة حسب جدول الدفعات. 
              يمكنك إنشاء الفواتير الناقصة تلقائياً بالضغط على الزر أعلاه.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {invoices.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 font-semibold mb-2">لا توجد فواتير لهذا العقد</p>
            <p className="text-sm text-gray-500 mb-6">
              يمكنك إنشاء الفواتير تلقائياً بناءً على جدول الدفعات المحسوب من بيانات العقد
            </p>
            <Button 
              onClick={handleGenerateInvoicesFromSchedule} 
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري إنشاء الفواتير...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  إنشاء فواتير تلقائية
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const canPay =
              invoice.payment_status === 'unpaid' || invoice.payment_status === 'partially_paid';

            return (
              <Card key={invoice.id} className="transition-all hover:border-red-300 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-lg flex items-center justify-center',
                          invoice.payment_status === 'paid' ? 'bg-green-50' : 'bg-red-50'
                        )}
                      >
                        <FileText
                          className={cn(
                            'w-6 h-6',
                            invoice.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'
                          )}
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold">فاتورة #{invoice.invoice_number}</h4>
                        <p className="text-sm text-gray-600">
                          تاريخ الاستحقاق:{' '}
                          {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                        </p>
                      </div>
                    </div>
                    <Badge className={getPaymentStatusColor(invoice.payment_status || 'unpaid')}>
                      {getPaymentStatusText(invoice.payment_status || 'unpaid')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">المبلغ</div>
                      <div className="font-semibold">{formatCurrency(invoice.total_amount || 0)}</div>
                    </div>
                    {invoice.payment_date && (
                      <div>
                        <div className="text-xs text-gray-500">تاريخ الدفع</div>
                        <div className="font-semibold">
                          {format(new Date(invoice.payment_date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {canPay && (
                      <Button
                        size="sm"
                        onClick={() => onPay(invoice)}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        دفع الآن
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreview(invoice)}
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      عرض
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => handleInvoiceDownload(invoice)}
                    >
                      <Download className="w-4 h-4" />
                      تحميل
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => handleInvoicePrint(invoice)}
                    >
                      <Printer className="w-4 h-4" />
                      طباعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    paid: 'payment-paid',
    unpaid: 'payment-unpaid',
    partially_paid: 'payment-partial',
    overdue: 'payment-overdue',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getPaymentStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    paid: 'مدفوعة',
    unpaid: 'غير مدفوعة',
    partially_paid: 'مدفوعة جزئياً',
    overdue: 'متأخرة',
  };
  return texts[status] || status;
};

// مكون تبويب جدول الدفعات
interface PaymentScheduleTabProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
  payments?: any[];
}

const PaymentScheduleTab = ({ contract, formatCurrency, payments = [] }: PaymentScheduleTabProps) => {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false);

  // Handle payment view
  const handlePaymentView = useCallback((payment: any) => {
    setSelectedPayment(payment);
    setIsPaymentPreviewOpen(true);
  }, []);

  // Handle payment print
  const handlePaymentPrint = useCallback((payment: any) => {
    try {
      const { printDocument, convertReceiptToPrintable } = require('@/utils/printHelper');
      
      // Convert payment to receipt format
      const receiptData = {
        id: payment.id,
        customer_name: contract.customer_name || 'عميل',
        customer_phone: contract.customer_phone,
        vehicle_number: contract.vehicle_number,
        month: format(new Date(payment.payment_date), 'MMMM yyyy', { locale: ar }),
        payment_date: payment.payment_date,
        rent_amount: payment.amount,
        fine: 0,
        total_paid: payment.amount,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number,
        notes: payment.notes
      };
      
      const printableData = convertReceiptToPrintable(receiptData);
      printDocument(printableData);
      
      toast({
        title: 'تم فتح نافذة الطباعة',
        description: `إيصال الدفع #${payment.payment_number}`,
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'خطأ في الطباعة',
        description: 'حدث خطأ أثناء طباعة الإيصال',
        variant: 'destructive'
      });
    }
  }, [contract, toast]);
  
  // حساب جدول الدفعات المستحق
  const paymentSchedule = useMemo(() => {
    if (!contract.start_date || !contract.monthly_amount) return [];

    const monthlyAmount = contract.monthly_amount;
    const totalAmount = contract.contract_amount || 0;
    const numberOfPayments = Math.ceil(totalAmount / monthlyAmount);
    const schedule = [];

    // بدء من اليوم الأول من الشهر التالي لتاريخ بداية العقد
    const startDate = new Date(contract.start_date);
    const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = new Date(firstMonth);
      dueDate.setMonth(firstMonth.getMonth() + i);

      schedule.push({
        number: i + 1,
        dueDate,
        amount: monthlyAmount,
        status: i < Math.floor((contract.total_paid || 0) / monthlyAmount) ? 'paid' : i === Math.floor((contract.total_paid || 0) / monthlyAmount) ? 'pending' : 'upcoming',
      });
    }

    return schedule;
  }, [contract]);

  const totalPaid = contract.total_paid || 0;
  const totalAmount = contract.contract_amount || 0;
  const balanceDue = totalAmount - totalPaid;

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان',
      debit_card: 'بطاقة مدين',
      online: 'دفع إلكتروني'
    };
    return labels[method] || method;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'مكتمل',
      pending: 'معلق',
      cancelled: 'ملغي',
      failed: 'فاشل'
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      {/* جدول الدفعات المستحقة */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">جدول الدفعات المستحقة</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">#</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الاستحقاق</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المبلغ</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paymentSchedule.map((payment) => (
              <tr
                key={payment.number}
                className={cn(
                  'hover:bg-gray-50',
                  payment.status === 'pending' && 'bg-yellow-50'
                )}
              >
                <td className="px-4 py-4 font-mono text-sm">{payment.number}</td>
                <td className="px-4 py-4 text-sm">
                  {format(payment.dueDate, 'yyyy-MM-dd')}
                </td>
                <td className="px-4 py-4 text-sm font-semibold">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      payment.status === 'paid' && 'payment-paid',
                      payment.status === 'pending' && 'payment-partial',
                      payment.status === 'upcoming' && 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'قادم'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  {payment.status === 'paid' ? (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-red-600"
                      onClick={() => {
                        // عرض تفاصيل الدفعة المدفوعة
                        toast({
                          title: 'الدفعة المدفوعة',
                          description: `تم دفع مبلغ ${formatCurrency(payment.amount)} في ${format(payment.dueDate, 'dd/MM/yyyy')}`,
                        });
                      }}
                    >
                      عرض
                    </Button>
                  ) : payment.status === 'pending' ? (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-green-600 font-medium"
                      onClick={() => {
                        // فتح نافذة الدفع
                        toast({
                          title: 'دفع مستحق',
                          description: `المبلغ المستحق: ${formatCurrency(payment.amount)}`,
                        });
                        // يمكن هنا فتح نافذة الدفع
                      }}
                    >
                      دفع
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-sm">---</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* الملخص المالي */}
      <Card className="mt-6 bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">إجمالي المبلغ</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">المدفوع</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">المتبقي</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(balanceDue)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* جدول المدفوعات الفعلية */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">المدفوعات الفعلية</h3>
        {payments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد مدفوعات مسجلة لهذا العقد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الدفع</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">الملاحظات</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(payment.payment_status)}>
                        {getPaymentStatusLabel(payment.payment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.reference_number || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {payment.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePaymentView(payment)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePaymentPrint(payment)}
                          className="flex items-center gap-1"
                        >
                          <Printer className="h-4 w-4" />
                          طباعة
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ملخص المدفوعات الفعلية */}
        {payments.length > 0 && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">عدد المدفوعات</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {payments.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">إجمالي المدفوعات</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Preview Dialog */}
      {selectedPayment && (
        <Dialog open={isPaymentPreviewOpen} onOpenChange={setIsPaymentPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                تفاصيل الدفعة #{selectedPayment.payment_number}
              </DialogTitle>
              <DialogDescription>
                معاينة تفاصيل الدفعة قبل الطباعة
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {(() => {
                const { UnifiedPrintableDocument } = require('@/components/finance');
                const { convertReceiptToPrintable } = require('@/utils/printHelper');
                
                const receiptData = {
                  id: selectedPayment.id,
                  customer_name: contract.customer_name || 'عميل',
                  customer_phone: contract.customer_phone,
                  vehicle_number: contract.vehicle_number,
                  month: format(new Date(selectedPayment.payment_date), 'MMMM yyyy', { locale: ar }),
                  payment_date: selectedPayment.payment_date,
                  rent_amount: selectedPayment.amount,
                  fine: 0,
                  total_paid: selectedPayment.amount,
                  payment_method: selectedPayment.payment_method,
                  reference_number: selectedPayment.reference_number,
                  notes: selectedPayment.notes
                };
                
                const printableData = convertReceiptToPrintable(receiptData);
                
                return <UnifiedPrintableDocument data={printableData} />;
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// مكون تبويب الجدول الزمني
interface TimelineTabProps {
  contract: Contract;
  contractStats: any;
}

const TimelineTab = ({ contract, contractStats }: TimelineTabProps) => {
  const paidPayments = contractStats?.paidPayments || 0;

  if (!contractStats) {
    return (
      <div className="text-center py-8 text-gray-500">
        جاري تحميل بيانات الجدول الزمني...
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">المخطط الزمني للعقد</h3>

      <div className="relative">
        <div className="flex items-center justify-between">
          {/* نقطة التوقيع */}
          <TimelineNode
            icon={<Check className="w-6 h-6 text-green-600" />}
            label="التوقيع"
            date={contract.contract_date}
            isCompleted
          />

          <TimelineConnector isCompleted />

          {/* الدفعات */}
          {[1, 2, 3].map((num) => (
            <Fragment key={num}>
              <TimelineNode
                icon={num <= paidPayments ? <Check className="w-6 h-6 text-green-600" /> : num === paidPayments + 1 ? <Clock className="w-6 h-6 text-blue-600" /> : <Circle className="w-6 h-6 text-gray-400" />}
                label={`الدفعة ${num}`}
                date={num <= paidPayments ? `مدفوع` : num === paidPayments + 1 ? 'قريباً' : ''}
                isCompleted={num <= paidPayments}
                isCurrent={num === paidPayments + 1}
              />
              <TimelineConnector isCompleted={num < paidPayments} />
            </Fragment>
          ))}

          {/* نقطة الانتهاء */}
          <TimelineNode
            icon={<Circle className="w-6 h-6 text-gray-400" />}
            label="الانتهاء"
            date={contract.end_date}
            isCompleted={false}
          />
        </div>
      </div>
    </div>
  );
};

// مكون عقدة Timeline
interface TimelineNodeProps {
  icon: React.ReactNode;
  label: string;
  date?: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
}

const TimelineNode = ({ icon, label, date, isCompleted, isCurrent }: TimelineNodeProps) => (
  <div className="flex-1 text-center group cursor-pointer transition-all hover:scale-105">
    <div
      className={cn(
        'w-12 h-12 rounded-full border-4 flex items-center justify-center mx-auto mb-2',
        isCompleted && 'bg-green-100 border-green-500',
        isCurrent && 'bg-blue-100 border-blue-500 animate-pulse',
        !isCompleted && !isCurrent && 'bg-gray-100 border-gray-300'
      )}
    >
      {icon}
    </div>
    <p className="font-semibold text-sm">{label}</p>
    <p className="text-xs text-gray-500">
      {date && (typeof date === 'string' && date.includes('-') 
        ? format(new Date(date), 'yyyy-MM-dd')
        : date)}
    </p>
  </div>
);

// مكون واصل Timeline
interface TimelineConnectorProps {
  isCompleted?: boolean;
}

const TimelineConnector = ({ isCompleted }: TimelineConnectorProps) => (
  <div
    className={cn(
      'flex-1 h-1',
      isCompleted ? 'bg-green-500' : 'bg-gray-200'
    )}
  />
);

// مكون تبويب سجل النشاط
interface ActivityLogTabProps {
  contractId: string;
}

const ActivityLogTab = ({ contractId }: ActivityLogTabProps) => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['contract-activities', contractId],
    queryFn: async () => {
      // جلب سجل التعديلات والأحداث
      const { data, error } = await supabase
        .from('contract_audit_log')
        .select(`
          *,
          profile:profiles!user_id(full_name)
        `)
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activities:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!contractId,
  });

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          لا توجد أنشطة مسجلة لهذا العقد
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">سجل النشاط والتعديلات</h3>

      <div className="space-y-4">
        {activities.map((activity) => (
          <Card key={activity.id} className="bg-gray-50">
            <CardContent className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FilePlus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">
                  {activity.action || 'نشاط'}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {activity.description || 'تم إجراء تعديل'}
                </p>
                <p className="text-xs text-gray-500">
                  {activity.created_at && format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm', { locale: ar })}
                  {activity.profile?.full_name && ` • بواسطة: ${activity.profile.full_name}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ContractDetailsPage;


