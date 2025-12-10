/**
 * صفحة تفاصيل المركبة - التصميم الجديد
 * مستوحى من تصميم Car Rental Details الحديث
 * متوافق مع ألوان الداشبورد
 * 
 * @component VehicleDetailsPageNew
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
import {
  ArrowRight,
  ArrowLeft,
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
  Heart,
  Star,
  MapPin,
  Calendar,
  Clock,
  Fuel,
  Copy,
  Eye,
  Camera,
  Shield,
  TrendingUp,
  ChevronRight,
  Zap,
  Thermometer,
  Radio,
  Smartphone,
  Navigation,
  MoreVertical,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { VehiclePricingPanel } from './VehiclePricingPanel';
import { VehicleDocumentsPanel } from './VehicleDocumentsPanel';
import { VehicleInsurancePanel } from './VehicleInsurancePanel';
import { VehicleForm } from './VehicleForm';
import { MaintenanceForm } from './MaintenanceForm';
import { TrafficViolationForm } from './TrafficViolationForm';

// ===== Status Options =====
const STATUS_OPTIONS = [
  { value: 'available', label: 'متاحة', bg: 'bg-green-500', text: 'text-white' },
  { value: 'rented', label: 'مؤجرة', bg: 'bg-purple-500', text: 'text-white' },
  { value: 'maintenance', label: 'صيانة', bg: 'bg-amber-500', text: 'text-white' },
  { value: 'out_of_service', label: 'خارج الخدمة', bg: 'bg-red-500', text: 'text-white' },
  { value: 'reserved', label: 'محجوزة', bg: 'bg-blue-500', text: 'text-white' },
  { value: 'accident', label: 'حادث', bg: 'bg-rose-600', text: 'text-white' },
  { value: 'stolen', label: 'مسروقة', bg: 'bg-slate-700', text: 'text-white' },
  { value: 'police_station', label: 'في المخفر', bg: 'bg-orange-600', text: 'text-white' },
];

// ===== Status Config =====
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'available':
      return { label: 'متاحة', bg: 'bg-green-500', text: 'text-white', iconBg: 'bg-green-100', iconText: 'text-green-600' };
    case 'rented':
      return { label: 'مؤجرة', bg: 'bg-purple-500', text: 'text-white', iconBg: 'bg-purple-100', iconText: 'text-purple-600' };
    case 'maintenance':
      return { label: 'صيانة', bg: 'bg-amber-500', text: 'text-white', iconBg: 'bg-amber-100', iconText: 'text-amber-600' };
    case 'out_of_service':
      return { label: 'خارج الخدمة', bg: 'bg-red-500', text: 'text-white', iconBg: 'bg-red-100', iconText: 'text-red-600' };
    case 'reserved':
      return { label: 'محجوزة', bg: 'bg-blue-500', text: 'text-white', iconBg: 'bg-blue-100', iconText: 'text-blue-600' };
    case 'accident':
      return { label: 'حادث', bg: 'bg-rose-600', text: 'text-white', iconBg: 'bg-rose-100', iconText: 'text-rose-600' };
    case 'stolen':
      return { label: 'مسروقة', bg: 'bg-slate-700', text: 'text-white', iconBg: 'bg-slate-100', iconText: 'text-slate-700' };
    case 'police_station':
      return { label: 'في المخفر', bg: 'bg-orange-600', text: 'text-white', iconBg: 'bg-orange-100', iconText: 'text-orange-600' };
    default:
      return { label: status, bg: 'bg-neutral-500', text: 'text-white', iconBg: 'bg-neutral-100', iconText: 'text-neutral-600' };
  }
};

// ===== Info Row Component =====
interface InfoRowProps {
  label: string;
  value?: string | number;
  icon?: React.ElementType;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon: Icon }) => (
  <div className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-0">
    <div className="flex items-center gap-2 text-neutral-500">
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-sm">{label}</span>
    </div>
    <span className="font-semibold text-neutral-900">{value || '-'}</span>
  </div>
);

// ===== Stat Badge Component =====
interface StatBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

const StatBadge: React.FC<StatBadgeProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full">
    <Icon className="w-4 h-4 text-neutral-600" />
    <span className="text-sm font-medium text-neutral-700">{value} {label}</span>
  </div>
);

// ===== Feature Item Component =====
interface FeatureItemProps {
  icon: React.ElementType;
  label: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 text-neutral-600 text-sm">
    <Icon className="w-4 h-4 text-amber-500" />
    <span>{label}</span>
  </div>
);

// ===== Main Component =====
const VehicleDetailsPageNew = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // الحالة المحلية
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Mutation لتحديث حالة المركبة
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!vehicleId || !companyId) throw new Error('معرف المركبة أو الشركة مفقود');

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
      setIsStatusDropdownOpen(false);
    },
    onError: (error) => {
      console.error('Error updating vehicle status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المركبة');
    },
  });

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
        return [];
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
        .from('traffic_violations')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('violation_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching violations:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!vehicleId,
  });

  // حساب إحصائيات المركبة
  const vehicleStats = useMemo(() => {
    if (!vehicle) return null;

    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.total_paid || 0), 0);
    const totalTrips = contracts.length;

    return {
      status: vehicle.status || 'available',
      activeContracts,
      totalRevenue,
      currentMileage: vehicle.current_mileage || 0,
      totalTrips,
    };
  }, [vehicle, contracts]);

  // معالجات الأحداث
  const handleBack = useCallback(() => {
    navigate('/fleet');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    if (!vehicle) {
      toast.error('لم يتم تحميل بيانات المركبة بعد');
      return;
    }
    setShowEditForm(true);
  }, [vehicle]);

  const handleNewContract = useCallback(() => {
    if (!vehicleId) {
      toast.error('معرف المركبة غير متوفر');
      return;
    }
    navigate(`/contracts?vehicle=${vehicleId}`);
  }, [navigate, vehicleId]);

  const handleMaintenanceSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance', vehicleId] });
    setShowMaintenanceForm(false);
    toast.success('تم تسجيل الصيانة بنجاح');
  }, [queryClient, vehicleId]);

  const handleViolationSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-violations', vehicleId] });
    setShowViolationForm(false);
    toast.success('تم تسجيل المخالفة بنجاح');
  }, [queryClient, vehicleId]);

  const handleCopyPlate = useCallback(() => {
    if (vehicle?.plate_number) {
      navigator.clipboard.writeText(vehicle.plate_number);
      toast.success('تم نسخ رقم اللوحة');
    }
  }, [vehicle?.plate_number]);

  const handleCopyVin = useCallback(() => {
    if (vehicle?.vin) {
      navigator.clipboard.writeText(vehicle.vin);
      toast.success('تم نسخ رقم الهيكل');
    }
  }, [vehicle?.vin]);

  const getCustomerName = (customer: any): string => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar || customer.company_name || 'شركة';
    }
    const firstName = customer.first_name_ar || customer.first_name || '';
    const lastName = customer.last_name_ar || customer.last_name || '';
    return `${firstName} ${lastName}`.trim();
  };

  // معالجة حالات التحميل
  const isLoading = loadingVehicle || loadingContracts || loadingMaintenance || loadingViolations;

  if (isAuthenticating || !companyId || isLoading) {
    return <PageSkeletonFallback />;
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
              <Car className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">المركبة غير موجودة</h3>
            <p className="text-neutral-600 mb-6">لم يتم العثور على هذه المركبة</p>
            <Button onClick={() => navigate('/fleet')} className="bg-coral-500 hover:bg-coral-600 rounded-xl">
              العودة لصفحة الأسطول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vehicleName = `${vehicle.make} ${vehicle.model} ${vehicle.year || ''}`;
  const statusConfig = getStatusConfig(vehicle.status || 'available');
  
  // استخراج الصور من مصفوفة الصور
  const vehicleImages = vehicle.images && Array.isArray(vehicle.images) 
    ? vehicle.images.map(img => typeof img === 'string' ? img : (img as any)?.url || '')
    : [];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-neutral-200 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="rounded-xl hover:bg-neutral-100"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">{vehicleName}</h1>
                <p className="text-xs text-neutral-500">تفاصيل المركبة</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-xl hover:bg-neutral-100"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={cn("w-5 h-5", isFavorite ? "fill-red-500 text-red-500" : "text-neutral-600")} />
              </Button>
              <Button 
                onClick={handleEdit}
                className="gap-2 bg-coral-500 hover:bg-coral-600 rounded-xl"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Vehicle Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Card - Vehicle Image & Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-200"
            >
              {/* Price & Title */}
              <div className="p-6 border-b border-neutral-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                      {vehicleName}
                    </h2>
                    {vehicle.daily_rate && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-neutral-900">
                          {formatCurrency(vehicle.daily_rate)}
                        </span>
                        <span className="text-neutral-500">/يوم</span>
                      </div>
                    )}
                  </div>
                  {/* Status Badge - Clickable to Change Status */}
                  <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className={cn(
                          "flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full cursor-pointer transition-all hover:opacity-90 hover:scale-105",
                          statusConfig.bg, 
                          statusConfig.text
                        )}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        {statusConfig.label}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      {STATUS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => updateStatusMutation.mutate(option.value)}
                          disabled={option.value === vehicle.status || updateStatusMutation.isPending}
                          className={cn(
                            "cursor-pointer flex items-center gap-2",
                            option.value === vehicle.status && "bg-neutral-100"
                          )}
                        >
                          <span className={cn("w-2.5 h-2.5 rounded-full", option.bg)} />
                          {option.label}
                          {option.value === vehicle.status && (
                            <CheckCircle className="w-4 h-4 mr-auto text-green-600" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <StatBadge icon={Star} value="4.8" label="" />
                  <StatBadge icon={Gauge} value={vehicle.current_mileage?.toLocaleString('ar-SA') || '0'} label="كم" />
                  <StatBadge icon={FileText} value={vehicleStats?.totalTrips || 0} label="رحلة" />
                </div>
              </div>
              
              {/* Vehicle Image */}
              <div className="relative aspect-[16/9] bg-neutral-100">
                {vehicleImages.length > 0 ? (
                  <>
                    <img
                      src={vehicleImages[currentImageIndex]}
                      alt={vehicleName}
                      className="w-full h-full object-cover"
                    />
                    {vehicleImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {vehicleImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              idx === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50">
                    <Car className="w-24 h-24 text-neutral-300" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200"
            >
              <h3 className="text-lg font-bold text-neutral-900 mb-4">مواصفات المركبة</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Safety */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    الأمان
                  </h4>
                  <div className="space-y-2">
                    <FeatureItem icon={CheckCircle} label="كاميرا خلفية" />
                    <FeatureItem icon={CheckCircle} label="مراقبة ضغط الإطارات" />
                    <FeatureItem icon={CheckCircle} label="تنبيه النقطة العمياء" />
                  </div>
                </div>
                
                {/* Connectivity */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-500" />
                    الاتصال
                  </h4>
                  <div className="space-y-2">
                    <FeatureItem icon={Smartphone} label="بلوتوث" />
                    <FeatureItem icon={Radio} label="منفذ AUX" />
                    <FeatureItem icon={Navigation} label="نظام ملاحة" />
                  </div>
                </div>
                
                {/* Comfort */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    الراحة
                  </h4>
                  <div className="space-y-2">
                    <FeatureItem icon={Zap} label="تشغيل بدون مفتاح" />
                    <FeatureItem icon={Thermometer} label="تكييف خلفي" />
                    <FeatureItem icon={Settings} label="مقاعد قابلة للتعديل" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-neutral-200 overflow-x-auto">
                  <TabsList className="w-full justify-start bg-transparent h-auto p-2 rounded-none flex gap-1">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <Info className="w-4 h-4" />
                      نظرة عامة
                    </TabsTrigger>
                    <TabsTrigger
                      value="contracts"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <FileText className="w-4 h-4" />
                      العقود
                      {contracts.length > 0 && (
                        <Badge className="bg-coral-500 text-white text-[10px] px-1.5">{contracts.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="maintenance"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <Wrench className="w-4 h-4" />
                      الصيانة
                    </TabsTrigger>
                    <TabsTrigger
                      value="violations"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      المخالفات
                    </TabsTrigger>
                    <TabsTrigger
                      value="pricing"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <Tag className="w-4 h-4" />
                      التسعير
                    </TabsTrigger>
                    <TabsTrigger
                      value="insurance"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <Shield className="w-4 h-4" />
                      التأمين والاستمارة
                    </TabsTrigger>
                    <TabsTrigger
                      value="documents"
                      className="data-[state=active]:bg-coral-50 data-[state=active]:text-coral-600 rounded-xl gap-2 px-4"
                    >
                      <Folder className="w-4 h-4" />
                      الوثائق
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Info */}
                      <div className="space-y-1">
                        <h4 className="font-semibold text-neutral-900 mb-3">المعلومات الأساسية</h4>
                        <InfoRow label="الشركة المصنعة" value={vehicle.make} />
                        <InfoRow label="الطراز" value={vehicle.model} />
                        <InfoRow label="السنة" value={vehicle.year} />
                        <InfoRow label="اللون" value={vehicle.color} />
                        <InfoRow label="عدد المقاعد" value={vehicle.seating_capacity} />
                      </div>
                      
                      {/* Technical Info */}
                      <div className="space-y-1">
                        <h4 className="font-semibold text-neutral-900 mb-3">المواصفات التقنية</h4>
                        <InfoRow label="ناقل الحركة" value={vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'} />
                        <InfoRow label="نوع الوقود" value={
                          vehicle.fuel_type === 'gasoline' ? 'بنزين' :
                          vehicle.fuel_type === 'diesel' ? 'ديزل' :
                          vehicle.fuel_type === 'hybrid' ? 'هجين' : 'كهربائي'
                        } />
                        <InfoRow label="سعة الخزان" value={vehicle.fuel_capacity ? `${vehicle.fuel_capacity} لتر` : undefined} />
                        <InfoRow label="المسافة المقطوعة" value={vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString('ar-SA')} كم` : undefined} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Contracts Tab */}
                  <TabsContent value="contracts" className="mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-neutral-900">العقود المرتبطة</h4>
                      <Button onClick={handleNewContract} className="gap-2 bg-coral-500 hover:bg-coral-600 rounded-xl" size="sm">
                        <Plus className="w-4 h-4" />
                        عقد جديد
                      </Button>
                    </div>
                    
                    {contracts.length === 0 ? (
                      <div className="text-center py-12 text-neutral-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p>لا توجد عقود لهذه المركبة</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contracts.map((contract) => (
                          <div
                            key={contract.id}
                            onClick={() => navigate(`/contracts/${contract.contract_number}`)}
                            className="p-4 rounded-xl border border-neutral-200 hover:border-coral-300 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="font-bold text-neutral-900">#{contract.contract_number}</span>
                                <p className="text-sm text-neutral-500">{getCustomerName(contract.customer)}</p>
                              </div>
                              <Badge className={contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                                {contract.status === 'active' ? 'نشط' : contract.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-neutral-500">
                              <span>{contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}</span>
                              <span>←</span>
                              <span>{contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}</span>
                              <span className="mr-auto font-semibold text-neutral-900">{formatCurrency(contract.monthly_amount || 0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Maintenance Tab */}
                  <TabsContent value="maintenance" className="mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-neutral-900">سجل الصيانة</h4>
                      <Button onClick={() => setShowMaintenanceForm(true)} className="gap-2 bg-coral-500 hover:bg-coral-600 rounded-xl" size="sm">
                        <Plus className="w-4 h-4" />
                        تسجيل صيانة
                      </Button>
                    </div>
                    
                    {maintenanceRecords.length === 0 ? (
                      <div className="text-center py-12 text-neutral-500">
                        <Wrench className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p>لا توجد سجلات صيانة لهذه المركبة</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {maintenanceRecords.map((record) => (
                          <div key={record.id} className="p-4 rounded-xl border border-neutral-200">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-neutral-900">{record.maintenance_type || 'صيانة'}</h5>
                                <p className="text-sm text-neutral-500">
                                  {record.scheduled_date ? format(new Date(record.scheduled_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                                  {record.service_provider && ` • ${record.service_provider}`}
                                </p>
                                <p className="text-sm text-neutral-700 mt-1">
                                  التكلفة: {formatCurrency(record.actual_cost || record.estimated_cost || 0)}
                                </p>
                              </div>
                              <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                                {record.status === 'completed' ? 'مكتملة' : record.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Violations Tab */}
                  <TabsContent value="violations" className="mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-neutral-900">المخالفات المرورية</h4>
                      <Button onClick={() => setShowViolationForm(true)} className="gap-2 bg-coral-500 hover:bg-coral-600 rounded-xl" size="sm">
                        <Plus className="w-4 h-4" />
                        تسجيل مخالفة
                      </Button>
                    </div>
                    
                    {violations.length === 0 ? (
                      <div className="text-center py-12 text-neutral-500">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p>لا توجد مخالفات مسجلة لهذه المركبة</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {violations.map((violation) => (
                          <div key={violation.id} className="p-4 rounded-xl border border-neutral-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-neutral-900">{violation.violation_type || 'مخالفة مرورية'}</h5>
                                <p className="text-sm text-neutral-500">#{violation.violation_number || violation.id.substring(0, 8)}</p>
                              </div>
                              <Badge className={violation.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                {violation.payment_status === 'paid' ? 'مدفوعة' : 'معلقة'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-neutral-500">
                                {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
                              </span>
                              <span className="font-bold text-red-600">
                                {formatCurrency(violation.fine_amount || 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Pricing Tab */}
                  <TabsContent value="pricing" className="mt-0">
                    <VehiclePricingPanel vehicleId={vehicle.id} />
                  </TabsContent>

                  {/* Insurance Tab */}
                  <TabsContent value="insurance" className="mt-0">
                    <VehicleInsurancePanel vehicleId={vehicle.id} />
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="mt-0">
                    <VehicleDocumentsPanel vehicleId={vehicle.id} onDocumentAdd={() => {}} />
                  </TabsContent>
                </div>
              </Tabs>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200"
            >
              <h3 className="font-bold text-neutral-900 mb-4">معلومات سريعة</h3>
              
              <div className="space-y-4">
                {/* Plate Number */}
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-neutral-500" />
                    <span className="text-sm text-neutral-600">رقم اللوحة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900">{vehicle.plate_number}</span>
                    <button onClick={handleCopyPlate} className="p-1 hover:bg-neutral-200 rounded transition-colors">
                      <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                </div>
                
                {/* VIN */}
                {vehicle.vin && (
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-600">رقم الهيكل (VIN)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-900 select-all">{vehicle.vin}</span>
                      <button onClick={handleCopyVin} className="p-1 hover:bg-neutral-200 rounded transition-colors" title="نسخ رقم الهيكل">
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Location */}
                {vehicle.current_location && (
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-600">الموقع</span>
                    </div>
                    <span className="text-sm font-medium text-neutral-900">{vehicle.current_location}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Price Breakdown Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200"
            >
              <h3 className="font-bold text-neutral-900 mb-4">تفاصيل الأسعار</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">الإيجار اليومي</span>
                  <span className="font-semibold text-neutral-900">{formatCurrency(vehicle.daily_rate || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">الإيجار الأسبوعي</span>
                  <span className="font-semibold text-neutral-900">{formatCurrency(vehicle.weekly_rate || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">الإيجار الشهري</span>
                  <span className="font-semibold text-neutral-900">{formatCurrency(vehicle.monthly_rate || 0)}</span>
                </div>
                
                <div className="border-t border-neutral-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-700 font-medium">إجمالي الإيرادات</span>
                    <span className="font-bold text-lg text-coral-600">{formatCurrency(vehicleStats?.totalRevenue || 0)}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleNewContract}
                className="w-full mt-4 bg-amber-400 hover:bg-amber-500 text-neutral-900 font-semibold rounded-xl"
              >
                إنشاء عقد جديد
              </Button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-black text-neutral-900">{vehicleStats?.activeContracts || 0}</p>
                <p className="text-xs text-neutral-500">عقد نشط</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-2xl font-black text-neutral-900">{maintenanceRecords.length}</p>
                <p className="text-xs text-neutral-500">سجل صيانة</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-black text-neutral-900">{violations.length}</p>
                <p className="text-xs text-neutral-500">مخالفة</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-neutral-900">{(vehicle.current_mileage || 0).toLocaleString('ar-SA')}</p>
                <p className="text-xs text-neutral-500">كم</p>
              </motion.div>
            </div>

            {/* Insurance Alert */}
            {vehicle.insurance_expiry && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={cn(
                  "rounded-2xl p-4 border",
                  new Date(vehicle.insurance_expiry) <= new Date() 
                    ? "bg-red-50 border-red-200" 
                    : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Shield className={cn(
                    "w-5 h-5",
                    new Date(vehicle.insurance_expiry) <= new Date() 
                      ? "text-red-600" 
                      : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 
                        ? "text-amber-600"
                        : "text-green-600"
                  )} />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {new Date(vehicle.insurance_expiry) <= new Date() 
                        ? "التأمين منتهي!" 
                        : differenceInDays(new Date(vehicle.insurance_expiry), new Date()) <= 30 
                          ? "التأمين على وشك الانتهاء"
                          : "التأمين ساري"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(vehicle.insurance_expiry), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <VehicleForm 
        vehicle={vehicle || undefined}
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
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance', vehicleId] });
          }
        }}
      />

      <Dialog open={showViolationForm} onOpenChange={setShowViolationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <TrafficViolationForm onSuccess={handleViolationSuccess} vehicleId={vehicleId} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleDetailsPageNew;

