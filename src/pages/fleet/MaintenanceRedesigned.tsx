/**
 * Fleet Maintenance Page - Professional SaaS Design
 * Clean, minimal interface inspired by Linear, Stripe, Vercel
 *
 * @component MaintenanceRedesigned
 */

import { useState, useMemo, lazy, Suspense, useEffect, useCallback } from "react";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  RotateCcw,
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
  pending: { label: 'معلقة', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  completed: { label: 'مكتملة', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  cancelled: { label: 'ملغاة', color: 'bg-neutral-50 text-neutral-700 border-neutral-200', dot: 'bg-neutral-500' },
};

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  medium: { label: 'متوسطة', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'عالية', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  urgent: { label: 'عاجلة', color: 'bg-red-50 text-red-700 border-red-200' },
};

const maintenanceTypeConfig = {
  routine: { label: 'صيانة دورية', icon: RefreshCw, color: 'text-blue-600' },
  repair: { label: 'إصلاح', icon: Wrench, color: 'text-purple-600' },
  emergency: { label: 'صيانة طارئة', icon: AlertTriangle, color: 'text-red-600' },
  preventive: { label: 'صيانة وقائية', icon: ShieldCheck, color: 'text-green-600' },
  maintenance: { label: 'صيانة', icon: Wrench, color: 'text-neutral-600' },
};

// ===== Professional Stat Card =====
interface ProStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
  onClick?: () => void;
  delay: number;
}

const ProStatCard: React.FC<ProStatCardProps> = ({ title, value, icon: Icon, color, description, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all cursor-pointer",
      color
    )}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-neutral-900 mt-1">{title}</p>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-2 rounded-lg bg-neutral-50">
        <Icon className="w-4 h-4 text-neutral-600" />
      </div>
    </div>
  </motion.div>
);

// ===== Quick Action Status Buttons =====
interface QuickStatusActionsProps {
  record: any;
  onComplete: () => void;
  onStartProgress: () => void;
  onCancel: () => void;
}

const QuickStatusActions: React.FC<QuickStatusActionsProps> = ({ record, onComplete, onStartProgress, onCancel }) => {
  if (record.status === 'pending') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onStartProgress}
        className="h-8 text-xs gap-1"
      >
        <Clock className="w-3 h-3" />
        بدء
      </Button>
    );
  }

  if (record.status === 'in_progress') {
    return (
      <Button
        size="sm"
        className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onComplete}
      >
        <CheckCircle className="w-3 h-3" />
        إكمال
      </Button>
    );
  }

  return null;
};

// ===== Main Component =====
export default function MaintenanceRedesigned() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
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

  const handleDelete = async (record: any) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
      await deleteMaintenance.mutateAsync(record.id);
      toast.success('تم حذف السجل بنجاح');
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-teal-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                الصيانة
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                إدارة ومتابعة طلبات صيانة الأسطول
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-neutral-100 rounded-lg p-1 border">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    viewMode === 'dashboard'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  لوحة
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    viewMode === 'list'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  )}
                >
                  <List className="w-4 h-4" />
                  قائمة
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>

              <Button
                size="sm"
                onClick={handleCreateNew}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-lg shadow-teal-500/20"
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
              <ProStatCard
                title="نشط"
                value={stats?.pendingCount || 0}
                icon={Clock}
                color="border-blue-200"
                description={`${stats?.inProgressCount || 0} قيد المعالجة`}
                delay={0}
                onClick={() => { setViewMode('list'); setStatusFilter('pending'); }}
              />
              <ProStatCard
                title="قيد المعالجة"
                value={stats?.inProgressCount || 0}
                icon={Wrench}
                color="border-amber-200"
                description={`${stats?.vehiclesInMaintenance || 0} مركبة`}
                delay={0.1}
                onClick={() => { setViewMode('list'); setStatusFilter('in_progress'); }}
              />
              <ProStatCard
                title="مكتملة"
                value={stats?.completedThisMonth || 0}
                icon={CheckCircle}
                color="border-green-200"
                description={`هذا الشهر`}
                delay={0.2}
                onClick={() => { setViewMode('list'); setStatusFilter('completed'); }}
              />
              <ProStatCard
                title="التكلفة"
                value={`${((stats?.costThisMonth || 0) / 1000).toFixed(0)}K`}
                icon={RefreshCw}
                color="border-purple-200"
                description="ر.ق هذا الشهر"
                delay={0.3}
              />
            </div>

            {/* Quick Summary & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Summary */}
              <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-5 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-neutral-900">ملخص سريع</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="text-xs"
                  >
                    عرض الكل
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-blue-500 mb-2" />
                    <div className="text-xs text-neutral-500">دورية</div>
                    <div className="text-lg font-semibold text-neutral-900">{stats?.routineCount || 0}</div>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <Wrench className="w-4 h-4 text-purple-500 mb-2" />
                    <div className="text-xs text-neutral-500">إصلاح</div>
                    <div className="text-lg font-semibold text-neutral-900">{stats?.repairCount || 0}</div>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mb-2" />
                    <div className="text-xs text-neutral-500">طوارئ</div>
                    <div className="text-lg font-semibold text-neutral-900">{stats?.emergencyCount || 0}</div>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-green-500 mb-2" />
                    <div className="text-xs text-neutral-500">وقائية</div>
                    <div className="text-lg font-semibold text-neutral-900">{stats?.preventiveCount || 0}</div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-5 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
                <h2 className="font-semibold text-neutral-900 mb-4">التنبيهات</h2>

                <div className="space-y-2">
                  {(stats?.overdueCount || 0) > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => { setViewMode('list'); setPriorityFilter('urgent'); }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-800">متأخرة</span>
                      </div>
                      <span className="text-sm font-bold text-red-700">{stats?.overdueCount}</span>
                    </div>
                  )}

                  {(stats?.urgentCount || 0) > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => { setViewMode('list'); setPriorityFilter('urgent'); }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        <span className="text-sm text-amber-800">عاجلة</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{stats?.urgentCount}</span>
                    </div>
                  )}

                  {(stats?.overdueCount || 0) === 0 && (stats?.urgentCount || 0) === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-6">
                      <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                      <p className="text-sm text-neutral-500">لا توجد تنبيهات</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900">النشاط الأخير</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  عرض الكل
                </Button>
              </div>

              <div className="divide-y">
                {filteredRecords.slice(0, 5).map((record: any, index: number) => {
                  const TypeIcon = maintenanceTypeConfig[record.maintenance_type]?.icon || Wrench;
                  const status = statusConfig[record.status];

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-between"
                      onClick={() => handleViewDetails(record)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 rounded-lg">
                          <TypeIcon className={cn("w-4 h-4", maintenanceTypeConfig[record.maintenance_type]?.color)} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{record.maintenance_number}</div>
                          <div className="text-xs text-neutral-500">
                            {record.vehicles?.plate_number && `${record.vehicles.plate_number} • `}
                            {maintenanceTypeConfig[record.maintenance_type]?.label}
                          </div>
                        </div>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </motion.div>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <div className="p-8 text-center text-neutral-500">
                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد سجلات صيانة</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search & Filters Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-4 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="بحث برقم الطلب، المركبة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pr-10 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 rounded"
                    >
                      <X className="w-3 h-3 text-neutral-400" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 w-32">
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
                    <SelectTrigger className="h-10 w-32">
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
                    <SelectTrigger className="h-10 w-32">
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
                      className="h-10"
                    >
                      <RotateCcw className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <p className="text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900">{filteredRecords.length}</span> سجل
                </p>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 overflow-hidden hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-neutral-50">
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">الطلب</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">المركبة</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">النوع</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">الحالة</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">الأولوية</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase w-32">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record: any) => {
                      const TypeIcon = maintenanceTypeConfig[record.maintenance_type]?.icon || Wrench;
                      const status = statusConfig[record.status];
                      const priority = priorityConfig[record.priority];

                      return (
                        <tr key={record.id} className="border-b hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono text-sm">{record.maintenance_number}</div>
                          </td>
                          <td className="px-4 py-3">
                            {record.vehicles ? (
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-neutral-400" />
                                <div>
                                  <div className="text-sm font-medium">{record.vehicles.plate_number}</div>
                                  <div className="text-xs text-neutral-500">{record.vehicles.make} {record.vehicles.model}</div>
                                </div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <TypeIcon className={cn("w-4 h-4", maintenanceTypeConfig[record.maintenance_type]?.color)} />
                              <span className="text-sm">{maintenanceTypeConfig[record.maintenance_type]?.label || 'صيانة'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={status.color}>{status.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={priority.color}>{priority?.label || 'عادية'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <QuickStatusActions
                                record={record}
                                onComplete={() => handleCompleteMaintenance(record)}
                                onStartProgress={() => handleStartProgress(record)}
                                onCancel={() => {}}
                              />

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(record)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(record)} className="gap-2">
                                    <Eye className="w-4 h-4" />
                                    عرض التفاصيل
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(record)}
                                    className="gap-2 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length === 0 && (
                <div className="p-12 text-center">
                  <Wrench className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد سجلات</h3>
                  <p className="text-sm text-neutral-500 mb-6">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                      ? 'جرب تغيير معايير البحث أو الفلاتر'
                      : 'ابدأ بإنشاء طلب صيانة جديد'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && priorityFilter === 'all' && (
                    <Button onClick={handleCreateNew} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                      <Plus className="w-4 h-4 ml-2" />
                      صيانة جديدة
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-neutral-500">
                    صفحة <span className="font-medium text-neutral-900">{currentPage}</span> من{' '}
                    <span className="font-medium text-neutral-900">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9"
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
                          "h-9 w-9",
                          currentPage === page && "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
                        )}
                      >
                        {page}
                      </Button>
                    ))}

                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-neutral-400">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className={cn(
                            "h-9 w-9",
                            currentPage === totalPages && "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
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
                      className="h-9"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
