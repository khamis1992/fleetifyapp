# 🔧 حل سريع - لا يمكن الدخول إلى `/team-management`

## ❌ المشكلة
عند محاولة الدخول إلى `http://localhost:8080/team-management`، يتم إعادة التوجيه إلى Dashboard.

## ✅ السبب
الصفحة محمية بـ permissions - فقط `admin` أو `manager` يمكنهم الوصول.

---

## 🚀 الحل السريع (3 خطوات)

### الخطوة 1: افتح Supabase SQL Editor
```
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. أنشئ query جديد
```

### الخطوة 2: نفّذ هذا الـ SQL
```sql
-- استبدل 'your@email.com' ببريدك الإلكتروني
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your@email.com'
);
```

### الخطوة 3: أعد تحميل الصفحة
```
1. ارجع للمتصفح
2. اضغط F5 أو Ctrl+Shift+R
3. افتح http://localhost:8080/team-management
4. يجب أن تعمل الآن! ✅
```

---

## 🔍 كيف تعرف بريدك الإلكتروني؟

### الطريقة 1: من المتصفح
```
1. افتح Console (F12)
2. اكتب: localStorage.getItem('supabase.auth.token')
3. ابحث عن email في الـ token
```

### الطريقة 2: من Supabase
```sql
-- اعرض جميع المستخدمين
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

---

## 📋 SQL Script الكامل

راجع ملف `FIX_PERMISSIONS.sql` للـ script الكامل مع جميع الخيارات.

---

## ✅ التحقق من النجاح

بعد تنفيذ الـ SQL، نفّذ هذا للتحقق:

```sql
SELECT 
  u.email,
  p.role,
  p.first_name_ar
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'your@email.com';
```

**النتيجة المتوقعة:**
```
email: your@email.com
role: admin  ← يجب أن يكون admin أو manager
first_name_ar: ...
```

---

## 🎯 ملاحظات مهمة

### Roles المتاحة:
- `admin` - كل الصلاحيات ✅
- `manager` - إدارة الفريق ✅
- `employee` - مساحة العمل فقط ❌
- `customer` - عميل ❌

### الصفحات المحمية:
- `/team-management` - admin/manager فقط
- `/team-reports` - admin/manager فقط
- `/employee-workspace` - الجميع ✅

---

## 🆘 إذا استمرت المشكلة

### 1. تحقق من Console
```
F12 → Console
ابحث عن: "Access denied. Role: ..."
```

### 2. تحقق من Network
```
F12 → Network → XHR
ابحث عن: profiles query
تحقق من الـ response
```

### 3. تحقق من Database
```sql
-- تأكد من وجود profile
SELECT * FROM profiles WHERE user_id = 'YOUR_USER_ID';

-- إذا لم يكن موجوداً، أنشئه:
INSERT INTO profiles (user_id, email, role)
VALUES ('USER_ID', 'your@email.com', 'admin');
```

---

## 📞 المساعدة

راجع `TROUBLESHOOTING.md` للمزيد من التفاصيل.

---

**الحل السريع:** حدّث role إلى `admin` ثم أعد تحميل الصفحة!
