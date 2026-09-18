-- إصلاح دالة تحديث الفواتير المتأخرة
CREATE OR REPLACE FUNCTION update_overdue_invoices_and_schedules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  -- تحديث status للفواتير المتأخرة (وليس payment_status)
  UPDATE invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE status NOT IN ('paid', 'cancelled', 'overdue')
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- تحديث جدول الدفعات المتأخر
  UPDATE contract_payment_schedules
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION update_overdue_invoices_and_schedules TO authenticated;;
