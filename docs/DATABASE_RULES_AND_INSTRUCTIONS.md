# 📜 قواعد وإرشادات التعامل مع قاعدة البيانات

## 🎯 القواعد الذهبية

### القاعدة #1: **لا تخمين - دائماً تحقق**
```
❌ افتراض البنية من اسم الجدول
❌ نسخ كود من migration قديم
❌ استخدام أسماء أعمدة "منطقية"

✅ فحص البنية الفعلية أولاً
✅ استخدام information_schema
✅ التحقق من Migrations المطبقة
```

### القاعدة #2: **migrations قد تتعارض**
- يمكن أن يوجد migration واحد يُعيد تعريف جدول أنشأه migration آخر
- `CREATE TABLE IF NOT EXISTS` قد تخفي تعارضات
- دائماً تحقق من التاريخ **والوقت** في اسم الملف

### القاعدة #3: **البنية الفعلية هي المرجع**
```
الأولوية:
1. ما هو موجود في قاعدة البيانات الفعلية (production/staging)
2. آخر migration مطبق
3. Migration files (قد لا تكون كلها مطبقة)
```

---

## 🔧 الأدوات الإلزامية

### 1. فحص البنية قبل أي تعديل
```sql
-- دائماً نفذ هذا أولاً
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'YOUR_TABLE_NAME'
ORDER BY ordinal_position;
```

### 2. فحص Foreign Keys
```sql
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'YOUR_TABLE_NAME';
```

### 3. فحص Constraints
```sql
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.YOUR_TABLE_NAME'::regclass;
```

---

## 📋 Checklist قبل كتابة Migration

```
□ فحصت البنية الحالية باستخدام information_schema
□ تحققت من جميع Foreign Keys
□ تحققت من Constraints
□ فحصت Migrations المطبقة السابقة
□ تأكدت من عدم وجود تعارضات
□ اختبرت على قاعدة بيانات تجريبية
□ كتبت ROLLBACK للتراجع إذا لزم الأمر
```

---

## ⚠️ الأخطاء الشائعة

### ❌ الخطأ 1: الافتراض
```sql
-- ❌ خطأ
UPDATE users SET last_login = NOW();
-- افترضت وجود عمود last_login بدون تحقق

-- ✅ صحيح
-- أولاً: تحقق
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_login';
-- ثم: نفذ
UPDATE users SET last_login = NOW();
```

### ❌ الخطأ 2: نسخ كود قديم
```sql
-- ❌ خطأ
-- نسخت من migration قديم بدون تحقق
ALTER TABLE orders ADD COLUMN customer_phone TEXT;
-- لكن العمود موجود فعلاً!

-- ✅ صحيح
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;
```

### ❌ الخطأ 3: تجاهل التعارضات
```sql
-- ❌ خطأ
CREATE TABLE products (...);
-- بدون التحقق من وجود جدول بنفس الاسم

-- ✅ صحيح
CREATE TABLE IF NOT EXISTS products (...);
-- أو: فحص أولاً ثم قرر ما تفعل
```

---

## 🎓 سيناريوهات وحلولها

### سيناريو 1: عمود موجود في Migration لكن غير موجود في DB
**المشكلة:**
```
Migration A: ALTER TABLE users ADD COLUMN age INTEGER;
قاعدة البيانات: لا يوجد عمود age
```

**الأسباب المحتملة:**
1. Migration A لم يُطبق
2. Migration B حذف العمود لاحقاً
3. تم عمل rollback

**الحل:**
```sql
-- 1. تحقق من الوضع الحالي
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'age';

-- 2. أضف العمود مع IF NOT EXISTS
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- 3. أو: اعمل مع البنية الحالية
```

### سيناريو 2: جدول بنسختين مختلفتين
**المشكلة:** (مثل reminder_schedules)
```
Migration A: CREATE TABLE x (col1, col2, col3);
Migration B: CREATE TABLE x (col4, col5, col6);
```

**الحل:**
```sql
-- 1. فحص البنية الفعلية
\d+ table_name

-- 2. قرر الاستراتيجية:
--    أ) توحيد: أضف الأعمدة الناقصة
--    ب) اختيار: اعمل مع واحدة فقط
--    ج) إعادة بناء: DROP و CREATE من جديد

-- 3. نفذ بحذر مع backup
```

---

## 🛡️ قواعد الأمان

### 1. دائماً backup قبل تعديلات كبيرة
```bash
pg_dump -h HOST -U USER -d DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. اختبر على staging أولاً
```
❌ لا تطبق migrations مباشرة على production
✅ اختبر على staging/development أولاً
✅ تحقق من النتائج
✅ ثم طبق على production
```

### 3. اكتب ROLLBACK دائماً
```sql
-- في بداية Migration
BEGIN;

-- تعديلاتك هنا
ALTER TABLE ...

-- في النهاية
-- COMMIT; -- علق هذا عند الاختبار
-- ROLLBACK; -- استخدم هذا للتراجع
```

---

## 📊 نموذج عملية صحيحة

### مثال: إضافة نظام تنبيهات جديد

#### 1️⃣ الفحص (30 دقيقة)
```sql
-- فحص الجداول الحالية
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%reminder%';

-- فحص البنية
\d+ reminder_schedules

-- فحص Migrations المطبقة
-- (حسب نظام تتبع migrations لديك)
```

#### 2️⃣ التحليل (15 دقيقة)
```
- ما الموجود؟
- ما المطلوب؟
- ما الفجوة؟
- هل يوجد تعارضات؟
```

#### 3️⃣ التخطيط (30 دقيقة)
```sql
-- خطة التعديلات
-- 1. إضافة عمود X
-- 2. إنشاء جدول Y
-- 3. ربط Foreign Key
-- 4. إنشاء Index
```

#### 4️⃣ التنفيذ على Staging (1 ساعة)
```bash
# اختبار Migration
psql -h staging -U user -d db -f migration.sql

# فحص النتائج
psql -h staging -U user -d db -c "SELECT COUNT(*) FROM new_table;"
```

#### 5️⃣ المراجعة (30 دقيقة)
```
✅ البنية صحيحة
✅ البيانات سليمة
✅ Foreign Keys تعمل
✅ Indexes موجودة
✅ RLS Policies مطبقة
```

#### 6️⃣ التطبيق على Production (مع backup)
```bash
# Backup
pg_dump production > backup.sql

# تطبيق
psql production < migration.sql

# تحقق
psql production -c "SELECT version FROM migrations ORDER BY version DESC LIMIT 1;"
```

---

## 🎯 خلاصة المبادئ

### 1. **تحقق دائماً**
```
لا تفترض شيئاً
تحقق من كل شيء
استخدم information_schema
```

### 2. **وثّق كل شيء**
```
اكتب تعليقات واضحة
سجل القرارات
احتفظ بسجل التغييرات
```

### 3. **اختبر قبل التطبيق**
```
staging أولاً
production آخراً
backup دائماً
```

### 4. **كن حذراً مع Migrations**
```
قد تتعارض
قد لا تُطبق كلها
البنية الفعلية هي المرجع
```

---

## 📞 عند الشك

إذا كنت **غير متأكد 100%**:

1. ✅ **توقف**
2. ✅ **افحص** البنية الفعلية
3. ✅ **اسأل** من لديه صلاحيات الاطلاع على production
4. ✅ **اختبر** على staging
5. ✅ **وثّق** قرارك

**لا تخمن أبداً!**

---

**تاريخ الإنشاء**: 05 فبراير 2025  
**آخر تحديث**: 05 فبراير 2025  
**الحالة**: نشط ✅  
**الإلزام**: على جميع المطورين

---

## ⚡ مختصر سريع (للمراجعة السريعة)

```sql
-- قبل أي تعديل، نفذ:
\d+ table_name                           -- بنية الجدول
\di table_name*                          -- Indexes
\df *function_name*                      -- Functions
SELECT * FROM information_schema.columns -- الأعمدة
  WHERE table_name = 'YOUR_TABLE';
```

```
القواعد:
1. تحقق أولاً
2. وثّق ثانياً
3. اختبر ثالثاً
4. طبّق رابعاً
5. backup دائماً
```

**Remember: The database knows better than your assumptions!** 🎯

