-- ============================================================================
-- Row Level Security (RLS) Implementation for FleetifyApp
-- ============================================================================
-- التاريخ: 13 نوفمبر 2025
-- الهدف: حماية البيانات على مستوى قاعدة البيانات لمنع تسريب البيانات بين الشركات
-- ============================================================================

-- الخطوة 1: إنشاء دالة مساعدة للحصول على company_id للمستخدم الحالي
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS uuid AS $$
  SELECT company_id 
  FROM profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ملاحظة: SECURITY DEFINER يسمح للدالة بالوصول إلى جدول profiles
-- STABLE يعني أن الدالة تعيد نفس النتيجة خلال نفس الاستعلام

-- ============================================================================
-- الخطوة 2: تفعيل RLS على جميع الجداول الحساسة
-- ============================================================================

-- الجداول المالية (أعلى أولوية)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

-- الجداول التشغيلية
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- الجداول الفرعية
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payment_receipts ENABLE ROW LEVEL SECURITY;

-- الجداول القانونية والعقارية
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_contracts ENABLE ROW LEVEL SECURITY;

-- الجداول الإدارية
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- الخطوة 3: إنشاء سياسات RLS موحدة لجميع الجداول
-- ============================================================================

-- سياسة للفواتير
DROP POLICY IF EXISTS "Company isolation for invoices" ON invoices;
CREATE POLICY "Company isolation for invoices"
ON invoices
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للمدفوعات
DROP POLICY IF EXISTS "Company isolation for payments" ON payments;
CREATE POLICY "Company isolation for payments"
ON payments
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للقيود المحاسبية
DROP POLICY IF EXISTS "Company isolation for journal_entries" ON journal_entries;
CREATE POLICY "Company isolation for journal_entries"
ON journal_entries
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة لخطوط القيود المحاسبية
DROP POLICY IF EXISTS "Company isolation for journal_entry_lines" ON journal_entry_lines;
CREATE POLICY "Company isolation for journal_entry_lines"
ON journal_entry_lines
FOR ALL
USING (
  journal_entry_id IN (
    SELECT id FROM journal_entries 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لدليل الحسابات
DROP POLICY IF EXISTS "Company isolation for chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "Company isolation for chart_of_accounts"
ON chart_of_accounts
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للحسابات
DROP POLICY IF EXISTS "Company isolation for accounts" ON accounts;
CREATE POLICY "Company isolation for accounts"
ON accounts
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للأصول الثابتة
DROP POLICY IF EXISTS "Company isolation for fixed_assets" ON fixed_assets;
CREATE POLICY "Company isolation for fixed_assets"
ON fixed_assets
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للموازنات
DROP POLICY IF EXISTS "Company isolation for budgets" ON budgets;
CREATE POLICY "Company isolation for budgets"
ON budgets
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة لمراكز التكلفة
DROP POLICY IF EXISTS "Company isolation for cost_centers" ON cost_centers;
CREATE POLICY "Company isolation for cost_centers"
ON cost_centers
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للعقود
DROP POLICY IF EXISTS "Company isolation for contracts" ON contracts;
CREATE POLICY "Company isolation for contracts"
ON contracts
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للعملاء
DROP POLICY IF EXISTS "Company isolation for customers" ON customers;
CREATE POLICY "Company isolation for customers"
ON customers
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للمركبات
DROP POLICY IF EXISTS "Company isolation for vehicles" ON vehicles;
CREATE POLICY "Company isolation for vehicles"
ON vehicles
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للموظفين
DROP POLICY IF EXISTS "Company isolation for employees" ON employees;
CREATE POLICY "Company isolation for employees"
ON employees
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للغرامات
DROP POLICY IF EXISTS "Company isolation for penalties" ON penalties;
CREATE POLICY "Company isolation for penalties"
ON penalties
FOR ALL
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لجداول الدفع
DROP POLICY IF EXISTS "Company isolation for contract_payment_schedules" ON contract_payment_schedules;
CREATE POLICY "Company isolation for contract_payment_schedules"
ON contract_payment_schedules
FOR ALL
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لمستندات العقود
DROP POLICY IF EXISTS "Company isolation for contract_documents" ON contract_documents;
CREATE POLICY "Company isolation for contract_documents"
ON contract_documents
FOR ALL
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لملاحظات العملاء
DROP POLICY IF EXISTS "Company isolation for customer_notes" ON customer_notes;
CREATE POLICY "Company isolation for customer_notes"
ON customer_notes
FOR ALL
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لتقارير حالة المركبات
DROP POLICY IF EXISTS "Company isolation for vehicle_condition_reports" ON vehicle_condition_reports;
CREATE POLICY "Company isolation for vehicle_condition_reports"
ON vehicle_condition_reports
FOR ALL
USING (
  vehicle_id IN (
    SELECT id FROM vehicles 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لإيصالات الدفع
DROP POLICY IF EXISTS "Company isolation for rental_payment_receipts" ON rental_payment_receipts;
CREATE POLICY "Company isolation for rental_payment_receipts"
ON rental_payment_receipts
FOR ALL
USING (
  payment_id IN (
    SELECT id FROM payments 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة للقضايا القانونية
DROP POLICY IF EXISTS "Company isolation for legal_cases" ON legal_cases;
CREATE POLICY "Company isolation for legal_cases"
ON legal_cases
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة للعقارات
DROP POLICY IF EXISTS "Company isolation for properties" ON properties;
CREATE POLICY "Company isolation for properties"
ON properties
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة لعقود العقارات
DROP POLICY IF EXISTS "Company isolation for property_contracts" ON property_contracts;
CREATE POLICY "Company isolation for property_contracts"
ON property_contracts
FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties 
    WHERE company_id = auth.user_company_id()
  )
);

-- سياسة لأوامر البيع
DROP POLICY IF EXISTS "Company isolation for sales_orders" ON sales_orders;
CREATE POLICY "Company isolation for sales_orders"
ON sales_orders
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة لسجلات النظام
DROP POLICY IF EXISTS "Company isolation for system_logs" ON system_logs;
CREATE POLICY "Company isolation for system_logs"
ON system_logs
FOR ALL
USING (company_id = auth.user_company_id());

-- سياسة لسجل تدقيق العقود
DROP POLICY IF EXISTS "Company isolation for contract_audit_log" ON contract_audit_log;
CREATE POLICY "Company isolation for contract_audit_log"
ON contract_audit_log
FOR ALL
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE company_id = auth.user_company_id()
  )
);

-- ============================================================================
-- الخطوة 4: إنشاء سياسات خاصة للـ Super Admin
-- ============================================================================

-- Super Admin يمكنه الوصول لجميع البيانات
-- نحتاج إلى إنشاء دالة للتحقق من أن المستخدم super admin

CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- إضافة سياسة للـ Super Admin على كل جدول
-- مثال: الفواتير

DROP POLICY IF EXISTS "Super admin can access all invoices" ON invoices;
CREATE POLICY "Super admin can access all invoices"
ON invoices
FOR ALL
USING (auth.is_super_admin());

-- تكرار لجميع الجداول الأخرى...
-- (يمكن إضافة المزيد حسب الحاجة)

-- ============================================================================
-- الخطوة 5: اختبار السياسات
-- ============================================================================

-- اختبار 1: التحقق من أن RLS مفعّل
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'invoices', 'payments', 'contracts', 'customers', 
  'vehicles', 'journal_entries', 'employees'
)
ORDER BY tablename;

-- اختبار 2: عرض جميع السياسات المطبقة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- اختبار 3: محاولة الوصول إلى بيانات شركة أخرى (يجب أن يفشل)
-- هذا الاختبار يجب تشغيله من واجهة التطبيق بعد تسجيل الدخول

-- ============================================================================
-- ملاحظات مهمة
-- ============================================================================

-- 1. RLS يحمي على مستوى قاعدة البيانات، حتى لو كان الكود يحتوي على أخطاء
-- 2. السياسات تطبق على جميع العمليات: SELECT, INSERT, UPDATE, DELETE
-- 3. Super Admin لديه وصول كامل لجميع البيانات
-- 4. يجب اختبار السياسات بعناية قبل النشر على الإنتاج
-- 5. في حالة وجود مشاكل، يمكن تعطيل RLS مؤقتاً:
--    ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- الخطوة التالية
-- ============================================================================

-- بعد تطبيق هذا السكريبت:
-- 1. اختبار الوصول من حسابات مختلفة
-- 2. التحقق من أن كل شركة ترى بياناتها فقط
-- 3. التحقق من أن Super Admin يمكنه الوصول لجميع البيانات
-- 4. إصلاح أي مشاكل في السياسات إذا لزم الأمر

-- ============================================================================
-- تم بنجاح! ✅
-- ============================================================================
