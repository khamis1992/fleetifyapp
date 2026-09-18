-- Read-only freshness gate shared by enqueue/pre-portal/final worker approval.
-- Reuse the validator's current statement; no extra claim calculation or financial DML.
BEGIN;
DO $baseline$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure)
    IS DISTINCT FROM '314ebbe34fec9c763825253b51eceb99' THEN
    RAISE EXCEPTION 'Filing validator changed since audit; rebase migration';
  END IF;
  EXECUTE replace(pg_get_functiondef('public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure),
    'public.validate_taqadi_filing_payload_v1_pre_failure_containment(', 'legal_memo_calc_private.before_snapshot_details_validator(');
END;
$baseline$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_snapshot_details_validator(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION legal_memo_calc_private.validate_snapshot_statement(
  p_company_id uuid,p_contract_id uuid,p_package jsonb,p_statement jsonb
) RETURNS text[] LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $fn$
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
$fn$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.validate_snapshot_statement(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;

DO $install$
DECLARE definition text; marker text := '  RETURN jsonb_build_object(';
BEGIN
  definition:=pg_get_functiondef('public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure);
  IF (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 THEN
    RAISE EXCEPTION 'Unexpected filing validator return layout';
  END IF;
  EXECUTE replace(definition,marker,
    E'  v_missing := v_missing || legal_memo_calc_private.validate_snapshot_statement(p_company_id,p_contract_id,p_payload,v_claim_statement);\n\n'||marker);
END;
$install$;
COMMIT;
