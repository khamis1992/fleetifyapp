-- Fixed requested compensation, not an invoice, payment or adjudicated award.
DO $guard$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.claim_register(uuid,uuid,date,jsonb)'::regprocedure) IS DISTINCT FROM '94bcc8560b7ced39e4a1fb9e9e7d40b3' THEN RAISE EXCEPTION 'Claim register changed; review the migration before applying'; END IF;
END $guard$;
-- Opt-in only: installing this feature does not add a request to any case.
ALTER TABLE public.legal_case_litigation_profile
  ADD COLUMN fixed_compensation_requested boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.legal_case_litigation_profile.fixed_compensation_requested IS
  'Explicit request for QAR 10000 fixed compensation in this case; not an accounting receivable.';
CREATE OR REPLACE FUNCTION legal_memo_calc_private.claim_register(p_company uuid,p_contract uuid,p_date date,p_statement jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE
  result jsonb:=p_statement; c jsonb:=p_statement->'components';
  profile public.legal_case_litigation_profile%ROWTYPE;
  item public.legal_case_claim_items%ROWTYPE;
  rows jsonb:='[]'; issues text[]:='{}'; row_issues text[]; label text; kind text;
  amount numeric; extra numeric:=0; total numeric; rate numeric; retention numeric:=0;
  from_date date; to_date date; day date; denominator numeric; details jsonb:=p_statement->'calculation_details';
  traffic_only boolean:=p_statement->>'claim_scope'='traffic_violations_only'; closed boolean;
  source_ready boolean; period_label text; gross numeric:=0; paid numeric:=0; base_row record;
  current_case uuid := (p_statement->>'case_id')::uuid;
  month_start date; month_end date; selected_retention boolean; retention_issues text[]:='{}';
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company);
  SELECT * INTO profile FROM public.legal_case_litigation_profile WHERE company_id=p_company AND contract_id=p_contract;
  SELECT EXISTS(SELECT 1 FROM contract_finance_private.no_claim_closures n WHERE n.company_id=p_company AND n.contract_id=p_contract) INTO closed;
  -- Retain historic retention after documented return. Never infer custody from fleet status.
  from_date:=(details->>'retention_start_date')::date;
  to_date:=least(p_date,coalesce(profile.vehicle_returned_at,p_date),coalesce((p_statement->>'initial_judgment_date')::date,p_date));
  source_ready:=EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=profile.retention_rate_source_document_id AND d.company_id=p_company AND d.contract_id=p_contract
    AND coalesce(d.legal_evidence_state,'active')='active' AND d.superseded_by_document_id IS NULL AND nullif(btrim(d.file_path),'') IS NOT NULL);
  selected_retention:=profile.retention_calculation_basis='contract_monthly' OR coalesce(profile.retention_daily_rate,0)>0;
  IF selected_retention AND NOT traffic_only AND NOT closed THEN
    c:=jsonb_set(c,'{retention}','0');
    IF NOT source_ready OR nullif(btrim(profile.retention_rate_source_ref),'') IS NULL THEN retention_issues:=array_append(retention_issues,'أكمل مصدر تقدير الاحتباس ومستنده النشط'); END IF;
    IF from_date IS NULL THEN retention_issues:=array_append(retention_issues,'حدد تاريخ زوال سند الحيازة قبل تصفية الاحتباس'); END IF;
    IF profile.vehicle_custody NOT IN ('with_defendant','returned','recovered_by_company') OR profile.vehicle_custody IS NULL THEN retention_issues:=array_append(retention_issues,'حالة الحيازة لا تثبت فترة الاحتباس'); END IF;
    IF profile.vehicle_custody IN ('returned','recovered_by_company') AND (profile.vehicle_returned_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=profile.vehicle_return_document_id AND d.company_id=p_company AND d.contract_id=p_contract AND coalesce(d.legal_evidence_state,'active')='active' AND d.superseded_by_document_id IS NULL AND nullif(btrim(d.file_path),'') IS NOT NULL)) THEN retention_issues:=array_append(retention_issues,'أكمل تاريخ الرد ومحضر الرد النشط'); END IF;
  END IF;
  IF NOT traffic_only AND NOT closed AND from_date IS NOT NULL AND to_date>=from_date
    AND source_ready AND nullif(btrim(profile.retention_rate_source_ref),'') IS NOT NULL
    AND (profile.vehicle_custody='with_defendant' OR (profile.vehicle_custody IN ('returned','recovered_by_company') AND profile.vehicle_returned_at IS NOT NULL
      AND EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=profile.vehicle_return_document_id AND d.company_id=p_company AND d.contract_id=p_contract
        AND coalesce(d.legal_evidence_state,'active')='active' AND d.superseded_by_document_id IS NULL AND nullif(btrim(d.file_path),'') IS NOT NULL))) THEN
    IF profile.retention_calculation_basis='contract_monthly' THEN
      SELECT monthly_amount INTO rate FROM public.contracts WHERE id=p_contract AND company_id=p_company;
      IF rate>0 AND EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=profile.retention_rate_source_document_id AND d.document_type='signed_contract' AND d.legal_identity_match_status='matched') THEN
        FOR month_start IN SELECT generate_series(date_trunc('month',from_date),date_trunc('month',to_date),interval '1 month')::date LOOP
          month_end:=(month_start+interval '1 month - 1 day')::date;
          denominator:=CASE WHEN profile.retention_proration_basis='thirty_days' THEN 30 ELSE month_end-month_start+1 END;
          retention:=retention+rate*CASE WHEN from_date<=month_start AND to_date>=month_end THEN 1 ELSE least(1,(least(to_date,month_end)-greatest(from_date,month_start)+1)/denominator) END;
        END LOOP;
      ELSE retention_issues:=array_append(retention_issues,'يلزم عقد موقع وأجرة شهرية صحيحة'); END IF;
    ELSE retention:=(to_date-from_date+1)*greatest(coalesce(profile.retention_daily_rate,0),0); END IF;
    IF retention>0 AND (EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(result->'included_invoices','[]')) r
      WHERE (r->>'service_period_start')::date<=to_date AND (r->>'service_period_end')::date>=from_date)
      OR (coalesce((c->>'legal_extension_rent')::numeric,0)>0 AND (result->>'extension_start_date')::date<=to_date AND (result->>'cutoff_date')::date>=from_date)) THEN
      retention_issues:=array_append(retention_issues,'تتداخل فترة الاحتباس مع أجرة مدرجة؛ راجع حدود الفترتين'); retention:=0;
    END IF;
    c:=jsonb_set(c,'{retention}',to_jsonb(round(retention,2)));
    details:=details||jsonb_build_object('retention_start_date',from_date,'retention_end_date',to_date,
      'retention_calculation_basis',profile.retention_calculation_basis,'retention_monthly_rate',rate,'retention_proration_basis',profile.retention_proration_basis);
  END IF;
  issues:=issues||retention_issues;
  IF closed THEN c:=jsonb_build_object('rent_due',0,'legal_extension_rent',0,'contractual_compensation',0,'damages',0,'traffic_violations',0,'retention',0,'security_deposit_deduction',0); END IF;
  SELECT coalesce(sum((r->>'total_amount')::numeric),0),coalesce(sum((r->>'paid_amount')::numeric),0),min((r->>'service_period_start')::date),max((r->>'service_period_end')::date)
    INTO gross,paid,from_date,to_date FROM jsonb_array_elements(coalesce(result->'included_invoices','[]')) r;
  FOR base_row IN SELECT * FROM (VALUES
    ('rent_due','صافي الأجرة المفوترة','إجمالي الأجرة '||gross||' − المسدد '||paid),
    ('legal_extension_rent','الأجرة المستجدة عن مدة غير مفوترة','وفق مدة الخدمة غير المغطاة بالفواتير'),
    ('traffic_violations','المخالفات المرورية','الكشف الرسمي بعد تنزيل السداد المحتسب'),
    ('contractual_compensation','التعويض الاتفاقي','البند الموثق وخاضع للمراجعة القضائية'),
    ('retention','تعويض الاحتباس والحرمان من الانتفاع',CASE WHEN profile.retention_calculation_basis='contract_monthly' THEN 'الأجرة الشهرية للعقد '||coalesce(rate,0)||'؛ جزء الشهر: '||CASE WHEN profile.retention_proration_basis='thirty_days' THEN '30 يوماً وفق الأساس المعتمد' ELSE 'أيام الشهر الفعلية' END ELSE 'السعر اليومي الموثق '||coalesce(profile.retention_daily_rate,0) END),
    ('damages','الأضرار والمصاريف المثبتة','صافي الأضرار والمصاريف المثبتة بعد الاستهلاك والتأمين'),
    ('security_deposit_deduction','خصم الوديعة','يخصم مرة واحدة من الإجمالي')
  ) b(key,title,basis) LOOP
    amount:=coalesce((c->>base_row.key)::numeric,0);
    IF base_row.key='security_deposit_deduction' THEN amount:=-amount; END IF;
    rows:=rows||jsonb_build_array(jsonb_build_object('key',base_row.key,'kind',base_row.key,'label',base_row.title,'description','','basis',base_row.basis,
      'disposition','primary','status',CASE WHEN base_row.key='retention' AND cardinality(retention_issues)>0 THEN 'incomplete' WHEN amount=0 THEN 'excluded' ELSE 'ready' END,'amount',amount,
      'gross_amount',CASE WHEN base_row.key='rent_due' AND NOT closed THEN gross END,
      'deductions',CASE WHEN base_row.key='rent_due' AND NOT closed THEN paid END,
      'period_from',CASE WHEN amount<>0 THEN CASE base_row.key WHEN 'rent_due' THEN from_date WHEN 'legal_extension_rent' THEN (result->>'extension_start_date')::date WHEN 'retention' THEN (details->>'retention_start_date')::date END END,
      'period_to',CASE WHEN amount<>0 THEN CASE base_row.key WHEN 'rent_due' THEN to_date WHEN 'legal_extension_rent' THEN (result->>'cutoff_date')::date WHEN 'retention' THEN (details->>'retention_end_date')::date END END,
      'evidence_ids','[]'::jsonb,'issues',CASE WHEN base_row.key='retention' THEN to_jsonb(retention_issues) ELSE '[]'::jsonb END));
  END LOOP;
  FOR item IN SELECT * FROM public.legal_case_claim_items WHERE company_id=p_company AND contract_id=p_contract AND case_id IS NOT DISTINCT FROM current_case ORDER BY created_at,id LOOP
    row_issues:='{}';
    label:=CASE item.kind WHEN 'rental_opportunity' THEN 'فرصة تأجير محددة' WHEN 'reputation_material' THEN 'الأثر المادي للمساس بالسمعة التجارية' WHEN 'reputation_reserve' THEN 'طلب احتياطي بشأن الاعتبار التجاري' ELSE 'ضرر مادي مستقل' END;
    IF item.review_status<>'excluded' AND NOT traffic_only THEN
      IF closed THEN row_issues:=array_append(row_issues,'العقد مقفل بلا مطالبات؛ لا تضاف التزامات'); END IF;
      IF item.review_status<>'reviewed' THEN row_issues:=array_append(row_issues,'يحتاج مراجعة واعتماد بيانات البند'); END IF;
      IF item.requested_amount IS NULL OR item.requested_amount<=0 THEN row_issues:=array_append(row_issues,'حدد المبلغ المطلوب'); END IF;
      IF nullif(btrim(item.description),'') IS NULL OR nullif(btrim(item.calculation_basis),'') IS NULL OR nullif(btrim(item.causation_notes),'') IS NULL THEN row_issues:=array_append(row_issues,'أكمل الوقائع وأساس الحساب وعلاقة الضرر بالإخلال'); END IF;
      IF item.period_from IS NULL OR item.period_to IS NULL OR item.period_to>p_date THEN row_issues:=array_append(row_issues,'حدد فترة الضرر المنتهية حتى تاريخ التصفية'); END IF;
      IF cardinality(item.evidence_ids)=0 OR EXISTS(SELECT 1 FROM unnest(item.evidence_ids) eid WHERE NOT EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=eid AND d.company_id=p_company AND d.contract_id=p_contract
        AND coalesce(d.legal_evidence_state,'active')='active' AND d.superseded_by_document_id IS NULL AND nullif(btrim(d.file_path),'') IS NOT NULL)) THEN row_issues:=array_append(row_issues,'أرفق أدلة نشطة مرتبطة بالعقد'); END IF;
      IF item.kind='rental_opportunity' AND nullif(btrim(item.opportunity_reference),'') IS NULL THEN row_issues:=array_append(row_issues,'حدد طالب التأجير أو مرجع الحجز المؤيد'); END IF;
      IF item.kind='rental_opportunity' AND (item.opportunity_requested_on IS NULL OR item.opportunity_requested_on>item.period_from OR nullif(btrim(item.opportunity_probability),'') IS NULL OR nullif(btrim(item.alternative_unavailable_reason),'') IS NULL) THEN row_issues:=array_append(row_issues,'أكمل تاريخ طلب التأجير وجديته وسبب تعذر توفير بديل'); END IF;
      IF nullif(btrim(item.overlap_group),'') IS NULL THEN row_issues:=array_append(row_issues,'حدد المنفعة أو الضرر لمراجعة التداخل'); END IF;
      IF item.third_party_recovery>0 AND nullif(btrim(item.recovery_reference),'') IS NULL THEN row_issues:=array_append(row_issues,'أكمل مرجع مبلغ التأمين أو الغير للتأكد من خصمه مرة واحدة'); END IF;
      IF item.disposition='primary' AND nullif(btrim(item.independence_notes),'') IS NULL THEN row_issues:=array_append(row_issues,'بين الضرر المستقل غير المجبر ببقية الطلبات'); END IF;
      IF item.disposition IN ('alternative','subsidiary') AND (nullif(btrim(item.alternative_to),'') IS NULL OR (NOT EXISTS(SELECT 1 FROM jsonb_array_elements(rows) r WHERE r->>'key'=item.alternative_to AND r->>'disposition'='primary') AND NOT EXISTS(SELECT 1 FROM public.legal_case_claim_items parent WHERE parent.id::text=item.alternative_to AND parent.id<>item.id AND parent.company_id=p_company AND parent.contract_id=p_contract AND parent.case_id IS NOT DISTINCT FROM current_case AND parent.disposition='primary' AND parent.review_status='reviewed'))) THEN row_issues:=array_append(row_issues,'اربط الطلب بالطلب الأصلي الذي يحل محله'); END IF;
      IF EXISTS(SELECT 1 FROM public.legal_case_damage_costs d WHERE d.company_id=p_company AND d.contract_id=p_contract AND d.verified AND d.evidence_document_id=ANY(item.evidence_ids)) THEN
        row_issues:=array_append(row_issues,'المستند مستخدم في بند أضرار قائم؛ راجع التكرار قبل الإدراج');
      END IF;
      IF EXISTS(SELECT 1 FROM public.legal_case_claim_items other WHERE other.company_id=p_company AND other.contract_id=p_contract AND other.id<>item.id
        AND other.case_id IS NOT DISTINCT FROM current_case AND other.review_status<>'excluded' AND other.evidence_ids&&item.evidence_ids
        AND (other.kind=item.kind OR (other.disposition='primary' AND item.disposition='primary'))
        AND daterange(other.period_from,other.period_to,'[]')&&daterange(item.period_from,item.period_to,'[]')) THEN
        row_issues:=array_append(row_issues,'يوجد طلب آخر من النوع نفسه بنفس الدليل والفترة');
      END IF;
      IF item.disposition='primary' AND EXISTS(SELECT 1 FROM public.legal_case_claim_items other WHERE other.company_id=p_company AND other.contract_id=p_contract AND other.case_id IS NOT DISTINCT FROM current_case AND other.id<>item.id AND other.review_status<>'excluded' AND other.disposition='primary'
        AND ((nullif(btrim(item.overlap_group),'') IS NOT NULL AND lower(btrim(other.overlap_group))=lower(btrim(item.overlap_group)) AND daterange(other.period_from,other.period_to,'[]')&&daterange(item.period_from,item.period_to,'[]')) OR (item.third_party_recovery>0 AND other.third_party_recovery>0 AND nullif(btrim(item.recovery_reference),'') IS NOT NULL AND lower(btrim(item.recovery_reference))=lower(btrim(other.recovery_reference))))) THEN row_issues:=array_append(row_issues,'تكررت المنفعة أو مرجع التعويض من الغير في طلب أصلي آخر؛ افصل البنود أو صنف المتداخل بديلاً'); END IF;
    END IF;
    amount:=CASE WHEN item.requested_amount IS NULL THEN NULL ELSE round(item.requested_amount-item.avoided_costs-item.third_party_recovery,2) END;
    IF item.review_status<>'excluded' AND NOT traffic_only AND cardinality(row_issues)=0 AND item.disposition='primary' THEN extra:=extra+coalesce(amount,0); END IF;
    IF item.review_status<>'excluded' AND NOT traffic_only THEN issues:=issues||ARRAY(SELECT label||': '||message FROM unnest(row_issues) message); END IF;
    rows:=rows||jsonb_build_array(jsonb_build_object('key',item.id,'kind',item.kind,'label',label,'description',item.description,'disposition',item.disposition,
      'status',CASE WHEN item.review_status='excluded' OR traffic_only THEN 'excluded' WHEN cardinality(row_issues)>0 THEN 'incomplete' ELSE 'ready' END,
      'amount',amount,'gross_amount',item.requested_amount,'deductions',item.avoided_costs+item.third_party_recovery,'period_from',item.period_from,'period_to',item.period_to,
      'basis',item.calculation_basis||'؛ '||item.causation_notes||'؛ المنفعة/الضرر: '||item.overlap_group||CASE WHEN item.third_party_recovery>0 THEN '؛ مرجع الجبر: '||item.recovery_reference ELSE '' END||CASE WHEN item.disposition='primary' THEN '؛ '||item.independence_notes ELSE '' END||CASE WHEN item.kind='rental_opportunity' THEN '؛ '||item.opportunity_reference||'؛ تاريخ طلب التأجير: '||coalesce(item.opportunity_requested_on::text,'غير محدد')||'؛ الجدية: '||item.opportunity_probability||'؛ تعذر البديل: '||item.alternative_unavailable_reason ELSE '' END,
      'evidence_ids',to_jsonb(item.evidence_ids),'alternative_to',item.alternative_to,'issues',to_jsonb(row_issues),'custom',true));
  END LOOP;
  -- A requested lump sum, separate from proven costs and time-based retention.
  -- Derive it on read so all consumers and frozen-snapshot checks use one amount.
  IF coalesce(profile.fixed_compensation_requested,false)
    AND profile.case_id IS NOT DISTINCT FROM current_case
    AND NOT traffic_only AND NOT closed AND EXISTS(
    SELECT 1 FROM jsonb_array_elements(rows) r
    WHERE r->>'disposition'='primary' AND r->>'status'='ready'
      AND coalesce((r->>'amount')::numeric,0)>0
  ) THEN
    amount:=10000;
    extra:=extra+amount;
    rows:=rows||jsonb_build_array(jsonb_build_object(
      'key','fixed_general_compensation','kind','fixed_general_compensation',
      'label','تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع',
      'description','طلب تعويض إجمالي بمبلغ ثابت، خاضع لتقدير المحكمة، مع عدم تكرار جبر الضرر ذاته.',
      'basis','مبلغ ثابت مطلوب قدره 10,000 ريال قطري، خاضع لتقدير المحكمة',
      'disposition','primary','status','ready','amount',amount,
      'gross_amount',amount,'deductions',0,'period_from',null,'period_to',null,
      'evidence_ids','[]'::jsonb,'issues','[]'::jsonb,'custom',true));
  END IF;
  c:=jsonb_set(c,'{damages}',to_jsonb(coalesce((c->>'damages')::numeric,0)+extra));
  SELECT greatest(0,sum(CASE WHEN key='security_deposit_deduction' THEN -value::numeric ELSE value::numeric END)) INTO total FROM jsonb_each_text(c);
  RETURN result||jsonb_build_object('components',c,'total',round(total,2),'calculation_details',details,'claim_register',jsonb_build_object(
    'version','claim_register_v1','as_of_date',p_date,'rows',rows,'primary_total',round(total,2),'additional_primary',extra,'issues',to_jsonb(issues),
    'retention_basis',profile.retention_calculation_basis,'retention_monthly_rate',rate,'retention_proration',profile.retention_proration_basis));
END $$;
