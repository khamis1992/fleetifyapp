import { useEffect, useState } from 'react';
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

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<DashboardWidget[]>(DEFAULT_LAYOUT);
  const [screenWidth, setScreenWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل التخطيط المحفوظ من Supabase أو localStorage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        if (user?.id) {
          // محاولة تحميل من Supabase
          const { data, error } = await supabase
            .from('dashboard_layouts')
            .select('layout')
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            const savedLayout = JSON.parse(data.layout);
            setLayout(savedLayout);
            setIsLoading(false);
            return;
          }
        }

        // تحميل من localStorage كبديل
        const savedLayout = localStorage.getItem(STORAGE_KEY);
        if (savedLayout) {
          const parsedLayout = JSON.parse(savedLayout);
          setLayout(parsedLayout);
        } else {
          setLayout(getLayoutByScreenSize(screenWidth));
        }
      } catch (error) {
        console.error('Failed to load layout:', error);
        setLayout(getLayoutByScreenSize(screenWidth));
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [user?.id]);

  // مراقبة تغييرات حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // حفظ التخطيط عند التغيير
  const saveLayout = async (newLayout: DashboardWidget[]) => {
    try {
      setLayout(newLayout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));

      if (user?.id) {
        await supabase
          .from('dashboard_layouts')
          .upsert({
            user_id: user.id,
            layout: JSON.stringify(newLayout),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  // إعادة تعيين التخطيط إلى الافتراضي
  const resetLayout = async () => {
    const defaultLayout = getLayoutByScreenSize(screenWidth);
    await saveLayout(defaultLayout);
  };

  // تحديث رؤية البطاقة
  const toggleWidgetVisibility = async (widgetId: DashboardWidgetId) => {
    const newLayout = layout.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    );
    await saveLayout(newLayout);
  };

  return {
    layout,
    setLayout: saveLayout,
    resetLayout,
    toggleWidgetVisibility,
    isLoading,
    screenWidth,
  };
}
