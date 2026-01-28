# 📝 كيفية تعيين العقود للموظفين

## 🎯 الخطوات البسيطة

---

## الخطوة 1: احصل على معرف الموظف (Profile ID)

افتح **Supabase Dashboard** → **SQL Editor** ونفّذ:

```sql
-- عرض جميع الموظفين
SELECT 
  id AS profile_id,
  user_id,
  first_name,
  last_name,
  email,
  company_id
FROM profiles
ORDER BY first_name;
```

**انسخ `profile_id` للموظف الذي تريد تعيين عقود له.**

---

## الخطوة 2: عيّن العقود

### خيار A: تعيين عقد واحد

```sql
UPDATE contracts 
SET 
  assigned_to_profile_id = 'PASTE_PROFILE_ID_HERE',
  assigned_at = NOW()
WHERE id = 'CONTRACT_ID_HERE';
```

### خيار B: تعيين عدة عقود محددة

```sql
UPDATE contracts 
SET 
  assigned_to_profile_id = 'PASTE_PROFILE_ID_HERE',
  assigned_at = NOW()
WHERE id IN (
  'CONTRACT_ID_1',
  'CONTRACT_ID_2',
  'CONTRACT_ID_3',
  'CONTRACT_ID_4',
  'CONTRACT_ID_5'
);
```

### خيار C: تعيين أول 10 عقود نشطة

```sql
UPDATE contracts 
SET 
  assigned_to_profile_id = 'PASTE_PROFILE_ID_HERE',
  assigned_at = NOW()
WHERE status = 'active'
  AND assigned_to_profile_id IS NULL
LIMIT 10;
```

### خيار D: تعيين عقود عميل معين

```sql
UPDATE contracts 
SET 
  assigned_to_profile_id = 'PASTE_PROFILE_ID_HERE',
  assigned_at = NOW()
WHERE customer_id = 'CUSTOMER_ID_HERE'
  AND status = 'active';
```

---

## الخطوة 3: تحقق من التعيين

```sql
-- عرض العقود المعيّنة للموظف
SELECT 
  c.id,
  c.contract_number,
  c.status,
  c.monthly_amount,
  c.balance_due,
  c.assigned_at,
  p.first_name || ' ' || p.last_name AS employee_name,
  cust.first_name_ar || ' ' || cust.last_name_ar AS customer_name
FROM contracts c
JOIN profiles p ON p.id = c.assigned_to_profile_id
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.assigned_to_profile_id = 'PASTE_PROFILE_ID_HERE'
ORDER BY c.assigned_at DESC;
```

---

## الخطوة 4: اختبر النظام

### أ. سجّل دخول كالموظف

1. سجّل دخول باستخدام حساب الموظف
2. افتح `/dashboard`
3. يجب أن ترى Widget "💼 مساحة عملي"

### ب. افتح مساحة العمل

1. اضغط "انتقل إلى مساحة عملي"
2. أو اذهب إلى `/employee-workspace`
3. يجب أن ترى:
   - عدد العقود المعيّنة
   - العقود ذات الأولوية (إذا كان هناك متأخرات)
   - قائمة العقود الكاملة

---

## 💡 نصائح

### للاختبار السريع
```sql
-- عيّن 5 عقود عشوائية نشطة
UPDATE contracts 
SET 
  assigned_to_profile_id = 'EMPLOYEE_PROFILE_ID',
  assigned_at = NOW()
WHERE status = 'active'
  AND assigned_to_profile_id IS NULL
ORDER BY RANDOM()
LIMIT 5;
```

### لتوزيع متوازن
```sql
-- احصل على عدد العقود لكل موظف
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name AS name,
  COUNT(c.id) AS assigned_contracts
FROM profiles p
LEFT JOIN contracts c ON c.assigned_to_profile_id = p.id
WHERE p.company_id = 'YOUR_COMPANY_ID'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY assigned_contracts ASC;
```

### لإلغاء تعيين
```sql
-- إلغاء تعيين عقد
UPDATE contracts 
SET 
  assigned_to_profile_id = NULL,
  assigned_at = NULL
WHERE id = 'CONTRACT_ID';
```

---

## 🎯 مثال عملي كامل

```sql
-- 1. احصل على معرف الموظف
SELECT id, first_name, last_name 
FROM profiles 
WHERE email = 'ahmed@company.com';
-- النتيجة: id = '123e4567-e89b-12d3-a456-426614174000'

-- 2. عيّن 10 عقود له
UPDATE contracts 
SET 
  assigned_to_profile_id = '123e4567-e89b-12d3-a456-426614174000',
  assigned_at = NOW(),
  assignment_notes = 'تعيين أولي - عقود منطقة الرياض'
WHERE status = 'active'
  AND assigned_to_profile_id IS NULL
LIMIT 10;

-- 3. تحقق
SELECT COUNT(*) AS assigned_count
FROM contracts 
WHERE assigned_to_profile_id = '123e4567-e89b-12d3-a456-426614174000';
-- النتيجة: 10 عقود
```

---

## 🚨 استكشاف الأخطاء

### المشكلة: Widget لا يظهر
**السبب:** لا توجد عقود معيّنة  
**الحل:** عيّن عقود للموظف (راجع الخطوة 2)

### المشكلة: صفحة فارغة
**السبب:** لا توجد عقود معيّنة  
**الحل:** عيّن عقود للموظف

### المشكلة: خطأ في SQL
**السبب:** profile_id خاطئ  
**الحل:** تأكد من نسخ profile_id الصحيح من الخطوة 1

---

## ✅ تم!

بعد تعيين العقود، النظام سيعمل بالكامل! 🎉

**الخطوة التالية:** سجّل دخول كموظف واختبر `/employee-workspace`

---

**آخر تحديث:** 28 يناير 2026
