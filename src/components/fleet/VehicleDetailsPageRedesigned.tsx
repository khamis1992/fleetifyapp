/**
 * صفحة تفاصيل المركبة - تصميم إبداعي مميز
 * Premium Automotive Editorial Design
 *
 * A bold, magazine-inspired design that breaks conventional patterns
 * while maintaining excellent usability for fleet management.
 *
 * @component VehicleDetailsPageRedesigned
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Vehicle } from '@/hooks/useVehicles';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TabErrorFallback from '@/components/common/TabErrorFallback';
import {
  ArrowRight,
  Edit3,
  Wrench,
  FileText,
  DollarSign,
  Gauge,
  Info,
  Tag,
  AlertTriangle,
  Plus,
  Car,
  Heart,
  Star,
  Fuel,
  Copy,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Zap,
  X,
  Settings,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { VehiclePricingPanel } from './VehiclePricingPanel';
import { VehicleDocumentsPanel } from './VehicleDocumentsPanel';
import { VehicleForm } from './VehicleForm';
import { MaintenanceForm } from './MaintenanceForm';
import { TrafficViolationForm } from './TrafficViolationForm';

// ===== Design Tokens =====
const COLOR = {
  primary: '#20b2aa',
  primaryDark: '#1a9a96',
  primaryLight: '#e6fffe',
  accent: '#ff6b35',
  dark: '#1a1a2e',
  darkLight: '#16213e',
  cream: '#faf9f7',
  slate: '#6b7280',
};

// ===== Status Config =====
const STATUS_CONFIG = {
  available: { label: 'متاحة', color: '#10b981' },
  rented: { label: 'مؤجرة', color: '#8b5cf6' },
  maintenance: { label: 'صيانة', color: '#f59e0b' },
  out_of_service: { label: 'خارج الخدمة', color: '#ef4444' },
  reserved: { label: 'محجوزة', color: '#3b82f6' },
  reserved_employee: { label: 'محجوزة موظف', color: '#6366f1' },
  accident: { label: 'حادث', color: '#f43f5e' },
  stolen: { label: 'مسروقة', color: '#64748b' },
  police_station: { label: 'مركز الشرطة', color: '#f97316' },
};

const CRITICAL_STATUSES = ['accident', 'stolen', 'police_station', 'out_of_service'];

// ===== Utility Functions =====
const getContractStatusLabel = (status: string): string => {
  const labels: Record<string, string> = { active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي', pending: 'قيد الانتظار', expired: 'منتهي', draft: 'مسودة' };
  return labels[status] || status;
};

const getMaintenanceStatusLabel = (status: string): string => {
  const labels: Record<string, string> = { completed: 'مكتملة', pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', scheduled: 'مجدولة', cancelled: 'ملغاة' };
  return labels[status] || status;
};

// ===== Creative Components =====

// Hero Section with Dramatic Layout
const HeroSection = ({ vehicle, images, currentIndex, onIndexChange, formatCurrency, vehicleStats, vehicleName }: any) => {
  return (
    <div className="relative mb-8">
      {/* Decorative Elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${COLOR.primary} 0%, transparent 70%)` }} />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${COLOR.accent} 0%, transparent 70%)` }} />

      <div className="relative">
        {/* Giant Year Badge - Editorial Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full flex items-center justify-center text-white font-black z-10"
          style={{ background: `linear-gradient(135deg, ${COLOR.primaryDark}, ${COLOR.primary})` }}
        >
          <div className="text-center">
            <div className="text-5xl">{vehicle.year || '2024'}</div>
            <div className="text-xs uppercase tracking-widest opacity-80">{vehicle.make}</div>
          </div>
        </motion.div>

        {/* Main Image */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 aspect-[16/7]">
          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                src={images[currentIndex]}
                alt={vehicleName}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-24 h-24 text-slate-300" />
            </div>
          )}

          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <ChevronRight className="w-6 h-6 text-slate-800" />
              </button>
              <button
                onClick={() => onIndexChange((currentIndex + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <ChevronLeft className="w-6 h-6 text-slate-800" />
              </button>
            </>
          )}

          {/* Floating Price Card */}
          {vehicle.daily_rate && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-6 right-6 backdrop-blur-xl bg-white/95 rounded-2xl p-5 shadow-2xl border border-white/50"
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">السعر اليومي</p>
              <p className="text-3xl font-black" style={{ color: COLOR.primary }}>{formatCurrency(vehicle.daily_rate)}</p>
              <p className="text-xs text-slate-400 mt-1">ريال قطري</p>
            </motion.div>
          )}
        </div>

        {/* Vehicle Title - Editorial Typography */}
        <div className="mt-8">
          <div className="flex items-baseline gap-4 mb-2">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">
              {vehicle.model}
            </h1>
            <div className="h-12 w-1 rounded-full" style={{ backgroundColor: COLOR.primary }} />
            <span className="text-2xl md:text-3xl font-light text-slate-500">{vehicle.make}</span>
          </div>

          {/* Quick Stats Strip */}
          <div className="flex flex-wrap items-center gap-6 mt-6 py-4 border-y-2 border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-5 h-5" style={{ color: i <= 4 ? COLOR.accent : '#e5e7eb' }} fill={i <= 4 ? COLOR.accent : 'none'} />
                ))}
              </div>
              <span className="font-semibold text-slate-900">4.8</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600">
              <Gauge className="w-5 h-5" />
              <span className="font-medium">{(vehicle.current_mileage || 0).toLocaleString('en-US')} كم</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-5 h-5" />
              <span className="font-medium">{vehicleStats?.totalTrips || 0} رحلة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Feature Pills - Modern Design
const FeaturePill = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) => (
  <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-slate-200 transition-all hover:shadow-lg cursor-default">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${COLOR.primaryLight} 0%, transparent 100%)` }} />
    <div className="relative">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${COLOR.primary}15` }}>
        <Icon className="w-6 h-6" style={{ color: COLOR.primary }} />
      </div>
      <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value || '-'}</p>
    </div>
  </div>
);

// Activity Card with Timeline
const ActivityCard = ({ icon: Icon, title, subtitle, date, status, color, onClick }: any) => (
  <motion.div
    whileHover={{ x: 4 }}
    onClick={onClick}
    className="relative bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-slate-200 transition-all cursor-pointer group"
  >
    <div className="absolute right-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all group-hover:w-2" style={{ backgroundColor: color }} />
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h4 className="font-bold text-slate-900">{title}</h4>
          {status && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
              {status}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-600 mb-1">{subtitle}</p>}
        {date && <p className="text-xs text-slate-400">{date}</p>}
      </div>
    </div>
  </motion.div>
);

// ===== Main Component =====
const VehicleDetailsPageRedesigned = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!vehicleId || !companyId) throw new Error('Missing vehicle/company ID');
      const { data, error } = await supabase
        .from('vehicles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId, companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('تم تحديث حالة المركبة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء تحديث حالة المركبة'),
  });

  // Queries
  const { data: vehicle, isLoading: loadingVehicle, error: vehicleError } = useQuery({
    queryKey: ['vehicle-details', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) throw new Error('Missing vehicle/company ID');
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

  const { data: contracts = [] } = useQuery({
    queryKey: ['vehicle-contracts', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select(`*, customer:customers!customer_id(*)`)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['vehicle-maintenance', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];
      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId && !!companyId,
  });

  const { data: violations = [] } = useQuery({
    queryKey: ['vehicle-violations', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('violation_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
  });

  const vehicleStats = useMemo(() => {
    if (!vehicle) return null;
    return {
      activeContracts: contracts.filter(c => c.status === 'active').length,
      totalRevenue: contracts.reduce((sum, c) => sum + (c.total_paid || 0), 0),
      totalTrips: contracts.length,
      pendingMaintenance: maintenanceRecords.filter(m => m.status !== 'completed').length,
      unpaidViolations: violations.filter(v => v.payment_status !== 'paid').length,
    };
  }, [vehicle, contracts, maintenanceRecords, violations]);

  const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}` : '';
  const vehicleImages = vehicle?.images && Array.isArray(vehicle.images)
    ? vehicle.images.map(img => typeof img === 'string' ? img : (img as any)?.url || '')
    : [];

  const handleStatusChange = (newStatus: string) => {
    if (CRITICAL_STATUSES.includes(newStatus)) {
      setPendingStatusChange(newStatus);
      setShowStatusConfirmDialog(true);
    } else {
      updateStatusMutation.mutate(newStatus);
    }
  };

  const getCustomerName = (customer: any): string => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') return customer.company_name_ar || customer.company_name || 'شركة';
    return `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim();
  };

  // Loading
  if (isAuthenticating || !companyId || loadingVehicle) return <PageSkeletonFallback />;

  // Error
  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{ backgroundColor: COLOR.primaryLight }}>
            <Car className="w-12 h-12" style={{ color: COLOR.primary }} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-3">المركبة غير موجودة</h3>
          <p className="text-slate-500 mb-8">لم يتم العثور على هذه المركبة</p>
          <Button onClick={() => navigate('/fleet')} className="rounded-2xl px-8 py-4 text-white font-semibold" style={{ backgroundColor: COLOR.primary }}>
            العودة للأسطول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header - Clean & Minimal */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/fleet')}
              className="rounded-full hover:bg-slate-100"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn("rounded-full hover:bg-slate-100", isFavorite && "text-rose-500")}
              >
                <Heart className={cn("w-6 h-6", isFavorite && "fill-current")} />
              </Button>
              <Button
                onClick={() => setShowEditForm(true)}
                className="rounded-full px-6 font-semibold"
                style={{ backgroundColor: COLOR.primary, color: 'white' }}
              >
                <Edit3 className="w-4 h-4 ml-2" />
                تعديل
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <HeroSection
          vehicle={vehicle}
          images={vehicleImages}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          formatCurrency={formatCurrency}
          vehicleStats={vehicleStats}
          vehicleName={vehicleName}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Features Grid - Asymmetric Layout */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: COLOR.primary }} />
                المواصفات الرئيسية
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FeaturePill icon={Users} label="المقاعد" value={vehicle.seating_capacity?.toString()} />
                <FeaturePill icon={Settings} label="ناقل الحركة" value={vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'} />
                <FeaturePill icon={Fuel} label="الوقود" value={
                  vehicle.fuel_type === 'gasoline' ? 'بنزين' :
                  vehicle.fuel_type === 'diesel' ? 'ديزل' :
                  vehicle.fuel_type === 'hybrid' ? 'هجين' :
                  vehicle.fuel_type === 'electric' ? 'كهربائي' : undefined
                } />
                <FeaturePill icon={Zap} label="السنة" value={vehicle.year?.toString()} />
              </div>
            </div>

            {/* Tabs with Bold Design */}
            <div className="bg-white rounded-3xl p-2 shadow-lg border border-slate-100">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex gap-2 px-4 pt-4 overflow-x-auto">
                  <TabsTrigger
                    value="overview"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold data-[state=active]:text-white transition-all whitespace-nowrap"
                  >
                    نظرة عامة
                  </TabsTrigger>
                  <TabsTrigger
                    value="contracts"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold data-[state=active]:text-white transition-all whitespace-nowrap relative"
                  >
                    العقود
                    {contracts.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white" style={{ backgroundColor: COLOR.accent }}>
                        {contracts.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activities"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold data-[state=active]:text-white transition-all whitespace-nowrap"
                  >
                    النشاطات
                  </TabsTrigger>
                  <TabsTrigger
                    value="pricing"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold data-[state=active]:text-white transition-all whitespace-nowrap"
                  >
                    التسعير
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold data-[state=active]:text-white transition-all whitespace-nowrap"
                  >
                    الوثائق
                  </TabsTrigger>
                </div>
                <style>{`[data-state="active"] { background-color: ${COLOR.primary} !important; }`}</style>

                <div className="p-6 mt-2">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <ErrorBoundary fallback={<TabErrorFallback tabName="نظرة عامة" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="bg-slate-50 rounded-2xl p-6">
                          <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                            <Car className="w-5 h-5" style={{ color: COLOR.primary }} />
                            معلومات المركبة
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-slate-200">
                              <span className="text-slate-500">الشركة المصنعة</span>
                              <span className="font-semibold text-slate-900">{vehicle.make}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200">
                              <span className="text-slate-500">الطراز</span>
                              <span className="font-semibold text-slate-900">{vehicle.model}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200">
                              <span className="text-slate-500">اللون</span>
                              <span className="font-semibold text-slate-900">{vehicle.color}</span>
                            </div>
                            {vehicle.plate_number && (
                              <div className="flex justify-between py-2 items-center">
                                <span className="text-slate-500">رقم اللوحة</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900">{vehicle.plate_number}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      navigator.clipboard.writeText(vehicle.plate_number);
                                      toast.success('تم نسخ رقم اللوحة');
                                    }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Technical Specs */}
                        <div className="bg-slate-50 rounded-2xl p-6">
                          <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5" style={{ color: COLOR.primary }} />
                            المواصفات التقنية
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-slate-200">
                              <span className="text-slate-500">ناقل الحركة</span>
                              <span className="font-semibold text-slate-900">{vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200">
                              <span className="text-slate-500">نوع الوقود</span>
                              <span className="font-semibold text-slate-900">
                                {vehicle.fuel_type === 'gasoline' ? 'بنزين' :
                                 vehicle.fuel_type === 'diesel' ? 'ديزل' :
                                 vehicle.fuel_type === 'hybrid' ? 'هجين' :
                                 vehicle.fuel_type === 'electric' ? 'كهربائي' : '-'}
                              </span>
                            </div>
                            {vehicle.fuel_capacity && (
                              <div className="flex justify-between py-2 border-b border-slate-200">
                                <span className="text-slate-500">سعة الخزان</span>
                                <span className="font-semibold text-slate-900">{vehicle.fuel_capacity} لتر</span>
                              </div>
                            )}
                            <div className="flex justify-between py-2">
                              <span className="text-slate-500">المسافة المقطوعة</span>
                              <span className="font-semibold text-slate-900">{(vehicle.current_mileage || 0).toLocaleString('en-US')} كم</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {vehicle.current_location && (
                        <div className="bg-slate-50 rounded-2xl p-6">
                          <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5" style={{ color: COLOR.primary }} />
                            الموقع الحالي
                          </h4>
                          <p className="text-slate-900">{vehicle.current_location}</p>
                        </div>
                      )}
                    </ErrorBoundary>
                  </TabsContent>

                  {/* Contracts Tab */}
                  <TabsContent value="contracts" className="mt-0">
                    <ErrorBoundary fallback={<TabErrorFallback tabName="العقود" />}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900">العقود</h3>
                        <Button
                          onClick={() => navigate(`/contracts?vehicle=${vehicleId}`)}
                          className="rounded-full gap-2 font-semibold"
                          style={{ backgroundColor: COLOR.primary, color: 'white' }}
                        >
                          <Plus className="w-4 h-4" />
                          عقد جديد
                        </Button>
                      </div>

                      {contracts.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-100 flex items-center justify-center">
                            <FileText className="w-10 h-10 text-slate-400" />
                          </div>
                          <p className="text-slate-500 mb-6">لا توجد عقود لهذه المركبة</p>
                          <Button
                            onClick={() => navigate(`/contracts?vehicle=${vehicleId}`)}
                            variant="outline"
                            className="rounded-full"
                          >
                            إنشاء عقد جديد
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {contracts.map((contract) => (
                            <ActivityCard
                              key={contract.id}
                              icon={FileText}
                              title={`عقد #${contract.contract_number}`}
                              subtitle={getCustomerName(contract.customer)}
                              date={contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : undefined}
                              status={getContractStatusLabel(contract.status)}
                              color={STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG]?.color || '#6b7280'}
                              onClick={() => navigate(`/contracts/${contract.contract_number}`)}
                            />
                          ))}
                        </div>
                      )}
                    </ErrorBoundary>
                  </TabsContent>

                  {/* Activities Tab */}
                  <TabsContent value="activities" className="mt-0">
                    <ErrorBoundary fallback={<TabErrorFallback tabName="النشاطات" />}>
                      <div className="flex gap-3 mb-6">
                        <Button
                          onClick={() => setShowMaintenanceForm(true)}
                          variant="outline"
                          className="rounded-full gap-2"
                        >
                          <Wrench className="w-4 h-4" />
                          تسجيل صيانة
                        </Button>
                        <Button
                          onClick={() => setShowViolationForm(true)}
                          variant="outline"
                          className="rounded-full gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          تسجيل مخالفة
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {maintenanceRecords.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">الصيانة</h3>
                            <div className="space-y-3">
                              {maintenanceRecords.map((record) => (
                                <ActivityCard
                                  key={record.id}
                                  icon={Wrench}
                                  title={record.maintenance_type || 'صيانة'}
                                  subtitle={record.service_provider}
                                  date={record.scheduled_date ? format(new Date(record.scheduled_date), 'dd/MM/yyyy') : undefined}
                                  status={getMaintenanceStatusLabel(record.status)}
                                  color={record.status === 'completed' ? '#10b981' : '#f59e0b'}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {violations.length > 0 && (
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">المخالفات</h3>
                            <div className="space-y-3">
                              {violations.map((violation) => (
                                <ActivityCard
                                  key={violation.id}
                                  icon={AlertTriangle}
                                  title={violation.violation_type || 'مخالفة'}
                                  subtitle={`#${violation.violation_number}`}
                                  date={violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : undefined}
                                  status={violation.payment_status === 'paid' ? 'مدفوعة' : 'معلقة'}
                                  color={violation.payment_status === 'paid' ? '#10b981' : '#ef4444'}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {maintenanceRecords.length === 0 && violations.length === 0 && (
                          <div className="text-center py-16">
                            <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-500">لا توجد نشاطات</p>
                          </div>
                        )}
                      </div>
                    </ErrorBoundary>
                  </TabsContent>

                  {/* Pricing Tab */}
                  <TabsContent value="pricing" className="mt-0">
                    <ErrorBoundary fallback={<TabErrorFallback tabName="التسعير" />}>
                      <VehiclePricingPanel vehicleId={vehicle.id} />
                    </ErrorBoundary>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="mt-0">
                    <ErrorBoundary fallback={<TabErrorFallback tabName="الوثائق" />}>
                      <VehicleDocumentsPanel vehicleId={vehicle.id} onDocumentAdd={() => {}} />
                    </ErrorBoundary>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Card - Bold Design */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100"
            >
              <h3 className="font-bold text-slate-900 mb-6 text-lg">حالة المركبة</h3>
              <div className="mb-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: `${STATUS_CONFIG[vehicle.status as keyof typeof STATUS_CONFIG]?.color}15` }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: STATUS_CONFIG[vehicle.status as keyof typeof STATUS_CONFIG]?.color }} />
                  <span className="font-semibold text-slate-900">
                    {STATUS_CONFIG[vehicle.status as keyof typeof STATUS_CONFIG]?.label}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full rounded-full gap-2">
                    <RefreshCw className="w-4 h-4" />
                    تغيير الحالة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      disabled={key === vehicle.status || updateStatusMutation.isPending}
                      className={cn("cursor-pointer", CRITICAL_STATUSES.includes(key) && "text-red-600")}
                    >
                      <div className="w-2 h-2 rounded-full ml-2" style={{ backgroundColor: config.color }} />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-md border border-slate-100 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">{vehicleStats?.activeContracts || 0}</p>
                <p className="text-sm text-slate-500">عقود نشطة</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-md border border-slate-100 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR.primary}15` }}>
                  <DollarSign className="w-6 h-6" style={{ color: COLOR.primary }} />
                </div>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(vehicleStats?.totalRevenue || 0)}</p>
                <p className="text-sm text-slate-500">الإيرادات</p>
              </motion.div>
            </div>

            {/* Insurance Alert */}
            {vehicle.insurance_expiry && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "rounded-3xl p-6 border-2",
                  new Date(vehicle.insurance_expiry) <= new Date()
                    ? "bg-red-50 border-red-200"
                    : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30
                      ? "bg-amber-50 border-amber-200"
                      : "bg-emerald-50 border-emerald-200"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl", new Date(vehicle.insurance_expiry) <= new Date() ? "bg-red-100" : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 ? "bg-amber-100" : "bg-emerald-100")}>
                    <Shield className={cn("w-6 h-6", new Date(vehicle.insurance_expiry) <= new Date() ? "text-red-600" : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 ? "text-amber-600" : "text-emerald-600")} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">
                      {new Date(vehicle.insurance_expiry) <= new Date() ? "التأمين منتهي!" : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 ? "ينتهي قريباً" : "التأمين ساري"}
                    </p>
                    <p className="text-sm text-slate-600">{format(new Date(vehicle.insurance_expiry), 'dd MMMM yyyy', { locale: ar })}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <VehicleForm
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={(open) => {
          setShowEditForm(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId, companyId] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          }
        }}
      />

      <MaintenanceForm
        vehicleId={vehicleId}
        open={showMaintenanceForm}
        onOpenChange={(open) => {
          setShowMaintenanceForm(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance', vehicleId] });
        }}
      />

      <Dialog open={showViolationForm} onOpenChange={setShowViolationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <TrafficViolationForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['vehicle-violations', vehicleId] });
              setShowViolationForm(false);
              toast.success('تم تسجيل المخالفة بنجاح');
            }}
            vehicleId={vehicleId}
          />
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      <AlertDialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              تأكيد تغيير الحالة
            </AlertDialogTitle>
            <AlertDialogDescription>
              أنت على وشك تغيير حالة المركبة إلى{' '}
              <span className="font-bold text-red-600">{pendingStatusChange && STATUS_CONFIG[pendingStatusChange as keyof typeof STATUS_CONFIG]?.label}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatusChange) {
                  updateStatusMutation.mutate(pendingStatusChange);
                  setPendingStatusChange(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleDetailsPageRedesigned;
