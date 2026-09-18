/**
 * مكون صفحة تفاصيل المركبة
 * صفحة شاملة لعرض جميع معلومات وبيانات المركبة
 * 
 * @component VehicleDetailsPage
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './vehicle-details/vehicle-details.css';
import { vehicleRentalDecision, vehicleDetailTabs, resolveVehicleTab, fetchVehicleHistory } from './vehicle-details/vehicleDetailsModel';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  Edit3,
  Wrench,
  CheckCircle,
  FileText,
  Settings,
  Tag,
  AlertTriangle,
  Plus,
  Car,
  ChevronLeft,
  RefreshCw,
  ShieldCheck,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { VehiclePricingPanel } from './VehiclePricingPanel';
import { VehicleDocumentsPanel } from './VehicleDocumentsPanel';
import { VehicleTrafficFilesCard } from './VehicleTrafficFilesCard';
import { VehicleInsurancePanel } from './VehicleInsurancePanel';
import { VehicleForm } from './VehicleForm';
import { MaintenanceForm } from './MaintenanceForm';
import { TrafficViolationForm } from './TrafficViolationForm';
import { VehicleComprehensiveReportDialog } from './VehicleComprehensiveReportDialog';
import { VehicleStatusChangeDialog } from './VehicleStatusChangeDialog';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from '@/components/common/FeatureTourGuide';
import { cn } from '@/lib/utils';

import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Vehicle } from '@/hooks/useVehicles';
import {
  isContractOccupyingVehicle,
} from '@/utils/vehicleOperationalStatus';

const vehicleDetailsTours = {
  page: {
    title: 'جولة صفحة تفاصيل المركبة',
    description: 'شرح سريع لطريقة قراءة ملف المركبة واتخاذ القرار التشغيلي من نفس الصفحة.',
    steps: [
      'ابدأ من هوية المركبة في الأعلى: الصورة واللوحة والحالة والموقع.',
      'استخدم أزرار عقد، الحالة، صيانة، ومخالفة لتنفيذ الإجراءات اليومية المرتبطة بهذه المركبة.',
      'راجع ملخص التشغيل لمعرفة العقد الحالي والصيانة المفتوحة والمخالفات غير المدفوعة وانتهاء الاستمارة.',
      'لوحة التشغيل توضح إشغال المركبة وتتيح فتح العقد المرتبط مباشرة.',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = resolveVehicleTab(searchParams.get('tab'));
  const activeTab = selectedTab.value;
  const setActiveTab = (value: string) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set('tab', resolveVehicleTab(value).value);
    return next;
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // جلب عقود المركبة
  const { data: contracts = [], isLoading: loadingContracts, error: contractsError } = useQuery({
    queryKey: ['vehicle-contracts', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];

      return fetchVehicleHistory((from, to) => supabase
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
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }).order('id').range(from, to));
    },
    enabled: !!vehicleId && !!companyId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // جلب سجل الصيانة
  const { data: maintenanceRecords = [], isLoading: loadingMaintenance, error: maintenanceError } = useQuery({
    queryKey: ['vehicle-maintenance', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];

      return fetchVehicleHistory((from, to) => supabase
        .from('vehicle_maintenance').select('*')
        .eq('vehicle_id', vehicleId).eq('company_id', companyId)
        .order('created_at', { ascending: false }).order('id').range(from, to));
    },
    enabled: !!vehicleId && !!companyId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // جلب المخالفات المرورية
  const { data: violations = [], isLoading: loadingViolations, error: violationsError } = useQuery({
    queryKey: ['vehicle-violations', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];

      const data = await fetchVehicleHistory((from, to) => supabase
        .from('penalties').select('*')
        .eq('vehicle_id', vehicleId).eq('company_id', companyId)
        .order('penalty_date', { ascending: false }).order('id').range(from, to));
      return (data || []).map((violation) => ({
        ...violation,
        violation_number: violation.penalty_number,
        violation_date: violation.penalty_date,
        fine_amount: violation.amount,
        total_amount: violation.amount,
        responsible_party: violation.customer_id ? 'customer' : 'company',
      }));
    },
    enabled: !!vehicleId && !!companyId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const operation = vehicleRentalDecision(vehicle || {}, contracts, maintenanceRecords, !!(vehicleError || contractsError || maintenanceError));
  const refresh = useCallback(async () => {
    await Promise.all(['vehicle-details', 'vehicle-contracts', 'vehicle-maintenance', 'vehicle-violations', 'vehicles'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })));
  }, [queryClient]);

  // معالجات الأحداث
  const handleEdit = useCallback(() => {
    if (!vehicle) return;
    setShowEditForm(true);
  }, [vehicle]);

  const handleNewContract = useCallback(() => {
    if (!vehicleId) {
      toast({
        title: 'خطأ',
        description: 'معرف المركبة غير متوفر.',
        variant: 'destructive'
      });
      return;
    }
    if (!operation.canRent || loadingContracts || loadingMaintenance) {
      toast({ title: operation.label, description: operation.reason, variant: 'destructive' });
      return;
    }
    navigate('/contracts?vehicle=' + vehicleId);
  }, [navigate, vehicleId, toast, operation.canRent, operation.label, operation.reason, loadingContracts, loadingMaintenance]);

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
  const getStatusText = (status?: string): string => {
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
    return status ? (texts[status] || status) : 'غير محددة';
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

  const primaryContract = contracts.find((contract) => isContractOccupyingVehicle(contract));
  const pendingViolations = violations.filter((violation) => {
    const status = violation.payment_status || violation.status;
    return status !== 'paid' && status !== 'settled';
  });
  const openMaintenance = maintenanceRecords.filter((record) => !['completed', 'cancelled', 'canceled'].includes(record.status || ''));
  const totalPendingViolations = pendingViolations.reduce((sum, violation) => sum + Number(violation.total_amount || violation.fine_amount || 0), 0);
  const registrationDaysRemaining = vehicle.registration_expiry
    ? differenceInDays(new Date(vehicle.registration_expiry), new Date())
    : null;
  return (
    <div className="vehicle-workspace" dir="rtl">
      <header className="vehicle-toolbar">
        <nav aria-label="مسار ملف المركبة"><Link to="/fleet">الأسطول</Link><ChevronLeft size={14} /><span>ملف المركبة</span><ChevronLeft size={14} /><strong dir="ltr">{vehicle.plate_number}</strong></nav>
        <div className="vehicle-actions">
          <Button variant="ghost" size="icon" aria-label="تحديث بيانات المركبة" onClick={refresh}><RefreshCw size={17} /></Button>
          <Button variant="outline" onClick={() => setShowReportDialog(true)}><FileText size={16} />التقرير الشامل</Button>
          <Button variant="outline" onClick={handleEdit}><Edit3 size={16} />تعديل البيانات</Button>
        </div>
      </header>
      <main className="vehicle-canvas">
        <section className="vehicle-identity" aria-label="هوية المركبة">
          <div className="vehicle-identity-copy">
            <span className="vehicle-eyebrow">إدارة الأسطول <span>/</span> ملف المركبة</span>
            <h1>{vehicle.make} <span>{vehicle.model}</span></h1>
            <div className="vehicle-identity-meta"><span>{vehicle.year || 'السنة غير مسجلة'}</span><span>{vehicle.color_ar || vehicle.color || 'اللون غير مسجل'}</span><span><MapPin size={14} />{vehicle.current_location || vehicle.location || 'الموقع غير مسجل'}</span></div>
            <div className="vehicle-plate-row"><div className="vehicle-plate"><span>قطر<small>QATAR</small></span><strong dir="ltr">{vehicle.plate_number}</strong></div><Badge className="vehicle-status" data-status={vehicle.status}>{getStatusText(vehicle.status)}</Badge></div>
            <p className="vehicle-vin">رقم الهيكل <span dir="ltr">{vehicle.vin || vehicle.vin_number || 'غير مسجل'}</span></p>
          </div>
          <div className="vehicle-image-area">
            {vehicleImage ? <button type="button" aria-label="معاينة صورة المركبة" onClick={() => setShowImagePreview(true)}><img src={vehicleImage} alt={vehicleName} /></button> : <div className="vehicle-image-placeholder"><Car strokeWidth={1} /><span>صورة المركبة غير مضافة</span><Button variant="ghost" size="sm" onClick={handleEdit}>إضافة صورة <Plus size={14} /></Button></div>}
            <span className="vehicle-image-caption">{vehicle.make} · {vehicle.model} · {vehicle.year}</span>
          </div>
        </section>
        <section className="vehicle-operation" data-available={operation.canRent} aria-label="الحالة التشغيلية">
          <div className="vehicle-operation-icon">{operation.canRent ? <ShieldCheck /> : <FileText />}</div>
          <div className="vehicle-operation-copy"><span className="vehicle-eyebrow">التشغيل والعقود</span><h2>{operation.label}</h2><p>{operation.reason}</p>
            {vehicle.status === 'available' && operation.occupying.length > 0 && <p role="alert">الحالة المسجلة «متاحة» تتعارض مع إشغال العقد؛ يلزم مراجعة التشغيل.</p>}
          </div>
          <div className="vehicle-actions">
            {primaryContract && <Button asChild className="vehicle-primary"><Link to={'/contracts/' + encodeURIComponent(primaryContract.contract_number || primaryContract.id)}>فتح العقد {primaryContract.contract_number}<ChevronLeft size={16} /></Link></Button>}
            {operation.canRent && <Button className="vehicle-primary" onClick={handleNewContract}><Plus size={17} />إنشاء عقد</Button>}
            <Button variant="outline" onClick={() => setShowStatusDialog(true)}>إدارة الحالة</Button>
          </div>
        </section>
        <div className="vehicle-pulse">
          <button onClick={() => setActiveTab('contracts')}><FileText /><span>عقود تشغل المركبة<strong>{contractsError ? '—' : operation.occupying.length}</strong><small>{contractsError ? 'تعذر التحقق من العقود' : primaryContract ? getCustomerName(primaryContract.customer) : 'لا يوجد إشغال حالي'}</small></span><ChevronLeft size={16} /></button>
          <button onClick={() => setActiveTab('maintenance')}><Wrench /><span>صيانة مفتوحة<strong>{maintenanceError ? '—' : openMaintenance.length}</strong><small>طلبات تحتاج متابعة</small></span><ChevronLeft size={16} /></button>
          <button onClick={() => setActiveTab('violations')}><AlertTriangle /><span>مخالفات غير مسددة<strong>{violationsError ? '—' : formatCurrency(totalPendingViolations)}</strong><small>{violationsError ? 'تعذر تحميل المخالفات' : pendingViolations.length + ' مخالفة مسجلة'}</small></span><ChevronLeft size={16} /></button>
          <button onClick={() => setActiveTab('insurance')}><CalendarDays /><span>انتهاء الاستمارة<strong>{registrationDaysRemaining === null ? 'غير مسجل' : registrationDaysRemaining < 0 ? 'منتهية' : registrationDaysRemaining + ' يوم'}</strong><small>{vehicle.registration_expiry || 'أضف بيانات التسجيل'}</small></span><ChevronLeft size={16} /></button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="vehicle-sections">
          <TabsList className="vehicle-section-nav" aria-label="أقسام ملف المركبة">
            {vehicleDetailTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}{tab.value === 'contracts' && !contractsError && <span>{contracts.length}</span>}</TabsTrigger>)}
          </TabsList>
          <div className="vehicle-section-heading"><div><span className="vehicle-eyebrow">ملف {vehicle.plate_number}</span><h2>{selectedTab.label}</h2><p>{selectedTab.description}</p></div><span className="vehicle-section-index">{String(vehicleDetailTabs.findIndex(tab => tab.value === activeTab) + 1).padStart(2, '0')} <small>/ 09</small></span></div>
          <div className="vehicle-section-body">
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
                    <div className="vehicle-base-rates">
                      <div><span>التعرفة اليومية الأساسية</span><strong>{vehicle.daily_rate != null ? formatCurrency(vehicle.daily_rate) : 'غير مسجلة'}</strong></div>
                      <div><span>التعرفة الأسبوعية الأساسية</span><strong>{vehicle.weekly_rate != null ? formatCurrency(vehicle.weekly_rate) : 'غير مسجلة'}</strong></div>
                      <div><span>التعرفة الشهرية الأساسية</span><strong>{vehicle.monthly_rate != null ? formatCurrency(vehicle.monthly_rate) : 'غير مسجلة'}</strong></div>
                    </div>
                    <VehiclePricingPanel vehicleId={vehicle.id} />
                  </TabsContent>
                  <TabsContent value="insurance" className="mt-0">
                    <VehicleInsurancePanel vehicleId={vehicle.id} />
                  </TabsContent>
                  <TabsContent value="contracts" className="mt-0">
                    {contractsError ? <HistoryError error={contractsError} onRetry={refresh} /> : <ContractsTab contracts={contracts} getCustomerName={getCustomerName} formatCurrency={formatCurrency} vehicleId={vehicleId} onNewContract={handleNewContract} canRent={operation.canRent} />}
                  </TabsContent>
                  <TabsContent value="maintenance" className="mt-0">
                    {maintenanceError ? <HistoryError error={maintenanceError} onRetry={refresh} /> : <MaintenanceTab maintenanceRecords={maintenanceRecords} formatCurrency={formatCurrency} vehicleId={vehicleId} onNewMaintenance={() => setShowMaintenanceForm(true)} />}
                  </TabsContent>
                  <TabsContent value="violations" className="mt-0">
                    {violationsError ? <HistoryError error={violationsError} onRetry={refresh} /> : <ViolationsTab violations={violations} formatCurrency={formatCurrency} onNewViolation={handleNewViolation} vehicleId={vehicleId} />}
                  </TabsContent>
                  <TabsContent value="documents" className="mt-0">
                    <VehicleDocumentsPanel vehicleId={vehicle.id} onDocumentAdd={() => {}} />
                  </TabsContent>
          </div>
        </Tabs>
        <footer className="vehicle-footer"><span>آخر تحديث للبيانات المسجلة: {vehicle.updated_at ? format(new Date(vehicle.updated_at), 'dd/MM/yyyy HH:mm') : 'غير متوفر'}</span><span>جميع المبالغ بالعملة المعتمدة للشركة</span></footer>
      </main>
      {/* Vehicle Form Dialog */}
      <VehicleForm 
        vehicle={vehicle || undefined}
        open={showEditForm}
        onOpenChange={(open) => {
          setShowEditForm(open);
          if (!open) {
            // Invalidate queries when dialog closes to refresh vehicle data
            void refresh();
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
            void refresh();
          }
        }}
      />

      {/* Traffic Violation Form Dialog */}
      <Dialog open={showViolationForm} onOpenChange={setShowViolationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>تسجيل مخالفة للمركبة {vehicle.plate_number}</DialogTitle>
          <DialogDescription>أدخل تفاصيل المخالفة لربطها بالمركبة والعقد المسؤول.</DialogDescription>
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
          occupancyNotice={operation.reason}
          onSuccess={() => {
            void refresh();
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
          value={vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : vehicle.transmission_type === 'manual' ? 'يدوي' : undefined}
        />
        <InfoRow
          label="نوع الوقود"
          value={
            ['gasoline', 'petrol'].includes(vehicle.fuel_type || '') ? 'بنزين' :
            vehicle.fuel_type === 'diesel' ? 'ديزل' :
            vehicle.fuel_type === 'hybrid' ? 'هجين' : vehicle.fuel_type === 'electric' ? 'كهربائي' : undefined
          }
        />
        <InfoRow label="المسافة المقطوعة" value={vehicle.current_mileage != null ? `${vehicle.current_mileage.toLocaleString('en-US')} كم` : undefined} />
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
  <div className="vehicle-info-row">
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
            vehicle.vehicle_condition === 'fair' ? 'مقبولة' : vehicle.vehicle_condition === 'poor' ? 'ضعيفة' : undefined
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
        <InfoRow label="القيمة الحالية" value={vehicle.book_value ? formatCurrency(vehicle.book_value) : undefined} />
        <InfoRow
          label="الإهلاك"
          value={
            vehicle.purchase_cost && vehicle.book_value
              ? formatCurrency(vehicle.purchase_cost - vehicle.book_value)
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
        <InfoRow label="شركة التأمين" value={vehicle.insurance_provider} />
        <InfoRow label="رقم البوليصة" value={vehicle.insurance_policy_number} mono />
        <InfoRow
          label="تاريخ الانتهاء"
          value={vehicle.insurance_expiry ? format(new Date(vehicle.insurance_expiry), 'dd/MM/yyyy') : undefined}
        />
        <InfoRow label="قيمة التأمين" value={vehicle.insurance_premium_amount ? formatCurrency(vehicle.insurance_premium_amount) : undefined} />
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
  canRent: boolean;
}

const ContractsTab = ({ contracts, getCustomerName, formatCurrency, vehicleId, onNewContract, canRent }: ContractsTabProps) => {
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
          <Button className="gap-2 bg-[#00A896] hover:bg-[#007D6D]" onClick={handleClick} disabled={!canRent}>
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
                className="vehicle-contract-record"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link className="vehicle-contract-link" to={"/contracts/" + encodeURIComponent(contract.contract_number || contract.id)}>عقد #{contract.contract_number}</Link>
                        {isContractOccupyingVehicle(contract) && <Badge className="vehicle-occupancy-badge">يشغل المركبة الآن</Badge>}
                        {contract.vehicle_returned && <Badge variant="outline">تم إرجاع المركبة</Badge>}
                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600">العميل: {customerName}</p>
                    </div>
                    <Badge className={contract.status === 'active' ? 'status-available' : 'bg-slate-100'}>
                      {contract.status === 'active' ? 'نشط' : contract.status === 'completed' ? 'مكتمل' : contract.status === 'cancelled' ? 'ملغي' : contract.status === 'pending' ? 'قيد الانتظار' : contract.status === 'expired' ? 'منتهي' : contract.status === 'under_legal_procedure' ? 'إجراء قانوني' : contract.status === 'suspended' ? 'معلق' : contract.status}
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
      {vehicleId && <VehicleTrafficFilesCard vehicleId={vehicleId} />}

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
                  <Badge className={['paid', 'settled'].includes(violation.payment_status) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}>
                    {['paid', 'settled'].includes(violation.payment_status) ? 'مدفوعة' : 'معلقة'}
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
                      {['paid', 'settled'].includes(violation.payment_status) ? 'مدفوعة' : 'غير مدفوعة'}
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

function HistoryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return error ? <div role="alert" className="vehicle-history-error">تعذر تحميل هذا السجل. قد تكون البيانات المعروضة غير مكتملة.<Button variant="outline" onClick={onRetry}>إعادة المحاولة</Button></div> : null;
}

export default VehicleDetailsPage;




