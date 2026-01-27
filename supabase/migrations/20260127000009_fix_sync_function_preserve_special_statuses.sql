-- إصلاح: الحفاظ على الحالات الخاصة للمركبات
-- المشكلة: الدالة sync_vehicle_status_with_contracts كانت تغير جميع الحالات إلى rented/available
-- الحل: عدم تغيير الحالات الخاصة (صيانة، حادث، مسروقة، إلخ)

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
    SELECT v.status INTO v_current_status
    FROM vehicles v
    WHERE v.id = p_vehicle_id;
    
    -- حساب عدد العقود النشطة والقانونية
    SELECT 
        COUNT(*) FILTER (WHERE c.status = 'active'),
        COUNT(*) FILTER (WHERE c.status = 'under_legal_procedure')
    INTO v_active_count, v_legal_count
    FROM contracts c
    WHERE c.vehicle_id = p_vehicle_id
      AND c.status IN ('active', 'under_legal_procedure');
    
    -- عدم تغيير الحالات الخاصة (صيانة، حادث، مسروقة، إلخ)
    IF v_current_status IN ('maintenance', 'out_of_service', 'accident', 'stolen', 'police_station', 'reserved_employee') THEN
        -- لا نغير هذه الحالات - تبقى كما هي
        RETURN QUERY SELECT 
            p_vehicle_id,
            v_current_status,
            v_current_status,
            (v_active_count + v_legal_count)::INT,
            FALSE;
        RETURN;
    END IF;
    
    -- تحديد الحالة المتوقعة للحالات العادية فقط
    IF v_active_count > 0 THEN
        v_expected_status := 'rented'::vehicle_status;
    ELSIF v_legal_count > 0 THEN
        v_expected_status := 'rented'::vehicle_status;
    ELSE
        -- إذا لم يكن هناك عقود نشطة والحالة الحالية reserved، نبقيها reserved
        IF v_current_status = 'reserved' THEN
            v_expected_status := 'reserved'::vehicle_status;
        ELSE
            v_expected_status := 'available'::vehicle_status;
        END IF;
    END IF;
    
    -- تحديث الحالة إذا كانت مختلفة
    IF v_current_status IS DISTINCT FROM v_expected_status THEN
        UPDATE vehicles v
        SET status = v_expected_status,
            updated_at = NOW()
        WHERE v.id = p_vehicle_id;
        
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

-- تحديث التعليق
COMMENT ON FUNCTION public.sync_vehicle_status_with_contracts(UUID) IS 
'تصحيح حالة مركبة واحدة بناءً على العقود المرتبطة بها.
- إذا كان لديها عقود active أو under_legal_procedure → rented
- إذا لم يكن لديها عقود نشطة → available أو reserved
- ⚠️ لا يتم تغيير الحالات الخاصة: maintenance, out_of_service, accident, stolen, police_station, reserved_employee';
