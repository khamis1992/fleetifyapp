import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useModuleConfig } from '@/modules/core/hooks';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useStableCompanyId } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAIChat } from '@/contexts/AIChatContext';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
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
  ChevronLeft,
  ExternalLink,
  Activity,
  Zap,
  Target,
  Bell,
  Settings,
  MapPin,
  Briefcase,
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

// Import Cairo font for Arabic
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';

const DashboardLanding: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useModuleConfig();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { openChat: openAIChat } = useAIChat();
  const [mounted, setMounted] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [activeFleetIndex, setActiveFleetIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    console.log('Current user email:', user?.email);
    console.log('Email check result:', user?.email?.toLowerCase().trim() === 'khamis-1992@hotmail.com');
    console.log('Email after transform:', user?.email?.toLowerCase().trim());
  }, [user]);

  // CRITICAL FIX: Use stable company ID from CompanyContext (persists across navigation)
  const rawCompanyId = user?.profile?.company_id || user?.company?.id;
  const contextStableId = useStableCompanyId();
  const stableCompanyIdRef = useRef<string | null>(null);
  if (rawCompanyId) stableCompanyIdRef.current = rawCompanyId;
  const companyId = rawCompanyId || contextStableId || stableCompanyIdRef.current;
  const isReady = !!companyId;

  // Fleet Status Query
  const { data: fleetStatus, isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet-status-landing', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', companyId)
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
    enabled: isReady,
    placeholderData: (prev: any) => prev,
  });

  // Maintenance Query
  const { data: maintenanceData } = useQuery({
    queryKey: ['maintenance-landing', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, scheduled_date, status, vehicles(plate_number)')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: isReady,
    placeholderData: (prev: any) => prev,
  });

  // Revenue Chart Data
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart-landing', companyId],
    queryFn: async () => {
      if (!companyId) return [];
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
          .eq('company_id', companyId)
          .eq('status', 'active')
          .lte('start_date', monthEnd.toISOString().split('T')[0]);

        const total = data?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
        results.push({ name: months[date.getMonth()], value: Math.round(total / 1000) });
      }
      return results;
    },
    enabled: isReady,
    placeholderData: (prev: any) => prev,
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
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: '#0d9488' },
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

  // FAB Menu Component
  const FABMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const actions = [
      { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, color: 'from-emerald-400 to-emerald-600' },
      { id: 'contract', label: 'إنشاء عقد', icon: FilePlus, color: 'from-teal-400 to-teal-600' },
      { id: 'search', label: 'البحث', icon: Search, color: 'from-amber-400 to-amber-600' },
      { id: 'purchase', label: 'أمر شراء', icon: ShoppingCart, color: 'from-blue-400 to-blue-600' },
    ];

    const handleAction = (actionId: string) => {
      onClose();
      handleActionSelect(actionId);
    };

    return (
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
                  className="group flex items-center gap-3 px-5 py-3.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:translate-x-1 min-w-[180px] border border-slate-100"
                >
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', action.color)}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFabOpen(!fabOpen)}
          animate={{ rotate: isOpen ? 135 : 0, scale: isOpen ? 1.05 : 1 }}
          whileHover={{ scale: isOpen ? 1.05 : 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all',
            isOpen ? 'bg-slate-900' : 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30'
          )}
        >
          <Plus className="w-7 h-7 text-white" strokeWidth={3} />
        </motion.button>
      </div>
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  // Animated counter component
  const AnimatedCounter: React.FC<{ value: number | string; suffix?: string; prefix?: string }> = ({ value, suffix = '', prefix = '' }) => {
    const [count, setCount] = useState(0);
    const numValue = typeof value === 'number' ? value : parseFloat(value.replace(/[^\d.-]/g, '')) || 0;

    useEffect(() => {
      const duration = 1500;
      const steps = 50;
      const stepValue = numValue / steps;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        if (currentStep <= steps) {
          setCount(Math.floor(stepValue * currentStep));
        } else {
          setCount(numValue);
        }
        if (currentStep >= steps) clearInterval(timer);
      }, stepDuration);

      return () => clearInterval(timer);
    }, [numValue]);

    return (
      <span>
        {prefix}
        {typeof value === 'number' ? count.toLocaleString('ar-QA') : value}
        {suffix}
      </span>
    );
  };

  // Quick stats data
  const statsCards = [
    {
      title: 'إجمالي المركبات',
      value: stats?.totalVehicles || 0,
      change: stats?.vehiclesChange,
      icon: Car,
      color: 'from-teal-400 to-teal-600',
      bgColor: 'bg-teal-50',
      progressLabel: 'نشاط المركبات',
      progressValue: stats?.vehicleActivityRate || 85,
      linkTo: '/fleet',
      sparklineData: revenueData?.map(item => item.value) || [],
    },
    {
      title: 'العقود النشطة',
      value: stats?.activeContracts || 0,
      change: stats?.contractsChange,
      icon: FileText,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      progressLabel: 'معدل الإكمال',
      progressValue: stats?.contractCompletionRate || 78,
      linkTo: '/contracts',
      sparklineData: revenueData?.map(item => item.value) || [],
    },
    {
      title: 'إجمالي العملاء',
      value: stats?.totalCustomers || 0,
      change: stats?.customersChange,
      icon: Users,
      color: 'from-emerald-400 to-emerald-600',
      bgColor: 'bg-emerald-50',
      progressLabel: 'رضا العملاء',
      progressValue: stats?.customerSatisfactionRate || 92,
      linkTo: '/customers',
      sparklineData: revenueData?.map(item => item.value) || [],
    },
    {
      title: 'إيرادات الشهر',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      change: stats?.revenueChange,
      icon: Banknote,
      color: 'from-amber-400 to-amber-600',
      bgColor: 'bg-amber-50',
      linkTo: '/finance',
      sparklineData: revenueData?.map(item => item.value) || [],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30" dir="rtl">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-400/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-[80px]" />
      </div>

      {/* Landing Page Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Activity className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight" style={{ fontFamily: 'Cairo, sans-serif' }}>لوحة التحكم</h1>
                  <p className="text-xs text-slate-500">{company?.name || 'العُراف لتأجير السيارات'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-px bg-slate-200" />

              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-slate-900 text-lg">{dayNumber}</span>
                <span className="text-slate-600">{dayName}</span>
                <span className="text-slate-400">{gregorianDate}</span>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث..."
                  className="w-64 pl-4 pr-10 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 border border-transparent focus:border-teal-500/30 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* My Workspace Button */}
              <motion.button
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg transition-all shadow-md shadow-emerald-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/employee-workspace')}
              >
                <Briefcase className="w-4 h-4" />
                <span>مساحة عملي</span>
              </motion.button>

              {/* Team Management Button - Visible only to specific user */}
              {(user?.email && (user.email.includes('khamis-1992@hotmail.com') || user.email === 'khamis-1992@hotmail.com')) && (
                <motion.button
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg transition-all shadow-md shadow-indigo-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/team-management')}
                >
                  <Users className="w-4 h-4" />
                  <span>إدارة الفريق</span>
                </motion.button>
              )}

              <motion.button
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-teal-700 hover:shadow-lg transition-all shadow-md shadow-teal-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAIChat()}
              >
                <Brain className="w-4 h-4" />
                <span>مساعد AI</span>
              </motion.button>

              <UnifiedNotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
        >
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              const changeStr = String(stat.change || '');
              const isPositive = changeStr.includes('+') || (typeof stat.change === 'number' && stat.change > 0);

              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => stat.linkTo && navigate(stat.linkTo)}
                  className="relative group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-teal-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 hover:border-teal-500/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-teal-500/10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                      </div>
                      {stat.change && (
                        <motion.span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm',
                            isPositive
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          )}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", delay: 0.3 }}
                        >
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {changeStr}
                        </motion.span>
                      )}
                    </div>

                    <h3 className="text-slate-500 text-sm mb-2 font-semibold">{stat.title}</h3>
                    <p className="text-3xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      <AnimatedCounter value={stat.value} />
                    </p>

                    {stat.progressLabel && stat.progressValue && (
                      <div className="mt-auto">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                          <span className="font-medium">{stat.progressLabel}</span>
                          <span className="font-bold text-teal-600">{stat.progressValue}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full bg-gradient-to-r shadow-inner', stat.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.progressValue}%` }}
                            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.4 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">

            {/* Financial Performance Chart */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="col-span-5 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 transition-all cursor-pointer"
              onClick={() => navigate('/finance')}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Cairo, sans-serif' }}>الأداء المالي</h3>
                  <p className="text-sm text-slate-500 font-medium">تحليل الإيرادات الشهرية</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="h-52 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
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
                      cursor={{ stroke: '#0d9488', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0d9488"
                      strokeWidth={3}
                      fill="url(#colorRevenue)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                {[
                  { value: '+22%', label: 'معدل النمو', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { value: formatCurrency(stats?.monthlyRevenue || 0), label: 'الإيرادات', color: 'text-teal-600', bg: 'bg-teal-50' },
                  { value: stats?.activeContracts || 0, label: 'العقود', color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className={cn('text-center p-3 rounded-2xl', item.bg)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.p
                      className={`text-lg font-bold ${item.color}`}
                      key={String(item.value)}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      {item.value}
                    </motion.p>
                    <p className="text-xs text-slate-600 font-semibold uppercase">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Fleet Status */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="col-span-3 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Cairo, sans-serif' }}>حالة الأسطول</h3>
                  <p className="text-sm text-slate-500">توزيع المركبات</p>
                </div>
                <motion.span
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/30 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/fleet')}
                >
                  {occupancyRate}% مستغل
                </motion.span>
              </div>

              <div className="h-44 relative flex items-center justify-center mb-4">
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
                          <div className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100">
                            <p className="font-bold text-sm text-slate-900">{data.name}</p>
                            <p className="text-slate-600 text-xs mt-1">{data.value} مركبة</p>
                          </div>
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
                  <p className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Cairo, sans-serif' }}>{totalVehicles}</p>
                  <p className="text-xs text-slate-400 font-semibold uppercase">إجمالي</p>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {fleetChartData.map((item, index) => (
                  <motion.div
                    key={item.name}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                      activeFleetIndex === index
                        ? 'bg-slate-100 ring-2 ring-teal-500'
                        : 'bg-slate-50 hover:bg-slate-100'
                    )}
                    onClick={() => navigate(`/fleet?status=${item.name}`)}
                    onMouseEnter={() => setActiveFleetIndex(index)}
                    onMouseLeave={() => setActiveFleetIndex(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: item.color }}
                      animate={{ scale: activeFleetIndex === index ? 1.3 : 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Maintenance Schedule */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="col-span-4 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Cairo, sans-serif' }}>جدول الصيانة</h3>
                  <p className="text-sm text-slate-500">الصيانات القادمة</p>
                </div>
                <motion.span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/30 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/fleet/maintenance')}
                >
                  <Clock className="w-4 h-4" />
                  {maintenanceData?.length || 0} قريباً
                </motion.span>
              </div>

              <div className="space-y-3">
                {maintenanceData && maintenanceData.length > 0 ? (
                  maintenanceData.slice(0, 4).map((item: any, index: number) => (
                    <motion.div
                      key={item.id}
                      className={cn(
                        'group flex items-center gap-3 p-4 rounded-xl border-r-4 cursor-pointer transition-all',
                        index === 0
                          ? 'bg-red-50 border-red-500 hover:bg-red-100'
                          : 'bg-amber-50 border-amber-500 hover:bg-amber-100'
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
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
                        <p className="text-sm font-bold text-slate-900">
                          {item.vehicles?.plate_number || 'غير محدد'}
                        </p>
                        <p className="text-xs text-slate-600">{item.maintenance_type}</p>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">لا توجد صيانات</p>
                  </div>
                )}
              </div>

              <motion.button
                className="w-full mt-4 py-3 text-sm font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/fleet/maintenance')}
              >
                عرض الكل ({maintenanceData?.length || 0})
              </motion.button>
            </motion.div>

            {/* Reservations Calendar */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="col-span-4 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Cairo, sans-serif' }}>تقويم الحجوزات</h3>
                  <p className="text-sm text-slate-500">الأسبوع القادم</p>
                </div>
                <motion.button
                  className="p-2.5 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                  whileHover={{ rotate: 15 }}
                  onClick={() => navigate('/fleet/reservations')}
                >
                  <Calendar className="w-5 h-5 text-teal-600" />
                </motion.button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day) => (
                  <span key={day} className="text-xs text-slate-500 font-semibold uppercase">{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      'aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm',
                      day.isToday
                        ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30'
                        : day.occupancy > 80
                        ? 'bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100'
                        : day.occupancy > 60
                        ? 'bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-100'
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
                    <span className={cn('text-sm font-bold', day.isToday ? 'text-white' : 'text-slate-700')}>
                      {day.day}
                    </span>
                    <span className={cn('text-xs font-bold', day.isToday ? 'text-white/80' : 'text-slate-500')}>
                      {day.isToday ? 'اليوم' : `${day.occupancy}%`}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl cursor-pointer hover:from-blue-100 hover:to-teal-100 transition-all"
                whileHover={{ scale: 1.02 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/fleet/reservations');
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-900">ملخص الأسبوع</span>
                  <span className="text-xs text-slate-500">
                    {dayNumber}-{dayNumber + 6} {gregorianDate.split(' ')[0]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <motion.p
                      className="text-2xl font-bold text-teal-600"
                      key={occupancyRate}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      {occupancyRate}%
                    </motion.p>
                    <p className="text-xs text-slate-600 font-semibold uppercase">الإشغال</p>
                  </div>
                  <div className="text-center">
                    <motion.p
                      className="text-2xl font-bold text-emerald-600"
                      key={stats?.activeContracts}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      {stats?.activeContracts || 0}
                    </motion.p>
                    <p className="text-xs text-slate-600 font-semibold uppercase">عقود</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Revenue Forecast */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="col-span-4 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Cairo, sans-serif' }}>توقعات الإيرادات</h3>
                  <p className="text-sm text-slate-500">تحليل ذكي باستخدام AI</p>
                </div>
                <motion.div
                  className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, repeatDelay: 2 }}
                >
                  <Brain className="w-6 h-6 text-white" />
                </motion.div>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 font-semibold">الشهر الحالي</span>
                    <motion.span
                      className="text-sm font-bold text-slate-900"
                      key={stats?.monthlyRevenue}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {formatCurrency(stats?.monthlyRevenue || 0)}
                    </motion.span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 shadow-inner"
                      initial={{ width: 0 }}
                      animate={{ width: '80%' }}
                      transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 font-semibold">توقع الشهر القادم</span>
                    <motion.span
                      className="text-sm font-bold text-emerald-600"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {formatCurrency((stats?.monthlyRevenue || 0) * 1.22)}
                    </motion.span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
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
                className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-600" />
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
                      <span className="text-sm font-semibold text-slate-700">{factor.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

          </div>

        </motion.div>
      </div>

      {/* FAB Menu */}
      <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} />

      {/* Contract Wizard Modal */}
      <AnimatePresence>
        {showContractWizard && (
          <SimpleContractWizard
            isOpen={showContractWizard}
            onClose={() => setShowContractWizard(false)}
            onSuccess={() => {
              setShowContractWizard(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLanding;
