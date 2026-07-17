BEGIN;

ALTER TABLE public.penalties
  DROP CONSTRAINT IF EXISTS penalties_safe_historical_import_amount;

INSERT INTO public.penalties (
  id,
  company_id,
  penalty_number,
  violation_type,
  penalty_date,
  amount,
  location,
  vehicle_plate,
  reason,
  notes,
  customer_id,
  contract_id,
  vehicle_id,
  status,
  payment_status,
  created_by,
  created_at,
  updated_at,
  paid_by_company,
  company_paid_date,
  customer_payment_status
)
VALUES (
  '19bc22c7-ae24-4332-9acf-54dddcb060aa'::uuid,
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
  'HIST-a39f2060-2-2025-01',
  'مخالفة مرورية تاريخية من ملف Excel',
  '2025-02-01'::date,
  72002024,
  NULL,
  '856718',
  'استيراد تاريخي من ملف Excel',
  'تم إنشاؤها من ملف FORMA   B70  856 718         حسان بوعلاقي.xlsx للشهر 2-2025 - مخالفة 1 من 1',
  '5b52a765-4ce6-4d62-9033-e0a2d0b605f7'::uuid,
  'a39f2060-8759-42e4-a927-5fbdbc1f3687'::uuid,
  'fb22534b-b54e-4d54-98c3-1acafad5d79e'::uuid,
  'pending',
  'unpaid',
  '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::uuid,
  '2026-06-29T19:40:42.444805+00:00'::timestamptz,
  '2026-06-29T19:40:42.444805+00:00'::timestamptz,
  false,
  NULL,
  'unpaid'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
