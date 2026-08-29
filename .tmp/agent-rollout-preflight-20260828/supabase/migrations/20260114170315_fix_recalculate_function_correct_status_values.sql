-- إصلاح دالة إعادة حساب balance_due مع القيم الصحيحة
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
    WHERE invoice_id = v_invoice_id AND payment_status = 'completed';

    UPDATE invoices
    SET
      paid_amount = v_paid_amount,
      balance_due = v_total_amount - v_paid_amount,
      payment_status = CASE
        WHEN v_total_amount - v_paid_amount <= 0 THEN 'paid'
        WHEN v_paid_amount > 0 THEN 'partial'
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

-- إصلاح دالة sync_payment_schedule_with_invoice أيضاً
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

GRANT EXECUTE ON FUNCTION recalculate_invoice_balance_due TO authenticated;;
