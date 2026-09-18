BEGIN;
SET LOCAL lock_timeout='5s';
DO $undo$
DECLARE r record;v jsonb;
BEGIN
 FOR r IN SELECT * FROM public.financial_data_repair_snapshots WHERE migration_version='20260906175706' AND rolled_back_at IS NULL FOR UPDATE LOOP
  IF r.entity_type='contract_payment_schedules' THEN
   SELECT to_jsonb(s) INTO STRICT v FROM public.contract_payment_schedules s WHERE s.id=r.entity_id AND s.company_id=r.company_id FOR UPDATE;
   IF (v-'updated_at') IS DISTINCT FROM (r.after_value-'updated_at') THEN RAISE EXCEPTION 'Schedule was changed after closure'; END IF;
   UPDATE public.financial_data_repair_snapshots SET rolled_back_at=now() WHERE migration_version=r.migration_version AND entity_type=r.entity_type AND entity_id=r.entity_id;
   UPDATE public.contract_payment_schedules SET status=r.before_value->>'status',financial_hold_reason=r.before_value->>'financial_hold_reason',notes=r.before_value->>'notes',updated_at=now()
    WHERE id=r.entity_id AND company_id=r.company_id;
  ELSIF r.entity_type='delinquent_customers' THEN
   SELECT to_jsonb(d) INTO STRICT v FROM public.delinquent_customers d WHERE d.id=r.entity_id AND d.company_id=r.company_id FOR UPDATE;
   IF (v-'last_updated_at') IS DISTINCT FROM (r.after_value-'last_updated_at') THEN RAISE EXCEPTION 'Delinquency changed after closure'; END IF;
   UPDATE public.delinquent_customers SET is_active=(r.before_value->>'is_active')::boolean,
    overdue_amount=(r.before_value->>'overdue_amount')::numeric,late_penalty=(r.before_value->>'late_penalty')::numeric,
    violations_amount=(r.before_value->>'violations_amount')::numeric,total_debt=(r.before_value->>'total_debt')::numeric,
    months_unpaid=(r.before_value->>'months_unpaid')::integer,days_overdue=(r.before_value->>'days_overdue')::integer,last_updated_at=now()
    WHERE id=r.entity_id AND company_id=r.company_id;
   UPDATE public.financial_data_repair_snapshots SET rolled_back_at=now() WHERE migration_version=r.migration_version AND entity_type=r.entity_type AND entity_id=r.entity_id;
  END IF;
 END LOOP;
END;$undo$;
COMMIT;

