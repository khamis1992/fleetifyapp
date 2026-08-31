-- ================================================================
-- Migration: Refine canonical duplicates view for placeholder groups
-- Created: 2026-08-30
-- Description: The 4 "mixed" groups from v1 are all contract_id IS
--   NULL historical receipts (cancelled-vehicles file) — grouped
--   under the shared "Historical Unmatched Plate" customer. Their
--   duplicates=distinct receipts from DIFFERENT vehicles, not real
--   duplicates. v2 refines the verdict for these groups.
-- ================================================================

CREATE OR REPLACE VIEW public.payment_duplicates_audit_v1 AS
WITH completed AS (
  SELECT
    p.company_id,
    p.id AS payment_id,
    p.payment_number,
    p.contract_id,
    c.contract_number,
    p.customer_id,
    p.invoice_id,
    i.invoice_number,
    i.invoice_month,
    p.payment_date,
    p.amount,
    p.created_at,
    p.notes
  FROM public.payments p
  LEFT JOIN public.contracts c ON c.id = p.contract_id
  LEFT JOIN public.invoices i ON i.id = p.invoice_id
  WHERE p.payment_status = 'completed'
),
true_dup AS (
  SELECT
    company_id,
    contract_id,
    contract_number,
    invoice_id,
    invoice_number,
    payment_date,
    amount,
    COUNT(*) AS copies,
    (COUNT(*) - 1) * amount AS excess_qar,
    COUNT(*) AS distinct_invoices
  FROM completed
  WHERE invoice_id IS NOT NULL
  GROUP BY company_id, contract_id, contract_number, invoice_id, invoice_number, payment_date, amount
  HAVING COUNT(*) > 1
),
naive_dup AS (
  SELECT
    company_id,
    contract_id,
    contract_number,
    payment_date,
    amount,
    COUNT(*) AS copies,
    (COUNT(*) - 1) * amount AS excess_qar,
    COUNT(DISTINCT invoice_id) AS distinct_invoices,
    COUNT(DISTINCT p.payment_number) AS distinct_payment_numbers
  FROM completed p
  GROUP BY company_id, contract_id, contract_number, payment_date, amount
  HAVING COUNT(*) > 1
)
SELECT
  'true_duplicate' AS group_kind,
  company_id,
  contract_id,
  contract_number,
  payment_date,
  amount,
  copies,
  excess_qar,
  distinct_invoices,
  'نفس الفاتورة استقبلت نفس المبلغ في نفس التاريخ مرتين — تكرار حقيقي يتطلب عكسًا' AS verdict
FROM true_dup
UNION ALL
SELECT
  'naive_group' AS group_kind,
  company_id,
  contract_id,
  contract_number,
  payment_date,
  amount,
  copies,
  excess_qar,
  distinct_invoices,
  CASE
    WHEN contract_id IS NULL AND distinct_invoices = 0 THEN
      'دفعات تاريخية غير مرتبطة بعقد (ملف العقود الملغية — لوحات مختلفة): ليست تكرارًا داخل نفس العقد'
    WHEN copies = distinct_invoices THEN
      'تجميع وهمي: كل دفعة سددت فاتورة شهر مختلف (تسديد متأخرات مشروع) — لا تكرار'
    ELSE
      'مجموعة مختلطة: تحتاج فحصًا يدويًا لفصل التكرار الحقيقي عن التسديدات المشروعة'
  END AS verdict
FROM naive_dup;

COMMENT ON VIEW public.payment_duplicates_audit_v1 IS
  'المصدر الكانوني الموحد لفحص الدفعات المكررة. التجميع الساذج (عقد+تاريخ+مبلغ) يولد إنذارات وهمية 141,293 ر.ق لأن تسديد المتأخرات يستهدف فاتورة شهر مختلف لكل دفعة. true_duplicate = تكرار حقيقي. naive_group: copies=distinct_invoices أو بلا عقد = مشروعة.';