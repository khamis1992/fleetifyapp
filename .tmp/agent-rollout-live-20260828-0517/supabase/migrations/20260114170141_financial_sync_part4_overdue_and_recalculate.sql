-- دالة لتحديث حالات الفواتير المتأخرة
CREATE OR REPLACE FUNCTION update_overdue_invoices_and_schedules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE invoices
  SET payment_status = 'overdue', updated_at = NOW()
  WHERE payment_status IN ('unpaid', 'pending')
    AND due_date < CURRENT_DATE
    AND status != 'cancelled';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE contract_payment_schedules
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;

  RETURN v_updated;
END;
$$;

-- دالة لإعادة حساب balance_due للفواتير
CREATE OR REPLACE FUNCTION recalculate_invoice_balance_due()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_total_amount DECIMAL(12,2);
  v_paid_amount DECIMAL(12,2);
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_invoice_id, v_total_amount IN
    SELECT id, total_amount FROM invoices WHERE status != 'cancelled'
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
    FROM payments
    WHERE invoice_id = v_invoice_id AND status = 'completed';

    UPDATE invoices
    SET
      paid_amount = v_paid_amount,
      balance_due = v_total_amount - v_paid_amount,
      payment_status = CASE
        WHEN v_total_amount - v_paid_amount <= 0 THEN 'paid'
        WHEN v_paid_amount > 0 THEN 'partially_paid'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
    WHERE id = v_invoice_id
    AND (paid_amount IS DISTINCT FROM v_paid_amount OR balance_due IS DISTINCT FROM (v_total_amount - v_paid_amount));

    IF FOUND THEN v_updated_count := v_updated_count + 1; END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION update_overdue_invoices_and_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_invoice_balance_due TO authenticated;;
