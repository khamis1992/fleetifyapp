/**
 * مكون صفحة تفاصيل المركبة
 * صفحة شاملة لعرض جميع معلومات وبيانات المركبة
 * 
 * @component VehicleDetailsPage
 */

import { type CSSProperties, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
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
import { VehicleComprehensiveReportDialog } from './VehicleComprehensiveReportDialog';
import { VehicleStatusChangeDialog } from './VehicleStatusChangeDialog';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from '@/components/common/FeatureTourGuide';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Vehicle } from '@/hooks/useVehicles';
import { useQueryClient } from '@tanstack/react-query';

const vehicleTheme = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  water: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const vehicleDetailsTours = {
  page: {
    title: 'جولة صفحة تفاصيل المركبة',
    description: 'شرح سريع لطريقة قراءة ملف المركبة واتخاذ القرار التشغيلي من نفس الصفحة.',
    steps: [
      'ابدأ من بطاقة المركبة الجانبية: الصورة، اللوحة، الحالة، والعداد تعطيك ملخصاً سريعاً.',
      'استخدم أزرار عقد، الحالة، صيانة، ومخالفة لتنفيذ الإجراءات اليومية المرتبطة بهذه المركبة.',
      'راجع ملخص التشغيل لمعرفة العقد الحالي والصيانة المفتوحة والمخالفات غير المدفوعة وانتهاء الاستمارة.',
      'لوحة القرار التشغيلي تعرض نسبة الجاهزية وتساعدك على تحديد هل المركبة جاهزة للتأجير أو تحتاج متابعة.',
      'استخدم التبويبات للوصول للتسعير، العقود، الصيانة، المخالفات، التأمين، والوثائق بدون مغادرة الصفحة.',
    ],
  },
  contract: {
    title: 'جولة إنشاء عقد للمركبة',
    description: 'شرح ما يحدث عند إنشاء عقد جديد من صفحة المركبة.',
    steps: [
      'زر إنشاء عقد ينقلك إلى صفحة العقود مع تمرير معرف المركبة الحالية.',
      'في صفحة العقد اختر العميل وتحقق من أن المركبة محددة بشكل صحيح قبل المتابعة.',
      'حدد تواريخ العقد والقيمة الشهرية وشروط الدفع حتى يتم حساب الفواتير بشكل صحيح.',
      'بعد حفظ العقد ستظهر العلاقة داخل تبويب العقود في ملف المركبة.',
    ],
  },
  maintenance: {
    title: 'جولة تسجيل صيانة من ملف المركبة',
    description: 'شرح طريقة تسجيل صيانة مرتبطة بهذه المركبة.',
    steps: [
      'زر تسجيل صيانة يفتح نموذج الصيانة مع ربط المركبة الحالية تلقائياً.',
      'حدد نوع الصيانة والأولوية والوصف والتاريخ المتوقع.',
      'أدخل التكلفة والمورد ومركز التكلفة إذا كانت متوفرة لدعم التقارير المالية.',
      'بعد الحفظ تظهر الصيانة في سجل المركبة وتؤثر على جاهزيتها التشغيلية.',
    ],
  },
  violations: {
    title: 'جولة إدارة مخالفات المركبة',
    description: 'شرح تسجيل المخالفات أو فتح صفحة جميع المخالفات لهذه المركبة.',
    steps: [
      'زر تسجيل مخالفة يفتح نموذج مخالفة مرتبط بالمركبة الحالية.',
      'تاريخ المخالفة مهم لأنه يساعد النظام على معرفة العقد والعميل وقت حدوث المخالفة.',
      'زر عرض جميع المخالفات ينقلك لصفحة المخالفات مع فلترة المركبة الحالية.',
      'راجع حالة الدفع والمسؤول عن المخالفة قبل المطالبة المالية أو الإجراء القانوني.',
    ],
  },
} satisfies Record<string, FeatureTourContent>;

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
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [activeFeatureTour, setActiveFeatureTour] = useState<FeatureTourContent | null>(null);
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
        .from('penalties')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('penalty_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching violations:', error);
        return [];
      }
      return (data || []).map((violation) => ({
        ...violation,
        violation_number: violation.penalty_number,
        violation_date: violation.penalty_date,
        fine_amount: violation.amount,
        total_amount: violation.amount,
        responsible_party: violation.customer_id ? 'customer' : 'company',
      }));
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
      municipality: 'bg-green-100 text-green-800',
      street_52: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      available: 'متاحة',
      rented: 'مؤجرة',
      maintenance: 'قيد الصيانة',
      out_of_service: 'خارج الخدمة',
      reserved: 'محجوزة',
      reserved_employee: 'محجوزة لموظف',
      accident: 'حادث',
      stolen: 'مسروقة',
      police_station: 'في مركز الشرطة',
      municipality: 'البلدية',
      street_52: 'الشارع 52',
    };
    return texts[status] || status;
  };

  const getCustomerName = (customer: any): string => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name || customer.company_name_ar || 'شركة';
    }
    const firstName = customer.first_name || customer.first_name_ar || '';
    const lastName = customer.last_name || customer.last_name_ar || '';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">المركبة غير موجودة</h3>
            <p className="text-slate-600 mb-4">لم يتم العثور على هذه المركبة</p>
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

  const statusAccent = vehicle.status === 'available'
    ? vehicleTheme.success
    : vehicle.status === 'rented'
    ? vehicleTheme.focus
    : vehicle.status === 'maintenance'
    ? vehicleTheme.alert
    : vehicleTheme.water;

  const vehicleDetailsSystemStyle = {
    '--vehicle-details-text': vehicleTheme.text,
    '--vehicle-details-surface': vehicleTheme.surface,
    '--vehicle-details-inner': vehicleTheme.inner,
    '--vehicle-details-muted': vehicleTheme.muted,
    '--vehicle-details-border': vehicleTheme.border,
    '--vehicle-details-info': vehicleTheme.water,
    '--vehicle-details-alert': vehicleTheme.alert,
    '--vehicle-details-focus': vehicleTheme.focus,
    '--vehicle-details-success': vehicleTheme.success,
  } as CSSProperties;

  const primaryContract = contracts.find((contract) => contract.status === 'active') || contracts[0];
  const pendingViolations = violations.filter((violation) => {
    const status = violation.payment_status || violation.status;
    return status !== 'paid' && status !== 'settled';
  });
  const openMaintenance = maintenanceRecords.filter((record) => record.status !== 'completed');
  const totalPendingViolations = pendingViolations.reduce((sum, violation) => sum + Number(violation.total_amount || violation.fine_amount || 0), 0);
  const registrationDaysRemaining = vehicle.registration_expiry
    ? differenceInDays(new Date(vehicle.registration_expiry), new Date())
    : null;
  const readinessScore = Math.max(
    35,
    100
      - (vehicle.status === 'available' ? 0 : 18)
      - (openMaintenance.length > 0 ? 14 : 0)
      - (pendingViolations.length > 0 ? 12 : 0)
      - (registrationDaysRemaining !== null && registrationDaysRemaining < 30 ? 16 : 0)
  );
  const readinessState = readinessScore >= 85
    ? { label: 'جاهزية عالية', helper: 'المركبة جاهزة للتشغيل بدون عوائق مهمة', color: vehicleTheme.success }
    : readinessScore >= 65
    ? { label: 'تحتاج متابعة', helper: 'يوجد عناصر تشغيلية تحتاج مراجعة قبل القرار', color: vehicleTheme.alert }
    : { label: 'مخاطر تشغيلية', helper: 'يفضل إغلاق الملاحظات قبل التأجير أو التمديد', color: '#E11D48' };

  const metricCards = [
    {
      label: 'حالة التشغيل',
      value: getStatusText(vehicle.status),
      helper: vehicle.status === 'available' ? 'جاهزة للتأجير الفوري' : 'تحتاج متابعة تشغيلية',
      icon: CheckCircle,
      color: statusAccent,
    },
    {
      label: 'العقود النشطة',
      value: vehicleStats?.activeContracts || 0,
      helper: 'عقود مرتبطة بالمركبة',
      icon: FileText,
      color: vehicleTheme.focus,
    },
    {
      label: 'إجمالي الإيرادات',
      value: formatCurrency(vehicleStats?.totalRevenue || 0),
      helper: 'مدفوعات محصلة',
      icon: DollarSign,
      color: vehicleTheme.alert,
    },
    {
      label: 'قراءة العداد',
      value: vehicle.current_mileage?.toLocaleString('en-US') || 0,
      helper: 'كيلومتر',
      icon: Gauge,
      color: vehicleTheme.water,
    },
  ];

  const tabs = [
    { value: 'overview', label: 'نظرة عامة', icon: Info },
    { value: 'technical', label: 'تقنية', icon: Settings },
    { value: 'financial', label: 'مالية', icon: DollarSign },
    { value: 'pricing', label: 'التسعير', icon: Tag },
    { value: 'contracts', label: 'العقود', icon: FileText },
    { value: 'maintenance', label: 'الصيانة', icon: Wrench },
    { value: 'violations', label: 'المخالفات', icon: AlertTriangle },
    { value: 'insurance', label: 'التأمين', icon: DollarSign },
    { value: 'documents', label: 'الوثائق', icon: Folder },
  ];

  return (
    <div className="vehicle-details-system min-h-screen" style={vehicleDetailsSystemStyle}>
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: vehicleTheme.border }}>
        <div className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-[8px] border bg-white" style={{ borderColor: vehicleTheme.border }}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: vehicleTheme.muted }}>ملف المركبة</p>
              <h1 className="truncate text-lg font-bold sm:text-2xl" style={{ color: vehicleTheme.text }}>{vehicleName}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <FeatureTourButton
              tour={vehicleDetailsTours.page}
              onStart={setActiveFeatureTour}
              className="hidden h-10 gap-2 rounded-[8px] border bg-white lg:inline-flex"
            />
            <Button variant="outline" className="hidden h-10 gap-2 rounded-[8px] border bg-white sm:inline-flex" style={{ borderColor: vehicleTheme.border }} onClick={() => setShowReportDialog(true)}>
              <FileText className="h-4 w-4" style={{ color: vehicleTheme.focus }} />
              تقرير
            </Button>
            <Button type="button" onClick={handleEdit} disabled={!vehicle || loadingVehicle} className="h-10 gap-2 rounded-[8px] text-white" style={{ backgroundColor: vehicleTheme.success }}>
              <Edit3 className="h-4 w-4" />
              تعديل
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="vehicle-command-grid grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 xl:sticky xl:top-[88px] xl:self-start"
          >
            <Card className="overflow-hidden rounded-[8px] border bg-white shadow-sm" style={{ borderColor: vehicleTheme.border }}>
              <CardContent className="p-0">
                <button
                  type="button"
                  className="group relative block aspect-[4/3] w-full overflow-hidden bg-slate-50 text-right"
                  onClick={() => vehicleImage && setShowImagePreview(true)}
                >
                  {vehicleImage ? (
                    <img src={vehicleImage} alt={vehicleName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: vehicleTheme.inner }}>
                      <Car className="h-20 w-20" style={{ color: vehicleTheme.muted }} />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
                    <span className="block text-xs opacity-80">رقم اللوحة</span>
                    <span className="block font-mono text-2xl font-bold tracking-normal">{vehicle.plate_number}</span>
                  </span>
                </button>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold leading-tight" style={{ color: vehicleTheme.text }}>{vehicleName}</h2>
                      <p className="mt-1 truncate text-sm" style={{ color: vehicleTheme.muted }}>{vehicle.vin || 'لا يوجد رقم هيكل مسجل'}</p>
                    </div>
                    <Badge className="shrink-0 rounded-[8px] border px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${statusAccent}16`, borderColor: `${statusAccent}44`, color: statusAccent }}>
                      {getStatusText(vehicle.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <VehicleChip label="العداد" value={`${vehicle.current_mileage?.toLocaleString('en-US') || 0} كم`} color={vehicleTheme.water} />
                    <VehicleChip label="العقود النشطة" value={vehicleStats?.activeContracts || 0} color={vehicleTheme.focus} />
                    {vehicle.color && <VehicleChip label="اللون" value={vehicle.color} color={vehicleTheme.success} />}
                    {vehicle.location && <VehicleChip label="الموقع" value={vehicle.location} color={vehicleTheme.alert} />}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FeatureTourButton
                      tour={vehicleDetailsTours.page}
                      onStart={setActiveFeatureTour}
                      className="col-span-2 h-10 gap-2 rounded-[8px] border bg-white lg:hidden"
                    />
                    <Button onClick={handleNewContract} className="h-10 gap-2 rounded-[8px] text-white" style={{ backgroundColor: vehicleTheme.success }}>
                      <Plus className="h-4 w-4" />
                      عقد
                    </Button>
                    <Button onClick={() => setShowStatusDialog(true)} variant="outline" className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: vehicleTheme.border }}>
                      <CheckCircle className="h-4 w-4" style={{ color: statusAccent }} />
                      الحالة
                    </Button>
                    <Button onClick={() => setShowMaintenanceForm(true)} variant="outline" className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: vehicleTheme.border }}>
                      <Wrench className="h-4 w-4" style={{ color: vehicleTheme.focus }} />
                      صيانة
                    </Button>
                    <Button onClick={handleNewViolation} variant="outline" className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: vehicleTheme.border }}>
                      <AlertTriangle className="h-4 w-4" style={{ color: vehicleTheme.alert }} />
                      مخالفة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: vehicleTheme.border }}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: vehicleTheme.text }}>ملخص التشغيل</span>
                  <span className="text-xs font-semibold" style={{ color: readinessState.color }}>{readinessState.label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: vehicleTheme.inner }}>
                  <div className="h-full rounded-full" style={{ width: `${readinessScore}%`, backgroundColor: readinessState.color }} />
                </div>
                <div className="grid gap-2 text-sm">
                  <InfoRow label="العقد الحالي" value={primaryContract ? getCustomerName(primaryContract.customer) : 'لا يوجد عقد نشط'} />
                  <InfoRow label="الصيانة المفتوحة" value={`${openMaintenance.length} طلب`} />
                  <InfoRow label="مخالفات غير مدفوعة" value={formatCurrency(totalPendingViolations)} />
                  <InfoRow label="انتهاء الاستمارة" value={registrationDaysRemaining === null ? 'غير محدد' : registrationDaysRemaining < 0 ? 'منتهية' : `بعد ${registrationDaysRemaining} يوم`} />
                </div>
              </CardContent>
            </Card>
          </motion.aside>

          <section className="min-w-0 space-y-5">
            <Card className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: vehicleTheme.border }}>
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: vehicleTheme.muted }}>لوحة القرار التشغيلي</p>
                  <h2 className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: vehicleTheme.text }}>{readinessState.label}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: vehicleTheme.muted }}>{readinessState.helper}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setShowReportDialog(true)} variant="outline" className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: vehicleTheme.border }}>
                      <FileText className="h-4 w-4" style={{ color: vehicleTheme.focus }} />
                      تقرير شامل
                    </Button>
                    <FeatureTourButton
                      tour={vehicleDetailsTours.contract}
                      onStart={setActiveFeatureTour}
                      className="h-10 gap-2 rounded-[8px] border bg-white"
                    />
                    <Button onClick={handleNewContract} className="h-10 gap-2 rounded-[8px] text-white" style={{ backgroundColor: vehicleTheme.success }}>
                      <Plus className="h-4 w-4" />
                      إنشاء عقد
                    </Button>
                  </div>
                </div>
                <div className="rounded-[8px] border p-4" style={{ borderColor: vehicleTheme.border, backgroundColor: vehicleTheme.inner }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: vehicleTheme.muted }}>نسبة الجاهزية</span>
                    <span className="font-mono text-3xl font-bold" style={{ color: readinessState.color }}>{readinessScore}%</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <InfoRow label="حالة التشغيل" value={getStatusText(vehicle.status)} />
                    <InfoRow label="الإيرادات المحصلة" value={formatCurrency(vehicleStats?.totalRevenue || 0)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label} className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: vehicleTheme.border }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${metric.color}14` }}>
                          <Icon className="h-5 w-5" style={{ color: metric.color }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: vehicleTheme.muted }}>{metric.label}</span>
                      </div>
                      <p className="mt-4 truncate text-2xl font-bold" style={{ color: metric.color }}>{metric.value}</p>
                      <p className="mt-1 truncate text-sm" style={{ color: vehicleTheme.muted }}>{metric.helper}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: vehicleTheme.border }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="grid min-h-[640px] lg:grid-cols-[230px_minmax(0,1fr)]">
                <div className="border-b p-3 lg:border-b-0 lg:border-l" style={{ borderColor: vehicleTheme.border }}>
                  <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 lg:flex-col lg:overflow-visible">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.value;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="vehicle-tab-trigger h-11 w-auto shrink-0 justify-start gap-2 rounded-[8px] border px-3 text-sm font-semibold shadow-none transition data-[state=active]:shadow-none lg:w-full"
                          style={{
                            backgroundColor: active ? vehicleTheme.text : vehicleTheme.surface,
                            borderColor: active ? vehicleTheme.text : vehicleTheme.border,
                            color: active ? '#FFFFFF' : vehicleTheme.text,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <div className="min-w-0 p-4 sm:p-5">
                  <TabsContent value="overview" className="mt-0">
                    <OverviewTab vehicle={vehicle} formatCurrency={formatCurrency} />
                  </TabsContent>
                  <TabsContent value="technical" className="mt-0">
                    <TechnicalTab vehicle={vehicle} />
                  </TabsContent>
                  <TabsContent value="financial" className="mt-0">
                    <FinancialTab vehicle={vehicle} formatCurrency={formatCurrency} />
                  </TabsContent>
                  <TabsContent value="pricing" className="mt-0">
                    <VehiclePricingPanel vehicleId={vehicle.id} />
                  </TabsContent>
                  <TabsContent value="insurance" className="mt-0">
                    <VehicleInsurancePanel vehicleId={vehicle.id} />
                  </TabsContent>
                  <TabsContent value="contracts" className="mt-0">
                    <ContractsTab contracts={contracts} getCustomerName={getCustomerName} formatCurrency={formatCurrency} vehicleId={vehicleId} onNewContract={handleNewContract} />
                  </TabsContent>
                  <TabsContent value="maintenance" className="mt-0">
                    <MaintenanceTab maintenanceRecords={maintenanceRecords} formatCurrency={formatCurrency} vehicleId={vehicleId} onNewMaintenance={() => setShowMaintenanceForm(true)} />
                  </TabsContent>
                  <TabsContent value="violations" className="mt-0">
                    <ViolationsTab violations={violations} formatCurrency={formatCurrency} onNewViolation={handleNewViolation} vehicleId={vehicleId} />
                  </TabsContent>
                  <TabsContent value="documents" className="mt-0">
                    <VehicleDocumentsPanel vehicleId={vehicle.id} onDocumentAdd={() => {}} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </section>
        </div>
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

      {/* Vehicle Comprehensive Report Dialog */}
      {vehicleId && (
        <VehicleComprehensiveReportDialog 
          open={showReportDialog} 
          onOpenChange={setShowReportDialog} 
          vehicleId={vehicleId} 
        />
      )}

      {/* Vehicle Status Change Dialog */}
      {vehicle && (
        <VehicleStatusChangeDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          vehicleId={vehicle.id}
          currentStatus={vehicle.status}
          currentNotes={vehicle.notes}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId, companyId] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          }}
        />
      )}

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={vehicleImage}
        alt={vehicleName}
      />
      <FeatureTourDialog tour={activeFeatureTour} onOpenChange={(open) => !open && setActiveFeatureTour(null)} />
    </div>
  );
};

// مكونات التبويبات الفرعية

// تبويب نظرة عامة
interface OverviewTabProps {
  vehicle: Vehicle;
  formatCurrency: (amount: number) => string;
}

interface VehicleChipProps {
  label: string;
  value?: string | number;
  color: string;
}

const VehicleChip = ({ label, value, color }: VehicleChipProps) => (
  <div
    className="rounded-[8px] border px-3 py-2"
    style={{ backgroundColor: vehicleTheme.inner, borderColor: vehicleTheme.border }}
  >
    <div className="mb-1 flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-semibold" style={{ color: vehicleTheme.muted }}>{label}</span>
    </div>
    <p className="truncate text-sm font-bold" style={{ color: vehicleTheme.text }}>{value || '-'}</p>
  </div>
);

const OverviewTab = ({ vehicle, formatCurrency }: OverviewTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* المعلومات الأساسية */}
    <Card className="bg-slate-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="w-5 h-5 text-[#00A896]" />
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
    <Card className="bg-slate-50">
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
        <InfoRow label="المسافة المقطوعة" value={vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('en-US')} كم` : undefined} />
      </CardContent>
    </Card>

    {/* التسعير */}
    <Card className="bg-slate-50">
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
    <span className="text-slate-600">{label}</span>
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
    <Card className="bg-slate-50">
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

    <Card className="bg-slate-50">
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
    <Card className="bg-slate-50">
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

    <Card className="bg-slate-50">
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
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

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
      <div className="flex items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-semibold text-slate-900">العقود المرتبطة بالمركبة</h3>
        <div className="flex flex-wrap justify-end gap-2">
          <FeatureTourButton tour={vehicleDetailsTours.contract} onStart={setActiveTour} />
          <Button className="gap-2 bg-[#00A896] hover:bg-[#007D6D]" onClick={handleClick}>
            <Plus className="w-4 h-4" />
            عقد جديد
          </Button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
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
                        <h4 className="font-semibold text-slate-900 mb-1">
                          عقد #{contract.contract_number}
                        </h4>
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600">العميل: {customerName}</p>
                    </div>
                    <Badge className={contract.status === 'active' ? 'status-available' : 'bg-slate-100'}>
                      {contract.status === 'active' ? 'نشط' : contract.status === 'completed' ? 'مكتمل' : contract.status === 'cancelled' ? 'ملغي' : contract.status === 'pending' ? 'قيد الانتظار' : contract.status === 'expired' ? 'منتهي' : contract.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">البداية</div>
                      <div className="font-semibold">
                        {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">النهاية</div>
                      <div className="font-semibold">
                        {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">الإيجار الشهري</div>
                      <div className="font-semibold">{formatCurrency(contract.monthly_amount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">المتبقي</div>
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
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
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
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);
  
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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">سجل الصيانة</h3>
        <div className="flex flex-wrap justify-end gap-2">
          <FeatureTourButton tour={vehicleDetailsTours.maintenance} onStart={setActiveTour} />
          <Button 
            onClick={handleNewMaintenance}
            className="gap-2 bg-[#00A896] hover:bg-[#007D6D]"
          >
            <Plus className="w-4 h-4" />
            تسجيل صيانة
          </Button>
        </div>
      </div>

      {maintenanceRecords.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
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
                  <h4 className="font-semibold text-slate-900 mb-1">
                    {record.maintenance_type || 'صيانة'}
                    {record.maintenance_number && ` (#${record.maintenance_number})`}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
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
                  <p className="text-sm text-slate-600 mb-2">
                    التكلفة: {formatCurrency(record.actual_cost || record.estimated_cost || 0)} 
                    {record.mileage_at_service && ` • المسافة: ${record.mileage_at_service.toLocaleString('en-US')} كم`}
                  </p>
                  {record.description && (
                    <p className="text-sm text-slate-500">{record.description}</p>
                  )}
                  {record.notes && (
                    <p className="text-sm text-slate-400 mt-1">{record.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
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
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">المخالفات المرورية</h3>
        <div className="flex flex-wrap justify-end gap-2">
          <FeatureTourButton tour={vehicleDetailsTours.violations} onStart={setActiveTour} />
          <Button 
            onClick={handleNewViolation}
            className="gap-2 bg-[#00A896] hover:bg-[#007D6D]"
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
          <CardContent className="p-8 text-center text-slate-500">
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
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {violation.violation_type || 'مخالفة مرورية'}
                    </h4>
                    <p className="text-sm text-slate-600">
                      رقم المخالفة: #{violation.violation_number || violation.id.substring(0, 8)}
                    </p>
                  </div>
                  <Badge className={violation.payment_status === 'paid' ? 'bg-[#E6F7F4] text-[#00A896]' : 'bg-[#E6F7F4] text-[#00A896]'}>
                    {violation.payment_status === 'paid' ? 'مدفوعة' : 'معلقة'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">التاريخ</div>
                    <div className="font-semibold">
                      {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">المبلغ</div>
                    <div className="font-semibold text-[#00A896]">
                      {formatCurrency(violation.fine_amount || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">الحالة</div>
                    <div className="font-semibold">
                      {violation.payment_status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">المسؤول</div>
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
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />
    </div>
  );
};

export default VehicleDetailsPage;






