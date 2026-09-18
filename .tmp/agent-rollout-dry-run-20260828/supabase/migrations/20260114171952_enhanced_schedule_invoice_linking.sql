-- دالة محسنة لربط الأقساط بالفواتير
CREATE OR REPLACE FUNCTION link_schedules_to_invoices()
RETURNS TABLE (
  contracts_processed INT,
  schedules_linked INT,
  schedules_still_unlinked INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked INT := 0;
  v_contracts INT := 0;
  v_schedule RECORD;
  v_invoice_id UUID;
BEGIN
  -- ربط الأقساط بالفواتير بناءً على الشهر
  FOR v_schedule IN
    SELECT ps.id, ps.contract_id, ps.due_date, c.company_id
    FROM contract_payment_schedules ps
    JOIN contracts c ON c.id = ps.contract_id
    WHERE ps.invoice_id IS NULL
  LOOP
    -- البحث عن فاتورة مطابقة
    SELECT inv.id INTO v_invoice_id
    FROM invoices inv
    WHERE inv.contract_id = v_schedule.contract_id
      AND inv.status != 'cancelled'
      AND (
        -- مطابقة بالشهر
        TO_CHAR(inv.due_date, 'YYYY-MM') = TO_CHAR(v_schedule.due_date, 'YYYY-MM')
        OR TO_CHAR(inv.invoice_date, 'YYYY-MM') = TO_CHAR(v_schedule.due_date, 'YYYY-MM')
        OR inv.invoice_month = DATE_TRUNC('month', v_schedule.due_date)::DATE
      )
    ORDER BY 
      CASE WHEN inv.status = 'paid' THEN 0 ELSE 1 END,
      inv.created_at
    LIMIT 1;

    IF v_invoice_id IS NOT NULL THEN
      -- تحديث القسط بربطه بالفاتورة
      UPDATE contract_payment_schedules ps2
      SET 
        invoice_id = v_invoice_id,
        status = (
          SELECT CASE 
            WHEN COALESCE(inv.paid_amount, 0) >= inv.total_amount THEN 'paid'
            WHEN COALESCE(inv.paid_amount, 0) > 0 THEN 'partially_paid'
            WHEN ps2.due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
          END
          FROM invoices inv WHERE inv.id = v_invoice_id
        ),
        paid_amount = (SELECT COALESCE(inv.paid_amount, 0) FROM invoices inv WHERE inv.id = v_invoice_id),
        updated_at = NOW()
      WHERE ps2.id = v_schedule.id;
      
      v_linked := v_linked + 1;
    END IF;
  END LOOP;

  -- حساب الإحصائيات
  SELECT COUNT(DISTINCT contract_id) INTO v_contracts
  FROM contract_payment_schedules WHERE invoice_id IS NOT NULL;

  contracts_processed := v_contracts;
  schedules_linked := v_linked;
  
  SELECT COUNT(*) INTO schedules_still_unlinked
  FROM contract_payment_schedules 
  WHERE invoice_id IS NULL AND due_date <= CURRENT_DATE;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION link_schedules_to_invoices TO authenticated;

-- تشغيل الربط
SELECT * FROM link_schedules_to_invoices();;
