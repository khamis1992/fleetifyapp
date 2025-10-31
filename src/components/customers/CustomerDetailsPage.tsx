/**
 * مكون صفحة تفاصيل العميل
 * صفحة شاملة لعرض جميع معلومات وبيانات العميل
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
  BarChart3,
  Wallet,
  TrendingUp,
  Car,
  Plus,
  Target,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface CustomerStats {
  activeContracts: number;
  outstandingAmount: number;
  commitmentRate: number;
  totalPayments: number;
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationalId: string;
  customerType: string;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  lastActivity: string;
  avatar?: string;
}

interface Contract {
  id: string;
  vehicleName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  status: 'active' | 'pending' | 'expired';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  daysRemaining: number;
}

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  contractNumber: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'failed';
}

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
  const stats: CustomerStats = useMemo(() => {
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

    // حساب نسبة الالتزام (عدد الدفعات في الوقت ÷ إجمالي الدفعات)
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
        vehicleName,
        contractNumber: contract.contract_number,
        startDate: contract.start_date,
        endDate: contract.end_date,
        monthlyAmount: contract.monthly_amount || 0,
        status: contract.status as 'active' | 'pending' | 'expired',
        paymentStatus: (contract.total_paid || 0) >= (contract.contract_amount || 0) ? 'paid' : 'pending' as 'paid' | 'pending' | 'overdue',
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
      status: payment.payment_status === 'completed' ? 'paid' : payment.payment_status === 'pending' ? 'pending' : 'failed' as 'paid' | 'pending' | 'failed',
    }));
  }, [payments]);

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
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
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
            <Button onClick={() => navigate('/customers')}>
              العودة لصفحة العملاء
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // دالة للحصول على لون الحالة
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      expired: 'bg-red-100 text-red-700',
      inactive: 'bg-gray-100 text-gray-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // دالة للحصول على لون حالة الأيام المتبقية
  const getDaysRemainingColor = (days: number): string => {
    if (days <= 30) return 'text-orange-600';
    if (days <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

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
                <h1 className="text-lg font-semibold text-gray-900">
                  تفاصيل العميل
                </h1>
                <p className="text-xs text-gray-500">
                  إدارة ومتابعة بيانات العميل
                </p>
              </div>
            </div>

            {/* الجانب الأيسر - الإجراءات */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-semibold">
                  ك
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* بطاقة رأس معلومات العميل */}
        <Card className="mb-6 animate-in fade-in-50 duration-400">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* الصورة الرمزية */}
                <Avatar className="w-16 h-16 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold">
                    {getInitials(customerName)}
                  </AvatarFallback>
                </Avatar>

                {/* معلومات العميل */}
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {customerName}
                    </h2>
                    <Badge
                      className={cn(
                        'flex items-center gap-1',
                        getStatusColor(customer.is_active ? 'active' : 'inactive')
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {customer.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                    {customer.is_vip && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        عميل مميز
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-4 h-4" />
                      {customer.customer_code || customer.id.substring(0, 8)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      تاريخ التسجيل: {customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy') : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      آخر نشاط: {customer.updated_at ? format(new Date(customer.updated_at), 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleEdit}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateReport}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  تقرير
                </Button>
                <Button variant="outline" onClick={handleArchive} className="gap-2">
                  <Archive className="w-4 h-4" />
                  أرشفة
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* شبكة الملخص السريع والمعلومات الشخصية */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* بطاقة الملخص السريع */}
          <div className="lg:col-span-4">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  ملخص سريع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">عقود نشطة</span>
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.activeContracts}
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">المبلغ المستحق</span>
                    <Wallet className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.outstandingAmount.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">نسبة الالتزام</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-green-600">
                      {stats.commitmentRate}%
                    </div>
                    <div className="flex-1">
                      <Progress value={stats.commitmentRate} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">إجمالي المدفوعات</span>
                    <CreditCard className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {stats.totalPayments.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* بطاقة المعلومات الشخصية */}
          <div className="lg:col-span-8">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                  <InfoItem
                    icon={<Mail className="w-5 h-5 text-blue-600" />}
                    label="البريد الإلكتروني"
                    value={customer.email || '-'}
                    bgColor="bg-blue-50"
                  />
                  <InfoItem
                    icon={<Phone className="w-5 h-5 text-green-600" />}
                    label="رقم الجوال"
                    value={customer.phone || '-'}
                    bgColor="bg-green-50"
                    dir="ltr"
                  />
                  <InfoItem
                    icon={<MapPin className="w-5 h-5 text-purple-600" />}
                    label="العنوان"
                    value={customer.address || '-'}
                    bgColor="bg-purple-50"
                  />
                  </div>

                  <div className="space-y-4">
                    <InfoItem
                      icon={<Cake className="w-5 h-5 text-orange-600" />}
                      label="تاريخ الميلاد"
                      value={customer.date_of_birth || '-'}
                      bgColor="bg-orange-50"
                    />
                    <InfoItem
                      icon={<CreditCard className="w-5 h-5 text-red-600" />}
                      label="رقم الهوية الوطنية"
                      value={customer.national_id || '-'}
                      bgColor="bg-red-50"
                      mono
                      dir="ltr"
                    />
                    <InfoItem
                      icon={<Briefcase className="w-5 h-5 text-cyan-600" />}
                      label="نوع العميل"
                      value={customer.customer_type === 'individual' ? 'فرد' : customer.customer_type === 'corporate' ? 'شركة' : '-'}
                      bgColor="bg-cyan-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* قسم التبويبات */}
        <Card className="animate-in fade-in-50 duration-600">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="contracts"
                className="rounded-none border-b-2 data-[state=active]:border-blue-600"
              >
                <FileText className="w-4 h-4 mr-2" />
                العقود النشطة
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-none border-b-2 data-[state=active]:border-blue-600"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                المدفوعات
              </TabsTrigger>
              <TabsTrigger
                value="vehicles"
                className="rounded-none border-b-2 data-[state=active]:border-blue-600"
              >
                <Car className="w-4 h-4 mr-2" />
                السيارات
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="rounded-none border-b-2 data-[state=active]:border-blue-600"
              >
                <Archive className="w-4 h-4 mr-2" />
                المستندات
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 data-[state=active]:border-blue-600"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                سجل النشاط
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* تبويب العقود */}
              <TabsContent value="contracts" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    العقود النشطة
                  </h3>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    عقد جديد
                  </Button>
                </div>

                <div className="space-y-4">
                  {formattedContracts.length > 0 ? (
                    formattedContracts.map((contract, index) => (
                      <ContractCard key={contract.id} contract={contract} index={index} />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        لا توجد عقود لهذا العميل
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* تبويب المدفوعات */}
              <TabsContent value="payments" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    سجل المدفوعات
                  </h3>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    تسجيل دفعة
                  </Button>
                </div>

                <PaymentsTable payments={formattedPayments} />
              </TabsContent>

              {/* تبويبات أخرى */}
              <TabsContent value="vehicles" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    السيارات المؤجرة
                  </h3>
                  {formattedContracts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formattedContracts.map((contract) => (
                        <Card key={contract.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Car className="w-8 h-8 text-blue-600" />
                              <div>
                                <h4 className="font-semibold">{contract.vehicleName}</h4>
                                <p className="text-sm text-gray-600">
                                  عقد #{contract.contractNumber}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        لا توجد سيارات مؤجرة لهذا العميل
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    المستندات والملفات
                  </h3>
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      لا توجد مستندات متاحة حالياً
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    سجل النشاط
                  </h3>
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      لا توجد أنشطة مسجلة حالياً
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* قسم الإحصائيات والرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            title="المدفوعات الشهرية"
            color="blue"
          />
          <StatCard
            icon={<PieChart className="w-5 h-5 text-green-600" />}
            title="حالة العقود"
            color="green"
            percentage={75}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-purple-600" />}
            title="نسبة الالتزام"
            color="purple"
            value={95}
          />
        </div>
      </main>
    </div>
  );
};

// مكون عنصر المعلومات
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  mono?: boolean;
  dir?: 'ltr' | 'rtl';
}

const InfoItem = ({ icon, label, value, bgColor, mono, dir }: InfoItemProps) => (
  <div className="flex items-start gap-3">
    <div
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        bgColor
      )}
    >
      {icon}
    </div>
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={cn(
          'text-sm font-medium text-gray-900',
          mono && 'font-mono'
        )}
        dir={dir}
      >
        {value}
      </div>
    </div>
  </div>
);

// مكون بطاقة العقد
interface ContractCardProps {
  contract: Contract;
  index: number;
}

const ContractCard = ({ contract, index }: ContractCardProps) => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
  ];

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      expired: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getDaysColor = (days: number): string => {
    if (days <= 30) return 'text-orange-600';
    if (days <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card className="transition-all hover:border-blue-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                gradients[index % gradients.length]
              )}
            >
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                {contract.vehicleName}
              </h4>
              <p className="text-sm text-gray-600">
                عقد #{contract.contractNumber} • بدأ في {contract.startDate ? format(new Date(contract.startDate), 'dd/MM/yyyy') : '-'}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(contract.status)}>
            {contract.status === 'active' ? 'نشط' : 'قيد المراجعة'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">المبلغ الشهري</div>
            <div className="text-sm font-semibold text-gray-900">
              {contract.monthlyAmount.toLocaleString('ar-SA')} ر.س
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</div>
            <div className="text-sm font-semibold text-gray-900">
              {contract.endDate ? format(new Date(contract.endDate), 'dd/MM/yyyy') : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">المتبقي</div>
            <div
              className={cn(
                'text-sm font-semibold',
                getDaysColor(contract.daysRemaining)
              )}
            >
              {contract.daysRemaining} يوم
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">حالة الدفع</div>
            <div
              className={cn(
                'text-sm font-semibold',
                contract.paymentStatus === 'paid'
                  ? 'text-green-600'
                  : 'text-yellow-600'
              )}
            >
              {contract.paymentStatus === 'paid' ? 'مدفوع' : 'معلق'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            عرض التفاصيل
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            {contract.paymentStatus === 'paid' ? 'تجديد العقد' : 'متابعة الدفع'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون جدول المدفوعات
interface PaymentsTableProps {
  payments: Payment[];
}

const PaymentsTable = ({ payments }: PaymentsTableProps) => {
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              رقم الدفعة
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              التاريخ
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              العقد
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              المبلغ
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              طريقة الدفع
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              الحالة
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 text-sm font-mono text-gray-900">
                #{payment.paymentNumber}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : '-'}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                عقد #{payment.contractNumber.substring(0, 8)}
              </td>
              <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                {payment.amount.toLocaleString('ar-SA')} ر.س
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                {payment.paymentMethod}
              </td>
              <td className="px-4 py-4">
                <Badge className={getStatusColor(payment.status)}>
                  {payment.status === 'paid' ? 'مدفوع' : 'معلق'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <Button variant="link" size="sm" className="text-blue-600">
                  عرض
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// مكون بطاقة الإحصائيات
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'green' | 'purple';
  percentage?: number;
  value?: number;
}

const StatCard = ({ icon, title, color, percentage, value }: StatCardProps) => (
  <Card className="transition-all hover:shadow-lg hover:border-primary">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {percentage !== undefined ? (
        <div className="flex items-center justify-center h-48">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={color === 'green' ? '#10b981' : '#3b82f6'}
                strokeWidth="20"
                strokeDasharray="440"
                strokeDashoffset={440 - (440 * percentage) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-3xl font-bold text-gray-900">
                {percentage}%
              </span>
              <span className="text-sm text-gray-600">نشطة</span>
            </div>
          </div>
        </div>
      ) : value !== undefined ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div
              className={cn(
                'text-6xl font-bold mb-2',
                color === 'purple' && 'text-purple-600'
              )}
            >
              {value}%
            </div>
            <div className="text-sm text-gray-600">معدل الالتزام بالمواعيد</div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-600">ممتاز</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-end justify-between gap-2">
          {[60, 75, 90, 100, 85, 70].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-500 rounded-t transition-all duration-800"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default CustomerDetailsPage;

