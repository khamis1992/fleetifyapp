/**
 * Hook لتحسين استعلامات الحجوزات
 * يوفر تحميل تدريجي للبيانات مع تخزين مؤقت
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// تعريف مفاتي التخزين
const CACHE_KEYS = {
  RESERVATIONS: 'optimized-reservations',
  VEHICLES: 'optimized-vehicles',
  CUSTOMERS: 'optimized-customers',
};

// مدة التخزين بالثواني
const CACHE_EXPIRY = {
  RESERVATIONS: 5 * 60 * 1000, // 5 دقائق
  VEHICLES: 10 * 60 * 1000, // 10 دقائق
  CUSTOMERS: 10 * 60 * 1000, // 10 دقائق
};

// أنواع البيانات للتخزين
type CacheData<T> = {
  data: T;
  timestamp: number;
  expiry: number;
};

// استرجاع البيانات من التخزين المؤقت
const getCachedData = <T>(key: string): CacheData<T> | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CacheData<T> = JSON.parse(cached);
      const now = Date.now();
      
      if (now < parsed.expiry) {
        return parsed;
      }
      
      // إزالة البيانات منتهية الصلاحية
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error getting cached data for ${key}:`, error);
    return null;
  }
  
  return null;
};

// تخزين البيانات في التخزين المؤقت
const setCachedData = <T>(key: string, data: T, ttl: number = CACHE_EXPIRY.RESERVATIONS): void => {
  try {
    const now = Date.now();
    const cacheData: CacheData<T> = {
      data,
      timestamp: now,
      expiry: now + ttl
    };
    
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error setting cached data for ${key}:`, error);
  }
};

// Hook رئيسي
export const useOptimizedReservations = (options: {
  limit?: number;
  enabled?: boolean;
} = {}) => {
  const queryClient = useQueryClient();
  const [loadingStage, setLoadingStage] = useState<'idle' | 'vehicles' | 'customers' | 'reservations'>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // استعلام للمركبات مع التخزين المؤقت
  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['optimized-vehicles'],
    queryFn: async () => {
      setLoadingStage('vehicles');
      setLoadingProgress(20);
      
      // محاولة الحصول على البيانات من التخزين أولاً
      const cached = getCachedData(CACHE_KEYS.VEHICLES);
      if (cached) {
        setLoadingProgress(80);
        return cached.data;
      }
      
      const { data } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, is_active, status')
        .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
        .eq('is_active', true)
        .order('plate_number');
      
      setLoadingProgress(100);
      setCachedData(CACHE_KEYS.VEHICLES, data);
      
      return data || [];
    },
    enabled: (enabled ?? true) && !vehiclesLoading,
    staleTime: CACHE_EXPIRY.VEHICLES,
  });
  
  // استعلام للعملاء مع التخزين المؤقت
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['optimized-customers'],
    queryFn: async () => {
      setLoadingStage('customers');
      setLoadingProgress(20);
      
      // محاولة الحصول على البيانات من التخزين أولاً
      const cached = getCachedData(CACHE_KEYS.CUSTOMERS);
      if (cached) {
        setLoadingProgress(80);
        return cached.data;
      }
      
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, status')
        .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
        .eq('is_active', true)
        .order('name');
      
      setLoadingProgress(100);
      setCachedData(CACHE_KEYS.CUSTOMERS, data);
      
      return data || [];
    },
    enabled: (enabled ?? true) && !customersLoading,
    staleTime: CACHE_EXPIRY.CUSTOMERS,
  });
  
  // استعلام للحجوزات مع التخزين المؤقت
  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['optimized-reservations', options.limit],
    queryFn: async ({ queryKey }) => {
      const [, , limit] = queryKey as [string, number];
      
      setLoadingStage('reservations');
      setLoadingProgress(20);
      
      // محاولة الحصول على البيانات من التخزين أولاً
      const cached = getCachedData(CACHE_KEYS.RESERVATIONS);
      if (cached) {
        setLoadingProgress(80);
        return cached.data?.slice(0, limit) || [];
      }
      
      const { data } = await supabase
        .from('reservations')
        .select(`
          id,
          vehicle_id,
          customer_id,
          start_date,
          end_date,
          status,
          total_amount,
          vehicles(plate_number, make, model)
        `)
        .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
        .order('start_date', { ascending: false })
        .limit(limit || 50);
      
      setLoadingProgress(100);
      setCachedData(CACHE_KEYS.RESERVATIONS, {
        data: data || [],
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY.RESERVATIONS,
      });
      
      return data || [];
    },
    enabled: (enabled ?? true) && !reservationsLoading,
    staleTime: 60 * 1000, // 1 دقيقة لبيانات الحجوزات
  });
  
  // دالة لإبطال التخزين المؤقت عند الطلب
  const invalidateCache = useCallback((key: string) => {
    localStorage.removeItem(key);
    queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient]);
  
  // دالة للبحث في البيانات المحسنة
  const searchInCachedData = useCallback((
    data: any[], 
    search: string, 
    searchFields: string[]
  ) => {
    if (!search || !searchFields.length) return data;
    
    const searchLower = search.toLowerCase();
    
    return data.filter(item => 
      searchFields.some(field => {
        const fieldValue = item[field];
        return fieldValue && fieldValue.toString().toLowerCase().includes(searchLower);
      })
    );
  }, []);
  
  // بيانات مجمعة مع معلومات الأداء
  const optimizedData = useMemo(() => {
    if (!vehiclesData || !customersData || !reservationsData) {
      return {
        reservations: [],
        vehicles: [],
        customers: [],
        loading: false,
        error: null,
        searchResults: [],
      };
    }
    
    return {
      reservations: reservationsData || [],
      vehicles: vehiclesData || [],
      customers: customersData || [],
      loading: reservationsLoading || vehiclesLoading || customersLoading,
      error: null,
      // دمج البيانات للبحث السريع
      searchResults: searchInCachedData([
        ...(reservationsData || []),
        ...(vehiclesData || []),
        ...(customersData || [])
      ], ['plate_number', 'make', 'model', 'name', 'email', 'phone']),
    };
  }, [vehiclesData, customersData, reservationsData, reservationsLoading, vehiclesLoading, customersLoading]);
  
  return {
    ...optimizedData,
    loadingStage,
    loadingProgress,
    invalidateCache,
    searchInCachedData,
  };
};
