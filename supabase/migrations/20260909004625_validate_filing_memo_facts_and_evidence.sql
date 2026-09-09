BEGIN;
DO $baseline$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure)
    IS DISTINCT FROM 'b42cb6186fc3a23dfea9b95c08d446ea' THEN
    RAISE EXCEPTION 'Filing validator changed since factual audit';
  END IF;
  EXECUTE replace(pg_get_functiondef('public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure),
    'public.validate_taqadi_filing_payload_v1_pre_failure_containment(', 'legal_memo_calc_private.before_snapshot_facts_validator(');
END;
$baseline$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_snapshot_facts_validator(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION legal_memo_calc_private.validate_snapshot_facts(p_company_id uuid,p_contract_id uuid,p_package jsonb)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
  memo jsonb; contract jsonb; customer jsonb; vehicle jsonb; profile jsonb;
  customer_name text; service_address text; service_email text;
  missing text[]:=ARRAY[]::text[]; pair record; evidence record;
  traffic_only boolean; expected jsonb; actual jsonb;
  termination_date date; strategy text; official_number text; memo_number text;
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  SELECT payload INTO memo FROM public.legal_case_memo_snapshots
    WHERE id=NULLIF(p_package->>'memoSnapshotId','')::uuid AND company_id=p_company_id AND contract_id=p_contract_id;
  IF NOT FOUND THEN RETURN ARRAY['memoSnapshot.missing']; END IF;
  SELECT to_jsonb(c),to_jsonb(cu),to_jsonb(v) INTO contract,customer,vehicle
    FROM public.contracts c LEFT JOIN public.customers cu ON cu.id=c.customer_id AND cu.company_id=c.company_id
    LEFT JOIN public.vehicles v ON v.id=c.vehicle_id AND v.company_id=c.company_id
    WHERE c.id=p_contract_id AND c.company_id=p_company_id;
  IF contract IS NULL OR customer IS NULL OR vehicle IS NULL THEN RETURN ARRAY['memoSnapshot.parties_changed']; END IF;
  SELECT to_jsonb(p) INTO profile FROM public.legal_case_litigation_profile p
    WHERE p.company_id=p_company_id AND p.contract_id=p_contract_id;
  traffic_only:=memo->>'claimScope'='traffic_violations_only';
  customer_name:=CASE WHEN customer->>'customer_type' IN ('company','corporate') THEN
      COALESCE(NULLIF(btrim(customer->>'company_name_ar'),''),NULLIF(btrim(customer->>'company_name'),''),'شركة بدون اسم')
    ELSE COALESCE(NULLIF(btrim(concat_ws(' ',NULLIF(btrim(customer->>'first_name_ar'),''),NULLIF(btrim(customer->>'last_name_ar'),''))),''),
      NULLIF(btrim(concat_ws(' ',NULLIF(btrim(customer->>'first_name'),''),NULLIF(btrim(customer->>'last_name'),''))),''),'عميل بدون اسم') END;
  service_address:=COALESCE(NULLIF(btrim(profile->>'defendant_service_address'),''),NULLIF(btrim(customer->>'address'),''),'الدوحة قطر');
  service_email:=CASE WHEN profile->>'defendant_email_status'='verified' THEN
      COALESCE(NULLIF(btrim(profile->>'defendant_email'),''),
        CASE WHEN COALESCE(profile->>'defendant_contact_source','customer_record')='customer_record' THEN btrim(customer->>'email') END,'') ELSE '' END;
  FOR pair IN SELECT * FROM (VALUES
    (memo#>>'{customer,customer_name}',customer_name),
    (memo#>>'{customer,customer_code}',customer->>'id'),
    (memo#>>'{customer,id_number}',COALESCE(customer->>'national_id','')),
    (memo#>>'{customer,nationality}',NULLIF(customer->>'nationality','')),
    (memo#>>'{customer,phone}',COALESCE(customer->>'phone','')),
    (memo#>>'{customer,address}',service_address),(memo#>>'{customer,email}',service_email)
  ) x(saved,current) LOOP
    IF pair.saved IS DISTINCT FROM pair.current THEN missing:=array_append(missing,'memoSnapshot.parties_changed'); EXIT; END IF;
  END LOOP;
  FOR pair IN SELECT * FROM (VALUES
    (memo#>>'{contractInfo,contract_number}',contract->>'contract_number'),
    (memo#>>'{contractInfo,start_date}',to_char((contract->>'start_date')::date,'DD/MM/YYYY')),
    (memo#>>'{contractInfo,end_date}',to_char((contract->>'end_date')::date,'DD/MM/YYYY')),
    (memo#>>'{contractInfo,rent_due_day}',profile->>'rent_due_day'),
    (memo#>>'{contractClauses,payment}',profile->>'payment_clause_number'),
    (memo#>>'{contractClauses,return}',profile->>'return_clause_number'),
    (memo#>>'{contractClauses,violations}',profile->>'violations_clause_number')
  ) x(saved,current) LOOP
    IF pair.saved IS DISTINCT FROM pair.current THEN missing:=array_append(missing,'memoSnapshot.contract_changed'); EXIT; END IF;
  END LOOP;
  IF (memo#>>'{contractInfo,monthly_rent}')::numeric IS DISTINCT FROM COALESCE((contract->>'monthly_amount')::numeric,0) THEN
    missing:=array_append(missing,'memoSnapshot.contract_changed');
  END IF;
  expected:=jsonb_build_object('plate',COALESCE(NULLIF(vehicle->>'plate_number',''),NULLIF(contract->>'license_plate',''),'غير محدد'),
    'make',COALESCE(vehicle->>'make',''),'model',COALESCE(vehicle->>'model',''),'year',COALESCE((vehicle->>'year')::integer,0),
    'vin',NULLIF(vehicle->>'vin',''),'color',NULLIF(vehicle->>'color',''));
  IF memo->'vehicleInfo' IS DISTINCT FROM expected THEN missing:=array_append(missing,'memoSnapshot.vehicle_changed'); END IF;
  SELECT NULLIF(btrim(lc.case_number),'') INTO official_number FROM public.legal_cases lc
    WHERE lc.company_id=p_company_id AND lc.contract_id=p_contract_id ORDER BY lc.created_at DESC LIMIT 1;
  memo_number:=NULLIF(btrim(memo->>'caseNumber'),'');
  IF official_number ~* '^(CASE|LC)-' THEN official_number:=NULL; END IF;
  IF memo_number ~* '^(CASE|LC)-' THEN memo_number:=NULL; END IF;
  IF memo_number IS DISTINCT FROM official_number THEN missing:=array_append(missing,'memoSnapshot.case_number_changed'); END IF;

  IF NOT COALESCE(traffic_only,false) THEN
    strategy:=COALESCE(profile->>'rescission_strategy','judicial_rescission');
    IF memo->>'vehicleCustody' IS DISTINCT FROM COALESCE(profile->>'vehicle_custody','unknown')
      OR memo->>'vehicleReturnedAt' IS DISTINCT FROM to_char((profile->>'vehicle_returned_at')::date,'DD/MM/YYYY')
      OR memo#>>'{handoverInfo,date}' IS DISTINCT FROM to_char((profile->>'delivery_handover_date')::date,'DD/MM/YYYY')
      OR COALESCE((memo#>>'{handoverInfo,documented}')::boolean,false) IS DISTINCT FROM
        (NULLIF(profile->>'delivery_handover_date','') IS NOT NULL AND NULLIF(profile->>'delivery_handover_document_id','') IS NOT NULL)
      OR COALESCE((memo->>'returnDocumented')::boolean,false) IS DISTINCT FROM (NULLIF(profile->>'vehicle_return_document_id','') IS NOT NULL) THEN
      missing:=array_append(missing,'memoSnapshot.custody_changed');
    END IF;
    termination_date:=CASE WHEN strategy='natural_expiry' THEN
      CASE WHEN profile->>'renewal_applies'='true' THEN (profile->>'renewed_end_date')::date
        ELSE COALESCE((profile->>'termination_date')::date,(contract->>'end_date')::date) END
      WHEN strategy='documented_termination' THEN (profile->>'termination_date')::date END;
    IF memo->>'terminationPath' IS DISTINCT FROM (CASE strategy WHEN 'natural_expiry' THEN 'natural_expiry' WHEN 'documented_termination' THEN 'documented' ELSE 'judicial' END)
      OR memo#>>'{terminationInfo,date}' IS DISTINCT FROM to_char(termination_date,'DD/MM/YYYY')
      OR (termination_date IS NOT NULL AND (memo#>>'{terminationInfo,type}' IS DISTINCT FROM profile->>'termination_type'
        OR memo#>>'{terminationInfo,status}' IS DISTINCT FROM 'confirmed'
        OR profile->>'termination_date_status' IS DISTINCT FROM 'confirmed'
        OR NULLIF(profile->>'termination_supporting_document_id','') IS NULL)) THEN
      missing:=array_append(missing,'memoSnapshot.termination_changed');
    END IF;
    IF strategy='natural_expiry' AND (profile->>'termination_type' IS DISTINCT FROM 'contract_expired'
      OR termination_date IS NULL OR termination_date>(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date) THEN
      missing:=array_append(missing,'memoSnapshot.termination_changed');
    END IF;
    IF strategy='documented_termination' AND (profile->>'termination_type' IS DISTINCT FROM 'documented_cancellation'
      OR NULLIF(btrim(profile->>'termination_clause_number'),'') IS NULL OR NULLIF(btrim(profile->>'termination_clause_text'),'') IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.legal_case_formal_notices n WHERE n.company_id=p_company_id AND n.contract_id=p_contract_id
        AND n.notice_type='termination_notice' AND n.delivery_confirmed AND n.proof_document_id IS NOT NULL
        AND n.delivered_on>=n.sent_on AND n.delivered_on+greatest(0,COALESCE(n.grace_period_days,0))<=termination_date)) THEN
      missing:=array_append(missing,'memoSnapshot.termination_changed');
    END IF;
    expected:=CASE WHEN NULLIF(profile->>'termination_clause_number','') IS NOT NULL AND NULLIF(profile->>'termination_clause_text','') IS NOT NULL
      THEN jsonb_build_object('number',profile->>'termination_clause_number','text',profile->>'termination_clause_text') END;
    IF NULLIF(memo->'terminationClause','null'::jsonb) IS DISTINCT FROM expected THEN missing:=array_append(missing,'memoSnapshot.termination_changed'); END IF;
    expected:=CASE WHEN NULLIF(profile->>'notice_exception_type','') IS NOT NULL AND NULLIF(profile->>'notice_exception_clause_or_reason','') IS NOT NULL
      AND NULLIF(profile->>'notice_exception_document_id','') IS NOT NULL THEN
      jsonb_build_object('type',profile->>'notice_exception_type','reason',profile->>'notice_exception_clause_or_reason') END;
    IF NULLIF(memo->'noticeException','null'::jsonb) IS DISTINCT FROM expected THEN missing:=array_append(missing,'memoSnapshot.notices_changed'); END IF;
    -- Item identity/order is immaterial; the actual wording, service dates,
    -- acknowledged delivery and net damage items must still match.
    SELECT COALESCE(jsonb_agg(item ORDER BY item),'[]'::jsonb) INTO expected FROM (
      SELECT jsonb_build_object('noticeType',n.notice_type,'sentOn',n.sent_on,'deliveredOn',n.delivered_on,
        'confirmed',n.delivery_confirmed,'proofDocumentId',n.proof_document_id,'graceDays',n.grace_period_days,
        'methodLabel',CASE n.delivery_method WHEN 'registered_mail' THEN 'البريد المسجل' WHEN 'email' THEN 'البريد الإلكتروني'
          WHEN 'national_address' THEN 'العنوان الوطني' WHEN 'courier' THEN 'مخلص' WHEN 'whatsapp' THEN 'واتساب' ELSE 'وسيلة مثبتة' END) item
      FROM public.legal_case_formal_notices n WHERE n.company_id=p_company_id AND n.contract_id=p_contract_id
    ) notices;
    SELECT COALESCE(jsonb_agg(item ORDER BY item),'[]'::jsonb) INTO actual FROM jsonb_array_elements(COALESCE(memo->'formalNotices','[]'::jsonb)) item;
    IF actual IS DISTINCT FROM expected THEN missing:=array_append(missing,'memoSnapshot.notices_changed'); END IF;
    SELECT COALESCE(jsonb_agg(item ORDER BY item),'[]'::jsonb) INTO expected FROM (
      SELECT jsonb_build_object('type',d.cost_type,'description',d.description,'amount',greatest(0,COALESCE(d.amount,0)-COALESCE(d.depreciation_deduction,0)-COALESCE(d.insurance_recovery,0))) item
      FROM public.legal_case_damage_costs d WHERE d.company_id=p_company_id AND d.contract_id=p_contract_id AND d.verified AND d.evidence_document_id IS NOT NULL
    ) damages;
    SELECT COALESCE(jsonb_agg(item ORDER BY item),'[]'::jsonb) INTO actual FROM jsonb_array_elements(COALESCE(memo->'damageCostItems','[]'::jsonb)) item;
    IF actual IS DISTINCT FROM expected THEN missing:=array_append(missing,'memoSnapshot.damage_details_changed'); END IF;
  END IF;
  FOR evidence IN
    SELECT NULLIF(profile->>field,'')::uuid id FROM unnest(ARRAY[
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo#>>'{handoverInfo,documented}'='true' THEN 'delivery_handover_document_id' END,
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo->>'returnDocumented'='true' THEN 'vehicle_return_document_id' END,
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo->'terminationInfo' IS NOT NULL THEN 'termination_supporting_document_id' END,
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo->'contractualCompensation' IS NOT NULL THEN 'contractual_compensation_document_id' END,
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo->'retentionRate' IS NOT NULL THEN 'retention_rate_source_document_id' END,
      CASE WHEN NOT COALESCE(traffic_only,false) AND memo->'noticeException' IS NOT NULL THEN 'notice_exception_document_id' END,
      CASE WHEN COALESCE(profile->>'defendant_contact_source','customer_record')<>'customer_record' THEN 'defendant_contact_document_id' END
    ]) field WHERE field IS NOT NULL
    UNION ALL SELECT n.proof_document_id FROM public.legal_case_formal_notices n
      WHERE n.company_id=p_company_id AND n.contract_id=p_contract_id AND n.delivery_confirmed AND NOT COALESCE(traffic_only,false)
    UNION ALL SELECT d.evidence_document_id FROM public.legal_case_damage_costs d
      WHERE d.company_id=p_company_id AND d.contract_id=p_contract_id AND d.verified AND d.evidence_document_id IS NOT NULL AND NOT COALESCE(traffic_only,false)
    UNION ALL SELECT NULLIF(d->>'sourceDocumentId','')::uuid FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_package->'documents')='array' THEN p_package->'documents' ELSE '[]'::jsonb END) d
      WHERE d->>'key'='violationsEvidence' AND NULLIF(d->>'sourceDocumentId','') IS NOT NULL
  LOOP
    IF evidence.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.contract_documents d
      WHERE d.id=evidence.id AND d.company_id=p_company_id AND d.contract_id=p_contract_id
        AND COALESCE(d.legal_evidence_state,'active')='active' AND d.superseded_by_document_id IS NULL AND NULLIF(btrim(d.file_path),'') IS NOT NULL) THEN
      missing:=array_append(missing,'memoSnapshot.evidence_unavailable'); EXIT;
    END IF;
  END LOOP;
  RETURN missing;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow OR invalid_parameter_value THEN
  RETURN ARRAY['memoSnapshot.invalid_details'];
END;
$fn$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.validate_snapshot_facts(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
DO $install$
DECLARE definition text; marker text:='  RETURN jsonb_build_object(';
BEGIN
  definition:=pg_get_functiondef('public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)'::regprocedure);
  IF (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 THEN RAISE EXCEPTION 'Unexpected validator return layout'; END IF;
  EXECUTE replace(definition,marker,E'  v_missing := v_missing || legal_memo_calc_private.validate_snapshot_facts(p_company_id,p_contract_id,p_payload);\n\n'||marker);
END;
$install$;
-- A quarantined/superseded traffic report is not proof for the canonical
-- amount either. Preserve raw obligations; exclude unsupported traffic from
-- the claim until a current official report is attached.
DO $proof$
DECLARE definition text; marker text:='AND nullif(btrim(d.file_path),'''') IS NOT NULL) AS ready';
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure)
    IS DISTINCT FROM '89991407ca0cd6292e5481c535a6b2e1' THEN RAISE EXCEPTION 'Traffic reader changed since evidence audit'; END IF;
  definition:=pg_get_functiondef('legal_memo_calc_private.read_traffic(uuid,uuid,date)'::regprocedure);
  EXECUTE replace(definition,'legal_memo_calc_private.read_traffic(', 'legal_memo_calc_private.before_active_traffic_evidence(');
  IF strpos(definition,marker)=0 THEN RAISE EXCEPTION 'Traffic evidence marker missing'; END IF;
  EXECUTE replace(definition,marker,'AND COALESCE(d.legal_evidence_state,''active'')=''active'' AND d.superseded_by_document_id IS NULL '||marker);
END;
$proof$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_active_traffic_evidence(uuid,uuid,date) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
