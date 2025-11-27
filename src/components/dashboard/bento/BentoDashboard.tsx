import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardLayout, DashboardWidgetId } from '@/hooks/useDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
  Settings,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  Move,
  Maximize2,
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

// React Grid Layout with width provider
const ResponsiveGridLayout = WidthProvider(GridLayout);

// ===== FAB Menu Component =====
const FABMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const actions = [
    { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, color: 'bg-green-100 text-green-600', href: '/finance/payments/register' },
    { id: 'contract', label: 'إنشاء عقد', icon: FilePlus, color: 'bg-blue-100 text-blue-600', href: '/contracts' },
    { id: 'search', label: 'البحث', icon: Search, color: 'bg-amber-100 text-amber-600', href: '/search' },
    { id: 'purchase', label: 'إنشاء أمر شراء', icon: ShoppingCart, color: 'bg-orange-100 text-orange-600', href: '/finance/purchase-orders' },
  ];

  const handleAction = (href: string) => {
    onClose();
    navigate(href);
  };

  return (
    <>
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

      <div className="fixed bottom-6 left-6 z-50">
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

// ===== Dynamic Size Context =====
// نظام حساب الأحجام الديناميكية بناءً على أبعاد البطاقة
interface SizeContext {
  isCompact: boolean;
  isLarge: boolean;
  textScale: number;
  iconScale: number;
}

const getSizeContext = (w: number, h: number): SizeContext => {
  const area = w * h;
  const isCompact = w <= 3 || h <= 2;
  const isLarge = w >= 5 && h >= 4;
  
  // مقياس النص بناءً على المساحة
  let textScale = 1;
  if (area <= 6) textScale = 0.85;
  else if (area >= 20) textScale = 1.15;
  
  // مقياس الأيقونات
  let iconScale = 1;
  if (area <= 6) iconScale = 0.8;
  else if (area >= 20) iconScale = 1.2;

  return { isCompact, isLarge, textScale, iconScale };
};

// ===== Responsive Stat Card =====
const ResponsiveStatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  iconBg: string;
  progressLabel?: string;
  progressValue?: number;
  progressColor?: string;
  width: number;
  height: number;
}> = ({ title, value, change, icon: Icon, iconBg, progressLabel, progressValue, progressColor = 'bg-coral-500', width, height }) => {
  const isPositive = change?.startsWith('+');
  const { isCompact, isLarge, textScale, iconScale } = getSizeContext(width, height);

  // أحجام ديناميكية
  const iconBoxSize = isCompact ? 'w-7 h-7' : isLarge ? 'w-12 h-12' : 'w-9 h-9';
  const iconSize = isCompact ? 'w-3.5 h-3.5' : isLarge ? 'w-6 h-6' : 'w-4 h-4';
  const titleSize = isCompact ? 'text-[9px]' : isLarge ? 'text-sm' : 'text-[11px]';
  const valueSize = isCompact ? 'text-xl' : isLarge ? 'text-4xl' : 'text-[1.75rem]';
  const badgeSize = isCompact ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  return (
    <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={cn('rounded-lg flex items-center justify-center', iconBoxSize, iconBg)}>
          <Icon className={iconSize} />
        </div>
        {change && !isCompact && (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold',
            badgeSize,
            isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {change}
          </span>
        )}
      </div>
      <p className={cn('text-neutral-500 font-medium mb-1', titleSize)}>{title}</p>
      <p className={cn('font-bold text-neutral-900 leading-none mb-2 flex-grow', valueSize)}>{value}</p>
      {progressLabel && progressValue !== undefined && !isCompact && (
        <div className="mt-auto">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
            <span>{progressLabel}</span>
            <span className={cn('font-semibold', progressColor.replace('bg-', 'text-'))}>{progressValue}%</span>
          </div>
          <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', progressColor)} style={{ width: `${progressValue}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Main Dashboard Component =====
const BentoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const [fabOpen, setFabOpen] = useState(false);

  // استخدام hook التخصيص المحدث
  const {
    widgets,
    gridLayout,
    isEditMode,
    setIsEditMode,
    onLayoutChange,
    toggleWidgetVisibility,
    resetToDefault,
    exitEditMode,
  } = useDashboardLayout();

  // Helper function for calculating time ago from a date
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

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
        .limit(5);
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

  // Get widget by ID
  const getWidgetById = (id: DashboardWidgetId) => widgets.find(w => w.id === id);

  // تعريف محتوى كل بطاقة
  const renderWidget = (widgetId: DashboardWidgetId) => {
    const widget = getWidgetById(widgetId);
    const w = widget?.w || 3;
    const h = widget?.h || 2;
    const { isCompact, isLarge } = getSizeContext(w, h);

    switch (widgetId) {
      case 'stats-vehicles':
        return (
          <ResponsiveStatCard
            title="إجمالي المركبات"
            value={stats?.totalVehicles || 0}
            change={stats?.vehiclesChange}
            icon={Car}
            iconBg="bg-coral-100 text-coral-600"
            progressLabel="نشاط المركبات"
            progressValue={stats?.vehicleActivityRate || 0}
            progressColor="bg-coral-500"
            width={w}
            height={h}
          />
        );

      case 'stats-contracts':
        return (
          <ResponsiveStatCard
            title="العقود النشطة"
            value={stats?.activeContracts || 0}
            change={stats?.contractsChange}
            icon={FileText}
            iconBg="bg-blue-100 text-blue-600"
            progressLabel="معدل الإكمال"
            progressValue={stats?.contractCompletionRate || 0}
            progressColor="bg-blue-500"
            width={w}
            height={h}
          />
        );

      case 'stats-customers':
        return (
          <ResponsiveStatCard
            title="إجمالي العملاء"
            value={stats?.totalCustomers || 0}
            change={stats?.customersChange}
            icon={Users}
            iconBg="bg-green-100 text-green-600"
            progressLabel="رضا العملاء"
            progressValue={stats?.customerSatisfactionRate || 0}
            progressColor="bg-green-500"
            width={w}
            height={h}
          />
        );

      case 'stats-revenue':
        return (
          <ResponsiveStatCard
            title="إيرادات الشهر"
            value={formatCurrency(stats?.monthlyRevenue || 0, { notation: 'compact' })}
            change={stats?.revenueChange}
            icon={Banknote}
            iconBg="bg-amber-100 text-amber-600"
            width={w}
            height={h}
          />
        );

      case 'chart-revenue':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div>
                <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>الأداء المالي</h3>
                {!isCompact && <p className="text-[10px] text-neutral-400">تحليل الإيرادات</p>}
              </div>
            </div>
            <div className="flex-grow min-h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e85a4f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e85a4f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: isCompact ? 8 : 10, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: isCompact ? 8 : 10, fill: '#78716c' }} tickFormatter={(v) => `${v}K`} />
                  <Tooltip formatter={(value) => [`${value}K`, 'الإيرادات']} />
                  <Area type="monotone" dataKey="value" stroke="#e85a4f" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {isLarge && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-100">
                <div className="text-center">
                  <p className="text-sm font-bold text-green-600">+22%</p>
                  <p className="text-[9px] text-neutral-500">النمو</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(stats?.monthlyRevenue || 0, { notation: 'compact' })}</p>
                  <p className="text-[9px] text-neutral-500">الإيرادات</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-purple-600">{stats?.activeContracts || 0}</p>
                  <p className="text-[9px] text-neutral-500">العقود</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'chart-fleet':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>حالة الأسطول</h3>
              <span className={cn('px-2 py-1 bg-coral-500 text-white rounded-full font-semibold', isCompact ? 'text-[8px]' : 'text-[10px]')}>
                {occupancyRate}%
              </span>
            </div>
            <div className="relative flex-grow flex items-center justify-center min-h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCompact ? '50%' : '55%'}
                    outerRadius={isCompact ? '80%' : '85%'}
                    dataKey="value"
                  >
                    {fleetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className={cn('font-bold text-neutral-900', isCompact ? 'text-sm' : 'text-lg')}>{totalVehicles}</p>
                <p className={cn('text-neutral-400', isCompact ? 'text-[7px]' : 'text-[9px]')}>إجمالي</p>
              </div>
            </div>
            {!isCompact && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {fleetChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-900">{item.value}</p>
                      <p className="text-[8px] text-neutral-400 truncate">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'maintenance':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>جدول الصيانة</h3>
              <span className={cn('inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-full font-semibold', isCompact ? 'text-[8px]' : 'text-[9px]')}>
                <Clock className={isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
                {maintenanceData?.length || 0}
              </span>
            </div>
            <div className="space-y-1.5 flex-grow overflow-auto">
              {maintenanceData?.slice(0, isLarge ? 5 : 3).map((item: any) => {
                const daysUntil = Math.ceil(
                  (new Date(item.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysUntil < 0;
                const isUrgent = daysUntil <= 1 && daysUntil >= 0;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border-r-2',
                      isOverdue ? 'bg-red-50 border-red-500' : isUrgent ? 'bg-amber-50 border-amber-500' : 'bg-yellow-50 border-yellow-500'
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4', 'text-red-600 flex-shrink-0')} />
                    ) : (
                      <Wrench className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4', 'flex-shrink-0', isUrgent ? 'text-amber-600' : 'text-yellow-600')} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-neutral-900 truncate', isCompact ? 'text-[10px]' : 'text-xs')}>{item.vehicles?.plate_number || 'غير محدد'}</p>
                      <p className={cn('text-neutral-500 truncate', isCompact ? 'text-[8px]' : 'text-[9px]')}>
                        {item.maintenance_type} - {isOverdue ? `متأخر ${Math.abs(daysUntil)} يوم` : `بعد ${daysUntil} أيام`}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!maintenanceData || maintenanceData.length === 0) && (
                <div className="text-center py-4 text-neutral-400">
                  <Wrench className={cn('mx-auto mb-2 opacity-30', isCompact ? 'w-6 h-6' : 'w-8 h-8')} />
                  <p className={isCompact ? 'text-[10px]' : 'text-sm'}>لا توجد صيانات</p>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/fleet/maintenance')}
              className={cn(
                'w-full mt-2 font-semibold text-coral-600 bg-coral-50 rounded-lg hover:bg-coral-100 transition-colors',
                isCompact ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]'
              )}
            >
              عرض الكل ({maintenanceData?.length || 0})
            </button>
          </div>
        );

      case 'calendar':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>تقويم الحجوزات</h3>
              <button 
                onClick={() => navigate('/operations/calendar')}
                className={cn('text-coral-600 font-medium flex items-center gap-1', isCompact ? 'text-[9px]' : 'text-[10px]')}
              >
                <Calendar className={isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                عرض
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((d) => (
                <span key={d} className={cn('text-neutral-400', isCompact ? 'text-[6px]' : 'text-[8px]')}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-grow">
              {[...Array(7)].map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dayNum = date.getDate();
                const isToday = i === 0;
                const occupancy = Math.round(Math.random() * 50 + 40);
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
                    <span className={cn('font-semibold', isCompact ? 'text-[8px]' : 'text-[10px]', isToday && 'font-bold text-blue-700')}>
                      {dayNum}
                    </span>
                    <span className={cn(isCompact ? 'text-[6px]' : 'text-[7px]', isToday ? 'text-blue-600' : '')}>
                      {isToday ? 'اليوم' : `${occupancy}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            {!isCompact && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-neutral-900">ملخص الأسبوع</span>
                  <span className="text-[8px] text-neutral-400">{`${dayNumber}-${dayNumber + 6} ${monthName}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600">{occupancyRate}%</p>
                    <p className="text-[8px] text-neutral-500">الإشغال</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-600">{stats?.activeContracts || 0}</p>
                    <p className="text-[8px] text-neutral-500">عقود</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'forecast':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>توقعات الإيرادات</h3>
              <div className={cn('bg-coral-100 rounded-lg flex items-center justify-center', isCompact ? 'w-5 h-5' : 'w-7 h-7')}>
                <Brain className={cn('text-coral-600', isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
              </div>
            </div>
            <div className="space-y-2 flex-grow">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn('text-neutral-500', isCompact ? 'text-[8px]' : 'text-[10px]')}>الشهر الحالي</span>
                  <span className={cn('font-bold text-neutral-900', isCompact ? 'text-[9px]' : 'text-[11px]')}>{formatCurrency(stats?.monthlyRevenue || 0)}</span>
                </div>
                <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-coral-500" style={{ width: '80%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn('text-neutral-500', isCompact ? 'text-[8px]' : 'text-[10px]')}>توقع الشهر القادم</span>
                  <span className={cn('font-bold text-green-600', isCompact ? 'text-[9px]' : 'text-[11px]')}>{formatCurrency((stats?.monthlyRevenue || 0) * 1.22)}</span>
                </div>
                <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: '97%' }} />
                </div>
              </div>
            </div>
            {!isCompact && (
              <>
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
              </>
            )}
          </div>
        );

      case 'activities':
        return (
          <div className="bg-white rounded-[1.25rem] p-3 sm:p-4 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className={cn('font-bold text-neutral-900', isCompact ? 'text-xs' : 'text-sm')}>النشاطات الأخيرة</h3>
              <button className={cn('text-coral-600 font-medium', isCompact ? 'text-[9px]' : 'text-[10px]')}>عرض الكل</button>
            </div>
            <div className="space-y-2 flex-grow overflow-auto">
              {activities?.slice(0, isLarge ? 6 : isCompact ? 3 : 4).map((activity: any, index: number) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-coral-500'];
                const timeAgo = getTimeAgo(new Date(activity.created_at));

                return (
                  <div key={activity.id} className="flex items-center gap-2">
                    <div className={cn('rounded-full flex-shrink-0', isCompact ? 'w-1 h-1' : 'w-1.5 h-1.5', colors[index % colors.length])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium text-neutral-900 truncate', isCompact ? 'text-[9px]' : 'text-[11px]')}>{activity.description}</p>
                      <p className={cn('text-neutral-400', isCompact ? 'text-[7px]' : 'text-[9px]')}>{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
              {(!activities || activities.length === 0) && (
                <p className={cn('text-center text-neutral-400 py-4', isCompact ? 'text-[10px]' : 'text-sm')}>لا توجد نشاطات</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed]" dir="rtl">
      <div className="p-5 overflow-auto">
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
            {/* زر تخصيص لوحة التحكم */}
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={resetToDefault}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
                  title="إعادة الترتيب الافتراضي"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>افتراضي</span>
                </button>
                <button
                  onClick={() => setIsEditMode(false)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
                  title="إلغاء"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={exitEditMode}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
                  title="حفظ التغييرات"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                title="تخصيص لوحة التحكم"
              >
                <Settings className="w-4 h-4" />
                <span>تخصيص</span>
              </button>
            )}

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

        {/* تعليمات وضع التعديل */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-coral-50 border border-coral-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-coral-600" />
                <div>
                  <p className="text-sm font-semibold text-coral-900">وضع التخصيص المتقدم</p>
                  <p className="text-xs text-coral-700">
                    <Move className="w-3 h-3 inline ml-1" /> اسحب البطاقات لتحريكها
                    <span className="mx-2">•</span>
                    <Maximize2 className="w-3 h-3 inline ml-1" /> اسحب الزوايا لتغيير الحجم
                    <span className="mx-2">•</span>
                    <Eye className="w-3 h-3 inline ml-1" /> اضغط لإخفاء/إظهار
                  </p>
                </div>
              </div>
              
              {/* قائمة البطاقات المخفية */}
              {widgets.some(w => !w.visible) && (
                <div className="mt-3 pt-3 border-t border-coral-200">
                  <p className="text-xs font-medium text-coral-800 mb-2">البطاقات المخفية:</p>
                  <div className="flex flex-wrap gap-2">
                    {widgets.filter(w => !w.visible).map(w => (
                      <button
                        key={w.id}
                        onClick={() => toggleWidgetVisibility(w.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-neutral-600 hover:bg-coral-100 transition-colors"
                      >
                        <EyeOff className="w-3 h-3" />
                        {w.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* React Grid Layout */}
        <div className="w-full" dir="ltr">
          <ResponsiveGridLayout
            className="layout"
            layout={gridLayout}
            cols={12}
            rowHeight={60}
            onLayoutChange={onLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            draggableHandle=".drag-handle"
            resizeHandles={['se', 'sw', 'ne', 'nw']}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            compactType="vertical"
          >
          {widgets.filter(w => w.visible).map((widget) => (
            <div
              key={widget.id}
              className={cn(
                'relative group',
                isEditMode && 'ring-2 ring-coral-300 ring-dashed rounded-[1.25rem]'
              )}
            >
              {/* أزرار التحكم في وضع التعديل */}
              {isEditMode && (
                <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="drag-handle p-1.5 bg-coral-500 text-white rounded-lg shadow-lg cursor-grab active:cursor-grabbing hover:bg-coral-600 transition-colors"
                    title="اسحب لتحريك"
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className="p-1.5 bg-gray-500 text-white rounded-lg shadow-lg hover:bg-gray-600 transition-colors"
                    title="إخفاء البطاقة"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* محتوى البطاقة */}
              <div className="h-full">
                {renderWidget(widget.id)}
              </div>
            </div>
          ))}
          </ResponsiveGridLayout>
        </div>
      </div>

      {/* Custom styles for react-grid-layout */}
      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: rgba(232, 90, 79, 0.2) !important;
          border-radius: 1.25rem !important;
          border: 2px dashed #e85a4f !important;
        }
        .react-grid-item > .react-resizable-handle {
          background: transparent !important;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid rgba(232, 90, 79, 0.5);
          border-bottom: 2px solid rgba(232, 90, 79, 0.5);
        }
        .react-grid-item.resizing {
          z-index: 100;
        }
        .react-grid-item.react-draggable-dragging {
          z-index: 100;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
};

export default BentoDashboard;
