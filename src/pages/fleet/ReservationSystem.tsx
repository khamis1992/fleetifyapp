/**
 * Vehicle Reservation System Page - Redesigned
 * 
 * Professional comprehensive fleet management system featuring:
 * - Vehicle Reservation System (online bookings with hold timers)
 * - Vehicle Availability Calendar (visual date-based availability)
 * - Driver Assignment Module (chauffeur-driven rentals with commission tracking)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Car,
  User,
  CalendarDays,
  ArrowRight,
  Timer,
  FileText,
  Users,
  Search,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInHours, differenceInDays, format, parseISO, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { VehicleAvailabilityCalendar } from '@/components/fleet/VehicleAvailabilityCalendar';
import { DriverAssignmentModule } from '@/components/fleet/DriverAssignmentModule';

interface Reservation {
  id: string;
  company_id: string;
  vehicle_id: string;
  customer_id: string | null;
  customer_name: string;
  vehicle_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  start_date: string;
  end_date: string;
  hold_until: string;
  status: 'pending' | 'confirmed' | 'converted' | 'cancelled';
  notes: string | null;
  created_at: string;
}

// ===== Main Page Component =====
export default function ReservationSystem() {
  const [activeTab, setActiveTab] = useState('reservations');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" dir="rtl">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-coral-500 via-coral-600 to-orange-500 p-6 sm:p-8 text-white shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold">نظام الحجوزات المتكامل</h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base max-w-lg">
                  إدارة حجوزات المركبات، تتبع التوفرية، وتعيين السائقين من مكان واحد
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <CalendarDays className="w-5 h-5" />
                  <span className="font-medium">{format(new Date(), 'dd MMMM yyyy', { locale: ar })}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Three-Tab Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-white p-1 text-muted-foreground shadow-sm border border-neutral-200/60">
            <TabsTrigger 
              value="reservations" 
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-coral-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <BookOpen className="h-4 w-4" />
              <span>الحجوزات</span>
            </TabsTrigger>
            <TabsTrigger 
              value="availability" 
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-coral-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Calendar className="h-4 w-4" />
              <span>التوفرية</span>
            </TabsTrigger>
            <TabsTrigger 
              value="drivers" 
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-coral-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Users className="h-4 w-4" />
              <span>السائقين</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Vehicle Reservation System */}
          <TabsContent value="reservations" className="space-y-6 mt-0">
            <ReservationsTab />
          </TabsContent>

          {/* Tab 2: Vehicle Availability Calendar */}
          <TabsContent value="availability" className="space-y-6 mt-0">
            <VehicleAvailabilityCalendar />
          </TabsContent>

          {/* Tab 3: Driver Assignment Module */}
          <TabsContent value="drivers" className="space-y-6 mt-0">
            <DriverAssignmentModule />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ===== Reservations Tab Component =====
function ReservationsTab() {
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  const queryClient = useQueryClient();
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch reservations from database
  const { data: reservations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['vehicle-reservations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reservations:', error);
        throw error;
      }

      return data as Reservation[];
    },
    enabled: !!companyId,
  });

  // Create reservation mutation
  const createReservation = useMutation({
    mutationFn: async (values: any) => {
      if (!companyId) throw new Error('Company ID not found');

      const holdUntil = new Date();
      holdUntil.setHours(holdUntil.getHours() + (parseInt(values.holdHours) || 24));

      const { data, error } = await supabase
        .from('vehicle_reservations')
        .insert({
          company_id: companyId,
          vehicle_id: values.vehicleId || null,
          customer_id: values.customerId || null,
          customer_name: values.customerName,
          vehicle_plate: values.vehiclePlate,
          vehicle_make: values.vehicleMake,
          vehicle_model: values.vehicleModel,
          start_date: values.startDate,
          end_date: values.endDate,
          hold_until: holdUntil.toISOString(),
          status: 'pending',
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-reservations', companyId] });
      toast.success('تم إنشاء الحجز بنجاح');
      setShowNewReservation(false);
    },
    onError: (error) => {
      toast.error('فشل في إنشاء الحجز');
      console.error(error);
    },
  });

  // Convert to contract mutation
  const convertToContract = useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .update({ status: 'converted' })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-reservations', companyId] });
      toast.success('تم تحويل الحجز إلى عقد');
      setShowConvertDialog(false);
      setSelectedReservation(null);
    },
    onError: (error) => {
      toast.error('فشل في تحويل الحجز');
      console.error(error);
    },
  });

  // Cancel reservation mutation
  const cancelReservation = useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-reservations', companyId] });
      toast.success('تم إلغاء الحجز');
    },
    onError: (error) => {
      toast.error('فشل في إلغاء الحجز');
      console.error(error);
    },
  });

  // Calculate hold time remaining
  const getHoldTimeRemaining = (reservation: Reservation) => {
    const hoursRemaining = differenceInHours(parseISO(reservation.hold_until), new Date());
    return Math.max(0, hoursRemaining);
  };

  // Filter and search reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const matchesSearch = 
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vehicle_make?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchQuery, statusFilter]);

  // Group reservations by status
  const groupedReservations = useMemo(() => {
    return {
      pending: filteredReservations.filter(r => r.status === 'pending'),
      confirmed: filteredReservations.filter(r => r.status === 'confirmed'),
      converted: filteredReservations.filter(r => r.status === 'converted'),
      cancelled: filteredReservations.filter(r => r.status === 'cancelled'),
    };
  }, [filteredReservations]);

  // Statistics
  const stats = useMemo(() => {
    const total = reservations.length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const converted = reservations.filter(r => r.status === 'converted').length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    
    return { total, pending, confirmed, converted, conversionRate };
  }, [reservations]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-coral-200 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-neutral-600 font-medium">جاري تحميل الحجوزات...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
      >
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ</h3>
        <p className="text-red-600 mb-4">فشل في تحميل الحجوزات. يرجى المحاولة مرة أخرى.</p>
        <Button onClick={() => refetch()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة المحاولة
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <StatCard
          title="إجمالي الحجوزات"
          value={stats.total}
          icon={BookOpen}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          iconBg="bg-blue-400/30"
        />
        <StatCard
          title="قيد الانتظار"
          value={stats.pending}
          icon={Clock}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          iconBg="bg-amber-400/30"
        />
        <StatCard
          title="مؤكدة"
          value={stats.confirmed}
          icon={CheckCircle}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
          iconBg="bg-emerald-400/30"
        />
        <StatCard
          title="معدل التحويل"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          color="bg-gradient-to-br from-purple-500 to-violet-600"
          iconBg="bg-purple-400/30"
        />
      </motion.div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-neutral-200/60"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="بحث بالاسم أو رقم اللوحة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-neutral-50 border-neutral-200"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-neutral-50 border-neutral-200">
              <Filter className="w-4 h-4 ml-2 text-neutral-400" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="confirmed">مؤكدة</SelectItem>
              <SelectItem value="converted">محولة</SelectItem>
              <SelectItem value="cancelled">ملغية</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-white shadow-sm text-coral-600' : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm text-coral-600' : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button 
          onClick={() => setShowNewReservation(true)} 
          className="bg-coral-500 hover:bg-coral-600 text-white shadow-md"
        >
          <Plus className="h-4 w-4 ml-2" />
          حجز جديد
        </Button>
      </motion.div>

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-white rounded-xl shadow-sm border border-neutral-200/60">
            <TabsTrigger 
              value="pending"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 rounded-lg"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">قيد الانتظار</span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                {groupedReservations.pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="confirmed"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-lg"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">مؤكدة</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                {groupedReservations.confirmed.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="converted"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 rounded-lg"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">محولة</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                {groupedReservations.converted.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 rounded-lg"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">ملغية</span>
              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                {groupedReservations.cancelled.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          {(['pending', 'confirmed', 'converted', 'cancelled'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4 mt-6">
              <AnimatePresence mode="popLayout">
                {groupedReservations[status].length === 0 ? (
                  <EmptyState status={status} onAddNew={() => setShowNewReservation(true)} />
                ) : (
                  <div className={cn(
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                      : 'space-y-3'
                  )}>
                    {groupedReservations[status].map((res, index) => (
                      <motion.div
                        key={res.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ReservationCard
                          reservation={res}
                          viewMode={viewMode}
                          onSelect={() => setSelectedReservation(res)}
                          onConvert={() => {
                            setSelectedReservation(res);
                            setShowConvertDialog(true);
                          }}
                          onCancel={() => cancelReservation.mutate(res.id)}
                          holdTimeRemaining={getHoldTimeRemaining(res)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* Dialogs */}
      <NewReservationDialog
        open={showNewReservation}
        onOpenChange={setShowNewReservation}
        onSubmit={(values) => createReservation.mutate(values)}
        isLoading={createReservation.isPending}
      />

      <ConvertReservationDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        reservation={selectedReservation}
        onConfirm={() => {
          if (selectedReservation) {
            convertToContract.mutate(selectedReservation.id);
          }
        }}
        isLoading={convertToContract.isPending}
      />

      {selectedReservation && !showConvertDialog && (
        <ReservationDetailsDialog
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}
    </div>
  );
}

// ===== Stat Card Component =====
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}) {
  return (
    <Card className={cn('overflow-hidden border-0 shadow-lg', color)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
          </div>
          <div className={cn('p-3 rounded-xl', iconBg)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Empty State Component =====
function EmptyState({ status, onAddNew }: { status: string; onAddNew: () => void }) {
  const configs = {
    pending: { icon: Clock, message: 'لا توجد حجوزات قيد الانتظار', color: 'text-amber-400' },
    confirmed: { icon: CheckCircle, message: 'لا توجد حجوزات مؤكدة', color: 'text-blue-400' },
    converted: { icon: FileText, message: 'لا توجد حجوزات محولة إلى عقود', color: 'text-green-400' },
    cancelled: { icon: XCircle, message: 'لا توجد حجوزات ملغية', color: 'text-red-400' },
  };

  const config = configs[status as keyof typeof configs];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center"
    >
      <div className={cn('w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center')}>
        <Icon className={cn('w-8 h-8', config.color)} />
      </div>
      <p className="text-neutral-500 mb-4">{config.message}</p>
      {status === 'pending' && (
        <Button onClick={onAddNew} variant="outline" className="border-coral-200 text-coral-600 hover:bg-coral-50">
          <Plus className="w-4 h-4 ml-2" />
          إضافة حجز جديد
        </Button>
      )}
    </motion.div>
  );
}

// ===== Reservation Card Component =====
function ReservationCard({
  reservation,
  viewMode,
  onSelect,
  onConvert,
  onCancel,
  holdTimeRemaining,
}: {
  reservation: Reservation;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onConvert: () => void;
  onCancel: () => void;
  holdTimeRemaining: number;
}) {
  const isConverted = reservation.status === 'converted';
  const isCancelled = reservation.status === 'cancelled';
  const isPending = reservation.status === 'pending';
  const isUrgent = isPending && holdTimeRemaining <= 6;

  const duration = differenceInDays(parseISO(reservation.end_date), parseISO(reservation.start_date));

  const statusConfig = {
    pending: { label: 'قيد الانتظار', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    confirmed: { label: 'مؤكدة', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    converted: { label: 'محولة لعقد', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    cancelled: { label: 'ملغية', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  };

  const config = statusConfig[reservation.status];

  if (viewMode === 'list') {
    return (
      <Card className={cn(
        'hover:shadow-md transition-all border-r-4',
        isUrgent ? 'border-r-red-500 bg-red-50/30' : config.border.replace('border-', 'border-r-')
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-coral-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-coral-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-neutral-900 truncate">{reservation.customer_name}</h3>
                  <Badge className={cn('text-xs', config.bg, config.text)}>{config.label}</Badge>
                </div>
                <p className="text-sm text-neutral-500 truncate">
                  {reservation.vehicle_plate} • {reservation.vehicle_make} {reservation.vehicle_model}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div>
                  <p className="text-neutral-400">من</p>
                  <p className="font-medium">{format(parseISO(reservation.start_date), 'dd MMM', { locale: ar })}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-300" />
                <div>
                  <p className="text-neutral-400">إلى</p>
                  <p className="font-medium">{format(parseISO(reservation.end_date), 'dd MMM', { locale: ar })}</p>
                </div>
                <div className="px-3 py-1 bg-neutral-100 rounded-full">
                  <span className="text-xs font-medium">{duration} يوم</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPending && (
                <div className={cn(
                  'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                  isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'
                )}>
                  <Timer className="w-3.5 h-3.5" />
                  {holdTimeRemaining}h
                </div>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onSelect}>
                    <Eye className="w-4 h-4 ml-2" />
                    التفاصيل
                  </DropdownMenuItem>
                  {!isConverted && !isCancelled && (
                    <>
                      <DropdownMenuItem onClick={onConvert}>
                        <FileText className="w-4 h-4 ml-2" />
                        تحويل لعقد
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onCancel} className="text-red-600">
                        <Trash2 className="w-4 h-4 ml-2" />
                        إلغاء
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className={cn(
      'hover:shadow-lg transition-all overflow-hidden',
      isUrgent && 'ring-2 ring-red-300'
    )}>
      {/* Status Bar */}
      <div className={cn('h-1.5', config.bg.replace('bg-', 'bg-').replace('-100', '-500'))} />
      
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-coral-100 to-orange-100 flex items-center justify-center">
              <User className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">{reservation.customer_name}</h3>
              <Badge className={cn('text-xs mt-1', config.bg, config.text)}>{config.label}</Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSelect}>
                <Eye className="w-4 h-4 ml-2" />
                التفاصيل
              </DropdownMenuItem>
              {!isConverted && !isCancelled && (
                <>
                  <DropdownMenuItem onClick={onConvert}>
                    <FileText className="w-4 h-4 ml-2" />
                    تحويل لعقد
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCancel} className="text-red-600">
                    <Trash2 className="w-4 h-4 ml-2" />
                    إلغاء
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vehicle Info */}
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl mb-4">
          <Car className="w-5 h-5 text-neutral-400" />
          <div>
            <p className="font-medium text-sm">{reservation.vehicle_plate}</p>
            <p className="text-xs text-neutral-500">{reservation.vehicle_make} {reservation.vehicle_model}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-neutral-400" />
            <span>{format(parseISO(reservation.start_date), 'dd MMM', { locale: ar })}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-300" />
          <div className="flex items-center gap-2">
            <span>{format(parseISO(reservation.end_date), 'dd MMM', { locale: ar })}</span>
          </div>
          <Badge variant="secondary" className="bg-neutral-100">
            {duration} يوم
          </Badge>
        </div>

        {/* Hold Timer (for pending) */}
        {isPending && (
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-xl mb-4',
            isUrgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          )}>
            <Timer className={cn('w-4 h-4', isUrgent ? 'text-red-600' : 'text-amber-600')} />
            <span className={cn('text-sm font-medium', isUrgent ? 'text-red-700' : 'text-amber-700')}>
              {isUrgent ? 'عاجل! ' : ''}متبقي {holdTimeRemaining} ساعة
            </span>
          </div>
        )}

        {/* Actions */}
        {!isConverted && !isCancelled && (
          <div className="flex gap-2">
            <Button 
              onClick={onConvert} 
              className="flex-1 bg-coral-500 hover:bg-coral-600 text-white"
              size="sm"
            >
              <FileText className="w-4 h-4 ml-2" />
              تحويل لعقد
            </Button>
            <Button 
              onClick={onCancel} 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50"
              size="sm"
            >
              إلغاء
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== New Reservation Dialog =====
function NewReservationDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    vehiclePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    startDate: '',
    endDate: '',
    holdHours: '24',
    notes: '',
  });

  const handleSubmit = () => {
    if (!formData.customerName || !formData.vehiclePlate || !formData.startDate || !formData.endDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    onSubmit(formData);
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      vehiclePlate: '',
      vehicleMake: '',
      vehicleModel: '',
      startDate: '',
      endDate: '',
      holdHours: '24',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-coral-100 rounded-lg">
              <Plus className="w-5 h-5 text-coral-600" />
            </div>
            إنشاء حجز جديد
          </DialogTitle>
          <DialogDescription>
            أدخل بيانات الحجز الجديد. سيتم حجز المركبة للعميل حسب المدة المحددة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-sm font-medium">اسم العميل *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="أدخل اسم العميل"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">لوحة المركبة *</Label>
              <Input
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                placeholder="مثال: 123 ج ع"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">الماركة</Label>
                <Input
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                  placeholder="تويوتا"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">الموديل</Label>
                <Input
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  placeholder="كامري"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">تاريخ البداية *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">تاريخ النهاية *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">مدة الحجز</Label>
              <Select value={formData.holdHours} onValueChange={(value) => setFormData({ ...formData, holdHours: value })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 ساعات</SelectItem>
                  <SelectItem value="12">12 ساعة</SelectItem>
                  <SelectItem value="24">24 ساعة</SelectItem>
                  <SelectItem value="48">48 ساعة</SelectItem>
                  <SelectItem value="72">72 ساعة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية (اختياري)"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-coral-500 hover:bg-coral-600">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء الحجز
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Convert Reservation Dialog =====
function ConvertReservationDialog({
  open,
  onOpenChange,
  reservation,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            تحويل الحجز إلى عقد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              سيتم تحويل هذا الحجز إلى عقد إيجار. هل أنت متأكد؟
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl text-sm">
            <div>
              <p className="text-neutral-500 mb-1">العميل</p>
              <p className="font-semibold">{reservation.customer_name}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">المركبة</p>
              <p className="font-semibold">{reservation.vehicle_plate}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">من</p>
              <p className="font-semibold">{format(parseISO(reservation.start_date), 'dd/MM/yyyy', { locale: ar })}</p>
            </div>
            <div>
              <p className="text-neutral-500 mb-1">إلى</p>
              <p className="font-semibold">{format(parseISO(reservation.end_date), 'dd/MM/yyyy', { locale: ar })}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={onConfirm} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التحويل...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تأكيد التحويل
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Reservation Details Dialog =====
function ReservationDetailsDialog({
  reservation,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const statusConfig = {
    pending: { label: 'قيد الانتظار', bg: 'bg-amber-100', text: 'text-amber-700' },
    confirmed: { label: 'مؤكدة', bg: 'bg-blue-100', text: 'text-blue-700' },
    converted: { label: 'محولة لعقد', bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { label: 'ملغية', bg: 'bg-red-100', text: 'text-red-700' },
  };

  const config = statusConfig[reservation.status];

  return (
    <Dialog open={!!reservation} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-coral-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-coral-600" />
            </div>
            تفاصيل الحجز
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className={cn('text-sm px-4 py-1.5', config.bg, config.text)}>
              {config.label}
            </Badge>
          </div>

          {/* Customer & Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">العميل</span>
              </div>
              <p className="font-semibold">{reservation.customer_name}</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">المركبة</span>
              </div>
              <p className="font-semibold">{reservation.vehicle_plate}</p>
              <p className="text-sm text-neutral-500">{reservation.vehicle_make} {reservation.vehicle_model}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">تاريخ البداية</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.start_date), 'dd MMMM yyyy', { locale: ar })}</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">تاريخ النهاية</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.end_date), 'dd MMMM yyyy', { locale: ar })}</p>
            </div>
          </div>

          {/* Hold & Created */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">محجوز حتى</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.hold_until), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">تاريخ الإنشاء</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
            </div>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-600 mb-1">ملاحظات</p>
              <p className="text-sm text-amber-800">{reservation.notes}</p>
            </div>
          )}

          {/* ID */}
          <div className="text-center text-xs text-neutral-400">
            رقم الحجز: {reservation.id.slice(0, 8)}...
          </div>

          <Button onClick={onClose} className="w-full" variant="outline">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
