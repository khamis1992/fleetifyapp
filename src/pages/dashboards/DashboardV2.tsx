// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Users,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Calendar,
  Bell,
  Settings,
  Search,
  Sun,
  Moon,
  Zap,
  Target,
  Activity,
  PieChart,
  BarChart3,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  CircleDollarSign,
  Gauge,
  Shield,
  Star,
  Flame,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Animated Background Component
const AnimatedBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {/* Gradient Orbs */}
    <motion.div
      className={cn(
        "absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-30",
        isDark ? "bg-violet-600" : "bg-violet-300"
      )}
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ top: '-10%', right: '-10%' }}
    />
    <motion.div
      className={cn(
        "absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-cyan-600" : "bg-cyan-300"
      )}
      animate={{
        x: [0, -50, 0],
        y: [0, 100, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      style={{ bottom: '-5%', left: '-5%' }}
    />
    <motion.div
      className={cn(
        "absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-amber-600" : "bg-amber-300"
      )}
      animate={{
        x: [0, 80, 0],
        y: [0, -80, 0],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      style={{ top: '40%', left: '30%' }}
    />
    
    {/* Grid Pattern */}
    <div 
      className={cn(
        "absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]",
        "bg-[size:24px_24px]"
      )}
    />
  </div>
);

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  delay?: number;
  isDark: boolean;
}> = ({ title, value, change, icon, trend, color, delay = 0, isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.02, y: -4 }}
    className={cn(
      "relative overflow-hidden rounded-2xl p-6",
      "backdrop-blur-xl border",
      isDark 
        ? "bg-gray-900/60 border-gray-800/50" 
        : "bg-white/80 border-gray-200/50",
      "shadow-xl"
    )}
  >
    {/* Glow Effect */}
    <div 
      className={cn("absolute inset-0 opacity-10 blur-2xl", color)}
      style={{ background: `radial-gradient(circle at 30% 30%, currentColor, transparent)` }}
    />
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl",
          isDark ? "bg-gray-800/80" : "bg-gray-100",
          color
        )}>
          {icon}
        </div>
        {change && (
          <Badge 
            variant="outline" 
            className={cn(
              "font-medium text-xs",
              trend === 'up' && "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
              trend === 'down' && "text-rose-500 border-rose-500/30 bg-rose-500/10",
              trend === 'neutral' && "text-gray-500 border-gray-500/30 bg-gray-500/10"
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3 ml-1" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 ml-1" />}
            {change}
          </Badge>
        )}
      </div>
      
      <h3 className={cn(
        "text-sm font-medium mb-1",
        isDark ? "text-gray-400" : "text-gray-600"
      )}>
        {title}
      </h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
        className={cn(
          "text-3xl font-bold tracking-tight",
          isDark ? "text-white" : "text-gray-900"
        )}
      >
        {value}
      </motion.p>
    </div>
  </motion.div>
);

// Quick Action Button
const QuickAction: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  isDark: boolean;
}> = ({ title, icon, color, onClick, isDark }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-2 p-4 rounded-2xl",
      "transition-all duration-300",
      isDark 
        ? "bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800/50" 
        : "bg-white/80 hover:bg-white border border-gray-200/50",
      "backdrop-blur-xl shadow-lg"
    )}
  >
    <div className={cn("p-3 rounded-xl", color)}>
      {icon}
    </div>
    <span className={cn(
      "text-xs font-medium",
      isDark ? "text-gray-300" : "text-gray-700"
    )}>
      {title}
    </span>
  </motion.button>
);

// Activity Item Component
const ActivityItem: React.FC<{
  title: string;
  subtitle: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  isDark: boolean;
}> = ({ title, subtitle, time, type, isDark }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={cn(
      "flex items-center gap-4 p-3 rounded-xl",
      isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-100/80",
      "transition-colors duration-200"
    )}
  >
    <div className={cn(
      "w-2 h-2 rounded-full",
      type === 'success' && "bg-emerald-500",
      type === 'warning' && "bg-amber-500",
      type === 'info' && "bg-blue-500"
    )} />
    <div className="flex-1 min-w-0">
      <p className={cn(
        "text-sm font-medium truncate",
        isDark ? "text-white" : "text-gray-900"
      )}>
        {title}
      </p>
      <p className={cn(
        "text-xs truncate",
        isDark ? "text-gray-400" : "text-gray-500"
      )}>
        {subtitle}
      </p>
    </div>
    <span className={cn(
      "text-xs whitespace-nowrap",
      isDark ? "text-gray-500" : "text-gray-400"
    )}>
      {time}
    </span>
  </motion.div>
);

// Main Dashboard Component
const DashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId, browsedCompany } = useUnifiedCompanyAccess();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  const [isDark, setIsDark] = useState(true);

  // Fetch recent contracts
  const { data: recentContracts } = useQuery({
    queryKey: ['recent-contracts-v2', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('contracts')
        .select(`
          id, 
          contract_number, 
          status, 
          monthly_amount, 
          created_at,
          customer:customers!customer_id(first_name, last_name, company_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch fleet status
  const { data: fleetStatus } = useQuery({
    queryKey: ['fleet-status-v2', companyId],
    queryFn: async () => {
      if (!companyId) return { available: 0, rented: 0, maintenance: 0 };
      const { data } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      const counts = { available: 0, rented: 0, maintenance: 0, reserved: 0 };
      data?.forEach((v) => {
        const status = v.status || 'available';
        if (counts[status] !== undefined) counts[status]++;
      });
      return counts;
    },
    enabled: !!companyId,
  });

  // Fetch monthly revenue data
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart-v2', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const currentMonth = new Date().getMonth();
      
      // Generate last 6 months of data
      return Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth - 5 + i + 12) % 12;
        const baseRevenue = stats?.monthlyRevenue || 100000;
        const variance = Math.random() * 0.4 - 0.2; // -20% to +20%
        return {
          month: months[monthIndex],
          revenue: Math.round(baseRevenue * (0.7 + i * 0.1 + variance)),
          contracts: Math.round(10 + Math.random() * 20),
        };
      });
    },
    enabled: !!companyId && !!stats,
  });

  // Fleet pie chart data
  const fleetChartData = useMemo(() => [
    { name: 'متاح', value: fleetStatus?.available || 0, color: '#22c55e' },
    { name: 'مؤجر', value: fleetStatus?.rented || 0, color: '#f43f5e' },
    { name: 'صيانة', value: fleetStatus?.maintenance || 0, color: '#f59e0b' },
    { name: 'محجوز', value: fleetStatus?.reserved || 0, color: '#3b82f6' },
  ], [fleetStatus]);

  const totalVehicles = Object.values(fleetStatus || {}).reduce((a, b) => a + b, 0);
  const occupancyRate = totalVehicles > 0 
    ? Math.round(((fleetStatus?.rented || 0) / totalVehicles) * 100) 
    : 0;

  const getTrend = (change: string) => {
    if (!change) return 'neutral';
    return change.startsWith('+') ? 'up' : change.startsWith('-') ? 'down' : 'neutral';
  };

  const getCustomerName = (customer: any) => {
    if (!customer) return 'غير محدد';
    if (customer.company_name) return customer.company_name;
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير محدد';
  };

  if (statsLoading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        isDark ? "bg-gray-950" : "bg-gray-50"
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      isDark ? "bg-gray-950" : "bg-gray-50"
    )}>
      <AnimatedBackground isDark={isDark} />
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full blur-lg opacity-50" />
                <div className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-gradient-to-r from-violet-500 to-cyan-500"
                )}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  مرحباً، {user?.profile?.full_name?.split(' ')[0] || 'مستخدم'}
                </h1>
                <p className={cn(
                  "text-sm",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  لوحة تحكم النظام V2 • {browsedCompany?.name || 'شركة العراف'}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDark(!isDark)}
              className={cn(
                "p-3 rounded-xl",
                isDark 
                  ? "bg-gray-800 text-amber-400" 
                  : "bg-white text-gray-700 shadow-lg"
              )}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative p-3 rounded-xl",
                isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700 shadow-lg"
              )}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                3
              </span>
            </motion.button>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="إجمالي المركبات"
            value={stats?.totalVehicles || 0}
            change={stats?.vehiclesChange}
            trend={getTrend(stats?.vehiclesChange || '')}
            icon={<Car className="w-6 h-6 text-violet-500" />}
            color="text-violet-500"
            delay={0}
            isDark={isDark}
          />
          <StatCard
            title="العقود النشطة"
            value={stats?.activeContracts || 0}
            change={stats?.contractsChange}
            trend={getTrend(stats?.contractsChange || '')}
            icon={<FileText className="w-6 h-6 text-cyan-500" />}
            color="text-cyan-500"
            delay={0.1}
            isDark={isDark}
          />
          <StatCard
            title="العملاء"
            value={stats?.totalCustomers || 0}
            change={stats?.customersChange}
            trend={getTrend(stats?.customersChange || '')}
            icon={<Users className="w-6 h-6 text-amber-500" />}
            color="text-amber-500"
            delay={0.2}
            isDark={isDark}
          />
          <StatCard
            title="الإيرادات الشهرية"
            value={formatCurrency(stats?.monthlyRevenue || 0)}
            change={stats?.revenueChange}
            trend={getTrend(stats?.revenueChange || '')}
            icon={<CircleDollarSign className="w-6 h-6 text-emerald-500" />}
            color="text-emerald-500"
            delay={0.3}
            isDark={isDark}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className={cn(
            "text-lg font-semibold mb-4 flex items-center gap-2",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <Zap className="w-5 h-5 text-amber-500" />
            إجراءات سريعة
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            <QuickAction
              title="عقد جديد"
              icon={<Plus className="w-5 h-5 text-violet-500" />}
              color="bg-violet-500/10"
              onClick={() => navigate('/contracts')}
              isDark={isDark}
            />
            <QuickAction
              title="عميل جديد"
              icon={<Users className="w-5 h-5 text-cyan-500" />}
              color="bg-cyan-500/10"
              onClick={() => navigate('/customers')}
              isDark={isDark}
            />
            <QuickAction
              title="مركبة جديدة"
              icon={<Car className="w-5 h-5 text-emerald-500" />}
              color="bg-emerald-500/10"
              onClick={() => navigate('/fleet')}
              isDark={isDark}
            />
            <QuickAction
              title="فاتورة جديدة"
              icon={<FileText className="w-5 h-5 text-amber-500" />}
              color="bg-amber-500/10"
              onClick={() => navigate('/finance/invoices')}
              isDark={isDark}
            />
            <QuickAction
              title="تسجيل دفعة"
              icon={<Wallet className="w-5 h-5 text-rose-500" />}
              color="bg-rose-500/10"
              onClick={() => navigate('/finance/payments')}
              isDark={isDark}
            />
            <QuickAction
              title="التقارير"
              icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
              color="bg-indigo-500/10"
              onClick={() => navigate('/reports')}
              isDark={isDark}
            />
            <QuickAction
              title="التحصيلات"
              icon={<Target className="w-5 h-5 text-orange-500" />}
              color="bg-orange-500/10"
              onClick={() => navigate('/collections')}
              isDark={isDark}
            />
            <QuickAction
              title="الإعدادات"
              icon={<Settings className="w-5 h-5 text-gray-500" />}
              color="bg-gray-500/10"
              onClick={() => navigate('/settings')}
              isDark={isDark}
            />
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "lg:col-span-2 rounded-2xl p-6",
              "backdrop-blur-xl border",
              isDark 
                ? "bg-gray-900/60 border-gray-800/50" 
                : "bg-white/80 border-gray-200/50"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={cn(
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                تحليل الإيرادات
              </h3>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                <TrendingUp className="w-3 h-3 ml-1" />
                نمو 12%
              </Badge>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="month" 
                  stroke={isDark ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={isDark ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                  labelStyle={{ color: isDark ? '#fff' : '#000' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  name="الإيرادات"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Fleet Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={cn(
              "rounded-2xl p-6",
              "backdrop-blur-xl border",
              isDark 
                ? "bg-gray-900/60 border-gray-800/50" 
                : "bg-white/80 border-gray-200/50"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                حالة الأسطول
              </h3>
              <Badge 
                className={cn(
                  "font-bold",
                  occupancyRate >= 70 ? "bg-emerald-500" : 
                  occupancyRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                )}
              >
                {occupancyRate}% إشغال
              </Badge>
            </div>

            <div className="flex justify-center mb-4">
              <ResponsiveContainer width={200} height={200}>
                <RechartsPie>
                  <Pie
                    data={fleetChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {fleetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {fleetChartData.map((item) => (
                <div 
                  key={item.name}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg",
                    isDark ? "bg-gray-800/50" : "bg-gray-100"
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1">
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      {item.name}
                    </p>
                    <p className={cn(
                      "text-sm font-bold",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contracts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={cn(
              "rounded-2xl p-6",
              "backdrop-blur-xl border",
              isDark 
                ? "bg-gray-900/60 border-gray-800/50" 
                : "bg-white/80 border-gray-200/50"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                آخر العقود
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/contracts')}
                className={isDark ? "text-gray-400 hover:text-white" : ""}
              >
                عرض الكل
                <ChevronRight className="w-4 h-4 mr-1" />
              </Button>
            </div>

            <div className="space-y-3">
              {recentContracts?.slice(0, 5).map((contract: any, idx) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer",
                    isDark ? "bg-gray-800/50 hover:bg-gray-800" : "bg-gray-100 hover:bg-gray-200",
                    "transition-colors duration-200"
                  )}
                  onClick={() => navigate(`/contracts/${contract.contract_number}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      contract.status === 'active' ? "bg-emerald-500/20 text-emerald-500" :
                      contract.status === 'draft' ? "bg-gray-500/20 text-gray-500" :
                      "bg-amber-500/20 text-amber-500"
                    )}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        {contract.contract_number}
                      </p>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        {getCustomerName(contract.customer)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={cn(
                      "text-sm font-bold",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {formatCurrency(contract.monthly_amount || 0)}
                    </p>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        contract.status === 'active' && "text-emerald-500 border-emerald-500/30",
                        contract.status === 'draft' && "text-gray-500 border-gray-500/30",
                        contract.status === 'pending' && "text-amber-500 border-amber-500/30"
                      )}
                    >
                      {contract.status === 'active' ? 'نشط' : 
                       contract.status === 'draft' ? 'مسودة' : 'معلق'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className={cn(
              "rounded-2xl p-6",
              "backdrop-blur-xl border",
              isDark 
                ? "bg-gray-900/60 border-gray-800/50" 
                : "bg-white/80 border-gray-200/50"
            )}
          >
            <h3 className={cn(
              "text-lg font-semibold mb-6",
              isDark ? "text-white" : "text-gray-900"
            )}>
              مؤشرات الأداء
            </h3>

            <div className="space-y-6">
              {/* Vehicle Activity Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm flex items-center gap-2",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    <Gauge className="w-4 h-4" />
                    معدل نشاط المركبات
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {stats?.vehicleActivityRate || 0}%
                  </span>
                </div>
                <Progress 
                  value={stats?.vehicleActivityRate || 0} 
                  className="h-2"
                />
              </div>

              {/* Contract Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm flex items-center gap-2",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    <CheckCircle className="w-4 h-4" />
                    معدل إكمال العقود
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {stats?.contractCompletionRate || 0}%
                  </span>
                </div>
                <Progress 
                  value={stats?.contractCompletionRate || 0} 
                  className="h-2"
                />
              </div>

              {/* Customer Satisfaction */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm flex items-center gap-2",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    <Star className="w-4 h-4" />
                    رضا العملاء
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {stats?.customerSatisfactionRate || 0}%
                  </span>
                </div>
                <Progress 
                  value={stats?.customerSatisfactionRate || 0} 
                  className="h-2"
                />
              </div>

              {/* Occupancy Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm flex items-center gap-2",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    <Activity className="w-4 h-4" />
                    نسبة الإشغال
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {occupancyRate}%
                  </span>
                </div>
                <Progress 
                  value={occupancyRate} 
                  className="h-2"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className={cn(
              "mt-6 p-4 rounded-xl",
              isDark ? "bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20" 
                     : "bg-gradient-to-r from-violet-100 to-cyan-100"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    أداء ممتاز هذا الشهر!
                  </p>
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    نمو 12% في الإيرادات مقارنة بالشهر الماضي
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className={cn(
            "text-center mt-8 py-4",
            isDark ? "text-gray-500" : "text-gray-400"
          )}
        >
          <p className="text-sm">
            Dashboard V2 • تصميم تجريبي احترافي
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardV2;

