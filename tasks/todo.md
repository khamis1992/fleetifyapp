# Task Plan: إصلاح تنبيهات الأسطول (Fleet Alerts)

## Problem
التنبيهات لا تعرض المستندات المنتهية، فقط تعرض ما سينتهي خلال 30 يوم.

البيانات الفعلية:
- تأمين منتهي: 202 مركبة (لا تظهر!)
- فحص منتهي: 122 مركبة (لا تظهر!)
- فحص ينتهي قريباً: 3 مركبات (تظهر)

## Goal
تعديل الكود ليعرض المستندات المنتهية + المستندات التي ستنتهي قريباً.

## Phases (Todo)
- [x] 1. تعديل `useVehicleStats.ts` لإضافة عد المستندات المنتهية
- [x] 2. تعديل `AlertsPanel` في `FleetSmartDashboard.tsx` لعرض المنتهي والقريب من الانتهاء
- [x] 3. اختبار التنبيهات

## Review
### Changes summary:
1. **useVehicleStats.ts**: إضافة متغيرات `insuranceExpired` و `registrationExpired` لعد المستندات المنتهية
2. **FleetSmartDashboard.tsx**: تعديل `AlertsPanel` لعرض:
   - إجمالي التأمين (منتهي + ينتهي قريباً) مع تفاصيل فرعية
   - إجمالي الفحص (منتهي + ينتهي قريباً) مع تفاصيل فرعية
   - تغيير النص من "ينتهي قريباً" إلى "منتهي أو ينتهي قريباً"

### Files touched:
- `src/hooks/useVehicleStats.ts`
- `src/components/fleet/FleetSmartDashboard.tsx`

### Expected Results:
- تأمين: 202 (202 منتهي • 0 ينتهي قريباً)
- فحص: 125 (122 منتهي • 3 ينتهي قريباً)
- صيانة متأخرة: 0
