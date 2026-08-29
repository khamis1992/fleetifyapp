-- دالة محسنة لربط الأقساط بالفواتير باستخدام invoice_month
CREATE OR REPLACE FUNCTION link_all_schedules_to_invoices()
RETURNS TABLE (
  schedules_linked INT,
  schedules_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked INT := 0;
BEGIN
  -- ربط جميع الأقساط بالفواتير بناءً على invoice_month
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

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  
  schedules_linked := v_linked;
  
  SELECT COUNT(*) INTO schedules_remaining
  FROM contract_payment_schedules 
  WHERE invoice_id IS NULL AND due_date <= CURRENT_DATE;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION link_all_schedules_to_invoices TO authenticated;

-- تشغيل الربط
SELECT * FROM link_all_schedules_to_invoices();;
