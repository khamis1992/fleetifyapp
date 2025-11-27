import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Layout } from 'react-grid-layout';

// تعريف أنواع البطاقات المتاحة في الداشبورد
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
  // React Grid Layout properties
  x: number;  // موقع X في الشبكة
  y: number;  // موقع Y في الشبكة
  w: number;  // العرض (عدد الأعمدة)
  h: number;  // الارتفاع (عدد الصفوف)
  minW?: number;  // الحد الأدنى للعرض
  minH?: number;  // الحد الأدنى للارتفاع
  maxW?: number;  // الحد الأقصى للعرض
  maxH?: number;  // الحد الأقصى للارتفاع
}

// الترتيب الافتراضي للبطاقات - شبكة 12 عمود
const DEFAULT_LAYOUT: DashboardWidget[] = [
  // الصف الأول - بطاقات الإحصائيات
  { id: 'stats-vehicles', title: 'إجمالي المركبات', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'stats-contracts', title: 'العقود النشطة', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'stats-customers', title: 'إجمالي العملاء', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  { id: 'stats-revenue', title: 'إيرادات الشهر', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, maxH: 4, visible: true },
  // الصف الثاني - الرسوم البيانية والصيانة
  { id: 'chart-revenue', title: 'الأداء المالي', x: 7, y: 2, w: 5, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'chart-fleet', title: 'حالة الأسطول', x: 4, y: 2, w: 3, h: 4, minW: 2, minH: 3, visible: true },
  { id: 'maintenance', title: 'جدول الصيانة', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  // الصف الثالث - التقويم والتوقعات والنشاطات
  { id: 'calendar', title: 'تقويم الحجوزات', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'forecast', title: 'توقعات الإيرادات', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
  { id: 'activities', title: 'النشاطات الأخيرة', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3, visible: true },
];

const STORAGE_KEY = 'dashboard_layout_v2';

// تحويل من DashboardWidget[] إلى Layout[] لـ react-grid-layout
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

// تحديث widgets من layout
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
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل التخصيصات
  useEffect(() => {
    const loadLayout = async () => {
      setIsLoading(true);
      
      try {
        // محاولة التحميل من localStorage
        const localLayout = localStorage.getItem(`${STORAGE_KEY}_${user?.id}`);
        if (localLayout) {
          const parsed = JSON.parse(localLayout);
          const mergedLayout = mergeLayouts(parsed, DEFAULT_LAYOUT);
          setWidgets(mergedLayout);
        }

        // محاولة التحميل من Supabase
        if (user?.id) {
          const { data } = await supabase
            .from('user_preferences')
            .select('dashboard_layout')
            .eq('user_id', user.id)
            .single();

          if (data?.dashboard_layout) {
            try {
              const cloudLayout = JSON.parse(data.dashboard_layout);
              // التحقق من أن البيانات بالتنسيق الجديد (تحتوي على x, y)
              if (cloudLayout[0]?.x !== undefined) {
                const mergedLayout = mergeLayouts(cloudLayout, DEFAULT_LAYOUT);
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
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [user?.id]);

  // دمج التخطيط المحفوظ مع الافتراضي
  const mergeLayouts = (saved: DashboardWidget[], defaults: DashboardWidget[]): DashboardWidget[] => {
    const savedIds = new Set(saved.map(w => w.id));
    const defaultMap = new Map(defaults.map(w => [w.id, w]));
    
    // تحديث البطاقات المحفوظة بالقيم الافتراضية الناقصة
    const updatedSaved = saved.map(w => ({
      ...defaultMap.get(w.id),
      ...w,
    }));
    
    // إضافة بطاقات جديدة غير موجودة في المحفوظ
    const newWidgets = defaults.filter(w => !savedIds.has(w.id));
    return [...updatedSaved, ...newWidgets];
  };

  // حفظ التخصيصات
  const saveLayout = useCallback(async (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newWidgets));
    }

    // حفظ في Supabase
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

  // تحديث الترتيب من react-grid-layout
  const onLayoutChange = useCallback((layout: Layout[]) => {
    setWidgets(prev => updateWidgetsFromLayout(prev, layout));
  }, []);

  // تبديل ظهور بطاقة
  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetId) => {
    setWidgets(items =>
      items.map(item =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);

  // إعادة الترتيب الافتراضي
  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_LAYOUT);
    if (user?.id) {
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    }
  }, [user?.id]);

  // حفظ عند الخروج من وضع التعديل
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    saveLayout(widgets);
  }, [widgets, saveLayout]);

  // الحصول على layout للـ react-grid-layout
  const gridLayout = widgetsToLayout(widgets);

  return {
    widgets,
    gridLayout,
    isEditMode,
    isLoading,
    setIsEditMode,
    onLayoutChange,
    toggleWidgetVisibility,
    resetToDefault,
    exitEditMode,
    saveLayout,
  };
}
