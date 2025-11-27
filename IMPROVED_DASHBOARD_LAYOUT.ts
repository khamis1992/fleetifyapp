/**
 * تحسينات لوحة التحكم - نسخة محسّنة
 * 
 * التحسينات الرئيسية:
 * 1. دعم أفضل للأجهزة المحمولة
 * 2. تخطيطات متعددة حسب حجم الشاشة
 * 3. توازن بصري محسّن
 * 4. أولويات واضحة للبطاقات
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Layout } from 'react-grid-layout';

// ===== أنواع البطاقات =====
export type DashboardWidgetId = 
  | 'stats-overview'      // بطاقة ملخص جديدة
  | 'stats-revenue'       // إيرادات الشهر
  | 'chart-revenue'       // الأداء المالي
  | 'chart-fleet'         // حالة الأسطول
  | 'maintenance'         // جدول الصيانة
  | 'calendar'            // تقويم الحجوزات
  | 'forecast'            // توقعات الإيرادات
  | 'activities';         // النشاطات الأخيرة

export interface DashboardWidget {
  id: DashboardWidgetId;
  title: string;
  visible: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';  // أولوية البطاقة
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// ===== Breakpoints للشاشات المختلفة =====
export const BREAKPOINTS = {
  lg: 1200,    // سطح المكتب الكبير
  md: 996,     // سطح المكتب
  sm: 768,     // الجهاز اللوحي
  xs: 480,     // الهاتف الكبير
  xxs: 0       // الهاتف الصغير
};

export const COLS = {
  lg: 12,      // 12 عمود
  md: 10,      // 10 أعمدة
  sm: 6,       // 6 أعمدة
  xs: 4,       // 4 أعمدة
  xxs: 2       // عمودان
};

// ===== التخطيط الافتراضي المحسّن =====
// الترتيب الجديد مع أولويات واضحة
const DEFAULT_LAYOUT_DESKTOP: DashboardWidget[] = [
  // الصف الأول - ملخص شامل + إيرادات
  {
    id: 'stats-overview',
    title: 'ملخص الحالة',
    x: 0,
    y: 0,
    w: 6,
    h: 2,
    minW: 3,
    minH: 2,
    maxH: 4,
    visible: true,
    priority: 'critical'
  },
  {
    id: 'stats-revenue',
    title: 'إيرادات الشهر',
    x: 6,
    y: 0,
    w: 6,
    h: 2,
    minW: 3,
    minH: 2,
    maxH: 4,
    visible: true,
    priority: 'high'
  },

  // الصف الثاني - الرسوم البيانية الرئيسية
  {
    id: 'chart-revenue',
    title: 'الأداء المالي',
    x: 0,
    y: 2,
    w: 6,
    h: 4,
    minW: 4,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'chart-fleet',
    title: 'حالة الأسطول',
    x: 6,
    y: 2,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'maintenance',
    title: 'جدول الصيانة',
    x: 9,
    y: 2,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },

  // الصف الثالث - المحتوى الإضافي
  {
    id: 'calendar',
    title: 'تقويم الحجوزات',
    x: 0,
    y: 6,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'forecast',
    title: 'توقعات الإيرادات',
    x: 4,
    y: 6,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'activities',
    title: 'النشاطات الأخيرة',
    x: 8,
    y: 6,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    visible: true,
    priority: 'low'
  }
];

// تخطيط للأجهزة اللوحية
const DEFAULT_LAYOUT_TABLET: DashboardWidget[] = [
  {
    id: 'stats-overview',
    title: 'ملخص الحالة',
    x: 0,
    y: 0,
    w: 6,
    h: 2,
    minW: 3,
    minH: 2,
    visible: true,
    priority: 'critical'
  },
  {
    id: 'stats-revenue',
    title: 'إيرادات الشهر',
    x: 0,
    y: 2,
    w: 6,
    h: 2,
    minW: 3,
    minH: 2,
    visible: true,
    priority: 'high'
  },
  {
    id: 'chart-revenue',
    title: 'الأداء المالي',
    x: 0,
    y: 4,
    w: 6,
    h: 4,
    minW: 3,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'chart-fleet',
    title: 'حالة الأسطول',
    x: 0,
    y: 8,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'maintenance',
    title: 'جدول الصيانة',
    x: 3,
    y: 8,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'calendar',
    title: 'تقويم الحجوزات',
    x: 0,
    y: 12,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'forecast',
    title: 'توقعات الإيرادات',
    x: 3,
    y: 12,
    w: 3,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'activities',
    title: 'النشاطات الأخيرة',
    x: 0,
    y: 16,
    w: 6,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'low'
  }
];

// تخطيط للهواتف الذكية
const DEFAULT_LAYOUT_MOBILE: DashboardWidget[] = [
  {
    id: 'stats-overview',
    title: 'ملخص الحالة',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    minW: 2,
    minH: 2,
    visible: true,
    priority: 'critical'
  },
  {
    id: 'stats-revenue',
    title: 'إيرادات الشهر',
    x: 0,
    y: 2,
    w: 4,
    h: 2,
    minW: 2,
    minH: 2,
    visible: true,
    priority: 'high'
  },
  {
    id: 'chart-revenue',
    title: 'الأداء المالي',
    x: 0,
    y: 4,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'chart-fleet',
    title: 'حالة الأسطول',
    x: 0,
    y: 8,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'high'
  },
  {
    id: 'maintenance',
    title: 'جدول الصيانة',
    x: 0,
    y: 12,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'calendar',
    title: 'تقويم الحجوزات',
    x: 0,
    y: 16,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'forecast',
    title: 'توقعات الإيرادات',
    x: 0,
    y: 20,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'medium'
  },
  {
    id: 'activities',
    title: 'النشاطات الأخيرة',
    x: 0,
    y: 24,
    w: 4,
    h: 4,
    minW: 2,
    minH: 3,
    visible: true,
    priority: 'low'
  }
];

const STORAGE_KEY = 'dashboard_layout_v4_improved';

// ===== دوال مساعدة =====
export function getDefaultLayout(screenSize: 'desktop' | 'tablet' | 'mobile'): DashboardWidget[] {
  switch (screenSize) {
    case 'tablet':
      return DEFAULT_LAYOUT_TABLET;
    case 'mobile':
      return DEFAULT_LAYOUT_MOBILE;
    default:
      return DEFAULT_LAYOUT_DESKTOP;
  }
}

export function getScreenSize(width: number): 'desktop' | 'tablet' | 'mobile' {
  if (width >= BREAKPOINTS.lg) return 'desktop';
  if (width >= BREAKPOINTS.sm) return 'tablet';
  return 'mobile';
}

export function widgetsToLayout(widgets: DashboardWidget[]): Layout[] {
  return widgets
    .filter(w => w.visible)
    .map(w => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: w.minW,
      minH: w.minH,
      maxW: w.maxW,
      maxH: w.maxH,
    }));
}

export function updateWidgetsFromLayout(widgets: DashboardWidget[], layout: Layout[]): DashboardWidget[] {
  const layoutMap = new Map(layout.map(l => [l.i, l]));
  return widgets.map(w => {
    const layoutItem = layoutMap.get(w.id);
    if (layoutItem) {
      return {
        ...w,
        x: layoutItem.x,
        y: layoutItem.y,
        w: layoutItem.w,
        h: layoutItem.h,
      };
    }
    return w;
  });
}

// ===== Hook محسّن =====
export function useDashboardLayoutImproved() {
  const { user } = useAuth();
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_LAYOUT_DESKTOP);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // تحديث حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      const newScreenSize = getScreenSize(window.innerWidth);
      setScreenSize(newScreenSize);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // تحميل التخصيصات
  useEffect(() => {
    const loadLayout = async () => {
      setIsLoading(true);
      
      try {
        const localLayout = localStorage.getItem(`${STORAGE_KEY}_${user?.id}`);
        if (localLayout) {
          const parsed = JSON.parse(localLayout);
          const defaultLayout = getDefaultLayout(screenSize);
          const mergedLayout = mergeLayouts(parsed, defaultLayout);
          setWidgets(mergedLayout);
        } else {
          setWidgets(getDefaultLayout(screenSize));
        }

        if (user?.id) {
          const { data } = await supabase
            .from('user_preferences')
            .select('dashboard_layout')
            .eq('user_id', user.id)
            .single();

          if (data?.dashboard_layout) {
            try {
              const cloudLayout = JSON.parse(data.dashboard_layout);
              if (cloudLayout[0]?.x !== undefined) {
                const defaultLayout = getDefaultLayout(screenSize);
                const mergedLayout = mergeLayouts(cloudLayout, defaultLayout);
                setWidgets(mergedLayout);
                localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(mergedLayout));
              }
            } catch (e) {
              console.log('Using default layout - cloud data format mismatch');
            }
          }
        }
      } catch (error) {
        console.log('Using default layout');
        setWidgets(getDefaultLayout(screenSize));
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [user?.id, screenSize]);

  const mergeLayouts = (saved: DashboardWidget[], defaults: DashboardWidget[]): DashboardWidget[] => {
    const savedIds = new Set(saved.map(w => w.id));
    const defaultMap = new Map(defaults.map(w => [w.id, w]));
    
    const updatedSaved = saved.map(w => ({
      ...defaultMap.get(w.id),
      ...w,
    }));
    
    const newWidgets = defaults.filter(w => !savedIds.has(w.id));
    return [...updatedSaved, ...newWidgets];
  };

  const saveLayout = useCallback(async (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newWidgets));
    }

    if (user?.id) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            dashboard_layout: JSON.stringify(newWidgets),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Failed to save layout to cloud:', error);
      }
    }
  }, [user?.id]);

  const onLayoutChange = useCallback((layout: Layout[]) => {
    setWidgets(prev => updateWidgetsFromLayout(prev, layout));
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetId) => {
    setWidgets(items =>
      items.map(item =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultLayout = getDefaultLayout(screenSize);
    setWidgets(defaultLayout);
    if (user?.id) {
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    }
  }, [user?.id, screenSize]);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    saveLayout(widgets);
  }, [widgets, saveLayout]);

  const gridLayout = widgetsToLayout(widgets);

  return {
    widgets,
    gridLayout,
    isEditMode,
    isLoading,
    screenSize,
    setIsEditMode,
    onLayoutChange,
    toggleWidgetVisibility,
    resetToDefault,
    exitEditMode,
    saveLayout,
  };
}
