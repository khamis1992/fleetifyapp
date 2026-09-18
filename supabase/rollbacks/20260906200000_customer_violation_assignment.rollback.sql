BEGIN;
DROP FUNCTION IF EXISTS public.assign_customer_violations_v1(uuid, jsonb);
DROP FUNCTION IF EXISTS public.preview_customer_violation_assignments_v1(uuid, uuid[]);
-- Audited customer assignments are business records and are intentionally preserved.
COMMIT;
