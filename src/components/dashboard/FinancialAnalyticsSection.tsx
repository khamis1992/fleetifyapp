import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const FinancialAnalyticsSection: React.FC = () => {
  const { user } = useAuth();
  const { data: financialData, isLoading: financialLoading } = useFinancialOverview('car_rental');
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  
  // State for time period filter
  const [timePeriod, setTimePeriod] = React.useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Fetch real customer data grouped by week - OPTIMIZED: Single bulk query instead of N+1
  const { data: customersWeeklyData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-weekly', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const now = new Date();
      const fiveWeeksAgo = new Date(now);
      fiveWeeksAgo.setDate(now.getDate() - 35); // 5 weeks back

      // ⚡ OPTIMIZATION: Fetch customers and contracts in parallel with a single query each
      const [customersResult, contractsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('created_at, id')
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true)
          .gte('created_at', fiveWeeksAgo.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('contracts')
          .select('customer_id, created_at')
          .eq('company_id', user.profile.company_id)
          .order('created_at', { ascending: true })
      ]);

      if (customersResult.error) throw customersResult.error;

      const customers = customersResult.data || [];
      const contracts = contractsResult.data || [];

      // Build a map of customer_id -> earliest contract date for quick lookup
      const customerFirstContractMap = new Map<string, Date>();
      contracts.forEach(contract => {
        const contractDate = new Date(contract.created_at);
        const existing = customerFirstContractMap.get(contract.customer_id);
        if (!existing || contractDate < existing) {
          customerFirstContractMap.set(contract.customer_id, contractDate);
        }
      });

      // Group customers by week for the last 5 weeks
      const weeklyData = [];
      
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + 7));
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - (i * 7));

        const customersInWeek = customers.filter(customer => {
          const createdAt = new Date(customer.created_at);
          return createdAt >= weekStart && createdAt < weekEnd;
        });

        // ⚡ OPTIMIZATION: Check returning customers using the pre-built map (O(1) lookup)
        let returningCount = 0;
        customersInWeek.forEach(customer => {
          const firstContractDate = customerFirstContractMap.get(customer.id);
          // Customer is "returning" if they had a contract before this week
          if (firstContractDate && firstContractDate < weekStart) {
            returningCount++;
          }
        });

        weeklyData.push({
          week: `الأسبوع ${5 - i}`,
          new: customersInWeek.length - returningCount,
          returning: returningCount
        });
      }

      return weeklyData;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Revenue Chart Data from real financial data
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  // Fetch real revenue data based on time period - OPTIMIZED with parallel queries
  const { data: revenueByPeriod, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-by-period', user?.profile?.company_id, timePeriod],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const now = new Date();
      let startDate: Date;
      let groupBy: string;

      if (timePeriod === 'daily') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        groupBy = 'day';
      } else if (timePeriod === 'weekly') {
        startDate = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000); // Last 8 weeks
        groupBy = 'week';
      } else {
        startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // Last 6 months
        groupBy = 'month';
      }

      // ⚡ OPTIMIZATION: Fetch all data in parallel instead of sequential
      const [paymentsResult, contractsResult, maintenanceResult] = await Promise.all([
        // Fetch payments (revenue)
        supabase
          .from('payments')
          .select('amount, payment_date, contract_id')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'completed')
          .gte('payment_date', startDate.toISOString())
          .order('payment_date', { ascending: true }),
        // Fetch contracts with vehicles to calculate costs
        supabase
          .from('contracts')
          .select(`
            id,
            contract_amount,
            monthly_amount,
            start_date,
            end_date,
            vehicles (
              purchase_price,
              depreciation_rate
            )
          `)
          .eq('company_id', user.profile.company_id)
          .in('status', ['active', 'expired'])
          .gte('start_date', startDate.toISOString()),
        // Fetch maintenance costs
        supabase
          .from('maintenance_records')
          .select('cost, maintenance_date, vehicle_id')
          .eq('company_id', user.profile.company_id)
          .gte('maintenance_date', startDate.toISOString())
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (contractsResult.error) throw contractsResult.error;
      if (maintenanceResult.error) console.error('Maintenance error:', maintenanceResult.error);

      const paymentsData = paymentsResult.data;
      const contractsData = contractsResult.data;
      const maintenanceData = maintenanceResult.data;

      // Group revenue and costs by period
      const revenueGrouped = new Map<string, number>();
      const costsGrouped = new Map<string, number>();

      // Process payments (revenue)
      paymentsData?.forEach(payment => {
        const date = new Date(payment.payment_date);
        let key: string;

        if (groupBy === 'day') {
          key = `${date.getDate()}/${date.getMonth() + 1}`;
        } else if (groupBy === 'week') {
          const weekNum = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          key = `الأسبوع ${8 - weekNum}`;
        } else {
          key = monthNames[date.getMonth()];
        }

        revenueGrouped.set(key, (revenueGrouped.get(key) || 0) + (payment.amount || 0));
      });

      // Process contracts (depreciation costs)
      contractsData?.forEach(contract => {
        const date = new Date(contract.start_date);
        let key: string;

        if (groupBy === 'day') {
          key = `${date.getDate()}/${date.getMonth() + 1}`;
        } else if (groupBy === 'week') {
          const weekNum = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          key = `الأسبوع ${8 - weekNum}`;
        } else {
          key = monthNames[date.getMonth()];
        }

        // Calculate depreciation cost
        const vehicle = contract.vehicles as any;
        if (vehicle && vehicle.purchase_price && vehicle.depreciation_rate) {
          const monthlyDepreciation = (vehicle.purchase_price * vehicle.depreciation_rate / 100) / 12;
          costsGrouped.set(key, (costsGrouped.get(key) || 0) + monthlyDepreciation);
        }
      });

      // Process maintenance costs
      maintenanceData?.forEach(maintenance => {
        const date = new Date(maintenance.maintenance_date);
        let key: string;

        if (groupBy === 'day') {
          key = `${date.getDate()}/${date.getMonth() + 1}`;
        } else if (groupBy === 'week') {
          const weekNum = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          key = `الأسبوع ${8 - weekNum}`;
        } else {
          key = monthNames[date.getMonth()];
        }

        costsGrouped.set(key, (costsGrouped.get(key) || 0) + (maintenance.cost || 0));
      });

      // Convert to array and fill missing periods with 0
      const result = [];
      if (groupBy === 'day') {
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = `${date.getDate()}/${date.getMonth() + 1}`;
          const revenue = revenueGrouped.get(key) || 0;
          const costs = costsGrouped.get(key) || 0;
          result.push({ period: key, revenue, profit: revenue - costs });
        }
      } else if (groupBy === 'week') {
        for (let i = 1; i <= 8; i++) {
          const key = `الأسبوع ${i}`;
          const revenue = revenueGrouped.get(key) || 0;
          const costs = costsGrouped.get(key) || 0;
          result.push({ period: key, revenue, profit: revenue - costs });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          const key = monthNames[date.getMonth()];
          const revenue = revenueGrouped.get(key) || 0;
          const costs = costsGrouped.get(key) || 0;
          result.push({ period: key, revenue, profit: revenue - costs });
        }
      }

      return result;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const isLoading = financialLoading || statsLoading || customersLoading || revenueLoading;
  
  // Use real data from database (revenue and profit calculated from contracts and maintenance)
  const revenueData = revenueByPeriod || [];

  // Use real customer data from database
  const customerData = customersWeeklyData || [];

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="glass-card rounded-3xl p-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4"></div>
          <div className="h-80 bg-slate-200 rounded"></div>
        </div>
        <div className="glass-card rounded-3xl p-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4"></div>
          <div className="h-80 bg-slate-200 rounded"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {/* Financial Performance Chart */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">الأداء المالي</h3>
            <p className="text-sm text-slate-600">تحليل الإيرادات والأرباح</p>
          </div>
          <div className="flex gap-2">
            <button 
              className={`nav-pill ${timePeriod === 'monthly' ? 'active' : ''}`}
              onClick={() => setTimePeriod('monthly')}
            >
              شهري
            </button>
            <button 
              className={`nav-pill ${timePeriod === 'weekly' ? 'active' : ''}`}
              onClick={() => setTimePeriod('weekly')}
            >
              أسبوعي
            </button>
            <button 
              className={`nav-pill ${timePeriod === 'daily' ? 'active' : ''}`}
              onClick={() => setTimePeriod('daily')}
            >
              يومي
            </button>
          </div>
        </div>
        <div style={{ height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="period" 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                itemStyle={{
                  color: '#ffffff'
                }}
                labelStyle={{
                  color: '#ffffff'
                }}
                formatter={(value: any) => [formatCurrency(value), 'الإيرادات']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#dc2626" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">معدل النمو</p>
            <p className="text-2xl font-bold text-green-600">
              {dashboardStats?.revenueChange || '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">الإيرادات الشهرية</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(dashboardStats?.monthlyRevenue || 0).replace(/\.00/, '')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">العقود النشطة</p>
            <p className="text-2xl font-bold text-purple-600">
              {dashboardStats?.activeContracts || 0}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Customer & Booking Analysis */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">تحليل العملاء</h3>
            <p className="text-sm text-slate-600">أداء واتجاهات العملاء</p>
          </div>
          <select className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500">
            <option>هذا الشهر</option>
            <option>آخر 3 أشهر</option>
            <option>السنة الحالية</option>
          </select>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                itemStyle={{
                  color: '#ffffff'
                }}
                labelStyle={{
                  color: '#ffffff'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="new" stackId="a" fill="#3b82f6" name="عملاء جدد" radius={[8, 8, 0, 0]} />
              <Bar dataKey="returning" stackId="a" fill="#22c55e" name="عملاء متكررون" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {dashboardStats?.totalCustomers || 0}
            </p>
            <p className="text-sm text-slate-600">إجمالي العملاء</p>
            <p className="text-xs text-slate-500 mt-1">
              {dashboardStats?.customersChange || '+0%'} مقارنة بالشهر السابق
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600 mb-1">
              {dashboardStats?.customerSatisfactionRate || 0}%
            </p>
            <p className="text-sm text-slate-600">معدل الرضا</p>
            <p className="text-xs text-slate-500 mt-1">بناءً على نشاط العملاء</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
