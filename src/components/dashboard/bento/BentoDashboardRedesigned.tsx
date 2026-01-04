import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { SkeletonMetrics } from '@/components/loaders';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { Sparkline } from './Sparkline';
import { useAIChat } from '@/contexts/AIChatContext';
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
  Search,
  Plus,
  CreditCard,
  FilePlus,
  ShoppingCart,
  UserCheck,
  ChevronLeft,
  ExternalLink,
  Activity,
  Zap,
  Target,
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
interface FABMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onActionSelect: (actionId: string) => void;
}

const FABMenu: React.FC<FABMenuProps> = ({ isOpen, onClose, onActionSelect }) => {
  const actions = [
    { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, color: 'from-emerald-400 to-emerald-600' },
    { id: 'contract', label: 'إنشاء عقد', icon: FilePlus, color: 'from-blue-400 to-blue-600' },
    { id: 'search', label: 'البحث', icon: Search, color: 'from-amber-400 to-amber-600' },
    { id: 'purchase', label: 'أمر شراء', icon: ShoppingCart, color: 'from-purple-400 to-purple-600' },
  ];

  const handleAction = (actionId: string) => {
    onClose();
    onActionSelect(actionId);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 left-8 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 left-0 flex flex-col gap-3"
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.06 } }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => handleAction(action.id)}
                  className="group flex items-center gap-3 px-5 py-3.5 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:translate-x-1 min-w-[180px] border border-white/20"
                >
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', action.color)}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-neutral-800 text-sm">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => onClose()}
          animate={{ rotate: isOpen ? 135 : 0, scale: isOpen ? 1.05 : 1 }}
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all',
            isOpen ? 'bg-neutral-900' : 'bg-gradient-to-br from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700'
          )}
          style={{
            boxShadow: isOpen
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(232, 90, 79, 0.5), inset 0 -2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus className="w-7 h-7 text-white" strokeWidth={3} />
        </motion.button>
      </div>
    </>
  );
};

// ===== Enhanced Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  icon: React.ElementType;
  iconGradient: string;
  progressLabel?: string;
  progressValue?: number;
  progressColor?: string;
  linkTo?: string;
  onClick?: () => void;
  sparklineData?: number[];
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconGradient,
  progressLabel,
  progressValue,
  progressColor = 'from-coral-500 to-orange-500',
  linkTo,
  onClick,
  sparklineData,
  subtitle,
}) => {
  const navigate = useNavigate();
  const changeStr = String(change || '');
  const isPositive = changeStr.includes('+') || (typeof change === 'number' && change > 0);
  const isClickable = !!linkTo || !!onClick;

  const handleClick = () => {
    if (onClick) onClick();
    else if (linkTo) navigate(linkTo);
  };

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-sm hover:shadow-2xl transition-all duration-500 h-full flex flex-col group border border-white/40",
        isClickable && "cursor-pointer"
      )}
      onClick={isClickable ? handleClick : undefined}
      whileHover={isClickable ? { y: -8, scale: 1.02 } : { y: -4 }}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
    >
      {/* Background gradient decoration */}
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br opacity-5 blur-3xl",
        iconGradient
      )} />

      <div className="relative flex items-start justify-between mb-4">
        <motion.div
          className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', iconGradient)}
          whileHover={{ rotate: 15, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.div>
        <div className="flex items-center gap-2">
          {change !== undefined && change !== null && (
            <motion.span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm',
                isPositive
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {changeStr}
            </motion.span>
          )}
          {isClickable && (
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-all duration-300"
              initial={{ x: -5 }}
              animate={{ x: 0 }}
            >
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="relative flex-1 flex flex-col">
        <p className="text-xs text-neutral-500 font-semibold tracking-wide uppercase mb-2">{title}</p>
        <motion.p
          className="text-3xl font-black text-neutral-900 leading-none mb-2 tracking-tight"
          key={String(value)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: "spring" }}
        >
          {value}
        </motion.p>

        {subtitle && (
          <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
        )}

        {/* Mini Sparkline Chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="h-8 mt-2 mb-3">
            <Sparkline data={sparklineData} color={progressColor} height={32} />
          </div>
        )}

        {progressLabel && progressValue !== undefined && (
          <div className="mt-auto">
            <div className="flex items-center justify-between text-xs text-neutral-600 mb-2">
              <span className="font-medium">{progressLabel}</span>
              <span className={cn('font-bold', progressColor.includes('coral') ? 'text-coral-600' : 'text-emerald-600')}>
                {progressValue}%
              </span>
            </div>
            <div className="h-2 bg-neutral-200/60 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className={cn('h-full rounded-full bg-gradient-to-r shadow-inner', progressColor)}
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hover hint for clickable cards */}
      {isClickable && (
        <motion.div
          className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ y: 5 }}
          animate={{ y: 0 }}
        >
          <span className="text-[10px] text-coral-600 font-bold tracking-wide">اضغط للتفاصيل ←</span>
        </motion.div>
      )}
    </motion.div>
  );
};

// ===== Glass Card Component =====
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className, delay = 0, onClick }) => (
  <motion.div
    className={cn(
      "relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-white/40",
      onClick && "cursor-pointer",
      className
    )}
    onClick={onClick}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: "spring", bounce: 0.4 }}
    whileHover={onClick ? { y: -4, scale: 1.01 } : { y: -2 }}
  >
    {children}
  </motion.div>
);

// ===== Main Dashboard Component =====
const BentoDashboardRedesigned: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { openChat: openAIChat } = useAIChat();
  const [fabOpen, setFabOpen] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [activeFleetIndex, setActiveFleetIndex] = useState<number | null>(null);

  // Fleet Status Query
  const { data: fleetStatus, isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet-status-redesign', user?.profile?.company_id],
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
    queryKey: ['maintenance-redesign', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, scheduled_date, status, vehicles(plate_number)')
        .eq('company_id', user.profile.company_id)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Revenue Chart Data
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart-redesign', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
      const currentMonth = new Date().getMonth();

      const results = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentMonth - i);
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

  const totalVehicles = (fleetStatus?.available || 0) + (fleetStatus?.rented || 0) +
                        (fleetStatus?.maintenance || 0) + (fleetStatus?.reserved || 0);
  const occupancyRate = totalVehicles > 0 ? Math.round((fleetStatus?.rented || 0) / totalVehicles * 100) : 0;

  const today = new Date();
  const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dayNumber = today.getDate();
  const gregorianDate = today.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const fleetChartData = [
    { name: 'متاح', value: fleetStatus?.available || 0, color: '#10b981' },
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: '#e85a4f' },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: '#f59e0b' },
    { name: 'محجوز', value: fleetStatus?.reserved || 0, color: '#3b82f6' },
  ];

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const occupancy = Math.floor(Math.random() * 50) + 40;
      days.push({
        day: date.getDate(),
        isToday: i === 0,
        occupancy,
      });
    }
    return days;
  };
  const weekDays = getWeekDays();

  const triggerQuickSearch = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  const handleActionSelect = useCallback((actionId: string) => {
    switch (actionId) {
      case 'payment':
        navigate('/finance/payments/quick');
        break;
      case 'contract':
        setShowContractWizard(true);
        break;
      case 'search':
        triggerQuickSearch();
        break;
      case 'purchase':
        navigate('/finance/purchase-orders');
        break;
    }
  }, [navigate, triggerQuickSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100">
      <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} onActionSelect={handleActionSelect} />

      {/* NEW STICKY HEADER - Clean, Professional */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Date */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-coral-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-neutral-900">لوحة التحكم</span>
              </div>

              <div className="h-6 w-px bg-neutral-200" />

              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-neutral-900">{dayNumber}</span>
                <span className="text-neutral-600">{dayName}</span>
                <span className="text-neutral-400">{gregorianDate}</span>
              </div>
            </div>

            {/* Right - Search, Notifications, User */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث..."
                  className="w-64 pl-4 pr-10 py-2 bg-neutral-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="h-6 w-px bg-neutral-200" />

              {/* Fleetify AI Assistant */}
              <motion.button
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAIChat()}
              >
                <Brain className="w-4 h-4" />
                <span>AI Assistant</span>
              </motion.button>

              <UnifiedNotificationBell />

              <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-neutral-600">م</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Glassmorphism Design */}
      <div className="p-6">

        {/* Stats Row - 4 Interactive cards */}
        {statsLoading ? (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <SkeletonMetrics count={4} columns={{ sm: 2, md: 2, lg: 4 }} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <StatCard
              title="إجمالي المركبات"
              value={stats?.totalVehicles || 0}
              change={stats?.vehiclesChange}
              icon={Car}
              iconGradient="from-coral-500 to-orange-500"
              progressLabel="نشاط المركبات"
              progressValue={stats?.vehicleActivityRate || 85}
              progressColor="from-coral-500 to-orange-500"
              linkTo="/fleet"
              sparklineData={revenueData?.map(item => item.value) || []}
              subtitle="أسطول نشط"
            />

            <StatCard
              title="العقود النشطة"
              value={stats?.activeContracts || 0}
              change={stats?.contractsChange}
              icon={FileText}
              iconGradient="from-blue-500 to-indigo-500"
              progressLabel="معدل الإكمال"
              progressValue={stats?.contractCompletionRate || 78}
              progressColor="from-blue-500 to-indigo-500"
              linkTo="/contracts"
              sparklineData={revenueData?.map(item => item.value) || []}
              subtitle="عقود سارية"
            />

            <StatCard
              title="إجمالي العملاء"
              value={stats?.totalCustomers || 0}
              change={stats?.customersChange}
              icon={Users}
              iconGradient="from-emerald-500 to-teal-500"
              progressLabel="رضا العملاء"
              progressValue={stats?.customerSatisfactionRate || 92}
              progressColor="from-emerald-500 to-teal-500"
              linkTo="/customers"
              sparklineData={revenueData?.map(item => item.value) || []}
              subtitle="قاعدة عملاء"
            />

            <StatCard
              title="إيرادات الشهر"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              change={stats?.revenueChange}
              icon={Banknote}
              iconGradient="from-amber-500 to-yellow-500"
              linkTo="/finance"
              sparklineData={revenueData?.map(item => item.value) || []}
              subtitle="أداء مالي"
            />
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Financial Performance Chart */}
          <GlassCard className="col-span-5" delay={0.1} onClick={() => navigate('/finance')}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-neutral-900 mb-1">الأداء المالي</h3>
                <p className="text-xs text-neutral-500 font-medium">تحليل الإيرادات الشهرية</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData || []}>
                  <defs>
                    <linearGradient id="colorRevenueRedesign" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e85a4f" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e85a4f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }} tickFormatter={(v) => `${v}K`} />
                  <Tooltip
                    formatter={(value) => [`${value}K`, 'الإيرادات']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      fontSize: '13px',
                      padding: '12px'
                    }}
                    cursor={{ stroke: '#e85a4f', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#e85a4f"
                    strokeWidth={3}
                    fill="url(#colorRevenueRedesign)"
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200/60">
              {[
                { value: '+22%', label: 'معدل النمو', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { value: formatCurrency(stats?.monthlyRevenue || 0), label: 'الإيرادات', color: 'text-blue-600', bg: 'bg-blue-50' },
                { value: stats?.activeContracts || 0, label: 'العقود', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className={cn('text-center p-3 rounded-2xl', item.bg)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.p
                    className={`text-lg font-black ${item.color}`}
                    key={String(item.value)}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {item.value}
                  </motion.p>
                  <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wide">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Fleet Status */}
          <GlassCard className="col-span-3" delay={0.15}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-900">حالة الأسطول</h3>
                <p className="text-xs text-neutral-500">توزيع المركبات</p>
              </div>
              <motion.span
                className="px-3 py-1.5 bg-gradient-to-r from-coral-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-coral-500/30 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/fleet')}
              >
                {occupancyRate}% مستغل
              </motion.span>
            </div>

            <div className="h-36 relative flex items-center justify-center mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveFleetIndex(index)}
                    onMouseLeave={() => setActiveFleetIndex(null)}
                  >
                    {fleetChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{
                          cursor: 'pointer',
                          filter: activeFleetIndex === index
                            ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                          transform: activeFleetIndex === index ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => navigate(`/fleet?status=${entry.name}`)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <motion.div
                          className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-neutral-100"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <p className="font-bold text-sm text-neutral-900">{data.name}</p>
                          <p className="text-neutral-600 text-xs mt-1">{data.value} مركبة</p>
                          <p className="text-[10px] text-coral-600 mt-2 font-semibold">انقر للتصفية ←</p>
                        </motion.div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <motion.div
                className="absolute text-center"
                key={totalVehicles}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className="text-3xl font-black text-neutral-900">{totalVehicles}</p>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">إجمالي</p>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {fleetChartData.map((item, index) => (
                <motion.div
                  key={item.name}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
                    activeFleetIndex === index
                      ? 'bg-neutral-100 ring-2 ring-neutral-200'
                      : 'bg-neutral-50/60 hover:bg-neutral-100'
                  )}
                  onClick={() => navigate(`/fleet?status=${item.name}`)}
                  onMouseEnter={() => setActiveFleetIndex(index)}
                  onMouseLeave={() => setActiveFleetIndex(null)}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                    animate={{ scale: activeFleetIndex === index ? 1.3 : 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-black text-neutral-900">{item.value}</p>
                    <p className="text-[10px] text-neutral-500 font-medium">{item.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Maintenance Schedule */}
          <GlassCard className="col-span-4" delay={0.2}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-900">جدول الصيانة</h3>
                <p className="text-xs text-neutral-500">الصيانات القادمة</p>
              </div>
              <motion.span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/30 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/fleet/maintenance')}
              >
                <Clock className="w-3.5 h-3.5" />
                {maintenanceData?.length || 0} قريباً
              </motion.span>
            </div>

            <div className="space-y-2">
              {maintenanceData && maintenanceData.length > 0 ? (
                maintenanceData.slice(0, 3).map((item: any, index: number) => (
                  <motion.div
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-3 p-3 rounded-xl border-r-4 cursor-pointer transition-all',
                      index === 0
                        ? 'bg-red-50/80 border-red-500 hover:bg-red-100'
                        : 'bg-amber-50/80 border-amber-500 hover:bg-amber-100'
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/fleet/maintenance`)}
                  >
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      animate={index === 0 ? { rotate: [0, 10, -10, 0] } : {}}
                      transition={{ repeat: index === 0 ? Infinity : 0, duration: 3, repeatDelay: 1 }}
                    >
                      {index === 0 ? (
                        <div className="bg-red-500 text-white p-2 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
                      ) : (
                        <div className="bg-amber-500 text-white p-2 rounded-xl"><Wrench className="w-5 h-5" /></div>
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-neutral-900">
                        {item.vehicles?.plate_number || 'غير محدد'}
                      </p>
                      <p className="text-xs text-neutral-600">{item.maintenance_type}</p>
                    </div>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={{ x: -5 }}
                      animate={{ x: 0 }}
                    >
                      <ChevronLeft className="w-5 h-5 text-neutral-400" />
                    </motion.div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="text-center py-8 text-neutral-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">لا توجد صيانات</p>
                </motion.div>
              )}
            </div>

            <motion.button
              className="w-full mt-4 py-3 text-xs font-bold text-coral-600 bg-coral-50 rounded-xl hover:bg-coral-100 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/fleet/maintenance')}
            >
              عرض الكل ({maintenanceData?.length || 0})
            </motion.button>
          </GlassCard>

          {/* Reservations Calendar */}
          <GlassCard className="col-span-4" delay={0.25} onClick={() => navigate('/fleet/reservations')}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-neutral-900">تقويم الحجوزات</h3>
                <p className="text-xs text-neutral-500">الأسبوع القادم</p>
              </div>
              <motion.button
                className="p-2 bg-coral-50 rounded-xl hover:bg-coral-100 transition-colors"
                whileHover={{ rotate: 15 }}
              >
                <Calendar className="w-4 h-4 text-coral-600" />
              </motion.button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day) => (
                <span key={day} className="text-[10px] text-neutral-500 font-semibold uppercase">{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all',
                    day.isToday
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : day.occupancy > 80
                      ? 'bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100'
                      : day.occupancy > 60
                      ? 'bg-orange-50 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-100'
                      : 'bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100'
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.15, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetDate = new Date();
                    targetDate.setDate(today.getDate() + index);
                    navigate(`/fleet/reservations?date=${targetDate.toISOString().split('T')[0]}`);
                  }}
                >
                  <span className={cn('text-sm font-black', day.isToday ? 'text-white' : 'text-neutral-700')}>
                    {day.day}
                  </span>
                  <span className={cn('text-[9px] font-bold', day.isToday ? 'text-white/80' : 'text-neutral-500')}>
                    {day.isToday ? 'اليوم' : `${day.occupancy}%`}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all"
              whileHover={{ scale: 1.02 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/fleet/reservations');
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-900">ملخص الأسبوع</span>
                <span className="text-[10px] text-neutral-500">
                  {dayNumber}-{dayNumber + 6} {gregorianDate.split(' ')[0]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <motion.p
                    className="text-2xl font-black text-blue-600"
                    key={occupancyRate}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {occupancyRate}%
                  </motion.p>
                  <p className="text-[10px] text-neutral-600 font-semibold uppercase">الإشغال</p>
                </div>
                <div className="text-center">
                  <motion.p
                    className="text-2xl font-black text-emerald-600"
                    key={stats?.activeContracts}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {stats?.activeContracts || 0}
                  </motion.p>
                  <p className="text-[10px] text-neutral-600 font-semibold uppercase">عقود</p>
                </div>
              </div>
            </motion.div>
          </GlassCard>

          {/* Revenue Forecast */}
          <GlassCard className="col-span-4" delay={0.3} onClick={() => navigate('/finance')}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-neutral-900">توقعات الإيرادات</h3>
                <p className="text-xs text-neutral-500">تحليل ذكي باستخدام AI</p>
              </div>
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5, repeatDelay: 2 }}
              >
                <Brain className="w-6 h-6 text-white" />
              </motion.div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-600 font-semibold">الشهر الحالي</span>
                  <motion.span
                    className="text-sm font-black text-neutral-900"
                    key={stats?.monthlyRevenue}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {formatCurrency(stats?.monthlyRevenue || 0)}
                  </motion.span>
                </div>
                <div className="h-2 bg-neutral-200/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-coral-500 to-orange-500 shadow-inner"
                    initial={{ width: 0 }}
                    animate={{ width: '80%' }}
                    transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-600 font-semibold">توقع الشهر القادم</span>
                  <motion.span
                    className="text-sm font-black text-emerald-600"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {formatCurrency((stats?.monthlyRevenue || 0) * 1.22)}
                  </motion.span>
                </div>
                <div className="h-2 bg-neutral-200/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-inner"
                    initial={{ width: 0 }}
                    animate={{ width: '97%' }}
                    transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
                  />
                </div>
              </div>
            </div>

            <motion.div
              className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs font-black text-neutral-900 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                العوامل المؤثرة
              </p>
              <div className="space-y-2">
                {[
                  { icon: ArrowUp, color: 'text-emerald-600', bg: 'bg-emerald-100', text: 'العامل الموسمي (+8%)' },
                  { icon: ArrowUp, color: 'text-emerald-600', bg: 'bg-emerald-100', text: 'عقود جديدة (+12%)' },
                  { icon: ArrowDown, color: 'text-red-600', bg: 'bg-red-100', text: 'تأثير الصيانة (-2%)' },
                ].map((factor, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', factor.bg)}>
                      <factor.icon className={`w-3.5 h-3.5 ${factor.color}`} strokeWidth={3} />
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-700">{factor.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </GlassCard>

          {/* Recent Activities */}
          <GlassCard className="col-span-4" delay={0.35}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-neutral-900">النشاطات الأخيرة</h3>
                <p className="text-xs text-neutral-500">آخر التحديثات</p>
              </div>
              <motion.button
                className="text-xs font-bold text-coral-600 hover:text-coral-700"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/reports')}
              >
                عرض الكل
              </motion.button>
            </div>

            <motion.div
              className="text-center py-10 text-neutral-400"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Clock className="w-10 h-10 opacity-40" />
              </motion.div>
              <p className="text-base font-medium text-neutral-600 mb-1">لا توجد نشاطات حديثة</p>
              <p className="text-xs text-neutral-400 mb-4">ابدأ بإنشاء عقد جديد أو إجراء عملية</p>
              <motion.button
                className="px-6 py-3 bg-gradient-to-r from-coral-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-coral-500/30 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/contracts')}
              >
                إنشاء عقد جديد ←
              </motion.button>
            </motion.div>
          </GlassCard>
        </div>

        {/* Contract Wizard */}
        <SimpleContractWizard
          open={showContractWizard}
          onOpenChange={setShowContractWizard}
        />
      </div>
    </div>
  );
};

export default BentoDashboardRedesigned;
