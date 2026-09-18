-- دالة لإنشاء جدول الدفعات تلقائياً للعقد الجديد
CREATE OR REPLACE FUNCTION create_payment_schedules_for_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_amount DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_start_date DATE;
  v_end_date DATE;
  v_number_of_months INTEGER;
  v_current_date DATE;
  i INTEGER;
BEGIN
  -- فقط للعقود النشطة مع مبلغ شهري
  IF NEW.status != 'active' OR COALESCE(NEW.monthly_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_monthly_amount := COALESCE(NEW.monthly_amount, 0);
  v_total_amount := COALESCE(NEW.contract_amount, 0);
  v_start_date := NEW.start_date;
  v_end_date := NEW.end_date;

  -- حساب عدد الأشهر
  IF v_total_amount > 0 AND v_monthly_amount > 0 THEN
    v_number_of_months := CEIL(v_total_amount / v_monthly_amount);
  ELSIF v_end_date IS NOT NULL AND v_start_date IS NOT NULL THEN
    v_number_of_months := EXTRACT(YEAR FROM AGE(v_end_date, v_start_date)) * 12 
                        + EXTRACT(MONTH FROM AGE(v_end_date, v_start_date)) + 1;
  ELSE
    v_number_of_months := 12;
  END IF;

  v_number_of_months := LEAST(v_number_of_months, 60);

  FOR i IN 1..v_number_of_months LOOP
    v_current_date := DATE_TRUNC('month', v_start_date) + ((i-1) || ' months')::INTERVAL;
    v_current_date := v_current_date + INTERVAL '1 month';
    v_current_date := DATE_TRUNC('month', v_current_date);

    INSERT INTO contract_payment_schedules (
      company_id, contract_id, installment_number, amount, due_date, status, created_at
    )
    SELECT NEW.company_id, NEW.id, i, v_monthly_amount, v_current_date,
      CASE WHEN v_current_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM contract_payment_schedules
      WHERE contract_id = NEW.id AND installment_number = i
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_payment_schedules ON contracts;
CREATE TRIGGER trigger_create_payment_schedules
  AFTER INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_schedules_for_contract();;
