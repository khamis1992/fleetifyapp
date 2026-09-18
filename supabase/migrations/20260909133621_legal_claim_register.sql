BEGIN;

CREATE TABLE public.legal_case_claim_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  case_id uuid REFERENCES public.legal_cases(id),
  kind text NOT NULL CHECK (kind IN ('rental_opportunity','reputation_material','reputation_reserve','independent_damage')),
  disposition text NOT NULL DEFAULT 'alternative' CHECK (disposition IN ('primary','alternative','subsidiary')),
  description text NOT NULL DEFAULT '',
  period_from date, period_to date,
  requested_amount numeric(14,2) CHECK (requested_amount>=0),
  avoided_costs numeric(14,2) NOT NULL DEFAULT 0 CHECK (avoided_costs>=0),
  third_party_recovery numeric(14,2) NOT NULL DEFAULT 0 CHECK (third_party_recovery>=0),
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  calculation_basis text NOT NULL DEFAULT '',
  causation_notes text NOT NULL DEFAULT '',
  alternative_to text,
  independence_notes text NOT NULL DEFAULT '',
  opportunity_reference text NOT NULL DEFAULT '',
  opportunity_requested_on date,
  opportunity_probability text NOT NULL DEFAULT '',
  alternative_unavailable_reason text NOT NULL DEFAULT '',
  overlap_group text NOT NULL DEFAULT '',
  recovery_reference text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','reviewed','excluded')),
  exclusion_reason text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_to IS NULL OR period_from IS NULL OR period_to>=period_from),
  CHECK (requested_amount IS NULL OR avoided_costs+third_party_recovery<=requested_amount),
  CHECK (kind<>'reputation_reserve' OR disposition='subsidiary'),
  CHECK (review_status<>'excluded' OR length(btrim(exclusion_reason))>0)
);
CREATE INDEX legal_claim_items_contract ON public.legal_case_claim_items(company_id,contract_id,created_at,id);
CREATE INDEX legal_claim_items_case ON public.legal_case_claim_items(case_id);
CREATE INDEX legal_claim_items_contract_fk ON public.legal_case_claim_items(contract_id);
ALTER TABLE public.legal_case_claim_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_case_claim_items FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.legal_case_claim_items TO authenticated;
GRANT ALL ON public.legal_case_claim_items TO service_role;
CREATE POLICY legal_claim_items_company ON public.legal_case_claim_items FOR ALL TO authenticated
USING (company_id=public.get_user_company_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=legal_case_claim_items.company_id AND p.is_active))
WITH CHECK (company_id=public.get_user_company_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=legal_case_claim_items.company_id AND p.is_active));

ALTER TABLE public.legal_case_litigation_profile
  ADD COLUMN retention_calculation_basis text NOT NULL DEFAULT 'documented_daily' CHECK (retention_calculation_basis IN ('documented_daily','contract_monthly')),
  ADD COLUMN retention_proration_basis text NOT NULL DEFAULT 'calendar_days' CHECK (retention_proration_basis IN ('calendar_days','thirty_days'));

CREATE FUNCTION legal_memo_calc_private.guard_claim_item() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE evidence uuid;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id,NEW.company_id,NEW.contract_id,NEW.case_id,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM (OLD.id,OLD.company_id,OLD.contract_id,OLD.case_id,OLD.created_by,OLD.created_at) THEN
    RAISE EXCEPTION 'لا يمكن تغيير نطاق أو منشئ بند المطالبة';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=NEW.contract_id AND c.company_id=NEW.company_id)
    OR (NEW.case_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.legal_cases c WHERE c.id=NEW.case_id AND c.company_id=NEW.company_id AND c.contract_id=NEW.contract_id)) THEN
    RAISE EXCEPTION 'بند المطالبة لا ينتمي إلى العقد والشركة';
  END IF;
  FOREACH evidence IN ARRAY NEW.evidence_ids LOOP
    IF NOT EXISTS(SELECT 1 FROM public.contract_documents d WHERE d.id=evidence AND d.company_id=NEW.company_id AND d.contract_id=NEW.contract_id) THEN
      RAISE EXCEPTION 'مستند المطالبة لا ينتمي إلى العقد';
    END IF;
  END LOOP;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.guard_claim_item() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_legal_claim_item BEFORE INSERT OR UPDATE ON public.legal_case_claim_items FOR EACH ROW EXECUTE FUNCTION legal_memo_calc_private.guard_claim_item();
CREATE TRIGGER invalidate_legal_claim_item AFTER INSERT OR UPDATE ON public.legal_case_claim_items FOR EACH ROW EXECUTE FUNCTION public.invalidate_legal_memo_approval();

CREATE TABLE public.legal_case_claim_item_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  claim_item_id uuid NOT NULL REFERENCES public.legal_case_claim_items(id),
  changed_by uuid, changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  before_value jsonb, after_value jsonb NOT NULL
);
CREATE INDEX legal_claim_revisions_item ON public.legal_case_claim_item_revisions(company_id,claim_item_id,changed_at);
CREATE INDEX legal_claim_revisions_item_fk ON public.legal_case_claim_item_revisions(claim_item_id);
ALTER TABLE public.legal_case_claim_item_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_case_claim_item_revisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.legal_case_claim_item_revisions TO authenticated;
CREATE POLICY legal_claim_revisions_company ON public.legal_case_claim_item_revisions FOR SELECT TO authenticated
USING (company_id=public.get_user_company_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.company_id=legal_case_claim_item_revisions.company_id AND p.is_active));
CREATE FUNCTION legal_memo_calc_private.audit_claim_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM legal_memo_calc_private.authorize_company(NEW.company_id);
 INSERT INTO public.legal_case_claim_item_revisions(company_id,claim_item_id,changed_by,before_value,after_value)
 VALUES(NEW.company_id,NEW.id,auth.uid(),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.audit_claim_item() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_legal_claim_item AFTER INSERT OR UPDATE ON public.legal_case_claim_items FOR EACH ROW EXECUTE FUNCTION legal_memo_calc_private.audit_claim_item();

-- Private functions below are only entered through the existing authorized gateway.
CREATE FUNCTION legal_memo_calc_private.claim_register(p_company uuid,p_contract uuid,p_date date,p_statement jsonb)
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
    ('damages','الأضرار والمصاريف المثبتة','صافي البنود القديمة بعد الاستهلاك والتأمين'),
    ('security_deposit_deduction','خصم الوديعة','يخصم مرة واحدة من الإجمالي')
  ) b(key,title,basis) LOOP
    amount:=coalesce((c->>base_row.key)::numeric,0);
    IF base_row.key='security_deposit_deduction' THEN amount:=-amount; END IF;
    rows:=rows||jsonb_build_array(jsonb_build_object('key',base_row.key,'kind',base_row.key,'label',base_row.title,'description','','basis',base_row.basis,
      'disposition','primary','status',CASE WHEN base_row.key='retention' AND cardinality(retention_issues)>0 THEN 'incomplete' WHEN amount=0 THEN 'excluded' ELSE 'ready' END,'amount',amount,
      'period_from',CASE base_row.key WHEN 'rent_due' THEN from_date WHEN 'legal_extension_rent' THEN (result->>'extension_start_date')::date WHEN 'retention' THEN (details->>'retention_start_date')::date END,
      'period_to',CASE base_row.key WHEN 'rent_due' THEN to_date WHEN 'legal_extension_rent' THEN (result->>'cutoff_date')::date WHEN 'retention' THEN (details->>'retention_end_date')::date END,
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
  c:=jsonb_set(c,'{damages}',to_jsonb(coalesce((c->>'damages')::numeric,0)+extra));
  SELECT greatest(0,sum(CASE WHEN key='security_deposit_deduction' THEN -value::numeric ELSE value::numeric END)) INTO total FROM jsonb_each_text(c);
  RETURN result||jsonb_build_object('components',c,'total',round(total,2),'calculation_details',details,'claim_register',jsonb_build_object(
    'version','claim_register_v1','as_of_date',p_date,'rows',rows,'primary_total',round(total,2),'additional_primary',extra,'issues',to_jsonb(issues),
    'retention_basis',profile.retention_calculation_basis,'retention_monthly_rate',rate,'retention_proration',profile.retention_proration_basis));
END $$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.claim_register(uuid,uuid,date,jsonb) FROM PUBLIC,anon,authenticated;

-- Integration changes and reversible backups are appended below after hash verification.

DO $$ BEGIN IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[])'::regprocedure) IS DISTINCT FROM '64f75fbbc42bf31bcf6ae54a2d2524f8' THEN RAISE EXCEPTION 'read_statement changed since inspection'; END IF; END $$;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.before_claim_register_read_statement(p_company_id uuid, p_contract_id uuid, p_as_of_date date, p_claim_scope text, p_excluded_invoice_ids uuid[])
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
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_claim_register_read_statement(uuid,uuid,date,text,uuid[]) FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.validate_snapshot_statement(uuid,uuid,jsonb,jsonb)'::regprocedure) IS DISTINCT FROM 'd7d849ff0ff802139def07de74685c7b' THEN RAISE EXCEPTION 'validate_snapshot_statement changed since inspection'; END IF; END $$;
CREATE OR REPLACE FUNCTION legal_memo_calc_private.before_claim_register_validate_snapshot_statement(p_company_id uuid, p_contract_id uuid, p_package jsonb, p_statement jsonb)
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
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_claim_register_validate_snapshot_statement(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION legal_memo_calc_private.read_statement(p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_claim_scope text,p_excluded_invoice_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb;
BEGIN
 PERFORM legal_memo_calc_private.authorize_company(p_company_id);
 s:=legal_memo_calc_private.before_claim_register_read_statement(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
 RETURN legal_memo_calc_private.claim_register(p_company_id,p_contract_id,p_as_of_date,s);
END $$;
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
      OR (profile.retention_calculation_basis<>'contract_monthly' AND (memo#>>'{retentionRate,daily}')::numeric IS DISTINCT FROM profile.retention_daily_rate)
      OR memo#>>'{retentionRate,sourceRef}' IS DISTINCT FROM profile.retention_rate_source_ref
      OR profile.retention_rate_source_document_id IS NULL THEN
      missing:=array_append(missing,'memoSnapshot.retention_details_changed');
    END IF;
  END IF;
  IF memo->'claimRegister' IS DISTINCT FROM p_statement->'claim_register' THEN
    missing:=array_append(missing,'memoSnapshot.claim_register_changed');
  END IF;
  IF jsonb_array_length(coalesce(p_statement#>'{claim_register,issues}','[]'::jsonb))>0 THEN
    missing:=array_append(missing,'memoSnapshot.claim_register_incomplete');
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(p_statement#>'{claim_register,rows}','[]')) r
    CROSS JOIN LATERAL jsonb_array_elements_text(r->'evidence_ids') eid
    WHERE r->>'status'='ready' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(p_package->'documents','[]')) d
      WHERE d->>'sourceDocumentId'=eid AND d->>'ready'='true' AND nullif(d->>'url','') IS NOT NULL)) THEN
    missing:=array_append(missing,'documents.claim_evidence_missing');
  END IF;
  RETURN missing;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
  RETURN ARRAY['memoSnapshot.invalid_details'];
END;
$function$
;
DO $$ BEGIN IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='legal_memo_calc_private.readiness_financials(uuid,uuid,date)'::regprocedure) IS DISTINCT FROM 'eab4cd2db7da25ce5d866d6f3ebf6e06' THEN RAISE EXCEPTION 'readiness_financials changed since inspection'; END IF; END $$;
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
  IF jsonb_array_length(coalesce(statement#>'{claim_register,issues}','[]'))>0 THEN
    rent_review:=true; rent_reasons:=statement#>'{claim_register,issues}';
  END IF;
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
