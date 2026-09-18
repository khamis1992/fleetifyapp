-- ============================================================================
-- المرحلة 1.1: ربط الفواتير الموجودة بأقساطها المناسبة
-- ============================================================================

-- ربط الفواتير بالأقساط بناءً على invoice_month
UPDATE contract_payment_schedules ps
SET 
  invoice_id = inv.id,
  status = CASE 
    WHEN COALESCE(inv.paid_amount, 0) >= inv.total_amount THEN 'paid'
    WHEN COALESCE(inv.paid_amount, 0) > 0 THEN 'partially_paid'
    WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'pending'
  END,
  paid_amount = COALESCE(inv.paid_amount, 0),
  updated_at = NOW()
FROM invoices inv
WHERE ps.contract_id = inv.contract_id
  AND ps.invoice_id IS NULL
  AND inv.status != 'cancelled'
  AND inv.invoice_month = DATE_TRUNC('month', ps.due_date)::DATE;

-- أيضاً ربط بناءً على due_date إذا لم يتم الربط عبر invoice_month
UPDATE contract_payment_schedules ps
SET 
  invoice_id = inv.id,
  status = CASE 
    WHEN COALESCE(inv.paid_amount, 0) >= inv.total_amount THEN 'paid'
    WHEN COALESCE(inv.paid_amount, 0) > 0 THEN 'partially_paid'
    WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'pending'
  END,
  paid_amount = COALESCE(inv.paid_amount, 0),
  updated_at = NOW()
FROM invoices inv
WHERE ps.contract_id = inv.contract_id
  AND ps.invoice_id IS NULL
  AND inv.status != 'cancelled'
  AND DATE_TRUNC('month', inv.due_date)::DATE = DATE_TRUNC('month', ps.due_date)::DATE;;
