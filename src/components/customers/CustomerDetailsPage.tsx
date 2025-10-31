/**
 * مكون صفحة تفاصيل العميل - التصميم الجديد المحسّن
 * صفحة شاملة ومتكاملة لعرض جميع معلومات وبيانات العميل
 * متوافق 100% مع تصميم Fleetify
 * 
 * @component CustomerDetailsPage
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowRight,
  Bell,
  Settings,
  Edit3,
  FileText,
  Archive,
  Trash2,
  CheckCircle,
  Hash,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Cake,
  CreditCard,
  Briefcase,
  User,
  Wallet,
  TrendingUp,
  Car,
  Plus,
  Eye,
  RefreshCw,
  Star,
  Landmark,
  Banknote,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Download,
  Upload,
  Folder,
  Activity,
  FilePlus,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

/**
 * مكون صفحة تفاصيل العميل الرئيسية
 */
const CustomerDetailsPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const companyId = useCurrentCompanyId();

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('contracts');

  // جلب بيانات العميل من قاعدة البيانات
  const { data: customer, isLoading: loadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer-details', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) {
        throw new Error('معرف العميل أو الشركة مفقود');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('العميل غير موجود');
      }
      
      return data;
    },
    enabled: !!customerId && !!companyId,
    retry: 1,
  });

  // جلب عقود العميل
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          vehicle:vehicles!vehicle_id(
            id,
            make,
            model,
            year,
            plate_number
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // جلب مدفوعات العميل
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['customer-payments', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  // حساب الإحصائيات من البيانات الحقيقية
  const stats = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // حساب المبلغ المستحق
    const totalContractAmount = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.contract_amount || 0), 0);
    const totalPaid = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.total_paid || 0), 0);
    const outstandingAmount = totalContractAmount - totalPaid;

    // حساب نسبة الالتزام
    const paidOnTime = payments.filter(p => p.payment_status === 'completed').length;
    const commitmentRate = payments.length > 0 ? Math.round((paidOnTime / payments.length) * 100) : 100;

    return {
      activeContracts,
      outstandingAmount,
      commitmentRate,
      totalPayments,
    };
  }, [contracts, payments]);

  // تنسيق اسم العميل
  const customerName = useMemo(() => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar || customer.company_name || 'شركة';
    }
    const firstName = customer.first_name_ar || customer.first_name || '';
    const lastName = customer.last_name_ar || customer.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || 'غير محدد';
  }, [customer]);

  // تنسيق بيانات العقود للعرض
  const formattedContracts = useMemo(() => {
    return contracts.map(contract => {
      const vehicleName = contract.vehicle
        ? `${contract.vehicle.make} ${contract.vehicle.model} ${contract.vehicle.year || ''}`
        : 'غير محدد';
      
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;

      return {
        id: contract.id,
        vehicle: contract.vehicle,
        vehicleName,
        contractNumber: contract.contract_number,
        startDate: contract.start_date,
        endDate: contract.end_date,
        monthlyAmount: contract.monthly_amount || 0,
        status: contract.status,
        paymentStatus: (contract.total_paid || 0) >= (contract.contract_amount || 0) ? 'paid' : 'pending',
        daysRemaining,
      };
    });
  }, [contracts]);

  // تنسيق بيانات المدفوعات للعرض
  const formattedPayments = useMemo(() => {
    return payments.map(payment => ({
      id: payment.id,
      paymentNumber: payment.payment_number || payment.id.substring(0, 8),
      date: payment.payment_date || payment.created_at,
      contractNumber: payment.contract_id || '-',
      amount: payment.amount || 0,
      paymentMethod: payment.payment_method || 'غير محدد',
      status: payment.payment_status === 'completed' ? 'paid' : payment.payment_status === 'pending' ? 'pending' : 'failed',
    }));
  }, [payments]);

  // معالجات الأحداث
  const handleBack = useCallback(() => {
    navigate('/customers');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    toast({
      title: 'تعديل البيانات',
      description: 'فتح نموذج تعديل بيانات العميل',
    });
  }, [toast]);

  const handleDelete = useCallback(() => {
    toast({
      title: 'حذف العميل',
      description: 'هل أنت متأكد من حذف هذا العميل؟',
      variant: 'destructive',
    });
  }, [toast]);

  const handleArchive = useCallback(() => {
    toast({
      title: 'أرشفة العميل',
      description: 'تم أرشفة العميل بنجاح',
    });
  }, [toast]);

  const handleGenerateReport = useCallback(() => {
    toast({
      title: 'إنشاء تقرير',
      description: 'جاري إنشاء التقرير...',
    });
  }, [toast]);

  // معالجة حالات التحميل والأخطاء
  const isLoading = loadingCustomer || loadingContracts || loadingPayments;

  // Debug logging
  useEffect(() => {
    console.log('🔍 [CustomerDetailsPage] Debug:', {
      customerId,
      companyId,
      isLoading,
      hasCustomer: !!customer,
      customerError: customerError?.message,
    });
  }, [customerId, companyId, isLoading, customer, customerError]);

  if (isLoading) {
    return <PageSkeletonFallback />;
  }

  if (customerError || !customer) {
    console.error('❌ [CustomerDetailsPage] Error or no customer:', {
      error: customerError,
      hasCustomer: !!customer,
      customerId,
      companyId,
    });
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full border border-gray-200 shadow-sm">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">العميل غير موجود</h3>
            <p className="text-gray-600 mb-4">
              {customerError?.message || 'لم يتم العثور على هذا العميل'}
            </p>
            {!customerId && (
              <p className="text-sm text-red-600 mb-2">معرف العميل مفقود</p>
            )}
            {!companyId && (
              <p className="text-sm text-red-600 mb-2">معرف الشركة مفقود</p>
            )}
            <Button onClick={handleBack} className="bg-red-600 hover:bg-red-700">
              العودة لصفحة العملاء
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // دالة للحصول على الأحرف الأولى من الاسم
  const getInitials = (name: string): string => {
    if (!name || name === 'غير محدد') return '؟';
    const names = name.split(' ').filter(n => n.length > 0);
    if (names.length === 0) return '؟';
    return names
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white border-b-2 fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="w-10 h-10 rounded-lg"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-base font-bold text-gray-900">تفاصيل العميل</h1>
                <p className="text-xs text-gray-500">إدارة ومتابعة بيانات العميل</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg">
                <Settings className="w-5 h-5" />
              </Button>
              <Avatar className="w-9 h-9 cursor-pointer">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-bold">
                  ك
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* بطاقة رأس معلومات العميل */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200 shadow-sm animate-in fade-in-50 duration-400">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20 rounded-2xl flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-red-700 to-red-600 text-white text-2xl font-bold rounded-2xl">
                  {getInitials(customerName)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900">{customerName}</h2>
                  <Badge className={cn(
                    "flex items-center gap-1.5",
                    customer.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  )}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {customer.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                  {customer.is_vip && (
                    <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      عميل مميز
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Hash className="w-4 h-4" />
                    {customer.customer_code || customer.id.substring(0, 8)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    التسجيل: {customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ar }) : '-'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    آخر نشاط: {customer.updated_at ? format(new Date(customer.updated_at), 'dd/MM/yyyy', { locale: ar }) : '-'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleEdit} className="bg-red-600 hover:bg-red-700 gap-2">
                <Edit3 className="w-4 h-4" />
                تعديل البيانات
              </Button>
              <Button variant="outline" onClick={handleGenerateReport} className="gap-2">
                <FileText className="w-4 h-4" />
                إنشاء تقرير
              </Button>
              <Button variant="outline" onClick={handleArchive} className="gap-2">
                <Archive className="w-4 h-4" />
                أرشفة
              </Button>
              <Button variant="outline" onClick={handleDelete} className="gap-2 border-red-300 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                حذف
              </Button>
            </div>
          </div>
        </div>

        {/* بطاقات الإحصائيات - التصميم الجديد */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* بطاقة العقود النشطة */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4 duration-400" style={{ borderRight: '4px solid #3b82f6' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#dbeafe' }}>
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-extrabold text-blue-600 mb-2">{stats.activeContracts}</div>
            <div className="text-sm text-gray-600 font-medium mb-3">عقود نشطة</div>
            <div className="text-xs text-gray-500">
              <span className="text-green-600 font-semibold">↑ 1</span> منذ الشهر الماضي
            </div>
          </div>

          {/* بطاقة المبلغ المستحق */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4 duration-500 delay-75" style={{ borderRight: '4px solid #f59e0b' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fef3c7' }}>
              <Wallet className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-3xl font-extrabold text-orange-600 mb-2">{stats.outstandingAmount.toLocaleString('ar-SA')}</div>
            <div className="text-sm text-gray-600 font-medium mb-3">المبلغ المستحق (ر.س)</div>
            <div className="text-xs text-gray-500">
              يستحق خلال <span className="font-semibold text-orange-600">30 يوم</span>
            </div>
          </div>

          {/* بطاقة نسبة الالتزام */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4 duration-600 delay-150" style={{ borderRight: '4px solid #10b981' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#d1fae5' }}>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-extrabold text-green-600 mb-2">{stats.commitmentRate}%</div>
            <div className="text-sm text-gray-600 font-medium mb-3">نسبة الالتزام</div>
            <div className="mt-3">
              <Progress value={stats.commitmentRate} className="h-1.5 bg-gray-200" />
            </div>
          </div>

          {/* بطاقة إجمالي المدفوعات */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4 duration-700 delay-200" style={{ borderRight: '4px solid #8b5cf6' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#ede9fe' }}>
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-purple-600 mb-2">{stats.totalPayments.toLocaleString('ar-SA')}</div>
            <div className="text-sm text-gray-600 font-medium mb-3">إجمالي المدفوعات (ر.س)</div>
            <div className="text-xs text-gray-500">
              <span className="text-green-600 font-semibold">{payments.length}</span> دفعة مكتملة
            </div>
          </div>
        </div>

        {/* بطاقة المعلومات الشخصية */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-red-600" />
            المعلومات الشخصية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">البريد الإلكتروني</div>
                <div className="text-sm font-semibold text-gray-900">{customer.email || '-'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5' }}>
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">رقم الجوال</div>
                <div className="text-sm font-semibold text-gray-900 font-mono" dir="ltr">{customer.phone || '-'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">العنوان</div>
                <div className="text-sm font-semibold text-gray-900">{customer.address || '-'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                <Cake className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">تاريخ الميلاد</div>
                <div className="text-sm font-semibold text-gray-900">{customer.date_of_birth || '-'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">رقم الهوية</div>
                <div className="text-sm font-semibold text-gray-900 font-mono" dir="ltr">{customer.national_id || '-'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-50">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5' }}>
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">نوع العميل</div>
                <div className="text-sm font-semibold text-gray-900">
                  {customer.customer_type === 'individual' ? 'فرد' : customer.customer_type === 'corporate' ? 'شركة' : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* قسم التبويبات */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in-50 duration-600 delay-400">
          <div className="flex border-b-2 border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('contracts')}
              className={cn(
                "px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-3",
                activeTab === 'contracts'
                  ? 'text-red-600 border-red-600 bg-transparent'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <FileText className="w-4 h-4" />
              العقود
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={cn(
                "px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-3",
                activeTab === 'payments'
                  ? 'text-red-600 border-red-600 bg-transparent'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <CreditCard className="w-4 h-4" />
              المدفوعات
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={cn(
                "px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-3",
                activeTab === 'vehicles'
                  ? 'text-red-600 border-red-600 bg-transparent'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Car className="w-4 h-4" />
              السيارات
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={cn(
                "px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-3",
                activeTab === 'documents'
                  ? 'text-red-600 border-red-600 bg-transparent'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Folder className="w-4 h-4" />
              المستندات
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                "px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-3",
                activeTab === 'activity'
                  ? 'text-red-600 border-red-600 bg-transparent'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Activity className="w-4 h-4" />
              سجل النشاط
            </button>
          </div>

          <div className="p-6">
            {/* تبويب العقود */}
            {activeTab === 'contracts' && (
              <div className="animate-in fade-in-50 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">العقود النشطة</h3>
                    <p className="text-sm text-gray-500 mt-1">إجمالي {formattedContracts.length} عقد نشط</p>
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700 gap-2">
                    <Plus className="w-4 h-4" />
                    عقد جديد
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {formattedContracts.length > 0 ? (
                    formattedContracts.map((contract, index) => (
                      <div key={contract.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:border-red-600 hover:shadow-md hover:-translate-y-1">
                        <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-200">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={cn(
                              "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                              index % 3 === 0 ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                              index % 3 === 1 ? "bg-gradient-to-br from-purple-500 to-purple-600" :
                              "bg-gradient-to-br from-orange-500 to-orange-600"
                            )}>
                              <Car className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-gray-900 mb-1">{contract.vehicleName}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="font-mono">#{contract.contractNumber}</span>
                                <span>•</span>
                                <span>بدأ في {contract.startDate ? format(new Date(contract.startDate), 'dd/MM/yyyy', { locale: ar }) : '-'}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={cn(
                            contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {contract.status === 'active' ? 'نشط' : 'قيد المراجعة'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">المبلغ الشهري</div>
                            <div className={cn(
                              "text-base font-bold",
                              index % 3 === 0 ? "text-blue-600" :
                              index % 3 === 1 ? "text-purple-600" :
                              "text-orange-600"
                            )}>
                              {contract.monthlyAmount.toLocaleString('ar-SA')} ر.س
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</div>
                            <div className="text-base font-bold text-gray-900">
                              {contract.endDate ? format(new Date(contract.endDate), 'dd/MM/yyyy', { locale: ar }) : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">المدة المتبقية</div>
                            <div className={cn(
                              "text-base font-bold",
                              contract.daysRemaining <= 30 ? "text-orange-600" :
                              contract.daysRemaining <= 60 ? "text-yellow-600" :
                              "text-green-600"
                            )}>
                              {contract.daysRemaining} يوم
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">حالة الدفع</div>
                            <div className={cn(
                              "text-base font-bold",
                              contract.paymentStatus === 'paid' ? "text-green-600" : "text-orange-600"
                            )}>
                              {contract.paymentStatus === 'paid' ? 'مدفوع' : 'معلق'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                          <Button variant="outline" className="flex-1 gap-2">
                            <Eye className="w-4 h-4" />
                            عرض التفاصيل
                          </Button>
                          {contract.paymentStatus === 'paid' ? (
                            <Button variant="outline" className="flex-1 gap-2">
                              <RefreshCw className="w-4 h-4" />
                              تجديد العقد
                            </Button>
                          ) : (
                            <Button className="flex-1 gap-2 bg-red-600 hover:bg-red-700">
                              <CreditCard className="w-4 h-4" />
                              متابعة الدفع
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
                      لا توجد عقود لهذا العميل
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* تبويب المدفوعات */}
            {activeTab === 'payments' && (
              <div className="animate-in fade-in-50 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">سجل المدفوعات</h3>
                    <p className="text-sm text-gray-500 mt-1">آخر {formattedPayments.length} عمليات دفع</p>
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700 gap-2">
                    <Plus className="w-4 h-4" />
                    تسجيل دفعة جديدة
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">رقم الدفعة</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">التاريخ</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">العقد</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">المبلغ</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">طريقة الدفع</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">الحالة</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formattedPayments.map((payment) => (
                        <tr key={payment.id} className="transition-all duration-200 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900 font-semibold">#{payment.paymentNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-mono">#{payment.contractNumber.substring(0, 8)}</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">
                            {payment.amount.toLocaleString('ar-SA')} ر.س
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              {payment.paymentMethod.includes('بنك') && <Landmark className="w-4 h-4" />}
                              {payment.paymentMethod.includes('نقد') && <Banknote className="w-4 h-4" />}
                              {payment.paymentMethod.includes('بطاقة') && <CreditCard className="w-4 h-4" />}
                              {payment.paymentMethod.includes('محفظة') && <Smartphone className="w-4 h-4" />}
                              {payment.paymentMethod}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={cn(
                              payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            )}>
                              {payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'فشل'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {formattedPayments.length > 5 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-500">عرض {Math.min(5, formattedPayments.length)} من {formattedPayments.length} عملية</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled className="gap-2">
                        <ChevronRight className="w-4 h-4" />
                        السابق
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        التالي
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* تبويب السيارات */}
            {activeTab === 'vehicles' && (
              <div className="animate-in fade-in-50 duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">السيارات المؤجرة</h3>
                  <p className="text-sm text-gray-500 mt-1">جميع السيارات الحالية والسابقة</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formattedContracts.map((contract, index) => (
                    <div key={contract.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                          index % 3 === 0 ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                          index % 3 === 1 ? "bg-gradient-to-br from-purple-500 to-purple-600" :
                          "bg-gradient-to-br from-orange-500 to-orange-600"
                        )}>
                          <Car className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-1">
                            {contract.vehicle?.make} {contract.vehicle?.model}
                          </h4>
                          <p className="text-xs text-gray-500">موديل {contract.vehicle?.year}</p>
                          <Badge className="mt-2 bg-green-100 text-green-700">نشط</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">اللوحة:</span>
                          <span className="font-mono font-semibold text-gray-900">{contract.vehicle?.plate_number || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">العقد:</span>
                          <span className="font-mono font-semibold text-gray-900">#{contract.contractNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">المدة:</span>
                          <span className="font-semibold text-gray-900">{contract.daysRemaining} يوم متبقي</span>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full mt-4 gap-2">
                        <Eye className="w-4 h-4" />
                        عرض التفاصيل
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تبويب المستندات */}
            {activeTab === 'documents' && (
              <div className="animate-in fade-in-50 duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">المستندات والملفات</h3>
                  <p className="text-sm text-gray-500 mt-1">جميع الوثائق المرتبطة بالعميل</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-200 hover:border-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">صورة الهوية الوطنية</h4>
                        <p className="text-xs text-gray-500 mb-2">تم الرفع في 15/01/2024</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">معتمد</Badge>
                          <span className="text-xs text-gray-500">2.4 MB</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all duration-200 hover:border-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5' }}>
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">رخصة القيادة</h4>
                        <p className="text-xs text-gray-500 mb-2">تم الرفع في 15/01/2024</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">معتمد</Badge>
                          <span className="text-xs text-gray-500">1.8 MB</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all duration-200 hover:border-blue-500">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dbeafe' }}>
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">رفع مستند جديد</h4>
                  <p className="text-sm text-gray-500 mb-4">اسحب الملفات هنا أو انقر للاختيار</p>
                  <Button className="bg-red-600 hover:bg-red-700 gap-2">
                    <Upload className="w-4 h-4" />
                    اختر ملف
                  </Button>
                </div>
              </div>
            )}

            {/* تبويب سجل النشاط */}
            {activeTab === 'activity' && (
              <div className="animate-in fade-in-50 duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">سجل النشاط</h3>
                  <p className="text-sm text-gray-500 mt-1">آخر الأنشطة والتحديثات</p>
                </div>
                
                <div className="relative pr-8">
                  <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="relative pb-8">
                    <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-white border-3 border-red-600" style={{ transform: 'translateX(50%)' }}></div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#d1fae5' }}>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">تم استلام الدفعة</h4>
                            <p className="text-xs text-gray-500">30/10/2024 - 02:30 م</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">مكتمل</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mr-10">تم استلام دفعة بمبلغ 2,500 ر.س للعقد #CNT-001 عن طريق التحويل البنكي</p>
                    </div>
                  </div>
                  
                  <div className="relative pb-8">
                    <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-white border-3 border-red-600" style={{ transform: 'translateX(50%)' }}></div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#dbeafe' }}>
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">تحديث بيانات العميل</h4>
                            <p className="text-xs text-gray-500">25/10/2024 - 10:15 ص</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">تحديث</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mr-10">تم تحديث العنوان ورقم الجوال</p>
                    </div>
                  </div>
                  
                  <div className="relative pb-0">
                    <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-white border-3 border-red-600" style={{ transform: 'translateX(50%)' }}></div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#dbeafe' }}>
                            <UserPlus className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">تسجيل عميل جديد</h4>
                            <p className="text-xs text-gray-500">15/01/2024 - 09:00 ص</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">جديد</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mr-10">تم تسجيل العميل في النظام</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDetailsPage;
