-- Fix Permissions for Team Management Access
-- تصليح الصلاحيات للوصول إلى صفحة إدارة الفريق

-- ═══════════════════════════════════════════════════════════
-- الخطوة 1: تحقق من المستخدمين الحاليين
-- ═══════════════════════════════════════════════════════════

SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.role,
  p.first_name_ar,
  p.last_name_ar
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════
-- الخطوة 2: حدّث role لمستخدم معين
-- ═══════════════════════════════════════════════════════════

-- استبدل 'your@email.com' ببريدك الإلكتروني
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your@email.com'
);

-- ═══════════════════════════════════════════════════════════
-- الخطوة 3: تحقق من التحديث
-- ═══════════════════════════════════════════════════════════

SELECT 
  u.email,
  p.role
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'your@email.com';

-- ═══════════════════════════════════════════════════════════
-- خيارات الـ Roles المتاحة:
-- ═══════════════════════════════════════════════════════════

-- 'admin'    - كل الصلاحيات
-- 'manager'  - إدارة الفريق + عرض التقارير
-- 'employee' - مساحة العمل فقط
-- 'customer' - عميل (لا يمكنه الوصول)

-- ═══════════════════════════════════════════════════════════
-- للاختبار المحلي فقط: اجعل الكل admins
-- ═══════════════════════════════════════════════════════════

-- ⚠️ لا تستخدم في الإنتاج!
-- UPDATE profiles SET role = 'admin' WHERE role != 'customer';

-- ═══════════════════════════════════════════════════════════
-- إنشاء profile جديد إذا لم يكن موجوداً
-- ═══════════════════════════════════════════════════════════

-- إذا كان المستخدم موجود في auth.users لكن ليس له profile
INSERT INTO profiles (user_id, email, role, first_name_ar, last_name_ar)
SELECT 
  u.id,
  u.email,
  'admin',
  'الاسم الأول',
  'الاسم الأخير'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = u.id
)
AND u.email = 'your@email.com';

-- ═══════════════════════════════════════════════════════════
-- التحقق النهائي
-- ═══════════════════════════════════════════════════════════

SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Total Profiles',
  COUNT(*)
FROM profiles
UNION ALL
SELECT 
  'Admins',
  COUNT(*)
FROM profiles
WHERE role = 'admin'
UNION ALL
SELECT 
  'Managers',
  COUNT(*)
FROM profiles
WHERE role = 'manager'
UNION ALL
SELECT 
  'Employees',
  COUNT(*)
FROM profiles
WHERE role = 'employee';

-- ═══════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════

-- 1. يجب أن يكون لكل user في auth.users سجل في profiles
-- 2. role يجب أن يكون أحد: admin, manager, employee, customer
-- 3. للوصول إلى /team-management، role يجب أن يكون admin أو manager
-- 4. بعد التحديث، أعد تحميل الصفحة (F5)

-- ═══════════════════════════════════════════════════════════
-- انتهى
-- ═══════════════════════════════════════════════════════════
