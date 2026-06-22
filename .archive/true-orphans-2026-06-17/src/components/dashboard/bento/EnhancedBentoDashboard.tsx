import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { SkeletonMetrics, SkeletonWidget } from '@/components/loaders';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { Sparkline } from './Sparkline';
import { DashboardCustomizer, getDashboardSettings } from '../customization/DashboardCustomizer';
import { HierarchicalDashboard } from '../customization/HierarchicalDashboard';
import { SmartInsights } from '../customization/SmartInsights';
import { OptimizedDashboard } from '../customization/OptimizedDashboard';
import { MobileOptimizedDashboard } from '../customization/MobileOptimizedDashboard';
import MobileEnhancedDashboard from '../customization/MobileEnhancements';
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
  Settings,
  Grid3x3,
  BarChart3,
  Smartphone,
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

// وضع عرض لوحة التحكم
enum DashboardMode {
  STANDARD = 'standard',
  HIERARCHICAL = 'hierarchical',
  OPTIMIZED = 'optimized',
  MOBILE = 'mobile'
}

// FAB Menu Component
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
            isOpen ? 'bg-neutral-900' : 'bg-rose-500 hover:bg-coral-600'
          )}
          style={{ boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(232, 90, 79, 0.4)' }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </>
  );
};

// Main Enhanced Dashboard Component
const EnhancedBentoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const [fabOpen, setFabOpen] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [activeFleetIndex, setActiveFleetIndex] = useState<number | null>(null);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>(DashboardMode.STANDARD);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState(getDashboardSettings());
  
  // تحميل إعدادات لوحة التحكم من التخزين المحلي
  useEffect(() => {
    try {
      const settings = getDashboardSettings();
      setDashboardSettings(settings);
      
      // تحديد وضع العرض بناءً على إعدادات المستخدم
      if (settings.compactMode) {
        setDashboardMode(DashboardMode.OPTIMIZED);
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
    }
  }, []);
  
  // تحديث إعدادات لوحة التحكم
  const handleSettingsChange = (newSettings: typeof dashboardSettings) => {
    setDashboardSettings(newSettings);
    
    // تحديث وضع العرض بناءً على الإعدادات الجديدة
    if (newSettings.compactMode) {
      setDashboardMode(DashboardMode.OPTIMIZED);
    } else {
      setDashboardMode(DashboardMode.STANDARD);
    }
  };
  
  // Fleet Status Query
  const { data: fleetStatus, isLoading: fleetLoading } = useQuery({
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

  // Check if mobile device
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  };

  // Render based on dashboard mode
  if (isMobile() || dashboardMode === DashboardMode.MOBILE) {
    return <MobileEnhancedDashboard />;
  }

  if (dashboardMode === DashboardMode.HIERARCHICAL) {
    return (
      <div className="min-h-screen bg-neutral-150 p-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-neutral-900">لوحة التحكم الهرمية</h1>
          <button
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            تخصيص
          </button>
        </div>
        <HierarchicalDashboard />
        <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} onActionSelect={handleActionSelect} />
        <DashboardCustomizer
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          onSettingsChange={handleSettingsChange}
          currentSettings={dashboardSettings}
        />
      </div>
    );
  }

  if (dashboardMode === DashboardMode.OPTIMIZED) {
    return (
      <div className="min-h-screen bg-neutral-150 p-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-neutral-900">لوحة التحكم المحسّنة</h1>
          <button
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            تخصيص
          </button>
        </div>
        <OptimizedDashboard />
        <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(!fabOpen)} onActionSelect={handleActionSelect} />
        <DashboardCustomizer
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          onSettingsChange={handleSettingsChange}
          currentSettings={dashboardSettings}
        />
      </div>
    );
  }

  // Default standard dashboard
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
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors"
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
              className="w-64 px-4 py-2.5 pr-10 bg-white rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          
          <div className="bg-white rounded-xl border border-neutral-200">
            <UnifiedNotificationBell />
          </div>
        </div>
      </header>

      {/* Dashboard Mode Selector */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2 p-1 bg-white rounded-lg border border-neutral-200">
          <button
            onClick={() => setDashboardMode(DashboardMode.STANDARD)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
              dashboardMode === DashboardMode.STANDARD ? "bg-rose-100 text-coral-700" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Grid3x3 className="w-4 h-4" />
            قياسي
          </button>
          <button
            onClick={() => setDashboardMode(DashboardMode.HIERARCHICAL)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
              dashboardMode === DashboardMode.HIERARCHICAL ? "bg-rose-100 text-coral-700" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            هرمي
          </button>
          <button
            onClick={() => setDashboardMode(DashboardMode.OPTIMIZED)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
              dashboardMode === DashboardMode.OPTIMIZED ? "bg-rose-100 text-coral-700" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            محسن
          </button>
          <button
            onClick={() => setShowCustomizer(true)}
            className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            تخصيص
          </button>
        </div>
      </div>

      {/* Smart Insights Section */}
      <div className="mb-6">
        <SmartInsights />
      </div>

      {/* Bento Grid - Static Layout */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Stats Row - 4 Interactive cards */}
        {statsLoading ? (
          <div className="col-span-12">
            <SkeletonMetrics count={4} columns={{ sm: 2, md: 2, lg: 4 }} />
          </div>
        ) : (
          <>
            {dashboardSettings.widgets.stats.visible && (
              <div className={cn("col-span-3", dashboardSettings.layout === 'compact' ? 'col-span-6' : 'col-span-3')}>
                <motion.div
                  className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer"
                  onClick={() => navigate('/fleet')}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-100 text-coral-600">
                      <Car className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">إجمالي المركبات</p>
                  <p className="text-[1.75rem] font-bold text-neutral-900 leading-none mb-2">
                    {stats?.totalVehicles || 0}
                  </p>
                  <div className="mt-auto">
                    <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-rose-500" 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats?.vehicleActivityRate || 85}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {dashboardSettings.widgets.performanceChart.visible && (
              <div className={cn("col-span-3", dashboardSettings.layout === 'compact' ? 'col-span-6' : 'col-span-3')}>
                <motion.div
                  className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer"
                  onClick={() => navigate('/contracts')}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">العقود النشطة</p>
                  <p className="text-[1.75rem] font-bold text-neutral-900 leading-none mb-2">
                    {stats?.activeContracts || 0}
                  </p>
                  <div className="mt-auto">
                    <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-blue-500" 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats?.contractCompletionRate || 78}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {dashboardSettings.widgets.fleetStatus.visible && (
              <div className={cn("col-span-3", dashboardSettings.layout === 'compact' ? 'col-span-6' : 'col-span-3')}>
                <motion.div
                  className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer"
                  onClick={() => navigate('/customers')}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">إجمالي العملاء</p>
                  <p className="text-[1.75rem] font-bold text-neutral-900 leading-none mb-2">
                    {stats?.totalCustomers || 0}
                  </p>
                  <div className="mt-auto">
                    <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-green-500" 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats?.customerSatisfactionRate || 92}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {dashboardSettings.widgets.revenueForecast.visible && (
              <div className={cn("col-span-3", dashboardSettings.layout === 'compact' ? 'col-span-6' : 'col-span-3')}>
                <motion.div
                  className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col group cursor-pointer"
                  onClick={() => navigate('/finance')}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                      <Banknote className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">إيرادات الشهر</p>
                  <p className="text-[1.75rem] font-bold text-neutral-900 leading-none mb-2">
                    {formatCurrency(stats?.monthlyRevenue || 0)}
                  </p>
                  <div className="mt-auto">
                    <div className="h-[5px] bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-amber-500" 
                        initial={{ width: 0 }}
                        animate={{ width: '70%' }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}

        {/* Interactive Financial Performance Chart */}
        {dashboardSettings.widgets.performanceChart.visible && (
          <motion.div 
            className={cn(
              "bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-shadow cursor-pointer",
              dashboardSettings.layout === 'compact' ? 'col-span-12' : 'col-span-5'
            )}
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
                  <p className={`text-sm font-bold ${item.color}`}>
                    {item.value}
                  </p>
                  <p className="text-[9px] text-neutral-500">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Customizer Button */}
        <div className="col-span-12 flex justify-center mt-4">
          <button
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-coral-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            تخصيص لوحة التحكم
          </button>
        </div>
      </div>

      {/* Contract Wizard - الموحد مع صفحة العقود */}
      <SimpleContractWizard
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
      />
      
      {/* Dashboard Customizer */}
      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSettingsChange={handleSettingsChange}
        currentSettings={dashboardSettings}
      />
    </div>
  );
};

export default EnhancedBentoDashboard;
