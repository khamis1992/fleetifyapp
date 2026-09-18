-- Read-only service coverage metadata shared by individual and bulk memorandum consumers.
BEGIN;
DO $backup$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[])'::regprocedure)
    IS DISTINCT FROM 'cd04eee7737a3e0cf52695d0350e2594' THEN RAISE EXCEPTION 'Statement gateway changed since service-period review'; END IF;
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[])'::regprocedure),
    'legal_memo_calc_private.read_statement(', 'legal_memo_calc_private.before_service_period_read_statement(');
END;
$backup$;
CREATE FUNCTION legal_memo_calc_private.invoice_service_period(p_company_id uuid,p_contract_id uuid,p_invoice_id uuid,p_service_end date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $period$
DECLARE v_month date; v_contract_start date; v_total numeric; v_start date; v_end date;
  v_first date; v_last date; v_count integer; v_distinct integer; v_schedule_total numeric; v_expected integer; v_basis text;
BEGIN
  SELECT date_trunc('month',coalesce(i.invoice_month,i.due_date))::date,c.start_date,i.total_amount
    INTO v_month,v_contract_start,v_total FROM public.invoices i
    JOIN public.contracts c ON c.id=i.contract_id AND c.company_id=i.company_id
    WHERE i.company_id=p_company_id AND i.contract_id=p_contract_id AND i.id=p_invoice_id;
  IF NOT FOUND OR v_month IS NULL OR v_contract_start IS NULL THEN
    RAISE EXCEPTION 'تعذر تحديد فترة خدمة الفاتورة؛ راجع شهر الفاتورة وبداية العقد' USING ERRCODE='22023';
  END IF;
  SELECT min(date_trunc('month',s.due_date)::date),max(date_trunc('month',s.due_date)::date),
    count(*),count(distinct date_trunc('month',s.due_date)),sum(s.amount)
    INTO v_first,v_last,v_count,v_distinct,v_schedule_total
    FROM public.contract_payment_schedules s WHERE s.company_id=p_company_id AND s.contract_id=p_contract_id
      AND s.invoice_id=p_invoice_id AND lower(coalesce(s.status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted','inactive');
  v_start:=v_month; v_end:=(v_month+interval '1 month'-interval '1 day')::date; v_basis:='invoice_month';
  IF v_count>1 THEN
    v_expected:=(extract(year FROM v_last)-extract(year FROM v_first))*12+extract(month FROM v_last)-extract(month FROM v_first)+1;
    IF v_first IS DISTINCT FROM v_month OR v_count<>v_distinct OR v_distinct<>v_expected
      OR v_schedule_total IS DISTINCT FROM v_total THEN
      RAISE EXCEPTION 'تحتاج فترة الفاتورة المرتبطة بأقساط متعددة إلى مطابقة الأشهر والمبالغ قبل إعداد المذكرة' USING ERRCODE='22023';
    END IF;
    v_end:=(v_last+interval '1 month'-interval '1 day')::date; v_basis:='linked_schedule_months';
  END IF;
  v_start:=greatest(v_start,v_contract_start);
  IF p_service_end IS NOT NULL THEN v_end:=least(v_end,p_service_end); END IF;
  IF v_end<v_start THEN RAISE EXCEPTION 'فترة خدمة الفاتورة خارج مدة الاستحقاق؛ راجع مصدر المطالبة' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('service_period_start',v_start,'service_period_end',v_end,'service_period_basis',v_basis);
END;
$period$;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.read_statement(p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_claim_scope text,p_excluded_invoice_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $gateway$
DECLARE v_result jsonb; v_end date; v_reason text; v_key text; v_rows jsonb;
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  v_result:=legal_memo_calc_private.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
  -- A review date is not an end of service: prepaid current-month coverage can extend beyond today.
  SELECT event_date,event_reason INTO v_end,v_reason FROM (
    SELECT p.vehicle_returned_at AS event_date,'vehicle_return' AS event_reason FROM public.legal_case_litigation_profile p
      WHERE p.company_id=p_company_id AND p.contract_id=p_contract_id
    UNION ALL SELECT p.termination_date,'confirmed_termination' FROM public.legal_case_litigation_profile p
      WHERE p.company_id=p_company_id AND p.contract_id=p_contract_id AND p.termination_date_status='confirmed'
    UNION ALL SELECT l.judgment_final_at::date,'final_judgment' FROM public.legal_cases l
      WHERE l.company_id=p_company_id AND l.contract_id=p_contract_id AND lower(coalesce(l.case_status,''))<>'cancelled'
    UNION ALL SELECT l.outcome_date,'initial_judgment' FROM public.legal_cases l
      WHERE l.company_id=p_company_id AND l.contract_id=p_contract_id AND lower(coalesce(l.case_status,''))<>'cancelled'
        AND l.workflow_stage IN ('judgment_issued','appeal','enforcement','collection','closed')
  ) events WHERE event_date IS NOT NULL AND event_date<=p_as_of_date ORDER BY event_date,event_reason LIMIT 1;
  FOREACH v_key IN ARRAY ARRAY['included_invoices','excluded_invoices'] LOOP
    SELECT coalesce(jsonb_agg(item||legal_memo_calc_private.invoice_service_period(p_company_id,p_contract_id,(item->>'id')::uuid,v_end)
      ORDER BY ordinal),'[]'::jsonb) INTO v_rows
      FROM jsonb_array_elements(coalesce(v_result->v_key,'[]'::jsonb)) WITH ORDINALITY AS items(item,ordinal);
    v_result:=jsonb_set(v_result,ARRAY[v_key],v_rows);
  END LOOP;
  RETURN v_result||jsonb_build_object('service_period_version','invoice_coverage_v1',
    'service_end_event_date',v_end,'cutoff_source',coalesce(v_reason,'as_of_date'));
END;
$gateway$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.invoice_service_period(uuid,uuid,uuid,date),
  legal_memo_calc_private.before_service_period_read_statement(uuid,uuid,date,text,uuid[])
  FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
