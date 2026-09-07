import { OperationsWorkspace, OperationsMetric, OperationsPanel, OperationsEmpty } from '@/components/operations/OperationsWorkspace';
import { pageNumbers, downloadOperationsCsv } from '@/components/operations/operationsPresentation';
/**
 * Fleet Maintenance Page - Modern Professional Design
 * Enhanced visual hierarchy with improved information architecture
 *
 * @component MaintenanceRedesigned
 */

/**
 * Fleet Maintenance Page - Modern Professional Design
 * Enhanced visual hierarchy with improved information architecture
 *
 * @component MaintenanceRedesigned
 */
import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, RefreshCw, Eye, Trash2, Car, Wrench, AlertTriangle, ShieldCheck, Calendar, List, CheckCircle, Clock, MoreHorizontal, Download, X, ChevronRight, ChevronLeft, DollarSign, AlertCircle, HelpCircle, PlayCircle } from "lucide-react";

import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles";
import { useCompleteMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useVehicleMaintenance, useDeleteVehicleMaintenance, useUpdateVehicleMaintenance } from "@/hooks/useVehicles";
import { useMaintenanceStats } from "@/hooks/useMaintenanceStats";


import { toast } from "sonner";
import { MaintenanceSidePanel } from "@/components/fleet/MaintenanceSidePanel";
import { MaintenanceAlertsPanel } from "@/components/fleet/MaintenanceAlertsPanel";


const maintenanceTheme = {
  text:'#203B43', surface:'#FFFFFF', inner:'#F5F5F0', muted:'#627780', border:'#DCE2D8',
  water:'#315C68', alert:'#AC4E3D', focus:'#956E3D', success:'#2E755D',
};

// Lazy load components
const MaintenanceForm = lazy(() =>
  import("@/components/fleet/MaintenanceForm").then(m => ({ default: m.MaintenanceForm }))
);

// ===== Constants =====
const statusConfig = {
  pending: { label: 'معلقة', accent: maintenanceTheme.water },
  in_progress: { label: 'قيد المعالجة', accent: maintenanceTheme.focus },
  completed: { label: 'مكتملة', accent: maintenanceTheme.success },
  cancelled: { label: 'ملغاة', accent: maintenanceTheme.muted },
};

const priorityConfig = {
  low: { label: 'منخفضة', accent: maintenanceTheme.water, icon: '↓' },
  medium: { label: 'متوسطة', accent: maintenanceTheme.focus, icon: '→' },
  high: { label: 'عالية', accent: maintenanceTheme.alert, icon: '↑' },
  urgent: { label: 'عاجلة', accent: maintenanceTheme.alert, icon: '!' },
};

const maintenanceTypeConfig = {
  routine: { label: 'صيانة دورية', icon: RefreshCw, accent: maintenanceTheme.water },
  repair: { label: 'إصلاح', icon: Wrench, accent: maintenanceTheme.focus },
  emergency: { label: 'صيانة طارئة', icon: AlertTriangle, accent: maintenanceTheme.alert },
  preventive: { label: 'صيانة وقائية', icon: ShieldCheck, accent: maintenanceTheme.success },
  maintenance: { label: 'صيانة', icon: Wrench, accent: maintenanceTheme.muted },
  historical_excel_import: { label: 'صيانة سابقة', icon: Wrench, accent: maintenanceTheme.muted },
};

type MaintenanceTourContent = {
  title: string;
  description: string;
  steps: string[];
};

type MaintenanceFeatureAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tour: MaintenanceTourContent;
  onConfirm: () => void;
};

const maintenanceTours = {
  create: {
    title: 'جولة جدولة الصيانة',
    description: 'شرح سريع لطريقة إنشاء طلب صيانة وربطه بالمركبة والتكلفة ومركز التكلفة.',
    steps: [
      'اختر المركبة التي تحتاج صيانة، أو افتح النموذج من صفحة المركبة ليتم تحديدها تلقائيًا.',
      'حدد نوع الصيانة والأولوية والوصف حتى يعرف الفريق المطلوب تنفيذه.',
      'أضف التاريخ المتوقع والتكلفة وطريقة الدفع ورقم فاتورة المورد عند توفرها.',
      'فعّل نقل المركبة إلى الصيانة إذا كانت ستخرج من التشغيل حتى نهاية العمل.',
      'اضغط جدولة الصيانة لحفظ الطلب وتحديث سجلات الأسطول.',
    ],
  },
  details: {
    title: 'جولة تفاصيل الصيانة',
    description: 'توضح لوحة التفاصيل حالة الطلب والمركبة والمورد والسجل والتكاليف.',
    steps: [
      'تبويب النظرة العامة يعرض التاريخ والحالة والتكلفة والوصف.',
      'تبويب المركبة يعرض اللوحة ومعلومات المركبة وسجل الصيانة المرتبط بها.',
      'تبويب المورد يوضح بيانات مزود الخدمة إذا كانت مسجلة.',
      'تبويب التكاليف يقارن التكلفة المقدرة بالتكلفة الفعلية.',
      'من أسفل اللوحة يمكنك تعديل الطلب أو بدءه أو إكماله أو إلغاؤه حسب الحالة.',
    ],
  },
  status: {
    title: 'جولة تغيير حالة الصيانة',
    description: 'شرح تأثير بدء أو إكمال طلب الصيانة قبل تنفيذ الإجراء.',
    steps: [
      'بدء الصيانة ينقل الطلب إلى قيد المعالجة ويجعل المركبة تحت المتابعة.',
      'إكمال الصيانة يغلق الطلب ويحدث الحالة التشغيلية المرتبطة بالمركبة.',
      'راجع رقم الطلب والمركبة قبل التأكيد لأن الإجراء يؤثر على تقارير التشغيل.',
    ],
  },
  delete: {
    title: 'جولة إلغاء طلب الصيانة',
    description: 'يوضح ما يحدث عند إلغاء طلب الصيانة وما يجب مراجعته قبل التأكيد.',
    steps: [
      'الإلغاء يوقف الطلب مع الاحتفاظ بسجله للتدقيق.',
      'إذا كانت المركبة في حالة صيانة بسبب هذا الطلب فقد تعود إلى متاحة.',
      'الطلبات المرتبطة بقيود تحتاج عكسًا محاسبيًا معتمدًا قبل الإلغاء.',
    ],
  },
  export: {
    title: 'جولة تصدير الصيانة',
    description: 'شرح طريقة تصدير سجلات الصيانة الحالية.',
    steps: [
      'التصدير يجب أن يعتمد على الفلاتر الحالية في الصفحة.',
      'استخدم البحث والحالة والنوع والأولوية لتحديد البيانات المطلوبة.',
      'بعدها اضغط تصدير الآن لتنزيل ملف CSV مطابق للبحث والفلاتر.',
    ],
  },
  navigation: {
    title: 'جولة التنقل في الصيانة',
    description: 'شرح طريقة الانتقال بين اللوحة والقائمة والمركبات المرتبطة بالصيانة.',
    steps: [
      'استخدم لوحة الصيانة لمتابعة المؤشرات والتنبيهات والملخصات السريعة.',
      'استخدم القائمة عندما تريد البحث والتصفية ومراجعة كل طلبات الصيانة.',
      'أزرار عرض الكل تنقلك إلى القائمة مع الفلتر المناسب بدل البحث اليدوي.',
      'عرض المركبة يفتح ملف المركبة لمراجعة العقود والحالة التشغيلية والسجل.',
    ],
  },
  filters: {
    title: 'جولة البحث والفلاتر',
    description: 'شرح طريقة تضييق نتائج الصيانة وإعادة ضبطها.',
    steps: [
      'ابحث برقم طلب الصيانة أو رقم لوحة المركبة أو نوع الصيانة.',
      'فلتر الحالة يفرق بين المعلقة وقيد المعالجة والمكتملة والملغاة.',
      'فلتر النوع والأولوية يساعدان في متابعة الطوارئ والصيانة الوقائية.',
      'زر تصفير يعيد القائمة إلى كل السجلات بدون فلاتر نشطة.',
    ],
  },
  metrics: {
    title: 'جولة بطاقات مؤشرات الصيانة',
    description: 'شرح الأرقام المختصرة أعلى صفحة الصيانة وكيفية استخدامها.',
    steps: [
      'بطاقة الطلبات النشطة تعرض الطلبات المفتوحة وما هو قيد المعالجة.',
      'بطاقة المركبات في الصيانة تساعدك في معرفة المركبات غير الجاهزة للتشغيل.',
      'بطاقة المكتملة هذا الشهر تتابع الإنتاجية الشهرية لفريق الصيانة.',
      'بطاقة تكلفة الشهر تعرض إجمالي تكلفة الصيانة للشهر الحالي.',
    ],
  },
} satisfies Record<string, MaintenanceTourContent>;

function FeatureTourButton({
  tour,
  onStart,
}: {
  tour: MaintenanceTourContent;
  onStart: (tour: MaintenanceTourContent) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onStart(tour)}
      className="h-9 gap-2 rounded-[8px] border bg-white"
      style={{ borderColor: maintenanceTheme.border, color: maintenanceTheme.text }}
    >
      <PlayCircle className="h-4 w-4" style={{ color: maintenanceTheme.success }} />
      ابدأ الجولة التعريفية
    </Button>
  );
}

function FeatureTourDialog({
  tour,
  onOpenChange,
}: {
  tour: MaintenanceTourContent | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!tour} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[8px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5" style={{ color: maintenanceTheme.success }} />
            {tour?.title}
          </DialogTitle>
          <DialogDescription>{tour?.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {tour?.steps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-[8px] border bg-white p-3" style={{ borderColor: maintenanceTheme.border }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-sm font-bold text-white" style={{ backgroundColor: maintenanceTheme.success }}>
                {index + 1}
              </span>
              <p className="text-sm leading-6" style={{ color: maintenanceTheme.text }}>{step}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="rounded-[8px] text-white" style={{ backgroundColor: maintenanceTheme.success }}>
            فهمت
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Maintenance Record Card =====
interface MaintenanceRecordCardProps {
  record: any;
  index: number;
  onView: () => void;
  onComplete: () => void;
  onStartProgress: () => void;
  onDelete: () => void;
}

const MaintenanceRecordCard: React.FC<MaintenanceRecordCardProps> = ({
  record,
  index,
  onView,
  onComplete,
  onStartProgress,
  onDelete
}) => {
  const typeConfig = maintenanceTypeConfig[record.maintenance_type as keyof typeof maintenanceTypeConfig] || maintenanceTypeConfig.maintenance;
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
  const priority = priorityConfig[record.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.28 }}
      className="opw-maintenance-record group overflow-hidden rounded-[8px] border bg-white"
      style={{ borderColor: maintenanceTheme.border }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: status.accent }} />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${typeConfig.accent}14` }}>
              <TypeIcon className="h-5 w-5" style={{ color: typeConfig.accent }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold" style={{ color: maintenanceTheme.text }}><button onClick={onView} aria-label={'فتح طلب الصيانة ' + (record.maintenance_number || '')}>{record.maintenance_number || 'طلب صيانة'}</button></h3>
                <Badge className="rounded-[8px] border px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${status.accent}14`, borderColor: `${status.accent}44`, color: status.accent }}>
                  {status.label}
                </Badge>
              </div>

              {record.vehicles && (
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" style={{ color: maintenanceTheme.muted }}>
                  <Car className="h-4 w-4 shrink-0" style={{ color: maintenanceTheme.water }} />
                  <span className="font-bold" style={{ color: maintenanceTheme.text }}>{record.vehicles.plate_number}</span>
                  {record.vehicles.make && <span>{record.vehicles.make} {record.vehicles.model}</span>}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: maintenanceTheme.muted }}>
                <span>{typeConfig.label}</span>
                {record.estimated_cost != null && (
                  <>
                    <span>·</span>
                    <span className="font-bold" style={{ color: maintenanceTheme.alert }}>{record.estimated_cost.toLocaleString()} ر.ق</span>
                  </>
                )}
                {record.scheduled_date && (
                  <>
                    <span>·</span>
                    <span>{new Date(record.scheduled_date).toLocaleDateString('ar-SA')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 lg:justify-end">
            <Badge className="rounded-[8px] border px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${priority.accent}14`, borderColor: `${priority.accent}44`, color: priority.accent }}>
              {priority.icon} {priority.label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label={'إجراءات الصيانة ' + (record.maintenance_number || '')} variant="ghost" size="sm" className="h-9 w-9 rounded-[8px] p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView} className="gap-2">
                  <Eye className="h-4 w-4" style={{ color: maintenanceTheme.water }} />
                  عرض التفاصيل
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {record.status === 'pending' && (
                  <DropdownMenuItem onClick={onStartProgress} className="gap-2">
                    <Clock className="h-4 w-4" style={{ color: maintenanceTheme.focus }} />
                    بدء الصيانة
                  </DropdownMenuItem>
                )}
                {record.status === 'in_progress' && (
                  <DropdownMenuItem onClick={onComplete} className="gap-2">
                    <CheckCircle className="h-4 w-4" style={{ color: maintenanceTheme.success }} />
                    إكمال الصيانة
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600">
                  <Trash2 className="h-4 w-4" />
                  إلغاء الطلب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== Vehicle in Maintenance Card =====
interface VehicleInMaintenanceCardProps {
  vehicle: any;
  index: number;
  onViewVehicle: () => void;
}

const VehicleInMaintenanceCard: React.FC<VehicleInMaintenanceCardProps> = ({ vehicle, index, onViewVehicle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.28 }}
      className="opw-vehicle overflow-hidden rounded-[8px] border bg-white"
      style={{ borderColor: `${maintenanceTheme.alert}44` }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: maintenanceTheme.alert }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${maintenanceTheme.alert}14` }}>
            <Car className="h-5 w-5" style={{ color: maintenanceTheme.alert }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: maintenanceTheme.text }}>{vehicle.plate_number}</h3>
              <Badge className="rounded-[8px] border" style={{ backgroundColor: `${maintenanceTheme.alert}14`, borderColor: `${maintenanceTheme.alert}44`, color: maintenanceTheme.alert }}>في الصيانة</Badge>
            </div>
            <p className="truncate text-sm font-semibold" style={{ color: maintenanceTheme.text }}>{vehicle.make} {vehicle.model} {vehicle.year}</p>
            {vehicle.current_mileage != null && (
              <p className="mt-1 text-xs" style={{ color: maintenanceTheme.muted }}>المسافة الحالية: {vehicle.current_mileage.toLocaleString()} كم</p>
            )}
            {vehicle.last_maintenance_date && (
              <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: maintenanceTheme.muted }}>
                <Calendar className="h-3 w-3" />
                آخر صيانة: {new Date(vehicle.last_maintenance_date).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewVehicle}
            className="shrink-0 rounded-[8px] border bg-white"
            style={{ borderColor: maintenanceTheme.border, color: maintenanceTheme.text }}
          >
            عرض
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
// ===== Main Component =====
export default function MaintenanceRedesigned() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [statusAction, setStatusAction] = useState<{ record: any; type: 'start' | 'complete' } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<MaintenanceTourContent | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Read vehicle parameter from URL
  useEffect(() => {
    const vehicleParam = searchParams.get('vehicle');
    if (vehicleParam) {
      setSelectedVehicleId(vehicleParam);
      setShowMaintenanceForm(true);
      setViewMode('list');
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('vehicle');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch data
  const { data: maintenanceRecords, isLoading: maintenanceLoading, error: maintenanceError, refetch } = useVehicleMaintenance(undefined, {
    limit: 100
  });

  const { data: maintenanceVehicles, isLoading: maintenanceVehiclesLoading } = useMaintenanceVehicles({
    limit: 50,
    enabled: true
  });

  // Stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useMaintenanceStats();

  const { formatCurrency } = useCurrencyFormatter();
  const completeMaintenanceStatus = useCompleteMaintenanceStatus();
  const deleteMaintenance = useDeleteVehicleMaintenance();
  const updateMaintenance = useUpdateVehicleMaintenance();

  // Filtering
  const filteredRecords = useMemo(() => {
    if (!maintenanceRecords) return [];

    return maintenanceRecords.filter(record => {
      const matchesSearch = !searchQuery ||
        record.maintenance_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.maintenance_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        maintenanceTypeConfig[record.maintenance_type as keyof typeof maintenanceTypeConfig]?.label.includes(searchQuery.trim());

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter || (statusFilter === 'overdue' && ['pending','in_progress'].includes(record.status) && Boolean(record.scheduled_date) && new Date(record.scheduled_date) < new Date(new Date().toDateString()));
      const matchesType = typeFilter === "all" || record.maintenance_type === typeFilter;
      const matchesPriority = priorityFilter === "all" || record.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [maintenanceRecords, searchQuery, statusFilter, typeFilter, priorityFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, typeFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Handlers
  const handleCreateNew = () => {
    setSelectedVehicleId(undefined);
    setEditingMaintenance(null);
    setShowMaintenanceForm(true);
  };

  const handleViewDetails = (record: any) => {
    setSelectedMaintenance(record);
    setSidePanelOpen(true);
  };

  const handleEditMaintenance = (maintenance: any) => {
    setEditingMaintenance(maintenance);
    setSelectedVehicleId(maintenance?.vehicle_id);
    setSidePanelOpen(false);
    setShowMaintenanceForm(true);
  };

  const handleCompleteMaintenance = async (record: any) => {
    try {
      await completeMaintenanceStatus.mutateAsync({ vehicleId: record.vehicle_id, maintenanceId: record.id });
      toast.success('تم إكمال الصيانة بنجاح');
      refetch();
    } catch (error) {
      toast.error('فشل إكمال الصيانة');
    }
  };

  const handleStartProgress = async (record: any) => {
    try {
      await updateMaintenance.mutateAsync({
        id: record.id,
        status: 'in_progress'
      });
      toast.success('تم بدء الصيانة');
      refetch();
    } catch (error) {
      toast.error('فشل بدء الصيانة');
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      await deleteMaintenance.mutateAsync({
        maintenanceId: recordToDelete.id,
        vehicleId: recordToDelete.vehicle_id || recordToDelete.vehicles?.id,
      });
      setRecordToDelete(null);
      refetch();
    } catch {
      // The mutation shows the precise accounting or validation reason.
    }
  };

  const handleExport = async () => {
    downloadOperationsCsv('maintenance-' + new Date().toISOString().slice(0,10) + '.csv', [
      ['رقم الطلب','لوحة المركبة','نوع الصيانة','الحالة','الأولوية','التاريخ المجدول','التكلفة المقدرة (ر.ق)','التكلفة الفعلية (ر.ق)'],
      ...filteredRecords.map(record => [record.maintenance_number, record.vehicles?.plate_number,
        maintenanceTypeConfig[record.maintenance_type as keyof typeof maintenanceTypeConfig]?.label || 'صيانة',
        statusConfig[record.status as keyof typeof statusConfig]?.label || 'غير محددة',
        priorityConfig[record.priority as keyof typeof priorityConfig]?.label || 'غير محددة',
        record.scheduled_date, record.estimated_cost, record.actual_cost]),
    ]);
    toast.success('تم تصدير ' + filteredRecords.length + ' سجل صيانة');
  };

  const handleConfirmStatusAction = async () => {
    if (!statusAction) return;

    if (statusAction.type === 'start') {
      await handleStartProgress(statusAction.record);
    } else {
      await handleCompleteMaintenance(statusAction.record);
    }

    setStatusAction(null);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setCurrentPage(1);
  };

  const openFeatureAction = (action: MaintenanceFeatureAction) => {
    action.onConfirm();
  };

  const openPaginationAction = (page: number) => setCurrentPage(page);

  const activeFiltersCount = [statusFilter, typeFilter, priorityFilter].filter(value => value !== 'all').length + (searchQuery ? 1 : 0);
  const maintenanceTypeSummary = [
    { label: 'دورية', count: stats?.routineCount || 0, icon: RefreshCw, color: maintenanceTheme.water },
    { label: 'إصلاح', count: stats?.repairCount || 0, icon: Wrench, color: maintenanceTheme.focus },
    { label: 'طوارئ', count: stats?.emergencyCount || 0, icon: AlertTriangle, color: maintenanceTheme.alert },
    { label: 'وقائية', count: stats?.preventiveCount || 0, icon: ShieldCheck, color: maintenanceTheme.success },
  ];

  if (maintenanceLoading || maintenanceError) return <OperationsWorkspace section="maintenance"><div className="opw-panel opw-empty" role={maintenanceError ? 'alert' : 'status'}><Wrench size={26}/><h3>{maintenanceError ? 'تعذّر تحميل طلبات الصيانة' : 'جارٍ تحميل سجل الصيانة…'}</h3><p>{maintenanceError ? 'أعد المحاولة للتحقق من السجل.' : 'نجهز بيانات الطلبات والمركبات.'}</p>{maintenanceError && <Button variant="outline" onClick={() => { void refetch(); }}>إعادة المحاولة</Button>}</div></OperationsWorkspace>;

  return (
    <OperationsWorkspace section="maintenance" actions={<>
      <Button className="opw-primary" onClick={handleCreateNew}><Plus size={17}/>طلب صيانة جديد</Button>
      <Button className="opw-secondary" variant="outline" onClick={() => setExportDialogOpen(true)} disabled={!filteredRecords.length}><Download size={16}/>تصدير السجل</Button>
      <Button className="opw-secondary" variant="outline" onClick={() => setActiveTour(maintenanceTours.navigation)}><HelpCircle size={16}/>دليل الصيانة</Button>
    </>}>
      <div className="space-y-5">
        <div className="opw-metrics">
          <OperationsMetric label="طلبات معلّقة" value={statsLoading || statsError ? '—' : stats?.pendingCount ?? '—'} hint={(stats?.inProgressCount ?? '—') + ' طلب قيد المعالجة'} icon={Clock} onClick={() => { setViewMode('list'); setStatusFilter('pending'); }}/>
          <OperationsMetric label="مركبات في الصيانة" value={statsLoading || statsError ? '—' : stats?.vehiclesInMaintenance ?? '—'} hint="بحسب الحالة التشغيلية للمركبات" icon={Wrench} tone="warning"/>
          <OperationsMetric label="طلبات الشهر المكتملة" value={statsLoading || statsError ? '—' : stats?.completedThisMonth ?? '—'} hint="طلبات أُنشئت هذا الشهر وأُكملت" icon={CheckCircle}/>
          <OperationsMetric label="تكلفة طلبات الشهر" value={statsLoading || statsError || !stats ? '—' : formatCurrency(stats.costThisMonth)} hint="فعلية أو مقدرة للطلبات المسجلة هذا الشهر" icon={DollarSign}/>
        </div>
        <div className="opw-section-tabs" role="group" aria-label="طريقة عرض الصيانة"><button aria-pressed={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')}><Calendar size={16}/>لوحة التشغيل</button><button aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List size={16}/>سجل الطلبات</button><Button className="ms-auto" variant="ghost" onClick={() => { void refetch(); }} aria-label="تحديث سجل الصيانة"><RefreshCw size={16}/></Button></div>
        {viewMode === 'dashboard' ? (
          <div className="opw-maintenance-columns"><div className="space-y-5">
            <OperationsPanel title="المركبات تحت الصيانة" description="مركبات تحتاج متابعة جاهزيتها قبل العودة للتشغيل." action={<Button variant="outline" size="sm" onClick={() => navigate('/fleet')}>عرض الأسطول <ChevronLeft size={14}/></Button>}>
              {maintenanceVehiclesLoading ? <p role="status" className="opw-page-note">جارٍ تحميل المركبات…</p> : maintenanceVehicles?.length ? <div className="opw-vehicle-strip">{maintenanceVehicles.slice(0,6).map((vehicle: any,index:number) => <VehicleInMaintenanceCard key={vehicle.id} vehicle={vehicle} index={index} onViewVehicle={() => navigate('/fleet/vehicles/' + vehicle.id)}/>)}</div> : <OperationsEmpty title="لا توجد مركبات تحت الصيانة في هذه القائمة" description="تظهر المركبات هنا عند تسجيل حالتها تحت الصيانة."/>}
              {(maintenanceVehicles?.length ?? 0) > 6 && <p className="opw-page-note">يعرض القسم أول 6 مركبات؛ افتح الأسطول لمراجعة بقية المركبات.</p>}
            </OperationsPanel>
            <OperationsPanel title="آخر طلبات الصيانة" description="أحدث الطلبات المطابقة للفلاتر ضمن آخر 100 سجل محمّل." action={<Button variant="outline" size="sm" onClick={() => setViewMode('list')}>فتح السجل <ChevronLeft size={14}/></Button>}>
              <div className="opw-records">{filteredRecords.slice(0,5).map((record:any,index:number) => <MaintenanceRecordCard key={record.id} record={record} index={index} onView={() => handleViewDetails(record)} onComplete={() => setStatusAction({record,type:'complete'})} onStartProgress={() => setStatusAction({record,type:'start'})} onDelete={() => setRecordToDelete(record)}/>)}</div>
              {!filteredRecords.length && <OperationsEmpty title="لا توجد طلبات مطابقة" description="يمكنك تغيير الفلاتر أو إضافة طلب صيانة جديد." action={<Button variant="outline" onClick={handleCreateNew}><Plus size={15}/>طلب جديد</Button>}/>}
            </OperationsPanel>
          </div><aside>
            <OperationsPanel title="تحتاج انتباهك" description="مراجعة الطلبات حسب الموعد والأولوية.">
              {statsLoading ? <p role="status" className="opw-page-note">جارٍ تحميل المؤشرات…</p> : statsError || !stats ? <p role="alert" className="opw-page-note">تعذّر تحميل التنبيهات.</p> : <>
                <button className="opw-attention-row" onClick={() => { setViewMode('list'); handleResetFilters(); setStatusFilter('overdue'); }}><AlertCircle size={18}/><span>متأخرة عن الموعد</span><b>{stats.overdueCount}</b><ChevronLeft size={14}/></button>
                <button className="opw-attention-row" onClick={() => { setViewMode('list'); handleResetFilters(); setPriorityFilter('urgent'); }}><AlertTriangle size={18}/><span>أولوية عاجلة</span><b>{stats.urgentCount}</b><ChevronLeft size={14}/></button>
                <p className="opw-page-note">يفتح كل تنبيه النتائج المطابقة ضمن السجل المحمّل.</p>
              </>}
            </OperationsPanel>
            <OperationsPanel title="أنواع الصيانة" description="توزيع الأنواع بحسب سجلات المؤشرات.">{maintenanceTypeSummary.map(item => <div className="opw-type-row" key={item.label}><item.icon size={17}/><span>{item.label}</span><strong>{statsLoading || statsError ? '—' : item.count}</strong></div>)}</OperationsPanel>
          </aside></div>
        ) : (
          <>
            <section className="rounded-[8px] border bg-white p-4 shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: maintenanceTheme.muted }} />
                  <Input
                    aria-label="البحث في سجل الصيانة" placeholder="رقم الطلب، اللوحة، أو نوع الصيانة…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-[8px] border bg-white pr-10 text-sm"
                    style={{ borderColor: maintenanceTheme.border }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => openFeatureAction({
                        title: 'مسح البحث',
                        description: 'سيتم مسح نص البحث الحالي مع الإبقاء على الفلاتر الأخرى كما هي.',
                        confirmLabel: 'مسح البحث',
                        tour: maintenanceTours.filters,
                        onConfirm: () => setSearchQuery(''),
                      })}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 transition hover:bg-slate-100"
                    >
                      <X className="h-3.5 w-3.5" style={{ color: maintenanceTheme.muted }} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger aria-label="حالة طلب الصيانة" className="h-11 w-40 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="overdue">متأخرة عن الموعد</SelectItem>
                      <SelectItem value="pending">معلقة</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger aria-label="نوع الصيانة" className="h-11 w-44 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="routine">صيانة دورية</SelectItem>
                      <SelectItem value="repair">إصلاح</SelectItem>
                      <SelectItem value="emergency">طارئة</SelectItem>
                      <SelectItem value="preventive">وقائية</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger aria-label="أولوية الصيانة" className="h-11 w-40 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
                      <SelectValue placeholder="الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأولويات</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => openFeatureAction({
                        title: 'تصفير البحث والفلاتر',
                        description: 'سيتم مسح البحث وكل فلاتر الحالة والنوع والأولوية والعودة لأول صفحة.',
                        confirmLabel: 'تصفير',
                        tour: maintenanceTours.filters,
                        onConfirm: handleResetFilters,
                      })}
                      className="h-11 rounded-[8px] border bg-white"
                      style={{ borderColor: maintenanceTheme.border, color: maintenanceTheme.text }}
                    >
                      <RefreshCw className="ml-1 h-4 w-4" />
                      تصفير
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: maintenanceTheme.border }}>
                <p className="text-sm" style={{ color: maintenanceTheme.muted }}>
                  <span className="font-bold" style={{ color: maintenanceTheme.text }}>{filteredRecords.length}</span> سجل
                </p>
                {activeFiltersCount > 0 && (
                  <Badge className="rounded-[8px] border" style={{ backgroundColor: `${maintenanceTheme.focus}14`, borderColor: `${maintenanceTheme.focus}44`, color: maintenanceTheme.focus }}>
                    {activeFiltersCount} فلتر نشط
                  </Badge>
                )}
              </div>
            </section>

            <section className="space-y-3">
              {paginatedRecords.map((record: any, index: number) => (
                <MaintenanceRecordCard
                  key={record.id}
                  record={record}
                  index={index}
                  onView={() => handleViewDetails(record)}
                  onComplete={() => setStatusAction({ record, type: 'complete' })}
                  onStartProgress={() => setStatusAction({ record, type: 'start' })}
                  onDelete={() => setRecordToDelete(record)}
                />
              ))}

              {paginatedRecords.length === 0 && (
                <div className="rounded-[8px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
                  <Wrench className="mx-auto mb-4 h-12 w-12" style={{ color: maintenanceTheme.muted }} />
                  <h3 className="mb-2 text-lg font-bold" style={{ color: maintenanceTheme.text }}>لا توجد سجلات</h3>
                  <p className="mb-6 text-sm" style={{ color: maintenanceTheme.muted }}>
                    {activeFiltersCount > 0 ? 'جرب تغيير معايير البحث أو الفلاتر' : 'ابدأ بإنشاء طلب صيانة جديد'}
                  </p>
                  {activeFiltersCount === 0 && (
                    <Button onClick={handleCreateNew} className="h-10 rounded-[8px] text-white" style={{ backgroundColor: maintenanceTheme.success }}>
                      <Plus className="ml-2 h-4 w-4" />
                      صيانة جديدة
                    </Button>
                  )}
                </div>
              )}
            </section>

            {totalPages > 1 && (
              <section className="flex flex-col gap-3 rounded-[8px] border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: maintenanceTheme.border }}>
                <p className="text-sm" style={{ color: maintenanceTheme.muted }}>
                  صفحة <span className="font-bold" style={{ color: maintenanceTheme.text }}>{currentPage}</span> من{' '}
                  <span className="font-bold" style={{ color: maintenanceTheme.text }}>{totalPages}</span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    aria-label="الصفحة السابقة" onClick={() => openPaginationAction(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: maintenanceTheme.border }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {pageNumbers(currentPage, totalPages).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => openPaginationAction(page)}
                      className="h-10 min-w-10 rounded-[8px]"
                      style={currentPage === page ? { backgroundColor: maintenanceTheme.success, color: '#fff' } : { color: maintenanceTheme.text }}
                    >
                      {page}
                    </Button>
                  ))}

                  {totalPages > 5 && <span className="px-2" style={{ color: maintenanceTheme.muted }}>...</span>}

                  <Button
                    variant="outline"
                    aria-label="الصفحة التالية" onClick={() => openPaginationAction(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: maintenanceTheme.border }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      {/* Side Panels */}
      <MaintenanceSidePanel
        isOpen={sidePanelOpen}
        maintenanceId={selectedMaintenance?.id}
        onClose={() => setSidePanelOpen(false)}
        onEdit={handleEditMaintenance}
        onDelete={(maintenanceId, vehicleId) => {
          setRecordToDelete({
            id: maintenanceId,
            vehicle_id: vehicleId,
            maintenance_number: selectedMaintenance?.maintenance_number,
          });
        }}
        onStatusChange={(maintenanceId, vehicleId, currentStatus) => {
          setStatusAction({
            record: {
              id: maintenanceId,
              vehicle_id: vehicleId,
              maintenance_number: selectedMaintenance?.maintenance_number,
            },
            type: currentStatus === 'pending' ? 'start' : 'complete',
          });
        }}
      />

      <MaintenanceAlertsPanel
        onMaintenanceClick={(maintenanceId) => {
          setSelectedMaintenance({ id: maintenanceId });
          setSidePanelOpen(true);
        }}
        onVehicleClick={(vehicleId) => openFeatureAction({
          title: 'فتح المركبة من التنبيه',
          description: 'سيتم فتح ملف المركبة المرتبطة بالتنبيه في تبويب جديد.',
          confirmLabel: 'فتح المركبة',
          tour: maintenanceTours.navigation,
          onConfirm: () => window.open(`/fleet/vehicles/${vehicleId}`, '_blank'),
        })}
        onViewAllClick={() => openFeatureAction({
          title: 'عرض كل تنبيهات الصيانة',
          description: 'سيتم فتح قائمة الصيانة مع فلتر الأولوية العاجلة لمراجعة التنبيهات النشطة.',
          confirmLabel: 'عرض التنبيهات',
          tour: maintenanceTours.metrics,
          onConfirm: () => { setViewMode('list'); setPriorityFilter('urgent'); },
        })}
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-lg rounded-[8px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تصدير سجلات الصيانة</DialogTitle>
            <DialogDescription>
              راجع الفلاتر الحالية قبل إنشاء ملف التصدير حتى تكون البيانات مطابقة لما يظهر في القائمة.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[8px] border p-4 text-sm leading-7" style={{ borderColor: maintenanceTheme.border, backgroundColor: maintenanceTheme.inner, color: maintenanceTheme.text }}>
            سيتم تصدير {filteredRecords.length} سجل مطابق للفلاتر من آخر 100 طلب محمّل، بصيغة CSV التي يدعمها Excel.
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <FeatureTourButton tour={maintenanceTours.export} onStart={setActiveTour} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)} className="rounded-[8px]">
                إلغاء
              </Button>
              <Button
                onClick={async () => {
                  await handleExport();
                  setExportDialogOpen(false);
                }}
                className="rounded-[8px] text-white"
                style={{ backgroundColor: maintenanceTheme.success }}
              >
                تنزيل CSV
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!statusAction} onOpenChange={(open) => !open && setStatusAction(null)}>
        <AlertDialogContent className="rounded-[8px]" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction?.type === 'start' ? 'بدء الصيانة' : 'إكمال الصيانة'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction?.type === 'start'
                ? 'سيتم نقل طلب الصيانة إلى قيد المعالجة وتحديث متابعة المركبة.'
                : 'سيتم إغلاق طلب الصيانة وتحديث حالة السجل في التقارير.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-[8px] border p-3 text-sm" style={{ borderColor: maintenanceTheme.border, backgroundColor: maintenanceTheme.inner }}>
            رقم الطلب: <strong>{statusAction?.record?.maintenance_number || statusAction?.record?.id}</strong>
          </div>
          <AlertDialogFooter className="gap-2 sm:justify-between">
            <FeatureTourButton tour={maintenanceTours.status} onStart={setActiveTour} />
            <div className="flex gap-2">
              <AlertDialogCancel className="rounded-[8px]">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStatusAction}
                className="rounded-[8px] text-white"
                style={{ backgroundColor: maintenanceTheme.success }}
                disabled={updateMaintenance.isPending || completeMaintenanceStatus.isPending}
              >
                {statusAction?.type === 'start' ? 'تأكيد البدء' : 'تأكيد الإكمال'}
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء طلب الصيانة <strong>{recordToDelete?.maintenance_number}</strong> مع الاحتفاظ بسجله.
              الطلب المرتبط بقيد محاسبي يتطلب عكسًا معتمدًا أولًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-between">
            <FeatureTourButton tour={maintenanceTours.delete} onStart={setActiveTour} />
            <div className="flex gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              disabled={deleteMaintenance.isPending}
            >
              {deleteMaintenance.isPending ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
            </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />

      {/* Maintenance Form Modal */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MaintenanceForm
          maintenance={editingMaintenance}
          vehicleId={selectedVehicleId}
          open={showMaintenanceForm}
          onOpenChange={(open) => {
            setShowMaintenanceForm(open);
            if (!open) {
              setSelectedVehicleId(undefined);
              setEditingMaintenance(null);
            }
          }}
        />
      </Suspense>
    </OperationsWorkspace>
  );
}
