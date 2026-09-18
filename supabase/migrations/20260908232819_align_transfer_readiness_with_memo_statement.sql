BEGIN;
DO $backup$
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure)<>'96f660a8b730ac550f12eb184dd297ff' THEN RAISE EXCEPTION 'Reviewed readiness function has changed'; END IF;
 EXECUTE replace(pg_get_functiondef('public.get_legal_transfer_readiness_v2(uuid,uuid)'::regprocedure),
 'public.get_legal_transfer_readiness_v2(', 'legal_memo_calc_private.before_statement_readiness(');
END;
$backup$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_statement_readiness(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION legal_memo_calc_private.readiness_financials(p_company uuid,p_contract uuid,p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $financial$
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
$financial$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.readiness_financials(uuid,uuid,date) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $gateway$
DECLARE result jsonb;
BEGIN
 IF NOT public.can_prepare_contract_for_legal_v1(p_company_id,p_contract_id) THEN
  RAISE EXCEPTION 'You are not authorized to prepare this contract for legal transfer' USING ERRCODE='42501';
 END IF;
 PERFORM legal_memo_calc_private.authorize_company(p_company_id);
 -- Preserve signed-document checks, evidence requests and existing metadata.
 result:=public.get_legal_transfer_readiness_v1(p_company_id,p_contract_id);
 RETURN result || legal_memo_calc_private.readiness_financials(p_company_id,p_contract_id,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date);
END;
$gateway$;
COMMIT;
