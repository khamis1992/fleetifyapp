/**
 * مكون صفحة تفاصيل المركبة
 * صفحة شاملة لعرض جميع معلومات وبيانات المركبة
 * 
 * @component VehicleDetailsPage
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId, useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  ArrowRight,
  Edit3,
  Wrench,
  CheckCircle,
  FileText,
  DollarSign,
  Gauge,
  Info,
  Settings,
  Tag,
  Folder,
  AlertTriangle,
  Plus,
  Car,
  Upload,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { VehiclePricingPanel } from './VehiclePricingPanel';
import { VehicleDocumentsPanel } from './VehicleDocumentsPanel';
import { VehicleInsurancePanel } from './VehicleInsurancePanel';
import { VehicleForm } from './VehicleForm';
import { MaintenanceForm } from './MaintenanceForm';
import { TrafficViolationForm } from './TrafficViolationForm';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Vehicle } from '@/hooks/useVehicles';
import { useQueryClient } from '@tanstack/react-query';

/**
 * مكون صفحة تفاصيل المركبة الرئيسية
 */
const VehicleDetailsPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const queryClient = useQueryClient();

  // جلب بيانات المركبة من قاعدة البيانات
  const { data: vehicle, isLoading: loadingVehicle, error: vehicleError } = useQuery({
    queryKey: ['vehicle-details', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) {
        throw new Error('معرف المركبة أو الشركة مفقود');
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Vehicle;
    },
    enabled: !!vehicleId && !!companyId,
  });

  // جلب عقود المركبة
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['vehicle-contracts', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers!customer_id(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // جلب سجل الصيانة
  const { data: maintenanceRecords = [], isLoading: loadingMaintenance } = useQuery({
    queryKey: ['vehicle-maintenance', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];

      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching maintenance:', error);
        throw error; // إعادة رمي الخطأ للمعالجة الصحيحة
      }
      return data || [];
    },
    enabled: !!vehicleId && !!companyId,
  });

  // جلب المخالفات المرورية
  const { data: violations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['vehicle-violations', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('violation_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching violations:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // حساب إحصائيات المركبة
  const vehicleStats = useMemo(() => {
    if (!vehicle) return null;

    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.total_paid || 0), 0);

    return {
      status: vehicle.status || 'available',
      activeContracts,
      totalRevenue,
      currentMileage: vehicle.current_mileage || 0,
    };
  }, [vehicle, contracts]);

  // معالجات الأحداث
  const handleBack = useCallback(() => {
    navigate('/fleet');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    console.log('🔧 [VehicleDetailsPage] Edit button clicked, vehicle:', vehicle);
    console.log('🔧 [VehicleDetailsPage] loadingVehicle:', loadingVehicle);
    console.log('🔧 [VehicleDetailsPage] vehicleId:', vehicleId);
    
    if (!vehicle) {
      console.warn('⚠️ [VehicleDetailsPage] Cannot edit: vehicle not loaded yet');
      toast({
        title: 'خطأ',
        description: 'لم يتم تحميل بيانات المركبة بعد. يرجى المحاولة مرة أخرى.',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('✅ [VehicleDetailsPage] Opening edit form for vehicle:', vehicle.id);
    setShowEditForm(true);
  }, [vehicle, loadingVehicle, vehicleId, toast]);

  const handleNewContract = useCallback(() => {
    if (!vehicleId) {
      toast({
        title: 'خطأ',
        description: 'معرف المركبة غير متوفر.',
        variant: 'destructive'
      });
      return;
    }
    navigate(`/contracts?vehicle=${vehicleId}`);
  }, [navigate, vehicleId, toast]);

  const handleMaintenanceSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance', vehicleId] });
    setShowMaintenanceForm(false);
    toast({
      title: 'نجاح',
      description: 'تم تسجيل الصيانة بنجاح',
    });
  }, [queryClient, vehicleId, toast]);

  const handleViolationSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-violations', vehicleId] });
    setShowViolationForm(false);
    toast({
      title: 'نجاح',
      description: 'تم تسجيل المخالفة بنجاح',
    });
  }, [queryClient, vehicleId, toast]);

  const handleNewViolation = useCallback(() => {
    if (!vehicleId) {
      toast({
        title: 'خطأ',
        description: 'معرف المركبة غير متوفر.',
        variant: 'destructive'
      });
      return;
    }
    setShowViolationForm(true);
  }, [vehicleId, toast]);

  // دوال مساعدة
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      available: 'status-available',
      rented: 'status-rented',
      maintenance: 'status-maintenance',
      out_of_service: 'status-out-of-service',
      reserved: 'status-reserved',
      accident: 'bg-red-100 text-red-800',
      stolen: 'bg-slate-100 text-slate-800',
      police_station: 'bg-amber-100 text-amber-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      available: 'متاحة',
      rented: 'مؤجرة',
      maintenance: 'قيد الصيانة',
      out_of_service: 'خارج الخدمة',
      reserved: 'محجوزة',
      accident: 'حادث',
      stolen: 'مسروقة',
      police_station: 'في المخفر',
    };
    return texts[status] || status;
  };

  const getCustomerName = (customer: any): string => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar || customer.company_name || 'شركة';
    }
    const firstName = customer.first_name_ar || customer.first_name || '';
    const lastName = customer.last_name_ar || customer.last_name || '';
    return `${firstName} ${lastName}`.trim();
  };

  // معالجة حالات التحميل والأخطاء
  const isLoading = loadingVehicle || loadingContracts || loadingMaintenance || loadingViolations;

  // انتظار تحميل بيانات المصادقة أولاً - يجب انتظار companyId
  if (isAuthenticating || !companyId || isLoading) {
    return <PageSkeletonFallback />;
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">المركبة غير موجودة</h3>
            <p className="text-gray-600 mb-4">لم يتم العثور على هذه المركبة</p>
            <Button onClick={() => navigate('/fleet')}>
              العودة لصفحة الأسطول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vehicleName = `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}`;
  
  // استخراج الصورة من مصفوفة الصور
  const vehicleImage = vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0 
    ? (typeof vehicle.images[0] === 'string' ? vehicle.images[0] : (vehicle.images[0] as any)?.url || '')
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">تفاصيل المركبة</h1>
                <p className="text-xs text-gray-500">إدارة ومتابعة بيانات المركبة</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                type="button"
                onClick={handleEdit} 
                disabled={!vehicle || loadingVehicle}
                className="gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* بطاقة رأس المركبة */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* صورة المركبة */}
              <div className="lg:w-1/3">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {vehicleImage ? (
                    <img
                      src={vehicleImage}
                      alt={vehicleName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات المركبة */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{vehicleName}</h2>
                    <p className="text-lg text-gray-600">
                      رقم اللوحة: <span className="font-mono font-semibold">{vehicle.plate_number}</span>
                    </p>
                    {vehicle.vin && (
                      <p className="text-sm text-gray-500 mt-1">
                        رقم الهيكل (VIN): <span className="font-mono font-medium text-gray-700">{vehicle.vin}</span>
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(vehicle.status)}>
                    {getStatusText(vehicle.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {vehicle.vin && (
                    <div>
                      <span className="text-gray-500">رقم الهيكل:</span>
                      <p className="font-mono font-semibold">{vehicle.vin}</p>
                    </div>
                  )}
                  {vehicle.color && (
                    <div>
                      <span className="text-gray-500">اللون:</span>
                      <p className="font-semibold">{vehicle.color}</p>
                    </div>
                  )}
                  {vehicle.transmission_type && (
                    <div>
                      <span className="text-gray-500">ناقل الحركة:</span>
                      <p className="font-semibold">
                        {vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'}
                      </p>
                    </div>
                  )}
                  {vehicle.fuel_type && (
                    <div>
                      <span className="text-gray-500">نوع الوقود:</span>
                      <p className="font-semibold">
                        {vehicle.fuel_type === 'gasoline' ? 'بنزين' :
                         vehicle.fuel_type === 'diesel' ? 'ديزل' :
                         vehicle.fuel_type === 'hybrid' ? 'هجين' : 'كهربائي'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* الحالة */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs text-gray-500">الحالة</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {getStatusText(vehicle.status)}
              </div>
              <div className="text-sm text-gray-600">
                {vehicle.status === 'available' ? 'للإيجار الفوري' : 'غير متاحة'}
              </div>
            </CardContent>
          </Card>

          {/* العقود */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-xs text-gray-500">العقود</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mb-1">
                {vehicleStats?.activeContracts || 0}
              </div>
              <div className="text-sm text-gray-600">عقد نشط</div>
            </CardContent>
          </Card>

          {/* الإيرادات */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500">الإيرادات</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {formatCurrency(vehicleStats?.totalRevenue || 0)}
              </div>
              <div className="text-sm text-gray-600">إجمالي</div>
            </CardContent>
          </Card>

          {/* العداد */}
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500">العداد</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {vehicle.current_mileage?.toLocaleString('ar-SA') || 0}
              </div>
              <div className="text-sm text-gray-600">كم</div>
            </CardContent>
          </Card>
        </div>

        {/* قسم التبويبات */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 overflow-x-auto">
              <TabsList className="w-full justify-start bg-transparent h-auto p-2 rounded-none flex gap-1">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Info className="w-4 h-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger
                  value="technical"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Settings className="w-4 h-4" />
                  تقنية
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  مالية
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Tag className="w-4 h-4" />
                  التسعير
                </TabsTrigger>
                <TabsTrigger
                  value="contracts"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <FileText className="w-4 h-4" />
                  العقود
                </TabsTrigger>
                <TabsTrigger
                  value="maintenance"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  الصيانة
                </TabsTrigger>
                <TabsTrigger
                  value="violations"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  المخالفات
                </TabsTrigger>
                <TabsTrigger
                  value="insurance"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  التأمين
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-t-lg gap-2"
                >
                  <Folder className="w-4 h-4" />
                  الوثائق
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* تبويب نظرة عامة */}
              <TabsContent value="overview" className="mt-0">
                <OverviewTab vehicle={vehicle} formatCurrency={formatCurrency} />
              </TabsContent>

              {/* تبويب تقنية */}
              <TabsContent value="technical" className="mt-0">
                <TechnicalTab vehicle={vehicle} />
              </TabsContent>

              {/* تبويب مالية */}
              <TabsContent value="financial" className="mt-0">
                <FinancialTab vehicle={vehicle} formatCurrency={formatCurrency} />
              </TabsContent>

              {/* تبويب التسعير */}
              <TabsContent value="pricing" className="mt-0">
                <VehiclePricingPanel vehicleId={vehicle.id} />
              </TabsContent>

              {/* تبويب التأمين */}
              <TabsContent value="insurance" className="mt-0">
                <VehicleInsurancePanel vehicleId={vehicle.id} />
              </TabsContent>

              {/* تبويب العقود */}
              <TabsContent value="contracts" className="mt-0">
                <ContractsTab 
                  contracts={contracts} 
                  getCustomerName={getCustomerName} 
                  formatCurrency={formatCurrency}
                  vehicleId={vehicleId}
                  onNewContract={handleNewContract}
                />
              </TabsContent>

              {/* تبويب الصيانة */}
              <TabsContent value="maintenance" className="mt-0">
                <MaintenanceTab maintenanceRecords={maintenanceRecords} formatCurrency={formatCurrency} vehicleId={vehicleId} onNewMaintenance={() => setShowMaintenanceForm(true)} />
              </TabsContent>

              {/* تبويب المخالفات */}
              <TabsContent value="violations" className="mt-0">
                <ViolationsTab 
                  violations={violations} 
                  formatCurrency={formatCurrency} 
                  onNewViolation={handleNewViolation}
                  vehicleId={vehicleId}
                />
              </TabsContent>

              {/* تبويب الوثائق */}
              <TabsContent value="documents" className="mt-0">
                <VehicleDocumentsPanel vehicleId={vehicle.id} onDocumentAdd={() => {}} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </main>

      {/* Vehicle Form Dialog */}
      <VehicleForm 
        vehicle={vehicle || undefined}
        open={showEditForm}
        onOpenChange={(open) => {
          setShowEditForm(open);
          if (!open) {
            // Invalidate queries when dialog closes to refresh vehicle data
            queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId, companyId] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          }
        }}
      />

      {/* Maintenance Form Dialog */}
      <MaintenanceForm
        vehicleId={vehicleId}
        open={showMaintenanceForm}
        onOpenChange={(open) => {
          setShowMaintenanceForm(open);
          if (!open) {
            // Invalidate queries when dialog closes
            queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance', vehicleId] });
          }
        }}
      />

      {/* Traffic Violation Form Dialog */}
      <Dialog open={showViolationForm} onOpenChange={setShowViolationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <TrafficViolationForm onSuccess={handleViolationSuccess} vehicleId={vehicleId} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// مكونات التبويبات الفرعية

// تبويب نظرة عامة
interface OverviewTabProps {
  vehicle: Vehicle;
  formatCurrency: (amount: number) => string;
}

const OverviewTab = ({ vehicle, formatCurrency }: OverviewTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* المعلومات الأساسية */}
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="w-5 h-5 text-red-600" />
          المعلومات الأساسية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="الشركة المصنعة" value={vehicle.make} />
        <InfoRow label="الطراز" value={vehicle.model} />
        <InfoRow label="السنة" value={vehicle.year?.toString()} />
        <InfoRow label="اللون" value={vehicle.color} />
        <InfoRow label="عدد المقاعد" value={vehicle.seating_capacity ? `${vehicle.seating_capacity} مقاعد` : undefined} />
      </CardContent>
    </Card>

    {/* المواصفات التقنية */}
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          المواصفات التقنية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="رقم الهيكل" value={vehicle.vin} mono />
        <InfoRow label="رقم المحرك" value={vehicle.engine_number} mono />
        <InfoRow
          label="ناقل الحركة"
          value={vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'}
        />
        <InfoRow
          label="نوع الوقود"
          value={
            vehicle.fuel_type === 'gasoline' ? 'بنزين' :
            vehicle.fuel_type === 'diesel' ? 'ديزل' :
            vehicle.fuel_type === 'hybrid' ? 'هجين' : 'كهربائي'
          }
        />
        <InfoRow label="المسافة المقطوعة" value={vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('ar-SA')} كم` : undefined} />
      </CardContent>
    </Card>

    {/* التسعير */}
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-600" />
          التسعير
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="يومي" value={vehicle.daily_rate ? formatCurrency(vehicle.daily_rate) : undefined} />
        <InfoRow label="أسبوعي" value={vehicle.weekly_rate ? formatCurrency(vehicle.weekly_rate) : undefined} />
        <InfoRow label="شهري" value={vehicle.monthly_rate ? formatCurrency(vehicle.monthly_rate) : undefined} />
      </CardContent>
    </Card>
  </div>
);

// مكون صف المعلومات
interface InfoRowProps {
  label: string;
  value?: string;
  mono?: boolean;
}

const InfoRow = ({ label, value, mono }: InfoRowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600">{label}</span>
    <span className={cn('font-semibold', mono && 'font-mono text-sm')}>
      {value || '-'}
    </span>
  </div>
);

// تبويب تقنية
interface TechnicalTabProps {
  vehicle: Vehicle;
}

const TechnicalTab = ({ vehicle }: TechnicalTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>المواصفات التقنية التفصيلية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="سعة الخزان" value={vehicle.fuel_capacity ? `${vehicle.fuel_capacity} لتر` : undefined} />
        <InfoRow
          label="نوع الدفع"
          value={
            vehicle.drive_type === 'front_wheel' ? 'دفع أمامي' :
            vehicle.drive_type === 'rear_wheel' ? 'دفع خلفي' :
            vehicle.drive_type === 'all_wheel' ? 'دفع رباعي' : undefined
          }
        />
        <InfoRow
          label="حالة المركبة"
          value={
            vehicle.vehicle_condition === 'excellent' ? 'ممتازة' :
            vehicle.vehicle_condition === 'very_good' ? 'جيدة جداً' :
            vehicle.vehicle_condition === 'good' ? 'جيدة' :
            vehicle.vehicle_condition === 'fair' ? 'مقبولة' : 'ضعيفة'
          }
        />
      </CardContent>
    </Card>

    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>التواريخ المهمة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow
          label="تاريخ التسجيل"
          value={vehicle.registration_date ? format(new Date(vehicle.registration_date), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow
          label="انتهاء التسجيل"
          value={vehicle.registration_expiry ? format(new Date(vehicle.registration_expiry), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow
          label="الصيانة القادمة"
          value={vehicle.next_service_due ? format(new Date(vehicle.next_service_due), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow label="الموقع الحالي" value={vehicle.current_location} />
      </CardContent>
    </Card>
  </div>
);

// تبويب مالية
interface FinancialTabProps {
  vehicle: Vehicle;
  formatCurrency: (amount: number) => string;
}

const FinancialTab = ({ vehicle, formatCurrency }: FinancialTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>معلومات الشراء</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow
          label="تاريخ الشراء"
          value={vehicle.purchase_date ? format(new Date(vehicle.purchase_date), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow label="تكلفة الشراء" value={vehicle.purchase_cost ? formatCurrency(vehicle.purchase_cost) : undefined} />
        <InfoRow label="القيمة الحالية" value={vehicle.current_value ? formatCurrency(vehicle.current_value) : undefined} />
        <InfoRow
          label="الإهلاك"
          value={
            vehicle.purchase_cost && vehicle.current_value
              ? formatCurrency(vehicle.purchase_cost - vehicle.current_value)
              : undefined
          }
        />
      </CardContent>
    </Card>

    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>معلومات التأمين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="شركة التأمين" value={vehicle.insurance_company} />
        <InfoRow label="رقم البوليصة" value={vehicle.insurance_policy_number} mono />
        <InfoRow
          label="تاريخ الانتهاء"
          value={vehicle.insurance_expiry ? format(new Date(vehicle.insurance_expiry), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow label="قيمة التأمين" value={vehicle.insurance_value ? formatCurrency(vehicle.insurance_value) : undefined} />
      </CardContent>
    </Card>
  </div>
);

// تبويب العقود
interface ContractsTabProps {
  contracts: any[];
  getCustomerName: (customer: any) => string;
  formatCurrency: (amount: number) => string;
  vehicleId?: string;
  onNewContract?: () => void;
}

const ContractsTab = ({ contracts, getCustomerName, formatCurrency, vehicleId, onNewContract }: ContractsTabProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onNewContract) {
      onNewContract();
    } else if (vehicleId) {
      navigate(`/contracts?vehicle=${vehicleId}`);
    } else {
      navigate('/contracts');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">العقود المرتبطة بالمركبة</h3>
        <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={handleClick}>
          <Plus className="w-4 h-4" />
          عقد جديد
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            لا توجد عقود لهذه المركبة
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const customerName = getCustomerName(contract.customer);
            const endDate = contract.end_date ? new Date(contract.end_date) : null;
            const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;

            return (
              <Card 
                key={contract.id} 
                className="transition-all hover:border-red-400 hover:shadow-lg cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          عقد #{contract.contract_number}
                        </h4>
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">العميل: {customerName}</p>
                    </div>
                    <Badge className={contract.status === 'active' ? 'status-available' : 'bg-gray-100'}>
                      {contract.status === 'active' ? 'نشط' : contract.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">البداية</div>
                      <div className="font-semibold">
                        {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">النهاية</div>
                      <div className="font-semibold">
                        {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">الإيجار الشهري</div>
                      <div className="font-semibold">{formatCurrency(contract.monthly_amount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">المتبقي</div>
                      <div className={cn('font-semibold', daysRemaining < 30 ? 'text-orange-600' : '')}>
                        {daysRemaining > 0 ? `${daysRemaining} يوم` : 'منتهي'}
                      </div>
                    </div>
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

// تبويب الصيانة
interface MaintenanceTabProps {
  maintenanceRecords: any[];
  formatCurrency: (amount: number) => string;
  vehicleId?: string;
  onNewMaintenance?: () => void;
}

const MaintenanceTab = ({ maintenanceRecords, formatCurrency, vehicleId, onNewMaintenance }: MaintenanceTabProps) => {
  const navigate = useNavigate();
  
  const handleNewMaintenance = () => {
    if (onNewMaintenance) {
      onNewMaintenance();
    } else if (vehicleId) {
      navigate(`/fleet/maintenance?vehicle=${vehicleId}`);
    } else {
      navigate('/fleet/maintenance');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">سجل الصيانة</h3>
        <Button 
          onClick={handleNewMaintenance}
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          تسجيل صيانة
        </Button>
      </div>

      {maintenanceRecords.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            لا توجد سجلات صيانة لهذه المركبة
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {maintenanceRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {record.maintenance_type || 'صيانة'}
                    {record.maintenance_number && ` (#${record.maintenance_number})`}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    تاريخ: {record.scheduled_date ? format(new Date(record.scheduled_date), 'dd/MM/yyyy', { locale: ar }) : 
                              record.completed_date ? format(new Date(record.completed_date), 'dd/MM/yyyy', { locale: ar }) : '-'} 
                    {record.service_provider && ` • الورشة: ${record.service_provider}`}
                    {record.status && (
                      <Badge className="mr-2" variant={record.status === 'completed' ? 'default' : 'secondary'}>
                        {record.status === 'completed' ? 'مكتملة' : 
                         record.status === 'in_progress' ? 'قيد التنفيذ' :
                         record.status === 'pending' ? 'قيد الانتظار' : record.status}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    التكلفة: {formatCurrency(record.actual_cost || record.estimated_cost || 0)} 
                    {record.mileage_at_service && ` • المسافة: ${record.mileage_at_service.toLocaleString('ar-SA')} كم`}
                  </p>
                  {record.description && (
                    <p className="text-sm text-gray-500">{record.description}</p>
                  )}
                  {record.notes && (
                    <p className="text-sm text-gray-400 mt-1">{record.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// تبويب المخالفات
interface ViolationsTabProps {
  violations: any[];
  formatCurrency: (amount: number) => string;
  onNewViolation?: () => void;
  vehicleId?: string;
}

const ViolationsTab = ({ violations, formatCurrency, onNewViolation, vehicleId }: ViolationsTabProps) => {
  const navigate = useNavigate();

  const handleNewViolation = () => {
    if (onNewViolation) {
      onNewViolation();
    } else if (vehicleId) {
      navigate(`/fleet/traffic-violations?vehicle=${vehicleId}`);
    } else {
      navigate('/fleet/traffic-violations');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">المخالفات المرورية</h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleNewViolation}
            className="gap-2 bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            تسجيل مخالفة
          </Button>
          {vehicleId && (
            <Button 
              onClick={() => navigate(`/fleet/traffic-violations?vehicle=${vehicleId}`)}
              variant="outline"
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              عرض جميع المخالفات
            </Button>
          )}
        </div>
      </div>

      {violations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            لا توجد مخالفات مسجلة لهذه المركبة
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {violations.map((violation) => (
            <Card key={violation.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {violation.violation_type || 'مخالفة مرورية'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      رقم المخالفة: #{violation.violation_number || violation.id.substring(0, 8)}
                    </p>
                  </div>
                  <Badge className={violation.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                    {violation.payment_status === 'paid' ? 'مدفوعة' : 'معلقة'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">التاريخ</div>
                    <div className="font-semibold">
                      {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">المبلغ</div>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(violation.fine_amount || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">الحالة</div>
                    <div className="font-semibold">
                      {violation.payment_status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">المسؤول</div>
                    <div className="font-semibold">
                      {violation.responsible_party === 'customer' ? 'العميل' : 'الشركة'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleDetailsPage;




