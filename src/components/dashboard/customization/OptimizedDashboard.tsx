import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cache, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonMetrics, SkeletonWidget } from '@/components/loaders';
import { HierarchicalDashboard } from './HierarchicalDashboard';
import { SmartInsights } from './SmartInsights';
import { cn } from '@/lib/utils';

// مفاتيح التخزين المؤقت
const CACHE_KEYS = {
  CRITICAL_DATA: 'dashboard-critical-data',
  SECONDARY_DATA: 'dashboard-secondary-data',
  TERTIARY_DATA: 'dashboard-tertiary-data',
  LAST_UPDATED: 'dashboard-last-updated'
};

// فترة انتهاء صلاحية التخزين المؤقت (بالدقائق)
const CACHE_EXPIRY = {
  CRITICAL: 1, // دقيقة واحدة للبيانات الحرجة
  SECONDARY: 5, // 5 دقائق للبيانات الثانوية
  TERTIARY: 15 // 15 دقيقة للبيانات الثالثية
};

// تحسينات الأداء
const PERFORMANCE_SETTINGS = {
  // تحديد عدد العناصر المعروضة في البداية
  INITIAL_ITEMS_COUNT: 20,
  // حجم الصفحة للتحميل التدريجي
  PAGE_SIZE: 10,
  // التأخير قبل تحميل العناصر الإضافية (بالميلي ثانية)
  LOAD_DELAY: 300,
  // عدد مرات إعادة المحاولة عند الفشل
  RETRY_ATTEMPTS: 3
};

// تعريف واجهة للبيانات الحرجة
interface CriticalData {
  totalVehicles: number;
  activeContracts: number;
  monthlyRevenue: number;
  occupancyRate: number;
  criticalAlerts: number;
}

// تعريف واجهة للبيانات الثانوية
interface SecondaryData {
  totalCustomers: number;
  maintenanceCount: number;
  recentActivities: any[];
  performanceChart: any[];
}

// تعريف واجهة للبيانات الثالثية
interface TertiaryData {
  fleetStatus: any;
  reservations: any[];
  analytics: any;
}

// مكون لعرض حالة الاتصال
const ConnectionStatus: React.FC<{ isConnected: boolean; isOffline: boolean }> = ({ 
  isConnected, 
  isOffline 
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white">
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600">وضع دون اتصال</span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-green-600">متصل</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
          <span className="text-xs font-medium text-amber-600">جاري الاتصال...</span>
        </>
      )}
    </div>
  );
};

// مكون لعرض مؤشر التحميل الذكي
const SmartLoadingIndicator: React.FC<{ 
  stage: 'critical' | 'secondary' | 'tertiary' | 'complete';
  progress: number;
}> = ({ stage, progress }) => {
  const stageInfo = {
    critical: { label: 'تحميل البيانات الأساسية', color: 'bg-red-500' },
    secondary: { label: 'تحميل البيانات التفصيلية', color: 'bg-amber-500' },
    tertiary: { label: 'تحميل البيانات الإضافية', color: 'bg-blue-500' },
    complete: { label: 'اكتمل التحميل', color: 'bg-green-500' }
  };
  
  const { label, color } = stageInfo[stage];
  
  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-700">{label}</h3>
        <span className="text-xs text-neutral-500">{Math.round(progress)}%</span>
      </div>
      
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden mb-3">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex justify-between">
        <div className="flex items-center gap-1">
          <div className={cn('w-2 h-2 rounded-full', stage === 'critical' ? color : 'bg-neutral-300')} />
          <div className={cn('w-2 h-2 rounded-full', stage === 'secondary' || stage === 'tertiary' || stage === 'complete' ? color : 'bg-neutral-300')} />
          <div className={cn('w-2 h-2 rounded-full', stage === 'tertiary' || stage === 'complete' ? color : 'bg-neutral-300')} />
          <div className={cn('w-2 h-2 rounded-full', stage === 'complete' ? color : 'bg-neutral-300')} />
        </div>
        
        <button className="text-xs text-neutral-500 hover:text-neutral-700">إلغاء</button>
      </div>
    </div>
  );
};

// دالة للحصول على البيانات من التخزين المؤقت
const getCachedData = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;
    
    const { data, timestamp } = JSON.parse(cachedItem);
    const now = new Date().getTime();
    
    // التحقق من انتهاء صلاحية التخزين المؤقت
    let expiryMinutes = 5; // افتراضي 5 دقائق
    if (key === CACHE_KEYS.CRITICAL_DATA) expiryMinutes = CACHE_EXPIRY.CRITICAL;
    else if (key === CACHE_KEYS.SECONDARY_DATA) expiryMinutes = CACHE_EXPIRY.SECONDARY;
    else if (key === CACHE_KEYS.TERTIARY_DATA) expiryMinutes = CACHE_EXPIRY.TERTIARY;
    
    if (now - timestamp > expiryMinutes * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

// دالة لحفظ البيانات في التخزين المؤقت
const setCachedData = <T,>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheItem = {
      data,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error setting cached data:', error);
  }
};

// المكون الرئيسي للوحة التحكم المحسّنة
export const OptimizedDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingStage, setLoadingStage] = useState<'critical' | 'secondary' | 'tertiary' | 'complete'>('critical');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  // التحقق من حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      setIsOffline(false);
    };
    
    const handleOffline = () => {
      setIsConnected(false);
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // التحقق من الحالة الأولية
    setIsConnected(navigator.onLine);
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // تحديث البيانات عند التغييرات في الوقت الفعلي
  useEffect(() => {
    if (!user?.profile?.company_id) return;
    
    const channel = supabase
      .channel(`dashboard-updates-${user.profile.company_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts'
        },
        () => {
          queryClient.invalidateQueries(['critical-dashboard-data', user.profile.company_id]);
          queryClient.invalidateQueries(['secondary-dashboard-data', user.profile.company_id]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          queryClient.invalidateQueries(['critical-dashboard-data', user.profile.company_id]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.profile.company_id, queryClient]);
  
  // استعلام للبيانات الحرجة (أولوية قصوى)
  const { data: criticalData, isLoading: criticalLoading } = useQuery({
    queryKey: ['critical-dashboard-data', user?.profile?.company_id],
    queryFn: async () => {
      setLoadingStage('critical');
      setLoadingProgress(0);
      
      // محاولة الحصول على البيانات من التخزين المؤقت أولاً
      const cachedData = getCachedData<CriticalData>(CACHE_KEYS.CRITICAL_DATA);
      if (cachedData) {
        setLoadingProgress(25);
        return cachedData;
      }
      
      setLoadingProgress(10);
      
      if (!user?.profile?.company_id) return null;
      
      // جلب البيانات الحرجة
      const [vehiclesResponse, contractsResponse, paymentsResponse] = await Promise.all([
        supabase.from('vehicles').select('status, is_active').eq('company_id', user.profile.company_id).eq('is_active', true),
        supabase.from('contracts').select('monthly_amount, status').eq('company_id', user.profile.company_id).eq('status', 'active'),
        supabase.from('payments').select('amount, status').eq('company_id', user.profile.company_id).eq('status', 'completed').gte('payment_date', new Date(new Date().setDate(1)).toISOString())
      ]);
      
      setLoadingProgress(50);
      
      const totalVehicles = vehiclesResponse.data?.length || 0;
      const rentedVehicles = vehiclesResponse.data?.filter(v => v.status === 'rented').length || 0;
      const occupancyRate = totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;
      
      const activeContracts = contractsResponse.data?.length || 0;
      const monthlyRevenue = contractsResponse.data?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
      
      const criticalAlerts = vehiclesResponse.data?.filter(v => v.status === 'maintenance').length || 0;
      
      setLoadingProgress(90);
      
      const result: CriticalData = {
        totalVehicles,
        activeContracts,
        monthlyRevenue,
        occupancyRate,
        criticalAlerts
      };
      
      // حفظ في التخزين المؤقت
      setCachedData(CACHE_KEYS.CRITICAL_DATA, result);
      setLoadingProgress(100);
      
      return result;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 1 * 60 * 1000, // 1 دقيقة
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
  
  // استعلام للبيانات الثانوية (أولوية متوسطة)
  const { data: secondaryData, isLoading: secondaryLoading } = useQuery({
    queryKey: ['secondary-dashboard-data', user?.profile?.company_id],
    queryFn: async () => {
      setLoadingStage('secondary');
      setLoadingProgress(0);
      
      // محاولة الحصول على البيانات من التخزين المؤقت أولاً
      const cachedData = getCachedData<SecondaryData>(CACHE_KEYS.SECONDARY_DATA);
      if (cachedData) {
        setLoadingProgress(25);
        return cachedData;
      }
      
      setLoadingProgress(10);
      
      if (!user?.profile?.company_id) return null;
      
      // جلب البيانات الثانوية
      const [customersResponse, maintenanceResponse, activitiesResponse] = await Promise.all([
        supabase.from('customers').select('id').eq('company_id', user.profile.company_id),
        supabase.from('vehicle_maintenance').select('id').eq('company_id', user.profile.company_id).in('status', ['pending', 'in_progress']),
        supabase.from('activities').select('*').eq('company_id', user.profile.company_id).order('created_at', { ascending: false }).limit(10)
      ]);
      
      setLoadingProgress(50);
      
      const totalCustomers = customersResponse.data?.length || 0;
      const maintenanceCount = maintenanceResponse.data?.length || 0;
      const recentActivities = activitiesResponse.data || [];
      
      setLoadingProgress(90);
      
      const result: SecondaryData = {
        totalCustomers,
        maintenanceCount,
        recentActivities,
        performanceChart: [] // يمكن إضافة بيانات الرسم البياني هنا
      };
      
      // حفظ في التخزين المؤقت
      setCachedData(CACHE_KEYS.SECONDARY_DATA, result);
      setLoadingProgress(100);
      
      return result;
    },
    enabled: !!user?.profile?.company_id && !isOffline,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    refetchOnWindowFocus: false
  });
  
  // استعلام للبيانات الثالثية (أولوية منخفضة)
  const { data: tertiaryData, isLoading: tertiaryLoading } = useQuery({
    queryKey: ['tertiary-dashboard-data', user?.profile?.company_id],
    queryFn: async () => {
      setLoadingStage('tertiary');
      setLoadingProgress(0);
      
      // محاولة الحصول على البيانات من التخزين المؤقت أولاً
      const cachedData = getCachedData<TertiaryData>(CACHE_KEYS.TERTIARY_DATA);
      if (cachedData) {
        setLoadingProgress(25);
        return cachedData;
      }
      
      setLoadingProgress(10);
      
      if (!user?.profile?.company_id) return null;
      
      // جلب البيانات الثالثية
      const [fleetStatusResponse, reservationsResponse, analyticsResponse] = await Promise.all([
        supabase.from('vehicles').select('status').eq('company_id', user.profile.company_id).eq('is_active', true),
        supabase.from('reservations').select('*').eq('company_id', user.profile.company_id).gte('start_date', new Date().toISOString()),
        supabase.rpc('get_dashboard_analytics', { company_id: user.profile.company_id })
      ]);
      
      setLoadingProgress(50);
      
      const fleetStatus = fleetStatusResponse.data || [];
      const reservations = reservationsResponse.data || [];
      const analytics = analyticsResponse.data || null;
      
      setLoadingProgress(90);
      
      const result: TertiaryData = {
        fleetStatus,
        reservations,
        analytics
      };
      
      // حفظ في التخزين المؤقت
      setCachedData(CACHE_KEYS.TERTIARY_DATA, result);
      setLoadingProgress(100);
      
      return result;
    },
    enabled: !!user?.profile?.company_id && !isOffline,
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false
  });
  
  // تحديث مرحلة التحميل
  useEffect(() => {
    if (criticalLoading) {
      setLoadingStage('critical');
    } else if (secondaryLoading) {
      setLoadingStage('secondary');
    } else if (tertiaryLoading) {
      setLoadingStage('tertiary');
    } else {
      setLoadingStage('complete');
    }
  }, [criticalLoading, secondaryLoading, tertiaryLoading]);
  
  // تحديث التقدم العام
  useEffect(() => {
    let totalProgress = 0;
    let totalStages = 3;
    
    if (!criticalLoading) totalProgress += 33;
    if (!secondaryLoading) totalProgress += 33;
    if (!tertiaryLoading) totalProgress += 34;
    
    setLoadingProgress(totalProgress);
  }, [criticalLoading, secondaryLoading, tertiaryLoading]);
  
  // تحديث جميع البيانات
  const handleRefreshAll = useCallback(() => {
    queryClient.invalidateQueries(['critical-dashboard-data', user?.profile?.company_id]);
    queryClient.invalidateQueries(['secondary-dashboard-data', user?.profile?.company_id]);
    queryClient.invalidateQueries(['tertiary-dashboard-data', user?.profile?.company_id]);
    
    // مسح التخزين المؤقت
    Object.values(CACHE_KEYS).forEach(key => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    });
  }, [queryClient, user?.profile?.company_id]);
  
  // عرض شاشة التحميل
  if (criticalLoading && loadingStage !== 'complete') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <SmartLoadingIndicator stage={loadingStage} progress={loadingProgress} />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* رأس لوحة التحكم */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">لوحة التحكم</h1>
        
        <div className="flex items-center gap-4">
          <ConnectionStatus isConnected={isConnected} isOffline={isOffline} />
          
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', criticalLoading || secondaryLoading || tertiaryLoading ? 'animate-spin' : '')} />
            <span className="text-sm font-medium text-neutral-700">تحديث الكل</span>
          </button>
        </div>
      </div>
      
      {/* عرض المحتوى حسب الأولوية */}
      <div className="space-y-6">
        {/* البيانات الحرجة - دائماً معروضة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {criticalData ? (
            <>
              <motion.div
                className="bg-white rounded-xl border border-red-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-500">المركبات</span>
                  {criticalData.criticalAlerts > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      {criticalData.criticalAlerts}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-neutral-900">{criticalData.totalVehicles}</p>
                <p className="text-xs text-neutral-500">إشغال {criticalData.occupancyRate}%</p>
              </motion.div>
              
              <motion.div
                className="bg-white rounded-xl border border-neutral-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-500">العقود</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{criticalData.activeContracts}</p>
                <p className="text-xs text-neutral-500">نشط حالياً</p>
              </motion.div>
              
              <motion.div
                className="bg-white rounded-xl border border-neutral-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-500">الإيرادات</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{criticalData.monthlyRevenue.toLocaleString()} ر.ق</p>
                <p className="text-xs text-neutral-500">شهرياً</p>
              </motion.div>
              
              <motion.div
                className="bg-white rounded-xl border border-neutral-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-500">معدل الإشغال</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{criticalData.occupancyRate}%</p>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mt-2">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      criticalData.occupancyRate < 60 ? "bg-red-500" :
                      criticalData.occupancyRate < 80 ? "bg-amber-500" :
                      "bg-green-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${criticalData.occupancyRate}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </motion.div>
            </>
          ) : (
            <SkeletonMetrics count={4} columns={{ sm: 2, md: 2, lg: 4 }} />
          )}
        </div>
        
        {/* رؤى ذكية */}
        <SmartInsights compact={true} />
        
        {/* البيانات الثانوية */}
        {secondaryLoading && !secondaryData ? (
          <SkeletonWidget />
        ) : (
          secondaryData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                className="bg-white rounded-xl border border-neutral-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-sm font-semibold text-neutral-900 mb-2">العملاء</h3>
                <p className="text-2xl font-bold text-neutral-900">{secondaryData.totalCustomers}</p>
                <p className="text-xs text-neutral-500">إجمالي العملاء</p>
              </motion.div>
              
              <motion.div
                className="bg-white rounded-xl border border-neutral-200 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-sm font-semibold text-neutral-900 mb-2">الصيانة</h3>
                <p className="text-2xl font-bold text-neutral-900">{secondaryData.maintenanceCount}</p>
                <p className="text-xs text-neutral-500">مركبات تحت الصيانة</p>
              </motion.div>
            </div>
          )
        )}
        
        {/* البيانات الثالثية */}
        {!tertiaryLoading && tertiaryData && (
          <HierarchicalDashboard />
        )}
        
        {/* عرض البيانات التفصيلية فقط عند الطلب */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">وضع بدون اتصال</h3>
                <p className="text-xs text-amber-700 mt-1">
                  بعض البيانات قد لا تكون محدّثة. سيتم تحديثها تلقائياً عند استعادة الاتصال.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedDashboard;
