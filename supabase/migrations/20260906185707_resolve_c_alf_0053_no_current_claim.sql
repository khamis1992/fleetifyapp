-- User explicitly confirmed C-ALF-0053 is cancelled and has no current claims.
-- Retain original contract/receipt history; close only 17 already-cancelled invoice projections.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
DO $resolve$
DECLARE c public.contracts%ROWTYPE;s public.contract_payment_schedules%ROWTYPE;i public.invoices%ROWTYPE;
 before_s jsonb;after_s jsonb;d record;result jsonb;n integer:=0;amount_closed numeric:=0;
 receipts_before text;receipts_after text;invoices_before text;invoices_after text;allocations_before text;allocations_after text;
BEGIN
 SELECT * INTO STRICT c FROM public.contracts WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4' AND contract_number='C-ALF-0053';
 PERFORM 1 FROM public.invoices WHERE company_id=c.company_id AND contract_id=c.id ORDER BY id FOR UPDATE NOWAIT;
 SELECT * INTO STRICT c FROM public.contracts WHERE id=c.id AND company_id=c.company_id FOR UPDATE NOWAIT;
 IF c.status<>'cancelled' OR c.end_date IS DISTINCT FROM DATE '2026-12-31' OR c.contract_amount<>39600 OR public.canonical_contract_paid_amount(c.id)<>11550 THEN
  RAISE EXCEPTION 'Contract or receipt facts changed after the no-claim decision';
 END IF;
 IF EXISTS(SELECT 1 FROM public.invoices x WHERE x.company_id=c.company_id AND x.contract_id=c.id
   AND public.financial_record_is_active_v1(x.status) AND public.financial_record_is_active_v1(x.payment_status)
   AND x.total_amount-public.canonical_invoice_paid_amount(x.id,NULL)>0.01) THEN
  RAISE EXCEPTION 'An open invoice requires a separate accounting resolution';
 END IF;
 SELECT md5(string_agg(to_jsonb(p)::text,'' ORDER BY p.id)) INTO receipts_before FROM public.payments p WHERE p.company_id=c.company_id;
 SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY x.id)) INTO invoices_before FROM public.invoices x WHERE x.company_id=c.company_id AND x.contract_id=c.id;
 SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY x.id)) INTO allocations_before FROM public.payment_allocations x WHERE x.company_id=c.company_id;
 FOR s IN SELECT * FROM public.contract_payment_schedules WHERE company_id=c.company_id AND contract_id=c.id
  AND public.financial_record_is_active_v1(status) AND financial_hold_reason='cancelled_invoice_obligation_review'
  ORDER BY due_date,id FOR UPDATE LOOP
  SELECT * INTO STRICT i FROM public.invoices WHERE id=s.cancelled_invoice_id AND company_id=c.company_id AND contract_id=c.id;
  IF public.financial_record_is_active_v1(i.status) OR i.invoice_month<>s.due_date OR i.total_amount<>s.amount
   OR public.canonical_invoice_paid_amount(i.id,NULL)<>0 OR s.paid_amount<>0 OR s.amount<>1650 OR s.invoice_id IS NOT NULL THEN
   RAISE EXCEPTION 'Cancellation evidence is no longer identical';
  END IF;
  IF s.due_date NOT IN(DATE '2025-05-01',DATE '2025-06-01',DATE '2025-10-01',DATE '2025-11-01',DATE '2025-12-01',
   DATE '2026-01-01',DATE '2026-02-01',DATE '2026-03-01',DATE '2026-04-01',DATE '2026-05-01',DATE '2026-06-01',
   DATE '2026-07-01',DATE '2026-08-01',DATE '2026-09-01',DATE '2026-10-01',DATE '2026-11-01',DATE '2026-12-01') THEN
   RAISE EXCEPTION 'Schedule month is outside the explicitly reviewed scope';
  END IF;
  before_s:=to_jsonb(s);
  UPDATE public.contract_payment_schedules SET status='cancelled',financial_hold_reason='resolved_no_current_claim',
   notes=concat_ws(E'\n',NULLIF(notes,''),'[قرار صاحب النظام 2026-09-06] العقد ملغي ولا توجد عليه مطالبات حالية؛ إغلاق القسط التابع للفاتورة الملغاة ومنع إعادة المطالبة تلقائيًا.'),
   updated_at=now()
  WHERE id=s.id AND company_id=c.company_id RETURNING to_jsonb(contract_payment_schedules.*) INTO after_s;
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,after_value,metadata)
  VALUES('20260906185414','approved_no_current_claim',c.company_id,'contract_payment_schedules',s.id,before_s,after_s,
   jsonb_build_object('contract_number',c.contract_number,'schedule_resolution','closed','block_billing_month',true,'decision','no_current_claim','source','explicit_user_confirmation_2026_09_06'));
  n:=n+1;amount_closed:=amount_closed+s.amount;
 END LOOP;
 IF n<>17 OR amount_closed<>28050 THEN RAISE EXCEPTION 'Expected 17 reviewed projections totaling 28050'; END IF;
 FOR d IN SELECT * FROM public.delinquent_customers WHERE company_id=c.company_id AND contract_id=c.id FOR UPDATE LOOP
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,metadata)
  VALUES('20260906185414','clear_resolved_delinquency_cache',c.company_id,'delinquent_customers',d.id,to_jsonb(d),
   jsonb_build_object('contract_number',c.contract_number,'source','explicit_no_claim_decision'));
  UPDATE public.delinquent_customers SET is_active=false,overdue_amount=0,late_penalty=0,violations_amount=0,total_debt=0,
   months_unpaid=0,days_overdue=0,last_updated_at=now() WHERE id=d.id AND company_id=c.company_id;
  UPDATE public.financial_data_repair_snapshots r SET after_value=(SELECT to_jsonb(x) FROM public.delinquent_customers x WHERE x.id=d.id AND x.company_id=c.company_id)
   WHERE r.migration_version='20260906185414' AND r.entity_type='delinquent_customers' AND r.entity_id=d.id;
 END LOOP;
 result:=public.reconcile_contract_financial_integrity_internal_v1(c.company_id,c.id,false);
 IF result->>'status'<>'matched' OR (result->'snapshot'->>'outstanding')::numeric<>0 OR (result->'snapshot'->>'review_amount')::numeric<>0 THEN
  RAISE EXCEPTION 'No-claim closure verification failed';
 END IF;
 UPDATE public.contract_financial_reconciliation_queue SET status='matched',last_result=result,checked_at=now(),attempts=0,last_error=NULL
 WHERE company_id=c.company_id AND contract_id=c.id;
 SELECT md5(string_agg(to_jsonb(p)::text,'' ORDER BY p.id)) INTO receipts_after FROM public.payments p WHERE p.company_id=c.company_id;
 SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY x.id)) INTO invoices_after FROM public.invoices x WHERE x.company_id=c.company_id AND x.contract_id=c.id;
 SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY x.id)) INTO allocations_after FROM public.payment_allocations x WHERE x.company_id=c.company_id;
 IF receipts_before IS DISTINCT FROM receipts_after OR invoices_before IS DISTINCT FROM invoices_after
  OR allocations_before IS DISTINCT FROM allocations_after THEN RAISE EXCEPTION 'Financial history changed unexpectedly'; END IF;
END;$resolve$;
COMMIT;
