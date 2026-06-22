import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Layout } from 'react-grid-layout';

export type DashboardWidgetId = 
  | 'stats-vehicles'
  | 'stats-contracts'
  | 'stats-customers'
  | 'stats-revenue'
  | 'chart-revenue'
  | 'chart-fleet'
  | 'maintenance'
  | 'calendar'
  | 'forecast'
  | 'activities';

export interface DashboardWidget {
  id: DashboardWidgetId;
  title: string;
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// التخطيط الافتراضي - سطح المكتب (12 عمود)
// الصف الأول: إيرادات (6) + عملاء (2) + مركبات (2) + عقود (2)
// الصف الثاني: صيانة (2) + أسطول (4) + أداء مالي (6)
// الصف الثالث: نشاطات (2) + توقعات (4) + تقويم (6)
const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: 'stats-revenue', title: 'إجمالي الإيرادات', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2, maxH: 4, visible: true },
  { id: 'stats-customers', title: 'إجمالي العملاء', x: 6, y: 0, w: 2, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'stats-vehicles', title: 'إجمالي المركبات', x: 8, y: 0, w: 2, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'stats-contracts', title: 'العقود النشطة', x: 10, y: 0, w: 2, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'maintenance', title: 'جدول الصيانة', x: 0, y: 2, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'chart-fleet', title: 'حالة الأسطول', x: 2, y: 2, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'chart-revenue', title: 'الأداء المالي', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3, visible: true },
  { id: 'activities', title: 'النشاطات الأخيرة', x: 0, y: 6, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'forecast', title: 'توقعات الإيرادات', x: 2, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'calendar', title: 'تقويم الحجوزات', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3, visible: true },
];

// التخطيط للأجهزة اللوحية (10 أعمدة)
// الصف الأول: إيرادات (5) + عملاء (2) + مركبات (2) + عقود (1)
// الصف الثاني: صيانة (2) + أسطول (4) + أداء مالي (4)
// الصف الثالث: نشاطات (2) + توقعات (4) + تقويم (4)
const TABLET_LAYOUT: DashboardWidget[] = [
  { id: 'stats-revenue', title: 'إجمالي الإيرادات', x: 0, y: 0, w: 5, h: 2, minW: 4, minH: 2, visible: true },
  { id: 'stats-customers', title: 'إجمالي العملاء', x: 5, y: 0, w: 2, h: 2, minW: 2, minH: 2, visible: true },
  { id: 'stats-vehicles', title: 'إجمالي المركبات', x: 7, y: 0, w: 2, h: 2, minW: 2, minH: 2, visible: true },
  { id: 'stats-contracts', title: 'العقود النشطة', x: 9, y: 0, w: 1, h: 2, minW: 1, minH: 2, visible: true },
  { id: 'maintenance', title: 'جدول الصيانة', x: 0, y: 2, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'chart-fleet', title: 'حالة الأسطول', x: 2, y: 2, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'chart-revenue', title: 'الأداء المالي', x: 6, y: 2, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'activities', title: 'النشاطات الأخيرة', x: 0, y: 6, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'forecast', title: 'توقعات الإيرادات', x: 2, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'calendar', title: 'تقويم الحجوزات', x: 6, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
];

// التخطيط للهواتف الذكية (6 أعمدة)
const MOBILE_LAYOUT: DashboardWidget[] = [
  { id: 'stats-revenue', title: 'إجمالي الإيرادات', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2, visible: true },
  { id: 'stats-customers', title: 'إجمالي العملاء', x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2, visible: true },
  { id: 'stats-vehicles', title: 'إجمالي المركبات', x: 2, y: 2, w: 2, h: 2, minW: 2, minH: 2, visible: true },
  { id: 'stats-contracts', title: 'العقود النشطة', x: 4, y: 2, w: 2, h: 2, minW: 2, minH: 2, visible: true },
  { id: 'maintenance', title: 'جدول الصيانة', x: 0, y: 4, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'chart-fleet', title: 'حالة الأسطول', x: 2, y: 4, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'chart-revenue', title: 'الأداء المالي', x: 0, y: 8, w: 6, h: 4, minW: 4, minH: 3, visible: true },
  { id: 'activities', title: 'النشاطات الأخيرة', x: 0, y: 12, w: 2, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'forecast', title: 'توقعات الإيرادات', x: 2, y: 12, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'calendar', title: 'تقويم الحجوزات', x: 0, y: 16, w: 6, h: 4, minW: 4, minH: 3, visible: true },
];

const STORAGE_KEY = 'dashboard_layout_v5';

// دالة لاختيار التخطيط حسب حجم الشاشة
export function getLayoutByScreenSize(width: number): DashboardWidget[] {
  if (width >= 1200) return DEFAULT_LAYOUT;
  if (width >= 768) return TABLET_LAYOUT;
  return MOBILE_LAYOUT;
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

export function useDashboardLayout() {
  const { user } = useAuth();
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // مراقبة تغييرات حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
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
          const defaultLayout = getLayoutByScreenSize(screenWidth);
          const mergedLayout = mergeLayouts(parsed, defaultLayout);
          setWidgets(mergedLayout);
        } else {
          setWidgets(getLayoutByScreenSize(screenWidth));
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
                const defaultLayout = getLayoutByScreenSize(screenWidth);
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
        setWidgets(getLayoutByScreenSize(screenWidth));
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [user?.id, screenWidth]);

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
    const defaultLayout = getLayoutByScreenSize(screenWidth);
    setWidgets(defaultLayout);
    if (user?.id) {
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    }
  }, [user?.id, screenWidth]);

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
    screenWidth,
    setIsEditMode,
    onLayoutChange,
    toggleWidgetVisibility,
    resetToDefault,
    exitEditMode,
    saveLayout,
  };
}
