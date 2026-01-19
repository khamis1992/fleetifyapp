import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';

export const ForecastingSection: React.FC = () => {
  const { user } = useAuth();
  const { data: financialData } = useFinancialOverview('car_rental');
  const { data: dashboardStats } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  // Fetch real booking calendar data
  const { data: calendarDataRaw } = useQuery({
    queryKey: ['booking-calendar-v2', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      // Get the start of current week (Sunday)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      
      // Get total vehicles count once
      const { count: totalVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Get all contracts for the week in one query
      const weekEnd = new Date(startOfWeek);
      weekEnd.setDate(startOfWeek.getDate() + 6);
      
      const { data: allContracts, error } = await supabase
        .from('contracts')
        .select('id, start_date, end_date, status')
        .eq('company_id', user.profile.company_id)
        .in('status', ['active', 'draft'])
        .lte('start_date', weekEnd.toISOString().split('T')[0])
        .gte('end_date', startOfWeek.toISOString().split('T')[0]);

      if (error) console.error('Error fetching contracts:', error);

      // Build week days array
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Count contracts active on this specific day
        const contractsForDay = allContracts?.filter(contract => {
          const startDate = contract.start_date;
          const endDate = contract.end_date;
          return dateStr >= startDate && dateStr <= endDate;
        }) || [];

        const occupancyRate = totalVehicles ? Math.round((contractsForDay.length / totalVehicles) * 100) : 0;
        const isToday = date.toDateString() === today.toDateString();

        weekDays.push({
          date: date.getDate(),
          fullDate: date,
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          isToday,
          occupancyRate,
          contractsCount: contractsForDay.length
        });
      }

      // Calculate unique contracts for the entire week
      const uniqueContractsCount = allContracts?.length || 0;

      return { weekDays, uniqueContractsCount };
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

      // Calculate seasonal factor based on last 3 months vs previous 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentMonth - 3);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentMonth - 6);
      
      const recentRevenue = monthlyRevenue?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= threeMonthsAgo;
      }).reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
      
      const previousRevenue = monthlyRevenue?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= sixMonthsAgo && createdAt < threeMonthsAgo;
      }).reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
      
      let seasonalFactor = 0;
      if (previousRevenue > 0) {
        seasonalFactor = ((recentRevenue - previousRevenue) / previousRevenue * 100) / 3; // Average per month
      }
      // Cap seasonal factor at ±20% for realism
      seasonalFactor = Math.max(-20, Math.min(20, seasonalFactor));

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

      // Calculate growth rate from new contracts (capped at ±30%)
      let newContractsFactor = totalContracts && totalContracts > 0 ? (newContracts || 0) / totalContracts * 100 : 0;
      newContractsFactor = Math.max(-30, Math.min(30, newContractsFactor));

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

      // Calculate maintenance impact (capped at ±10%)
      let maintenanceFactor = totalVehicles && totalVehicles > 0 ? -(maintenanceVehicles || 0) / totalVehicles * 100 : 0;
      maintenanceFactor = Math.max(-10, Math.min(10, maintenanceFactor));

      return {
        seasonal: Math.round(seasonalFactor),
        newContracts: Math.round(newContractsFactor),
        maintenance: Math.round(maintenanceFactor)
      };
    },
    enabled: !!user?.profile?.company_id,
  });

  // Use real calendar data from database
  const calendarData = calendarDataRaw?.weekDays || [];
  const uniqueContractsCount = calendarDataRaw?.uniqueContractsCount || 0;

  const currentRevenue = Math.round(dashboardStats?.monthlyRevenue || 0);
  const revenueChangePercent = parseFloat(dashboardStats?.revenueChange?.replace(/[^0-9.-]/g, '') || '0');
  const growthRate = growthFactors ? (growthFactors.seasonal + growthFactors.newContracts + growthFactors.maintenance) : revenueChangePercent;
  const forecastedRevenue = Math.round(currentRevenue * (1 + growthRate / 100));

  // Calculate progress bar percentages based on max revenue
  const maxRevenue = Math.max(currentRevenue, forecastedRevenue, 1); // Avoid division by zero
  const currentRevenuePercent = Math.round((currentRevenue / maxRevenue) * 100);
  const forecastedRevenuePercent = Math.round((forecastedRevenue / maxRevenue) * 100);

  // Calculate week summary from calendar data
  const weekSummary = calendarData && calendarData.length > 0 ? {
    avgOccupancy: Math.round(calendarData.reduce((sum, day) => sum + day.occupancyRate, 0) / calendarData.length),
    totalBookings: uniqueContractsCount // Use unique contracts count for the entire week
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
          <h3 className="text-xl font-bold text-slate-900">توقعات الإيرادات</h3>
          <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
            <Brain className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">الشهر الحالي</span>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(currentRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" 
                style={{ width: `${currentRevenuePercent}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">توقع الشهر القادم</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(forecastedRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse" 
                style={{ width: `${forecastedRevenuePercent}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl">
            <p className="text-sm font-semibold text-slate-900 mb-3">العوامل المؤثرة:</p>
            <div className="space-y-2">
              {growthFactors && (
                <>
                  <div className="flex items-center gap-3">
                    {growthFactors.seasonal >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-slate-700">
                      العامل الموسمي ({growthFactors.seasonal >= 0 ? '+' : ''}{growthFactors.seasonal}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {growthFactors.newContracts >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-slate-700">
                      عقود جديدة ({growthFactors.newContracts >= 0 ? '+' : ''}{growthFactors.newContracts}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {growthFactors.maintenance >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-slate-700">
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
              <p className="text-xs text-slate-600">نمو متوقع (محسوب)</p>
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
          <h3 className="text-xl font-bold text-slate-900">تقويم الحجوزات</h3>
          <button 
            onClick={() => navigate('/fleet/reservation-system')}
            className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
          >
            <Calendar className="w-4 h-4" />
            عرض الشهر كاملاً
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
            <div key={day} className="text-xs font-semibold text-slate-500 py-2">{day}</div>
          ))}
        </div>
        
        {!calendarData || calendarData.length === 0 ? (
          <div className="grid grid-cols-7 gap-2 mb-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-slate-100 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 mb-4">
          {calendarData?.map((day, index) => {
            const bgColor = day.isToday 
              ? 'bg-blue-100 border-2 border-blue-500' 
              : day.occupancyRate >= 90 
              ? 'bg-red-50 border border-red-300' 
              : day.occupancyRate >= 70 
              ? 'bg-orange-50 border border-orange-300' 
              : day.occupancyRate >= 50 
              ? 'bg-yellow-50 border border-yellow-300' 
              : 'bg-green-50 border border-green-300';
            
            const textColor = day.isToday 
              ? 'text-blue-700' 
              : day.occupancyRate >= 90 
              ? 'text-red-700' 
              : day.occupancyRate >= 70 
              ? 'text-orange-700' 
              : day.occupancyRate >= 50 
              ? 'text-yellow-700' 
              : 'text-green-700';

            return (
              <div 
                key={index} 
                className={`aspect-square rounded-lg ${bgColor} flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all`}
                title={`${day.dayName || ''} - ${day.contractsCount} عقد نشط - ${day.occupancyRate}% إشغال`}
              >
                <span className={`text-sm ${day.isToday ? 'font-bold' : 'font-semibold'} ${textColor}`}>
                  {day.date}
                </span>
                <span className={`text-xs font-medium ${textColor}`}>
                  {day.isToday ? 'اليوم' : day.occupancyRate >= 95 ? 'ممتلئ' : `${day.occupancyRate}%`}
                </span>
                {day.contractsCount > 0 && (
                  <span className={`text-[10px] ${textColor} opacity-70 mt-0.5`}>
                    {day.contractsCount} عقد
                  </span>
                )}
              </div>
            );
          })}
        </div>
        )}
        
        {/* Color Legend */}
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-50 border border-green-300"></div>
            <span className="text-slate-600">متاح (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-300"></div>
            <span className="text-slate-600">متوسط (50-70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-50 border border-orange-300"></div>
            <span className="text-slate-600">مشغول (70-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
            <span className="text-slate-600">ممتلئ (≥90%)</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-900">ملخص الأسبوع</span>
            <span className="text-xs text-slate-500">
              {calendarData?.[0]?.fullDate && calendarData?.[6]?.fullDate 
                ? `${calendarData[0].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${calendarData[6].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'جاري التحميل...'
              }
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{weekSummary.avgOccupancy}%</p>
              <p className="text-xs text-slate-600">متوسط الإشغال</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{weekSummary.totalBookings}</p>
              <p className="text-xs text-slate-600">عقود نشطة</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
