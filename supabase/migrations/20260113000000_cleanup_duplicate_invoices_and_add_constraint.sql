-- ================================================================
-- MIGRATION: تنظيف الفواتير المكررة وإضافة constraint لمنع التكرار
-- ================================================================
-- الغرض: 
-- 1. تنظيف الفواتير المكررة (أكثر من فاتورة لنفس العقد في نفس الشهر)
-- 2. إضافة constraint لمنع إنشاء فواتير مكررة في المستقبل
-- 3. إضافة دالة للتحقق قبل الإدراج
-- ================================================================

-- ================================================================
-- STEP 1: إنشاء جدول مؤقت للفواتير المكررة
-- ================================================================
DO $$
DECLARE
    v_duplicate RECORD;
    v_keep_invoice_id UUID;
    v_duplicates_found INTEGER := 0;
    v_duplicates_cleaned INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 بدء تحليل الفواتير المكررة...';

    -- البحث عن الفواتير المكررة (أكثر من فاتورة لنفس العقد في نفس الشهر)
    FOR v_duplicate IN
        SELECT 
            contract_id,
            DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE AS invoice_month,
            COUNT(*) AS duplicate_count,
            array_agg(id ORDER BY created_at ASC) AS invoice_ids,
            array_agg(invoice_number ORDER BY created_at ASC) AS invoice_numbers
        FROM invoices
        WHERE contract_id IS NOT NULL
          AND status != 'cancelled'
          AND invoice_type IN ('rental', 'service', 'sale')
        GROUP BY contract_id, DATE_TRUNC('month', COALESCE(due_date, invoice_date))
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
    LOOP
        v_duplicates_found := v_duplicates_found + 1;
        
        -- الاحتفاظ بأول فاتورة (الأقدم)
        v_keep_invoice_id := v_duplicate.invoice_ids[1];
        
        RAISE NOTICE '📋 العقد: %, الشهر: %, عدد المكررات: %', 
            v_duplicate.contract_id, 
            v_duplicate.invoice_month, 
            v_duplicate.duplicate_count;
        RAISE NOTICE '   الفواتير: %', v_duplicate.invoice_numbers;
        RAISE NOTICE '   ✅ الاحتفاظ بـ: %, ❌ إلغاء البقية', v_duplicate.invoice_numbers[1];

        -- نقل الدفعات من الفواتير المكررة إلى الفاتورة الأصلية
        UPDATE payments
        SET invoice_id = v_keep_invoice_id
        WHERE invoice_id = ANY(v_duplicate.invoice_ids[2:array_length(v_duplicate.invoice_ids, 1)]);

        -- إلغاء الفواتير المكررة (باستثناء الأولى)
        UPDATE invoices
        SET 
            status = 'cancelled',
            notes = COALESCE(notes, '') || ' | ملغاة تلقائياً - مكررة مع الفاتورة: ' || v_duplicate.invoice_numbers[1] || ' | تم الإلغاء: ' || NOW()::TEXT
        WHERE id = ANY(v_duplicate.invoice_ids[2:array_length(v_duplicate.invoice_ids, 1)]);

        v_duplicates_cleaned := v_duplicates_cleaned + (v_duplicate.duplicate_count - 1);
    END LOOP;

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '✅ تم تنظيف الفواتير المكررة بنجاح';
    RAISE NOTICE '📊 الإحصائيات:';
    RAISE NOTICE '   - مجموعات مكررة: %', v_duplicates_found;
    RAISE NOTICE '   - فواتير تم إلغاؤها: %', v_duplicates_cleaned;
    RAISE NOTICE '====================================================================';
END $$;

-- ================================================================
-- STEP 2: إعادة حساب أرصدة الفواتير المحتفظ بها
-- ================================================================
DO $$
DECLARE
    v_invoice RECORD;
    v_total_paid DECIMAL(15,3);
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '💰 إعادة حساب أرصدة الفواتير...';

    FOR v_invoice IN
        SELECT DISTINCT i.id, i.total_amount
        FROM invoices i
        WHERE i.status != 'cancelled'
          AND i.contract_id IS NOT NULL
          AND i.invoice_type IN ('rental', 'service', 'sale')
    LOOP
        -- حساب مجموع الدفعات
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE invoice_id = v_invoice.id
          AND payment_status = 'completed';

        -- تحديث الفاتورة
        UPDATE invoices
        SET 
            paid_amount = v_total_paid,
            balance_due = GREATEST(0, total_amount - v_total_paid),
            payment_status = CASE
                WHEN v_total_paid >= total_amount THEN 'paid'
                WHEN v_total_paid > 0 THEN 'partial'
                ELSE 'unpaid'
            END,
            updated_at = NOW()
        WHERE id = v_invoice.id
          AND (paid_amount IS DISTINCT FROM v_total_paid OR balance_due IS DISTINCT FROM GREATEST(0, total_amount - v_total_paid));

        IF FOUND THEN
            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ تم تحديث % فاتورة', v_updated_count;
END $$;

-- ================================================================
-- STEP 3: إنشاء دالة للتحقق من تكرار الفواتير
-- ================================================================
CREATE OR REPLACE FUNCTION check_duplicate_monthly_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_invoice_id UUID;
    v_existing_invoice_number VARCHAR(100);
    v_invoice_month DATE;
BEGIN
    -- فقط للفواتير الشهرية المرتبطة بعقود
    IF NEW.contract_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- تجاهل الفواتير الملغاة
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- تحديد شهر الفاتورة
    v_invoice_month := DATE_TRUNC('month', COALESCE(NEW.due_date, NEW.invoice_date))::DATE;

    -- البحث عن فاتورة موجودة لنفس العقد في نفس الشهر
    SELECT id, invoice_number
    INTO v_existing_invoice_id, v_existing_invoice_number
    FROM invoices
    WHERE contract_id = NEW.contract_id
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE = v_invoice_month
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    LIMIT 1;

    IF v_existing_invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'فاتورة مكررة: توجد فاتورة (%) لنفس العقد في شهر %. استخدم الفاتورة الموجودة بدلاً من إنشاء واحدة جديدة.', 
            v_existing_invoice_number, 
            TO_CHAR(v_invoice_month, 'YYYY-MM')
        USING ERRCODE = '23505'; -- unique_violation
    END IF;

    RETURN NEW;
END;
$$;

-- إزالة الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON invoices;

-- إنشاء الـ trigger
CREATE TRIGGER trigger_check_duplicate_monthly_invoice
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_monthly_invoice();

-- ================================================================
-- STEP 4: إنشاء دالة مساعدة للبحث عن فاتورة موجودة
-- ================================================================
CREATE OR REPLACE FUNCTION find_or_create_monthly_invoice(
    p_company_id UUID,
    p_customer_id UUID,
    p_contract_id UUID,
    p_contract_number VARCHAR(100),
    p_monthly_amount DECIMAL(15,3),
    p_invoice_month DATE DEFAULT NULL -- إذا NULL، يستخدم الشهر الحالي
)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number VARCHAR(100),
    is_new BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_month DATE;
    v_existing_invoice RECORD;
    v_new_invoice RECORD;
    v_invoice_number VARCHAR(100);
    v_first_day DATE;
BEGIN
    -- تحديد شهر الفاتورة
    v_invoice_month := COALESCE(p_invoice_month, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    v_first_day := v_invoice_month;

    -- البحث عن فاتورة موجودة
    SELECT id, i.invoice_number INTO v_existing_invoice
    FROM invoices i
    WHERE i.contract_id = p_contract_id
      AND DATE_TRUNC('month', COALESCE(i.due_date, i.invoice_date))::DATE = v_invoice_month
      AND i.status != 'cancelled'
    LIMIT 1;

    IF v_existing_invoice.id IS NOT NULL THEN
        -- إرجاع الفاتورة الموجودة
        RETURN QUERY SELECT 
            v_existing_invoice.id,
            v_existing_invoice.invoice_number,
            FALSE,
            'تم العثور على فاتورة موجودة'::TEXT;
        RETURN;
    END IF;

    -- إنشاء رقم فاتورة جديد
    SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD((COUNT(*) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices
    WHERE company_id = p_company_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

    -- إنشاء فاتورة جديدة
    INSERT INTO invoices (
        company_id,
        customer_id,
        contract_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        subtotal,
        tax_amount,
        discount_amount,
        paid_amount,
        balance_due,
        status,
        payment_status,
        invoice_type,
        notes,
        currency
    ) VALUES (
        p_company_id,
        p_customer_id,
        p_contract_id,
        v_invoice_number,
        v_first_day,
        v_first_day,
        p_monthly_amount,
        p_monthly_amount,
        0,
        0,
        0,
        p_monthly_amount,
        'sent',
        'unpaid',
        'rental',
        'فاتورة إيجار شهرية - ' || TO_CHAR(v_invoice_month, 'YYYY-MM') || ' - عقد #' || p_contract_number,
        'QAR'
    )
    RETURNING id, invoices.invoice_number INTO v_new_invoice;

    RETURN QUERY SELECT 
        v_new_invoice.id,
        v_new_invoice.invoice_number,
        TRUE,
        'تم إنشاء فاتورة جديدة'::TEXT;
END;
$$;

-- ================================================================
-- STEP 5: إنشاء view لعرض الفواتير المكررة (للمراقبة)
-- ================================================================
CREATE OR REPLACE VIEW v_duplicate_invoices_monitor AS
SELECT 
    contract_id,
    DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE AS invoice_month,
    COUNT(*) AS duplicate_count,
    array_agg(id ORDER BY created_at ASC) AS invoice_ids,
    array_agg(invoice_number ORDER BY created_at ASC) AS invoice_numbers,
    array_agg(status ORDER BY created_at ASC) AS statuses,
    MIN(created_at) AS first_created,
    MAX(created_at) AS last_created
FROM invoices
WHERE contract_id IS NOT NULL
  AND status != 'cancelled'
GROUP BY contract_id, DATE_TRUNC('month', COALESCE(due_date, invoice_date))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

COMMENT ON VIEW v_duplicate_invoices_monitor IS 'عرض لمراقبة الفواتير المكررة - يجب أن يكون فارغاً في الوضع الطبيعي';

-- ================================================================
-- STEP 6: منح الصلاحيات
-- ================================================================
GRANT EXECUTE ON FUNCTION check_duplicate_monthly_invoice() TO authenticated;
GRANT EXECUTE ON FUNCTION find_or_create_monthly_invoice(UUID, UUID, UUID, VARCHAR, DECIMAL, DATE) TO authenticated;
GRANT SELECT ON v_duplicate_invoices_monitor TO authenticated;

-- ================================================================
-- STEP 7: إضافة تعليقات
-- ================================================================
COMMENT ON FUNCTION check_duplicate_monthly_invoice IS 
'Trigger function to prevent duplicate monthly invoices for the same contract';

COMMENT ON FUNCTION find_or_create_monthly_invoice IS 
'Finds existing invoice for a contract/month or creates a new one. Use this to ensure no duplicates.';

-- ================================================================
-- FINAL REPORT
-- ================================================================
DO $$
DECLARE
    v_remaining_duplicates INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_remaining_duplicates FROM v_duplicate_invoices_monitor;
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ما تم تنفيذه:';
    RAISE NOTICE '   1. تنظيف الفواتير المكررة (نقل الدفعات + إلغاء المكررات)';
    RAISE NOTICE '   2. إعادة حساب أرصدة الفواتير';
    RAISE NOTICE '   3. إضافة trigger لمنع إنشاء فواتير مكررة';
    RAISE NOTICE '   4. إنشاء دالة find_or_create_monthly_invoice للاستخدام الآمن';
    RAISE NOTICE '   5. إنشاء view للمراقبة: v_duplicate_invoices_monitor';
    RAISE NOTICE '';
    RAISE NOTICE '📊 الفواتير المكررة المتبقية: %', v_remaining_duplicates;
    IF v_remaining_duplicates = 0 THEN
        RAISE NOTICE '   ✅ لا توجد فواتير مكررة - النظام نظيف!';
    ELSE
        RAISE NOTICE '   ⚠️ توجد فواتير مكررة - يرجى مراجعة v_duplicate_invoices_monitor';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';
END $$;
