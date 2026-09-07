-- Resolve 39 proven schedule projection defects across 18 reviewed contracts.
-- Does not change invoices, receipts, allocations, journals, contract values or legal status.
-- The two contracts with ambiguous cancelled obligations require a separate business decision.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';

CREATE INDEX financial_schedule_resolution_guard_idx
ON public.financial_data_repair_snapshots(company_id,entity_id)
WHERE entity_type='contract_payment_schedules' AND metadata->>'schedule_resolution'='closed' AND rolled_back_at IS NULL;

CREATE FUNCTION public.guard_resolved_contract_schedule_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $guard$
BEGIN
 IF NOT public.financial_record_is_active_v1(NEW.status) THEN RETURN NEW; END IF;
 IF EXISTS(
  SELECT 1 FROM public.financial_data_repair_snapshots r
  WHERE r.company_id=NEW.company_id AND r.entity_type='contract_payment_schedules'
   AND r.metadata->>'schedule_resolution'='closed' AND r.rolled_back_at IS NULL
   AND (r.entity_id=NEW.id OR (
    COALESCE((r.metadata->>'block_billing_month')::boolean,false)
    AND r.before_value->>'contract_id'=NEW.contract_id::text
    AND date_trunc('month',(r.before_value->>'due_date')::date)::date=date_trunc('month',NEW.due_date)::date))
 ) THEN
  RAISE EXCEPTION 'هذا القسط حُسم بمراجعة موثقة؛ يلزم تعديل معتمد قبل إعادة تنشيطه' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION public.guard_resolved_contract_schedule_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_resolved_contract_schedule_v1 BEFORE INSERT OR UPDATE ON public.contract_payment_schedules
FOR EACH ROW EXECUTE FUNCTION public.guard_resolved_contract_schedule_v1();

CREATE TEMP TABLE reviewed_schedule_plan ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset($plan$
[{"contract_number":"LTO2024243","contract_status":"under_legal_procedure","contract_end":"2026-12-01","contract_amount":36250,"due_date":"2026-12-01","installment_number":30,"amount":1250,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024243-2026-11","expected_invoice_month":"2026-11-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2026-12-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"MR202467","contract_status":"under_legal_procedure","contract_end":"2025-11-05","contract_amount":19500,"due_date":"2025-12-01","installment_number":13,"amount":1500,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"retire_outside_term_projection","new_invoice_number":null,"new_due_date":"2025-12-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO202436","contract_status":"under_legal_procedure","contract_end":"2027-02-03","contract_amount":73500,"due_date":"2027-02-01","installment_number":36,"amount":2100,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO202436-2027-01","expected_invoice_month":"2027-01-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-02-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024242","contract_status":"cancelled","contract_end":"2025-08-05","contract_amount":23800,"due_date":"2027-07-01","installment_number":37,"amount":1700,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024242-2027-06","expected_invoice_month":"2027-06-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-07-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"AGR-202504-413489","contract_status":"cancelled","contract_end":"2025-05-01","contract_amount":4500,"due_date":"2025-12-01","installment_number":10,"amount":1500,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-AGR-202504-413489-2025-12-R","expected_invoice_month":"2025-11-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2025-12-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024317","contract_status":"cancelled","contract_end":"2027-02-01","contract_amount":36250,"due_date":"2027-02-01","installment_number":30,"amount":1250,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024317-2027-01","expected_invoice_month":"2027-01-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-02-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024270","contract_status":"under_legal_procedure","contract_end":"2027-07-01","contract_amount":45000,"due_date":"2027-08-01","installment_number":37,"amount":1250,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024270-2027-07","expected_invoice_month":"2027-07-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-08-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024296","contract_status":"cancelled","contract_end":"2025-04-15","contract_amount":10400,"due_date":"2027-02-01","installment_number":30,"amount":1300,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024296-2027-01","expected_invoice_month":"2027-01-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-02-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-03-01","installment_number":12,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-03-01","cancelled_invoice_number":"INV-202603-00008","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-04-01","installment_number":13,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-04-01","cancelled_invoice_number":"INV-202604-00008","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-05-01","installment_number":14,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-05-01","cancelled_invoice_number":"INV-202605-00008","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-06-01","installment_number":15,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-06-01","cancelled_invoice_number":"INV-202606-00008","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-07-01","installment_number":16,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-07-01","cancelled_invoice_number":"INV-202607-00009","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-08-01","installment_number":17,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-08-01","cancelled_invoice_number":"INV-202608-00009","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-09-01","installment_number":18,"amount":1600,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-09-01","cancelled_invoice_number":"INV-202609-00011","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-10-01","installment_number":19,"amount":1600,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-10-01","cancelled_invoice_number":"INV-202610-00011","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-11-01","installment_number":20,"amount":1600,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-11-01","cancelled_invoice_number":"INV-202611-00011","block_billing_month":true},{"contract_number":"C-ALF-0041","contract_status":"under_legal_procedure","contract_end":"2026-02-01","contract_amount":17600,"due_date":"2026-12-01","installment_number":21,"amount":1600,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-12-01","cancelled_invoice_number":"INV-202612-00011","block_billing_month":true},{"contract_number":"C-ALF-0076","contract_status":"active","contract_end":"2027-11-01","contract_amount":45000,"due_date":"2027-12-01","installment_number":30,"amount":1500,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-C-ALF-0076-2027-11","expected_invoice_month":"2027-11-01","reason":"restore_missing_month_projection","new_invoice_number":"INV-C-ALF-0076-2027-01","new_due_date":"2027-01-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024313","contract_status":"expired","contract_end":"2024-12-01","contract_amount":2500,"due_date":"2024-10-01","installment_number":1,"amount":300,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"retire_traffic_projection","new_invoice_number":null,"new_due_date":"2024-10-01","cancelled_invoice_number":"TV-dde6ec0e-a894-42c8-8ea5-4f2f623d97eb","block_billing_month":false},{"contract_number":"LTO202429","contract_status":"cancelled","contract_end":"2025-02-01","contract_amount":23100,"due_date":"2027-05-01","installment_number":37,"amount":2100,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO202429-2027-04","expected_invoice_month":"2027-04-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-05-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024268","contract_status":"under_legal_procedure","contract_end":"2027-07-01","contract_amount":64750,"due_date":"2027-07-01","installment_number":36,"amount":1850,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024268-2027-06","expected_invoice_month":"2027-06-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-07-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO202442","contract_status":"under_legal_procedure","contract_end":"2026-06-23","contract_amount":65100,"due_date":"2026-07-01","installment_number":31,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO202442-2026-06","expected_invoice_month":"2026-06-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2026-07-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-01-01","installment_number":23,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-01-01","cancelled_invoice_number":"INV-2026-000088","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-02-01","installment_number":24,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-02-01","cancelled_invoice_number":"INV-2026-000248","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-03-01","installment_number":25,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-03-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-03","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-04-01","installment_number":26,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-04-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-04","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-05-01","installment_number":27,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-05-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-05","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-06-01","installment_number":28,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-06-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-06","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-07-01","installment_number":29,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-07-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-07","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-08-01","installment_number":30,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-08-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-08","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-09-01","installment_number":31,"amount":2100,"expected_status":"overdue","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-09-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-09","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-10-01","installment_number":32,"amount":2100,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-10-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-10","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-11-01","installment_number":33,"amount":2100,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-11-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-11","block_billing_month":true},{"contract_number":"C-ALF-0048","contract_status":"under_legal_procedure","contract_end":"2025-12-31","contract_amount":46200,"due_date":"2026-12-01","installment_number":34,"amount":2100,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":null,"expected_invoice_month":null,"reason":"honor_approved_billing_cutoff","new_invoice_number":null,"new_due_date":"2026-12-01","cancelled_invoice_number":"INV-C-ALF-0048-2026-12","block_billing_month":true},{"contract_number":"LTO2024310","contract_status":"cancelled","contract_end":"2025-04-10","contract_amount":14400,"due_date":"2027-08-01","installment_number":36,"amount":1800,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024310-2027-07","expected_invoice_month":"2027-07-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-08-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"C-ALF-0072","contract_status":"active","contract_end":"2026-12-31","contract_amount":33600,"due_date":"2026-05-01","installment_number":14,"amount":1600,"expected_status":"partially_paid","expected_paid":1000,"expected_hold":null,"expected_invoice_number":"INV-C-ALF-0072-2026-04","expected_invoice_month":"2026-04-01","reason":"correct_month_link","new_invoice_number":"INV-C-ALF-0072-2026-05","new_due_date":"2026-05-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"C-ALF-0072","contract_status":"active","contract_end":"2026-12-31","contract_amount":33600,"due_date":"2027-01-01","installment_number":21,"amount":1600,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-C-ALF-0072-2026-12","expected_invoice_month":"2026-12-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-01-01","cancelled_invoice_number":null,"block_billing_month":false},{"contract_number":"LTO2024335","contract_status":"cancelled","contract_end":"2027-11-01","contract_amount":0,"due_date":"2027-11-01","installment_number":37,"amount":1500,"expected_status":"pending","expected_paid":0,"expected_hold":null,"expected_invoice_number":"INV-LTO2024335-2027-10","expected_invoice_month":"2027-10-01","reason":"retire_duplicate_projection","new_invoice_number":null,"new_due_date":"2027-11-01","cancelled_invoice_number":null,"block_billing_month":false}]
$plan$::jsonb) AS x(
 contract_number text,contract_status text,contract_end date,contract_amount numeric,
 due_date date,installment_number integer,amount numeric,expected_status text,expected_paid numeric,
 expected_hold text,expected_invoice_number text,expected_invoice_month date,reason text,
 new_invoice_number text,new_due_date date,cancelled_invoice_number text,block_billing_month boolean
);

DO $repair$
DECLARE
 company uuid:='24bc0b21-4e2d-4413-9842-31719a3669f4';
 version text:='20260906172212';
 p record;c public.contracts%ROWTYPE;s public.contract_payment_schedules%ROWTYPE;
 inv public.invoices%ROWTYPE; cancelled public.invoices%ROWTYPE;
 before_s jsonb;after_s jsonb;result jsonb;protected_before jsonb;protected_after jsonb;
 affected uuid[];changed integer:=0;new_paid numeric;note text;
BEGIN
 IF (SELECT count(*) FROM reviewed_schedule_plan)<>39
 OR (SELECT count(DISTINCT contract_number) FROM reviewed_schedule_plan)<>18 THEN
  RAISE EXCEPTION 'Unexpected reviewed plan size';
 END IF;
 SELECT array_agg(id ORDER BY id) INTO affected FROM public.contracts
 WHERE company_id=company AND contract_number IN(SELECT contract_number FROM reviewed_schedule_plan);
 IF cardinality(affected)<>18 THEN RAISE EXCEPTION 'Reviewed contract scope changed'; END IF;
 -- Follow the live invoice -> contract lock order. Stop if concurrent work owns a target.
 PERFORM 1 FROM public.invoices WHERE company_id=company AND contract_id=ANY(affected) ORDER BY id FOR UPDATE NOWAIT;
 PERFORM 1 FROM public.contracts WHERE company_id=company AND id=ANY(affected) ORDER BY id FOR UPDATE NOWAIT;
 PERFORM 1 FROM public.contract_payment_schedules WHERE company_id=company AND contract_id=ANY(affected) ORDER BY id FOR UPDATE NOWAIT;
 SELECT jsonb_build_object(
  'contracts',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.contracts x WHERE company_id=company AND id=ANY(affected)),
  'invoices',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.invoices x WHERE company_id=company AND contract_id=ANY(affected)),
  'payments',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.payments x WHERE company_id=company),
  'allocations',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.payment_allocations x WHERE company_id=company)
 ) INTO protected_before;
 PERFORM set_config('app.financial_reconciliation_running','on',true);
 FOR p IN SELECT * FROM reviewed_schedule_plan ORDER BY contract_number,due_date LOOP
  SELECT * INTO STRICT c FROM public.contracts WHERE company_id=company AND contract_number=p.contract_number;
  IF (c.status,c.end_date,c.contract_amount) IS DISTINCT FROM (p.contract_status,p.contract_end,p.contract_amount) THEN
   RAISE EXCEPTION 'Contract changed since review: %',p.contract_number;
  END IF;
  SELECT * INTO STRICT s FROM public.contract_payment_schedules
  WHERE company_id=company AND contract_id=c.id AND due_date=p.due_date AND installment_number=p.installment_number
    AND public.financial_record_is_active_v1(status);
  IF (s.amount,s.status,COALESCE(s.paid_amount,0),s.financial_hold_reason) IS DISTINCT FROM
     (p.amount,p.expected_status,p.expected_paid,p.expected_hold) THEN
   RAISE EXCEPTION 'Schedule changed since review: % %',p.contract_number,p.due_date;
  END IF;
  IF p.expected_invoice_number IS NULL THEN
   IF s.invoice_id IS NOT NULL THEN RAISE EXCEPTION 'Previously detached schedule was relinked'; END IF;
  ELSE
   SELECT * INTO STRICT inv FROM public.invoices WHERE id=s.invoice_id AND company_id=company AND contract_id=c.id;
   IF (inv.invoice_number,inv.invoice_month) IS DISTINCT FROM (p.expected_invoice_number,p.expected_invoice_month)
      OR NOT public.financial_record_is_active_v1(inv.status)
      OR NOT public.financial_record_is_active_v1(inv.payment_status)
      OR NOT EXISTS(SELECT 1 FROM public.contract_payment_schedules other
        WHERE other.company_id=company AND other.contract_id=c.id AND other.id<>s.id
          AND other.invoice_id=inv.id AND other.due_date=inv.invoice_month AND public.financial_record_is_active_v1(other.status)) THEN
    RAISE EXCEPTION 'Duplicate-link evidence changed: % %',p.contract_number,p.due_date;
   END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.company_id=company AND a.is_active AND a.target_id=s.id) THEN
   RAISE EXCEPTION 'Schedule has direct allocations requiring individual review';
  END IF;
  cancelled:=NULL;
  IF p.cancelled_invoice_number IS NOT NULL THEN
   SELECT * INTO STRICT cancelled FROM public.invoices WHERE company_id=company AND contract_id=c.id AND invoice_number=p.cancelled_invoice_number;
   IF public.financial_record_is_active_v1(cancelled.status) OR cancelled.invoice_month<>s.due_date
      OR cancelled.total_amount<>s.amount OR COALESCE(cancelled.paid_amount,0)<>0
      OR public.canonical_invoice_paid_amount(cancelled.id,NULL)<>0
      OR COALESCE(cancelled.notes,'') NOT LIKE '%Cancelled through approved reversal:%' THEN
    RAISE EXCEPTION 'Approved cancellation evidence changed: % %',p.contract_number,p.due_date;
   END IF;
  END IF;
  IF p.reason='honor_approved_billing_cutoff' AND (s.due_date<=c.end_date OR cancelled.id IS NULL OR cancelled.penalty_id IS NOT NULL) THEN
   RAISE EXCEPTION 'Billing cutoff is not proven';
  ELSIF p.reason='retire_traffic_projection' AND (cancelled.penalty_id IS NULL OR COALESCE(s.notes,'') NOT LIKE '%TV%') THEN
   RAISE EXCEPTION 'Traffic-only projection is not proven';
  ELSIF p.reason='retire_outside_term_projection' AND s.due_date<=c.end_date THEN
   RAISE EXCEPTION 'Outside-term projection is not proven';
  END IF;
  before_s:=to_jsonb(s);
  IF p.new_invoice_number IS NULL THEN
   IF s.paid_amount<>0 OR EXISTS(SELECT 1 FROM public.invoices i
      WHERE i.company_id=company AND i.contract_id=c.id AND i.penalty_id IS NULL
       AND upper(COALESCE(i.invoice_number,'')) NOT LIKE 'TV-%'
       AND public.financial_record_is_active_v1(i.status) AND public.financial_record_is_active_v1(i.payment_status)
       AND i.invoice_month=s.due_date) THEN
    RAISE EXCEPTION 'Cannot retire a paid projection or a month with active billing: % %',p.contract_number,p.due_date;
   END IF;
   note:=CASE p.reason WHEN 'retire_duplicate_projection' THEN 'إغلاق قسط مكرر كان مرتبطًا بفاتورة شهر آخر؛ الفاتورة والقسط الصحيح محفوظان.'
    WHEN 'honor_approved_billing_cutoff' THEN 'إغلاق القسط بعد نهاية مدة الفوترة المعتمدة وتثبيت إلغاء فاتورته السابق.'
    WHEN 'retire_traffic_projection' THEN 'إغلاق قسط نشأ من فاتورة مخالفة ملغاة؛ المخالفة باقية ضمن نظام المخالفات.'
    ELSE 'إغلاق قسط زائد بعد نهاية العقد لا تقابله فاتورة.' END;
   UPDATE public.contract_payment_schedules SET status='cancelled',invoice_id=NULL,paid_amount=0,paid_date=NULL,
    cancelled_invoice_id=cancelled.id,
    financial_hold_reason=CASE WHEN p.block_billing_month THEN 'resolved_approved_billing_cutoff' ELSE NULL END,
    notes=concat_ws(E'\n',NULLIF(notes,''),'[مراجعة مالية 2026-09-06] '||note),updated_at=now()
   WHERE id=s.id AND company_id=company RETURNING to_jsonb(contract_payment_schedules.*) INTO after_s;
  ELSE
   SELECT * INTO STRICT inv FROM public.invoices WHERE company_id=company AND contract_id=c.id AND invoice_number=p.new_invoice_number;
   IF inv.invoice_month<>p.new_due_date OR inv.total_amount<>s.amount OR inv.penalty_id IS NOT NULL
    OR inv.invoice_type NOT IN ('sales','service') OR NOT public.financial_record_is_active_v1(inv.status)
    OR NOT public.financial_record_is_active_v1(inv.payment_status)
    OR EXISTS(SELECT 1 FROM public.contract_payment_schedules other WHERE other.company_id=company AND other.id<>s.id
       AND public.financial_record_is_active_v1(other.status) AND (other.invoice_id=inv.id OR (other.contract_id=c.id AND other.due_date=p.new_due_date))) THEN
    RAISE EXCEPTION 'Replacement projection evidence is not unique';
   END IF;
   new_paid:=least(greatest(public.canonical_invoice_paid_amount(inv.id,NULL),0),inv.total_amount);
   IF new_paid<>0 THEN RAISE EXCEPTION 'Reviewed replacement invoice is no longer unpaid'; END IF;
   UPDATE public.contract_payment_schedules SET invoice_id=inv.id,due_date=p.new_due_date,paid_amount=new_paid,paid_date=NULL,
    status=CASE WHEN p.new_due_date<CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
    notes=concat_ws(E'\n',NULLIF(notes,''),'[مراجعة مالية 2026-09-06] تصحيح ربط القسط بفاتورة شهره؛ الدفعات الأصلية محفوظة.'),
    updated_at=now()
   WHERE id=s.id AND company_id=company RETURNING to_jsonb(contract_payment_schedules.*) INTO after_s;
  END IF;
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,after_value,metadata)
  VALUES(version,p.reason,company,'contract_payment_schedules',s.id,before_s,after_s,
   jsonb_build_object('contract_number',p.contract_number,'reason',p.reason,'block_billing_month',p.block_billing_month,
    'schedule_resolution',CASE WHEN p.new_invoice_number IS NULL THEN 'closed' ELSE 'relinked' END,
    'source_invoice_number',p.expected_invoice_number,'cancelled_invoice_number',p.cancelled_invoice_number,
    'replacement_invoice_number',p.new_invoice_number,'scope','reviewed_schedule_projection_only'));
  changed:=changed+1;
 END LOOP;
 IF changed<>39 THEN RAISE EXCEPTION 'Unexpected repair count'; END IF;
 FOR c IN SELECT * FROM public.contracts WHERE company_id=company AND id=ANY(affected) ORDER BY id LOOP
  -- Audit only: all receipt and invoice facts must remain byte-for-byte unchanged.
  result:=public.reconcile_contract_financial_integrity_internal_v1(company,c.id,false);
  IF result->>'status'<>'matched' THEN RAISE EXCEPTION 'Post-repair review remains for %: %',c.contract_number,result; END IF;
  UPDATE public.contract_financial_reconciliation_queue SET status='matched',last_result=result,checked_at=now(),attempts=0,last_error=NULL
  WHERE company_id=company AND contract_id=c.id;
 END LOOP;
 SELECT jsonb_build_object(
  'contracts',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.contracts x WHERE company_id=company AND id=ANY(affected)),
  'invoices',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.invoices x WHERE company_id=company AND contract_id=ANY(affected)),
  'payments',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.payments x WHERE company_id=company),
  'allocations',(SELECT md5(string_agg(to_jsonb(x)::text,'' ORDER BY id)) FROM public.payment_allocations x WHERE company_id=company)
 ) INTO protected_after;
 IF protected_before IS DISTINCT FROM protected_after THEN RAISE EXCEPTION 'Protected financial facts changed'; END IF;
 PERFORM set_config('app.financial_reconciliation_running','',true);
END;
$repair$;
COMMIT;
