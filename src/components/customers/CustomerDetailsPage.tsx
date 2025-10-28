/**
 * مكون صفحة تفاصيل العميل
 * صفحة شاملة لعرض جميع معلومات وبيانات العميل
 * 
 * @component CustomerDetailsPage
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('contracts');
  const [isLoading, setIsLoading] = useState(false);

  // بيانات وهمية للعرض التجريبي (سيتم استبدالها بـ API call)
  const customerData: CustomerInfo = useMemo(
    () => ({
      id: customerId || 'CUS-12345',
      name: 'أحمد محمد السعيد',
      email: 'ahmed.alsaeed@email.com',
      phone: '+966 50 123 4567',
      address: 'الرياض، حي النخيل، المملكة العربية السعودية',
      birthDate: '1990-05-20',
      nationalId: '1234567890',
      customerType: 'عميل مميز - مستوى ذهبي',
      status: 'active',
      registrationDate: '2024-01-15',
      lastActivity: 'منذ 3 ساعات',
    }),
    [customerId]
  );

  const stats: CustomerStats = useMemo(
    () => ({
      activeContracts: 3,
      outstandingAmount: 5000,
      commitmentRate: 95,
      totalPayments: 125000,
    }),
    []
  );

  const contracts: Contract[] = useMemo(
    () => [
      {
        id: '1',
        vehicleName: 'تويوتا كامري 2024',
        contractNumber: 'CNT-001',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        monthlyAmount: 5000,
        status: 'active',
        paymentStatus: 'paid',
        daysRemaining: 30,
      },
      {
        id: '2',
        vehicleName: 'BMW X5 2023',
        contractNumber: 'CNT-002',
        startDate: '2024-02-15',
        endDate: '2025-01-15',
        monthlyAmount: 8500,
        status: 'active',
        paymentStatus: 'paid',
        daysRemaining: 90,
      },
      {
        id: '3',
        vehicleName: 'مرسيدس E-Class 2024',
        contractNumber: 'CNT-003',
        startDate: '2024-03-01',
        endDate: '2025-03-01',
        monthlyAmount: 12000,
        status: 'pending',
        paymentStatus: 'pending',
        daysRemaining: 120,
      },
    ],
    []
  );

  const payments: Payment[] = useMemo(
    () => [
      {
        id: '1',
        paymentNumber: 'PAY-1245',
        date: '2024-01-01',
        contractNumber: 'CNT-001',
        amount: 5000,
        paymentMethod: 'تحويل بنكي',
        status: 'paid',
      },
      {
        id: '2',
        paymentNumber: 'PAY-1244',
        date: '2024-01-01',
        contractNumber: 'CNT-002',
        amount: 8500,
        paymentMethod: 'بطاقة ائتمان',
        status: 'paid',
      },
      {
        id: '3',
        paymentNumber: 'PAY-1243',
        date: '2023-12-01',
        contractNumber: 'CNT-001',
        amount: 5000,
        paymentMethod: 'تحويل بنكي',
        status: 'paid',
      },
    ],
    []
  );

  // معالجات الأحداث
  const handleBack = useCallback(() => {
    navigate(-1);
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
    const names = name.split(' ');
    return names
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
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
                  {customerData.avatar ? (
                    <AvatarImage src={customerData.avatar} alt={customerData.name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl font-bold">
                      {getInitials(customerData.name)}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* معلومات العميل */}
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {customerData.name}
                    </h2>
                    <Badge
                      className={cn(
                        'flex items-center gap-1',
                        getStatusColor(customerData.status)
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                      نشط
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {customerData.customerType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-4 h-4" />#{customerData.id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      تاريخ التسجيل: {customerData.registrationDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      آخر نشاط: {customerData.lastActivity}
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
                      value={customerData.email}
                      bgColor="bg-blue-50"
                    />
                    <InfoItem
                      icon={<Phone className="w-5 h-5 text-green-600" />}
                      label="رقم الجوال"
                      value={customerData.phone}
                      bgColor="bg-green-50"
                      dir="ltr"
                    />
                    <InfoItem
                      icon={<MapPin className="w-5 h-5 text-purple-600" />}
                      label="العنوان"
                      value={customerData.address}
                      bgColor="bg-purple-50"
                    />
                  </div>

                  <div className="space-y-4">
                    <InfoItem
                      icon={<Cake className="w-5 h-5 text-orange-600" />}
                      label="تاريخ الميلاد"
                      value={`${customerData.birthDate} (34 سنة)`}
                      bgColor="bg-orange-50"
                    />
                    <InfoItem
                      icon={<CreditCard className="w-5 h-5 text-red-600" />}
                      label="رقم الهوية الوطنية"
                      value={customerData.nationalId}
                      bgColor="bg-red-50"
                      mono
                      dir="ltr"
                    />
                    <InfoItem
                      icon={<Briefcase className="w-5 h-5 text-cyan-600" />}
                      label="نوع العميل"
                      value={customerData.customerType}
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
                  {contracts.map((contract, index) => (
                    <ContractCard key={contract.id} contract={contract} index={index} />
                  ))}
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

                <PaymentsTable payments={payments} />
              </TabsContent>

              {/* تبويبات أخرى */}
              <TabsContent value="vehicles" className="mt-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  السيارات المؤجرة
                </h3>
                <p className="text-gray-600">محتوى تبويب السيارات...</p>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  المستندات والملفات
                </h3>
                <p className="text-gray-600">محتوى تبويب المستندات...</p>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  سجل النشاط
                </h3>
                <p className="text-gray-600">محتوى تبويب سجل النشاط...</p>
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
                عقد #{contract.contractNumber} • بدأ في {contract.startDate}
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
              {contract.endDate}
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
              <td className="px-4 py-4 text-sm text-gray-900">{payment.date}</td>
              <td className="px-4 py-4 text-sm text-gray-900">
                عقد #{payment.contractNumber}
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

