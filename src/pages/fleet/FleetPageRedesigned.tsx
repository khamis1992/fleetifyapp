/**
 * Fleet Management Page - Professional SaaS Design
 * Clean, minimal interface inspired by Linear, Stripe, Vercel
 *
 * @component FleetPageRedesigned
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useVehiclesPaginated, VehicleFilters as IVehicleFilters } from '@/hooks/useVehiclesPaginated';
import { useFleetStatus } from '@/hooks/useFleetStatus';
import { useDeleteVehicle } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Vehicle } from '@/hooks/useVehicles';
import {
  Car,
  Plus,
  Search,
  SlidersHorizontal,
  Copy,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Fuel,
  Settings,
  Tag,
  Upload,
  Download,
  Layers3,
  RotateCcw,
  LayoutGrid,
  Columns,
  FileText,
  MoreHorizontal,
  X,
  Calendar,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VehicleForm } from '@/components/fleet/VehicleForm';
import { VehicleGroupManagement } from '@/components/fleet/VehicleGroupManagement';
import { VehicleCSVUpload } from '@/components/fleet/VehicleCSVUpload';
import { VehicleSplitView } from '@/components/fleet/VehicleSplitView';
import { FleetSmartDashboard } from '@/components/fleet/FleetSmartDashboard';
import { VehicleAlertPanel } from '@/components/fleet/VehicleAlertPanel';
import { useSyncVehicleStatus } from '@/hooks/useSyncVehicleStatus';
import { VehicleStatusChangeDialog } from '@/components/fleet/VehicleStatusChangeDialog';

// ===== Status Config =====
const statusConfig = {
  available: { label: 'متاحة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rented: { label: 'مؤجرة', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  maintenance: { label: 'صيانة', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  out_of_service: { label: 'خارج الخدمة', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  reserved: { label: 'محجوزة', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  reserved_employee: { label: 'محجوزة لموظف', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  accident: { label: 'حادث', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  stolen: { label: 'مسروقة', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
  police_station: { label: 'في مركز الشرطة', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

const statusCycle = ['available', 'rented', 'maintenance', 'out_of_service'] as const;

// ===== Professional Vehicle Card =====
interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onStatusChange: () => void;
  onQuickAction: (action: 'rent' | 'maintenance' | 'contract') => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  index,
  onView,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onQuickAction,
}) => {
  const config = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.available;

  const handleCopyVin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle.vin) {
      navigator.clipboard.writeText(vehicle.vin);
      toast.success('تم نسخ رقم الهيكل');
    }
  };

  const getMaintenanceTags = () => {
    const tags: string[] = [];
    if (vehicle.next_service_date) {
      const serviceDate = new Date(vehicle.next_service_date);
      if (serviceDate <= new Date()) tags.push('فحص دوري');
    }
    if (vehicle.current_mileage && vehicle.current_mileage > 50000) {
      tags.push('تغيير زيت');
    }
    if (vehicle.insurance_expiry) {
      const insuranceDate = new Date(vehicle.insurance_expiry);
      const daysUntilExpiry = Math.ceil((insuranceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) tags.push('تجديد تأمين');
    }
    return tags.length > 0 ? tags : ['جاهزة للاستخدام'];
  };

  const maintenanceTags = getMaintenanceTags();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-3xl border bg-white/80 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Status Bar */}
      <div className={cn("h-1 w-full", config.dot)} />

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          {/* Status Badge - Clickable to cycle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange();
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105",
              config.color
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {config.label}
          </button>

          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onQuickAction('rent')} className="gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                عقد جديد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('maintenance')} className="gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                صيانة
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCopy} className="gap-2">
                <Copy className="w-4 h-4" />
                نسخ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit3 className="w-4 h-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600">
                <Trash2 className="w-4 h-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vehicle Image */}
        <div className="h-36 rounded-lg overflow-hidden bg-neutral-100 mb-3 relative">
          {vehicle.images && vehicle.images[0] ? (
            <img
              src={vehicle.images[0]}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50">
              <Car className="w-12 h-12 text-neutral-300" />
            </div>
          )}

          {/* Plate Number Overlay */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-mono">
            {vehicle.plate_number}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-neutral-900 text-sm truncate">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <Settings className="w-3 h-3" />
              <span>{vehicle.engine_size || '2.5L'}</span>
            </div>
            <span>•</span>
            <span>{vehicle.transmission === 'automatic' ? 'أوتوماتيك' : 'يدوي'}</span>
          </div>

          {/* VIN */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Tag className="w-3 h-3" />
              <span className="font-mono truncate max-w-[120px]">{vehicle.vin || 'N/A'}</span>
            </div>
            {vehicle.vin && (
              <button
                onClick={handleCopyVin}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <Copy className="w-3 h-3 text-neutral-400 hover:text-rose-500" />
              </button>
            )}
          </div>

          {/* Maintenance Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-100">
            {maintenanceTags.slice(0, 2).map((tag, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 rounded",
                  tag === 'جاهزة للاستخدام'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                )}
              >
                {tag}
              </Badge>
            ))}
            {maintenanceTags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 rounded bg-neutral-50 text-neutral-500">
                +{maintenanceTags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== Quick Status Filter Chips =====
interface StatusChipProps {
  label: string;
  count: number;
  status: string;
  active: boolean;
  onClick: () => void;
}

const StatusChip: React.FC<StatusChipProps> = ({ label, count, status, active, onClick }) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        active ? config.color : "bg-white border hover:border-neutral-300"
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded-full text-xs",
        active ? "bg-white/20" : "bg-neutral-100"
      )}>
        {count}
      </span>
    </button>
  );
};

// ===== Main Component =====
const FleetPageRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<IVehicleFilters>({ excludeMaintenanceStatus: false });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [vehicleForStatus, setVehicleForStatus] = useState<Vehicle | null>(null);

  // Hooks
  const { isSyncing, handleSync } = useSyncVehicleStatus();
  const deleteVehicle = useDeleteVehicle();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const { data: vehiclesData, isLoading: vehiclesLoading, refetch } = useVehiclesPaginated(
    currentPage,
    pageSize,
    { ...filters, search: searchQuery || undefined }
  );

  // Computed
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== false).length;
  const totalPages = vehiclesData?.totalPages || 1;
  const allSelected = vehiclesData?.data && vehiclesData.data.length > 0 && selectedVehicles.size === vehiclesData.data.length;

  // Handlers
  const handleFilterChange = (key: keyof IVehicleFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleStatCardClick = (status: string) => {
    if (filters.status === status) {
      setFilters({ excludeMaintenanceStatus: false });
    } else {
      setFilters({ status, excludeMaintenanceStatus: false });
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ excludeMaintenanceStatus: false });
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedVehicles(new Set());
  };

  const handleSyncVehicleStatus = async () => {
    if (!user?.profile?.company_id) {
      toast.error('لا يمكن تحديد الشركة');
      return;
    }
    const result = await handleSync(user.profile.company_id);
    if (result) {
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    }
  };

  const handleVehicleFormClose = (open: boolean) => {
    setShowVehicleForm(open);
    if (!open) {
      setEditingVehicle(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowVehicleForm(true);
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteVehicle.mutateAsync(vehicleToDelete.id);
      setVehicleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
      toast.success('تم حذف المركبة بنجاح');
    } catch (error) {
      toast.error('فشل حذف المركبة');
    }
  };

  const handleCopyVehicle = (vehicle: Vehicle) => {
    const vehicleData = { ...vehicle, plate_number: `${vehicle.plate_number} (نسخة)` };
    delete (vehicleData as any).id;
    setEditingVehicle(vehicleData as Vehicle);
    setShowVehicleForm(true);
    toast.success('تم نسخ المركبة');
  };

  const handleViewVehicle = (vehicleId: string) => {
    navigate(`/fleet/vehicles/${vehicleId}`);
  };

  const handleStatusChange = (vehicle: Vehicle) => {
    setVehicleForStatus(vehicle);
    setShowStatusDialog(true);
  };

  const handleQuickAction = (action: 'rent' | 'maintenance' | 'contract', vehicle: Vehicle) => {
    if (action === 'rent' || action === 'contract') {
      navigate(`/contracts?vehicle=${vehicle.id}`);
    } else if (action === 'maintenance') {
      navigate(`/fleet/maintenance?vehicle=${vehicle.id}`);
    }
  };

  const handleExport = () => {
    toast.success('جاري تصدير البيانات...');
    // Implement export logic
  };

  const handleSelectAll = () => {
    if (!vehiclesData?.data) return;
    if (allSelected) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(vehiclesData.data.map(v => v.id)));
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  // Loading
  if (statusLoading) {
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
                الأسطول
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                إدارة وتتبع جميع المركبات ({vehiclesData?.count || 0} مركبة)
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="hidden md:flex items-center bg-neutral-100 rounded-lg p-1 border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    viewMode === 'grid' && 'bg-white text-neutral-900 shadow-sm'
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  شبكة
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                    viewMode === 'split' && 'bg-white text-neutral-900 shadow-sm'
                  )}
                >
                  <Columns className="w-4 h-4" />
                  مقسم
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
                variant="outline"
                size="sm"
                onClick={() => setShowGroupManagement(true)}
                className="gap-2"
              >
                <Layers3 className="w-4 h-4" />
                المجموعات
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncVehicleStatus}
                disabled={isSyncing}
                className="gap-2"
              >
                <RotateCcw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'مزامنة...' : 'مزامنة'}
              </Button>

              {user?.roles?.includes('super_admin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCSVUpload(true)}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setShowVehicleForm(true)}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                إضافة مركبة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Smart Dashboard */}
        <FleetSmartDashboard
          onFilterByStatus={handleStatCardClick}
          activeStatus={filters.status}
        />

        {/* Alerts Panel */}
        <VehicleAlertPanel
          onViewVehicle={(vehicleId) => navigate(`/fleet/vehicles/${vehicleId}`)}
          maxAlerts={3}
        />

        {/* Quick Status Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-4 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-neutral-500 font-medium">تصفية سريع:</span>

            <StatusChip
              label="متاحة"
              status="available"
              count={fleetStatus?.available || 0}
              active={filters.status === 'available'}
              onClick={() => handleStatCardClick('available')}
            />

            <StatusChip
              label="مؤجرة"
              status="rented"
              count={fleetStatus?.rented || 0}
              active={filters.status === 'rented'}
              onClick={() => handleStatCardClick('rented')}
            />

            <StatusChip
              label="صيانة"
              status="maintenance"
              count={fleetStatus?.maintenance || 0}
              active={filters.status === 'maintenance'}
              onClick={() => handleStatCardClick('maintenance')}
            />

            <StatusChip
              label="خارج الخدمة"
              status="out_of_service"
              count={fleetStatus?.outOfService || 0}
              active={filters.status === 'out_of_service'}
              onClick={() => handleStatCardClick('out_of_service')}
            />

            <div className="h-6 w-px bg-neutral-200 mx-2" />

            <StatusChip
              label="محجوزة"
              status="reserved"
              count={fleetStatus?.reserved || 0}
              active={filters.status === 'reserved'}
              onClick={() => handleStatCardClick('reserved')}
            />

            <StatusChip
              label="حادث"
              status="accident"
              count={fleetStatus?.accident || 0}
              active={filters.status === 'accident'}
              onClick={() => handleStatCardClick('accident')}
            />

            {filters.status && (
              <button
                onClick={() => handleStatCardClick(filters.status!)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all"
              >
                <X className="w-3 h-3" />
                مسح الفلتر
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-4 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="بحث باللوحة، الموديل، VIN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-40">
                <SlidersHorizontal className="w-4 h-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="mileage">المسافة</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter Dropdown */}
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-10 w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">متاحة</SelectItem>
                <SelectItem value="rented">مؤجرة</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
                <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                <SelectItem value="reserved">محجوزة</SelectItem>
                <SelectItem value="reserved_employee">محجوزة لموظف</SelectItem>
                <SelectItem value="accident">حادث</SelectItem>
                <SelectItem value="stolen">مسروقة</SelectItem>
                <SelectItem value="police_station">في مركز الشرطة</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset */}
            {(activeFiltersCount > 0 || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-10"
              >
                <RotateCcw className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Split View */}
        {viewMode === 'split' ? (
          <VehicleSplitView
            vehicles={vehiclesData?.data || []}
            isLoading={vehiclesLoading}
            companyId={user?.profile?.company_id || null}
            onEditVehicle={handleEditVehicle}
            onDeleteVehicle={(vehicle) => setVehicleToDelete(vehicle)}
          />
        ) : vehiclesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 bg-white rounded-xl border animate-pulse" />
            ))}
          </div>
        ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
          <>
            {/* Bulk Actions Bar */}
            {selectedVehicles.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-teal-50 border border-teal-200 rounded-3xl p-4 flex items-center justify-between"
              >
                <p className="text-sm text-teal-700">
                  <span className="font-semibold">{selectedVehicles.size}</span> مركبة محددة
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9">
                    تصدير
                  </Button>
                  <Button size="sm" variant="outline" className="h-9" onClick={() => setSelectedVehicles(new Set())}>
                    إلغاء التحديد
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Vehicle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehiclesData.data.map((vehicle, index) => (
                <div key={vehicle.id} className="relative">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedVehicles.has(vehicle.id)}
                    onChange={() => handleSelectVehicle(vehicle.id)}
                    className="absolute top-4 left-4 z-10 w-4 h-4 rounded border-neutral-300 checked:bg-rose-500 focus:ring-rose-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <VehicleCard
                    vehicle={vehicle}
                    index={index}
                    onView={() => handleViewVehicle(vehicle.id)}
                    onEdit={() => handleEditVehicle(vehicle)}
                    onDelete={() => setVehicleToDelete(vehicle)}
                    onCopy={() => handleCopyVehicle(vehicle)}
                    onStatusChange={() => handleStatusChange(vehicle)}
                    onQuickAction={(action) => handleQuickAction(action, vehicle)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-4 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
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
                        currentPage === page && "bg-coral-600 text-white hover:bg-coral-700"
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
                          currentPage === totalPages && "bg-coral-600 text-white hover:bg-coral-700"
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
          </>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border">
            <Car className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد مركبات</h3>
            <p className="text-sm text-neutral-500 mb-6">
              {activeFiltersCount > 0 || searchQuery
                ? 'لم يتم العثور على مركبات تطابق البحث'
                : 'ابدأ بإضافة أول مركبة للأسطول'}
            </p>
            <Button onClick={() => setShowVehicleForm(true)} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
              <Plus className="w-4 h-4 ml-2" />
              إضافة مركبة
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showVehicleForm} onOpenChange={handleVehicleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle || undefined}
            open={showVehicleForm}
            onOpenChange={handleVehicleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>إدارة مجموعات المركبات</DialogTitle>
          </DialogHeader>
          {user?.profile?.company_id && (
            <VehicleGroupManagement companyId={user.profile.company_id} />
          )}
        </DialogContent>
      </Dialog>

      <VehicleCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false);
          refetch();
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {vehicleToDelete && (
                <>
                  سيتم حذف المركبة <strong>{vehicleToDelete.plate_number}</strong> ({vehicleToDelete.make} {vehicleToDelete.model}).
                  هذا الإجراء لا يمكن التراجع عنه.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteVehicle.isPending}
            >
              {deleteVehicle.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {vehicleForStatus && (
        <VehicleStatusChangeDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          vehicleId={vehicleForStatus.id}
          currentStatus={vehicleForStatus.status}
          currentNotes={vehicleForStatus.notes}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
            queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
            refetch();
          }}
        />
      )}

    </div>
  );
};

export default FleetPageRedesigned;
