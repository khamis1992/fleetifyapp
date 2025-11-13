# 🧪 دليل الاختبارات - FleetifyApp

## نظرة عامة

هذا المجلد يحتوي على جميع الاختبارات الأمنية والوظيفية لـ FleetifyApp.

---

## 📁 محتويات المجلد

| الملف | الوصف | النوع |
|------|-------|------|
| `rls_security_tests.sql` | اختبارات Row Level Security | SQL |
| `permissions_tests.md` | اختبارات الصلاحيات (RBAC) | Manual |
| `README.md` | هذا الملف | Documentation |

---

## 🚀 كيفية تشغيل الاختبارات

### 1. اختبارات RLS (قاعدة البيانات)

#### المتطلبات:
- الوصول إلى قاعدة البيانات
- صلاحيات Super Admin

#### الخطوات:

**الطريقة 1: عبر Supabase Dashboard**
```bash
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. افتح ملف rls_security_tests.sql
4. انسخ المحتوى
5. الصق في SQL Editor
6. اضغط Run
7. راجع النتائج
```

**الطريقة 2: عبر psql**
```bash
# تشغيل الاختبارات
psql -h <SUPABASE_HOST> \
     -U postgres \
     -d postgres \
     -f tests/rls_security_tests.sql

# مثال
psql -h db.project.supabase.co \
     -U postgres \
     -d postgres \
     -f tests/rls_security_tests.sql
```

**الطريقة 3: عبر Supabase MCP**
```bash
# استخدام manus-mcp-cli
manus-mcp-cli tool call execute_sql \
  --server supabase \
  --input '{"sql": "..."}'
```

#### النتائج المتوقعة:
```
Test 1.1: User A sees only Company A contracts - PASS
Test 1.2: User B sees only Company B contracts - PASS
Test 1.3: Super Admin sees all contracts - PASS
Test 2.1: Customer data isolation - PASS
Test 3.1: Vehicle data isolation - PASS
Test 4.1: Invoice data isolation - PASS
Test 5.1: Payment data isolation - PASS
Test 6.1: Employee data isolation - PASS
Test 7.1: Audit log data isolation - PASS
Test 8.1: user_company_id() function - PASS
Test 9.1: Cross-company access prevention - PASS
Test 10.1: Super Admin sees all data - PASS

Total Tests: 10
Expected Result: All tests should PASS
```

---

### 2. اختبارات الصلاحيات (يدوية)

#### المتطلبات:
- حسابات اختبار بجميع الأدوار (7 أدوار)
- بيانات اختبار لشركتين على الأقل
- متصفح حديث

#### الخطوات:

1. **إنشاء حسابات اختبار**
```sql
-- تشغيل في Supabase SQL Editor
INSERT INTO companies (id, name) VALUES
  ('test-company-a', 'Test Company A'),
  ('test-company-b', 'Test Company B');

INSERT INTO users (email, company_id, role) VALUES
  ('superadmin@test.com', NULL, 'super_admin'),
  ('admin@test.com', 'test-company-a', 'company_admin'),
  ('manager@test.com', 'test-company-a', 'company_manager'),
  ('dept_manager@test.com', 'test-company-a', 'manager'),
  ('employee@test.com', 'test-company-a', 'employee'),
  ('accountant@test.com', 'test-company-a', 'accountant'),
  ('viewer@test.com', 'test-company-a', 'viewer');
```

2. **اتباع دليل الاختبارات**
- افتح `permissions_tests.md`
- اتبع الخطوات لكل اختبار
- سجل النتائج في الجدول

3. **تقرير النتائج**
```markdown
# تقرير اختبارات الصلاحيات

**التاريخ**: [DATE]

## النتائج
- Test 1: PASS ✅
- Test 2: PASS ✅
- Test 3: PASS ✅
...

## الملخص
- الإجمالي: 14 اختبار
- نجح: 14
- فشل: 0
- النسبة: 100%
```

---

## 📊 أنواع الاختبارات

### 1. اختبارات الأمان (Security Tests)
- ✅ Row Level Security (RLS)
- ✅ عزل البيانات بين الشركات
- ✅ منع الوصول غير المصرح به
- ✅ محاولات التلاعب

### 2. اختبارات الصلاحيات (Permission Tests)
- ✅ صلاحيات الصفحات
- ✅ صلاحيات الأزرار
- ✅ صلاحيات API
- ✅ صلاحيات الأدوار

### 3. اختبارات الوظائف (Functional Tests)
- ✅ Audit Logging
- ✅ CRUD Operations
- ✅ Approval Workflows
- ✅ Data Validation

---

## 🎯 معايير النجاح

### اختبارات RLS
- ✅ جميع الاختبارات PASS (10/10)
- ✅ عزل البيانات بين الشركات
- ✅ Super Admin يرى جميع البيانات
- ✅ لا توجد أخطاء SQL

### اختبارات الصلاحيات
- ✅ جميع الاختبارات PASS (14/14)
- ✅ الصفحات المحمية تعمل
- ✅ الأزرار المحمية تعمل
- ✅ محاولات التلاعب تفشل

---

## 🐛 إصلاح المشاكل

### مشكلة: اختبار RLS فشل

**الأعراض**:
```
Test 1.1: User A sees only Company A contracts - FAIL
```

**الحلول**:
1. تحقق من تفعيل RLS على الجدول
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'contracts';
```

2. تحقق من سياسات RLS
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'contracts';
```

3. أعد تطبيق سياسات RLS
```sql
-- من ملف enable_rls_security.sql
```

---

### مشكلة: صفحة محمية يمكن الوصول إليها

**الأعراض**:
- مستخدم بدون صلاحية يمكنه الوصول لصفحة محمية

**الحلول**:
1. تحقق من `ProtectedRoute` في الصفحة
```tsx
<ProtectedRoute requiredPermissions={['permission_name']}>
  <YourPage />
</ProtectedRoute>
```

2. تحقق من صلاحيات المستخدم في قاعدة البيانات
```sql
SELECT * FROM user_permissions 
WHERE user_id = 'user-id';
```

3. تحقق من `roles.ts` و `permissions.ts`

---

### مشكلة: زر محمي يظهر لمستخدم بدون صلاحية

**الأعراض**:
- زر حذف يظهر لـ Viewer

**الحلول**:
1. تحقق من `PermissionGuard` حول الزر
```tsx
<PermissionGuard permissions={['delete_contracts']}>
  <Button>حذف</Button>
</PermissionGuard>
```

2. تحقق من `useRolePermissions` hook
```tsx
const { hasPermission } = useRolePermissions();
const canDelete = hasPermission('delete_contracts');
```

---

## 📝 قائمة التحقق (Checklist)

### قبل الاختبار
- [ ] تفعيل RLS على جميع الجداول (13 جدول)
- [ ] إنشاء حسابات اختبار (7 أدوار)
- [ ] إنشاء بيانات اختبار (شركتين على الأقل)
- [ ] مراجعة `roles.ts` و `permissions.ts`
- [ ] مراجعة `enable_rls_security.sql`

### أثناء الاختبار
- [ ] تشغيل اختبارات RLS (10 اختبارات)
- [ ] تشغيل اختبارات الصفحات (3 اختبارات)
- [ ] تشغيل اختبارات الأزرار (4 اختبارات)
- [ ] تشغيل اختبارات محاولات التلاعب (3 اختبارات)
- [ ] تشغيل اختبارات الصلاحيات المالية (1 اختبار)
- [ ] تشغيل اختبارات عزل البيانات (2 اختبارات)
- [ ] تشغيل اختبارات Audit Log (1 اختبار)

### بعد الاختبار
- [ ] مراجعة النتائج
- [ ] إصلاح أي مشاكل
- [ ] إعادة الاختبار
- [ ] توثيق النتائج النهائية
- [ ] إنشاء تقرير الاختبارات

---

## 📈 تقرير الاختبارات

### نموذج تقرير شامل

```markdown
# تقرير الاختبارات الشامل - FleetifyApp

**التاريخ**: [DATE]
**المختبر**: [NAME]
**البيئة**: [Production/Staging/Development]

## 1. اختبارات RLS

| # | الاختبار | النتيجة | الوقت |
|---|----------|---------|------|
| 1.1 | User A sees only Company A contracts | PASS ✅ | 0.5s |
| 1.2 | User B sees only Company B contracts | PASS ✅ | 0.5s |
| ... | ... | ... | ... |

**الملخص**: 10/10 PASS (100%)

## 2. اختبارات الصلاحيات

| # | الاختبار | النتيجة | ملاحظات |
|---|----------|---------|---------|
| 1 | Super Admin Users Page | PASS ✅ | |
| 2 | HR UserManagement Page | PASS ✅ | |
| ... | ... | ... | ... |

**الملخص**: 14/14 PASS (100%)

## 3. الملخص الإجمالي

- **اختبارات RLS**: 10/10 PASS (100%)
- **اختبارات الصلاحيات**: 14/14 PASS (100%)
- **الإجمالي**: 24/24 PASS (100%)

## 4. التوصيات

[أي توصيات أو ملاحظات]

## 5. الخلاصة

النظام آمن بنسبة 100% وجاهز للإنتاج! 🎊
```

---

## 🔗 المراجع

### الملفات ذات الصلة
- [enable_rls_security.sql](../enable_rls_security.sql)
- [roles.ts](../src/lib/roles.ts)
- [permissions.ts](../src/lib/permissions.ts)
- [useRolePermissions.ts](../src/hooks/useRolePermissions.ts)
- [PermissionGuard.tsx](../src/components/auth/PermissionGuard.tsx)
- [ProtectedRoute.tsx](../src/components/common/ProtectedRoute.tsx)

### التقارير
- [final_complete_security_report.md](../final_complete_security_report.md)
- [PERMISSIONS_IMPLEMENTATION_GUIDE.md](../PERMISSIONS_IMPLEMENTATION_GUIDE.md)

---

## 💡 نصائح

### 1. اختبار منتظم
- اختبر بعد كل تغيير كبير
- اختبر قبل كل نشر (deployment)
- اختبر بعد إضافة صلاحيات جديدة

### 2. أتمتة الاختبارات
- استخدم Vitest للاختبارات الوحدوية
- استخدم Playwright للاختبارات E2E
- أنشئ CI/CD pipeline للاختبارات

### 3. مراقبة الإنتاج
- راقب Audit Logs بانتظام
- راقب محاولات الوصول المرفوضة
- راقب أخطاء RLS

---

## 📞 الدعم

للمزيد من المعلومات أو المساعدة:
- **GitHub**: https://github.com/khamis1992/fleetifyapp
- **Documentation**: https://www.alaraf.online/docs

---

**تم بحمد الله** ✨
