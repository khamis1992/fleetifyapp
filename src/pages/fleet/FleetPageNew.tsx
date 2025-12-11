/**
 * صفحة إدارة الأسطول - التصميم الجديد
 * مستوحى من تصميم Fleet Inventory الحديث
 * متوافق مع ألوان الداشبورد
 * 
 * @component FleetPageNew
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Wrench,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  Fuel,
  Gauge,
  Settings,
  Calendar,
  MapPin,
  Tag,
  Upload,
  Download,
  FileText,
  Layers3,
  Calculator,
  X,
  RotateCcw,
  LayoutGrid,
  Columns,
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

// ===== Vehicle Card Component =====
interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  index,
  onView,
  onEdit,
  onDelete,
  onCopy,
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'متاحة', bg: 'bg-green-500', text: 'text-white' };
      case 'rented':
        return { label: 'مؤجرة', bg: 'bg-purple-500', text: 'text-white' };
      case 'maintenance':
        return { label: 'صيانة', bg: 'bg-amber-500', text: 'text-white' };
      case 'out_of_service':
        return { label: 'خارج الخدمة', bg: 'bg-red-500', text: 'text-white' };
      case 'reserved':
        return { label: 'محجوزة', bg: 'bg-blue-500', text: 'text-white' };
      case 'accident':
        return { label: 'حادث', bg: 'bg-rose-600', text: 'text-white' };
      case 'stolen':
        return { label: 'مسروقة', bg: 'bg-slate-700', text: 'text-white' };
      case 'police_station':
        return { label: 'في مركز الشرطة', bg: 'bg-orange-600', text: 'text-white' };
      default:
        return { label: status, bg: 'bg-neutral-500', text: 'text-white' };
    }
  };

  const statusConfig = getStatusConfig(vehicle.status || 'available');

  const handleCopyVin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle.vin) {
      navigator.clipboard.writeText(vehicle.vin);
      toast.success('تم نسخ رقم الهيكل');
    }
  };

  // الحصول على علامات الصيانة
  const getMaintenanceTags = () => {
    const tags: string[] = [];
    if (vehicle.next_service_date) {
      const serviceDate = new Date(vehicle.next_service_date);
      if (serviceDate <= new Date()) {
        tags.push('فحص دوري');
      }
    }
    if (vehicle.current_mileage && vehicle.current_mileage > 50000) {
      tags.push('تغيير زيت');
    }
    if (vehicle.insurance_expiry) {
      const insuranceDate = new Date(vehicle.insurance_expiry);
      const daysUntilExpiry = Math.ceil((insuranceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        tags.push('تجديد تأمين');
      }
    }
    return tags.length > 0 ? tags : ['جاهزة للاستخدام'];
  };

  const maintenanceTags = getMaintenanceTags();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-xl hover:border-coral-200 transition-all duration-300 group cursor-pointer"
      onClick={onView}
    >
      {/* Header - Status & Serial */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Badge className={cn("text-xs px-3 py-1 rounded-full font-medium", statusConfig.bg, statusConfig.text)}>
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-neutral-400 font-mono">
          {vehicle.plate_number}
        </span>
      </div>

      {/* Vehicle Image */}
      <div className="h-40 mx-4 mt-3 rounded-xl overflow-hidden bg-neutral-100 relative">
        {vehicle.images && vehicle.images[0] ? (
          <img
            src={vehicle.images[0]}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50">
            <Car className="w-16 h-16 text-neutral-300" />
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="p-4 space-y-3">
        {/* Make & Model */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <Car className="w-4 h-4 text-neutral-600" />
          </div>
          <h3 className="font-bold text-neutral-900 text-sm group-hover:text-coral-600 transition-colors">
            {vehicle.year} - {vehicle.make} {vehicle.model}
          </h3>
        </div>

        {/* Specs Row */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>{vehicle.engine_size || '2.5-L'} {vehicle.engine_type || 'DOHC'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-md">
            <Gauge className="w-3.5 h-3.5" />
            <span className="font-medium">{vehicle.transmission === 'automatic' ? 'أوتوماتيك' : 'يدوي'}</span>
          </div>
        </div>

        {/* VIN Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Tag className="w-3.5 h-3.5" />
            <span>VIN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-neutral-700">{vehicle.vin || 'غير محدد'}</span>
            {vehicle.vin && (
              <button
                onClick={handleCopyVin}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400 hover:text-coral-500" />
              </button>
            )}
          </div>
        </div>

        {/* Maintenance Tags */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-neutral-100">
          {maintenanceTags.slice(0, 3).map((tag, i) => (
            <Badge
              key={i}
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-md",
                tag === 'جاهزة للاستخدام' 
                  ? 'bg-green-50 text-green-600 border-green-200' 
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              )}
            >
              {tag}
            </Badge>
          ))}
          {maintenanceTags.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-500">
              +{maintenanceTags.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'green' | 'coral' | 'amber' | 'red';
  onClick: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, onClick, isActive }) => {
  const colorStyles = {
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', activeBg: 'bg-green-100' },
    coral: { bg: 'bg-coral-50', text: 'text-coral-600', border: 'border-coral-200', activeBg: 'bg-coral-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', activeBg: 'bg-red-100' },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-5 border shadow-sm hover:shadow-lg transition-all cursor-pointer",
        isActive ? style.activeBg : '',
        isActive ? style.border : 'border-neutral-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", style.bg)}>
          <Icon className={cn("w-6 h-6", style.text)} />
        </div>
        {isActive && (
          <Badge className="bg-coral-500 text-white text-[10px]">نشط</Badge>
        )}
      </div>
      <div className="mt-4">
        <p className={cn("text-3xl font-black", style.text)}>{value}</p>
        <p className="text-sm text-neutral-500 font-medium mt-1">{title}</p>
      </div>
    </motion.div>
  );
};

// ===== Main Component =====
const FleetPageNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<IVehicleFilters>({ excludeMaintenanceStatus: false });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid'); // View mode toggle

  // Hooks
  const deleteVehicle = useDeleteVehicle();
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehiclesPaginated(
    currentPage,
    pageSize,
    { ...filters, search: searchQuery || undefined }
  );

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
    delete (vehicleData as any).created_at;
    delete (vehicleData as any).updated_at;
    setEditingVehicle(vehicleData as Vehicle);
    setShowVehicleForm(true);
    toast.success('تم نسخ المركبة');
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== false).length;
  const totalPages = vehiclesData?.totalPages || 1;

  // Loading
  if (statusLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="max-w-[1600px] mx-auto p-5">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-coral-500 to-coral-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Car className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">إدارة الأسطول</h1>
              <p className="text-sm text-neutral-500">إدارة وتتبع جميع المركبات في الأسطول</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-neutral-200">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg px-3",
                  viewMode === 'grid' && "bg-coral-500 text-white hover:bg-coral-600"
                )}
              >
                <LayoutGrid className="w-4 h-4 ml-1" />
                شبكة
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
                className={cn(
                  "rounded-lg px-3",
                  viewMode === 'split' && "bg-coral-500 text-white hover:bg-coral-600"
                )}
              >
                <Columns className="w-4 h-4 ml-1" />
                مقسم
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="bg-white gap-2"
              onClick={() => navigate('/fleet/financial-analysis')}
            >
              <Calculator className="w-4 h-4" />
              التحليل المالي
            </Button>
            <Button
              variant="outline"
              className="bg-white gap-2"
              onClick={() => setShowGroupManagement(true)}
            >
              <Layers3 className="w-4 h-4" />
              المجموعات
            </Button>
            {user?.roles?.includes('super_admin') && (
              <Button
                variant="outline"
                className="bg-white gap-2"
                onClick={() => setShowCSVUpload(true)}
              >
                <Upload className="w-4 h-4" />
                استيراد
              </Button>
            )}
            <Button
              className="bg-coral-500 hover:bg-coral-600 text-white gap-2 shadow-lg"
              onClick={() => setShowVehicleForm(true)}
            >
              <Plus className="w-4 h-4" />
              إضافة مركبة
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="المركبات المتاحة"
            value={fleetStatus?.available || 0}
            icon={CheckCircle}
            color="green"
            onClick={() => handleStatCardClick('available')}
            isActive={filters.status === 'available'}
          />
          <StatCard
            title="المركبات المؤجرة"
            value={fleetStatus?.rented || 0}
            icon={TrendingUp}
            color="coral"
            onClick={() => handleStatCardClick('rented')}
            isActive={filters.status === 'rented'}
          />
          <StatCard
            title="قيد الصيانة"
            value={fleetStatus?.maintenance || 0}
            icon={Wrench}
            color="amber"
            onClick={() => handleStatCardClick('maintenance')}
            isActive={filters.status === 'maintenance'}
          />
          <StatCard
            title="خارج الخدمة"
            value={fleetStatus?.outOfService || 0}
            icon={AlertTriangle}
            color="red"
            onClick={() => handleStatCardClick('out_of_service')}
            isActive={filters.status === 'out_of_service'}
          />
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-neutral-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <Input
                placeholder="البحث عن مركبة... (رقم اللوحة، الموديل، VIN)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-12 h-12 rounded-xl border-neutral-200 focus:border-coral-500"
              />
            </div>

            {/* Sort */}
            <Select defaultValue="newest">
              <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
                <SlidersHorizontal className="w-4 h-4 ml-2" />
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="mileage">الكيلومترات</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select 
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-full md:w-[160px] h-12 rounded-xl">
                <SelectValue placeholder="حالة المركبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    متاحة
                  </span>
                </SelectItem>
                <SelectItem value="rented">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    مؤجرة
                  </span>
                </SelectItem>
                <SelectItem value="maintenance">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    صيانة
                  </span>
                </SelectItem>
                <SelectItem value="out_of_service">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    خارج الخدمة
                  </span>
                </SelectItem>
                <SelectItem value="reserved">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    محجوزة
                  </span>
                </SelectItem>
                <SelectItem value="accident">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    حادث
                  </span>
                </SelectItem>
                <SelectItem value="stolen">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                    مسروقة
                  </span>
                </SelectItem>
                <SelectItem value="police_station">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                    في مركز الشرطة
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                className="h-12 rounded-xl gap-2"
                onClick={handleResetFilters}
              >
                <RotateCcw className="w-4 h-4" />
                إعادة تعيين
              </Button>
            )}
          </div>
        </div>

        {/* Vehicles View - Grid or Split */}
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
              <div key={i} className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse">
                <div className="h-40 bg-neutral-200 rounded-xl mb-4" />
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehiclesData.data.map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  index={index}
                  onView={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
                  onEdit={() => handleEditVehicle(vehicle)}
                  onDelete={() => setVehicleToDelete(vehicle)}
                  onCopy={() => handleCopyVehicle(vehicle)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-2xl p-4 border border-neutral-200">
                <p className="text-sm text-neutral-500">
                  عرض <span className="font-bold">{vehiclesData.data.length}</span> من <span className="font-bold">{vehiclesData.count}</span> مركبة
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "rounded-lg w-9 h-9",
                          currentPage === page && "bg-coral-500 hover:bg-coral-600"
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-neutral-400">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="rounded-lg w-9 h-9"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : viewMode === 'grid' ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
            <Car className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد مركبات</h3>
            <p className="text-neutral-500 mb-4">
              {activeFiltersCount > 0 ? 'لم يتم العثور على مركبات تطابق الفلاتر' : 'ابدأ بإضافة أول مركبة للأسطول'}
            </p>
            <Button onClick={() => setShowVehicleForm(true)} className="bg-coral-500 hover:bg-coral-600">
              <Plus className="w-4 h-4 ml-2" />
              إضافة مركبة
            </Button>
          </div>
        ) : null}
      </div>

      {/* Dialogs */}
      <Dialog open={showVehicleForm} onOpenChange={handleVehicleFormClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"}
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
          queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المركبة</AlertDialogTitle>
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

    </div>
  );
};

export default FleetPageNew;

