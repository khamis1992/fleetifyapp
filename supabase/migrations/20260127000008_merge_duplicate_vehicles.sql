-- إصلاح: دمج المركبات المكررة (نفس رقم اللوحة)
-- المشكلة: 20 رقم لوحة مكرر في النظام
-- الحل: دالة لدمج المركبات المكررة تلقائياً

-- الدالة: دمج مركبتين مكررتين
CREATE OR REPLACE FUNCTION public.merge_duplicate_vehicles(
    p_keep_vehicle_id UUID,
    p_remove_vehicle_id UUID
)
RETURNS TABLE(
    kept_vehicle_id UUID,
    removed_vehicle_id UUID,
    contracts_moved INT,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_contracts_count INT;
BEGIN
    -- التحقق من أن المركبتين موجودتان
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_keep_vehicle_id) THEN
        RETURN QUERY SELECT 
            p_keep_vehicle_id,
            p_remove_vehicle_id,
            0,
            FALSE,
            'المركبة المراد الاحتفاظ بها غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_remove_vehicle_id) THEN
        RETURN QUERY SELECT 
            p_keep_vehicle_id,
            p_remove_vehicle_id,
            0,
            FALSE,
            'المركبة المراد حذفها غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    -- حساب عدد العقود المرتبطة بالمركبة المراد حذفها
    SELECT COUNT(*) INTO v_contracts_count
    FROM contracts
    WHERE vehicle_id = p_remove_vehicle_id;
    
    -- نقل جميع العقود من المركبة القديمة إلى الجديدة
    UPDATE contracts
    SET vehicle_id = p_keep_vehicle_id,
        updated_at = NOW()
    WHERE vehicle_id = p_remove_vehicle_id;
    
    -- نقل جميع سجلات الصيانة
    UPDATE maintenance_records
    SET vehicle_id = p_keep_vehicle_id,
        updated_at = NOW()
    WHERE vehicle_id = p_remove_vehicle_id;
    
    -- تعطيل المركبة القديمة (soft delete)
    UPDATE vehicles
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_remove_vehicle_id;
    
    -- تصحيح حالة المركبة المحتفظ بها
    PERFORM sync_vehicle_status_with_contracts(p_keep_vehicle_id);
    
    RETURN QUERY SELECT 
        p_keep_vehicle_id,
        p_remove_vehicle_id,
        v_contracts_count,
        TRUE,
        'تم الدمج بنجاح'::TEXT;
END;
$$;

-- الدالة: دمج جميع المركبات المكررة تلقائياً
CREATE OR REPLACE FUNCTION public.merge_all_duplicate_vehicles()
RETURNS TABLE(
    plate_number TEXT,
    kept_vehicle_id UUID,
    removed_vehicle_id UUID,
    contracts_moved INT,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_duplicate RECORD;
    v_vehicles UUID[];
    v_keep_id UUID;
    v_remove_id UUID;
    v_result RECORD;
BEGIN
    -- البحث عن جميع أرقام اللوحات المكررة
    FOR v_duplicate IN
        SELECT 
            v.plate_number,
            ARRAY_AGG(v.id ORDER BY v.created_at ASC) as vehicle_ids
        FROM vehicles v
        WHERE v.is_active = true
        GROUP BY v.plate_number
        HAVING COUNT(*) > 1
    LOOP
        v_vehicles := v_duplicate.vehicle_ids;
        
        -- الاحتفاظ بالمركبة الأقدم (الأولى)
        v_keep_id := v_vehicles[1];
        
        -- دمج جميع المركبات الأخرى في الأولى
        FOR i IN 2..ARRAY_LENGTH(v_vehicles, 1)
        LOOP
            v_remove_id := v_vehicles[i];
            
            -- دمج المركبة
            SELECT * INTO v_result
            FROM merge_duplicate_vehicles(v_keep_id, v_remove_id);
            
            RETURN QUERY SELECT 
                v_duplicate.plate_number,
                v_result.kept_vehicle_id,
                v_result.removed_vehicle_id,
                v_result.contracts_moved,
                v_result.success;
        END LOOP;
    END LOOP;
END;
$$;

-- التعليقات
COMMENT ON FUNCTION public.merge_duplicate_vehicles(UUID, UUID) IS 
'دمج مركبتين مكررتين (نفس رقم اللوحة).
- نقل جميع العقود والصيانة من المركبة القديمة إلى الجديدة
- تعطيل المركبة القديمة
- تصحيح حالة المركبة المحتفظ بها';

COMMENT ON FUNCTION public.merge_all_duplicate_vehicles() IS 
'دمج جميع المركبات المكررة في النظام تلقائياً.
يتم الاحتفاظ بالمركبة الأقدم (الأولى) ودمج الباقي فيها.';

-- ملاحظة: لا نقوم بتشغيل الدالة تلقائياً
-- يجب على المستخدم مراجعة المركبات المكررة أولاً قبل الدمج
RAISE NOTICE '⚠️ تحذير: تم إنشاء دالة merge_all_duplicate_vehicles()';
RAISE NOTICE '   لتشغيلها يدوياً: SELECT * FROM merge_all_duplicate_vehicles();';
RAISE NOTICE '   يرجى مراجعة المركبات المكررة قبل التشغيل!';
