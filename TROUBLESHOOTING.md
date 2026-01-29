# 🔧 Employee Workspace - Troubleshooting Guide

**الإصدار:** 1.4.0  
**التاريخ:** 28 يناير 2026

---

## ❌ المشكلة: لا يمكن الدخول إلى `/team-management`

### الأسباب المحتملة:

#### 1. الصلاحيات (Permissions) ⚠️
**المشكلة:** المستخدم ليس `admin` أو `manager`

**الحل:**
```sql
-- تحقق من role المستخدم
SELECT role FROM profiles WHERE user_id = 'YOUR_USER_ID';

-- إذا كان null أو 'employee'، قم بتحديثه:
UPDATE profiles 
SET role = 'admin'  -- أو 'manager'
WHERE user_id = 'YOUR_USER_ID';
```

**كيف تعرف user_id؟**
```sql
-- استخدم البريد الإلكتروني
SELECT id FROM auth.users WHERE email = 'your@email.com';
```

---

#### 2. الصفحة غير مسجلة في Routes
**التحقق:**
```typescript
// في src/routes/index.ts
// يجب أن يكون موجود:
const TeamManagement = lazy(() => import('@/pages/TeamManagement'));

// وفي routes array:
{
  path: '/team-management',
  component: TeamManagement,
  lazy: true,
  exact: true,
}
```

**الحل:** تم التسجيل بشكل صحيح ✅

---

#### 3. الصفحة لم يتم إنشاؤها
**التحقق:**
```bash
# تأكد من وجود الملف
ls src/pages/TeamManagement.tsx
```

**الحل:** الملف موجود ✅

---

#### 4. خطأ في الكود
**التحقق:**
```bash
npm run type-check
```

**الحل:** TypeScript compilation نجح ✅

---

## 🔍 خطوات التشخيص

### الخطوة 1: تحقق من role المستخدم
```sql
SELECT 
  u.email,
  p.role,
  p.first_name_ar,
  p.last_name_ar
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'YOUR_EMAIL';
```

**النتيجة المتوقعة:**
- role يجب أن يكون `admin` أو `manager`
- إذا كان null أو `employee`، هذه هي المشكلة!

---

### الخطوة 2: حدّث role المستخدم
```sql
-- احصل على user_id أولاً
SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL';

-- ثم حدّث role
UPDATE profiles 
SET role = 'admin'
WHERE user_id = 'USER_ID_FROM_ABOVE';
```

---

### الخطوة 3: أعد تحميل الصفحة
```
1. اضغط F5 أو Ctrl+Shift+R
2. حاول الدخول مرة أخرى
3. يجب أن تعمل الآن!
```

---

## 🎯 الحل السريع

### إذا كنت admin/owner:

```sql
-- طريقة سريعة لتحديث role
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'YOUR_EMAIL'
);
```

### إذا كنت تختبر محلياً:

```sql
-- اجعل جميع المستخدمين admins للاختبار
UPDATE profiles SET role = 'admin';
```

⚠️ **تحذير:** لا تفعل هذا في الإنتاج!

---

## 📋 Checklist للتحقق

- [ ] المستخدم لديه role = 'admin' أو 'manager'
- [ ] الملف `src/pages/TeamManagement.tsx` موجود
- [ ] Route مسجل في `src/routes/index.ts`
- [ ] TypeScript compilation نجح
- [ ] الصفحة تُحمّل بدون أخطاء في Console

---

## 🐛 أخطاء شائعة أخرى

### الخطأ: "Cannot read property 'role' of null"
**السبب:** profile غير موجود للمستخدم

**الحل:**
```sql
-- أنشئ profile للمستخدم
INSERT INTO profiles (user_id, email, role)
VALUES (
  'USER_ID',
  'user@email.com',
  'admin'
);
```

---

### الخطأ: الصفحة تُحمّل ثم تُعيد التوجيه فوراً
**السبب:** role غير صحيح

**الحل:** راجع الخطوة 1 و 2 أعلاه

---

### الخطأ: "employee_performance_view does not exist"
**السبب:** Database view غير موجود

**الحل:**
```sql
-- طبّق migration
-- راجع: supabase/migrations/20260128000002_employee_workspace_system.sql
```

---

## 💡 نصائح

### للتطوير المحلي:
1. اجعل نفسك `admin` في البداية
2. اختبر جميع الصلاحيات
3. ثم اختبر كـ `manager` و `employee`

### للإنتاج:
1. حدد roles بدقة
2. استخدم RLS policies
3. سجّل جميع التغييرات

---

## 📞 إذا استمرت المشكلة

### افتح Console في المتصفح:
```
F12 → Console
```

**ابحث عن:**
- أخطاء حمراء
- رسائل "Access denied"
- أخطاء في الـ queries

### تحقق من Network:
```
F12 → Network → XHR
```

**ابحث عن:**
- Failed requests (أحمر)
- 401/403 errors (unauthorized)

---

## ✅ الحل النهائي

**الخطوات:**
```sql
-- 1. احصل على user_id
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL';

-- 2. تحقق من profile
SELECT * FROM profiles WHERE user_id = 'USER_ID';

-- 3. حدّث role
UPDATE profiles 
SET role = 'admin'
WHERE user_id = 'USER_ID';

-- 4. تحقق من التحديث
SELECT role FROM profiles WHERE user_id = 'USER_ID';
```

**ثم:**
```
1. أعد تحميل الصفحة (F5)
2. افتح /team-management
3. يجب أن تعمل الآن! ✅
```

---

## 📚 المراجع

- **docs/employee-workspace-system.md** - الدليل الكامل
- **HOW_TO_ASSIGN_CONTRACTS.md** - كيفية تعيين العقود

---

**آخر تحديث:** 28 يناير 2026
