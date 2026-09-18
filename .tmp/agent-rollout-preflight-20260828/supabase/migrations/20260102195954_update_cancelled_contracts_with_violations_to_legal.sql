-- تحديث العقود الملغاة التي فيها مخالفات مرورية إلى "تحت الإجراء القانوني"
UPDATE contracts c
SET status = 'under_legal_procedure',
    updated_at = now()
WHERE c.status = 'cancelled'
  AND c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND EXISTS (
    SELECT 1 FROM traffic_violations tv
    WHERE tv.vehicle_id = c.vehicle_id
      AND tv.status != 'paid'
  );
;
