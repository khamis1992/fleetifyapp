-- إصلاح: تحديث حالات المركبات عند تغيير vehicle_id في العقد
-- المشكلة: عند تعديل العقد وتغيير المركبة، حالات المركبات لا تتحدث
-- الحل: إضافة معالجة لتغيير vehicle_id في الـ trigger

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
                WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
                ELSE status
            END
            WHERE id = NEW.vehicle_id
              AND status IS DISTINCT FROM CASE 
                WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
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
                    WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
                    WHEN NEW.status = 'under_review' THEN 'reserved'::vehicle_status
                    WHEN NEW.status = 'suspended' THEN 'reserved'::vehicle_status
                    WHEN NEW.status = 'under_legal_procedure' THEN 'rented'::vehicle_status
                    ELSE status
                END
                WHERE id = NEW.vehicle_id
                  AND status IS DISTINCT FROM CASE 
                    WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
                    WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
                    WHEN NEW.status = 'under_review' THEN 'reserved'::vehicle_status
                    WHEN NEW.status = 'suspended' THEN 'reserved'::vehicle_status
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
            -- Contract under review - make vehicle reserved
            UPDATE vehicles 
            SET status = 'reserved'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'reserved'::vehicle_status;
              
        ELSIF NEW.status = 'suspended' AND OLD.status IS DISTINCT FROM 'suspended' THEN
            -- Contract suspended - keep vehicle as reserved
            UPDATE vehicles 
            SET status = 'reserved'::vehicle_status
            WHERE id = NEW.vehicle_id
              AND status != 'reserved'::vehicle_status;
              
        ELSIF NEW.status = 'under_legal_procedure' AND OLD.status IS DISTINCT FROM 'under_legal_procedure' THEN
            -- Contract under legal procedure - keep vehicle as rented
            -- المركبة تبقى مؤجرة لأن العقد لا يزال قائماً
            -- فقط تم تحويله للشؤون القانونية لمتابعة المستحقات المالية
            -- لا نغير حالة المركبة
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

-- التعليق على الدالة
COMMENT ON FUNCTION public.update_vehicle_status_from_contract() IS 
'تحديث حالة المركبة تلقائياً عند تغيير حالة العقد أو تغيير المركبة.
- عند تغيير vehicle_id: المركبة القديمة تصبح available، المركبة الجديدة تأخذ حالة حسب status العقد
- active: المركبة تصبح rented
- cancelled: المركبة تصبح available
- under_review: المركبة تصبح reserved
- suspended: المركبة تصبح reserved
- under_legal_procedure: المركبة تبقى rented (لا تتغير)';
