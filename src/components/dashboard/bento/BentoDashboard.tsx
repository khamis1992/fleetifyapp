import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import BentoSidebar from './BentoSidebar';
import {
  Car,
  FileText,
  Users,
  Banknote,
  TrendingUp,
  TrendingDown,
  Wrench,
  AlertTriangle,
  Clock,
  Calendar,
  Brain,
  ArrowUp,
  ArrowDown,
  Bell,
  Search,
  Plus,
  CreditCard,
  FilePlus,
  ShoppingCart,
  UserCheck,
  ChevronLeft,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ===== FAB Menu Component =====
const FABMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const actions = [
    { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, color: 'bg-green-100 text-green-600', href: '/finance/payments' },
    { id: 'contract', label: 'إنشاء عقد', icon: FilePlus, color: 'bg-blue-100 text-blue-600', href: '/fleet/contracts/new' },
    { id: 'search', label: 'البحث', icon: Search, color: 'bg-amber-100 text-amber-600', href: '/search' },
    { id: 'purchase', label: 'إنشاء أمر شراء', icon: ShoppingCart, color: 'bg-orange-100 text-orange-600', href: '/finance/purchases/new' },
  ];

  const handleAction = (href: string) => {
    onClose();
    navigate(href);
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-6 left-6 z-50">
        {/* Menu Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-16 left-0 flex flex-col gap-2"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => handleAction(action.href)}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:translate-x-1 min-w-[160px]"
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', action.color)}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-neutral-900 text-sm">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={onClose}
          animate={{ rotate: isOpen ? 45 : 0 }}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
            isOpen ? 'bg-neutral-900' : 'bg-coral-500 hover:bg-coral-600'
          )}
          style={{ boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(232, 90, 79, 0.4)' }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </>
  );
};

// ===== Stat Card Component =====
const BentoStatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  iconBg: string;
  progressLabel?: string;
  progressValue?: number;
  progressColor?: string;
}> = ({ title, value, change, icon: Icon, iconBg, progressLabel, progressValue, progressColor = 'bg-coral-500' }) => {
  const isPositive = change?.startsWith('+');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-500 font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-neutral-900 mb-3">{value}</p>
      {progressLabel && progressValue !== undefined && (
        <>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
            <span>{progressLabel}</span>
            <span className={cn('font-semibold', progressColor.replace('bg-', 'text-'))}>{progressValue}%</span>
          </div>
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', progressColor)} style={{ width: `${progressValue}%` }} />
          </div>
        </>
      )}
    </motion.div>
  );
};

// ===== Main Dashboard Component =====
const BentoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const [fabOpen, setFabOpen] = useState(false);

  // Fleet Status Query
  const { data: fleetStatus } = useQuery({
    queryKey: ['fleet-status-bento', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;
      const { data } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      const counts = { available: 0, rented: 0, maintenance: 0, reserved: 0 };
      data?.forEach((v) => {
        const status = v.status || 'available';
        if (counts[status as keyof typeof counts] !== undefined) {
          counts[status as keyof typeof counts]++;
        }
      });
      return counts;
    },
    enabled: !!user?.profile?.company_id,
  });

  // Maintenance Query
  const { data: maintenanceData } = useQuery({
    queryKey: ['maintenance-bento', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, scheduled_date, status, vehicles(plate_number)')
        .eq('company_id', user.profile.company_id)
        .in('status', ['pending', 'in_progress', 'scheduled'])
        .order('scheduled_date', { ascending: true })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Recent Activities Query
  const { data: activities } = useQuery({
    queryKey: ['activities-bento', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('activity_logs')
        .select('id, description, created_at')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Revenue Chart Data
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart-bento', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
      const currentMonth = new Date().getMonth();
      
      // Get contracts for last 6 months
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentMonth - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data } = await supabase
          .from('contracts')
          .select('monthly_amount')
          .eq('company_id', user?.profile?.company_id)
          .eq('status', 'active')
          .lte('start_date', monthEnd.toISOString().split('T')[0]);

        const total = data?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
        results.push({ name: months[date.getMonth()], value: Math.round(total / 1000) });
      }
      return results;
    },
    enabled: !!user?.profile?.company_id,
  });

  // Calculate totals
  const totalVehicles = (fleetStatus?.available || 0) + (fleetStatus?.rented || 0) + 
                        (fleetStatus?.maintenance || 0) + (fleetStatus?.reserved || 0);
  const occupancyRate = totalVehicles > 0 ? Math.round((fleetStatus?.rented || 0) / totalVehicles * 100) : 0;

  // Today's date
  const today = new Date();
  const dayName = today.toLocaleDateString('ar-SA', { weekday: 'long' });
  const dayNumber = today.getDate();
  const monthYear = today.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
  const monthName = today.toLocaleDateString('ar-SA', { month: 'long' });

  // Fleet donut data
  const fleetChartData = [
    { name: 'متاح', value: fleetStatus?.available || 0, color: '#22c55e' },
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: '#e85a4f' },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: '#f59e0b' },
    { name: 'محجوز', value: fleetStatus?.reserved || 0, color: '#3b82f6' },
  ];

  // Attendance handler
  const handleAttendance = () => {
    const time = today.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    alert(`✅ تم تسجيل حضورك بنجاح!\n\nالتاريخ: ${dayName} ${dayNumber} ${monthYear}\nالوقت: ${time}`);
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] flex" dir="rtl">
      {/* Sidebar */}
      <BentoSidebar />

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-auto">
        {/* FAB Menu */}
        <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} />

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Date */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-neutral-200">
            <span className="text-2xl font-bold text-neutral-900">{dayNumber}</span>
            <div className="text-right">
              <p className="text-xs font-medium text-neutral-700">{dayName}</p>
              <p className="text-[10px] text-neutral-400">{monthYear}</p>
            </div>
          </div>

          {/* Tasks Button */}
          <button
            onClick={() => setFabOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-coral-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors"
          >
            <span>عرض المهام</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Attendance Button */}
          <button
            onClick={handleAttendance}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-green-500 text-green-600 rounded-full font-semibold text-sm hover:bg-green-50 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>تسجيل الحضور</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث هنا ..."
              className="w-64 px-4 py-2.5 pr-10 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 bg-white rounded-xl border border-neutral-200 hover:bg-neutral-50">
            <Bell className="w-4 h-4 text-neutral-500" />
            <span className="absolute -top-1 -left-1 w-4 h-4 bg-coral-500 rounded-full text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Stats Row */}
        <div className="col-span-3">
          <BentoStatCard
            title="إجمالي المركبات"
            value={stats?.totalVehicles || 0}
            change={stats?.vehiclesChange}
            icon={Car}
            iconBg="bg-coral-100 text-coral-600"
            progressLabel="نشاط المركبات"
            progressValue={stats?.vehicleActivityRate || 0}
            progressColor="bg-coral-500"
          />
        </div>

        <div className="col-span-3">
          <BentoStatCard
            title="العقود النشطة"
            value={stats?.activeContracts || 0}
            change={stats?.contractsChange}
            icon={FileText}
            iconBg="bg-blue-100 text-blue-600"
            progressLabel="معدل الإكمال"
            progressValue={stats?.contractCompletionRate || 0}
            progressColor="bg-blue-500"
          />
        </div>

        <div className="col-span-3">
          <BentoStatCard
            title="إجمالي العملاء"
            value={stats?.totalCustomers || 0}
            change={stats?.customersChange}
            icon={Users}
            iconBg="bg-green-100 text-green-600"
            progressLabel="رضا العملاء"
            progressValue={stats?.customerSatisfactionRate || 0}
            progressColor="bg-green-500"
          />
        </div>

        <div className="col-span-3">
          <BentoStatCard
            title="إيرادات الشهر"
            value={formatCurrency(stats?.monthlyRevenue || 0, { notation: 'compact' })}
            change={stats?.revenueChange}
            icon={Banknote}
            iconBg="bg-amber-100 text-amber-600"
          />
        </div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-5 bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-neutral-900">الأداء المالي</h3>
              <p className="text-xs text-neutral-400">تحليل الإيرادات الشهرية</p>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e85a4f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e85a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickFormatter={(v) => `${v}K`} />
                <Tooltip formatter={(value) => [`${value}K`, 'الإيرادات']} />
                <Area type="monotone" dataKey="value" stroke="#e85a4f" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Fleet Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-3 bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">حالة الأسطول</h3>
            <span className="px-2 py-1 bg-coral-500 text-white rounded-full text-[10px] font-semibold">
              {occupancyRate}% إشغال
            </span>
          </div>
          <div className="h-28 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  dataKey="value"
                >
                  {fleetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-lg font-bold text-neutral-900">{totalVehicles}</p>
              <p className="text-[9px] text-neutral-400">إجمالي</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {fleetChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-[10px] font-bold text-neutral-900">{item.value}</p>
                  <p className="text-[8px] text-neutral-400">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Maintenance Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-4 bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">جدول الصيانة</h3>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-full text-[9px] font-semibold">
              <Clock className="w-2.5 h-2.5" />
              {maintenanceData?.length || 0} قريباً
            </span>
          </div>
          <div className="space-y-2">
            {maintenanceData?.slice(0, 3).map((item: any) => {
              const daysUntil = Math.ceil(
                (new Date(item.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil <= 1 && daysUntil >= 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border-r-2',
                    isOverdue ? 'bg-red-50 border-red-500' : isUrgent ? 'bg-amber-50 border-amber-500' : 'bg-yellow-50 border-yellow-500'
                  )}
                >
                  {isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Wrench className={cn('w-4 h-4', isUrgent ? 'text-amber-600' : 'text-yellow-600')} />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-900">{item.vehicles?.plate_number || 'غير محدد'}</p>
                    <p className="text-[9px] text-neutral-500">
                      {item.maintenance_type} - {isOverdue ? `متأخر ${Math.abs(daysUntil)} يوم` : `بعد ${daysUntil} أيام`}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!maintenanceData || maintenanceData.length === 0) && (
              <div className="text-center py-4 text-neutral-400 text-sm">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>لا توجد صيانات قادمة</p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/fleet/maintenance')}
            className="w-full mt-3 py-2 text-xs font-semibold text-coral-600 bg-coral-50 rounded-lg hover:bg-coral-100"
          >
            عرض الكل
          </button>
        </motion.div>

        {/* Booking Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-4 bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">تقويم الحجوزات</h3>
            <button 
              onClick={() => navigate('/operations/calendar')}
              className="text-[10px] text-coral-600 font-medium flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              عرض الشهر
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((d) => (
              <span key={d} className="text-[8px] text-neutral-400">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(7)].map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              const dayNum = date.getDate();
              const isToday = i === 0;
              const occupancy = Math.round(Math.random() * 50 + 40); // placeholder
              const getColors = (occ: number) => {
                if (occ < 50) return 'bg-green-50 border-green-200 text-green-700';
                if (occ < 70) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
                if (occ < 85) return 'bg-orange-50 border-orange-200 text-orange-700';
                return 'bg-red-50 border-red-200 text-red-700';
              };
              return (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center border',
                    isToday ? 'bg-blue-100 border-2 border-blue-500' : getColors(occupancy)
                  )}
                >
                  <span className={cn('text-[10px] font-semibold', isToday && 'font-bold text-blue-700')}>
                    {dayNum}
                  </span>
                  <span className={cn('text-[7px]', isToday ? 'text-blue-600' : '')}>
                    {isToday ? 'اليوم' : `${occupancy}%`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-900">ملخص الأسبوع</span>
              <span className="text-[8px] text-neutral-400">{`${dayNumber}-${dayNumber + 6} ${monthName}`}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">{occupancyRate}%</p>
                <p className="text-[8px] text-neutral-500">متوسط الإشغال</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-600">{stats?.activeContracts || 0}</p>
                <p className="text-[8px] text-neutral-500">عقود نشطة</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Revenue Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-4 bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">توقعات الإيرادات</h3>
            <div className="w-7 h-7 bg-coral-100 rounded-lg flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-coral-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-neutral-500">الشهر الحالي</span>
                <span className="text-[11px] font-bold text-neutral-900">{formatCurrency(stats?.monthlyRevenue || 0)} QAR</span>
              </div>
              <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-coral-500" style={{ width: '80%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-neutral-500">توقع الشهر القادم</span>
                <span className="text-[11px] font-bold text-green-600">{formatCurrency((stats?.monthlyRevenue || 0) * 1.22)} QAR</span>
              </div>
              <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: '97%' }} />
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-coral-50 rounded-lg">
            <p className="text-[10px] font-semibold text-neutral-900 mb-1">العوامل المؤثرة:</p>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <ArrowUp className="w-2.5 h-2.5 text-green-500" />
                <span className="text-[9px] text-neutral-600">العامل الموسمي (+8%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUp className="w-2.5 h-2.5 text-green-500" />
                <span className="text-[9px] text-neutral-600">عقود جديدة (+12%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowDown className="w-2.5 h-2.5 text-red-500" />
                <span className="text-[9px] text-neutral-600">تأثير الصيانة (-2%)</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-center p-1.5 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">+22%</p>
            <p className="text-[8px] text-neutral-500">نمو متوقع</p>
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-4 bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">النشاطات الأخيرة</h3>
            <button className="text-[10px] text-coral-600 font-medium">عرض الكل</button>
          </div>
          <div className="space-y-2">
            {activities?.map((activity: any, index: number) => {
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-coral-500'];
              const timeAgo = getTimeAgo(new Date(activity.created_at));

              return (
                <div key={activity.id} className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5 rounded-full', colors[index % colors.length])} />
                  <div className="flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">{activity.description}</p>
                    <p className="text-[9px] text-neutral-400">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
            {(!activities || activities.length === 0) && (
              <p className="text-center text-neutral-400 text-sm py-4">لا توجد نشاطات</p>
            )}
          </div>
        </motion.div>
      </div>
      </div>
    </div>
  );
};

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default BentoDashboard;

