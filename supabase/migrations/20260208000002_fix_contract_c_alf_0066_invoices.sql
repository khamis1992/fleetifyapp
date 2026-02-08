-- Fix Contract C-ALF-0066 Invoices
-- إصلاح فواتير العقد C-ALF-0066
-- 
-- المشاكل:
-- 1. فواتير ناقصة (ديسمبر 2023 + مارس-ديسمبر 2026)
-- 2. فواتير مكررة (مارس 2024 + يناير 2025)

-- ==========================================
-- الخطوة 1: حذف الفواتير المكررة
-- ==========================================

-- حذف فاتورة مارس 2024 المكررة (غير المدفوعة)
DELETE FROM invoices
WHERE invoice_number = 'INV-C-ALF-0066-2024-03'
  AND contract_id = (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0066')
  AND payment_status = 'unpaid'
  AND paid_amount = 0;

-- حذف فاتورة يناير 2025 المكررة (غير المدفوعة)
DELETE FROM invoices
WHERE invoice_number = 'INV-R-C-ALF-0066-202501'
  AND contract_id = (SELECT id FROM contracts WHERE contract_number = 'C-ALF-0066')
  AND payment_status = 'unpaid'
  AND paid_amount = 0;

-- ==========================================
-- الخطوة 2: إنشاء فاتورة ديسمبر 2023 الناقصة
-- ==========================================

INSERT INTO invoices (
  company_id,
  customer_id,
  contract_id,
  invoice_number,
  invoice_date,
  due_date,
  total_amount,
  subtotal,
  balance_due,
  paid_amount,
  status,
  payment_status,
  invoice_type,
  currency,
  notes
)
SELECT 
  c.company_id,
  c.customer_id,
  c.id as contract_id,
  'INV-C-ALF-0066-2023-12' as invoice_number,
  '2023-12-01'::date as invoice_date,
  '2023-12-01'::date as due_date,
  1500 as total_amount,
  1500 as subtotal,
  1500 as balance_due,
  0 as paid_amount,
  'sent' as status,
  'unpaid' as payment_status,
  'rental' as invoice_type,
  'QAR' as currency,
  'فاتورة إيجار شهرية - 2023/12 - عقد #C-ALF-0066 (تم إنشاؤها لاحقاً)' as notes
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.contract_id = c.id
      AND i.invoice_date >= '2023-12-01'
      AND i.invoice_date < '2024-01-01'
  );

-- ==========================================
-- الخطوة 3: إنشاء الفواتير المستقبلية (مارس-ديسمبر 2026)
-- ==========================================

-- فاتورة مارس 2026
INSERT INTO invoices (
  company_id,
  customer_id,
  contract_id,
  invoice_number,
  invoice_date,
  due_date,
  total_amount,
  subtotal,
  balance_due,
  paid_amount,
  status,
  payment_status,
  invoice_type,
  currency,
  notes
)
SELECT 
  c.company_id,
  c.customer_id,
  c.id as contract_id,
  'INV-C-ALF-0066-2026-03' as invoice_number,
  '2026-03-01'::date as invoice_date,
  '2026-03-01'::date as due_date,
  1500 as total_amount,
  1500 as subtotal,
  1500 as balance_due,
  0 as paid_amount,
  'sent' as status,
  'unpaid' as payment_status,
  'rental' as invoice_type,
  'QAR' as currency,
  'فاتورة إيجار شهرية - 2026/03 - عقد #C-ALF-0066' as notes
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.contract_id = c.id
      AND i.invoice_date >= '2026-03-01'
      AND i.invoice_date < '2026-04-01'
  );

-- فاتورة أبريل 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-04',
  '2026-04-01'::date, '2026-04-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/04 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-04-01' AND i.invoice_date < '2026-05-01');

-- فاتورة مايو 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-05',
  '2026-05-01'::date, '2026-05-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/05 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-05-01' AND i.invoice_date < '2026-06-01');

-- فاتورة يونيو 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-06',
  '2026-06-01'::date, '2026-06-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/06 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-06-01' AND i.invoice_date < '2026-07-01');

-- فاتورة يوليو 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-07',
  '2026-07-01'::date, '2026-07-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/07 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-07-01' AND i.invoice_date < '2026-08-01');

-- فاتورة أغسطس 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-08',
  '2026-08-01'::date, '2026-08-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/08 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-08-01' AND i.invoice_date < '2026-09-01');

-- فاتورة سبتمبر 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-09',
  '2026-09-01'::date, '2026-09-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/09 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-09-01' AND i.invoice_date < '2026-10-01');

-- فاتورة أكتوبر 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-10',
  '2026-10-01'::date, '2026-10-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/10 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-10-01' AND i.invoice_date < '2026-11-01');

-- فاتورة نوفمبر 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-11',
  '2026-11-01'::date, '2026-11-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/11 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-11-01' AND i.invoice_date < '2026-12-01');

-- فاتورة ديسمبر 2026
INSERT INTO invoices (
  company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
  total_amount, subtotal, balance_due, paid_amount, status, payment_status,
  invoice_type, currency, notes
)
SELECT 
  c.company_id, c.customer_id, c.id, 'INV-C-ALF-0066-2026-12',
  '2026-12-01'::date, '2026-12-01'::date, 1500, 1500, 1500, 0,
  'sent', 'unpaid', 'rental', 'QAR',
  'فاتورة إيجار شهرية - 2026/12 - عقد #C-ALF-0066'
FROM contracts c
WHERE c.contract_number = 'C-ALF-0066'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.contract_id = c.id AND i.invoice_date >= '2026-12-01' AND i.invoice_date < '2027-01-01');

-- ==========================================
-- الخطوة 4: التحقق من النتائج
-- ==========================================

-- عرض ملخص الفواتير بعد الإصلاح
DO $$
DECLARE
  v_contract_id uuid;
  v_invoice_count integer;
  v_total_amount numeric;
BEGIN
  -- الحصول على معرف العقد
  SELECT id INTO v_contract_id
  FROM contracts
  WHERE contract_number = 'C-ALF-0066';

  -- حساب عدد الفواتير والمبلغ الإجمالي
  SELECT COUNT(*), SUM(total_amount)
  INTO v_invoice_count, v_total_amount
  FROM invoices
  WHERE contract_id = v_contract_id;

  -- عرض النتائج
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'نتائج إصلاح فواتير العقد C-ALF-0066';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'عدد الفواتير: %', v_invoice_count;
  RAISE NOTICE 'إجمالي المبالغ: % ر.ق', v_total_amount;
  RAISE NOTICE 'المتوقع: 37 فاتورة × 1,500 = 55,500 ر.ق';
  
  IF v_invoice_count = 37 AND v_total_amount = 55500 THEN
    RAISE NOTICE '✅ تم الإصلاح بنجاح!';
  ELSE
    RAISE WARNING '⚠️ هناك اختلاف في النتائج!';
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
