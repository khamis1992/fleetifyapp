-- تصحيح حالة المركبات المرتبطة بالعقود
-- هذه المهاجرة تصحح مشكلة حيث المركبات المرتبطة بالعقود النشطة 
-- لم تكن تظهر في حالة "مؤجرة" بشكل صحيح

-- 1. تحديث حالة المركبات المرتبطة بالعقود النشطة
UPDATE vehicles 
SET status = 'rented'
WHERE id IN (
    SELECT DISTINCT c.vehicle_id 
    FROM contracts c 
    WHERE c.vehicle_id IS NOT NULL 
    AND c.status = 'active'
    AND c.vehicle_id IN (SELECT id FROM vehicles WHERE status != 'rented')
);

-- 2. تحديث حالة المركبات المرتبطة بالعقود تحت التدقيق
UPDATE vehicles 
SET status = 'reserved'
WHERE id IN (
    SELECT DISTINCT c.vehicle_id 
    FROM contracts c 
    WHERE c.vehicle_id IS NOT NULL 
    AND c.status = 'under_review'
    AND c.vehicle_id IN (SELECT id FROM vehicles WHERE status != 'reserved')
);

-- 3. تحديث حالة المركبات المرتبطة بالعقود المسودة
UPDATE vehicles 
SET status = 'reserved'
WHERE id IN (
    SELECT DISTINCT c.vehicle_id 
    FROM contracts c 
    WHERE c.vehicle_id IS NOT NULL 
    AND c.status = 'draft'
    AND c.vehicle_id IN (SELECT id FROM vehicles WHERE status != 'reserved')
);

-- 4. التأكد من أن المركبات المرتبطة بالعقود الملغاة أو المنتهية هي في حالة متاحة
UPDATE vehicles 
SET status = 'available'
WHERE id IN (
    SELECT DISTINCT c.vehicle_id 
    FROM contracts c 
    WHERE c.vehicle_id IS NOT NULL 
    AND c.status IN ('cancelled', 'expired')
    AND c.vehicle_id IN (SELECT id FROM vehicles WHERE status IN ('rented', 'reserved'))
);

-- إنشاء trigger لتحديث حالة المركبة عند تغيير العقد
-- (هذا موجود في مهاجرة أخرى لكن نضيفه هنا للتأكد من وجوده)
DROP TRIGGER IF EXISTS contracts_vehicle_status_update ON public.contracts;
CREATE TRIGGER contracts_vehicle_status_update
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vehicle_status_from_contract();

-- تحديث PostgREST schema cache
NOTIFY pgrst, 'reload schema';