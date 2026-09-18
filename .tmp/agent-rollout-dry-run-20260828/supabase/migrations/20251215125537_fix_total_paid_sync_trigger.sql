
-- =====================================================
-- إصلاح مشكلة total_paid في العقود
-- تاريخ: 2025-12-15
-- =====================================================

-- 1. إنشاء دالة لحساب total_paid من الدفعات الفعلية
CREATE OR REPLACE FUNCTION calculate_contract_total_paid(p_contract_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM payments
    WHERE contract_id = p_contract_id
      AND payment_status IN ('completed', 'paid', 'confirmed');
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 2. إنشاء دالة لتحديث total_paid عند تغيير الدفعات
CREATE OR REPLACE FUNCTION sync_contract_total_paid()
RETURNS TRIGGER AS $$
DECLARE
    v_contract_id UUID;
    v_new_total NUMERIC;
    v_contract_amount NUMERIC;
BEGIN
    -- تحديد العقد المتأثر
    IF TG_OP = 'DELETE' THEN
        v_contract_id := OLD.contract_id;
    ELSE
        v_contract_id := NEW.contract_id;
    END IF;
    
    -- إذا لم يكن هناك عقد مرتبط، لا نفعل شيء
    IF v_contract_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;
    
    -- حساب المجموع الجديد
    v_new_total := calculate_contract_total_paid(v_contract_id);
    
    -- الحصول على قيمة العقد
    SELECT contract_amount INTO v_contract_amount
    FROM contracts WHERE id = v_contract_id;
    
    -- تحديث العقد
    UPDATE contracts
    SET 
        total_paid = v_new_total,
        balance_due = COALESCE(v_contract_amount, 0) - v_new_total,
        updated_at = NOW()
    WHERE id = v_contract_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. حذف الـ trigger القديم إذا وجد
DROP TRIGGER IF EXISTS trigger_sync_contract_total_paid ON payments;

-- 4. إنشاء الـ trigger الجديد
CREATE TRIGGER trigger_sync_contract_total_paid
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION sync_contract_total_paid();

-- 5. تصحيح جميع العقود المتأثرة (تحديث total_paid من الدفعات الفعلية)
UPDATE contracts c
SET 
    total_paid = (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.contract_id = c.id
          AND p.payment_status IN ('completed', 'paid', 'confirmed')
    ),
    balance_due = c.contract_amount - (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.contract_id = c.id
          AND p.payment_status IN ('completed', 'paid', 'confirmed')
    ),
    updated_at = NOW()
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- 6. إظهار العقود التي تم تصحيحها
SELECT 
    contract_number,
    contract_amount,
    total_paid as new_total_paid,
    balance_due as new_balance_due
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND total_paid > 0
ORDER BY total_paid DESC
LIMIT 10;
;
