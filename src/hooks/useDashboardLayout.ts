import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  colSpan: number;
  visible: boolean;
}

// الترتيب الافتراضي للبطاقات
const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: 'stats-vehicles', title: 'إجمالي المركبات', colSpan: 3, visible: true },
  { id: 'stats-contracts', title: 'العقود النشطة', colSpan: 3, visible: true },
  { id: 'stats-customers', title: 'إجمالي العملاء', colSpan: 3, visible: true },
  { id: 'stats-revenue', title: 'إيرادات الشهر', colSpan: 3, visible: true },
  { id: 'chart-revenue', title: 'الأداء المالي', colSpan: 5, visible: true },
  { id: 'chart-fleet', title: 'حالة الأسطول', colSpan: 3, visible: true },
  { id: 'maintenance', title: 'جدول الصيانة', colSpan: 4, visible: true },
  { id: 'calendar', title: 'تقويم الحجوزات', colSpan: 4, visible: true },
  { id: 'forecast', title: 'توقعات الإيرادات', colSpan: 4, visible: true },
  { id: 'activities', title: 'النشاطات الأخيرة', colSpan: 4, visible: true },
];

const STORAGE_KEY = 'dashboard_layout';

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل التخصيصات من localStorage أو Supabase
  useEffect(() => {
    const loadLayout = async () => {
      setIsLoading(true);
      
      try {
        // أولاً: محاولة التحميل من localStorage
        const localLayout = localStorage.getItem(`${STORAGE_KEY}_${user?.id}`);
        if (localLayout) {
          const parsed = JSON.parse(localLayout);
          // التأكد من وجود جميع البطاقات (في حال إضافة بطاقات جديدة)
          const mergedLayout = mergeLayouts(parsed, DEFAULT_LAYOUT);
          setLayout(mergedLayout);
        }

        // ثانياً: محاولة التحميل من Supabase (للمزامنة بين الأجهزة)
        if (user?.id) {
          const { data } = await supabase
            .from('user_preferences')
            .select('dashboard_layout')
            .eq('user_id', user.id)
            .single();

          if (data?.dashboard_layout) {
            const cloudLayout = JSON.parse(data.dashboard_layout);
            const mergedLayout = mergeLayouts(cloudLayout, DEFAULT_LAYOUT);
            setLayout(mergedLayout);
            // تحديث localStorage
            localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(mergedLayout));
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

  // دمج التخطيط المحفوظ مع الافتراضي (لإضافة بطاقات جديدة)
  const mergeLayouts = (saved: DashboardWidget[], defaults: DashboardWidget[]): DashboardWidget[] => {
    const savedIds = new Set(saved.map(w => w.id));
    const newWidgets = defaults.filter(w => !savedIds.has(w.id));
    return [...saved, ...newWidgets];
  };

  // حفظ التخصيصات
  const saveLayout = useCallback(async (newLayout: DashboardWidget[]) => {
    setLayout(newLayout);
    
    // حفظ في localStorage
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newLayout));
    }

    // حفظ في Supabase (بشكل غير متزامن)
    if (user?.id) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            dashboard_layout: JSON.stringify(newLayout),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Failed to save layout to cloud:', error);
      }
    }
  }, [user?.id]);

  // إعادة الترتيب عند السحب والإفلات
  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setLayout((items) => {
      const oldIndex = items.findIndex(item => item.id === activeId);
      const newIndex = items.findIndex(item => item.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return items;

      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      
      return newItems;
    });
  }, []);

  // تبديل ظهور بطاقة
  const toggleWidgetVisibility = useCallback((widgetId: DashboardWidgetId) => {
    setLayout((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);

  // إعادة الترتيب الافتراضي
  const resetToDefault = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    if (user?.id) {
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    }
  }, [user?.id]);

  // حفظ التغييرات عند الخروج من وضع التعديل
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    saveLayout(layout);
  }, [layout, saveLayout]);

  return {
    layout,
    isEditMode,
    isLoading,
    setIsEditMode,
    reorderWidgets,
    toggleWidgetVisibility,
    resetToDefault,
    exitEditMode,
    saveLayout,
  };
}

