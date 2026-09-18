-- Preserve review of two rental invoices rebuilt from retired traffic schedules.
-- This only flags the proven source ambiguity; no amount, receipt, invoice or journal changes.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $review$
DECLARE c public.contracts%ROWTYPE;s public.contract_payment_schedules%ROWTYPE;i public.invoices%ROWTYPE;
 p record;before_s jsonb;after_s jsonb;result jsonb;n integer:=0;
BEGIN
 SELECT * INTO STRICT c FROM public.contracts
 WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4' AND contract_number='MR202467';
 PERFORM 1 FROM public.invoices WHERE company_id=c.company_id AND contract_id=c.id ORDER BY id FOR UPDATE NOWAIT;
 PERFORM 1 FROM public.contracts WHERE id=c.id FOR UPDATE NOWAIT;
 IF c.contract_amount<>19500 THEN RAISE EXCEPTION 'Contract terms changed after review'; END IF;
 FOR p IN SELECT * FROM(VALUES('INV-202506-00004','2025-06-01'::date,300::numeric),
  ('INV-202509-00003','2025-09-01'::date,6000::numeric))x(number,month,amount) LOOP
  SELECT * INTO STRICT i FROM public.invoices WHERE company_id=c.company_id AND contract_id=c.id AND invoice_number=p.number;
  IF i.invoice_month<>p.month OR i.total_amount<>p.amount OR i.penalty_id IS NOT NULL
    OR i.paid_amount<>0 OR NOT public.financial_record_is_active_v1(i.status)
    OR NOT public.financial_record_is_active_v1(i.payment_status)
    OR COALESCE(i.notes,'') NOT LIKE 'Generated for contract billing month%' THEN
   RAISE EXCEPTION 'Invoice origin evidence changed';
  END IF;
  SELECT * INTO STRICT s FROM public.contract_payment_schedules WHERE company_id=c.company_id AND contract_id=c.id
   AND invoice_id=i.id AND due_date=p.month AND public.financial_record_is_active_v1(status) FOR UPDATE;
  IF s.amount<>p.amount OR s.paid_amount<>0 OR s.financial_hold_reason IS NOT NULL
    OR COALESCE(s.notes,'') NOT LIKE '%قسط نشأ من زناد مخالفات قديم%' THEN
   RAISE EXCEPTION 'Retired traffic origin is not proven';
  END IF;
  before_s:=to_jsonb(s);
  UPDATE public.contract_payment_schedules SET financial_hold_reason='rental_invoice_origin_review',
   notes=concat_ws(E'\n',NULLIF(notes,''),'[مراجعة مالية 2026-09-06] أُعيد إصدار فاتورة إيجار من قسط مخالفة قديم؛ يلزم تثبيت أجرة الشهر قبل التصحيح المحاسبي.'),
   updated_at=now()
  WHERE id=s.id AND company_id=c.company_id RETURNING to_jsonb(contract_payment_schedules.*) INTO after_s;
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,after_value,metadata)
  VALUES('20260906173435','review_traffic_derived_rental_invoice',c.company_id,'contract_payment_schedules',s.id,before_s,after_s,
   jsonb_build_object('contract_number',c.contract_number,'invoice_number',i.invoice_number,'source','retired_traffic_schedule','schedule_resolution','review'));
  n:=n+1;
 END LOOP;
 IF n<>2 THEN RAISE EXCEPTION 'Expected exactly two origin reviews'; END IF;
 result:=public.reconcile_contract_financial_integrity_internal_v1(c.company_id,c.id,false);
 IF result->>'status'<>'review' THEN RAISE EXCEPTION 'Source review did not appear in the financial snapshot'; END IF;
 UPDATE public.contract_financial_reconciliation_queue SET status='review',last_result=result,checked_at=now(),attempts=0,last_error=NULL
 WHERE company_id=c.company_id AND contract_id=c.id;
END;
$review$;
COMMIT;
