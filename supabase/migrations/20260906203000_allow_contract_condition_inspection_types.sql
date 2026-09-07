BEGIN;
SET LOCAL lock_timeout = '5s';
-- Contract pickup/return writers and readers use check_in/check_out.
-- Preserve legacy dispatch reports and their existing semantics.
ALTER TABLE public.vehicle_condition_reports
  DROP CONSTRAINT vehicle_condition_reports_inspection_type_check;
ALTER TABLE public.vehicle_condition_reports
  ADD CONSTRAINT vehicle_condition_reports_inspection_type_check
  CHECK (inspection_type = ANY (ARRAY[
    'pre_dispatch'::text, 'post_dispatch'::text, 'contract_inspection'::text,
    'check_in'::text, 'check_out'::text
  ]));
COMMIT;
