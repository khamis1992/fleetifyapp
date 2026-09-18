BEGIN;
SET LOCAL lock_timeout = '5s';
-- Refuse to lose or silently relabel new inspection evidence.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.vehicle_condition_reports WHERE inspection_type IN ('check_in', 'check_out')) THEN
    RAISE EXCEPTION 'Rollback requires review of existing check_in/check_out reports; no records were changed';
  END IF;
END $$;
ALTER TABLE public.vehicle_condition_reports DROP CONSTRAINT vehicle_condition_reports_inspection_type_check;
ALTER TABLE public.vehicle_condition_reports ADD CONSTRAINT vehicle_condition_reports_inspection_type_check
  CHECK (inspection_type = ANY (ARRAY['pre_dispatch'::text, 'post_dispatch'::text, 'contract_inspection'::text]));
COMMIT;
