BEGIN;
SET LOCAL lock_timeout='5s';
-- Resolve the business identifier; no generated record IDs are embedded in data writes.
DO $$
DECLARE target public.contracts%ROWTYPE; item record; result jsonb;
BEGIN
 IF (SELECT count(*) FROM public.contracts WHERE contract_number='LTO202410')<>1 THEN
  RAISE EXCEPTION 'Expected exactly one reviewed contract LTO202410'; END IF;
 SELECT * INTO STRICT target FROM public.contracts WHERE contract_number='LTO202410' FOR UPDATE;
 IF target.company_id::text<>'24bc0b21-4e2d-4413-9842-31719a3669f4' OR target.status NOT IN ('cancelled','canceled') THEN
  RAISE EXCEPTION 'Reviewed company or contract state changed'; END IF;
 INSERT INTO public.contract_financial_reconciliation_controls(company_id,enabled,auto_repair)
 VALUES(target.company_id,true,true);
 -- Historical orphan rows retain their cancelled document as evidence. This does not waive debt.
 FOR item IN SELECT s.*,candidate.invoice_id source_invoice_id FROM public.contract_payment_schedules s
 CROSS JOIN LATERAL(SELECT (array_agg(i.id))[1] invoice_id FROM public.invoices i
   WHERE i.company_id=target.company_id AND i.contract_id=target.id AND i.penalty_id IS NULL
    AND NOT public.financial_record_is_active_v1(i.status) AND NOT public.financial_record_is_active_v1(i.payment_status)
    AND round(i.total_amount,2)=round(s.amount,2)
    AND date_trunc('month',COALESCE(i.invoice_month,i.invoice_date))::date=date_trunc('month',s.due_date)::date
    AND i.notes LIKE '%Cancelled through approved reversal:%'
   HAVING count(*)=1) candidate
 WHERE s.company_id=target.company_id AND s.contract_id=target.id AND s.invoice_id IS NULL
   AND public.financial_record_is_active_v1(s.status) AND candidate.invoice_id IS NOT NULL
 FOR UPDATE OF s LOOP
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,after_value,metadata)
  VALUES('20260906163157','cancelled_invoice_obligation_hold',target.company_id,'contract_payment_schedule',item.id,to_jsonb(item),
    jsonb_build_object('financial_hold_reason','cancelled_invoice_obligation_review','cancelled_invoice_id',item.source_invoice_id),
    jsonb_build_object('reason','approved invoice reversal; obligation retained for review'));
  UPDATE public.contract_payment_schedules SET financial_hold_reason='cancelled_invoice_obligation_review',
    cancelled_invoice_id=item.source_invoice_id,updated_at=now() WHERE id=item.id AND company_id=target.company_id;
 END LOOP;
 result:=public.reconcile_contract_financial_integrity_internal_v1(target.company_id,target.id,true);
 IF (result->'snapshot'->>'header_mismatch')::boolean THEN RAISE EXCEPTION 'Target header reconciliation did not verify'; END IF;
 -- Queue the company for bounded, verified repairs and explicit review classification.
 FOR item IN SELECT id FROM public.contracts WHERE company_id=target.company_id ORDER BY id LOOP
  PERFORM public.enqueue_contract_financial_reconciliation_v1(target.company_id,item.id);
 END LOOP;
END;
$$;
SELECT cron.schedule('contract-financial-integrity-minute','* * * * *','SELECT public.process_contract_financial_reconciliation_v1(20)');
COMMIT;
