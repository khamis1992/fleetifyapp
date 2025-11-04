# تحديث بيانات العملاء والعقود من ملف JSON

## نظرة عامة
تم إنشاء نظام شامل لتحديث بيانات العملاء والعقود بناءً على ملف `vehicles_rental_data_enhanced.json`.

## ما تم إنجازه
✅ تم تطبيق دوال SQL المساعدة على قاعدة البيانات
✅ تم إنشاء سكريبت TypeScript شامل للتحديث
✅ تم إنشاء خطة عمل مفصلة

## كيفية التنفيذ

### خطوات سريعة:
```bash
# 1. التأكد من متغيرات البيئة
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# 2. تشغيل السكريبت
npx tsx scripts/update-customers-contracts-from-json.ts
```

## ما الذي يتم تحديثه
- أرقام هواتف العملاء
- أرقام لوحات المركبات  
- تواريخ بدء العقود
- المبالغ الشهرية للعقود

## الملفات
- `supabase/migrations/20251103180000_update_customers_contracts_from_json.sql` - دوال SQL
- `scripts/update-customers-contracts-from-json.ts` - السكريبت الرئيسي
- `.cursor/update-report.json` - التقرير بعد التنفيذ

