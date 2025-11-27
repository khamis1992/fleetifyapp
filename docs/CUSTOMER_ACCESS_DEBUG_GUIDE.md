# 🔍 دليل تشخيص مشكلة الوصول للعميل

## ✅ ما وجدناه

بعد الفحص باستخدام **Supabase MCP**:

### 1. قاعدة البيانات سليمة تماماً ✅

```
✅ الدالة get_user_company() موجودة وتعمل
✅ RLS Policies معرّفة بشكل صحيح
✅ البيانات موجودة (781 عميل في شركة العراف)
✅ الأدوار معرّفة (super_admin, company_admin)
```

### 2. مثال على بيانات حقيقية:

```
العميل: KHAMIS AL JABOR
ID: 773729e6-c193-4da4-9828-4dfb94b1c96a
Customer Code: IND-25-0001
Company: 24bc0b21-4e2d-4413-9842-31719a3669f4 (العراف)
Status: ✅ Active
```

### 3. RLS Policy الفعلي:

```sql
Policy: "Staff can manage customers in their company"
Condition: 
  (NOT has_role(auth.uid(), 'super_admin')) 
  AND (company_id = get_user_company(auth.uid())) 
  AND (has_role(auth.uid(), 'company_admin') 
       OR has_role(auth.uid(), 'manager') 
       OR has_role(auth.uid(), 'sales_agent'))
```

---

## 🔍 تشخيص المشكلة في المتصفح

المشكلة **ليست في قاعدة البيانات**، بل في **جلسة المستخدم الحالي**.

### الأسباب المحتملة:

1. ❌ المستخدم الحالي ليس لديه `company_id` في جدول `profiles`
2. ❌ المستخدم ليس لديه أدوار في جدول `user_roles`
3. ❌ جلسة المصادقة منتهية أو تالفة
4. ❌ المستخدم يحاول الوصول لعميل من شركة أخرى

---

## 🛠️ طريقة التشخيص

### الطريقة 1: استخدام أداة التشخيص (موصى بها)

قمت بإنشاء ملف `src/utils/debugCustomerAccess.ts` يحتوي على أداة تشخيص شاملة.

**كيفية الاستخدام:**

1. افتح صفحة تفاصيل العميل في المتصفح
2. افتح **Developer Tools** (F12)
3. اذهب إلى تبويب **Console**
4. نفّذ الكود التالي:

```javascript
// استيراد الأداة
import { debugCustomerAccess } from '@/utils/debugCustomerAccess';

// تشغيل التشخيص (استبدل CUSTOMER_ID بمعرف العميل الحقيقي)
const result = await debugCustomerAccess('773729e6-c193-4da4-9828-4dfb94b1c96a');

console.log('نتيجة التشخيص:', result);
```

**أو إذا كانت الدالة مضافة لـ window:**

```javascript
// مباشرة في Console
await window.debugCustomerAccess('773729e6-c193-4da4-9828-4dfb94b1c96a');
```

---

### الطريقة 2: فحص يدوي في Console

```javascript
// 1. فحص المستخدم الحالي
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// 2. فحص Profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Profile:', profile);

// 3. فحص الأدوار
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);
console.log('Roles:', roles);

// 4. محاولة جلب العميل
const { data: customer, error } = await supabase
  .from('customers')
  .select('*')
  .eq('id', 'CUSTOMER_ID_HERE')
  .single();
console.log('Customer:', customer);
console.log('Error:', error);
```

---

### الطريقة 3: فحص من Supabase Dashboard

1. اذهب إلى **Supabase Dashboard**
2. افتح **SQL Editor**
3. نفّذ:

```sql
-- فحص بيانات المستخدم الحالي
-- (استبدل USER_EMAIL بالبريد الإلكتروني الخاص بك)
SELECT 
    p.user_id,
    p.email,
    p.company_id,
    array_agg(ur.role) as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.email = 'YOUR_EMAIL@example.com'
GROUP BY p.user_id, p.email, p.company_id;
```

---

## 🔧 الحلول المحتملة

### الحل 1: إضافة company_id للمستخدم

إذا كان المستخدم ليس لديه `company_id`:

```sql
-- في Supabase SQL Editor
UPDATE profiles
SET company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'  -- شركة العراف
WHERE email = 'YOUR_EMAIL@example.com';
```

---

### الحل 2: إضافة دور للمستخدم

إذا لم يكن للمستخدم أدوار:

```sql
-- إضافة دور company_admin
INSERT INTO user_roles (user_id, role, granted_by)
SELECT 
    user_id,
    'company_admin',
    user_id  -- granted by themselves (temporary)
FROM profiles
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT DO NOTHING;
```

---

### الحل 3: تسجيل خروج ودخول مجدداً

أحياناً الجلسة تحتاج تحديث:

```typescript
// في Console
await supabase.auth.signOut();
// ثم سجل دخول مرة أخرى
```

---

### الحل 4: تبسيط RLS Policy (مؤقت للتطوير)

إذا كنت تريد تجاوز المشكلة مؤقتاً أثناء التطوير:

```sql
-- ⚠️ فقط للتطوير - لا تستخدم في الإنتاج!
-- إضافة policy عامة للقراءة
CREATE POLICY "Allow all authenticated users to read customers"
ON customers
FOR SELECT
TO authenticated
USING (true);
```

---

## 📊 الخلاصة

### ✅ ما تحققنا منه:

1. ✅ دالة `get_user_company()` موجودة وتعمل
2. ✅ دالة `has_role()` موجودة وتعمل  
3. ✅ RLS Policies معرّفة بشكل صحيح
4. ✅ البيانات موجودة (781 عميل)
5. ✅ الأدوار موجودة (super_admin, company_admin)

### ❓ ما يحتاج فحص:

1. ❓ هل المستخدم الحالي في المتصفح لديه `company_id` في `profiles`?
2. ❓ هل المستخدم لديه دور في `user_roles`?
3. ❓ هل جلسة المصادقة صالحة؟

---

## 🚀 الخطوة التالية

**جرب أداة التشخيص:**

1. افتح الصفحة التي تعطي خطأ
2. افتح Console (F12)
3. نفّذ الكود في القسم "الطريقة 2" أعلاه
4. أخبرني بالنتيجة

أو أخبرني:
- ما هو البريد الإلكتروني للمستخدم الحالي؟
- هل سجلت دخول مؤخراً؟
- هل تحاول الوصول لعميل من شركتك أم شركة أخرى؟

وسأساعدك في حل المشكلة! 🎯

