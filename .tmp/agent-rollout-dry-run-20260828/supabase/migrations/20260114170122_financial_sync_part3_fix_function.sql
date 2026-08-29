CREATE OR REPLACE FUNCTION fix_contract_financial_data(p_contract_id UUID DEFAULT NULL)
RETURNS TABLE (
  out_contract_id UUID,
  out_contract_number TEXT,
  out_invoices_fixed INTEGER,
  out_schedules_created INTEGER,
  out_schedules_synced INTEGER,
  out_duplicate_payments_fixed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_monthly_amount DECIMAL(12,2);
  v_number_of_months INTEGER;
  v_current_date DATE;
  v_invoice RECORD;
  v_schedule RECORD;
  i INTEGER;
BEGIN
  FOR v_contract IN
    SELECT c.id, c.contract_number AS c_contract_number, c.company_id, c.customer_id,
           c.start_date, c.end_date, c.monthly_amount, c.contract_amount, c.status
    FROM contracts c
    WHERE c.status IN ('active', 'suspended', 'under_review')
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
      AND COALESCE(c.monthly_amount, 0) > 0
    ORDER BY c.start_date
  LOOP
    out_contract_id := v_contract.id;
    out_contract_number := v_contract.c_contract_number;
    out_invoices_fixed := 0;
    out_schedules_created := 0;
    out_schedules_synced := 0;
    out_duplicate_payments_fixed := 0;

    v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
    
    IF COALESCE(v_contract.contract_amount, 0) > 0 AND v_monthly_amount > 0 THEN
      v_number_of_months := CEIL(v_contract.contract_amount / v_monthly_amount);
    ELSIF v_contract.end_date IS NOT NULL THEN
      v_number_of_months := EXTRACT(YEAR FROM AGE(v_contract.end_date, v_contract.start_date)) * 12 
                          + EXTRACT(MONTH FROM AGE(v_contract.end_date, v_contract.start_date)) + 1;
    ELSE
      v_number_of_months := 12;
    END IF;
    v_number_of_months := LEAST(v_number_of_months, 60);

    -- 1. إنشاء جدول الدفعات المفقود
    FOR i IN 1..v_number_of_months LOOP
      v_current_date := DATE_TRUNC('month', v_contract.start_date) + (i || ' months')::INTERVAL;
      
      IF NOT EXISTS (
        SELECT 1 FROM contract_payment_schedules cps
        WHERE cps.contract_id = v_contract.id AND cps.installment_number = i
      ) THEN
        INSERT INTO contract_payment_schedules (
          company_id, contract_id, installment_number, amount, due_date, status, created_at
        ) VALUES (
          v_contract.company_id, v_contract.id, i, v_monthly_amount, v_current_date,
          CASE WHEN v_current_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END, NOW()
        );
        out_schedules_created := out_schedules_created + 1;
      END IF;
    END LOOP;

    -- 2. إنشاء الفواتير المفقودة
    FOR i IN 1..v_number_of_months LOOP
      v_current_date := DATE_TRUNC('month', v_contract.start_date) + (i || ' months')::INTERVAL;
      
      IF v_current_date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' THEN
        IF NOT EXISTS (
          SELECT 1 FROM invoices inv
          WHERE inv.contract_id = v_contract.id
            AND inv.status != 'cancelled'
            AND TO_CHAR(inv.due_date, 'YYYY-MM') = TO_CHAR(v_current_date, 'YYYY-MM')
        ) THEN
          INSERT INTO invoices (
            company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
            total_amount, subtotal, payment_status, status, invoice_type, description, created_at
          ) VALUES (
            v_contract.company_id, v_contract.customer_id, v_contract.id,
            'INV-' || v_contract.c_contract_number || '-' || TO_CHAR(v_current_date, 'YYYY-MM'),
            v_current_date - INTERVAL '5 days', v_current_date, v_monthly_amount, v_monthly_amount,
            'unpaid', 'draft', 'rental', 'فاتورة إيجار شهرية - ' || TO_CHAR(v_current_date, 'YYYY-MM'), NOW()
          );
          out_invoices_fixed := out_invoices_fixed + 1;
        END IF;
      END IF;
    END LOOP;

    -- 3. تزامن حالة جدول الدفعات مع الفواتير
    FOR v_schedule IN
      SELECT ps.id, ps.due_date, ps.amount, ps.installment_number
      FROM contract_payment_schedules ps WHERE ps.contract_id = v_contract.id
    LOOP
      SELECT inv.id, inv.paid_amount, inv.total_amount, inv.payment_status, inv.balance_due
      INTO v_invoice
      FROM invoices inv
      WHERE inv.contract_id = v_contract.id AND inv.status != 'cancelled'
        AND TO_CHAR(inv.due_date, 'YYYY-MM') = TO_CHAR(v_schedule.due_date, 'YYYY-MM')
      ORDER BY inv.created_at LIMIT 1;

      IF v_invoice.id IS NOT NULL THEN
        UPDATE contract_payment_schedules
        SET status = CASE 
            WHEN COALESCE(v_invoice.paid_amount, 0) >= v_invoice.total_amount THEN 'paid'
            WHEN COALESCE(v_invoice.paid_amount, 0) > 0 THEN 'partially_paid'
            WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending' END,
          paid_amount = COALESCE(v_invoice.paid_amount, 0),
          invoice_id = v_invoice.id, updated_at = NOW()
        WHERE id = v_schedule.id;
        out_schedules_synced := out_schedules_synced + 1;
      END IF;
    END LOOP;

    -- 4. إصلاح الدفعات المكررة
    WITH duplicates AS (
      SELECT p.id, ROW_NUMBER() OVER (
        PARTITION BY p.invoice_id, DATE(p.payment_date) ORDER BY p.created_at DESC
      ) as rn
      FROM payments p INNER JOIN invoices inv ON p.invoice_id = inv.id
      WHERE inv.contract_id = v_contract.id
    )
    UPDATE payments SET notes = COALESCE(notes, '') || ' [مكرر - يحتاج مراجعة]'
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
    
    GET DIAGNOSTICS out_duplicate_payments_fixed = ROW_COUNT;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION fix_contract_financial_data TO authenticated;;
