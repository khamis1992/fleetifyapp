import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const ForecastingSection: React.FC = () => {
  const { user } = useAuth();
  const { data: financialData } = useFinancialOverview('car_rental');
  const { data: dashboardStats } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch real booking calendar data
  const { data: calendarData } = useQuery({
    queryKey: ['booking-calendar-v2', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      // Use local date to avoid timezone issues
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight
      
      // Get contracts for the current week (7 days: -3 to +3)
      const weekDays = [];
      for (let i = -3; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Count active contracts for this day
        const { data: contracts, error } = await supabase
          .from('contracts')
          .select('id, status')
          .eq('company_id', user.profile.company_id)
          .lte('start_date', dateStr)
          .or(`end_date.gte.${dateStr},end_date.is.null`)
          .eq('status', 'active');

        if (error) console.error('Error fetching contracts:', error);

        // Get total vehicles
        const { count: totalVehicles } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);

        const occupancyRate = totalVehicles ? Math.round((contracts?.length || 0) / totalVehicles * 100) : 0;

        weekDays.push({
          date: date.getDate(),
          fullDate: date, // Store full date object
          isToday: i === 0,
          occupancyRate,
          contractsCount: contracts?.length || 0
        });
      }

      return weekDays;
    },
    enabled: !!user?.profile?.company_id,
  });

  // Calculate real growth factors
  const { data: growthFactors } = useQuery({
    queryKey: ['growth-factors-v2', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      // Calculate seasonal factor (compare current month to average)
      const currentMonth = new Date().getMonth();
      const { data: monthlyRevenue } = await supabase
        .from('contracts')
        .select('monthly_amount, created_at')
        .eq('company_id', user.profile.company_id)
        .eq('status', 'active');

      const currentMonthRevenue = monthlyRevenue?.filter(c => 
        new Date(c.created_at).getMonth() === currentMonth
      ).reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;

      const avgMonthlyRevenue = (monthlyRevenue?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0) / 12;
      const seasonalFactor = avgMonthlyRevenue > 0 ? ((currentMonthRevenue - avgMonthlyRevenue) / avgMonthlyRevenue * 100) : 0;

      // Calculate new contracts factor (contracts created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: newContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: totalContracts } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id);

      const newContractsFactor = totalContracts ? (newContracts || 0) / totalContracts * 100 : 0;

      // Calculate maintenance factor (vehicles in maintenance)
      const { count: maintenanceVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .in('status', ['maintenance', 'out_of_service']);

      const { count: totalVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      const maintenanceFactor = totalVehicles ? -(maintenanceVehicles || 0) / totalVehicles * 100 : 0;

      return {
        seasonal: Math.round(seasonalFactor),
        newContracts: Math.round(newContractsFactor),
        maintenance: Math.round(maintenanceFactor)
      };
    },
    enabled: !!user?.profile?.company_id,
  });

  const currentRevenue = Math.round(dashboardStats?.monthlyRevenue || 0);
  const revenueChangePercent = parseFloat(dashboardStats?.revenueChange?.replace(/[^0-9.-]/g, '') || '0');
  const growthRate = growthFactors ? (growthFactors.seasonal + growthFactors.newContracts + growthFactors.maintenance) : revenueChangePercent;
  const forecastedRevenue = Math.round(currentRevenue * (1 + growthRate / 100));

  // Calculate progress bar percentages based on max revenue
  const maxRevenue = Math.max(currentRevenue, forecastedRevenue, 1); // Avoid division by zero
  const currentRevenuePercent = Math.round((currentRevenue / maxRevenue) * 100);
  const forecastedRevenuePercent = Math.round((forecastedRevenue / maxRevenue) * 100);

  // Calculate week summary from calendar data
  const weekSummary = calendarData ? {
    avgOccupancy: Math.round(calendarData.reduce((sum, day) => sum + day.occupancyRate, 0) / calendarData.length),
    totalBookings: calendarData.reduce((sum, day) => sum + day.contractsCount, 0)
  } : { avgOccupancy: 0, totalBookings: 0 };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {/* Revenue Forecast */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">توقعات الإيرادات</h3>
          <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
            <Brain className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">الشهر الحالي</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(currentRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" 
                style={{ width: `${currentRevenuePercent}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">توقع الشهر القادم</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(forecastedRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse" 
                style={{ width: `${forecastedRevenuePercent}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl">
            <p className="text-sm font-semibold text-gray-900 mb-3">العوامل المؤثرة:</p>
            <div className="space-y-2">
              {growthFactors && (
                <>
                  <div className="flex items-center gap-3">
                    {growthFactors.seasonal >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      العامل الموسمي ({growthFactors.seasonal >= 0 ? '+' : ''}{growthFactors.seasonal}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {growthFactors.newContracts >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      عقود جديدة ({growthFactors.newContracts >= 0 ? '+' : ''}{growthFactors.newContracts}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {growthFactors.maintenance >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      تأثير الصيانة ({growthFactors.maintenance >= 0 ? '+' : ''}{growthFactors.maintenance}%)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600">نمو متوقع (محسوب)</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Smart Booking Calendar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">تقويم الحجوزات</h3>
          <button className="text-sm font-semibold text-red-600 hover:text-red-700">
            عرض الشهر كاملاً
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
            <div key={day} className="text-xs font-semibold text-gray-500 py-2">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {calendarData?.map((day, index) => {
            const bgColor = day.isToday 
              ? 'bg-blue-100 border-2 border-blue-500' 
              : day.occupancyRate >= 90 
              ? 'bg-red-50' 
              : day.occupancyRate >= 70 
              ? 'bg-orange-50' 
              : day.occupancyRate >= 50 
              ? 'bg-yellow-50' 
              : 'bg-gray-100';
            
            const textColor = day.isToday 
              ? 'text-blue-600' 
              : day.occupancyRate >= 90 
              ? 'text-red-600' 
              : day.occupancyRate >= 70 
              ? 'text-orange-600' 
              : day.occupancyRate >= 50 
              ? 'text-yellow-600' 
              : 'text-green-600';

            return (
              <div 
                key={index} 
                className={`aspect-square rounded-lg ${bgColor} flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-colors`}
              >
                <span className={`text-sm ${day.isToday ? 'font-bold' : 'font-semibold'} ${day.isToday ? textColor : ''}`}>
                  {day.date}
                </span>
                <span className={`text-xs ${textColor}`}>
                  {day.isToday ? 'اليوم' : day.occupancyRate >= 95 ? 'محجوز' : `${day.occupancyRate}%`}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">ملخص الأسبوع</span>
            <span className="text-xs text-gray-500">
              {calendarData?.[0]?.date || ''}-{calendarData?.[6]?.date || ''} {new Date().toLocaleDateString('ar-SA', { month: 'long' })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{weekSummary.avgOccupancy}%</p>
              <p className="text-xs text-gray-600">متوسط الإشغال</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{weekSummary.totalBookings}</p>
              <p className="text-xs text-gray-600">حجوزات نشطة</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
