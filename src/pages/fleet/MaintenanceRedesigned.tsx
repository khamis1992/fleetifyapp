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

// Lazy load components
const MaintenanceForm = lazy(() =>
  import("@/components/fleet/MaintenanceForm").then(m => ({ default: m.MaintenanceForm }))
);

// ===== Constants =====
const statusConfig = {
  pending: {
    label: 'معلقة',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    bgGradient: 'from-sky-400 to-sky-500'
  },
  in_progress: {
    label: 'قيد المعالجة',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    bgGradient: 'from-amber-400 to-amber-500'
  },
  completed: {
    label: 'مكتملة',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    bgGradient: 'from-emerald-400 to-emerald-500'
  },
  cancelled: {
    label: 'ملغاة',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    bgGradient: 'from-slate-400 to-slate-500'
  },
};

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: '↓' },
  medium: { label: 'متوسطة', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '→' },
  high: { label: 'عالية', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '↑' },
  urgent: { label: 'عاجلة', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '⚡' },
};

const maintenanceTypeConfig = {
  routine: {
    label: 'صيانة دورية',
    icon: RefreshCw,
    color: 'text-sky-600',
    bgLight: 'bg-sky-50',
    bgGradient: 'from-sky-400 to-sky-500'
  },
  repair: {
    label: 'إصلاح',
    icon: Wrench,
    color: 'text-purple-600',
    bgLight: 'bg-purple-50',
    bgGradient: 'from-purple-400 to-purple-500'
  },
  emergency: {
    label: 'صيانة طارئة',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgLight: 'bg-rose-50',
    bgGradient: 'from-rose-400 to-rose-500'
  },
  preventive: {
    label: 'صيانة وقائية',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    bgGradient: 'from-emerald-400 to-emerald-500'
  },
  maintenance: {
    label: 'صيانة',
    icon: Wrench,
    color: 'text-slate-600',
    bgLight: 'bg-slate-50',
    bgGradient: 'from-slate-400 to-slate-500'
  },
};

// ===== Enhanced Stat Card =====
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  bgGradient: string;
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
  bgGradient,
  delay,
  onClick,
  trend
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer"
  >
    {/* Background gradient decoration */}
    <div className={cn(
      "absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-15 transition-opacity bg-gradient-to-br",
      bgGradient
    )} />

    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-br shadow-sm",
          bgGradient
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            <TrendingUp className={cn("w-3 h-3", !trend.isPositive && "rotate-180")} />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  </motion.div>
);

// ===== Type Summary Card =====
interface TypeSummaryCardProps {
  label: string;
  count: number;
  icon: React.ElementType;
  bgGradient: string;
  bgLight: string;
}

const TypeSummaryCard: React.FC<TypeSummaryCardProps> = ({
  label,
  count,
  icon: Icon,
  bgGradient,
  bgLight
}) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
    <div className={cn(
      "p-2.5 rounded-lg bg-gradient-to-br shadow-sm",
      bgGradient
    )}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{count}</p>
    </div>
  </div>
);

// ===== Alert Card =====
interface AlertCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  bgGradient: string;
  bgLight: string;
  onClick: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({
  title,
  count,
  icon: Icon,
  bgGradient,
  bgLight,
  onClick
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all",
      bgLight
    )}
  >
    <div className={cn(
      "p-2 rounded-lg bg-gradient-to-br shadow-sm",
      bgGradient
    )}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
    <span className="px-3 py-1 rounded-full bg-white/80 text-sm font-bold">{count}</span>
  </motion.div>
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
  const TypeIcon = maintenanceTypeConfig[record.maintenance_type]?.icon || Wrench;
  const status = statusConfig[record.status];
  const priority = priorityConfig[record.priority];
  const typeConfig = maintenanceTypeConfig[record.maintenance_type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group bg-white rounded-xl border border-slate-200/60 hover:border-slate-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Status Bar */}
      <div className={cn("h-1 w-full", status.dot)} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left Section - Main Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-lg bg-gradient-to-br shadow-sm flex-shrink-0",
              typeConfig?.bgGradient || 'from-slate-400 to-slate-500'
            )}>
              <TypeIcon className={cn("w-5 h-5", typeConfig?.color || 'text-white')} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 truncate">{record.maintenance_number}</h3>
                <Badge className={status.color}>{status.label}</Badge>
              </div>

              {record.vehicles && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Car className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{record.vehicles.plate_number}</span>
                  {record.vehicles.make && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{record.vehicles.make} {record.vehicles.model}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{typeConfig?.label || 'صيانة'}</span>
                {record.estimated_cost && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="font-medium">{record.estimated_cost.toLocaleString()} ر.ق</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={priority.color}>{priority.icon} {priority.label}</Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView} className="gap-2">
                  <Eye className="w-4 h-4" />
                  عرض التفاصيل
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {record.status === 'pending' && (
                  <DropdownMenuItem onClick={onStartProgress} className="gap-2">
                    <Clock className="w-4 h-4" />
                    بدء الصيانة
                  </DropdownMenuItem>
                )}
                {record.status === 'in_progress' && (
                  <DropdownMenuItem onClick={onComplete} className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    إكمال الصيانة
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
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
}

const VehicleInMaintenanceCard: React.FC<VehicleInMaintenanceCardProps> = ({
  vehicle,
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group bg-white rounded-xl border border-amber-200/60 hover:border-amber-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Status Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm flex-shrink-0">
            <Car className="w-5 h-5 text-white" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-slate-900 text-lg">{vehicle.plate_number}</h3>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">في الصيانة</Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span className="font-medium">{vehicle.make} {vehicle.model}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{vehicle.year}</span>
            </div>

            {vehicle.current_mileage && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>المسافة الحالية:</span>
                <span className="font-medium">{vehicle.current_mileage.toLocaleString()} كم</span>
              </div>
            )}

            {vehicle.last_maintenance_date && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Calendar className="w-3 h-3" />
                <span>آخر صيانة: {new Date(vehicle.last_maintenance_date).toLocaleDateString('ar-SA')}</span>
              </div>
            )}
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/fleet/vehicles/${vehicle.id}`, '_blank')}
            className="flex-shrink-0 rounded-xl"
          >
            عرض المركبة
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
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
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
    setShowMaintenanceForm(true);
  };

  const handleViewDetails = (record: any) => {
    setSelectedMaintenance(record);
    setSidePanelOpen(true);
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
      await deleteMaintenance.mutateAsync(recordToDelete.id);
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

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setCurrentPage(1);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                الصيانة
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                إدارة ومتابعة طلبات صيانة الأسطول
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 border">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    viewMode === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  لوحة
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Layers className="w-4 h-4" />
                  قائمة
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2 rounded-xl"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>

              <Button
                size="sm"
                onClick={handleCreateNew}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 rounded-xl shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                صيانة جديدة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Dashboard View */}
        {viewMode === 'dashboard' ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <EnhancedStatCard
                title="نشط"
                value={stats?.pendingCount || 0}
                subtitle={`${stats?.inProgressCount || 0} قيد المعالجة`}
                icon={Clock}
                bgGradient="from-sky-400 to-sky-500"
                delay={0}
                onClick={() => { setViewMode('list'); setStatusFilter('pending'); }}
              />
              <EnhancedStatCard
                title="مركبات في الصيانة"
                value={stats?.vehiclesInMaintenance || 0}
                subtitle={`${stats?.inProgressCount || 0} قيد المعالجة`}
                icon={Wrench}
                bgGradient="from-amber-400 to-amber-500"
                delay={0.1}
                onClick={() => { setViewMode('list'); setStatusFilter('in_progress'); }}
              />
              <EnhancedStatCard
                title="مكتملة"
                value={stats?.completedThisMonth || 0}
                subtitle="هذا الشهر"
                icon={CheckCircle}
                bgGradient="from-emerald-400 to-emerald-500"
                delay={0.2}
                onClick={() => { setViewMode('list'); setStatusFilter('completed'); }}
              />
              <EnhancedStatCard
                title="التكلفة"
                value={`${((stats?.costThisMonth || 0) / 1000).toFixed(0)}K`}
                subtitle="ر.ق هذا الشهر"
                icon={DollarSign}
                bgGradient="from-purple-400 to-purple-500"
                delay={0.3}
              />
            </div>

            {/* Quick Summary & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Summary */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">ملخص الصيانات</h2>
                    <p className="text-sm text-slate-500 mt-1">توزيع أنواع الصيانات</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-xl"
                  >
                    عرض الكل
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <TypeSummaryCard
                    label="دورية"
                    count={stats?.routineCount || 0}
                    icon={RefreshCw}
                    bgGradient="from-sky-400 to-sky-500"
                    bgLight="bg-sky-50"
                  />
                  <TypeSummaryCard
                    label="إصلاح"
                    count={stats?.repairCount || 0}
                    icon={Wrench}
                    bgGradient="from-purple-400 to-purple-500"
                    bgLight="bg-purple-50"
                  />
                  <TypeSummaryCard
                    label="طوارئ"
                    count={stats?.emergencyCount || 0}
                    icon={AlertTriangle}
                    bgGradient="from-rose-400 to-rose-500"
                    bgLight="bg-rose-50"
                  />
                  <TypeSummaryCard
                    label="وقائية"
                    count={stats?.preventiveCount || 0}
                    icon={ShieldCheck}
                    bgGradient="from-emerald-400 to-emerald-500"
                    bgLight="bg-emerald-50"
                  />
                </div>
              </div>

              {/* Alerts */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">التنبيهات</h2>
                    <p className="text-sm text-slate-500 mt-1">تحتاج انتباهك</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(stats?.overdueCount || 0) > 0 && (
                    <AlertCard
                      title="متأخرة"
                      count={stats?.overdueCount || 0}
                      icon={AlertCircle}
                      bgGradient="from-rose-400 to-rose-500"
                      bgLight="bg-rose-50"
                      onClick={() => { setViewMode('list'); setPriorityFilter('urgent'); }}
                    />
                  )}

                  {(stats?.urgentCount || 0) > 0 && (
                    <AlertCard
                      title="عاجلة"
                      count={stats?.urgentCount || 0}
                      icon={AlertTriangle}
                      bgGradient="from-amber-400 to-amber-500"
                      bgLight="bg-amber-50"
                      onClick={() => { setViewMode('list'); setPriorityFilter('urgent'); }}
                    />
                  )}

                  {(stats?.overdueCount || 0) === 0 && (stats?.urgentCount || 0) === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="p-3 bg-emerald-50 rounded-full mb-3">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">لا توجد تنبيهات</p>
                      <p className="text-xs text-slate-400 mt-1">كل الصيانات تسير على ما يرام</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicles in Maintenance */}
            {(maintenanceVehicles?.length || 0) > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/10 transition-all">
                <div className="p-5 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Car className="w-5 h-5 text-amber-500" />
                      المركبات في الصيانة
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">المركبات التي حالتها تحت الصيانة</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                      {maintenanceVehicles?.length || 0} مركبة
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/fleet')}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      عرض الكل
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {maintenanceVehicles?.slice(0, 6).map((vehicle: any, index: number) => (
                      <VehicleInMaintenanceCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all">
              <div className="p-5 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-900">النشاط الأخير</h2>
                  <p className="text-sm text-slate-500 mt-1">آخر طلبات الصيانة</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                >
                  عرض الكل
                </Button>
              </div>

              <div className="p-5">
                <div className="space-y-3">
                  {filteredRecords.slice(0, 5).map((record: any, index: number) => (
                    <MaintenanceRecordCard
                      key={record.id}
                      record={record}
                      index={index}
                      onView={() => handleViewDetails(record)}
                      onComplete={() => handleCompleteMaintenance(record)}
                      onStartProgress={() => handleStartProgress(record)}
                      onDelete={() => setRecordToDelete(record)}
                    />
                  ))}
                </div>

                {filteredRecords.length === 0 && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto mb-4">
                      <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">لا توجد سجلات صيانة</h3>
                    <p className="text-sm text-slate-500">ابدأ بإنشاء طلب صيانة جديد</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search & Filters Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-4 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="بحث برقم الطلب، المركبة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pr-10 text-sm rounded-xl"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-36 rounded-xl">
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
                    <SelectTrigger className="h-11 w-40 rounded-xl">
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
                    <SelectTrigger className="h-11 w-36 rounded-xl">
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

                  {(statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-11 rounded-xl hover:bg-slate-100"
                    >
                      <RefreshCw className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <p className="text-sm text-slate-500">
                  <span className="font-bold text-slate-900">{filteredRecords.length}</span> سجل
                </p>
              </div>
            </div>

            {/* Records Grid */}
            <div className="space-y-3">
              {paginatedRecords.map((record: any, index: number) => (
                <MaintenanceRecordCard
                  key={record.id}
                  record={record}
                  index={index}
                  onView={() => handleViewDetails(record)}
                  onComplete={() => handleCompleteMaintenance(record)}
                  onStartProgress={() => handleStartProgress(record)}
                  onDelete={() => setRecordToDelete(record)}
                />
              ))}

              {paginatedRecords.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto mb-4">
                    <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد سجلات</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                      ? 'جرب تغيير معايير البحث أو الفلاتر'
                      : 'ابدأ بإنشاء طلب صيانة جديد'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && priorityFilter === 'all' && (
                    <Button onClick={handleCreateNew} className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 rounded-xl">
                      <Plus className="w-4 h-4 ml-2" />
                      صيانة جديدة
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-4 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    صفحة <span className="font-bold text-slate-900">{currentPage}</span> من{' '}
                    <span className="font-bold text-slate-900">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-9 w-9 rounded-xl",
                          currentPage === page && "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700"
                        )}
                      >
                        {page}
                      </Button>
                    ))}

                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-slate-400">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className={cn(
                            "h-9 w-9 rounded-xl",
                            currentPage === totalPages && "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700"
                          )}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Side Panels */}
      <MaintenanceSidePanel
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        selectedMaintenance={selectedMaintenance}
        onMaintenanceUpdate={() => {
          setSidePanelOpen(false);
          setSelectedMaintenance(null);
          refetch();
        }}
      />

      <MaintenanceAlertsPanel />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف طلب الصيانة <strong>{recordToDelete?.maintenance_number}</strong>. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              disabled={deleteMaintenance.isPending}
            >
              {deleteMaintenance.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Maintenance Form Modal */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MaintenanceForm
          vehicleId={selectedVehicleId}
          open={showMaintenanceForm}
          onOpenChange={(open) => {
            setShowMaintenanceForm(open);
            if (!open) {
              setSelectedVehicleId(undefined);
            }
          }}
        />
      </Suspense>
    </div>
  );
}
