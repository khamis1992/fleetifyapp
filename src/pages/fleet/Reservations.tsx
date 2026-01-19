/**
 * Fleet Reservations Page - Premium Automotive SaaS Design
 * Modern glass-morphism aesthetic with teal accents
 * Distinctive card-based layout replacing traditional tables
 *
 * @component Reservations
 */

import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Eye,
  Edit,
  Trash2,
  Car,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  CreditCard,
  MapPin,
  ArrowUpDown
} from "lucide-react";
import { useOptimizedReservations } from "@/hooks/useOptimizedReservations";
import { useVehicleStatusUpdate, useCompleteReservationStatus, useCancelReservationStatus } from "@/hooks/useVehicleStatusIntegration";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useDeleteReservation } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PageHelp } from "@/components/help";
import { ReservationsCalendar } from "@/components/fleet/ReservationsCalendar";
import { MobileQuickNav } from "@/components/dashboard/customization/MobileQuickNav";
import { toast } from "sonner";

// Lazy load components
const ReservationForm = lazy(() =>
  import("@/components/fleet/ReservationForm").then(m => ({ default: m.ReservationForm }))
);

// ===== TYPE DEFINITIONS =====
type ReservationStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
type ReservationType = 'short_term' | 'long_term' | 'hourly' | 'daily' | 'weekly';
type ViewMode = 'calendar' | 'list' | 'stats';

// ===== STATUS CONFIGURATION =====
const statusConfig: Record<ReservationStatus, {
  label: string;
  color: string;
  bgGradient: string;
  textColor: string;
  icon: React.ElementType;
  dotColor: string;
}> = {
  pending: {
    label: "معلقة",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    bgGradient: "from-amber-50 to-amber-100/50",
    textColor: "text-amber-700",
    icon: Clock,
    dotColor: "bg-amber-500"
  },
  confirmed: {
    label: "مؤكدة",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bgGradient: "from-emerald-50 to-emerald-100/50",
    textColor: "text-emerald-700",
    icon: CheckCircle,
    dotColor: "bg-emerald-500"
  },
  active: {
    label: "نشطة",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    bgGradient: "from-teal-50 to-teal-100/50",
    textColor: "text-teal-700",
    icon: Sparkles,
    dotColor: "bg-teal-500"
  },
  completed: {
    label: "مكتملة",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    bgGradient: "from-slate-50 to-slate-100/50",
    textColor: "text-slate-700",
    icon: CheckCircle,
    dotColor: "bg-slate-500"
  },
  cancelled: {
    label: "ملغاة",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    bgGradient: "from-rose-50 to-rose-100/50",
    textColor: "text-rose-700",
    icon: XCircle,
    dotColor: "bg-rose-500"
  }
};

// ===== TYPE CONFIGURATION =====
const typeConfig: Record<ReservationType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
}> = {
  short_term: {
    label: "قصيرة الأجل",
    icon: Clock,
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-blue-100/50"
  },
  long_term: {
    label: "طويلة الأجل",
    icon: CalendarDays,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-purple-100/50"
  },
  hourly: {
    label: "بالساعة",
    icon: Clock,
    color: "text-amber-600",
    bgGradient: "from-amber-50 to-amber-100/50"
  },
  daily: {
    label: "يومي",
    icon: CalendarDays,
    color: "text-teal-600",
    bgGradient: "from-teal-50 to-teal-100/50"
  },
  weekly: {
    label: "أسبوعي",
    icon: CalendarDays,
    color: "text-indigo-600",
    bgGradient: "from-indigo-50 to-indigo-100/50"
  }
};

// ===== PREMIUM STAT CARD =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  delay: number;
  onClick?: () => void;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgGradient,
  delay,
  onClick,
  trend,
  trendUp
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    className={cn(
      "relative group overflow-hidden rounded-3xl border bg-white/80 backdrop-blur-xl",
      "hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1",
      "transition-all duration-500 cursor-pointer",
      "border-slate-200/50 hover:border-teal-500/30"
    )}
  >
    {/* Animated Background Gradient */}
    <div className={cn(
      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100",
      "transition-opacity duration-500",
      bgGradient
    )} />

    {/* Decorative Pattern */}
    <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-500" style={{ background: color.replace('text-', 'bg-') }} />

    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-2xl bg-gradient-to-br shadow-lg",
          "group-hover:scale-110 group-hover:rotate-3",
          "transition-all duration-500"
        )} style={{ background: color.replace('text-', 'bg-') + '/10' }}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
            trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  </motion.div>
);

// ===== RESERVATION CARD =====
interface ReservationCardProps {
  reservation: any;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  index,
  onView,
  onEdit,
  onDelete,
  onConfirm,
  onCancel
}) => {
  const status = statusConfig[reservation.status as ReservationStatus] || statusConfig.pending;
  const type = typeConfig[reservation.type as ReservationType];
  const StatusIcon = status.icon;
  const TypeIcon = type?.icon || Clock;

  // Get customer initials
  const customerInitials = reservation.customers?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'NA';

  // Format dates
  const startDate = new Date(reservation.start_date);
  const endDate = reservation.end_date ? new Date(reservation.end_date) : null;
  const daysCount = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      {/* Card Container */}
      <div className={cn(
        "relative bg-white/80 backdrop-blur-xl rounded-3xl border overflow-hidden",
        "hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1",
        "transition-all duration-500",
        "border-slate-200/50 hover:border-teal-500/30"
      )}>
        {/* Status Bar */}
        <div className={cn(
          "h-1.5 w-full bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500",
          "group-hover:from-teal-400 group-hover:via-teal-300 group-hover:to-teal-400",
          "transition-all duration-500"
        )} />

        <div className="p-5">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4">
            {/* Reservation Number & Type */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {reservation.reservation_number}
                </span>
                {type && (
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    type.bgGradient,
                    type.color
                  )}>
                    <TypeIcon className="w-3 h-3" />
                    {type.label}
                  </div>
                )}
              </div>

              {/* Dates with Visual Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">تاريخ البدء</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {startDate.toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>

                {endDate && (
                  <>
                    <div className="w-8 h-0.5 bg-slate-200" />
                    <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-xl">
                      <Clock className="w-4 h-4 text-teal-500" />
                      <div>
                        <p className="text-xs text-teal-600">المدة</p>
                        <p className="text-sm font-bold text-teal-700">
                          {daysCount} يوم
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border",
              "transition-all duration-300 group-hover:scale-105",
              status.color
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", status.dotColor)} />
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{status.label}</span>
            </div>
          </div>

          {/* Customer & Vehicle Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Customer */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-200">
                {customerInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">العميل</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {reservation.customers?.name || '-'}
                </p>
                {reservation.customers?.email && (
                  <p className="text-xs text-slate-400 truncate">{reservation.customers.email}</p>
                )}
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white shadow-lg">
                <Car className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">المركبة</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {reservation.vehicles?.plate_number || '-'}
                </p>
                {reservation.vehicles && (
                  <p className="text-xs text-slate-400 truncate">
                    {reservation.vehicles.make} {reservation.vehicles.model}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50/50 rounded-2xl mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-slate-700">المبلغ الإجمالي</span>
            </div>
            <span className="text-2xl font-bold text-teal-700">
              {useCurrencyFormatter().formatCurrency(reservation.total_amount || 0)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Quick Status Actions */}
            {reservation.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={onConfirm}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  تأكيد
                </Button>
                <Button
                  size="sm"
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                >
                  <XCircle className="w-4 h-4 ml-1" />
                  إلغاء
                </Button>
              </>
            )}

            {reservation.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => {/* Activate reservation */}}
                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-300 transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 ml-1" />
                تفعيل
              </Button>
            )}

            {/* Always show view/edit */}
            <Button
              size="sm"
              variant="outline"
              onClick={onView}
              className="px-4 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all duration-300"
            >
              <Eye className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="px-4 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="px-4 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all duration-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== FILTER PILL BUTTON =====
interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}

const FilterPill: React.FC<FilterPillProps> = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
      "hover:shadow-md hover:-translate-y-0.5",
      active
        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30"
        : "bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
    )}
  >
    {children}
    {count !== undefined && (
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs font-bold",
        active ? "bg-white/20" : "bg-slate-100 text-slate-500"
      )}>
        {count}
      </span>
    )}
  </button>
);

// ===== MAIN COMPONENT =====
export default function Reservations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | undefined>(undefined);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const itemsPerPage = 12;

  // Read parameters from URL
  useEffect(() => {
    const reservationParam = searchParams.get('reservation');
    if (reservationParam) {
      setSelectedReservationId(reservationParam);
      setShowReservationForm(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('reservation');
        return newParams;
      }, { replace: true });
    }

    const vehicleParam = searchParams.get('vehicle');
    if (vehicleParam) {
      setSelectedVehicleId(vehicleParam);
      setShowReservationForm(true);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('vehicle');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Optimized data fetching
  const { data, loadingStage, loadingProgress, invalidateCache, searchInCachedData } = useOptimizedReservations({
    enabled: true
  });

  const { formatCurrency } = useCurrencyFormatter();
  const completeReservationStatus = useCompleteReservationStatus();
  const cancelReservationStatus = useCancelReservationStatus();
  const deleteReservation = useDeleteReservation();

  // Calculate stats
  const stats = useMemo(() => {
    if (!data.reservations) return null;

    const pending = data.reservations.filter((r: any) => r.status === 'pending').length;
    const active = data.reservations.filter((r: any) => r.status === 'active').length;
    const confirmed = data.reservations.filter((r: any) => r.status === 'confirmed').length;
    const completed = data.reservations.filter((r: any) => r.status === 'completed').length;
    const totalRevenue = data.reservations
      .filter((r: any) => r.status === 'completed')
      .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);

    return { pending, active, confirmed, completed, totalRevenue };
  }, [data.reservations]);

  // Filtered and paginated data
  const filteredData = useMemo(() => {
    if (!data.reservations || !data.reservations.length) {
      return {
        paginatedData: [],
        totalCount: 0,
        statusCounts: {
          all: data.reservations?.length || 0,
          pending: 0,
          confirmed: 0,
          active: 0,
          completed: 0,
          cancelled: 0
        }
      };
    }

    let filtered = [...data.reservations];

    // Calculate status counts
    const statusCounts = {
      all: data.reservations.length,
      pending: data.reservations.filter((r: any) => r.status === 'pending').length,
      confirmed: data.reservations.filter((r: any) => r.status === 'confirmed').length,
      active: data.reservations.filter((r: any) => r.status === 'active').length,
      completed: data.reservations.filter((r: any) => r.status === 'completed').length,
      cancelled: data.reservations.filter((r: any) => r.status === 'cancelled').length
    };

    // Apply filters
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(r => {
        const reservationDate = new Date(r.start_date);
        const filterDate = new Date(dateFilter);
        return reservationDate.toDateString() === filterDate.toDateString();
      });
    }

    if (searchQuery) {
      filtered = searchInCachedData(
        filtered,
        searchQuery,
        ['plate_number', 'customer_name', 'vehicle_make', 'vehicle_model']
      );
    }

    // Pagination
    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      paginatedData,
      totalCount,
      statusCounts
    };
  }, [data.reservations, statusFilter, typeFilter, dateFilter, searchQuery, currentPage, searchInCachedData]);

  const totalPages = Math.ceil(filteredData.totalCount / itemsPerPage);

  // Handlers
  const handleCreateNew = () => {
    setSelectedReservationId(undefined);
    setSelectedVehicleId(undefined);
    setShowReservationForm(true);
  };

  const handleViewDetails = (reservation: any) => {
    setSelectedReservation(reservation);
    setShowDetailPanel(true);
  };

  const handleEdit = (reservation: any) => {
    setSelectedReservationId(reservation.id);
    setShowReservationForm(true);
  };

  const handleDelete = (reservation: any) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
      deleteReservation(reservation.id);
      invalidateCache();
    }
  };

  const handleConfirm = (reservation: any) => {
    if (window.confirm('هل أنت متأكد من تأكيد هذا الحجز؟')) {
      completeReservationStatus(reservation.id);
      invalidateCache();
    }
  };

  const handleCancel = (reservation: any) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      cancelReservationStatus(reservation.id);
      invalidateCache();
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter("");
    setCurrentPage(1);
  };

  // Loading state
  if (loadingStage === 'idle' && !data.reservations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <Car className="absolute inset-0 m-auto w-6 h-6 text-teal-500" />
          </div>
          <p className="text-slate-600 font-medium">جاري تحميل الحجوزات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/30">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">إدارة الحجوزات</h1>
                  <p className="text-sm text-slate-500">إدارة ومتابعة حجوزات المركبات</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2",
                      viewMode === 'calendar'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span className="hidden md:inline">التقويم</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2",
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden md:inline">القائمة</span>
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {/* Refresh */}}
                  className="rounded-xl"
                >
                  <Search className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={handleCreateNew}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  حجز جديد
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Stats Dashboard - Always Visible */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="قيد الانتظار"
                value={stats.pending}
                subtitle="تحتاج تأكيد"
                icon={Clock}
                color="text-amber-600"
                bgGradient="from-amber-50 to-amber-100/50"
                delay={0}
                onClick={() => { setViewMode('list'); setStatusFilter('pending'); }}
              />
              <StatCard
                title="نشطة الآن"
                value={stats.active}
                subtitle="جاري التشغيل"
                icon={Sparkles}
                color="text-teal-600"
                bgGradient="from-teal-50 to-teal-100/50"
                delay={0.1}
                onClick={() => { setViewMode('list'); setStatusFilter('active'); }}
              />
              <StatCard
                title="مكتملة"
                value={stats.completed}
                subtitle="تم تسليمها"
                icon={CheckCircle}
                color="text-emerald-600"
                bgGradient="from-emerald-50 to-emerald-100/50"
                delay={0.2}
                onClick={() => { setViewMode('list'); setStatusFilter('completed'); }}
              />
              <StatCard
                title="الإيرادات"
                value={formatCurrency(stats.totalRevenue)}
                subtitle="من الحجوزات المكتملة"
                icon={CreditCard}
                color="text-purple-600"
                bgGradient="from-purple-50 to-purple-100/50"
                delay={0.3}
              />
            </div>
          )}

          {/* Loading Progress */}
          {loadingStage !== 'idle' && loadingProgress < 100 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6 hover:border-teal-500/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">جاري تحميل البيانات</h3>
                    <p className="text-xs text-slate-500">نحضر أفضل تجربة لك</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-teal-600">{loadingProgress}%</div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6 hover:border-teal-500/30 hover:shadow-xl transition-all"
            >
              <ReservationsCalendar
                reservations={data.reservations || []}
                loading={loadingStage === 'reservations'}
              />
            </motion.div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              {/* Search & Filters Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6 hover:border-teal-500/30 hover:shadow-xl transition-all"
              >
                {/* Search */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      placeholder="بحث بالعميل، رقم اللوحة، أو المركبة..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-3 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white/50"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-3">
                  <FilterPill
                    active={statusFilter === 'all'}
                    onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                    count={filteredData.statusCounts?.all}
                  >
                    <Filter className="w-4 h-4" />
                    الكل
                  </FilterPill>

                  <FilterPill
                    active={statusFilter === 'pending'}
                    onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                    count={filteredData.statusCounts?.pending}
                  >
                    <Clock className="w-4 h-4" />
                    معلقة
                  </FilterPill>

                  <FilterPill
                    active={statusFilter === 'confirmed'}
                    onClick={() => { setStatusFilter('confirmed'); setCurrentPage(1); }}
                    count={filteredData.statusCounts?.confirmed}
                  >
                    <CheckCircle className="w-4 h-4" />
                    مؤكدة
                  </FilterPill>

                  <FilterPill
                    active={statusFilter === 'active'}
                    onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                    count={filteredData.statusCounts?.active}
                  >
                    <Sparkles className="w-4 h-4" />
                    نشطة
                  </FilterPill>

                  <FilterPill
                    active={statusFilter === 'completed'}
                    onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
                    count={filteredData.statusCounts?.completed}
                  >
                    <CheckCircle className="w-4 h-4" />
                    مكتملة
                  </FilterPill>

                  {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="rounded-xl hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all"
                    >
                      <X className="w-4 h-4 ml-2" />
                      إعادة تعيين
                    </Button>
                  )}
                </div>

                {/* Results Count */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{filteredData.totalCount}</span> حجز
                  </p>
                </div>
              </motion.div>

              {/* Reservations Grid */}
              {filteredData.paginatedData.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredData.paginatedData.map((reservation: any, index: number) => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        index={index}
                        onView={() => handleViewDetails(reservation)}
                        onEdit={() => handleEdit(reservation)}
                        onDelete={() => handleDelete(reservation)}
                        onConfirm={() => handleConfirm(reservation)}
                        onCancel={() => handleCancel(reservation)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-4">
                      <p className="text-sm text-slate-600">
                        صفحة <span className="font-bold text-slate-900">{currentPage}</span> من <span className="font-bold text-slate-900">{totalPages}</span>
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

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-10 h-10 rounded-lg",
                              currentPage === page && "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
                            )}
                          >
                            {page}
                          </Button>
                        ))}

                        {totalPages > 5 && (
                          <>
                            <span className="px-2 text-slate-400">...</span>
                            <Button
                              variant={currentPage === totalPages ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              className={cn(
                                "w-10 h-10 rounded-lg",
                                currentPage === totalPages && "bg-gradient-to-r from-teal-500 to-teal-600 text-white"
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
                          className="rounded-lg"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Empty State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/80 backdrop-blur-xl rounded-3xl border border-dashed border-slate-300 p-16 text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <CalendarDays className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد حجوزات</h3>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter
                      ? 'جرب تغيير معايير البحث أو الفلاتر'
                      : 'ابدأ بإنشاء حجز جديد لإدارة حجوزات المركبات'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && !dateFilter && (
                    <Button
                      onClick={handleCreateNew}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/20"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء حجز جديد
                    </Button>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Quick Navigation */}
      <MobileQuickNav
        isVisible={viewMode === 'list'}
        onClose={() => setViewMode('list')}
      />

      {/* Detail Side Panel */}
      <AnimatePresence>
        {showDetailPanel && selectedReservation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailPanel(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">تفاصيل الحجز</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetailPanel(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl",
                  statusConfig[selectedReservation.status as ReservationStatus]?.bgGradient
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    statusConfig[selectedReservation.status as ReservationStatus]?.dotColor
                  )}>
                    {React.createElement(statusConfig[selectedReservation.status as ReservationStatus]?.icon || CheckCircle, {
                      className: "w-5 h-5 text-white"
                    })}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">الحالة</p>
                    <p className="font-bold text-slate-900">
                      {statusConfig[selectedReservation.status as ReservationStatus]?.label}
                    </p>
                  </div>
                </div>

                {/* Reservation Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">معلومات الحجز</h3>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">رقم الحجز</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {selectedReservation.reservation_number}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">تاريخ البدء</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {new Date(selectedReservation.start_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    {selectedReservation.end_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">تاريخ الانتهاء</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(selectedReservation.end_date).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">المبلغ الإجمالي</span>
                      <span className="text-lg font-bold text-teal-600">
                        {formatCurrency(selectedReservation.total_amount || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedReservation.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          handleConfirm(selectedReservation);
                          setShowDetailPanel(false);
                        }}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        تأكيد
                      </Button>
                      <Button
                        onClick={() => {
                          handleCancel(selectedReservation);
                          setShowDetailPanel(false);
                        }}
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <XCircle className="w-4 h-4 ml-2" />
                        إلغاء
                      </Button>
                    </>
                  )}
                  {selectedReservation.status !== 'pending' && selectedReservation.status !== 'cancelled' && selectedReservation.status !== 'completed' && (
                    <Button
                      onClick={() => {
                        handleEdit(selectedReservation);
                        setShowDetailPanel(false);
                      }}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      تعديل
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reservation Form Modal */}
      <AnimatePresence>
        {showReservationForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowReservationForm(false);
                setSelectedReservationId(undefined);
                setSelectedVehicleId(undefined);
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                  <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <ReservationForm
                  reservationId={selectedReservationId}
                  vehicleId={selectedVehicleId}
                  open={showReservationForm}
                  onOpenChange={(open) => {
                    if (!open) {
                      setShowReservationForm(false);
                      setSelectedReservationId(undefined);
                      setSelectedVehicleId(undefined);
                    }
                  }}
                  onClose={() => {
                    setShowReservationForm(false);
                    setSelectedReservationId(undefined);
                    setSelectedVehicleId(undefined);
                  }}
                  onSuccess={() => {
                    setShowReservationForm(false);
                    setSelectedReservationId(undefined);
                    setSelectedVehicleId(undefined);
                    invalidateCache();
                    toast.success('تم حفظ الحجز بنجاح');
                  }}
                />
              </Suspense>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help and Assistant */}
      <PageHelp
        content="دليل استخدام صفحة الحجوزات"
        title="مساعد صفحة الحجوزات"
      />
    </div>
  );
}
