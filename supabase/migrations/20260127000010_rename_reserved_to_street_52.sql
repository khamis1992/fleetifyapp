-- تحديث الدوال لاستخدام street_52 بدلاً من reserved
-- ملاحظة: تم تغيير الـ enum مسبقاً (reserved → street_52)
-- نحتاج فقط لتحديث الدوال

-- تحديث الدالة sync_vehicle_status_with_contracts
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
        -- إذا لم يكن هناك عقود نشطة والحالة الحالية street_52، نبقيها street_52
        IF v_current_status = 'street_52' THEN
            v_expected_status := 'street_52'::vehicle_status;
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

COMMENT ON FUNCTION public.sync_vehicle_status_with_contracts(UUID) IS 
'تصحيح حالة مركبة واحدة بناءً على العقود المرتبطة بها.
- إذا كان لديها عقود active أو under_legal_procedure → rented
- إذا لم يكن لديها عقود نشطة → available أو street_52
- ⚠️ لا يتم تغيير الحالات الخاصة: maintenance, out_of_service, accident, stolen, police_station, reserved_employee';

-- تحديث الـ trigger الرئيسي
CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Skip if no vehicle is linked
    IF TG_OP = 'INSERT' THEN
        IF NEW.vehicle_id IS NOT NULL THEN
            UPDATE vehicles 
            SET status = CASE 
                WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                WHEN NEW.status = 'draft' THEN 'street_52'::vehicle_status
                ELSE status
            END
            WHERE id = NEW.vehicle_id
              AND status IS DISTINCT FROM CASE 
                WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                WHEN NEW.status = 'draft' THEN 'street_52'::vehicle_status
                ELSE status
              END;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Check if vehicle_id has changed
        IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
            -- Make old vehicle available (if it exists)
            IF OLD.vehicle_id IS NOT NULL THEN
                UPDATE vehicles 
                SET status = 'available'::vehicle_status
                WHERE id = OLD.vehicle_id
                  AND status != 'available'::vehicle_status;
            END IF;
            
            -- Update new vehicle status based on contract status
            IF NEW.vehicle_id IS NOT NULL THEN
                UPDATE vehicles 
                SET status = CASE 
                    WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                    WHEN NEW.status = 'draft' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'under_review' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'suspended' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'under_legal_procedure' THEN 'rented'::vehicle_status
                    ELSE status
                END
                WHERE id = NEW.vehicle_id
                  AND status IS DISTINCT FROM CASE 
                    WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                    WHEN NEW.status = 'draft' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'under_review' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'suspended' THEN 'street_52'::vehicle_status
                    WHEN NEW.status = 'under_legal_procedure' THEN 'rented'::vehicle_status
                    ELSE status
                  END;
            END IF;
            
            RETURN NEW;
        END IF;
        
        -- If vehicle_id hasn't changed, check if status has changed
        IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
            RETURN NEW;
        END IF;
        
        -- Skip if no vehicle is linked
        IF NEW.vehicle_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Update vehicle status based on contract status change
        IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
            -- Contract cancelled - make vehicle available
            UPDATE vehicles 
            SET status = 'available'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'available'::vehicle_status;
              
        ELSIF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
            -- Contract activated - make vehicle rented
            UPDATE vehicles 
            SET status = 'rented'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'rented'::vehicle_status;
              
        ELSIF NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM 'under_review' THEN
            -- Contract under review - make vehicle street_52
            UPDATE vehicles 
            SET status = 'street_52'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'street_52'::vehicle_status;
              
        ELSIF NEW.status = 'suspended' AND OLD.status IS DISTINCT FROM 'suspended' THEN
            -- Contract suspended - keep vehicle as street_52
            UPDATE vehicles 
            SET status = 'street_52'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'street_52'::vehicle_status;
              
        ELSIF NEW.status = 'under_legal_procedure' AND OLD.status IS DISTINCT FROM 'under_legal_procedure' THEN
            -- Contract under legal procedure - keep vehicle as rented
            NULL;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.vehicle_id IS NOT NULL THEN
            UPDATE vehicles 
            SET status = 'available'::vehicle_status
            WHERE id = OLD.vehicle_id
              AND status != 'available'::vehicle_status;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_vehicle_status_from_contract() IS 
'تحديث حالة المركبة تلقائياً عند تغيير حالة العقد أو تغيير المركبة.
- عند تغيير vehicle_id: المركبة القديمة تصبح available، المركبة الجديدة تأخذ حالة حسب status العقد
- active: المركبة تصبح rented
- cancelled: المركبة تصبح available
- under_review: المركبة تصبح street_52
- suspended: المركبة تصبح street_52
- under_legal_procedure: المركبة تبقى rented (لا تتغير)';
