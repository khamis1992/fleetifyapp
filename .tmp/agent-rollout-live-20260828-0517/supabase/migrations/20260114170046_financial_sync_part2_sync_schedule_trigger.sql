-- دالة لتحديث حالة جدول الدفعات بناءً على الفواتير والمدفوعات
CREATE OR REPLACE FUNCTION sync_payment_schedule_with_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule_id UUID;
  v_invoice_month TEXT;
  v_paid_amount DECIMAL(12,2);
  v_schedule_amount DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  v_invoice_month := TO_CHAR(COALESCE(NEW.due_date, NEW.invoice_date), 'YYYY-MM');

  SELECT id, amount INTO v_schedule_id, v_schedule_amount
  FROM contract_payment_schedules
  WHERE contract_id = NEW.contract_id
    AND TO_CHAR(due_date, 'YYYY-MM') = v_invoice_month
  ORDER BY installment_number
  LIMIT 1;

  IF v_schedule_id IS NOT NULL THEN
    v_paid_amount := COALESCE(NEW.paid_amount, 0);
    
    IF v_paid_amount >= NEW.total_amount THEN
      v_new_status := 'paid';
    ELSIF v_paid_amount > 0 THEN
      v_new_status := 'partially_paid';
    ELSIF NEW.due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE contract_payment_schedules
    SET 
      status = v_new_status,
      paid_amount = v_paid_amount,
      paid_date = CASE WHEN v_paid_amount >= v_schedule_amount THEN CURRENT_DATE ELSE paid_date END,
      invoice_id = NEW.id,
      updated_at = NOW()
    WHERE id = v_schedule_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_schedule_on_invoice ON invoices;
CREATE TRIGGER trigger_sync_schedule_on_invoice
  AFTER INSERT OR UPDATE OF paid_amount, payment_status, balance_due ON invoices
  FOR EACH ROW
  WHEN (NEW.contract_id IS NOT NULL)
  EXECUTE FUNCTION sync_payment_schedule_with_invoice();;
