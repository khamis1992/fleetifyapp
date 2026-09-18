BEGIN;

-- Deployment candidate. Retire the invoice -> historical receipt writer first.
-- No existing balances, schedules, allocations or journals are rewritten here.
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.payments, public.invoices, public.contract_payment_schedules
  IN ACCESS EXCLUSIVE MODE;

DO $preflight$
DECLARE v_expected record; v_definition text; v_enabled "char"; v_prior_path text := current_setting('search_path');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.invoices'::regclass
      AND NOT tgisinternal AND (tgname='trg_sync_receipt_on_invoice_update'
        OR tgfoid=to_regprocedure('public.sync_receipt_on_invoice_update()'))) THEN
    RAISE EXCEPTION 'Retire invoice aggregate receipt synchronization before settlement writers';
  END IF;
  IF to_regprocedure('public.reconcile_contract_rental_schedule_invoice_state(uuid,uuid,uuid[])') IS NULL
    OR to_regclass('public.invoice_fee_payment_context') IS NULL
    OR to_regprocedure('public.create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric)') IS NULL THEN
    RAISE EXCEPTION 'Install canonical schedule, fee principal context and separated receipt posting first';
  END IF;
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.after_payment_allocation_change()'))
    IS DISTINCT FROM '46a6743ce3269aad6491918cbe7f44f6'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.canonical_contract_paid_amount(uuid)'))
    IS DISTINCT FROM '3c1d786f1ca26c117a7c0ff20f1ccba9'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.recalculate_contract_financial_state(uuid)'))
    IS DISTINCT FROM '26e1d042941b2d30e09d68f1abd987e9'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.reconcile_contract_rental_schedule_invoice_state(uuid,uuid,uuid[])'))
    IS DISTINCT FROM '4bae220787e76ff2e7779c9da79782d4' THEN
    RAISE EXCEPTION 'Canonical allocation or contract totals differ from inspected schema';
  END IF;
  PERFORM set_config('search_path','pg_catalog, public',true);
  FOR v_expected IN SELECT * FROM (VALUES
    ('contract_payment_delete_trigger', 'update_contract_payment_totals', 'CREATE TRIGGER contract_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals()', 'd17b4c7079dd6468c078dad870a61c97'),
    ('contract_payment_insert_trigger', 'update_contract_payment_totals', 'CREATE TRIGGER contract_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.contract_id IS NOT NULL)) EXECUTE FUNCTION update_contract_payment_totals()', 'd17b4c7079dd6468c078dad870a61c97'),
    ('contract_payment_update_trigger', 'update_contract_payment_totals', 'CREATE TRIGGER contract_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.contract_id IS NOT NULL) OR (new.contract_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.contract_id <> new.contract_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_contract_payment_totals()', 'd17b4c7079dd6468c078dad870a61c97'),
    ('invoice_payment_delete_trigger', 'update_invoice_payment_totals', 'CREATE TRIGGER invoice_payment_delete_trigger AFTER DELETE ON public.payments FOR EACH ROW WHEN ((old.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals()', '24c55dfcdd60228a5ac0b26c5dc233dc'),
    ('invoice_payment_insert_trigger', 'update_invoice_payment_totals', 'CREATE TRIGGER invoice_payment_insert_trigger AFTER INSERT ON public.payments FOR EACH ROW WHEN ((new.invoice_id IS NOT NULL)) EXECUTE FUNCTION update_invoice_payment_totals()', '24c55dfcdd60228a5ac0b26c5dc233dc'),
    ('invoice_payment_update_trigger', 'update_invoice_payment_totals', 'CREATE TRIGGER invoice_payment_update_trigger AFTER UPDATE ON public.payments FOR EACH ROW WHEN ((((old.invoice_id IS NOT NULL) OR (new.invoice_id IS NOT NULL)) AND ((old.payment_status <> new.payment_status) OR (old.amount <> new.amount) OR (old.invoice_id <> new.invoice_id) OR (old.company_id <> new.company_id)))) EXECUTE FUNCTION update_invoice_payment_totals()', '24c55dfcdd60228a5ac0b26c5dc233dc'),
    ('payment_totals_after_delete', 'update_invoice_on_payment_completion', 'CREATE TRIGGER payment_totals_after_delete AFTER DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment_completion()', '6051314941348f1edd6002f7c0788369'),
    ('payment_totals_after_insert', 'update_invoice_on_payment_completion', 'CREATE TRIGGER payment_totals_after_insert AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment_completion()', '6051314941348f1edd6002f7c0788369'),
    ('payment_totals_after_update', 'update_invoice_on_payment_completion', 'CREATE TRIGGER payment_totals_after_update AFTER UPDATE OF amount, payment_status, invoice_id, contract_id, transaction_type ON public.payments FOR EACH ROW WHEN (((old.amount IS DISTINCT FROM new.amount) OR (old.payment_status IS DISTINCT FROM new.payment_status) OR (old.invoice_id IS DISTINCT FROM new.invoice_id) OR (old.contract_id IS DISTINCT FROM new.contract_id) OR (old.transaction_type IS DISTINCT FROM new.transaction_type))) EXECUTE FUNCTION update_invoice_on_payment_completion()', '6051314941348f1edd6002f7c0788369'),
    ('payments_update_contract_balance', 'update_contract_balance', 'CREATE TRIGGER payments_update_contract_balance AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_contract_balance()', '11759ece0befb67a7502a6b6fd734522'),
    ('trg_sync_payment_invoice', 'sync_payment_with_invoice', 'CREATE TRIGGER trg_sync_payment_invoice BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION sync_payment_with_invoice()', '80c00e60d5dfc3f05722927f6b04a0aa'),
    ('trigger_update_invoice_on_payment', 'update_invoice_on_payment', 'CREATE TRIGGER trigger_update_invoice_on_payment AFTER INSERT OR UPDATE OF amount, payment_status ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment()', '8552ba247adb36315f43c77a7f0fb8b4'),
    ('trigger_update_schedule_on_payment', 'update_schedule_on_payment', 'CREATE TRIGGER trigger_update_schedule_on_payment AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW WHEN (((new.invoice_id IS NOT NULL) AND (new.payment_status = ''completed''::text))) EXECUTE FUNCTION update_schedule_on_payment()', 'ae421460ff0a387c2636a9cbc340e1bd')
  ) AS expected(trigger_name,function_name,definition,body_hash)
  LOOP
    SELECT pg_get_triggerdef(oid),tgenabled INTO v_definition,v_enabled FROM pg_trigger
      WHERE tgrelid='public.payments'::regclass AND tgname=v_expected.trigger_name AND NOT tgisinternal;
    IF v_definition IS DISTINCT FROM v_expected.definition OR v_enabled IS DISTINCT FROM 'O'
      OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.'||v_expected.function_name||'()'))
        IS DISTINCT FROM v_expected.body_hash THEN
      RAISE EXCEPTION 'Settlement trigger % differs from inspected schema', v_expected.trigger_name;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      WHERE t.tgrelid='public.payments'::regclass AND NOT t.tgisinternal
        AND p.proname IN ('sync_payment_with_invoice','update_contract_balance','update_contract_payment_totals','update_invoice_payment_totals','update_invoice_on_payment','update_schedule_on_payment','update_invoice_on_payment_completion')) <> 13 THEN
    RAISE EXCEPTION 'Unexpected duplicate settlement trigger; review schema';
  END IF;
  PERFORM set_config('search_path',v_prior_path,true);
END;
$preflight$;

DROP TRIGGER contract_payment_delete_trigger ON public.payments RESTRICT;
DROP TRIGGER contract_payment_insert_trigger ON public.payments RESTRICT;
DROP TRIGGER contract_payment_update_trigger ON public.payments RESTRICT;
DROP TRIGGER invoice_payment_delete_trigger ON public.payments RESTRICT;
DROP TRIGGER invoice_payment_insert_trigger ON public.payments RESTRICT;
DROP TRIGGER invoice_payment_update_trigger ON public.payments RESTRICT;
DROP TRIGGER payments_update_contract_balance ON public.payments RESTRICT;
DROP TRIGGER trg_sync_payment_invoice ON public.payments RESTRICT;
DROP TRIGGER trigger_update_invoice_on_payment ON public.payments RESTRICT;
DROP TRIGGER trigger_update_schedule_on_payment ON public.payments RESTRICT;

-- Preserve the existing canonical handler's behavior, owner and ACL. Its three
-- triggers cover INSERT, meaningful UPDATE and DELETE; batch commands own finalization.
DO $patch$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_definition FROM pg_proc
    WHERE oid='public.update_invoice_on_payment_completion()'::regprocedure;
  EXECUTE replace(v_definition,E'BEGIN\n',E'BEGIN\n'||$addition$  -- canonical_settlement_batch_guard_v1
  -- Atomic allocation commands explicitly recalculate once all lines exist.
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
$addition$);
END;
$patch$;

-- Reconcile schedules from canonical allocations after an invoice aggregate is
-- finalized, including refunds/cancellation and direct allocation replacements.
-- SECURITY DEFINER is needed to call the private reconciliation helper from
-- authorized invoice updates; this trigger function has no public RPC grant.
CREATE FUNCTION public.sync_schedule_after_invoice_settlement_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    PERFORM public.reconcile_contract_rental_schedule_invoice_state(
      NEW.company_id, NEW.contract_id, ARRAY[NEW.id]::uuid[]
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_schedule_after_invoice_settlement_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER sync_schedule_after_invoice_settlement_v1
AFTER UPDATE OF paid_amount, payment_status, status, total_amount ON public.invoices
FOR EACH ROW WHEN (
  OLD.paid_amount IS DISTINCT FROM NEW.paid_amount
  OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
  OR OLD.status IS DISTINCT FROM NEW.status
  OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
) EXECUTE FUNCTION public.sync_schedule_after_invoice_settlement_v1();

COMMIT;
