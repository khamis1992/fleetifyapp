-- ============================================================================
-- نظام منع المشاكل المالية مستقبلاً
-- ============================================================================

-- 1. Trigger لربط الفاتورة الجديدة بالقسط المناسب تلقائياً
CREATE OR REPLACE FUNCTION auto_link_invoice_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ربط القسط بالفاتورة إذا كان هناك قسط مطابق
  IF NEW.contract_id IS NOT NULL THEN
    UPDATE contract_payment_schedules ps
    SET 
      invoice_id = NEW.id,
      status = CASE 
        WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_amount THEN 'paid'
        WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partially_paid'
        WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      paid_amount = COALESCE(NEW.paid_amount, 0),
      updated_at = NOW()
    WHERE ps.contract_id = NEW.contract_id
      AND ps.invoice_id IS NULL
      AND DATE_TRUNC('month', ps.due_date) = DATE_TRUNC('month', COALESCE(NEW.invoice_month, NEW.due_date));
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_link_invoice ON invoices;
CREATE TRIGGER trigger_auto_link_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.contract_id IS NOT NULL)
  EXECUTE FUNCTION auto_link_invoice_to_schedule();

-- 2. Trigger لتحديث حالة القسط عند تحديث الدفعة
CREATE OR REPLACE FUNCTION update_schedule_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_paid DECIMAL(12,2);
  v_total DECIMAL(12,2);
BEGIN
  -- الحصول على الفاتورة المرتبطة
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT id, COALESCE(paid_amount, 0), total_amount
    INTO v_invoice_id, v_paid, v_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- تحديث القسط المرتبط
    UPDATE contract_payment_schedules ps
    SET 
      status = CASE 
        WHEN v_paid >= v_total THEN 'paid'
        WHEN v_paid > 0 THEN 'partially_paid'
        WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      paid_amount = v_paid,
      paid_date = CASE WHEN v_paid >= v_total THEN CURRENT_DATE ELSE paid_date END,
      updated_at = NOW()
    WHERE ps.invoice_id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_schedule_on_payment ON payments;
CREATE TRIGGER trigger_update_schedule_on_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.invoice_id IS NOT NULL AND NEW.payment_status = 'completed')
  EXECUTE FUNCTION update_schedule_on_payment();

-- 3. دالة للتقرير اليومي (يمكن تشغيلها بـ Cron Job)
CREATE OR REPLACE FUNCTION daily_financial_maintenance()
RETURNS TABLE (
  overdue_updated INT,
  schedules_linked INT,
  issues_found INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overdue INT := 0;
  v_linked INT := 0;
  v_issues INT := 0;
BEGIN
  -- تحديث الحالات المتأخرة
  SELECT update_overdue_invoices_and_schedules() INTO v_overdue;

  -- ربط الأقساط غير المرتبطة
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

  -- حساب المشاكل المتبقية
  SELECT COUNT(*) INTO v_issues
  FROM contract_payment_schedules
  WHERE invoice_id IS NULL AND due_date <= CURRENT_DATE;

  overdue_updated := v_overdue;
  schedules_linked := v_linked;
  issues_found := v_issues;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION daily_financial_maintenance TO authenticated;

-- تشغيل الصيانة اليومية
SELECT * FROM daily_financial_maintenance();;
