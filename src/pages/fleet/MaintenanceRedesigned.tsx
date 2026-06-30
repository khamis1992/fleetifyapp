/**
 * Fleet Maintenance Page - Modern Professional Design
 * Enhanced visual hierarchy with improved information architecture
 *
 * @component MaintenanceRedesigned
 */

import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Car,
  Wrench,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  List,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Download,
  Filter,
  X,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Layers,
  Calendar as CalendarIcon,
  HelpCircle,
  PlayCircle,
} from "lucide-react";
import { useVehicleMaintenance } from "@/hooks/useVehicles";
import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles";
import { useVehicleStatusUpdate, useCompleteMaintenanceStatus, useScheduleMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useDeleteVehicleMaintenance, useUpdateVehicleMaintenance } from "@/hooks/useVehicles";
import { useMaintenanceStats } from "@/hooks/useMaintenanceStats";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MaintenanceSidePanel } from "@/components/fleet/MaintenanceSidePanel";
import { MaintenanceAlertsPanel } from "@/components/fleet/MaintenanceAlertsPanel";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

const maintenanceTheme = {
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
      'من أسفل اللوحة يمكنك تعديل الطلب أو بدءه أو إكماله أو حذفه حسب الحالة.',
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
    title: 'جولة حذف طلب الصيانة',
    description: 'يوضح ما يحدث عند حذف طلب الصيانة وما يجب مراجعته قبل التأكيد.',
    steps: [
      'الحذف يزيل سجل الصيانة من القائمة.',
      'إذا كانت المركبة في حالة صيانة بسبب هذا الطلب فقد تعود إلى متاحة.',
      'راجع رقم الطلب والمركبة قبل الحذف، ولا تستخدم الحذف بدل إكمال الصيانة.',
    ],
  },
  export: {
    title: 'جولة تصدير الصيانة',
    description: 'شرح طريقة تصدير سجلات الصيانة الحالية.',
    steps: [
      'التصدير يجب أن يعتمد على الفلاتر الحالية في الصفحة.',
      'استخدم البحث والحالة والنوع والأولوية لتحديد البيانات المطلوبة.',
      'بعدها اضغط تصدير الآن لإنشاء الملف عند تفعيل خدمة التصدير النهائية.',
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

function FeatureActionDialog({
  action,
  onClose,
  onStartTour,
}: {
  action: MaintenanceFeatureAction | null;
  onClose: () => void;
  onStartTour: (tour: MaintenanceTourContent) => void;
}) {
  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-[8px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{action?.title}</DialogTitle>
          <DialogDescription>{action?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          {action && <FeatureTourButton tour={action.tour} onStart={onStartTour} />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-[8px]">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                action?.onConfirm();
                onClose();
              }}
              className="rounded-[8px] text-white"
              style={{ backgroundColor: maintenanceTheme.success }}
            >
              {action?.confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ===== Enhanced Stat Card =====
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
  onClick?: () => void;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay,
  onClick,
  trend
}) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    className="w-full rounded-[8px] border bg-white p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    style={{ borderColor: maintenanceTheme.border }}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${color}14` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      {trend && (
        <span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${color}14`, color }}>
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
    <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    <p className="mt-1 text-sm font-semibold" style={{ color: maintenanceTheme.text }}>{title}</p>
    {subtitle && <p className="mt-1 text-xs" style={{ color: maintenanceTheme.muted }}>{subtitle}</p>}
  </motion.button>
);

// ===== Type Summary Card =====
interface TypeSummaryCardProps {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

const TypeSummaryCard: React.FC<TypeSummaryCardProps> = ({ label, count, icon: Icon, color }) => (
  <div className="rounded-[8px] border px-4 py-3" style={{ backgroundColor: maintenanceTheme.inner, borderColor: maintenanceTheme.border }}>
    <div className="mb-3 flex items-center justify-between">
      <div className="flex h-9 w-9 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${color}14` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-xs font-semibold" style={{ color: maintenanceTheme.muted }}>{label}</p>
    </div>
    <p className="text-2xl font-bold" style={{ color }}>{count}</p>
  </div>
);

// ===== Alert Card =====
interface AlertCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ title, count, icon: Icon, color, onClick }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-[8px] border bg-white p-3 text-right transition hover:-translate-y-0.5"
    style={{ borderColor: `${color}55` }}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${color}14` }}>
      <Icon className="h-5 w-5" style={{ color }} />
    </div>
    <div className="flex-1">
      <p className="text-sm font-bold" style={{ color: maintenanceTheme.text }}>{title}</p>
    </div>
    <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: `${color}14`, color }}>{count}</span>
  </motion.button>
);
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
      className="group overflow-hidden rounded-[8px] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                <h3 className="truncate text-base font-bold" style={{ color: maintenanceTheme.text }}>{record.maintenance_number || 'طلب صيانة'}</h3>
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
                {record.estimated_cost && (
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
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-[8px] p-0">
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
                  حذف
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
      className="overflow-hidden rounded-[8px] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
            {vehicle.current_mileage && (
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
  const [featureAction, setFeatureAction] = useState<MaintenanceFeatureAction | null>(null);
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
  const { data: maintenanceRecords, isLoading: maintenanceLoading, refetch } = useVehicleMaintenance(undefined, {
    limit: 100,
    enabled: true
  });

  const { data: maintenanceVehicles, isLoading: maintenanceVehiclesLoading } = useMaintenanceVehicles({
    limit: 50,
    enabled: true
  });

  // Stats
  const { data: stats } = useMaintenanceStats();

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
        record.maintenance_type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesType = typeFilter === "all" || record.maintenance_type === typeFilter;
      const matchesPriority = priorityFilter === "all" || record.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [maintenanceRecords, searchQuery, statusFilter, typeFilter, priorityFilter]);

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
      await completeMaintenanceStatus.mutateAsync(record.id);
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
      toast.success('تم حذف السجل بنجاح');
      setRecordToDelete(null);
      refetch();
    } catch (error) {
      toast.error('فشل حذف السجل');
    }
  };

  const handleExport = async () => {
    toast.success('جاري تصدير البيانات...');
    // Implement export logic
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
    setFeatureAction(action);
  };

  const openPaginationAction = (page: number) => {
    openFeatureAction({
      title: 'تغيير صفحة النتائج',
      description: `سيتم عرض صفحة ${page} من سجلات الصيانة المطابقة للبحث والفلاتر الحالية.`,
      confirmLabel: 'تغيير الصفحة',
      tour: maintenanceTours.navigation,
      onConfirm: () => setCurrentPage(page),
    });
  };

  const activeFiltersCount = [statusFilter, typeFilter, priorityFilter].filter(value => value !== 'all').length + (searchQuery ? 1 : 0);
  const maintenanceMetrics = [
    {
      title: 'طلبات نشطة',
      value: stats?.pendingCount || 0,
      subtitle: `${stats?.inProgressCount || 0} قيد المعالجة`,
      icon: Clock,
      color: maintenanceTheme.water,
      onClick: () => openFeatureAction({
        title: 'عرض الطلبات النشطة',
        description: 'سيتم فتح قائمة الصيانة مع فلتر الطلبات المعلقة لمراجعتها بسرعة.',
        confirmLabel: 'عرض الطلبات',
        tour: maintenanceTours.metrics,
        onConfirm: () => { setViewMode('list'); setStatusFilter('pending'); },
      }),
    },
    {
      title: 'مركبات في الصيانة',
      value: stats?.vehiclesInMaintenance || 0,
      subtitle: 'مركبات غير جاهزة للتشغيل',
      icon: Wrench,
      color: maintenanceTheme.alert,
      onClick: () => openFeatureAction({
        title: 'عرض المركبات قيد الصيانة',
        description: 'سيتم فتح قائمة الصيانة مع فلتر الطلبات قيد المعالجة.',
        confirmLabel: 'عرض القائمة',
        tour: maintenanceTours.metrics,
        onConfirm: () => { setViewMode('list'); setStatusFilter('in_progress'); },
      }),
    },
    {
      title: 'مكتملة هذا الشهر',
      value: stats?.completedThisMonth || 0,
      subtitle: 'طلبات مغلقة',
      icon: CheckCircle,
      color: maintenanceTheme.success,
      onClick: () => openFeatureAction({
        title: 'عرض الصيانات المكتملة',
        description: 'سيتم فتح قائمة الصيانة مع فلتر الطلبات المكتملة.',
        confirmLabel: 'عرض المكتملة',
        tour: maintenanceTours.metrics,
        onConfirm: () => { setViewMode('list'); setStatusFilter('completed'); },
      }),
    },
    {
      title: 'تكلفة الشهر',
      value: formatCurrency(stats?.costThisMonth || 0),
      subtitle: 'إجمالي تكلفة الصيانة',
      icon: DollarSign,
      color: maintenanceTheme.focus,
    },
  ];

  const maintenanceTypeSummary = [
    { label: 'دورية', count: stats?.routineCount || 0, icon: RefreshCw, color: maintenanceTheme.water },
    { label: 'إصلاح', count: stats?.repairCount || 0, icon: Wrench, color: maintenanceTheme.focus },
    { label: 'طوارئ', count: stats?.emergencyCount || 0, icon: AlertTriangle, color: maintenanceTheme.alert },
    { label: 'وقائية', count: stats?.preventiveCount || 0, icon: ShieldCheck, color: maintenanceTheme.success },
  ];

  // Loading state
  if (maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: maintenanceTheme.inner, color: maintenanceTheme.text }}>
      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[8px] border bg-white p-4 shadow-sm sm:p-5" style={{ borderColor: maintenanceTheme.border }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: maintenanceTheme.muted }}>إدارة الأسطول</p>
              <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: maintenanceTheme.text }}>الصيانة</h1>
              <p className="text-sm" style={{ color: maintenanceTheme.muted }}>متابعة طلبات الصيانة والمركبات المتوقفة والتكاليف من مساحة تشغيل واحدة</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-[8px] border p-1" style={{ borderColor: maintenanceTheme.border, backgroundColor: maintenanceTheme.inner }}>
                <button
                  onClick={() => openFeatureAction({
                    title: 'فتح لوحة الصيانة',
                    description: 'سيتم الانتقال إلى لوحة تعرض المؤشرات والتنبيهات وملخصات الصيانة.',
                    confirmLabel: 'فتح اللوحة',
                    tour: maintenanceTours.navigation,
                    onConfirm: () => setViewMode('dashboard'),
                  })}
                  className="flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold transition"
                  style={viewMode === 'dashboard' ? { backgroundColor: maintenanceTheme.surface, color: maintenanceTheme.success } : { color: maintenanceTheme.muted }}
                >
                  <CalendarIcon className="h-4 w-4" />
                  لوحة
                </button>
                <button
                  onClick={() => openFeatureAction({
                    title: 'فتح قائمة الصيانة',
                    description: 'سيتم الانتقال إلى القائمة التفصيلية للبحث والتصفية ومتابعة الطلبات.',
                    confirmLabel: 'فتح القائمة',
                    tour: maintenanceTours.navigation,
                    onConfirm: () => setViewMode('list'),
                  })}
                  className="flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-semibold transition"
                  style={viewMode === 'list' ? { backgroundColor: maintenanceTheme.surface, color: maintenanceTheme.success } : { color: maintenanceTheme.muted }}
                >
                  <Layers className="h-4 w-4" />
                  قائمة
                </button>
              </div>

              <Button variant="outline" onClick={() => setExportDialogOpen(true)} className="h-10 gap-2 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border, color: maintenanceTheme.text }}>
                <Download className="h-4 w-4" style={{ color: maintenanceTheme.water }} />
                تصدير
              </Button>

              <Button onClick={handleCreateNew} className="h-10 gap-2 rounded-[8px] text-white" style={{ backgroundColor: maintenanceTheme.success }}>
                <Plus className="h-4 w-4" />
                صيانة جديدة
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {maintenanceMetrics.map((metric, index) => (
            <EnhancedStatCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              icon={metric.icon}
              color={metric.color}
              delay={index * 0.05}
              onClick={metric.onClick}
            />
          ))}
        </section>

        {viewMode === 'dashboard' ? (
          <>
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-[8px] border bg-white p-5 shadow-sm lg:col-span-2" style={{ borderColor: maintenanceTheme.border }}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: maintenanceTheme.text }}>ملخص الصيانات</h2>
                    <p className="mt-1 text-sm" style={{ color: maintenanceTheme.muted }}>توزيع أنواع الصيانة الحالية</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => openFeatureAction({
                      title: 'عرض كل الصيانات',
                      description: 'سيتم فتح قائمة الصيانة الكاملة مع الإبقاء على الفلاتر الحالية.',
                      confirmLabel: 'عرض الكل',
                      tour: maintenanceTours.navigation,
                      onConfirm: () => setViewMode('list'),
                    })}
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: maintenanceTheme.border, color: maintenanceTheme.text }}
                  >
                    عرض الكل
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {maintenanceTypeSummary.map((item) => (
                    <TypeSummaryCard key={item.label} label={item.label} count={item.count} icon={item.icon} color={item.color} />
                  ))}
                </div>
              </div>

              <div className="rounded-[8px] border bg-white p-5 shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
                <div className="mb-5">
                  <h2 className="text-lg font-bold" style={{ color: maintenanceTheme.text }}>التنبيهات</h2>
                  <p className="mt-1 text-sm" style={{ color: maintenanceTheme.muted }}>طلبات تحتاج انتباهك</p>
                </div>

                <div className="space-y-3">
                  {(stats?.overdueCount || 0) > 0 && (
                    <AlertCard
                      title="متأخرة"
                      count={stats?.overdueCount || 0}
                      icon={AlertCircle}
                      color={maintenanceTheme.alert}
                      onClick={() => openFeatureAction({
                        title: 'عرض الصيانات المتأخرة',
                        description: 'سيتم فتح القائمة مع فلتر الأولوية العاجلة لمراجعة الطلبات التي تحتاج تدخلًا.',
                        confirmLabel: 'عرض المتأخرة',
                        tour: maintenanceTours.metrics,
                        onConfirm: () => { setViewMode('list'); setPriorityFilter('urgent'); },
                      })}
                    />
                  )}
                  {(stats?.urgentCount || 0) > 0 && (
                    <AlertCard
                      title="عاجلة"
                      count={stats?.urgentCount || 0}
                      icon={AlertTriangle}
                      color={maintenanceTheme.alert}
                      onClick={() => openFeatureAction({
                        title: 'عرض الصيانات العاجلة',
                        description: 'سيتم فتح القائمة مع فلتر الأولوية العاجلة.',
                        confirmLabel: 'عرض العاجلة',
                        tour: maintenanceTours.metrics,
                        onConfirm: () => { setViewMode('list'); setPriorityFilter('urgent'); },
                      })}
                    />
                  )}
                  {(stats?.overdueCount || 0) === 0 && (stats?.urgentCount || 0) === 0 && (
                    <div className="rounded-[8px] px-4 py-8 text-center" style={{ backgroundColor: maintenanceTheme.inner }}>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${maintenanceTheme.success}14` }}>
                        <CheckCircle className="h-6 w-6" style={{ color: maintenanceTheme.success }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: maintenanceTheme.text }}>لا توجد تنبيهات</p>
                      <p className="mt-1 text-xs" style={{ color: maintenanceTheme.muted }}>كل الصيانات تسير على ما يرام</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {(maintenanceVehicles?.length || 0) > 0 && (
              <section className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
                <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: maintenanceTheme.border }}>
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: maintenanceTheme.text }}>
                      <Car className="h-5 w-5" style={{ color: maintenanceTheme.alert }} />
                      المركبات في الصيانة
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: maintenanceTheme.muted }}>المركبات التي حالتها تحت الصيانة</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-[8px] border" style={{ backgroundColor: `${maintenanceTheme.alert}14`, borderColor: `${maintenanceTheme.alert}44`, color: maintenanceTheme.alert }}>
                      {maintenanceVehicles?.length || 0} مركبة
                    </Badge>
                    <Button
                      variant="ghost"
                      onClick={() => openFeatureAction({
                        title: 'فتح صفحة الأسطول',
                        description: 'سيتم فتح صفحة الأسطول لمراجعة كل المركبات وحالاتها التشغيلية.',
                        confirmLabel: 'فتح الأسطول',
                        tour: maintenanceTours.navigation,
                        onConfirm: () => navigate('/fleet'),
                      })}
                      className="h-10 rounded-[8px]"
                      style={{ color: maintenanceTheme.alert }}
                    >
                      عرض الكل
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2 xl:grid-cols-3">
                  {maintenanceVehicles?.slice(0, 6).map((vehicle: any, index: number) => (
                    <VehicleInMaintenanceCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      index={index}
                      onViewVehicle={() => openFeatureAction({
                        title: 'فتح ملف المركبة',
                        description: 'سيتم فتح ملف المركبة في تبويب جديد لمراجعة التفاصيل والعقود والحالة.',
                        confirmLabel: 'فتح المركبة',
                        tour: maintenanceTours.navigation,
                        onConfirm: () => window.open(`/fleet/vehicles/${vehicle.id}`, '_blank'),
                      })}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[8px] border bg-white shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
              <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: maintenanceTheme.border }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: maintenanceTheme.text }}>النشاط الأخير</h2>
                  <p className="mt-1 text-sm" style={{ color: maintenanceTheme.muted }}>آخر طلبات الصيانة</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => openFeatureAction({
                    title: 'عرض النشاط الكامل',
                    description: 'سيتم فتح قائمة الصيانة لعرض كل السجلات بدل آخر النشاط فقط.',
                    confirmLabel: 'عرض الكل',
                    tour: maintenanceTours.navigation,
                    onConfirm: () => setViewMode('list'),
                  })}
                  className="h-10 rounded-[8px]"
                  style={{ color: maintenanceTheme.water }}
                >
                  عرض الكل
                </Button>
              </div>

              <div className="space-y-3 p-5">
                {filteredRecords.slice(0, 5).map((record: any, index: number) => (
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

                {filteredRecords.length === 0 && (
                  <div className="rounded-[8px] py-12 text-center" style={{ backgroundColor: maintenanceTheme.inner }}>
                    <Wrench className="mx-auto mb-4 h-10 w-10" style={{ color: maintenanceTheme.muted }} />
                    <h3 className="mb-2 font-bold" style={{ color: maintenanceTheme.text }}>لا توجد سجلات صيانة</h3>
                    <p className="text-sm" style={{ color: maintenanceTheme.muted }}>ابدأ بإنشاء طلب صيانة جديد</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-[8px] border bg-white p-4 shadow-sm" style={{ borderColor: maintenanceTheme.border }}>
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: maintenanceTheme.muted }} />
                  <Input
                    placeholder="بحث برقم الطلب أو المركبة..."
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
                    <SelectTrigger className="h-11 w-40 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="pending">معلقة</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-11 w-44 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
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
                    <SelectTrigger className="h-11 w-40 rounded-[8px] border bg-white" style={{ borderColor: maintenanceTheme.border }}>
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openPaginationAction(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-10 rounded-[8px] border bg-white"
                    style={{ borderColor: maintenanceTheme.border }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
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
                    onClick={() => openPaginationAction(Math.min(totalPages, currentPage + 1))}
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
      </main>
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
            سيتم تصدير {filteredRecords.length} سجل حسب البحث والفلاتر الحالية.
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
                تصدير الآن
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeatureActionDialog
        action={featureAction}
        onClose={() => setFeatureAction(null)}
        onStartTour={setActiveTour}
      />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف طلب الصيانة <strong>{recordToDelete?.maintenance_number}</strong>. هذا الإجراء لا يمكن التراجع عنه.
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
              {deleteMaintenance.isPending ? 'جاري الحذف...' : 'حذف'}
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
    </div>
  );
}
