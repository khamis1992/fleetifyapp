BEGIN;
-- Keep claim items and profile options for recovery; no user evidence is deleted.
REVOKE INSERT,UPDATE ON public.legal_case_claim_items FROM authenticated;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.read_statement(p_company_id uuid, p_contract_id uuid, p_as_of_date date, p_claim_scope text, p_excluded_invoice_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.validate_snapshot_statement(p_company_id uuid, p_contract_id uuid, p_package jsonb, p_statement jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  s public.legal_case_memo_snapshots%ROWTYPE;
  profile public.legal_case_litigation_profile%ROWTYPE;
  memo jsonb;
  c jsonb := p_statement->'components';
  missing text[] := ARRAY[]::text[];
  pair record;
  gross numeric := 0;
  paid numeric := 0;
  extension numeric := COALESCE((c->>'legal_extension_rent')::numeric,0);
  rent numeric := COALESCE((c->>'rent_due')::numeric,0)+extension;
  period_start date;
  period_end date;
  retention_from date;
  retention_to date;
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  SELECT * INTO s FROM public.legal_case_memo_snapshots
  WHERE id=NULLIF(p_package->>'memoSnapshotId','')::uuid
    AND company_id=p_company_id AND contract_id=p_contract_id;
  IF NOT FOUND THEN RETURN ARRAY['memoSnapshot.missing']; END IF;
  IF EXISTS (SELECT 1 FROM public.legal_case_memo_snapshots newer
    WHERE newer.company_id=p_company_id AND newer.contract_id=p_contract_id AND newer.version>s.version) THEN
    missing:=array_append(missing,'memoSnapshot.superseded');
  END IF;
  memo:=s.payload;
  IF COALESCE(memo->>'claimScope','full_outstanding') IS DISTINCT FROM p_statement->>'claim_scope' THEN
    missing:=array_append(missing,'memoSnapshot.scope_changed');
  END IF;
  SELECT * INTO profile FROM public.legal_case_litigation_profile
    WHERE company_id=p_company_id AND contract_id=p_contract_id;

  -- Compare every component, not only their sum. Optional zero-valued memo
  -- sections are normalized to zero; mandatory rent/total fields stay mandatory.
  FOR pair IN SELECT * FROM (VALUES
    ((memo#>>'{customer,overdue_amount}')::numeric,rent),
    ((memo#>>'{customer,late_penalty}')::numeric,COALESCE((c->>'contractual_compensation')::numeric,0)),
    ((memo#>>'{customer,violations_amount}')::numeric,COALESCE((c->>'traffic_violations')::numeric,0)),
    (COALESCE((memo->>'damages')::numeric,0),COALESCE((c->>'damages')::numeric,0)),
    (COALESCE((memo#>>'{retentionClaim,amount}')::numeric,0),COALESCE((c->>'retention')::numeric,0)),
    (CASE WHEN memo#>>'{securityDeposit,applyToSettlement}'='true' THEN COALESCE((memo#>>'{securityDeposit,amount}')::numeric,0) ELSE 0 END,
      COALESCE((c->>'security_deposit_deduction')::numeric,0)),
    ((memo#>>'{customer,total_debt}')::numeric,(p_statement->>'total')::numeric),
    ((p_package#>>'{case,amount}')::numeric,(p_statement->>'total')::numeric)
  ) v(actual,expected) LOOP
    IF round(pair.actual,2) IS DISTINCT FROM round(pair.expected,2) THEN
      missing:=array_append(missing,'memoSnapshot.financial_components_changed'); EXIT;
    END IF;
  END LOOP;

  SELECT COALESCE(sum((r->>'total_amount')::numeric),0),COALESCE(sum((r->>'paid_amount')::numeric),0),
    min((r->>'service_period_start')::date),max((r->>'service_period_end')::date)
  INTO gross,paid,period_start,period_end
  FROM jsonb_array_elements(COALESCE(p_statement->'included_invoices','[]'::jsonb)) r
  WHERE (r->>'amount')::numeric>0;
  gross:=gross+extension;
  IF extension>0 THEN
    period_start:=least(period_start,(p_statement->>'extension_start_date')::date);
    period_end:=greatest(period_end,COALESCE(p_statement->>'cutoff_date',p_statement->>'rent_cutoff_date',p_statement->>'as_of_date')::date);
  END IF;
  IF round((memo->>'grossInvoicesTotal')::numeric,2) IS DISTINCT FROM round(gross,2)
    OR round((memo->>'paidTotal')::numeric,2) IS DISTINCT FROM round(paid,2)
    OR round(gross-paid,2) IS DISTINCT FROM round(rent,2) THEN
    missing:=array_append(missing,'memoSnapshot.rent_settlement_changed');
  END IF;
  IF NULLIF(memo->>'unpaidPeriodFrom','') IS DISTINCT FROM to_char(period_start,'DD/MM/YYYY')
    OR NULLIF(memo->>'unpaidPeriodTo','') IS DISTINCT FROM to_char(period_end,'DD/MM/YYYY')
    OR (rent>0 AND (period_start IS NULL OR period_end IS NULL)) THEN
    missing:=array_append(missing,'memoSnapshot.service_period_changed');
  END IF;

  IF COALESCE((c->>'contractual_compensation')::numeric,0)>0 OR memo->'contractualCompensation' IS NOT NULL THEN
    IF profile.contractual_compensation_enabled IS DISTINCT FROM true
      OR profile.contractual_compensation_document_id IS NULL
      OR (memo#>>'{contractualCompensation,amount}')::numeric IS DISTINCT FROM (c->>'contractual_compensation')::numeric
      OR (memo#>>'{contractualCompensation,units}')::numeric IS DISTINCT FROM (p_statement#>>'{calculation_details,contractual_compensation_units}')::numeric
      OR (memo#>>'{contractualCompensation,rate}')::numeric IS DISTINCT FROM profile.contractual_compensation_rate
      OR (memo#>>'{contractualCompensation,cap}')::numeric IS DISTINCT FROM profile.contractual_compensation_cap
      OR memo#>>'{contractualCompensation,method}' IS DISTINCT FROM profile.contractual_compensation_method
      OR memo#>>'{contractualCompensation,clauseNumber}' IS DISTINCT FROM profile.contractual_compensation_clause_number
      OR memo#>>'{contractualCompensation,clauseText}' IS DISTINCT FROM profile.contractual_compensation_clause_text THEN
      missing:=array_append(missing,'memoSnapshot.compensation_details_changed');
    END IF;
  END IF;
  IF COALESCE((c->>'retention')::numeric,0)>0 THEN
    retention_from:=(p_statement#>>'{calculation_details,retention_start_date}')::date;
    retention_to:=(p_statement#>>'{calculation_details,retention_end_date}')::date;
    IF (memo#>>'{retentionClaim,from}')::date IS DISTINCT FROM retention_from
      OR (memo#>>'{retentionClaim,to}')::date IS DISTINCT FROM retention_to
      OR (memo#>>'{retentionClaim,days}')::integer IS DISTINCT FROM retention_to-retention_from+1
      OR (memo#>>'{retentionRate,daily}')::numeric IS DISTINCT FROM profile.retention_daily_rate
      OR memo#>>'{retentionRate,sourceRef}' IS DISTINCT FROM profile.retention_rate_source_ref
      OR profile.retention_rate_source_document_id IS NULL THEN
      missing:=array_append(missing,'memoSnapshot.retention_details_changed');
    END IF;
  END IF;
  RETURN missing;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
  RETURN ARRAY['memoSnapshot.invalid_details'];
END;
$function$
;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.readiness_financials(p_company uuid, p_contract uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE traffic jsonb; statement jsonb; invoice_rows jsonb:='[]'; violation_rows jsonb:='[]';
 rent_review boolean:=false; traffic_review boolean:=false; rent_reasons jsonb:='[]'; traffic_reasons jsonb:='[]';
 rent_total numeric; traffic_total numeric; claim_traffic numeric; proof_ready boolean:=false; message text;
BEGIN
 PERFORM legal_memo_calc_private.authorize_company(p_company);
 -- Read the same liability/receipt/evidence projection used by the memo.
 BEGIN
  traffic:=legal_memo_calc_private.read_traffic(p_company,p_contract,p_date);
  traffic_review:=coalesce((traffic->>'requires_review')::boolean,true);
  proof_ready:=coalesce((traffic->>'proof_ready')::boolean,false);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',coalesce(row->>'penalty_id',row->>'invoice_id'), 'source_type',row->>'source_type',
    'violation_number',row->>'violation_number','violation_date',row->>'penalty_date',
    'violation_type',row->>'violation_type','description',row->>'location',
    'liability_amount',CASE WHEN row->>'disposition'='review' THEN NULL
      WHEN row->>'disposition'='included' THEN (row->>'outstanding_amount')::numeric ELSE 0 END,
    'status',row->>'disposition','responsibility_party',row->>'responsibility_party')), '[]')
   INTO violation_rows FROM jsonb_array_elements(traffic->'rows') row;
  IF traffic_review THEN
   SELECT coalesce(jsonb_agg(DISTINCT reason),'[]') INTO traffic_reasons
    FROM jsonb_array_elements(traffic->'rows') row CROSS JOIN LATERAL jsonb_array_elements_text(row->'review_reasons') reason;
  ELSE
   SELECT coalesce(sum((row->>'liability_amount')::numeric),0) INTO traffic_total FROM jsonb_array_elements(violation_rows) row;
   claim_traffic:=CASE WHEN proof_ready THEN traffic_total ELSE 0 END;
  END IF;
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  traffic_review:=true; traffic_total:=null; claim_traffic:=null;
  traffic_reasons:=jsonb_build_array(message);
 END;
 BEGIN
  statement:=legal_memo_calc_private.read_statement(p_company,p_contract,p_date,'full_outstanding',ARRAY[]::uuid[]);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',row->>'id','invoice_number',row->>'invoice_number',
    'invoice_date',i.invoice_date,'due_date',row->>'due_date',
    'total_amount',(row->>'total_amount')::numeric,'paid_amount',(row->>'paid_amount')::numeric,
    'balance_due',(row->>'amount')::numeric,'payment_status',i.payment_status,'status',i.status,
    'journal_entry_id',i.journal_entry_id,
    'can_edit_amount',i.journal_entry_id IS NULL AND coalesce(i.paid_amount,0)<=0.01 AND (row->>'paid_amount')::numeric=0
      AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.invoice_id=i.id)
      AND NOT EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.target_id=i.id AND a.allocation_type='invoice')
      AND NOT EXISTS(SELECT 1 FROM public.invoice_items item WHERE item.invoice_id=i.id),
    'service_period_start',row->>'service_period_start','service_period_end',row->>'service_period_end'
   ) ORDER BY row->>'due_date',row->>'id'),'[]') INTO invoice_rows
   FROM jsonb_array_elements(statement->'included_invoices') row
   JOIN public.invoices i ON i.id=(row->>'id')::uuid AND i.company_id=p_company AND i.contract_id=p_contract;
  SELECT coalesce(sum((row->>'balance_due')::numeric),0) INTO rent_total FROM jsonb_array_elements(invoice_rows) row;
  IF rent_total IS DISTINCT FROM (statement->'components'->>'rent_due')::numeric THEN
   RAISE EXCEPTION 'Rent rows do not reconcile with the claim statement' USING ERRCODE='22023';
  END IF;
 EXCEPTION WHEN SQLSTATE 'P0001' OR SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  rent_review:=true; rent_total:=null; invoice_rows:='[]'; rent_reasons:=jsonb_build_array(message);
 END;
 RETURN jsonb_build_object('invoices',invoice_rows,'violations',violation_rows,
  'invoices_source','completed_receipt_allocations_v1','violations_source','canonical_memo_traffic',
  'violation_proof_ready',proof_ready,'financial_context',jsonb_build_object(
   'version','canonical_legal_readiness_v1','company_id',p_company,'contract_id',p_contract,'as_of_date',p_date,
   'rent_requires_review',rent_review,'traffic_requires_review',traffic_review,
   'rent_total',rent_total,'traffic_total',traffic_total,'traffic_claim_total',claim_traffic,
   'traffic_proof_required',traffic_review OR coalesce(traffic_total>0,false),
   'rent_review_reasons',rent_reasons,'traffic_review_reasons',traffic_reasons));
END;
$function$;
COMMIT;
