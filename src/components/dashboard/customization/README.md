# مكونات تخصيص لوحة التحكم

هذا المجلد يحتوي على مكونات متقدمة لتخصيص وتحسين تجربة المستخدم في لوحة تحكم FleetifyApp.

## المكونات

### 1. DashboardCustomizer

مكون لتخصيص لوحة التحكم، يسمح للمستخدمين بتعديل:
- ترتيب الأدوات
- عرض/إخفاء الأدوات
- اختيار التخطيط (مضغوط، قياسي، موسع)
- تغيير المظهر (فاتح/داكن)
- تفعيل الوضع المضغوط

```tsx
import { DashboardCustomizer, getDashboardSettings } from '@/components/dashboard/customization';

const settings = getDashboardSettings();

<DashboardCustomizer
  isOpen={isCustomizerOpen}
  onClose={() => setIsCustomizerOpen(false)}
  onSettingsChange={handleSettingsChange}
  currentSettings={settings}
/>
```

### 2. HierarchicalDashboard

مكون يعرض البيانات بشكل هرمي حسب الأولوية:
- المقاييس الحرجة (دائماً مفتوحة)
- المقاييس الهامة (مفتوحة افتراضياً)
- المقاييس العامة (مغلقة افتراضياً)

```tsx
import { HierarchicalDashboard } from '@/components/dashboard/customization';

<HierarchicalDashboard />
```

### 3. SmartInsights

مكون يوفر رؤى ذكية وتحليلات للبيانات:
- تحليل أداء المركبات
- تحديد العقود المنتهية
- توقعات الإيرادات
- اقتراحات ذكية لتحسين الأداء

```tsx
import { SmartInsights } from '@/components/dashboard/customization';

<SmartInsights compact={false} />
```

### 4. OptimizedDashboard

مركز محسّن لتحسين أداء لوحة التحكم:
- تحميل البيانات بشكل هرمي (حرجة، ثانوية، ثالثية)
- التخزين المؤقت الذكي
- التحديث في الوقت الفعلي
- دعم وضع العمل دون اتصال

```tsx
import { OptimizedDashboard } from '@/components/dashboard/customization';

<OptimizedDashboard />
```

### 5. MobileOptimizedDashboard

مخصص للأجهزة المحمولة مع:
- أوضاع عرض مختلفة (شبكة، قائمة، مضغوط)
- قائمة تنقل سريعة
- تصميم متجاوب للشاشات الصغيرة
- إيماءات اللمس

```tsx
import { MobileOptimizedDashboard } from '@/components/dashboard/customization';

<MobileOptimizedDashboard />
```

### 6. EnhancedBentoDashboard

مدير متقدم يجمع كل المكونات السابقة:
- التبديل بين أوضاع العرض المختلفة
- تخصيص كامل للوحة التحكم
- رؤى ذكية مدمجة
- أداء محسّن

```tsx
import { EnhancedBentoDashboard } from '@/components/dashboard/bento';

<EnhancedBentoDashboard />
```

## الخطافات (Hooks)

### useMediaQuery

خطاف للاستماع إلى استعلامات الوسائط:

```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
const isDesktop = useMediaQuery('(min-width: 1025px)');
```

### useIsMobile, useIsTablet, useIsDesktop

مختصرات للتحقق من نوع الجهاز:

```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery';

const isMobile = useIsMobile();
const isTablet = useIsTablet();
const isDesktop = useIsDesktop();
```

### useBreakpoint

خطاف للحصول على نقطة التوقف الحالية:

```tsx
import { useBreakpoint } from '@/hooks/useMediaQuery';

const breakpoint = useBreakpoint(); // 'mobile' | 'tablet' | 'desktop'
```

## التخصيص

### إعدادات لوحة التحكم

يمكن تخصيص لوحة التحكم عبر كائن الإعدادات:

```tsx
const dashboardSettings = {
  layout: 'standard', // 'compact', 'standard', 'expanded'
  widgets: {
    stats: { visible: true, order: 1 },
    performanceChart: { visible: true, order: 2 },
    fleetStatus: { visible: true, order: 3 },
    maintenanceSchedule: { visible: true, order: 4 },
    reservationsCalendar: { visible: true, order: 5 },
    revenueForecast: { visible: true, order: 6 },
    recentActivities: { visible: true, order: 7 }
  },
  theme: 'light', // 'light', 'dark'
  compactMode: false
};
```

### التخزين المؤقت

يتم حفظ إعدادات المستخدم في التخزين المحلي للمتصفح. يمكن استرجاعها عبر:

```tsx
import { getDashboardSettings } from '@/components/dashboard/customization';

const settings = getDashboardSettings();
```

## الأداء

### التخزين المؤقت الذكي

- البيانات الحرجة: 1 دقيقة
- البيانات الثانوية: 5 دقائق
- البيانات الثالثية: 15 دقيقة

### التحميل التدريجي

يتم تحميل البيانات بشكل هرمي لتحسين الأداء:
1. البيانات الحرجة أولاً
2. البيانات الثانوية بعد ذلك
3. البيانات الثالثية أخيراً

## التجاوب

### الأجهزة المحمولة

- عرض شبكي (2 أعمدة)
- عرض قائمة (بشكل عمودي)
- عرض مضغوط (بطاقات صغيرة)

### الأجهزة اللوحية

- عرض شبكي (3 أعمدة)
- تكييف العناصر التفاعلية

### أجهزة الكمبيوتر

- عرض شبكي (4 أعمدة)
- ميزات تفاعلية كاملة
- رسوم بيانية متقدمة

## الوصول

يمكن الوصول إلى جميع المكونات عبر:

```tsx
import {
  DashboardCustomizer,
  HierarchicalDashboard,
  SmartInsights,
  OptimizedDashboard,
  MobileOptimizedDashboard
} from '@/components/dashboard/customization';
```
