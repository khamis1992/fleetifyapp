-- Restores only this batch's schedule projections; rejects subsequent edits.
-- This intentionally restores the original review defects. No invoice or receipt is reversed.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.contract_payment_schedules IN ACCESS EXCLUSIVE MODE;
DO $restore$
DECLARE r record; current_row jsonb; old_s public.contract_payment_schedules%ROWTYPE; result jsonb;
BEGIN
 FOR r IN SELECT * FROM public.financial_data_repair_snapshots WHERE migration_version='20260906172212'
  AND entity_type='contract_payment_schedules' AND rolled_back_at IS NULL FOR UPDATE LOOP
  SELECT to_jsonb(s) INTO STRICT current_row FROM public.contract_payment_schedules s WHERE s.company_id=r.company_id AND s.id=r.entity_id;
  IF (current_row-'updated_at') IS DISTINCT FROM (r.after_value-'updated_at') THEN
   RAISE EXCEPTION 'A repaired schedule has later changes; manual rollback review required: %',r.entity_id;
  END IF;
 END LOOP;
 -- Restoration contains historical invalid links. Table lock prevents a concurrent write during this window.
 ALTER TABLE public.contract_payment_schedules DISABLE TRIGGER guard_financial_schedule_link_update_v1;
 ALTER TABLE public.contract_payment_schedules DISABLE TRIGGER guard_resolved_contract_schedule_v1;
 FOR r IN SELECT * FROM public.financial_data_repair_snapshots WHERE migration_version='20260906172212'
  AND entity_type='contract_payment_schedules' AND rolled_back_at IS NULL FOR UPDATE LOOP
  old_s:=jsonb_populate_record(NULL::public.contract_payment_schedules,r.before_value);
  UPDATE public.contract_payment_schedules SET invoice_id=old_s.invoice_id,due_date=old_s.due_date,
   amount=old_s.amount,paid_amount=old_s.paid_amount,paid_date=old_s.paid_date,status=old_s.status,
   financial_hold_reason=old_s.financial_hold_reason,cancelled_invoice_id=old_s.cancelled_invoice_id,notes=old_s.notes,updated_at=now()
  WHERE id=r.entity_id AND company_id=r.company_id;
  UPDATE public.financial_data_repair_snapshots SET rolled_back_at=now()
  WHERE migration_version=r.migration_version AND entity_type=r.entity_type AND entity_id=r.entity_id;
 END LOOP;
 ALTER TABLE public.contract_payment_schedules ENABLE TRIGGER guard_financial_schedule_link_update_v1;
 ALTER TABLE public.contract_payment_schedules ENABLE TRIGGER guard_resolved_contract_schedule_v1;
END;
$restore$;
-- Keep the reusable guard if another explicitly approved resolution batch uses it.
DO $cleanup$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.financial_data_repair_snapshots WHERE metadata->>'schedule_resolution'='closed' AND rolled_back_at IS NULL) THEN
  DROP TRIGGER guard_resolved_contract_schedule_v1 ON public.contract_payment_schedules;
  DROP FUNCTION public.guard_resolved_contract_schedule_v1();
  DROP INDEX public.financial_schedule_resolution_guard_idx;
 END IF;
END;$cleanup$;
COMMIT;

