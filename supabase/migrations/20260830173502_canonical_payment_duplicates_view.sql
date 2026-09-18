-- ================================================================
-- Migration: Canonical payment duplicates audit view
-- Created: 2026-08-30
-- Description: Ad-hoc duplicate-payment audits repeatedly used a naive
--   GROUP BY (contract_id, payment_date, amount) that ignores
--   invoice_id. Monthly catch-up payments settle a DIFFERENT invoice
--   each time, so that grouping reports legitimate allocations as
--   "duplicates" (the 2026-08-25 and 2026-08-30 reports claimed
--   141,293 QAR of phantom excess). This view is the single
--   canonical source for duplicate reviews.
-- (Mirror of applied migration canonical_payment_duplicates_view)
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
    p.created_at
  FROM public.payments p
  LEFT JOIN public.contracts c ON c.id = p.contract_id
  LEFT JOIN public.invoices i ON i.id = p.invoice_id
  WHERE p.payment_status = 'completed'
),
true_dup AS (
  SELECT
    'true_duplicate' AS group_kind,
    company_id,
    contract_id,
    contract_number,
    invoice_id,
    invoice_number,
    invoice_month,
    payment_date,
    amount,
    COUNT(*) AS copies,
    SUM(amount) AS total,
    SUM(amount) - amount AS excess_qar
  FROM completed
  WHERE invoice_id IS NOT NULL
  GROUP BY company_id, contract_id, contract_number, invoice_id, invoice_number, invoice_month, payment_date, amount
  HAVING COUNT(*) > 1
),
naive_dup AS (
  SELECT
    'naive_group' AS group_kind,
    company_id,
    contract_id,
    contract_number,
    NULL::uuid AS invoice_id,
    MIN(invoice_number) AS invoice_number,
    NULL::date AS invoice_month,
    payment_date,
    amount,
    COUNT(*) AS copies,
    SUM(amount) AS total,
    (COUNT(*) - 1) * amount AS excess_qar,
    COUNT(DISTINCT invoice_id) AS distinct_invoices
  FROM completed
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
FROM (
  SELECT
    company_id, contract_id, contract_number, payment_date, amount,
    copies, excess_qar,
    copies AS distinct_invoices
  FROM true_dup
) t
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
    WHEN copies = distinct_invoices THEN
      'تجميع وهمي: كل دفعة سددت فاتورة شهر مختلف (تسديد متأخرات مشروع) — لا تكرار'
    ELSE
      'مجموعة مختلطة: تحتاج فحصًا يدويًا لفصل التكرار الحقيقي عن التسديدات المشروعة'
  END AS verdict
FROM naive_dup;

COMMENT ON VIEW public.payment_duplicates_audit_v1 IS
  'المصدر الكانوني الموحد لفحص الدفعات المكررة. التجميع الساذج (عقد+تاريخ+مبلغ) يولد إنذارات وهمية 141,293 ر.ق لأن تسديد المتأخرات يستهدف فاتورة شهر مختلف لكل دفعة. استخدم هذه الرؤية فقط: true_duplicate = تكرار حقيقي، naive_group مع copies=distinct_invoices = تسديدات مشروعة.';