-- Preserve the cancelled document and stop implicit billing while the obligation is reviewed.
ALTER TABLE public.contract_payment_schedules
  ADD COLUMN financial_hold_reason text,
  ADD COLUMN cancelled_invoice_id uuid REFERENCES public.invoices(id);

CREATE FUNCTION public.financial_record_is_active_v1(p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT lower(COALESCE(p_status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive');
$$;

CREATE OR REPLACE FUNCTION public.detach_schedules_on_invoice_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.financial_record_is_active_v1(NEW.status)
    OR NOT public.financial_record_is_active_v1(NEW.payment_status) THEN
  UPDATE public.contract_payment_schedules s
  SET invoice_id=NULL, cancelled_invoice_id=NEW.id,
      financial_hold_reason='cancelled_invoice_obligation_review', updated_at=now()
  WHERE s.company_id=NEW.company_id AND s.contract_id=NEW.contract_id AND s.invoice_id=NEW.id
    AND public.financial_record_is_active_v1(s.status);
 END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_contract_future_schedules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF lower(COALESCE(NEW.status,'')) IN ('cancelled','canceled') THEN
  UPDATE public.contract_payment_schedules s
  SET financial_hold_reason=COALESCE(s.financial_hold_reason,'cancelled_contract_obligation_review'),updated_at=now()
  WHERE s.company_id=NEW.company_id AND s.contract_id=NEW.id AND s.invoice_id IS NULL
    AND public.financial_record_is_active_v1(s.status) AND s.financial_hold_reason IS NULL;
 END IF;
 RETURN NEW;
END;
$$;

-- One matching month AND amount, an active rental invoice, and an unused link.
-- Ambiguity and historical value differences remain review items; never rewrite face amounts.
CREATE OR REPLACE FUNCTION public.reconcile_contract_rental_schedule_invoice_state(
 p_company_id uuid,p_contract_id uuid,p_affected_invoice_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.contract_payment_schedules%ROWTYPE; i public.invoices%ROWTYPE;
 ids uuid[]; paid numeric; new_status text; paid_on date; changes integer:=0; links integer:=0;
 reviews integer:=0; contract_status text;
BEGIN
 SELECT c.status INTO contract_status FROM public.contracts c
 WHERE c.company_id=p_company_id AND c.id=p_contract_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contract scope is invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT schedule.* FROM public.contract_payment_schedules schedule
 WHERE schedule.company_id=p_company_id AND schedule.contract_id=p_contract_id
 AND public.financial_record_is_active_v1(schedule.status)
 ORDER BY schedule.due_date,schedule.id FOR UPDATE LOOP
  IF s.financial_hold_reason IS NOT NULL THEN reviews:=reviews+1; CONTINUE; END IF;
  IF s.invoice_id IS NULL AND lower(COALESCE(contract_status,'')) IN ('cancelled','canceled') THEN
   UPDATE public.contract_payment_schedules SET financial_hold_reason='cancelled_contract_obligation_review',updated_at=now() WHERE id=s.id;
   reviews:=reviews+1; changes:=changes+1; CONTINUE;
  END IF;
  SELECT array_agg(invoice.id ORDER BY invoice.id) INTO ids FROM public.invoices invoice
  WHERE invoice.company_id=p_company_id AND invoice.contract_id=p_contract_id
  AND invoice.penalty_id IS NULL AND upper(COALESCE(invoice.invoice_number,'')) NOT LIKE 'TV-%'
  AND invoice.invoice_type IN ('sales','service') AND public.financial_record_is_active_v1(invoice.status)
  AND public.financial_record_is_active_v1(invoice.payment_status)
  AND date_trunc('month',COALESCE(invoice.invoice_month,invoice.invoice_date))::date=date_trunc('month',s.due_date)::date
  AND round(invoice.total_amount,2)=round(s.amount,2);
  IF COALESCE(cardinality(ids),0)<>1 THEN reviews:=reviews+1; CONTINUE; END IF;
  SELECT * INTO STRICT i FROM public.invoices WHERE id=ids[1] AND company_id=p_company_id;
  IF EXISTS (SELECT 1 FROM public.contract_payment_schedules other
    WHERE other.company_id=p_company_id AND other.invoice_id=i.id AND other.id<>s.id
    AND public.financial_record_is_active_v1(other.status)) THEN reviews:=reviews+1; CONTINUE; END IF;
  IF s.invoice_id IS NOT NULL AND s.invoice_id<>i.id THEN reviews:=reviews+1; CONTINUE; END IF;
  -- Automatic linkage must not recreate a cancelled obligation.
  IF s.invoice_id IS NULL AND EXISTS (SELECT 1 FROM public.invoices cancelled
    WHERE cancelled.company_id=p_company_id AND cancelled.contract_id=p_contract_id
    AND cancelled.penalty_id IS NULL AND NOT public.financial_record_is_active_v1(cancelled.status)
    AND date_trunc('month',COALESCE(cancelled.invoice_month,cancelled.invoice_date))::date=date_trunc('month',s.due_date)::date) THEN
    reviews:=reviews+1; CONTINUE;
  END IF;
  paid:=least(greatest(public.canonical_invoice_paid_amount(i.id,NULL),0),i.total_amount);
  new_status:=CASE WHEN paid>=i.total_amount-0.01 THEN 'paid' WHEN paid>0.01 THEN 'partially_paid'
    WHEN s.due_date<CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
  paid_on:=NULL;
  IF new_status='paid' THEN
   SELECT max(p.payment_date) INTO paid_on FROM public.payments p
   WHERE p.company_id=p_company_id AND lower(COALESCE(p.payment_status,'')) IN ('completed','paid','success','succeeded')
     AND lower(COALESCE(p.transaction_type::text,'receipt'))='receipt'
     AND (EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id
          AND a.company_id=p_company_id AND a.is_active AND a.allocation_type='invoice' AND a.target_id=i.id)
       OR (p.invoice_id=i.id AND NOT EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id AND a.is_active)));
  END IF;
  IF (s.invoice_id,s.paid_amount,s.status,s.paid_date) IS DISTINCT FROM (i.id,paid,new_status,paid_on) THEN
   IF s.invoice_id IS NULL THEN links:=links+1; END IF;
   UPDATE public.contract_payment_schedules SET invoice_id=i.id,paid_amount=paid,status=new_status,paid_date=paid_on,updated_at=now() WHERE id=s.id;
   changes:=changes+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('updated',changes,'relinked',links,'amounts_normalized',0,'review',reviews,'changed',changes>0);
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_contract_schedules_v1(p_contract_id uuid,p_options jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE company uuid;
BEGIN
 SELECT company_id INTO STRICT company FROM public.contracts WHERE id=p_contract_id;
 IF session_user NOT IN ('postgres','supabase_admin') AND COALESCE(auth.role(),'')<>'service_role' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=company AND COALESCE(p.is_active,true))
   OR NOT public.is_finance_action_authorized(auth.uid(),company,ARRAY['finance.payment.reconcile'],ARRAY['super_admin','admin','company_admin','accountant']) THEN
   RAISE EXCEPTION 'لا تملك صلاحية مطابقة هذا العقد' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN public.reconcile_contract_rental_schedule_invoice_state(company,p_contract_id,NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_link_invoice_to_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.contract_id IS NOT NULL AND NEW.penalty_id IS NULL AND public.financial_record_is_active_v1(NEW.status) THEN
  PERFORM public.reconcile_contract_rental_schedule_invoice_state(NEW.company_id,NEW.contract_id,ARRAY[NEW.id]);
 END IF;
 RETURN NEW;
END;
$$;

-- Guard changed links now. Historical duplicate links are retained for explicit review.
CREATE FUNCTION public.guard_financial_schedule_link_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE invoice public.invoices%ROWTYPE;
BEGIN
 IF NEW.invoice_id IS NULL OR NOT public.financial_record_is_active_v1(NEW.status) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('schedule-invoice:'||NEW.invoice_id::text,0));
 SELECT * INTO invoice FROM public.invoices i WHERE i.id=NEW.invoice_id AND i.company_id=NEW.company_id AND i.contract_id=NEW.contract_id;
 IF NOT FOUND OR invoice.penalty_id IS NOT NULL OR invoice.invoice_type NOT IN ('sales','service')
  OR upper(COALESCE(invoice.invoice_number,'')) LIKE 'TV-%'
  OR NOT public.financial_record_is_active_v1(invoice.status) OR NOT public.financial_record_is_active_v1(invoice.payment_status)
  OR date_trunc('month',COALESCE(invoice.invoice_month,invoice.invoice_date))::date<>date_trunc('month',NEW.due_date)::date
  OR round(invoice.total_amount,2)<>round(NEW.amount,2) THEN
  RAISE EXCEPTION 'ربط القسط لا يطابق شركة العقد أو شهر الفاتورة أو مبلغها' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.contract_payment_schedules s WHERE s.company_id=NEW.company_id
   AND s.invoice_id=NEW.invoice_id AND s.id<>NEW.id AND public.financial_record_is_active_v1(s.status)) THEN
  RAISE EXCEPTION 'الفاتورة مرتبطة بقسط فعال آخر؛ يلزم مراجعة الربط' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_financial_schedule_link_insert_v1 BEFORE INSERT ON public.contract_payment_schedules
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_schedule_link_v1();
CREATE TRIGGER guard_financial_schedule_link_update_v1 BEFORE UPDATE ON public.contract_payment_schedules
FOR EACH ROW WHEN (OLD.invoice_id IS DISTINCT FROM NEW.invoice_id OR OLD.company_id IS DISTINCT FROM NEW.company_id
 OR OLD.contract_id IS DISTINCT FROM NEW.contract_id OR OLD.due_date IS DISTINCT FROM NEW.due_date
 OR OLD.amount IS DISTINCT FROM NEW.amount OR (NOT public.financial_record_is_active_v1(OLD.status) AND public.financial_record_is_active_v1(NEW.status)))
EXECUTE FUNCTION public.guard_financial_schedule_link_v1();

CREATE FUNCTION public.guard_invoice_held_obligation_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.contract_id IS NOT NULL AND NEW.penalty_id IS NULL AND NEW.invoice_type IN ('sales','service')
    AND public.financial_record_is_active_v1(NEW.status) AND public.financial_record_is_active_v1(NEW.payment_status)
    AND EXISTS (SELECT 1 FROM public.contract_payment_schedules s WHERE s.company_id=NEW.company_id
      AND s.contract_id=NEW.contract_id AND s.financial_hold_reason IS NOT NULL
      AND date_trunc('month',s.due_date)::date=date_trunc('month',COALESCE(NEW.invoice_month,NEW.invoice_date))::date) THEN
  RAISE EXCEPTION 'إنشاء فاتورة لهذا الشهر موقوف حتى حسم الالتزام الملغى' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_invoice_held_obligation_insert_v1 BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_held_obligation_v1();
CREATE TRIGGER guard_invoice_held_obligation_update_v1 BEFORE UPDATE ON public.invoices
FOR EACH ROW WHEN (OLD.contract_id IS DISTINCT FROM NEW.contract_id OR OLD.company_id IS DISTINCT FROM NEW.company_id
 OR OLD.invoice_month IS DISTINCT FROM NEW.invoice_month OR OLD.invoice_date IS DISTINCT FROM NEW.invoice_date
 OR (NOT public.financial_record_is_active_v1(OLD.status) AND public.financial_record_is_active_v1(NEW.status))
 OR (NOT public.financial_record_is_active_v1(OLD.payment_status) AND public.financial_record_is_active_v1(NEW.payment_status)))
EXECUTE FUNCTION public.guard_invoice_held_obligation_v1();

CREATE TABLE public.contract_financial_reconciliation_controls(
 company_id uuid PRIMARY KEY REFERENCES public.companies(id), enabled boolean NOT NULL DEFAULT false,
 auto_repair boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.contract_financial_reconciliation_queue(
 company_id uuid NOT NULL REFERENCES public.companies(id), contract_id uuid NOT NULL REFERENCES public.contracts(id),
 requested_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','repaired_verified','review','failed','paused')),
 last_result jsonb, last_error text, checked_at timestamptz, PRIMARY KEY(company_id,contract_id));
CREATE TABLE public.contract_financial_reconciliation_runs(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, company_id uuid NOT NULL,contract_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('matched','repaired_verified','review','failed','paused')),
 before_state jsonb, after_state jsonb, error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX contract_financial_queue_pending_idx ON public.contract_financial_reconciliation_queue(available_at) WHERE status='pending';
CREATE INDEX contract_financial_runs_scope_idx ON public.contract_financial_reconciliation_runs(company_id,contract_id,created_at DESC);
ALTER TABLE public.contract_financial_reconciliation_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_financial_reconciliation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_financial_reconciliation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_financial_reconciliation_controls,public.contract_financial_reconciliation_queue,public.contract_financial_reconciliation_runs FROM anon,authenticated;
GRANT SELECT ON public.contract_financial_reconciliation_controls,public.contract_financial_reconciliation_queue,public.contract_financial_reconciliation_runs TO authenticated;
CREATE POLICY financial_controls_company_read ON public.contract_financial_reconciliation_controls FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=contract_financial_reconciliation_controls.company_id AND COALESCE(p.is_active,true)));
CREATE POLICY financial_queue_company_read ON public.contract_financial_reconciliation_queue FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=contract_financial_reconciliation_queue.company_id AND COALESCE(p.is_active,true)));
CREATE POLICY financial_runs_company_read ON public.contract_financial_reconciliation_runs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=contract_financial_reconciliation_runs.company_id AND COALESCE(p.is_active,true)));

CREATE FUNCTION public.enqueue_contract_financial_reconciliation_v1(p_company uuid,p_contract uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_company IS NULL OR p_contract IS NULL OR current_setting('app.financial_reconciliation_running',true)='on' THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=p_contract AND c.company_id=p_company) THEN RETURN; END IF;
 INSERT INTO public.contract_financial_reconciliation_queue(company_id,contract_id)
 VALUES(p_company,p_contract) ON CONFLICT ON CONSTRAINT contract_financial_reconciliation_queue_pkey DO UPDATE
 SET requested_at=now(),available_at=now(),attempts=0,status='pending',last_error=NULL;
END;
$$;

CREATE FUNCTION public.enqueue_financial_change_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb; co uuid; ct uuid; inv uuid; a record;
BEGIN
 FOR row_data IN SELECT to_jsonb(NEW) WHERE TG_OP<>'DELETE' UNION ALL SELECT to_jsonb(OLD) WHERE TG_OP<>'INSERT' LOOP
  co:=(row_data->>'company_id')::uuid;
  IF TG_TABLE_NAME='contracts' THEN ct:=(row_data->>'id')::uuid;
  ELSIF TG_TABLE_NAME='payment_allocations' THEN
   ct:=NULL;
   IF row_data->>'allocation_type'='contract' THEN ct:=(row_data->>'target_id')::uuid;
   ELSIF row_data->>'allocation_type'='invoice' THEN
    SELECT contract_id INTO ct FROM public.invoices WHERE id=(row_data->>'target_id')::uuid AND company_id=co;
   END IF;
  ELSE ct:=(row_data->>'contract_id')::uuid; END IF;
  PERFORM public.enqueue_contract_financial_reconciliation_v1(co,ct);
  IF TG_TABLE_NAME='payments' THEN
   SELECT contract_id INTO ct FROM public.invoices WHERE id=(row_data->>'invoice_id')::uuid AND company_id=co;
   PERFORM public.enqueue_contract_financial_reconciliation_v1(co,ct);
   FOR a IN SELECT allocation_type,target_id FROM public.payment_allocations
     WHERE payment_id=(row_data->>'id')::uuid AND company_id=co LOOP
    ct:=NULL;
    IF a.allocation_type='contract' THEN ct:=a.target_id;
    ELSIF a.allocation_type='invoice' THEN SELECT contract_id INTO ct FROM public.invoices WHERE id=a.target_id AND company_id=co; END IF;
    PERFORM public.enqueue_contract_financial_reconciliation_v1(co,ct);
   END LOOP;
  END IF;
 END LOOP;
 RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER zz_enqueue_financial_change_v1 AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enqueue_financial_change_v1();
CREATE TRIGGER zz_enqueue_financial_change_v1 AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION public.enqueue_financial_change_v1();
CREATE TRIGGER zz_enqueue_financial_change_v1 AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enqueue_financial_change_v1();
CREATE TRIGGER zz_enqueue_financial_change_v1 AFTER INSERT OR UPDATE OR DELETE ON public.contract_payment_schedules FOR EACH ROW EXECUTE FUNCTION public.enqueue_financial_change_v1();
CREATE TRIGGER zz_enqueue_financial_change_v1 AFTER INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.enqueue_financial_change_v1();

-- A single SQL snapshot: receipt facts and derived differences share one MVCC snapshot.
CREATE FUNCTION public.contract_financial_integrity_snapshot_internal_v1(p_company uuid,p_contract uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH c AS(SELECT * FROM public.contracts WHERE id=p_contract AND company_id=p_company),
 i AS(SELECT invoice.*,public.canonical_invoice_paid_amount(invoice.id,NULL) canonical_paid
  FROM public.invoices invoice WHERE invoice.company_id=p_company AND invoice.contract_id=p_contract
  AND public.financial_record_is_active_v1(invoice.status) AND public.financial_record_is_active_v1(invoice.payment_status)),
 s AS(SELECT schedule.* FROM public.contract_payment_schedules schedule WHERE schedule.company_id=p_company
  AND schedule.contract_id=p_contract AND public.financial_record_is_active_v1(schedule.status)),
 issues AS(
  SELECT 'schedule_obligation_review' code,s.id entity_id,s.amount amount FROM s WHERE s.financial_hold_reason IS NOT NULL
  UNION ALL SELECT 'schedule_invoice_missing',s.id,s.amount FROM s WHERE s.invoice_id IS NULL AND s.financial_hold_reason IS NULL AND s.due_date<=CURRENT_DATE
  UNION ALL SELECT 'schedule_invoice_invalid',s.id,s.amount FROM s LEFT JOIN i ON i.id=s.invoice_id
   WHERE s.invoice_id IS NOT NULL AND (i.id IS NULL OR i.penalty_id IS NOT NULL OR upper(COALESCE(i.invoice_number,'')) LIKE 'TV-%'
    OR date_trunc('month',COALESCE(i.invoice_month,i.invoice_date))::date<>date_trunc('month',s.due_date)::date OR round(i.total_amount,2)<>round(s.amount,2))
  UNION ALL SELECT 'schedule_invoice_duplicate',s.id,s.amount FROM s WHERE s.invoice_id IS NOT NULL AND EXISTS(SELECT 1 FROM s other WHERE other.id<>s.id AND other.invoice_id=s.invoice_id)
  UNION ALL SELECT 'invoice_cached_settlement',i.id,i.paid_amount-least(i.canonical_paid,i.total_amount) FROM i
   WHERE abs(COALESCE(i.paid_amount,0)-least(i.canonical_paid,i.total_amount))>0.01
    OR abs(COALESCE(i.balance_due,0)-greatest(i.total_amount-i.canonical_paid,0))>0.01
  UNION ALL SELECT 'schedule_cached_settlement',s.id,s.paid_amount-least(i.canonical_paid,i.total_amount) FROM s JOIN i ON i.id=s.invoice_id
   WHERE abs(COALESCE(s.paid_amount,0)-least(i.canonical_paid,i.total_amount))>0.01
 ), paid AS(SELECT least(public.canonical_contract_paid_amount(p_contract),COALESCE(NULLIF(c.contract_amount,0),public.canonical_contract_paid_amount(p_contract))) value FROM c)
SELECT jsonb_build_object('version',1,'company_id',p_company,'contract_id',p_contract,'contract_status',c.status,
 'original_amount',c.contract_amount,'canonical_paid',paid.value,'stored_paid',c.total_paid,'stored_balance',c.balance_due,
 'original_remaining',greatest(c.contract_amount-paid.value,0),
 'header_mismatch',abs(COALESCE(c.total_paid,0)-paid.value)>0.01 OR abs(COALESCE(c.balance_due,0)-greatest(c.contract_amount-paid.value,0))>0.01,
 'active_invoice_total',COALESCE((SELECT sum(total_amount) FROM i),0),
 'outstanding',COALESCE((SELECT sum(greatest(total_amount-canonical_paid,0)) FROM i),0),
 'due_now',COALESCE((SELECT sum(greatest(total_amount-canonical_paid,0)) FROM i WHERE due_date<=CURRENT_DATE),0),
 'review_amount',COALESCE((SELECT sum(amount) FROM s WHERE financial_hold_reason IS NOT NULL),0),
 'issues',COALESCE((SELECT jsonb_agg(jsonb_build_object('code',code,'entity_id',entity_id,'amount',amount) ORDER BY code,entity_id) FROM issues),'[]'::jsonb),
 'checked_at',statement_timestamp()) FROM c CROSS JOIN paid;
$$;

CREATE FUNCTION public.get_contract_financial_integrity_v1(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=p_company_id AND COALESCE(p.is_active,true)) THEN
  RAISE EXCEPTION 'لا تملك صلاحية عرض مالية هذا العقد' USING ERRCODE='42501';
 END IF;
 RETURN public.contract_financial_integrity_snapshot_internal_v1(p_company_id,p_contract_id)
  || jsonb_build_object('reconciliation',(SELECT to_jsonb(q) FROM public.contract_financial_reconciliation_queue q WHERE q.company_id=p_company_id AND q.contract_id=p_contract_id));
END;
$$;

CREATE FUNCTION public.reconcile_contract_financial_integrity_internal_v1(p_company uuid,p_contract uuid,p_repair boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE before_state jsonb; after_state jsonb; outcome text; prior text:=COALESCE(current_setting('app.financial_reconciliation_running',true),''); inv record; changed boolean;
BEGIN
 -- Avoid reversing the receipt command's invoice -> contract locking order.
 PERFORM 1 FROM public.invoices WHERE company_id=p_company AND contract_id=p_contract ORDER BY id FOR UPDATE NOWAIT;
 PERFORM 1 FROM public.contracts WHERE company_id=p_company AND id=p_contract FOR UPDATE NOWAIT;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid contract scope' USING ERRCODE='22023'; END IF;
 before_state:=public.contract_financial_integrity_snapshot_internal_v1(p_company,p_contract);
 PERFORM set_config('app.financial_reconciliation_running','on',true);
 IF p_repair THEN
  FOR inv IN SELECT id FROM public.invoices WHERE company_id=p_company AND contract_id=p_contract
   AND public.financial_record_is_active_v1(status) AND public.financial_record_is_active_v1(payment_status) ORDER BY id LOOP
   PERFORM public.recalculate_invoice_financial_state(inv.id);
  END LOOP;
  PERFORM public.recalculate_contract_financial_state(p_contract);
  PERFORM public.reconcile_contract_rental_schedule_invoice_state(p_company,p_contract,NULL);
 END IF;
 after_state:=public.contract_financial_integrity_snapshot_internal_v1(p_company,p_contract);
 changed:=(before_state-'checked_at') IS DISTINCT FROM (after_state-'checked_at');
 IF p_repair AND (after_state->>'header_mismatch')::boolean THEN RAISE EXCEPTION 'Contract settlement postcondition failed'; END IF;
 outcome:=CASE WHEN (after_state->>'header_mismatch')::boolean OR jsonb_array_length(after_state->'issues')>0 THEN 'review'
  WHEN changed THEN 'repaired_verified' ELSE 'matched' END;
 INSERT INTO public.contract_financial_reconciliation_runs(company_id,contract_id,status,before_state,after_state)
 VALUES(p_company,p_contract,outcome,before_state,after_state);
 PERFORM set_config('app.financial_reconciliation_running',prior,true);
 RETURN jsonb_build_object('status',outcome,'changed',changed,'snapshot',after_state);
EXCEPTION WHEN OTHERS THEN PERFORM set_config('app.financial_reconciliation_running',prior,true); RAISE;
END;
$$;

CREATE FUNCTION public.process_contract_financial_reconciliation_v1(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item record; result jsonb; done integer:=0; failed integer:=0;
BEGIN
 FOR item IN SELECT q.*,ctl.auto_repair FROM public.contract_financial_reconciliation_queue q
 JOIN public.contract_financial_reconciliation_controls ctl ON ctl.company_id=q.company_id AND ctl.enabled
 WHERE q.status='pending' AND q.available_at<=now() ORDER BY q.available_at,q.contract_id
 LIMIT greatest(1,least(p_limit,100)) FOR UPDATE OF q SKIP LOCKED LOOP
  BEGIN
   result:=public.reconcile_contract_financial_integrity_internal_v1(item.company_id,item.contract_id,item.auto_repair);
   UPDATE public.contract_financial_reconciliation_queue SET status=result->>'status',last_result=result,checked_at=now(),attempts=0,last_error=NULL
   WHERE company_id=item.company_id AND contract_id=item.contract_id;
   done:=done+1;
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.contract_financial_reconciliation_queue SET attempts=item.attempts+1,status=CASE WHEN item.attempts>=2 THEN 'failed' ELSE 'pending' END,
     available_at=now()+interval '1 minute'*(item.attempts+1),last_error=SQLERRM,checked_at=now()
   WHERE company_id=item.company_id AND contract_id=item.contract_id;
   INSERT INTO public.contract_financial_reconciliation_runs(company_id,contract_id,status,error) VALUES(item.company_id,item.contract_id,'failed',SQLERRM);
   failed:=failed+1;
  END;
 END LOOP;
 RETURN jsonb_build_object('processed',done,'failed',failed);
END;
$$;

CREATE FUNCTION public.request_contract_financial_reconciliation_v1(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=p_company_id AND COALESCE(p.is_active,true))
 OR NOT public.is_finance_action_authorized(auth.uid(),p_company_id,ARRAY['finance.payment.reconcile'],ARRAY['super_admin','admin','company_admin','accountant']) THEN
  RAISE EXCEPTION 'لا تملك صلاحية المطابقة المالية' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contract_financial_reconciliation_controls WHERE company_id=p_company_id AND enabled) THEN
  RAISE EXCEPTION 'المطابقة المالية موقوفة لهذه الشركة' USING ERRCODE='55000'; END IF;
 PERFORM public.enqueue_contract_financial_reconciliation_v1(p_company_id,p_contract_id);
 RETURN jsonb_build_object('contract_id',p_contract_id,'status','pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.contract_financial_self_healing_sweep()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item record; queued integer:=0; generation jsonb;
BEGIN
 -- Preserve existing due-invoice generation, excluding held obligations in its candidate query.
 generation:=public.generate_due_contract_invoices_v1(jsonb_build_object('dry_run',false));
 FOR item IN SELECT c.id,c.company_id FROM public.contracts c JOIN public.contract_financial_reconciliation_controls ctl ON ctl.company_id=c.company_id AND ctl.enabled LOOP
  PERFORM public.enqueue_contract_financial_reconciliation_v1(item.company_id,item.id); queued:=queued+1;
 END LOOP;
 RETURN jsonb_build_object('queued',queued,'generation',generation,'worker',public.process_contract_financial_reconciliation_v1(20));
END;
$$;

-- Private helpers have no API execution grant. Only the two authenticated gateways are public.
REVOKE ALL ON FUNCTION public.financial_record_is_active_v1(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.financial_record_is_active_v1(text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_financial_schedule_link_v1(),public.guard_invoice_held_obligation_v1(),public.enqueue_financial_change_v1(),
 public.enqueue_contract_financial_reconciliation_v1(uuid,uuid),public.contract_financial_integrity_snapshot_internal_v1(uuid,uuid),
 public.reconcile_contract_financial_integrity_internal_v1(uuid,uuid,boolean),public.process_contract_financial_reconciliation_v1(integer)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_contract_financial_integrity_v1(uuid,uuid),public.request_contract_financial_reconciliation_v1(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_contract_financial_integrity_v1(uuid,uuid),public.request_contract_financial_reconciliation_v1(uuid,uuid) TO authenticated;

COMMIT;
