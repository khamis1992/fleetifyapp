BEGIN;
SET LOCAL lock_timeout='5s';
DO $restore$
DECLARE r record;current_s jsonb;
BEGIN
 FOR r IN SELECT * FROM public.financial_data_repair_snapshots WHERE migration_version='20260906173435'
  AND rolled_back_at IS NULL ORDER BY entity_id FOR UPDATE LOOP
  SELECT to_jsonb(s) INTO STRICT current_s FROM public.contract_payment_schedules s WHERE id=r.entity_id AND company_id=r.company_id FOR UPDATE;
  IF (current_s-'updated_at') IS DISTINCT FROM (r.after_value-'updated_at') THEN RAISE EXCEPTION 'Later source review changes require manual rollback'; END IF;
  UPDATE public.contract_payment_schedules SET financial_hold_reason=r.before_value->>'financial_hold_reason',notes=r.before_value->>'notes',updated_at=now()
   WHERE id=r.entity_id AND company_id=r.company_id;
  UPDATE public.financial_data_repair_snapshots SET rolled_back_at=now()
   WHERE migration_version=r.migration_version AND entity_type=r.entity_type AND entity_id=r.entity_id;
 END LOOP;
END;$restore$;
COMMIT;

