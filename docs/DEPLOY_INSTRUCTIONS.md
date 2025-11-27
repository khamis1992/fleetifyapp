# 🚀 تعليمات النشر الصحيحة

## ❌ خطأ شائع

**لا تحاول تشغيل Edge Function بـ psql!**

```bash
# ❌ خطأ - سيعطي syntax error
psql -f supabase/functions/send-whatsapp-reminders/index.ts
```

---

## ✅ الطريقة الصحيحة

### الخطوة 1: تطبيق SQL Migrations فقط

```bash
# تطبيق Migration الجديد (SQL فقط)
npx supabase db push

# أو يدوياً
psql -h your-host -U postgres -d postgres \
  -f supabase/migrations/20250205_fix_whatsapp_reminders_grouping.sql
```

### الخطوة 2: نشر Edge Function

```bash
# نشر Edge Function (TypeScript/Deno)
npx supabase functions deploy send-whatsapp-reminders
```

---

## 📂 ما الذي يُنفذ أين؟

### SQL Migrations (تُنفذ بـ psql أو supabase db push)
```
✅ supabase/migrations/*.sql
   - 20250205_fix_whatsapp_reminders_grouping.sql
   - أي ملف ينتهي بـ .sql
```

### Edge Functions (تُنشر بـ supabase functions deploy)
```
✅ supabase/functions/*/index.ts
   - send-whatsapp-reminders/index.ts
   - أي ملف TypeScript في functions/
```

### SQL Scripts للفحص والاختبار (تُنفذ بـ psql)
```
✅ fix_whatsapp_issues.sql
✅ quick_fix_script.sql
✅ update_correct_phone_numbers.sql
✅ test_whatsapp_reminders_system.sql
```

---

## 🎯 الخطوات الصحيحة بالترتيب

### 1. تطبيق SQL Migration
```bash
npx supabase db push

# أو يدوياً
psql -h YOUR_HOST -U postgres -d postgres \
  -f supabase/migrations/20250205_fix_whatsapp_reminders_grouping.sql
```

✅ **التحقق من النجاح**:
```sql
SELECT COUNT(*) FROM pg_proc 
WHERE proname IN (
    'get_grouped_reminders_for_today',
    'generate_grouped_reminder_message',
    'queue_daily_reminders',
    'validate_customer_phone_numbers'
);
-- يجب أن يرجع: 4
```

### 2. تشغيل سكريبت الإصلاح السريع
```bash
psql -h YOUR_HOST -U postgres -d postgres \
  -f quick_fix_script.sql
```

### 3. إصلاح أرقام الهواتف (يدوي)
```sql
-- راجع update_correct_phone_numbers.sql
-- أضف الأرقام الصحيحة ثم نفذ
```

### 4. نشر Edge Function (ليس psql!)
```bash
# الطريقة الصحيحة
npx supabase functions deploy send-whatsapp-reminders

# ليس:
# psql -f supabase/functions/send-whatsapp-reminders/index.ts ❌
```

✅ **التحقق من النجاح**:
- اذهب إلى Supabase Dashboard
- Edge Functions → send-whatsapp-reminders
- تحقق من آخر Deployment

### 5. الاختبار
```bash
# اختبار شامل (SQL)
psql -h YOUR_HOST -U postgres -d postgres \
  -f test_whatsapp_reminders_system.sql

# اختبار من الواجهة
# افتح: /legal/whatsapp-reminders
```

---

## 🔍 كيف تعرف الفرق؟

### SQL Files (.sql)
```sql
-- هذه ملفات SQL
CREATE FUNCTION my_function() ...
SELECT * FROM ...
UPDATE table SET ...
```
**يُنفذ بـ**: `psql` أو `npx supabase db push`

### TypeScript Files (.ts)
```typescript
// هذه ملفات TypeScript/JavaScript
import { serve } from "...";
export const handler = ...
Deno.serve(async (req) => {
```
**يُنشر بـ**: `npx supabase functions deploy`

---

## 💡 نصيحة

إذا رأيت:
- `import` أو `export` أو `async` في أول الملف → **TypeScript** → استخدم `functions deploy`
- `CREATE` أو `SELECT` أو `UPDATE` في أول الملف → **SQL** → استخدم `psql`

---

## ⚡ أوامر سريعة

```bash
# كل SQL Migrations
npx supabase db push

# Edge Function واحد
npx supabase functions deploy send-whatsapp-reminders

# كل Edge Functions
npx supabase functions deploy

# فحص SQL
psql -h HOST -U postgres -d postgres -f test_file.sql
```

---

## 🆘 إذا واجهت مشاكل

### المشكلة: `supabase command not found`
```bash
# تثبيت Supabase CLI
npm install -g supabase
```

### المشكلة: `Authentication failed`
```bash
# تسجيل الدخول
npx supabase login

# ربط المشروع
npx supabase link --project-ref YOUR_PROJECT_ID
```

### المشكلة: `Function deployment failed`
```bash
# تحقق من:
# 1. أن الملف في المسار الصحيح
ls -la supabase/functions/send-whatsapp-reminders/index.ts

# 2. لا توجد أخطاء syntax
cat supabase/functions/send-whatsapp-reminders/index.ts | head -20

# 3. Deno.json موجود
ls -la supabase/functions/deno.json
```

---

**الخلاصة**: 
- SQL → `psql` أو `db push`
- TypeScript → `functions deploy`

**لا تخلط بينهما!** 😊

