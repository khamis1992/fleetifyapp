-- ================================================================
-- Migration: Active-contract revenue payments view
-- Created: 2026-08-30
-- Description: Revenue dashboards (useDashboardStats, DashboardV2,
--   FinanceHub, DailyCloseouts) read the payments table directly, so
--   receipts booked on cancelled contracts (historical imports whose
--   contracts were later cancelled, ~2.31M QAR lifetime) inflate
--   reported revenue whenever their payment_date falls inside a
--   reporting month. This canonical view exposes ONLY receipts on
--   non-cancelled contracts plus legitimate non-contract receipts.
-- (Mirror of applied migration active_revenue_payments_view)
-- ================================================================

CREATE OR REPLACE VIEW public.active_revenue_payments_v1 AS
SELECT
  p.id,
  p.company_id,
  p.payment_number,
  p.customer_id,
  p.vendor_id,
  p.contract_id,
  c.contract_number,
  c.status AS contract_status,
  p.invoice_id,
  p.transaction_type,
  p.payment_type,
  p.payment_method,
  p.payment_date,
  p.amount,
  p.currency,
  p.payment_status,
  p.created_at
FROM public.payments p
LEFT JOIN public.contracts c ON c.id = p.contract_id
WHERE p.payment_status IN ('completed', 'paid', 'confirmed')
  AND p.transaction_type = 'receipt'
  AND (
    p.contract_id IS NULL
    OR c.status NOT IN ('cancelled', 'canceled')
  );

COMMENT ON VIEW public.active_revenue_payments_v1 IS
  'المصدر الكانوني لإيراد التقارير: قبضات العقود غير الملغاة + القبضات بلا عقد (مخالفات/أضرار). يمنع تضخيم الإيراد بدفعات عقود أُلغيت لاحقًا (استيرادات تاريخية).';

GRANT SELECT ON public.active_revenue_payments_v1 TO authenticated;