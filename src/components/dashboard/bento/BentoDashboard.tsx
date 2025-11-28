import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ContractWizard } from '@/components/contracts/ContractWizard';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { Sparkline } from './Sparkline';
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
  Search,
  Plus,
  CreditCard,
  FilePlus,
  ShoppingCart,
  UserCheck,
  ChevronLeft,
  ExternalLink,
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
    { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, color: 'bg-green-100 text-green-600' },
    { id: 'contract', label: 'إنشاء عقد', icon: FilePlus, color: 'bg-blue-100 text-blue-600' },
    { id: 'search', label: 'البحث', icon: Search, color: 'bg-amber-100 text-amber-600' },
    { id: 'purchase', label: 'إنشاء أمر شراء', icon: ShoppingCart, color: 'bg-orange-100 text-orange-600' },
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
                  onClick={() => handleAction(action.id)}
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

// ===== Enhanced Interactive Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  icon: React.ElementType;
  iconBg: string;
  progressLabel?: string;
  progressValue?: number;
  progressColor?: string;
  linkTo?: string;
  onClick?: () => void;
  sparklineData?: number[];
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  progressLabel,
  progressValue,
  progressColor = 'bg-coral-500',
  linkTo,
  onClick,
  sparklineData,
}) => {
  const navigate = useNavigate();
  // Handle both string and number change values
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
        "bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group",
        isClickable && "cursor-pointer"
      )}
      onClick={isClickable ? handleClick : undefined}
      whileHover={isClickable ? { y: -4, scale: 1.02 } : { y: -2 }}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
        <div className="flex items-center gap-2">
          {change !== undefined && change !== null && (
            <motion.span 
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {changeStr}
            </motion.span>
          )}
          {isClickable && (
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -5 }}
              animate={{ x: 0 }}
            >
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </motion.div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-neutral-500 font-medium mb-1">{title}</p>
      <motion.p 
        className="text-[1.75rem] font-bold text-neutral-900 leading-none mb-2"
        key={String(value)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.p>
      
      {/* Mini Sparkline Chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-6 mt-1 mb-2">
          <Sparkline data={sparklineData} color={progressColor} height={24} />
        </div>
      )}
      
      {progressLabel && progressValue !== undefined && (
        <div className="mt-auto">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
            <span>{progressLabel}</span>
            <span className={cn('font-semibold', progressColor.replace('bg-', 'text-'))}>{progressValue}%</span>
          </div>
          <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
            <motion.div 
              className={cn('h-full rounded-full', progressColor)} 
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>
      )}
      
      {/* Hover hint for clickable cards */}
      {isClickable && (
        <motion.div 
          className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ y: 5 }}
          animate={{ y: 0 }}
        >
          <span className="text-[8px] text-coral-500 font-medium">انقر للتفاصيل ←</span>
        </motion.div>
      )}
    </motion.div>
  );
};

// ===== Main Dashboard Component =====
const BentoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats } = useDashboardStats();
  const [fabOpen, setFabOpen] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [activeFleetIndex, setActiveFleetIndex] = useState<number | null>(null);

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
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true })
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

  // Today's date (Gregorian calendar)
  const today = new Date();
  const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dayNumber = today.getDate();
  const gregorianDate = today.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  // Fleet donut data
  const fleetChartData = [
    { name: 'متاح', value: fleetStatus?.available || 0, color: '#22c55e' },
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: '#e85a4f' },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: '#f59e0b' },
    { name: 'محجوز', value: fleetStatus?.reserved || 0, color: '#3b82f6' },
  ];

  // Calendar data
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

  // Function to trigger QuickSearch (Ctrl+K)
  const triggerQuickSearch = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  // Handle FAB action selection
  const handleActionSelect = useCallback((actionId: string) => {
    switch (actionId) {
      case 'payment':
        // Navigate to quick payment page
        navigate('/finance/payments/quick');
        break;
      case 'contract':
        // Open contract wizard without navigation
        setShowContractWizard(true);
        break;
      case 'search':
        // Trigger QuickSearch dialog
        triggerQuickSearch();
        break;
      case 'purchase':
        // Navigate to purchase orders page
        navigate('/finance/purchase-orders');
        break;
    }
  }, [navigate, triggerQuickSearch]);

  return (
    <div className="min-h-screen bg-neutral-150 p-5">
      <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} onActionSelect={handleActionSelect} />

      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-neutral-200">
            <span className="text-xl font-bold text-neutral-900">{dayNumber}</span>
            <div className="text-right">
              <p className="text-xs font-medium text-neutral-700">{dayName}</p>
              <p className="text-[10px] text-neutral-400">{gregorianDate}</p>
            </div>
          </div>
          <button
            onClick={() => setFabOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-coral-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors"
          >
            <span>عرض المهام</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-green-500 text-green-600 rounded-full font-semibold text-sm hover:bg-green-50 transition-colors">
            <UserCheck className="w-4 h-4" />
            <span>تسجيل الحضور</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث هنا ..."
              className="w-64 px-4 py-2.5 pr-10 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          
          <div className="bg-white rounded-xl border border-neutral-200">
            <UnifiedNotificationBell />
          </div>
        </div>
      </header>

      {/* Bento Grid - Static Layout */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Stats Row - 4 Interactive cards */}
        <div className="col-span-3">
          <StatCard
            title="إجمالي المركبات"
            value={stats?.totalVehicles || 0}
            change={stats?.vehiclesChange}
            icon={Car}
            iconBg="bg-coral-100 text-coral-600"
            progressLabel="نشاط المركبات"
            progressValue={stats?.vehicleActivityRate || 85}
            progressColor="bg-coral-500"
            linkTo="/fleet"
            sparklineData={revenueData?.map(item => item.value) || []}
          />
        </div>

        <div className="col-span-3">
          <StatCard
            title="العقود النشطة"
            value={stats?.activeContracts || 0}
            change={stats?.contractsChange}
            icon={FileText}
            iconBg="bg-blue-100 text-blue-600"
            progressLabel="معدل الإكمال"
            progressValue={stats?.contractCompletionRate || 78}
            progressColor="bg-blue-500"
            linkTo="/contracts"
            sparklineData={revenueData?.map(item => item.value) || []}
          />
        </div>

        <div className="col-span-3">
          <StatCard
            title="إجمالي العملاء"
            value={stats?.totalCustomers || 0}
            change={stats?.customersChange}
            icon={Users}
            iconBg="bg-green-100 text-green-600"
            progressLabel="رضا العملاء"
            progressValue={stats?.customerSatisfactionRate || 92}
            progressColor="bg-green-500"
            linkTo="/customers"
            sparklineData={revenueData?.map(item => item.value) || []}
          />
        </div>

        <div className="col-span-3">
          <StatCard
            title="إيرادات الشهر"
            value={formatCurrency(stats?.monthlyRevenue || 0)}
            change={stats?.revenueChange}
            icon={Banknote}
            iconBg="bg-amber-100 text-amber-600"
            linkTo="/finance"
            sparklineData={revenueData?.map(item => item.value) || []}
          />
        </div>

        {/* Interactive Financial Performance Chart */}
        <motion.div 
          className="col-span-5 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate('/finance')}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">الأداء المالي</h3>
              <p className="text-[10px] text-neutral-400">تحليل الإيرادات</p>
            </div>
            <motion.div
              className="text-[9px] text-coral-500 font-medium opacity-0 group-hover:opacity-100"
              whileHover={{ x: 2 }}
            >
              عرض التفاصيل ←
            </motion.div>
          </div>
          <div className="h-36">
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
                <Tooltip 
                  formatter={(value) => [`${value}K`, 'الإيرادات']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px'
                  }}
                  cursor={{ stroke: '#e85a4f', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#e85a4f" 
                  strokeWidth={2} 
                  fill="url(#colorRevenue)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-100">
            {[
              { value: '+22%', label: 'النمو', color: 'text-green-600' },
              { value: formatCurrency(stats?.monthlyRevenue || 0), label: 'الإيرادات', color: 'text-blue-600' },
              { value: stats?.activeContracts || 0, label: 'العقود', color: 'text-purple-600' },
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="text-center cursor-pointer hover:bg-neutral-50 rounded-lg p-1 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.p 
                  className={`text-sm font-bold ${item.color}`}
                  key={String(item.value)}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {item.value}
                </motion.p>
                <p className="text-[9px] text-neutral-500">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Interactive Fleet Status Card */}
        <motion.div 
          className="col-span-3 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-neutral-900 text-sm">حالة الأسطول</h3>
            <motion.span 
              className="px-2 py-0.5 bg-coral-500 text-white rounded-full text-[9px] font-semibold cursor-pointer"
              whileHover={{ scale: 1.1 }}
              onClick={() => navigate('/fleet')}
            >
              {occupancyRate}%
            </motion.span>
          </div>
          <div className="h-28 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
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
                        filter: activeFleetIndex === index ? 'brightness(1.2) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                        transform: activeFleetIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: 'all 0.2s ease'
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
                        className="bg-white px-3 py-2 rounded-lg shadow-lg border border-neutral-100"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <p className="font-semibold text-sm text-neutral-900">{data.name}</p>
                        <p className="text-neutral-600 text-xs">{data.value} مركبة</p>
                        <p className="text-[9px] text-coral-500 mt-1">انقر للتصفية ←</p>
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
              <p className="text-xl font-bold text-neutral-900">{totalVehicles}</p>
              <p className="text-[9px] text-neutral-400">إجمالي</p>
            </motion.div>
          </div>
          {/* Interactive Legend */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {fleetChartData.map((item, index) => (
              <motion.div 
                key={item.name} 
                className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer transition-all",
                  activeFleetIndex === index ? 'bg-neutral-100 ring-1 ring-neutral-200' : 'bg-neutral-50 hover:bg-neutral-100'
                )}
                onClick={() => navigate(`/fleet?status=${item.name}`)}
                onMouseEnter={() => setActiveFleetIndex(index)}
                onMouseLeave={() => setActiveFleetIndex(null)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                  animate={{ scale: activeFleetIndex === index ? 1.3 : 1 }}
                />
                <div>
                  <p className="text-[10px] font-bold text-neutral-900">{item.value}</p>
                  <p className="text-[8px] text-neutral-400">{item.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Interactive Maintenance Schedule Card */}
        <motion.div 
          className="col-span-4 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-neutral-900 text-sm">جدول الصيانة</h3>
            <motion.span 
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-semibold cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/fleet/maintenance')}
            >
              <Clock className="w-2.5 h-2.5" />
              {maintenanceData?.length || 0} قريباً
            </motion.span>
          </div>
          <div className="space-y-1.5">
            {maintenanceData && maintenanceData.length > 0 ? (
              maintenanceData.slice(0, 3).map((item: any, index: number) => (
                <motion.div 
                  key={item.id} 
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border-r-2 cursor-pointer group',
                    index === 0 ? 'bg-red-50 border-red-500 hover:bg-red-100' : 'bg-amber-50 border-amber-500 hover:bg-amber-100'
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/fleet/maintenance`)}
                >
                  <motion.div
                    animate={index === 0 ? { rotate: [0, 5, -5, 0] } : {}}
                    transition={{ repeat: index === 0 ? Infinity : 0, duration: 2, repeatDelay: 1 }}
                  >
                    {index === 0 ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-neutral-900">
                      {item.vehicles?.plate_number || 'غير محدد'}
                    </p>
                    <p className="text-[9px] text-neutral-500">{item.maintenance_type}</p>
                  </div>
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ x: -5 }}
                    animate={{ x: 0 }}
                  >
                    <ChevronLeft className="w-3 h-3 text-neutral-400" />
                  </motion.div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                className="text-center py-4 text-neutral-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد صيانات</p>
              </motion.div>
            )}
          </div>
          <motion.button 
            className="w-full mt-2 py-1.5 text-[10px] font-semibold text-coral-600 bg-coral-50 rounded-lg hover:bg-coral-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/fleet/maintenance')}
          >
            عرض الكل ({maintenanceData?.length || 0})
          </motion.button>
        </motion.div>

        {/* Interactive Reservations Calendar Card */}
        <motion.div 
          className="col-span-4 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">تقويم الحجوزات</h3>
            <motion.button 
              className="text-[10px] text-coral-600 font-medium flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/fleet/reservations')}
            >
              <Calendar className="w-3 h-3" />
              عرض
            </motion.button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day) => (
              <span key={day} className="text-[8px] text-neutral-400">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <motion.div
                key={index}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all',
                  day.isToday
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : day.occupancy > 80
                    ? 'bg-red-50 border border-red-200 hover:border-red-400 hover:bg-red-100'
                    : day.occupancy > 60
                    ? 'bg-orange-50 border border-orange-200 hover:border-orange-400 hover:bg-orange-100'
                    : 'bg-green-50 border border-green-200 hover:border-green-400 hover:bg-green-100'
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.15, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const targetDate = new Date();
                  targetDate.setDate(today.getDate() + index);
                  navigate(`/fleet/reservations?date=${targetDate.toISOString().split('T')[0]}`);
                }}
              >
                <span className={cn('text-[10px] font-semibold', day.isToday ? 'text-blue-700' : 'text-neutral-700')}>
                  {day.day}
                </span>
                <span className={cn('text-[7px]', day.isToday ? 'text-blue-600' : 'text-neutral-500')}>
                  {day.isToday ? 'اليوم' : `${day.occupancy}%`}
                </span>
              </motion.div>
            ))}
          </div>
          <motion.div 
            className="mt-2 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            whileHover={{ scale: 1.01 }}
            onClick={() => navigate('/fleet/reservations')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-900">ملخص الأسبوع</span>
              <span className="text-[8px] text-neutral-400">{dayNumber}-{dayNumber + 6} {gregorianDate.split(' ')[0]}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="text-center">
                <motion.p 
                  className="text-sm font-bold text-blue-600"
                  key={occupancyRate}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {occupancyRate}%
                </motion.p>
                <p className="text-[8px] text-neutral-500">الإشغال</p>
              </div>
              <div className="text-center">
                <motion.p 
                  className="text-sm font-bold text-green-600"
                  key={stats?.activeContracts}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {stats?.activeContracts || 0}
                </motion.p>
                <p className="text-[8px] text-neutral-500">عقود</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Interactive Revenue Forecast Card */}
        <motion.div 
          className="col-span-4 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate('/finance')}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">توقعات الإيرادات</h3>
            <motion.div 
              className="w-7 h-7 bg-coral-100 rounded-lg flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
            >
              <Brain className="w-3.5 h-3.5 text-coral-600" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-neutral-500">الشهر الحالي</span>
                <motion.span 
                  className="text-[11px] font-bold text-neutral-900"
                  key={stats?.monthlyRevenue}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {formatCurrency(stats?.monthlyRevenue || 0)}
                </motion.span>
              </div>
              <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full bg-coral-500" 
                  initial={{ width: 0 }}
                  animate={{ width: '80%' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-neutral-500">توقع الشهر القادم</span>
                <motion.span 
                  className="text-[11px] font-bold text-green-600"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {formatCurrency((stats?.monthlyRevenue || 0) * 1.22)}
                </motion.span>
              </div>
              <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full bg-green-500" 
                  initial={{ width: 0 }}
                  animate={{ width: '97%' }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
              </div>
            </div>
          </div>
          <motion.div 
            className="mt-3 p-2 bg-coral-50 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-[10px] font-semibold text-neutral-900 mb-1">العوامل المؤثرة:</p>
            <div className="space-y-0.5">
              {[
                { icon: ArrowUp, color: 'text-green-500', text: 'العامل الموسمي (+8%)' },
                { icon: ArrowUp, color: 'text-green-500', text: 'عقود جديدة (+12%)' },
                { icon: TrendingDown, color: 'text-red-500', text: 'تأثير الصيانة (-2%)' },
              ].map((factor, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <factor.icon className={`w-2.5 h-2.5 ${factor.color}`} />
                  <span className="text-[9px] text-neutral-600">{factor.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Interactive Recent Activities Card */}
        <motion.div 
          className="col-span-4 bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 text-sm">النشاطات الأخيرة</h3>
            <motion.button 
              className="text-[10px] text-coral-600 font-medium"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/reports')}
            >
              عرض الكل
            </motion.button>
          </div>
          <div className="space-y-2">
            <motion.div 
              className="text-center py-4 text-neutral-400"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              </motion.div>
              <p className="text-sm">لا توجد نشاطات حديثة</p>
              <motion.button
                className="mt-2 text-[10px] text-coral-500 font-medium hover:text-coral-600"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/contracts')}
              >
                ابدأ بإنشاء عقد جديد ←
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Contract Wizard */}
      <ContractWizard
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
      />
    </div>
  );
};

export default BentoDashboard;
