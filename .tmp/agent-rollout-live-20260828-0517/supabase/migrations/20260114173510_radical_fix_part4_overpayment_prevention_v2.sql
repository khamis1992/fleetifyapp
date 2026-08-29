-- ============================================================================
-- 2.5 Trigger: منع الدفع الزائد على الفواتير (تحذير فقط، لا منع)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_overpayment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_total_paid DECIMAL(12,2);
  v_new_total DECIMAL(12,2);
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT total_amount, paid_amount INTO v_invoice
  FROM invoices WHERE id = NEW.invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id 
    AND payment_status = 'completed'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  v_new_total := v_total_paid + NEW.amount;
  
  IF v_new_total > v_invoice.total_amount THEN
    NEW.notes := COALESCE(NEW.notes, '') || ' [تحذير: دفعة تتجاوز قيمة الفاتورة بـ ' || 
                 (v_new_total - v_invoice.total_amount)::TEXT || ' ر.ق.]';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_overpayment ON payments;
CREATE TRIGGER trigger_check_overpayment
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION check_payment_overpayment();

-- منع الدفعات المكررة
DROP INDEX IF EXISTS idx_unique_payment_per_invoice_date;
CREATE UNIQUE INDEX idx_unique_payment_per_invoice_date 
ON payments(invoice_id, DATE(payment_date), amount)
WHERE payment_status = 'completed' AND invoice_id IS NOT NULL;

-- إنشاء sequence للفواتير التلقائية
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- حذف الدالة القديمة وإنشاء الجديدة
DROP FUNCTION IF EXISTS daily_financial_maintenance();
CREATE FUNCTION daily_financial_maintenance()
RETURNS TABLE (
  invoices_updated INTEGER,
  schedules_updated INTEGER,
  new_invoices_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoices_updated INTEGER := 0;
  v_schedules_updated INTEGER := 0;
  v_new_invoices INTEGER := 0;
BEGIN
  -- 1. تحديث الفواتير المتأخرة
  UPDATE invoices
  SET status = 'overdue', updated_at = NOW()
  WHERE payment_status IN ('unpaid', 'partial')
    AND due_date < CURRENT_DATE
    AND status NOT IN ('cancelled', 'overdue');
  GET DIAGNOSTICS v_invoices_updated = ROW_COUNT;

  -- 2. تحديث الأقساط المتأخرة
  UPDATE contract_payment_schedules
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_schedules_updated = ROW_COUNT;

  -- 3. إنشاء فواتير للأقساط المستحقة بدون فواتير
  INSERT INTO invoices (
    company_id, customer_id, contract_id,
    invoice_number, invoice_date, due_date, invoice_month,
    total_amount, subtotal, balance_due, paid_amount,
    payment_status, status, invoice_type, notes, created_at
  )
  SELECT 
    ps.company_id, c.customer_id, ps.contract_id,
    'INV-AUTO-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0'),
    ps.due_date - INTERVAL '5 days',
    ps.due_date,
    DATE_TRUNC('month', ps.due_date)::DATE,
    ps.amount, ps.amount, ps.amount, 0,
    'unpaid', 
    CASE WHEN ps.due_date < CURRENT_DATE THEN 'overdue' ELSE 'draft' END,
    'sales',
    'فاتورة إيجار تلقائية - قسط ' || ps.installment_number,
    NOW()
  FROM contract_payment_schedules ps
  JOIN contracts c ON c.id = ps.contract_id
  WHERE ps.invoice_id IS NULL
    AND ps.due_date <= CURRENT_DATE + INTERVAL '5 days'
    AND c.status IN ('active', 'suspended', 'under_review')
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.contract_id = ps.contract_id 
      AND i.invoice_month = DATE_TRUNC('month', ps.due_date)::DATE
      AND i.status != 'cancelled'
    );
  GET DIAGNOSTICS v_new_invoices = ROW_COUNT;

  -- ربط الفواتير الجديدة بالأقساط
  UPDATE contract_payment_schedules ps
  SET invoice_id = i.id, updated_at = NOW()
  FROM invoices i
  WHERE ps.contract_id = i.contract_id
    AND ps.invoice_id IS NULL
    AND i.invoice_month = DATE_TRUNC('month', ps.due_date)::DATE
    AND i.status != 'cancelled';

  invoices_updated := v_invoices_updated;
  schedules_updated := v_schedules_updated;
  new_invoices_created := v_new_invoices;
  RETURN NEXT;
END;
$$;;
