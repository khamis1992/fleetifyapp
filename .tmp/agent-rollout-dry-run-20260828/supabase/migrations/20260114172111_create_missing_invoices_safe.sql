-- دالة آمنة لإنشاء الفواتير المفقودة
CREATE OR REPLACE FUNCTION create_missing_invoices_safe()
RETURNS TABLE (
  invoices_created INT,
  schedules_linked INT,
  errors_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_created INT := 0;
  v_linked INT := 0;
  v_errors INT := 0;
  v_seq INT;
BEGIN
  -- الحصول على آخر رقم تسلسلي
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INT)), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE invoice_number ~ '^INV-AUTO-[0-9]+$';

  -- معالجة كل قسط بدون فاتورة
  FOR v_schedule IN
    SELECT 
      ps.id as schedule_id,
      ps.contract_id,
      ps.due_date,
      ps.amount,
      c.company_id,
      c.customer_id,
      c.contract_number,
      DATE_TRUNC('month', ps.due_date)::DATE as invoice_month_date
    FROM contract_payment_schedules ps
    JOIN contracts c ON c.id = ps.contract_id
    WHERE ps.invoice_id IS NULL 
      AND ps.due_date <= CURRENT_DATE
      AND c.status IN ('active', 'suspended', 'under_review')
    ORDER BY c.contract_number, ps.due_date
  LOOP
    BEGIN
      -- التحقق من عدم وجود فاتورة لهذا الشهر
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE contract_id = v_schedule.contract_id 
          AND invoice_month = v_schedule.invoice_month_date
          AND status != 'cancelled'
      ) THEN
        -- إنشاء رقم فاتورة فريد
        v_invoice_number := 'INV-AUTO-' || LPAD(v_seq::TEXT, 6, '0');
        v_seq := v_seq + 1;

        -- إنشاء الفاتورة
        INSERT INTO invoices (
          company_id, customer_id, contract_id,
          invoice_number, invoice_date, due_date, invoice_month,
          total_amount, subtotal, balance_due, paid_amount,
          payment_status, status, invoice_type, notes, created_at
        ) VALUES (
          v_schedule.company_id,
          v_schedule.customer_id,
          v_schedule.contract_id,
          v_invoice_number,
          v_schedule.due_date - INTERVAL '5 days',
          v_schedule.due_date,
          v_schedule.invoice_month_date,
          v_schedule.amount,
          v_schedule.amount,
          v_schedule.amount,
          0,
          'unpaid',
          CASE WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue' ELSE 'draft' END,
          'sales',
          'فاتورة إيجار شهرية - تم إنشاؤها تلقائياً - ' || v_schedule.contract_number,
          NOW()
        ) RETURNING id INTO v_invoice_id;

        v_created := v_created + 1;

        -- ربط القسط بالفاتورة
        UPDATE contract_payment_schedules
        SET 
          invoice_id = v_invoice_id,
          status = CASE WHEN due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
          updated_at = NOW()
        WHERE id = v_schedule.schedule_id;

        v_linked := v_linked + 1;
      ELSE
        -- ربط القسط بالفاتورة الموجودة
        SELECT id INTO v_invoice_id
        FROM invoices
        WHERE contract_id = v_schedule.contract_id
          AND invoice_month = v_schedule.invoice_month_date
          AND status != 'cancelled'
        LIMIT 1;

        IF v_invoice_id IS NOT NULL THEN
          UPDATE contract_payment_schedules
          SET 
            invoice_id = v_invoice_id,
            status = (
              SELECT CASE 
                WHEN COALESCE(paid_amount, 0) >= total_amount THEN 'paid'
                WHEN COALESCE(paid_amount, 0) > 0 THEN 'partially_paid'
                WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending'
              END FROM invoices WHERE id = v_invoice_id
            ),
            paid_amount = (SELECT COALESCE(paid_amount, 0) FROM invoices WHERE id = v_invoice_id),
            updated_at = NOW()
          WHERE id = v_schedule.schedule_id;

          v_linked := v_linked + 1;
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error for schedule %: %', v_schedule.schedule_id, SQLERRM;
    END;
  END LOOP;

  invoices_created := v_created;
  schedules_linked := v_linked;
  errors_count := v_errors;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION create_missing_invoices_safe TO authenticated;

-- تشغيل الدالة
SELECT * FROM create_missing_invoices_safe();;
