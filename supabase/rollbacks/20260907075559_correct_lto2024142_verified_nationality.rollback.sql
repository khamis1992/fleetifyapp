-- Restore only the exact value corrected by migration 20260907075559.
UPDATE public.customers
SET nationality = 'غير محدد'
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND id = '1ba63fa5-c6b9-4976-8f13-2a6cb50b3e57'
  AND nationality = 'سوداني';
