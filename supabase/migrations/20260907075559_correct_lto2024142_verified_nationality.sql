-- Applied as migration 20260907075559.
-- Source: signed contract LTO2024142, document ee02231e-aab5-4c30-9e71-7972c285d782,
-- page 1 explicitly states Sudan / سوداني and matches customer name + QID.
-- Only replace the missing placeholder; preserve all other customer fields.
UPDATE public.customers
SET nationality = 'سوداني'
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND id = '1ba63fa5-c6b9-4976-8f13-2a6cb50b3e57'
  AND nationality = 'غير محدد';
