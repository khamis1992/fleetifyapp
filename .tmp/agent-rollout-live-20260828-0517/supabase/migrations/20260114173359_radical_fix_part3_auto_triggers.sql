-- ============================================================================
-- المرحلة 2: آليات المنع التلقائية
-- ============================================================================

-- ==============================
-- 2.1 Trigger: إنشاء جدول دفعات عند إنشاء/تحديث عقد
-- ==============================
CREATE OR REPLACE FUNCTION create_payment_schedules_for_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_months INTEGER;
  v_current_date DATE;
  i INTEGER;
BEGIN
  -- فقط للعقود النشطة مع مبلغ شهري
  IF NEW.status NOT IN ('active', 'suspended', 'under_review') OR COALESCE(NEW.monthly_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- حساب عدد الأشهر
  IF COALESCE(NEW.contract_amount, 0) > 0 AND NEW.monthly_amount > 0 THEN
    v_months := CEIL(NEW.contract_amount / NEW.monthly_amount);
  ELSIF NEW.end_date IS NOT NULL THEN
    v_months := EXTRACT(YEAR FROM AGE(NEW.end_date, NEW.start_date)) * 12 
              + EXTRACT(MONTH FROM AGE(NEW.end_date, NEW.start_date)) + 1;
  ELSE
    v_months := 12;
  END IF;
  v_months := LEAST(v_months, 60);

  -- إنشاء الأقساط المفقودة
  FOR i IN 1..v_months LOOP
    v_current_date := DATE_TRUNC('month', NEW.start_date)::DATE + (i || ' months')::INTERVAL;
    
    IF NOT EXISTS (
      SELECT 1 FROM contract_payment_schedules 
      WHERE contract_id = NEW.id AND installment_number = i
    ) THEN
      INSERT INTO contract_payment_schedules (
        company_id, contract_id, installment_number, amount, due_date, status, created_at
      ) VALUES (
        NEW.company_id, NEW.id, i, NEW.monthly_amount, v_current_date,
        CASE WHEN v_current_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
        NOW()
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_payment_schedules ON contracts;
CREATE TRIGGER trigger_create_payment_schedules
  AFTER INSERT OR UPDATE OF status, monthly_amount, start_date, end_date, contract_amount
  ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_schedules_for_contract();

-- ==============================
-- 2.2 Trigger: ربط الفاتورة بالقسط تلقائياً عند إنشائها
-- ==============================
CREATE OR REPLACE FUNCTION auto_link_invoice_to_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule_id UUID;
BEGIN
  -- فقط للفواتير المرتبطة بعقد
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- البحث عن قسط غير مرتبط لنفس الشهر
  SELECT id INTO v_schedule_id
  FROM contract_payment_schedules
  WHERE contract_id = NEW.contract_id
    AND invoice_id IS NULL
    AND DATE_TRUNC('month', due_date)::DATE = NEW.invoice_month
  LIMIT 1;
  
  IF v_schedule_id IS NOT NULL THEN
    UPDATE contract_payment_schedules
    SET 
      invoice_id = NEW.id,
      status = CASE 
        WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_amount THEN 'paid'
        WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partially_paid'
        WHEN NEW.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      paid_amount = COALESCE(NEW.paid_amount, 0),
      updated_at = NOW()
    WHERE id = v_schedule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_link_invoice ON invoices;
CREATE TRIGGER trigger_auto_link_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_invoice_to_schedule();

-- ==============================
-- 2.3 Trigger: تحديث حالة القسط عند تحديث الفاتورة
-- ==============================
CREATE OR REPLACE FUNCTION sync_schedule_with_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث القسط المرتبط بالفاتورة
  UPDATE contract_payment_schedules
  SET 
    status = CASE 
      WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_amount THEN 'paid'
      WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partially_paid'
      WHEN NEW.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    paid_amount = COALESCE(NEW.paid_amount, 0),
    updated_at = NOW()
  WHERE invoice_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_schedule_with_invoice ON invoices;
CREATE TRIGGER trigger_sync_schedule_with_invoice
  AFTER UPDATE OF paid_amount, total_amount, payment_status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_schedule_with_invoice();

-- ==============================
-- 2.4 Trigger: تحديث الفاتورة والقسط عند الدفع
-- ==============================
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(12,2);
  v_invoice RECORD;
BEGIN
  -- فقط للدفعات المكتملة
  IF NEW.payment_status != 'completed' OR NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- حساب إجمالي المدفوعات
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id AND payment_status = 'completed';
  
  -- تحديث الفاتورة
  UPDATE invoices
  SET 
    paid_amount = v_total_paid,
    balance_due = total_amount - v_total_paid,
    payment_status = CASE 
      WHEN total_amount - v_total_paid <= 0 THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON payments;
CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT OR UPDATE OF amount, payment_status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();;
