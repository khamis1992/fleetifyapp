-- ============================================================================
-- المرحلة 1.2: إنشاء فواتير للأقساط المفقودة (229 قسط) - النسخة المحسنة
-- ============================================================================

-- إنشاء فواتير جديدة للأقساط التي لا يوجد لها فواتير
-- مع معالجة كاملة لجميع حالات الـ unique constraints
DO $$
DECLARE
  v_schedule RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_existing_invoice_id UUID;
  v_created_count INTEGER := 0;
  v_linked_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
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
    ORDER BY ps.due_date
  LOOP
    BEGIN
      -- التحقق من وجود أي فاتورة لنفس العقد والشهر (بما فيها الملغاة)
      SELECT id, status INTO v_existing_invoice_id
      FROM invoices
      WHERE contract_id = v_schedule.contract_id
        AND invoice_month = DATE_TRUNC('month', v_schedule.due_date)::DATE
      ORDER BY 
        CASE WHEN status != 'cancelled' THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_existing_invoice_id IS NOT NULL THEN
        -- ربط القسط بالفاتورة الموجودة (حتى لو ملغاة - نربط فقط غير الملغاة)
        SELECT id INTO v_existing_invoice_id
        FROM invoices
        WHERE contract_id = v_schedule.contract_id
          AND invoice_month = DATE_TRUNC('month', v_schedule.due_date)::DATE
          AND status != 'cancelled'
        LIMIT 1;
        
        IF v_existing_invoice_id IS NOT NULL THEN
          UPDATE contract_payment_schedules
          SET 
            invoice_id = v_existing_invoice_id,
            updated_at = NOW()
          WHERE id = v_schedule.schedule_id;
          v_linked_count := v_linked_count + 1;
        ELSE
          -- فاتورة موجودة لكن ملغاة - نتخطى
          v_skipped_count := v_skipped_count + 1;
        END IF;
      ELSE
        -- لا توجد فاتورة - ننشئ واحدة جديدة
        v_invoice_number := 'INV-' || v_schedule.contract_number || '-' || TO_CHAR(v_schedule.due_date, 'YYYY-MM');
        
        -- التحقق من عدم وجود invoice_number مكرر
        IF EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_invoice_number) THEN
          -- رقم الفاتورة موجود، نضيف suffix
          v_invoice_number := v_invoice_number || '-' || v_schedule.installment_number::TEXT;
        END IF;
        
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
          CASE WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue' ELSE 'draft' END,
          'sales',
          'فاتورة إيجار شهرية - قسط ' || v_schedule.installment_number,
          NOW()
        ) RETURNING id INTO v_invoice_id;

        -- ربط القسط بالفاتورة الجديدة
        UPDATE contract_payment_schedules
        SET 
          invoice_id = v_invoice_id,
          updated_at = NOW()
        WHERE id = v_schedule.schedule_id;
        
        v_created_count := v_created_count + 1;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        -- في حالة حدوث تعارض غير متوقع، نتخطى
        RAISE NOTICE 'تخطي القسط % بسبب تعارض', v_schedule.schedule_id;
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'تم إنشاء % فاتورة جديدة، ربط % قسط، تخطي % قسط', v_created_count, v_linked_count, v_skipped_count;
END $$;;
