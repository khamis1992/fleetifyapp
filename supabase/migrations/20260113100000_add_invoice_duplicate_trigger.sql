-- =====================================================
-- Migration: إضافة Trigger لمنع الفواتير المكررة
-- Date: 2026-01-13
-- Purpose: منع إنشاء فواتير متعددة لنفس العقد في نفس الشهر
-- =====================================================

-- =====================================================
-- 1. دالة التحقق من الفواتير المكررة
-- =====================================================
CREATE OR REPLACE FUNCTION check_duplicate_monthly_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_month DATE;
    v_existing_invoice_id UUID;
    v_existing_invoice_number TEXT;
BEGIN
    -- تجاهل إذا لم يكن هناك عقد مرتبط
    IF NEW.contract_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- تحديد الشهر من due_date أو invoice_date
    v_invoice_month := DATE_TRUNC('month', COALESCE(NEW.due_date, NEW.invoice_date));
    
    -- البحث عن فاتورة موجودة لنفس العقد في نفس الشهر
    SELECT id, invoice_number 
    INTO v_existing_invoice_id, v_existing_invoice_number
    FROM invoices 
    WHERE contract_id = NEW.contract_id 
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date)) = v_invoice_month
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    
    -- إذا وجدت فاتورة مكررة، نرفض الإدخال
    IF v_existing_invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'فاتورة مكررة: يوجد فاتورة (%) لهذا العقد في شهر %', 
            v_existing_invoice_number, 
            TO_CHAR(v_invoice_month, 'YYYY-MM')
            USING ERRCODE = '23505'; -- Unique violation error code
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. إنشاء الـ Trigger
-- =====================================================
DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON invoices;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_monthly_invoice();

-- =====================================================
-- 3. منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION check_duplicate_monthly_invoice() TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_monthly_invoice() TO anon;
GRANT EXECUTE ON FUNCTION check_duplicate_monthly_invoice() TO service_role;

-- =====================================================
-- 4. إضافة تعليق توثيقي
-- =====================================================
COMMENT ON FUNCTION check_duplicate_monthly_invoice IS 
'Trigger function to prevent duplicate monthly invoices for the same contract.
Checks if an invoice already exists for the same contract in the same month (based on due_date or invoice_date).
If duplicate found, raises exception with error code 23505 (unique_violation).';

COMMENT ON TRIGGER trigger_check_duplicate_monthly_invoice ON invoices IS
'Prevents duplicate monthly invoices - only one invoice per contract per month is allowed';

-- =====================================================
-- 5. التحقق من نجاح الإنشاء
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء trigger منع الفواتير المكررة بنجاح';
    RAISE NOTICE '   - Function: check_duplicate_monthly_invoice()';
    RAISE NOTICE '   - Trigger: trigger_check_duplicate_monthly_invoice';
END $$;
