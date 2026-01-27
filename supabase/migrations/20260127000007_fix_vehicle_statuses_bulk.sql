-- إصلاح شامل: تصحيح حالات جميع المركبات بناءً على العقود المرتبطة
-- المشكلة: 62 مركبة لديها عقود نشطة لكن حالتها available
-- الحل: دالة لتصحيح الحالات تلقائياً + تشغيلها مرة واحدة

-- الدالة: تصحيح حالة مركبة واحدة بناءً على عقودها
CREATE OR REPLACE FUNCTION public.sync_vehicle_status_with_contracts(p_vehicle_id UUID)
RETURNS TABLE(
    vehicle_id UUID,
    old_status vehicle_status,
    new_status vehicle_status,
    active_contracts_count INT,
    changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_current_status vehicle_status;
    v_expected_status vehicle_status;
    v_active_count INT;
    v_legal_count INT;
BEGIN
    -- الحصول على الحالة الحالية
    SELECT status INTO v_current_status
    FROM vehicles
    WHERE id = p_vehicle_id;
    
    -- حساب عدد العقود النشطة والقانونية
    SELECT 
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'under_legal_procedure')
    INTO v_active_count, v_legal_count
    FROM contracts
    WHERE vehicle_id = p_vehicle_id
      AND status IN ('active', 'under_legal_procedure');
    
    -- تحديد الحالة المتوقعة
    IF v_active_count > 0 THEN
        v_expected_status := 'rented'::vehicle_status;
    ELSIF v_legal_count > 0 THEN
        v_expected_status := 'rented'::vehicle_status;
    ELSE
        v_expected_status := 'available'::vehicle_status;
    END IF;
    
    -- تحديث الحالة إذا كانت مختلفة
    IF v_current_status IS DISTINCT FROM v_expected_status THEN
        UPDATE vehicles
        SET status = v_expected_status,
            updated_at = NOW()
        WHERE id = p_vehicle_id;
        
        RETURN QUERY SELECT 
            p_vehicle_id,
            v_current_status,
            v_expected_status,
            (v_active_count + v_legal_count)::INT,
            TRUE;
    ELSE
        RETURN QUERY SELECT 
            p_vehicle_id,
            v_current_status,
            v_expected_status,
            (v_active_count + v_legal_count)::INT,
            FALSE;
    END IF;
END;
$$;

-- الدالة: تصحيح حالات جميع المركبات
CREATE OR REPLACE FUNCTION public.sync_all_vehicle_statuses()
RETURNS TABLE(
    total_vehicles INT,
    vehicles_updated INT,
    vehicles_unchanged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_total INT := 0;
    v_updated INT := 0;
    v_unchanged INT := 0;
    v_vehicle RECORD;
BEGIN
    -- معالجة كل مركبة
    FOR v_vehicle IN 
        SELECT DISTINCT v.id
        FROM vehicles v
        WHERE v.is_active = true
    LOOP
        v_total := v_total + 1;
        
        -- تصحيح حالة المركبة
        PERFORM * FROM sync_vehicle_status_with_contracts(v_vehicle.id)
        WHERE changed = true;
        
        IF FOUND THEN
            v_updated := v_updated + 1;
        ELSE
            v_unchanged := v_unchanged + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_total, v_updated, v_unchanged;
END;
$$;

-- التعليقات
COMMENT ON FUNCTION public.sync_vehicle_status_with_contracts(UUID) IS 
'تصحيح حالة مركبة واحدة بناءً على العقود المرتبطة بها.
- إذا كان لديها عقود active أو under_legal_procedure → rented
- إذا لم يكن لديها عقود نشطة → available';

COMMENT ON FUNCTION public.sync_all_vehicle_statuses() IS 
'تصحيح حالات جميع المركبات في النظام بناءً على العقود المرتبطة.
يتم تشغيلها مرة واحدة لإصلاح البيانات القديمة.';

-- تشغيل الدالة لإصلاح جميع المركبات
DO $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM sync_all_vehicle_statuses();
    
    RAISE NOTICE '✅ تم تصحيح حالات المركبات:';
    RAISE NOTICE '   - إجمالي المركبات: %', v_result.total_vehicles;
    RAISE NOTICE '   - تم التحديث: %', v_result.vehicles_updated;
    RAISE NOTICE '   - بدون تغيير: %', v_result.vehicles_unchanged;
END $$;
