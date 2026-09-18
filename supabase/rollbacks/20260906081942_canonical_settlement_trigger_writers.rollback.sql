BEGIN;
-- Restores legacy writers and their defects. Does not reverse financial facts
-- or restore the separately retired invoice -> receipt writer.
SET LOCAL lock_timeout='5s';
LOCK TABLE public.payments, public.invoices, public.contract_payment_schedules IN ACCESS EXCLUSIVE MODE;
DO $preflight$
DECLARE v_source text; v_expected record; v_prior_path text := current_setting('search_path');
BEGIN
  SELECT prosrc INTO v_source FROM pg_proc WHERE oid=to_regprocedure('public.update_invoice_on_payment_completion()');
  IF position($addition$  -- canonical_settlement_batch_guard_v1
  -- Atomic allocation commands explicitly recalculate once all lines exist.
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
$addition$ IN v_source)=0
    OR md5(replace(v_source,$addition$  -- canonical_settlement_batch_guard_v1
  -- Atomic allocation commands explicitly recalculate once all lines exist.
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
$addition$,'')) IS DISTINCT FROM '6051314941348f1edd6002f7c0788369' THEN
    RAISE EXCEPTION 'Canonical settlement handler changed after installation; refusing rollback';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.payments'::regclass
    AND tgname IN ('contract_payment_delete_trigger','contract_payment_insert_trigger','contract_payment_update_trigger','invoice_payment_delete_trigger','invoice_payment_insert_trigger','invoice_payment_update_trigger','payments_update_contract_balance','trg_sync_payment_invoice','trigger_update_invoice_on_payment','trigger_update_schedule_on_payment')) THEN
    RAISE EXCEPTION 'Retired settlement trigger was recreated; review before rollback';
  END IF;
  FOR v_expected IN SELECT * FROM (VALUES
    ('update_contract_payment_totals','d17b4c7079dd6468c078dad870a61c97'),
    ('update_invoice_payment_totals','24c55dfcdd60228a5ac0b26c5dc233dc'),
    ('update_contract_balance','11759ece0befb67a7502a6b6fd734522'),
    ('sync_payment_with_invoice','80c00e60d5dfc3f05722927f6b04a0aa'),
    ('update_invoice_on_payment','8552ba247adb36315f43c77a7f0fb8b4'),
    ('update_schedule_on_payment','ae421460ff0a387c2636a9cbc340e1bd')
  ) expected(function_name,body_hash)
  LOOP
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.'||v_expected.function_name||'()'))
      IS DISTINCT FROM v_expected.body_hash THEN
      RAISE EXCEPTION 'Retired function % changed; refusing to reattach it',v_expected.function_name;
    END IF;
  END LOOP;
  SELECT replace(prosrc,E'\r\n',E'\n') INTO v_source FROM pg_proc
    WHERE oid=to_regprocedure('public.sync_schedule_after_invoice_settlement_v1()');
  IF v_source IS DISTINCT FROM $expected$
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    PERFORM public.reconcile_contract_rental_schedule_invoice_state(
      NEW.company_id, NEW.contract_id, ARRAY[NEW.id]::uuid[]
    );
  END IF;
  RETURN NEW;
END;
$expected$ THEN
    RAISE EXCEPTION 'Schedule settlement handler changed; refusing rollback';
  END IF;
  PERFORM set_config('search_path','pg_catalog, public',true);
  IF (SELECT pg_get_triggerdef(oid) FROM pg_trigger
      WHERE tgrelid='public.invoices'::regclass AND tgname='sync_schedule_after_invoice_settlement_v1' AND tgenabled='O')
    IS DISTINCT FROM 'CREATE TRIGGER sync_schedule_after_invoice_settlement_v1 AFTER UPDATE OF paid_amount, payment_status, status, total_amount ON public.invoices FOR EACH ROW WHEN (((old.paid_amount IS DISTINCT FROM new.paid_amount) OR (old.payment_status IS DISTINCT FROM new.payment_status) OR (old.status IS DISTINCT FROM new.status) OR (old.total_amount IS DISTINCT FROM new.total_amount))) EXECUTE FUNCTION sync_schedule_after_invoice_settlement_v1()' THEN
    RAISE EXCEPTION 'Schedule settlement trigger changed; refusing rollback';
  END IF;
  PERFORM set_config('search_path',v_prior_path,true);
END;
$preflight$;
DROP TRIGGER sync_schedule_after_invoice_settlement_v1 ON public.invoices RESTRICT;
DROP FUNCTION public.sync_schedule_after_invoice_settlement_v1() RESTRICT;
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_payment_id := NEW.id;
    IF NEW.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id); END IF;
    IF NEW.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, NEW.contract_id); END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_payment_id := OLD.id;
    IF OLD.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id); END IF;
    IF OLD.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, OLD.contract_id); END IF;
  END IF;

  SELECT
    v_invoice_ids || COALESCE(array_agg(DISTINCT allocation.target_id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = v_payment_id
    AND allocation.allocation_type = 'invoice';

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = v_invoice_id;
    IF v_contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE TRIGGER contract_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER contract_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER contract_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.contract_id IS NOT NULL) OR (new.contract_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.contract_id <> new.contract_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_contract_payment_totals();
CREATE TRIGGER invoice_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER invoice_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER invoice_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.invoice_id IS NOT NULL) OR (new.invoice_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.invoice_id <> new.invoice_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_invoice_payment_totals();
CREATE TRIGGER payments_update_contract_balance AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_contract_balance();
CREATE TRIGGER trg_sync_payment_invoice BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION sync_payment_with_invoice();
CREATE TRIGGER trigger_update_invoice_on_payment AFTER INSERT OR UPDATE OF amount, payment_status ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();
CREATE TRIGGER trigger_update_schedule_on_payment AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW WHEN (((new.invoice_id IS NOT NULL) AND (new.payment_status = 'completed'::text))) EXECUTE FUNCTION update_schedule_on_payment();
COMMIT;
