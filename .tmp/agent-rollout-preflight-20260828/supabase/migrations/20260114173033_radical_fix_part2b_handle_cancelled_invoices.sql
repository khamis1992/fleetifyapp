-- ============================================================================
-- معالجة الأقساط التي لها فواتير ملغاة - إنشاء فواتير بديلة
-- ============================================================================

-- أولاً: تحديث unique constraint للسماح بعدة فواتير لنفس العقد/الشهر (غير الملغاة فقط)
DROP INDEX IF EXISTS idx_invoices_unique_contract_month;

CREATE UNIQUE INDEX idx_invoices_unique_contract_month 
ON invoices(contract_id, invoice_month) 
WHERE status != 'cancelled';

-- ثانياً: إنشاء فواتير بديلة للأقساط التي لها فواتير ملغاة
DO $$
DECLARE
  v_schedule RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_created_count INTEGER := 0;
BEGIN
  FOR v_schedule IN
    SELECT 
      ps.id as schedule_id,
      ps.contract_id,
      ps.company_id,
      ps.due_date,
      ps.amount,
      ps.installment_number,
      c.customer_id,
      c.contract_number
    FROM contract_payment_schedules ps
    JOIN contracts c ON c.id = ps.contract_id
    WHERE ps.invoice_id IS NULL
      AND ps.due_date <= CURRENT_DATE + INTERVAL '1 month'
      -- التأكد من وجود فاتورة ملغاة فقط (لا توجد فاتورة نشطة)
      AND NOT EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.contract_id = ps.contract_id 
        AND i.invoice_month = DATE_TRUNC('month', ps.due_date)::DATE
        AND i.status != 'cancelled'
      )
    ORDER BY ps.due_date
  LOOP
    BEGIN
      v_invoice_number := 'INV-' || v_schedule.contract_number || '-' || TO_CHAR(v_schedule.due_date, 'YYYY-MM') || '-R';
      
      -- إزالة أي suffix موجود إذا كان الرقم مكرراً
      WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_invoice_number) LOOP
        v_invoice_number := v_invoice_number || '1';
      END LOOP;
      
      INSERT INTO invoices (
        id,
        company_id,
        customer_id,
        contract_id,
        invoice_number,
        invoice_date,
        due_date,
        invoice_month,
        total_amount,
        subtotal,
        balance_due,
        paid_amount,
        payment_status,
        status,
        invoice_type,
        notes,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_schedule.company_id,
        v_schedule.customer_id,
        v_schedule.contract_id,
        v_invoice_number,
        v_schedule.due_date - INTERVAL '5 days',
        v_schedule.due_date,
        DATE_TRUNC('month', v_schedule.due_date)::DATE,
        v_schedule.amount,
        v_schedule.amount,
        v_schedule.amount,
        0,
        'unpaid',
        'overdue',
        'sales',
        'فاتورة إيجار شهرية بديلة - قسط ' || v_schedule.installment_number,
        NOW()
      ) RETURNING id INTO v_invoice_id;

      -- ربط القسط بالفاتورة الجديدة
      UPDATE contract_payment_schedules
      SET 
        invoice_id = v_invoice_id,
        updated_at = NOW()
      WHERE id = v_schedule.schedule_id;
      
      v_created_count := v_created_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إنشاء فاتورة للقسط %: %', v_schedule.schedule_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'تم إنشاء % فاتورة بديلة', v_created_count;
END $$;;
