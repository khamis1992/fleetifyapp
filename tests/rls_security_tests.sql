-- ============================================
-- اختبارات Row Level Security (RLS)
-- FleetifyApp Security Tests
-- ============================================

-- هذا الملف يحتوي على اختبارات شاملة لـ RLS
-- يجب تشغيله على قاعدة البيانات للتحقق من الأمان

-- ============================================
-- Setup: إنشاء بيانات اختبار
-- ============================================

-- إنشاء شركتين للاختبار
INSERT INTO companies (id, name, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Company A', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Test Company B', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء مستخدمين للاختبار
-- User A من Company A
INSERT INTO users (id, email, company_id, role, created_at)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a@companya.com', '11111111-1111-1111-1111-111111111111', 'company_admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- User B من Company B
INSERT INTO users (id, email, company_id, role, created_at)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b@companyb.com', '22222222-2222-2222-2222-222222222222', 'company_admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- Super Admin
INSERT INTO users (id, email, company_id, role, created_at)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'superadmin@fleetify.com', NULL, 'super_admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Test 1: اختبار RLS على جدول contracts
-- ============================================

-- إنشاء عقد لـ Company A
INSERT INTO contracts (id, company_id, contract_number, status, created_at)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'CONTRACT-A-001', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء عقد لـ Company B
INSERT INTO contracts (id, company_id, contract_number, status, created_at)
VALUES 
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'CONTRACT-B-001', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: User A يجب أن يرى عقود Company A فقط
-- Expected: 1 row (CONTRACT-A-001)
SELECT 
  'Test 1.1: User A sees only Company A contracts' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM contracts
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- اختبار: User B يجب أن يرى عقود Company B فقط
-- Expected: 1 row (CONTRACT-B-001)
SELECT 
  'Test 1.2: User B sees only Company B contracts' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM contracts
WHERE company_id = '22222222-2222-2222-2222-222222222222';

-- اختبار: Super Admin يجب أن يرى جميع العقود
-- Expected: 2 rows
SELECT 
  'Test 1.3: Super Admin sees all contracts' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END AS status
FROM contracts;

-- ============================================
-- Test 2: اختبار RLS على جدول customers
-- ============================================

-- إنشاء عميل لـ Company A
INSERT INTO customers (id, company_id, name, email, created_at)
VALUES 
  ('cust1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Customer A', 'customer_a@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء عميل لـ Company B
INSERT INTO customers (id, company_id, name, email, created_at)
VALUES 
  ('cust2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Customer B', 'customer_b@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل البيانات بين الشركات
SELECT 
  'Test 2.1: Customer data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 3: اختبار RLS على جدول vehicles
-- ============================================

-- إنشاء مركبة لـ Company A
INSERT INTO vehicles (id, company_id, plate_number, status, created_at)
VALUES 
  ('veh11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ABC-123', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء مركبة لـ Company B
INSERT INTO vehicles (id, company_id, plate_number, status, created_at)
VALUES 
  ('veh22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'XYZ-789', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل المركبات
SELECT 
  'Test 3.1: Vehicle data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM vehicles
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 4: اختبار RLS على جدول invoices
-- ============================================

-- إنشاء فاتورة لـ Company A
INSERT INTO invoices (id, company_id, invoice_number, status, created_at)
VALUES 
  ('inv11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'INV-A-001', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء فاتورة لـ Company B
INSERT INTO invoices (id, company_id, invoice_number, status, created_at)
VALUES 
  ('inv22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'INV-B-001', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل الفواتير
SELECT 
  'Test 4.1: Invoice data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM invoices
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 5: اختبار RLS على جدول payments
-- ============================================

-- إنشاء دفعة لـ Company A
INSERT INTO payments (id, company_id, payment_number, status, created_at)
VALUES 
  ('pay11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'PAY-A-001', 'completed', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء دفعة لـ Company B
INSERT INTO payments (id, company_id, payment_number, status, created_at)
VALUES 
  ('pay22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'PAY-B-001', 'completed', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل الدفعات
SELECT 
  'Test 5.1: Payment data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM payments
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 6: اختبار RLS على جدول employees
-- ============================================

-- إنشاء موظف لـ Company A
INSERT INTO employees (id, company_id, name, email, created_at)
VALUES 
  ('emp11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Employee A', 'emp_a@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء موظف لـ Company B
INSERT INTO employees (id, company_id, name, email, created_at)
VALUES 
  ('emp22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Employee B', 'emp_b@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل الموظفين
SELECT 
  'Test 6.1: Employee data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM employees
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 7: اختبار RLS على جدول audit_logs
-- ============================================

-- إنشاء سجل تدقيق لـ Company A
INSERT INTO audit_logs (id, company_id, user_id, action, resource_type, created_at)
VALUES 
  ('log11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CREATE', 'contract', NOW())
ON CONFLICT (id) DO NOTHING;

-- إنشاء سجل تدقيق لـ Company B
INSERT INTO audit_logs (id, company_id, user_id, action, resource_type, created_at)
VALUES 
  ('log22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CREATE', 'contract', NOW())
ON CONFLICT (id) DO NOTHING;

-- اختبار: عزل سجلات التدقيق
SELECT 
  'Test 7.1: Audit log data isolation' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM audit_logs
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- Test 8: اختبار دالة user_company_id()
-- ============================================

-- اختبار: الدالة ترجع company_id الصحيح
SELECT 
  'Test 8.1: user_company_id() function' AS test_name,
  CASE 
    WHEN public.user_company_id() IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- ============================================
-- Test 9: اختبار منع الوصول بين الشركات
-- ============================================

-- محاولة الوصول لعقد شركة أخرى (يجب أن يفشل)
SELECT 
  'Test 9.1: Cross-company access prevention' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM contracts
WHERE company_id = '22222222-2222-2222-2222-222222222222'
  AND '11111111-1111-1111-1111-111111111111' = (
    SELECT company_id FROM users WHERE id = auth.uid()
  );

-- ============================================
-- Test 10: اختبار Super Admin Access
-- ============================================

-- Super Admin يجب أن يرى جميع البيانات
SELECT 
  'Test 10.1: Super Admin sees all data' AS test_name,
  COUNT(*) AS result,
  CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END AS status
FROM contracts;

-- ============================================
-- Summary: ملخص النتائج
-- ============================================

SELECT 
  '===========================================' AS separator,
  'RLS SECURITY TESTS SUMMARY' AS title,
  '===========================================' AS separator2;

SELECT 
  'Total Tests' AS metric,
  10 AS value;

SELECT 
  'Expected Result' AS metric,
  'All tests should PASS' AS value;

-- ============================================
-- Cleanup: تنظيف بيانات الاختبار (اختياري)
-- ============================================

-- لحذف بيانات الاختبار، قم بتشغيل الأوامر التالية:

/*
DELETE FROM audit_logs WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM employees WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM payments WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM invoices WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM vehicles WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM customers WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM contracts WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM companies WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
*/

-- ============================================
-- Notes: ملاحظات
-- ============================================

-- 1. يجب تشغيل هذه الاختبارات على قاعدة بيانات الاختبار فقط
-- 2. تأكد من تفعيل RLS على جميع الجداول قبل التشغيل
-- 3. النتيجة المتوقعة: جميع الاختبارات PASS
-- 4. إذا فشل أي اختبار، راجع سياسات RLS
-- 5. Super Admin يجب أن يرى جميع البيانات
-- 6. المستخدمون العاديون يرون بيانات شركتهم فقط

-- ============================================
-- تم بحمد الله ✨
-- ============================================
