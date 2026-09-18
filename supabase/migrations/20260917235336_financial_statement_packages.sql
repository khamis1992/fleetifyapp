-- Full individual-entity reporting packages. No accounting entries or company data are changed.
-- Depends on 20260918001000_professional_balance_sheets.sql. Schema verified 2026-09-18.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA financial_statement_private;
REVOKE ALL ON SCHEMA financial_statement_private FROM PUBLIC,anon,service_role;
GRANT USAGE ON SCHEMA financial_statement_private TO authenticated;

CREATE TABLE public.professional_financial_statement_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
  payload jsonb NOT NULL, source_fingerprint text NOT NULL CHECK(source_fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','voided')),
  created_by uuid NOT NULL,created_by_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,approved_by_name text,approved_at timestamptz,review_notes text,confirmations jsonb,
  voided_by uuid,voided_at timestamptz,void_reason text,
  CHECK(status<>'approved' OR (approved_by IS NOT NULL AND approved_by<>created_by AND approved_at IS NOT NULL
    AND approved_by_name IS NOT NULL AND review_notes IS NOT NULL AND length(btrim(review_notes))>=20
    AND confirmations IS NOT NULL AND confirmations @> '{"classifications":true,"policies":true,"reconciliations":true,"disclosures":true,"periodCutoff":true}')),
  CHECK(status<>'voided' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason))>=10))
);
CREATE INDEX professional_financial_statement_packages_company_created ON public.professional_financial_statement_packages(company_id,created_at DESC,id);
ALTER TABLE public.professional_financial_statement_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_financial_statement_packages FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.professional_financial_statement_packages TO authenticated;
CREATE POLICY financial_statement_packages_read ON public.professional_financial_statement_packages FOR SELECT TO authenticated
  USING(balance_sheet_private.has_access(company_id,'view'));
CREATE TRIGGER financial_statement_packages_immutable BEFORE UPDATE OR DELETE ON public.professional_financial_statement_packages
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.protect_report();
CREATE TABLE financial_statement_private.report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_id uuid NOT NULL REFERENCES public.professional_financial_statement_packages(id),
  company_id uuid NOT NULL,action text NOT NULL CHECK(action IN ('created','approved','voided')),actor_id uuid NOT NULL,
  reason text,source_fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE financial_statement_private.report_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON financial_statement_private.report_events FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER financial_statement_events_immutable BEFORE UPDATE OR DELETE ON financial_statement_private.report_events
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.protect_event();

-- Presentation taxonomy is explicit and separate from the chart's posting rules.
CREATE FUNCTION financial_statement_private.catalog()
RETURNS TABLE(key text,category text,label_ar text,label_en text,note_code text)
LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 VALUES
 ('cash','asset','النقد وما في حكمه','Cash and cash equivalents','assets'),
 ('receivables','asset','الذمم المدينة','Receivables','receivables'),
 ('inventories','asset','المخزون','Inventories','assets'),
 ('current_tax_assets','asset','أصول ضريبية متداولة','Current tax assets','assets'),
 ('other_current_assets','asset','أصول متداولة أخرى','Other current assets','assets'),
 ('property_equipment','asset','الممتلكات والمعدات','Property and equipment','assets'),
 ('right_of_use_assets','asset','أصول حق الاستخدام','Right-of-use assets','assets'),
 ('intangibles','asset','الأصول غير الملموسة','Intangible assets','assets'),
 ('investments','asset','الاستثمارات','Investments','assets'),
 ('investment_property','asset','العقارات الاستثمارية','Investment property','assets'),
 ('deferred_tax_assets','asset','أصول ضريبية مؤجلة','Deferred tax assets','assets'),
 ('other_noncurrent_assets','asset','أصول غير متداولة أخرى','Other non-current assets','assets'),
 ('payables','liability','الذمم الدائنة','Payables','liabilities'),
 ('customer_deposits','liability','تأمينات العملاء','Customer deposits','liabilities'),
 ('current_borrowings','liability','قروض متداولة','Current borrowings','liabilities'),
 ('current_lease_liabilities','liability','التزامات إيجار متداولة','Current lease liabilities','liabilities'),
 ('current_tax_liabilities','liability','التزامات ضريبية متداولة','Current tax liabilities','liabilities'),
 ('current_provisions','liability','مخصصات متداولة','Current provisions','liabilities'),
 ('other_current_liabilities','liability','التزامات متداولة أخرى','Other current liabilities','liabilities'),
 ('noncurrent_borrowings','liability','قروض غير متداولة','Non-current borrowings','liabilities'),
 ('noncurrent_lease_liabilities','liability','التزامات إيجار غير متداولة','Non-current lease liabilities','liabilities'),
 ('employee_benefits','liability','التزامات منافع الموظفين','Employee benefit obligations','liabilities'),
 ('deferred_tax_liabilities','liability','التزامات ضريبية مؤجلة','Deferred tax liabilities','liabilities'),
 ('noncurrent_provisions','liability','مخصصات غير متداولة','Non-current provisions','liabilities'),
 ('other_noncurrent_liabilities','liability','التزامات غير متداولة أخرى','Other non-current liabilities','liabilities'),
 ('share_capital','equity','رأس المال','Share capital','equity'),
 ('statutory_reserve','equity','الاحتياطي القانوني','Statutory reserve','equity'),
 ('retained_earnings','equity','الأرباح المحتجزة','Retained earnings','equity'),
 ('other_reserves','equity','احتياطيات أخرى','Other reserves','equity'),
 ('other_equity','equity','حقوق ملكية أخرى','Other equity','equity'),
 ('rental_revenue','income','إيرادات التأجير','Rental revenue','policies'),
 ('other_revenue','income','إيرادات أخرى','Other revenue','policies'),
 ('cost_of_revenue','income','تكلفة الإيرادات','Cost of revenue','policies'),
 ('staff_costs','income','تكاليف الموظفين','Staff costs','policies'),
 ('depreciation','income','الاستهلاك والإطفاء','Depreciation and amortisation','assets'),
 ('administrative_expenses','income','المصروفات الإدارية','Administrative expenses','policies'),
 ('impairment','income','خسائر انخفاض القيمة','Impairment losses','estimates'),
 ('finance_income','income','إيرادات التمويل','Finance income','policies'),
 ('finance_costs','income','تكاليف التمويل','Finance costs','liabilities'),
 ('other_income','income','دخل آخر','Other income','policies'),
 ('other_expenses','income','مصروفات أخرى','Other expenses','policies'),
 ('income_tax','income','ضريبة الدخل','Income tax','policies')
$f$;
CREATE FUNCTION financial_statement_private.add_amount(p_map jsonb,p_key text,p_amount numeric)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT jsonb_set(COALESCE(p_map,'{}'),ARRAY[p_key],to_jsonb(COALESCE((p_map->>p_key)::numeric,0)+p_amount),true)
$f$;
CREATE FUNCTION financial_statement_private.position_group(p_key text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT CASE
  WHEN p_key IN ('cash','receivables','inventories','current_tax_assets','other_current_assets') THEN 'current_assets'
  WHEN p_key IN ('property_equipment','right_of_use_assets','intangibles','investments','investment_property','deferred_tax_assets','other_noncurrent_assets') THEN 'noncurrent_assets'
  WHEN p_key IN ('payables','customer_deposits','current_borrowings','current_lease_liabilities','current_tax_liabilities','current_provisions','other_current_liabilities') THEN 'current_liabilities'
  WHEN p_key IN ('noncurrent_borrowings','noncurrent_lease_liabilities','employee_benefits','deferred_tax_liabilities','noncurrent_provisions','other_noncurrent_liabilities') THEN 'noncurrent_liabilities'
  WHEN p_key IN ('share_capital','statutory_reserve','retained_earnings','other_reserves','other_equity') THEN 'equity' END
$f$;
CREATE FUNCTION financial_statement_private.finding(p_code text,p_ar text,p_en text,p_accounts jsonb DEFAULT '[]',p_journals jsonb DEFAULT '[]',p_severity text DEFAULT 'error')
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT jsonb_build_array(jsonb_build_object('code',p_code,'severity',p_severity,'count',1,'messageAr',p_ar,'messageEn',p_en,'accountIds',p_accounts,'journalIds',p_journals))
$f$;
CREATE FUNCTION financial_statement_private.cash_detail(p_details jsonb,p_category text,p_amount numeric,p_identity text,p_ar text,p_en text,p_accounts jsonb DEFAULT '[]')
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $f$
DECLARE v_key text;
BEGIN
 IF p_amount=0 THEN RETURN p_details; END IF;
 v_key:=p_category||CASE WHEN p_amount>0 THEN '_receipts_' ELSE '_payments_' END||p_identity;
 RETURN jsonb_set(p_details,ARRAY[v_key],jsonb_build_object('category',p_category,
   'labelAr',CASE WHEN p_amount>0 THEN 'مقبوضات — ' ELSE 'مدفوعات — ' END||p_ar,
   'labelEn',CASE WHEN p_amount>0 THEN 'Receipts — ' ELSE 'Payments — ' END||p_en,
   'amount',COALESCE((p_details->v_key->>'amount')::numeric,0)+p_amount,'accountIds',p_accounts),true);
END;
$f$;
CREATE FUNCTION financial_statement_private.row(p_key text,p_ar text,p_en text,p_values jsonb,p_kind text DEFAULT 'line',p_accounts jsonb DEFAULT '[]',p_notes jsonb DEFAULT '[]')
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT jsonb_build_array(jsonb_build_object('key',p_key,'labelAr',p_ar,'labelEn',p_en,'kind',p_kind,'values',p_values,'accountIds',p_accounts,'noteNumbers',p_notes))
$f$;

CREATE FUNCTION financial_statement_private.validate_configuration(p_company uuid,p_config jsonb)
RETURNS void LANGUAGE plpgsql STABLE SET search_path='' AS $f$
DECLARE v_start date;v_end date;v_cs date;v_ce date;v_position date;v_third date;v_m jsonb;v_o jsonb;v_n jsonb;v_s jsonb;v_key text;v_type text;v_date text;
BEGIN
 IF jsonb_typeof(p_config) IS DISTINCT FROM 'object' OR p_config->'version' IS DISTINCT FROM '1'::jsonb
   OR p_config->>'kind' IS NULL OR p_config->>'kind' NOT IN ('annual','interim')
   OR p_config->>'scope' IS DISTINCT FROM 'individual_entity' OR p_config->>'framework' IS DISTINCT FROM 'IFRS'
   OR p_config->>'legalForm' IS NULL OR p_config->>'legalForm' NOT IN ('unspecified','llc','sole_establishment','other')
   OR jsonb_typeof(p_config->'requiresThirdPosition') IS DISTINCT FROM 'boolean'
   OR jsonb_typeof(p_config->'accountMappings') IS DISTINCT FROM 'array'
   OR jsonb_typeof(p_config->'journalOverrides') IS DISTINCT FROM 'array'
   OR jsonb_typeof(p_config->'notes') IS DISTINCT FROM 'array'
   OR jsonb_typeof(p_config->'preparationNotes') IS DISTINCT FROM 'string' OR length(p_config->>'preparationNotes')>10000
   OR length(p_config::text)>2000000 THEN
   RAISE EXCEPTION 'Invalid financial statement configuration' USING ERRCODE='22023';
 END IF;
 IF NOT(p_config ?& ARRAY['version','kind','scope','framework','legalForm','periodStart','periodEnd','positionComparisonDate','comparativePeriodStart','comparativePeriodEnd','thirdPositionDate','requiresThirdPosition','accountMappings','journalOverrides','notes','preparationNotes'])
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_config) k WHERE k<>ALL(ARRAY['version','kind','scope','framework','legalForm','periodStart','periodEnd','positionComparisonDate','comparativePeriodStart','comparativePeriodEnd','thirdPositionDate','requiresThirdPosition','accountMappings','journalOverrides','notes','preparationNotes']))
   OR jsonb_array_length(p_config->'accountMappings')>20000 OR jsonb_array_length(p_config->'journalOverrides')>20000 OR jsonb_array_length(p_config->'notes')>30 THEN
   RAISE EXCEPTION 'Invalid financial statement configuration keys or limits' USING ERRCODE='22023';
 END IF;
 FOREACH v_key IN ARRAY ARRAY['periodStart','periodEnd','positionComparisonDate','comparativePeriodStart','comparativePeriodEnd'] LOOP
   v_date:=p_config->>v_key;
   IF jsonb_typeof(p_config->v_key) IS DISTINCT FROM 'string' OR v_date IS NULL OR v_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR NOT isfinite(v_date::date)
     OR v_date::date<DATE '1900-01-01' OR v_date::date>(statement_timestamp() AT TIME ZONE 'Asia/Qatar')::date THEN
     RAISE EXCEPTION 'Invalid financial statement date: %',v_key USING ERRCODE='22023';
   END IF;
 END LOOP;
 v_start:=(p_config->>'periodStart')::date;v_end:=(p_config->>'periodEnd')::date;
 v_cs:=(p_config->>'comparativePeriodStart')::date;v_ce:=(p_config->>'comparativePeriodEnd')::date;v_position:=(p_config->>'positionComparisonDate')::date;
 IF v_start>v_end OR v_end>=(v_start+interval '1 year')::date OR v_cs<>(v_start-interval '1 year')::date
   OR v_ce<>(v_end-interval '1 year')::date OR v_cs>v_ce OR v_ce>=v_start OR v_position<>v_start-1
   OR (p_config->>'kind'='annual' AND v_end<>(v_start+interval '1 year'-interval '1 day')::date)
   OR (p_config->>'kind'='interim' AND v_end>=(v_start+interval '1 year'-interval '1 day')::date) THEN
   RAISE EXCEPTION 'Reporting dates must be a fiscal annual or year-to-date period with matching prior-year comparisons' USING ERRCODE='22023';
 END IF;
 IF p_config->>'thirdPositionDate' IS NOT NULL THEN
   v_date:=p_config->>'thirdPositionDate';
   IF jsonb_typeof(p_config->'thirdPositionDate') IS DISTINCT FROM 'string' OR v_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR v_date::date<>v_cs-1 OR v_date::date<DATE '1900-01-01' THEN
     RAISE EXCEPTION 'Third position date must be the opening of the comparative period' USING ERRCODE='22023';
   END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'accountMappings') m GROUP BY m->>'accountId' HAVING count(*)>1)
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'journalOverrides') o GROUP BY o->>'journalId' HAVING count(*)>1)
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'notes') n GROUP BY n->>'code' HAVING count(*)>1)
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'notes') n GROUP BY n->>'number' HAVING count(*)>1) THEN
   RAISE EXCEPTION 'Duplicate mapping, override, or note reference' USING ERRCODE='22023';
 END IF;
 FOR v_m IN SELECT value FROM jsonb_array_elements(p_config->'accountMappings') LOOP
   IF jsonb_typeof(v_m) IS DISTINCT FROM 'object' OR NOT(v_m ?& ARRAY['accountId','positionLine','comparisonPositionLine','incomeLine','cashFlowCategory','isCashEquivalent','currentSplit','comparisonSplit'])
     OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_m) k WHERE k<>ALL(ARRAY['accountId','positionLine','comparisonPositionLine','thirdPositionLine','incomeLine','cashFlowCategory','isCashEquivalent','currentSplit','comparisonSplit','thirdSplit']))
     OR jsonb_typeof(v_m->'accountId') IS DISTINCT FROM 'string' THEN
     RAISE EXCEPTION 'Invalid account mapping keys or types' USING ERRCODE='22023';
   END IF;
   SELECT balance_sheet_private.account_type(account_type) INTO v_type FROM public.chart_of_accounts
     WHERE id=(v_m->>'accountId')::uuid AND company_id=p_company;
   IF NOT FOUND THEN RAISE EXCEPTION 'Mapping account does not belong to this company' USING ERRCODE='22023'; END IF;
   IF jsonb_typeof(v_m->'isCashEquivalent') IS DISTINCT FROM 'boolean' OR ((v_m->>'isCashEquivalent')::boolean AND v_type<>'asset') THEN
     RAISE EXCEPTION 'Cash equivalents must be explicitly identified asset accounts' USING ERRCODE='22023';
   END IF;
   FOREACH v_key IN ARRAY ARRAY['positionLine','comparisonPositionLine','thirdPositionLine'] LOOP
     IF v_m->>v_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financial_statement_private.catalog() c WHERE c.key=v_m->>v_key AND c.category=v_type) THEN
       RAISE EXCEPTION 'Position classification is incompatible with account type' USING ERRCODE='22023';
     END IF;
     IF v_m->>v_key='cash' AND NOT (v_m->>'isCashEquivalent')::boolean THEN
       RAISE EXCEPTION 'Cash presentation requires an explicitly reviewed cash-equivalent account' USING ERRCODE='22023';
     END IF;
   END LOOP;
   IF (v_m->>'isCashEquivalent')::boolean AND (v_m->>'positionLine' IS DISTINCT FROM 'cash'
     OR COALESCE(v_m->>'comparisonPositionLine',v_m->>'positionLine')<>'cash'
     OR COALESCE(v_m->>'thirdPositionLine',v_m->>'positionLine')<>'cash') THEN
     RAISE EXCEPTION 'Cash equivalent account must remain in the cash presentation line' USING ERRCODE='22023';
   END IF;
   IF v_m->>'incomeLine' IS NOT NULL AND (v_type NOT IN ('revenue','expense') OR NOT EXISTS(
     SELECT 1 FROM financial_statement_private.catalog() c WHERE c.key=v_m->>'incomeLine' AND c.category='income')) THEN
     RAISE EXCEPTION 'Invalid income classification' USING ERRCODE='22023';
   END IF;
   IF v_m->>'cashFlowCategory' IS NOT NULL AND v_m->>'cashFlowCategory' NOT IN ('operating','investing','financing','exchange') THEN
     RAISE EXCEPTION 'Invalid cash flow category' USING ERRCODE='22023';
   END IF;
   FOREACH v_key IN ARRAY ARRAY['currentSplit','comparisonSplit','thirdSplit'] LOOP
     v_s:=v_m->v_key;
     IF v_s IS NOT NULL AND v_s<>'null'::jsonb AND (jsonb_typeof(v_s) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_s->'amount') IS DISTINCT FROM 'number'
       OR abs((v_s->>'amount')::numeric)>1000000000000
       OR NOT(v_s ?& ARRAY['line','amount']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_s) k WHERE k NOT IN ('line','amount'))
       OR NOT EXISTS(SELECT 1 FROM financial_statement_private.catalog() c WHERE c.key=v_s->>'line' AND c.category=v_type)
       OR (v_m->>'isCashEquivalent')::boolean OR v_s->>'line'='cash') THEN
       RAISE EXCEPTION 'Invalid position split' USING ERRCODE='22023';
     END IF;
   END LOOP;
 END LOOP;
 FOR v_o IN SELECT value FROM jsonb_array_elements(p_config->'journalOverrides') LOOP
   IF jsonb_typeof(v_o) IS DISTINCT FROM 'object' OR NOT(v_o ?& ARRAY['journalId','treatment','equityCategory','cashFlows','reason'])
     OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_o) k WHERE k<>ALL(ARRAY['journalId','treatment','equityCategory','cashFlows','reason','internalCashTransfer']))
     OR jsonb_typeof(v_o->'journalId') IS DISTINCT FROM 'string' OR jsonb_typeof(v_o->'reason') IS DISTINCT FROM 'string'
     OR (v_o ? 'internalCashTransfer' AND (jsonb_typeof(v_o->'internalCashTransfer') IS DISTINCT FROM 'number'
       OR (v_o->>'internalCashTransfer')::numeric<0 OR (v_o->>'internalCashTransfer')::numeric>1000000000000)) THEN
     RAISE EXCEPTION 'Invalid journal classification keys or types' USING ERRCODE='22023';
   END IF;
   IF NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=(v_o->>'journalId')::uuid AND e.company_id=p_company AND e.entry_date<=v_end)
     OR v_o->>'treatment' IS NULL OR v_o->>'treatment' NOT IN ('regular','closing')
     OR length(btrim(COALESCE(v_o->>'reason','')))<20 OR length(btrim(v_o->>'reason'))>2000
     OR jsonb_typeof(v_o->'cashFlows') IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_o->'cashFlows')>20
     OR (v_o->>'equityCategory' IS NOT NULL AND v_o->>'equityCategory' NOT IN
       ('contributions','distributions','transfers','prior_adjustments','oci_reclassifiable','oci_nonreclassifiable','other')) THEN
     RAISE EXCEPTION 'Invalid journal classification or missing review reason' USING ERRCODE='22023';
   END IF;
   FOR v_s IN SELECT value FROM jsonb_array_elements(v_o->'cashFlows') LOOP
     IF v_s->>'category' IS NULL OR v_s->>'category' NOT IN ('operating','investing','financing','exchange')
       OR jsonb_typeof(v_s->'amount') IS DISTINCT FROM 'number' OR jsonb_typeof(v_s->'label') IS DISTINCT FROM 'string'
       OR abs((v_s->>'amount')::numeric)>1000000000000
       OR NOT(v_s ?& ARRAY['category','amount','label']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_s) k WHERE k NOT IN ('category','amount','label'))
       OR length(btrim(COALESCE(v_s->>'label','')))<5 OR length(btrim(v_s->>'label'))>200 THEN
       RAISE EXCEPTION 'Invalid cash flow allocation' USING ERRCODE='22023';
     END IF;
   END LOOP;
 END LOOP;
 IF EXISTS(WITH RECURSIVE canonical_ids(id) AS (
   SELECT e.id FROM public.journal_entries e WHERE e.company_id=p_company AND e.entry_date<=v_end AND e.status IN ('posted','reversed')
     AND (e.reference_type IN ('closing','annual_close','annual_close_opening') OR EXISTS(
       SELECT 1 FROM jsonb_array_elements(p_config->'journalOverrides') o WHERE o->>'journalId'=e.id::text AND o->>'treatment'='closing'))
   UNION SELECT e.id FROM public.journal_entries e JOIN canonical_ids c ON c.id=e.reference_id
     WHERE e.company_id=p_company AND e.entry_date<=v_end AND e.status IN ('posted','reversed') AND e.reference_type IN ('journal_reversal','reversal'))
   SELECT 1 FROM canonical_ids c JOIN jsonb_array_elements(p_config->'journalOverrides') o ON o->>'journalId'=c.id::text WHERE o->>'treatment'='regular') THEN
   RAISE EXCEPTION 'Canonical closing journals and selected closing families cannot be classified as regular' USING ERRCODE='22023';
 END IF;
 FOR v_n IN SELECT value FROM jsonb_array_elements(p_config->'notes') LOOP
   IF jsonb_typeof(v_n) IS DISTINCT FROM 'object' OR NOT(v_n ?& ARRAY['code','number','titleAr','titleEn','status','text','evidence'])
     OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_n) k WHERE k<>ALL(ARRAY['code','number','titleAr','titleEn','status','text','evidence']))
     OR jsonb_typeof(v_n->'number') IS DISTINCT FROM 'number' OR jsonb_typeof(v_n->'text') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_n->'evidence') IS DISTINCT FROM 'string' OR jsonb_typeof(v_n->'titleAr') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_n->'titleEn') IS DISTINCT FROM 'string' THEN
     RAISE EXCEPTION 'Invalid disclosure note keys or types' USING ERRCODE='22023';
   END IF;
   IF v_n->>'code' IS NULL OR v_n->>'code' NOT IN ('entity','basis','policies','estimates','assets','receivables','liabilities','equity',
     'related_parties','commitments','subsequent_events','going_concern','noncash_transactions','interim_changes')
     OR COALESCE(v_n->>'number','') !~ '^[1-9][0-9]?$' OR v_n->>'status' IS NULL
     OR v_n->>'status' NOT IN ('pending','complete','not_applicable')
     OR length(btrim(COALESCE(v_n->>'titleAr','')))=0 OR length(btrim(COALESCE(v_n->>'titleEn','')))=0
     OR length(btrim(v_n->>'titleAr'))>200 OR length(btrim(v_n->>'titleEn'))>200
     OR length(COALESCE(v_n->>'text',''))>20000 OR length(COALESCE(v_n->>'evidence',''))>4000 THEN
     RAISE EXCEPTION 'Invalid disclosure note' USING ERRCODE='22023';
   END IF;
 END LOOP;
END;
$f$;

CREATE FUNCTION financial_statement_private.position_values(p_position jsonb,p_config jsonb,p_column text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $f$
DECLARE v_a jsonb;v_m jsonb;v_s jsonb;v_line text;v_balance numeric;v_amount numeric;v_values jsonb:='{}';v_findings jsonb:='[]';
BEGIN
 FOR v_a IN SELECT value FROM jsonb_array_elements(p_position->'accounts') LOOP
   IF v_a->>'type' NOT IN ('asset','liability','equity') THEN CONTINUE; END IF;
   v_balance:=(v_a->>'balance')::numeric;
   v_m:=NULL;SELECT value INTO v_m FROM jsonb_array_elements(p_config->'accountMappings') WHERE value->>'accountId'=v_a->>'id';
   v_line:=CASE p_column WHEN 'comparison' THEN COALESCE(v_m->>'comparisonPositionLine',v_m->>'positionLine')
     WHEN 'third' THEN COALESCE(v_m->>'thirdPositionLine',v_m->>'positionLine') ELSE v_m->>'positionLine' END;
   v_s:=v_m->(CASE p_column WHEN 'comparison' THEN 'comparisonSplit' WHEN 'third' THEN 'thirdSplit' ELSE 'currentSplit' END);
   IF v_line IS NULL AND v_balance<>0 THEN
     v_findings:=v_findings||financial_statement_private.finding('position_mapping_missing','يلزم تصنيف الحساب في قائمة المركز المالي','Position account classification is missing',jsonb_build_array(v_a->>'id'));
   END IF;
   v_line:=COALESCE(v_line,'unclassified_'||(v_a->>'type'));
   IF v_s IS NOT NULL AND v_s<>'null'::jsonb THEN
     v_amount:=(v_s->>'amount')::numeric;
     IF abs(v_amount)>abs(v_balance)+0.005 OR (v_amount*v_balance<0) OR (v_balance=0 AND v_amount<>0) THEN
       v_findings:=v_findings||financial_statement_private.finding('position_split_exceeds_balance','تقسيم التصنيف لا يحافظ على إشارة رصيد الحساب وحدوده','Position split exceeds the signed account balance',jsonb_build_array(v_a->>'id'));
     ELSE
       v_values:=financial_statement_private.add_amount(v_values,v_s->>'line',v_amount);v_balance:=v_balance-v_amount;
     END IF;
   END IF;
   v_values:=financial_statement_private.add_amount(v_values,v_line,v_balance);
 END LOOP;
 v_values:=financial_statement_private.add_amount(v_values,'retained_earnings',(p_position->'totals'->>'unclosedResult')::numeric);
 RETURN jsonb_build_object('values',v_values,'findings',v_findings);
END;
$f$;

CREATE FUNCTION financial_statement_private.cash_balance(p_position jsonb,p_config jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT COALESCE(sum((a->>'balance')::numeric),0) FROM jsonb_array_elements(p_position->'accounts') a
 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'accountMappings') m
   WHERE m->>'accountId'=a->>'id' AND COALESCE((m->>'isCashEquivalent')::boolean,false))
$f$;
CREATE FUNCTION financial_statement_private.equity_values(p_position jsonb,p_config jsonb,p_column text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $f$
 SELECT financial_statement_private.position_values(jsonb_set(p_position,'{accounts}',
   COALESCE((SELECT jsonb_agg(a) FROM jsonb_array_elements(p_position->'accounts') a WHERE a->>'type'='equity'),'[]')),p_config,p_column)
$f$;

CREATE FUNCTION financial_statement_private.equity_statement(p_key text,p_open jsonb,p_close jsonb,p_activity jsonb,p_start date,p_end date)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $f$
DECLARE v_columns jsonb:='[]';v_rows jsonb:='[]';v_values jsonb;v_kind text;v_label text;v_ar text;v_col text;v_amount numeric;
 v_total numeric;v_expected jsonb:='{}';v_diff numeric;v_maxdiff numeric:=0;
BEGIN
 FOR v_col,v_ar,v_label IN SELECT key,label_ar,label_en FROM financial_statement_private.catalog() WHERE category='equity' LOOP
   v_columns:=v_columns||jsonb_build_array(jsonb_build_object('key',v_col,'labelAr',v_ar,'labelEn',v_label,'startDate',p_start,'endDate',p_end));
 END LOOP;
 v_columns:=v_columns||jsonb_build_array(jsonb_build_object('key','total','labelAr','الإجمالي','labelEn','Total','startDate',p_start,'endDate',p_end));
 FOREACH v_kind IN ARRAY ARRAY['opening','profit','oci','contributions','distributions','transfers','prior_adjustments','other','closing','ledger_closing','difference'] LOOP
   v_values:='[]';v_total:=0;
   FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
     v_amount:=CASE v_kind
       WHEN 'opening' THEN COALESCE((p_open->>v_col)::numeric,0)
       WHEN 'profit' THEN CASE WHEN v_col='retained_earnings' THEN (p_activity->>'profit')::numeric ELSE 0 END
       WHEN 'oci' THEN COALESCE((p_activity->'equity'->>('oci_reclassifiable:'||v_col))::numeric,0)+COALESCE((p_activity->'equity'->>('oci_nonreclassifiable:'||v_col))::numeric,0)
       WHEN 'closing' THEN COALESCE((v_expected->>v_col)::numeric,0)
       WHEN 'ledger_closing' THEN COALESCE((p_close->>v_col)::numeric,0)
       WHEN 'difference' THEN COALESCE((v_expected->>v_col)::numeric,0)-COALESCE((p_close->>v_col)::numeric,0)
       ELSE COALESCE((p_activity->'equity'->>(v_kind||':'||v_col))::numeric,0) END;
     IF v_kind NOT IN ('closing','ledger_closing','difference') THEN v_expected:=financial_statement_private.add_amount(v_expected,v_col,v_amount); END IF;
     IF v_kind='difference' THEN v_maxdiff:=greatest(v_maxdiff,abs(v_amount)); END IF;
     v_values:=v_values||jsonb_build_array(v_amount);v_total:=v_total+v_amount;
   END LOOP;
   v_values:=v_values||jsonb_build_array(v_total);
   v_label:=CASE v_kind WHEN 'opening' THEN 'Opening balance' WHEN 'profit' THEN 'Profit or loss' WHEN 'oci' THEN 'Other comprehensive income'
     WHEN 'contributions' THEN 'Owner contributions' WHEN 'distributions' THEN 'Owner distributions' WHEN 'transfers' THEN 'Transfers between equity components'
     WHEN 'prior_adjustments' THEN 'Prior-period adjustments' WHEN 'other' THEN 'Other reviewed movements' WHEN 'closing' THEN 'Closing balance'
     WHEN 'ledger_closing' THEN 'Ledger closing balance' ELSE 'Reconciliation difference' END;
   v_ar:=CASE v_kind WHEN 'opening' THEN 'الرصيد الافتتاحي' WHEN 'profit' THEN 'ربح أو خسارة الفترة' WHEN 'oci' THEN 'الدخل الشامل الآخر'
     WHEN 'contributions' THEN 'مساهمات الملاك' WHEN 'distributions' THEN 'توزيعات الملاك' WHEN 'transfers' THEN 'تحويلات بين مكونات حقوق الملكية'
     WHEN 'prior_adjustments' THEN 'تعديلات فترات سابقة' WHEN 'other' THEN 'حركات أخرى مراجعة' WHEN 'closing' THEN 'الرصيد الختامي'
     WHEN 'ledger_closing' THEN 'الرصيد الختامي بدفتر الأستاذ' ELSE 'فرق المطابقة' END;
   v_rows:=v_rows||financial_statement_private.row(v_kind,v_ar,v_label,v_values,
     CASE WHEN v_kind IN ('difference','ledger_closing') THEN 'reconciliation' WHEN v_kind='closing' THEN 'total' ELSE 'line' END);
 END LOOP;
 RETURN jsonb_build_object('statement',jsonb_build_object('key',p_key,'titleAr',CASE WHEN p_key='equity_current' THEN 'التغيرات في حقوق الملكية — الفترة الحالية' ELSE 'التغيرات في حقوق الملكية — فترة المقارنة' END,
   'titleEn',CASE WHEN p_key='equity_current' THEN 'Changes in equity — current period' ELSE 'Changes in equity — comparative period' END,'columns',v_columns,'rows',v_rows),'difference',v_maxdiff);
END;
$f$;

-- Every journal is classified once. Closing families follow the existing canonical
-- income reader's recursive reference chain, including reversals of closing entries.
CREATE FUNCTION financial_statement_private.activity(p_company uuid,p_start date,p_end date,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $f$
DECLARE v_j record;v_l jsonb;v_m jsonb;v_o jsonb;v_a jsonb;v_income jsonb:='{}';v_equity jsonb:='{}';v_cash jsonb:='{}';v_cash_details jsonb:='{}';
 v_findings jsonb:='[]';v_journals jsonb:='[]';v_amount numeric;v_net numeric;v_cd numeric;v_cc numeric;
 v_nd numeric;v_nc numeric;v_noncash integer;v_profit numeric:=0;v_closing boolean;v_badclosing boolean;
 v_simple boolean;v_cf_review boolean;v_eq_review boolean;v_category text;v_column text;v_sum numeric;v_pos numeric;v_neg numeric;v_internal numeric;v_n integer:=0;
BEGIN
 FOR v_j IN
   WITH RECURSIVE canonical_ids(id) AS (
     SELECT e.id FROM public.journal_entries e WHERE e.company_id=p_company AND e.entry_date<=p_end AND e.status IN ('posted','reversed')
       AND e.reference_type IN ('closing','annual_close','annual_close_opening')
     UNION SELECT e.id FROM public.journal_entries e JOIN canonical_ids c ON c.id=e.reference_id
       WHERE e.company_id=p_company AND e.entry_date<=p_end AND e.status IN ('posted','reversed') AND e.reference_type IN ('journal_reversal','reversal')
   ), override_ids(id) AS (
     SELECT e.id FROM public.journal_entries e WHERE e.company_id=p_company AND e.entry_date<=p_end AND e.status IN ('posted','reversed') AND EXISTS(
       SELECT 1 FROM jsonb_array_elements(p_config->'journalOverrides') o WHERE o->>'journalId'=e.id::text AND o->>'treatment'='closing')
     UNION SELECT e.id FROM public.journal_entries e JOIN override_ids c ON c.id=e.reference_id
       WHERE e.company_id=p_company AND e.entry_date<=p_end AND e.status IN ('posted','reversed') AND e.reference_type IN ('journal_reversal','reversal')
   )
   SELECT e.id,e.entry_date,e.entry_number,e.description,e.reference_type,(c.id IS NOT NULL OR o.id IS NOT NULL) AS is_closing,(c.id IS NOT NULL) AS is_canonical_closing,
     COALESCE(jsonb_agg(jsonb_build_object('accountId',l.account_id,'name',a.account_name,'nameAr',a.account_name_ar,'type',balance_sheet_private.account_type(a.account_type),
       'debit',balance_sheet_private.finite_amount(l.debit_amount),'credit',balance_sheet_private.finite_amount(l.credit_amount)) ORDER BY l.line_number,l.id)
       FILTER(WHERE l.id IS NOT NULL),'[]') AS lines
   FROM public.journal_entries e LEFT JOIN canonical_ids c ON c.id=e.id LEFT JOIN override_ids o ON o.id=e.id
   LEFT JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
   LEFT JOIN public.chart_of_accounts a ON a.id=l.account_id AND a.company_id=p_company
   WHERE e.company_id=p_company AND e.status='posted' AND e.entry_date BETWEEN p_start AND p_end
   GROUP BY e.id,e.entry_date,e.entry_number,e.description,e.reference_type,c.id,o.id ORDER BY e.entry_date,e.id
 LOOP
   v_n:=v_n+1;v_o:=NULL;v_cf_review:=false;v_eq_review:=false;v_cd:=0;v_cc:=0;v_nd:=0;v_nc:=0;v_noncash:=0;
   SELECT value INTO v_o FROM jsonb_array_elements(p_config->'journalOverrides') WHERE value->>'journalId'=v_j.id::text;
   v_internal:=COALESCE((v_o->>'internalCashTransfer')::numeric,0);
   v_closing:=v_j.is_closing;
   v_badclosing:=v_closing AND (EXISTS(SELECT 1 FROM jsonb_array_elements(v_j.lines) l WHERE l->>'type' NOT IN ('revenue','expense','equity'))
     OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_j.lines) l WHERE l->>'type' IN ('revenue','expense'))
     OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_j.lines) l WHERE l->>'type'='equity'));
   IF v_badclosing THEN
     v_findings:=v_findings||financial_statement_private.finding('invalid_closing_journal','قيد الإقفال يتضمن حسابات أو حركة غير مناسبة','Closing journal contains inappropriate accounts or movements','[]',jsonb_build_array(v_j.id));
   END IF;
   IF v_j.reference_type='annual_close_opening' THEN
     v_findings:=v_findings||financial_statement_private.finding('carryforward_requires_review','يلزم التحقق من قيد الأرصدة الافتتاحية لمنع تكرار الأرصدة','Review annual carryforward journal for duplicated cumulative balances','[]',jsonb_build_array(v_j.id));
   END IF;
   IF NOT v_closing AND v_o->>'equityCategory'='transfers' AND
     (EXISTS(SELECT 1 FROM jsonb_array_elements(v_j.lines) l WHERE l->>'type'<>'equity' AND ((l->>'debit')::numeric<>0 OR (l->>'credit')::numeric<>0))
       OR abs((SELECT COALESCE(sum((l->>'credit')::numeric-(l->>'debit')::numeric),0) FROM jsonb_array_elements(v_j.lines) l WHERE l->>'type'='equity'))>0.005) THEN
     v_findings:=v_findings||financial_statement_private.finding('invalid_equity_transfer','التحويل بين مكونات حقوق الملكية يجب ألا يغير إجماليها أو يتضمن حركة خارجية','Transfers between equity components must have zero total and only equity lines','[]',jsonb_build_array(v_j.id));
   END IF;
   FOR v_l IN SELECT value FROM jsonb_array_elements(v_j.lines) LOOP
     v_m:=NULL; SELECT value INTO v_m FROM jsonb_array_elements(p_config->'accountMappings') WHERE value->>'accountId'=v_l->>'accountId';
     v_amount:=(v_l->>'credit')::numeric-(v_l->>'debit')::numeric;
     IF COALESCE((v_m->>'isCashEquivalent')::boolean,false) THEN
       v_cd:=v_cd+(v_l->>'debit')::numeric;v_cc:=v_cc+(v_l->>'credit')::numeric;
     ELSE
       v_nd:=v_nd+(v_l->>'debit')::numeric;v_nc:=v_nc+(v_l->>'credit')::numeric;v_noncash:=v_noncash+1;
     END IF;
     IF NOT v_closing AND v_l->>'type' IN ('revenue','expense') THEN
       v_profit:=v_profit+v_amount;
       IF v_m->>'incomeLine' IS NULL AND v_amount<>0 THEN
         v_findings:=v_findings||financial_statement_private.finding('income_mapping_missing','يلزم تحديد بند قائمة الدخل للحساب','Income statement classification is missing',jsonb_build_array(v_l->>'accountId'),jsonb_build_array(v_j.id));
       END IF;
       v_income:=financial_statement_private.add_amount(v_income,COALESCE(v_m->>'incomeLine','unclassified_income'),v_amount);
     END IF;
     IF v_l->>'type'='equity' AND v_amount<>0 THEN
       v_column:=COALESCE(v_m->>'positionLine','other_equity');
       IF v_closing THEN
         -- Closing transfers move accumulated profit from the residual earnings column.
         v_equity:=financial_statement_private.add_amount(v_equity,'transfers:'||v_column,v_amount);
         v_equity:=financial_statement_private.add_amount(v_equity,'transfers:retained_earnings',-v_amount);
       ELSE
         v_category:=v_o->>'equityCategory';
         IF v_category IS NULL THEN
           v_eq_review:=true;
           v_findings:=v_findings||financial_statement_private.finding('equity_movement_unclassified','يلزم تصنيف حركة حقوق الملكية وشرحها','Direct equity movement requires a reviewed category','[]',jsonb_build_array(v_j.id));
         END IF;
         v_equity:=financial_statement_private.add_amount(v_equity,COALESCE(v_category,'other')||':'||v_column,v_amount);
       END IF;
     END IF;
   END LOOP;
   v_net:=v_cd-v_cc;
   IF (v_cd<>0 OR v_cc<>0) AND v_noncash>0 THEN
     v_simple:=(v_cd=0 OR v_cc=0) AND ((v_net>0 AND v_nd=0) OR (v_net<0 AND v_nc=0));
     IF jsonb_array_length(COALESCE(v_o->'cashFlows','[]'))>0 THEN
       SELECT COALESCE(sum((a->>'amount')::numeric),0),COALESCE(sum(greatest((a->>'amount')::numeric,0)),0),
         COALESCE(sum(greatest(-(a->>'amount')::numeric,0)),0) INTO v_sum,v_pos,v_neg FROM jsonb_array_elements(v_o->'cashFlows') a;
       IF abs(v_sum-v_net)>0.005 OR v_internal>least(v_cd,v_cc)+0.005
         OR abs(v_pos-(v_cd-v_internal))>0.005 OR abs(v_neg-(v_cc-v_internal))>0.005 THEN
         v_cf_review:=true;
         v_findings:=v_findings||financial_statement_private.finding('cash_flow_allocation_mismatch','توزيع التدفقات لا يطابق إجمالي النقد المدين والدائن','Cash flow allocations do not reconcile to actual cash debits and credits','[]',jsonb_build_array(v_j.id));
       ELSE
         FOR v_a IN SELECT value FROM jsonb_array_elements(v_o->'cashFlows') LOOP
           v_cash:=financial_statement_private.add_amount(v_cash,v_a->>'category',(v_a->>'amount')::numeric);
           v_cash_details:=financial_statement_private.cash_detail(v_cash_details,v_a->>'category',(v_a->>'amount')::numeric,
             encode(sha256(convert_to(btrim(v_a->>'label'),'UTF8')),'hex'),btrim(v_a->>'label'),btrim(v_a->>'label'));
         END LOOP;
       END IF;
     ELSIF v_internal>0 AND abs(v_internal-v_cd)<=0.005 AND abs(v_internal-v_cc)<=0.005 THEN
       -- Explicitly reviewed internal transfer plus separate non-cash legs: no external flow.
       NULL;
     ELSIF v_simple AND v_internal=0 THEN
       FOR v_l IN SELECT value FROM jsonb_array_elements(v_j.lines) LOOP
         v_m:=NULL; SELECT value INTO v_m FROM jsonb_array_elements(p_config->'accountMappings') WHERE value->>'accountId'=v_l->>'accountId';
         IF NOT COALESCE((v_m->>'isCashEquivalent')::boolean,false) THEN
           IF v_m->>'cashFlowCategory' IS NULL THEN v_cf_review:=true;
           ELSE
             v_cash:=financial_statement_private.add_amount(v_cash,v_m->>'cashFlowCategory',(v_l->>'credit')::numeric-(v_l->>'debit')::numeric);
             v_cash_details:=financial_statement_private.cash_detail(v_cash_details,v_m->>'cashFlowCategory',(v_l->>'credit')::numeric-(v_l->>'debit')::numeric,
               v_l->>'accountId',COALESCE(v_l->>'nameAr',v_l->>'name','حساب غير مسمى'),COALESCE(v_l->>'name','Unnamed account'),jsonb_build_array(v_l->>'accountId'));
           END IF;
         END IF;
       END LOOP;
       IF v_cf_review THEN v_findings:=v_findings||financial_statement_private.finding('cash_flow_mapping_missing','يلزم تصنيف الحساب المقابل للتدفق النقدي','Cash flow counterpart classification is missing','[]',jsonb_build_array(v_j.id)); END IF;
     ELSE
       v_cf_review:=true;v_findings:=v_findings||financial_statement_private.finding('complex_cash_flow_requires_allocation','القيد المختلط يحتاج توزيعاً مراجعاً للتدفقات النقدية','Mixed cash and non-cash journal requires reviewed cash allocations','[]',jsonb_build_array(v_j.id));
     END IF;
   ELSIF jsonb_array_length(COALESCE(v_o->'cashFlows','[]'))>0 OR (v_internal<>0 AND (v_noncash>0 OR abs(v_internal-least(v_cd,v_cc))>0.005)) THEN
     v_findings:=v_findings||financial_statement_private.finding('unexpected_cash_flow_allocation','لا يجوز توزيع قيد غير نقدي أو تحويل داخلي كتدفق خارجي','Non-cash journals and internal cash transfers cannot be allocated as external cash flows','[]',jsonb_build_array(v_j.id));
   END IF;
   v_journals:=v_journals||jsonb_build_array(jsonb_build_object('id',v_j.id,'date',v_j.entry_date,'number',COALESCE(v_j.entry_number,''),
     'description',COALESCE(v_j.description,''),'referenceType',v_j.reference_type,'cashMovement',v_net,'requiresCashFlowReview',v_cf_review,'requiresEquityReview',v_eq_review));
   v_journals:=jsonb_set(v_journals,ARRAY[(jsonb_array_length(v_journals)-1)::text],(v_journals->(jsonb_array_length(v_journals)-1))
     ||jsonb_build_object('effectiveTreatment',CASE WHEN v_closing THEN 'closing' ELSE 'regular' END,'isCanonicalClosing',v_j.is_canonical_closing));
 END LOOP;
 RETURN jsonb_build_object('income',v_income,'equity',v_equity,'cash',v_cash,'cashDetails',v_cash_details,'profit',v_profit,'findings',v_findings,'journals',v_journals,'postedEntries',v_n);
END;
$f$;

CREATE FUNCTION financial_statement_private.calculate(p_company uuid,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' SET timezone='UTC' AS $f$
DECLARE v_start date;v_end date;v_cs date;v_ce date;v_pc date;v_third date;
 v_position jsonb;v_current jsonb;v_comparison jsonb;v_third_source jsonb;v_open jsonb;v_co jsonb;v_cc jsonb;
 v_cp jsonb;v_pp jsonb;v_tp jsonb;v_op jsonb;v_cop jsonb;v_ccp jsonb;v_reclass jsonb;
 v_activity jsonb;v_ca jsonb;v_prior_config jsonb;v_unsplit_config jsonb;v_eq jsonb;v_ceq jsonb;v_findings jsonb:='[]';
 v_rows jsonb;v_values jsonb;v_columns jsonb;v_statements jsonb:='[]';v_journals jsonb;v_notes jsonb;v_accounts jsonb;
 v_n jsonb;v_check jsonb;v_record record;v_key text;v_col text;v_label text;v_ar text;v_kind text;v_group text;v_section_ar text;v_section_en text;
 v_profit numeric;v_cprofit numeric;v_oci1 numeric;v_oci2 numeric;v_coci1 numeric;v_coci2 numeric;
 v_cash_open numeric;v_cash_close numeric;v_ccash_open numeric;v_ccash_close numeric;v_cash_net numeric;v_ccash_net numeric;
 v_amount numeric;v_camount numeric;v_tamount numeric;v_diff numeric;v_cdiff numeric;v_hash text;v_count integer;v_presentation_complete boolean;
BEGIN
 PERFORM financial_statement_private.validate_configuration(p_company,p_config);
 v_start:=(p_config->>'periodStart')::date;v_end:=(p_config->>'periodEnd')::date;
 v_cs:=(p_config->>'comparativePeriodStart')::date;v_ce:=(p_config->>'comparativePeriodEnd')::date;
 v_pc:=(p_config->>'positionComparisonDate')::date;v_third:=(p_config->>'thirdPositionDate')::date;
 v_position:=balance_sheet_private.calculate(p_company,v_end,v_pc);
 v_current:=balance_sheet_private.period(p_company,v_end);v_comparison:=balance_sheet_private.period(p_company,v_pc);
 v_open:=balance_sheet_private.period(p_company,v_start-1);v_co:=balance_sheet_private.period(p_company,v_cs-1);v_cc:=balance_sheet_private.period(p_company,v_ce);
 IF v_third IS NOT NULL THEN v_third_source:=balance_sheet_private.period(p_company,v_third); END IF;
 v_cp:=financial_statement_private.position_values(v_current,p_config,'current');
 v_pp:=financial_statement_private.position_values(v_comparison,p_config,'comparison');
 IF v_third IS NOT NULL THEN v_tp:=financial_statement_private.position_values(v_third_source,p_config,'third'); END IF;
 v_presentation_complete:=NOT EXISTS(SELECT 1 FROM jsonb_array_elements((v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]')));
 FOR v_check IN SELECT value FROM jsonb_array_elements(v_position->'checks') LOOP
   IF v_check->>'code'='unclassified_accounts' AND v_presentation_complete THEN CONTINUE; END IF;
   v_findings:=v_findings||jsonb_build_array(jsonb_build_object('code',v_check->>'code','severity',v_check->>'severity','count',(v_check->>'count')::numeric,
     'messageAr','فحص دفتر الأستاذ: '||(v_check->>'code')||' — '||(v_check->>'asOfDate'),
     'messageEn','Ledger check: '||(v_check->>'code')||' — '||(v_check->>'asOfDate'),'accountIds','[]'::jsonb,'journalIds','[]'::jsonb));
 END LOOP;
 -- Opening/comparative-flow cutoffs can contain defects masked by a later reversal.
 FOR v_check IN SELECT value FROM jsonb_array_elements((v_co->'checks')||(v_cc->'checks')) WHERE value->>'severity'='error'
   AND value->>'code' NOT IN ('no_posted_entries','unclassified_accounts') LOOP
   v_findings:=v_findings||financial_statement_private.finding(v_check->>'code','خطأ في مصدر الفترة المقارنة أو الرصيد الافتتاحي','Error in comparative or opening ledger source');
 END LOOP;
 IF p_config->>'legalForm'='unspecified' THEN
   v_findings:=v_findings||financial_statement_private.finding('legal_form_required','يلزم تحديد الشكل القانوني ومراجعة متطلبات العرض ذات الصلة','Legal form and applicable presentation requirements must be reviewed');
 END IF;
 IF (p_config->>'requiresThirdPosition')::boolean AND v_third IS NULL THEN
   v_findings:=v_findings||financial_statement_private.finding('third_position_required','يلزم المركز المالي الافتتاحي للمقارنة بسبب التعديلات بأثر رجعي','An opening comparative position is required for retrospective changes');
 END IF;
 IF v_third IS NOT NULL AND (v_third_source->'totals'->>'postedEntries')::integer=0 THEN
   v_findings:=v_findings||financial_statement_private.finding('third_position_source_missing','لا توجد بيانات مصدر تؤكد رصيد افتتاح المقارنة','No ledger source verifies the opening comparative position');
 END IF;
 FOREACH v_key IN ARRAY ARRAY['entity','basis','policies','estimates','assets','receivables','liabilities','equity','related_parties','commitments','subsequent_events','going_concern','noncash_transactions','interim_changes'] LOOP
   IF v_key='interim_changes' AND p_config->>'kind'='annual' THEN CONTINUE; END IF;
   v_n:=NULL;SELECT value INTO v_n FROM jsonb_array_elements(p_config->'notes') WHERE value->>'code'=v_key;
   IF v_n IS NULL OR v_n->>'status'='pending' OR length(btrim(COALESCE(v_n->>'text','')))<20 OR length(btrim(COALESCE(v_n->>'evidence','')))<5
     OR (v_key IN ('entity','basis','policies','equity','going_concern') AND v_n->>'status'<>'complete') THEN
     v_findings:=v_findings||financial_statement_private.finding('disclosure_'||v_key||'_incomplete',
       'يلزم استكمال ومراجعة الإيضاح: '||v_key,'Disclosure must be completed with reviewed content and evidence: '||v_key);
   END IF;
 END LOOP;
 -- This historical posting convention requires explicit ledger correction; a report
 -- classification override cannot repair duplicated carryforward accounting.
 SELECT count(*) INTO v_count FROM public.journal_entries WHERE company_id=p_company AND entry_date<=v_end AND status='posted' AND reference_type='annual_close_opening';
 IF v_count>0 THEN v_findings:=v_findings||financial_statement_private.finding('carryforward_requires_review','توجد قيود ترحيل افتتاحية تستلزم مراجعة عدم تكرار الأرصدة','Annual opening carryforwards require verification against duplicate balances'); END IF;

 v_findings:=v_findings||(v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]');
 v_columns:=jsonb_build_array(jsonb_build_object('key','current','labelAr','الفترة الحالية','labelEn','Current','endDate',v_end),
   jsonb_build_object('key','comparison','labelAr','المقارنة','labelEn','Comparative','endDate',v_pc));
 IF v_third IS NOT NULL THEN v_columns:=v_columns||jsonb_build_array(jsonb_build_object('key','third','labelAr','افتتاح المقارنة','labelEn','Opening comparative','endDate',v_third)); END IF;
 v_rows:='[]';
 FOREACH v_group IN ARRAY ARRAY['current_assets','noncurrent_assets','unclassified_asset','assets_total',
   'current_liabilities','noncurrent_liabilities','unclassified_liability','liabilities_total','equity','unclassified_equity','equity_total','liabilities_equity_total','position_difference'] LOOP
   IF v_group IN ('current_assets','noncurrent_assets','current_liabilities','noncurrent_liabilities','equity') THEN
     v_section_ar:=CASE v_group WHEN 'current_assets' THEN 'الأصول المتداولة' WHEN 'noncurrent_assets' THEN 'الأصول غير المتداولة'
       WHEN 'current_liabilities' THEN 'الالتزامات المتداولة' WHEN 'noncurrent_liabilities' THEN 'الالتزامات غير المتداولة' ELSE 'حقوق الملكية' END;
     v_section_en:=CASE v_group WHEN 'current_assets' THEN 'Current assets' WHEN 'noncurrent_assets' THEN 'Non-current assets'
       WHEN 'current_liabilities' THEN 'Current liabilities' WHEN 'noncurrent_liabilities' THEN 'Non-current liabilities' ELSE 'Equity' END;
     v_values:=jsonb_build_array(NULL,NULL);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(NULL); END IF;
     v_rows:=v_rows||financial_statement_private.row(v_group,v_section_ar,v_section_en,v_values,'section');
     v_amount:=0;v_camount:=0;v_tamount:=0;
     FOR v_record IN SELECT * FROM financial_statement_private.catalog() WHERE financial_statement_private.position_group(key)=v_group LOOP
       v_values:=jsonb_build_array(COALESCE((v_cp->'values'->>v_record.key)::numeric,0),COALESCE((v_pp->'values'->>v_record.key)::numeric,0));
       v_amount:=v_amount+COALESCE((v_cp->'values'->>v_record.key)::numeric,0);v_camount:=v_camount+COALESCE((v_pp->'values'->>v_record.key)::numeric,0);
       IF v_third IS NOT NULL THEN
         v_values:=v_values||jsonb_build_array(COALESCE((v_tp->'values'->>v_record.key)::numeric,0));v_tamount:=v_tamount+COALESCE((v_tp->'values'->>v_record.key)::numeric,0);
       END IF;
       SELECT COALESCE(jsonb_agg(m->'accountId'),'[]') INTO v_accounts FROM jsonb_array_elements(p_config->'accountMappings') m
         WHERE m->>'positionLine'=v_record.key OR m->>'comparisonPositionLine'=v_record.key OR m->>'thirdPositionLine'=v_record.key
           OR m->'currentSplit'->>'line'=v_record.key OR m->'comparisonSplit'->>'line'=v_record.key OR m->'thirdSplit'->>'line'=v_record.key;
       SELECT COALESCE(jsonb_agg((n->>'number')::integer),'[]') INTO v_notes FROM jsonb_array_elements(p_config->'notes') n WHERE n->>'code'=v_record.note_code;
       v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.label_ar,v_record.label_en,v_values,'line',v_accounts,v_notes);
     END LOOP;
     IF v_group<>'equity' THEN
       v_values:=jsonb_build_array(v_amount,v_camount);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(v_tamount);END IF;
       v_rows:=v_rows||financial_statement_private.row(v_group||'_total','إجمالي '||v_section_ar,'Total '||lower(v_section_en),v_values,'subtotal');
     END IF;
   ELSIF v_group LIKE 'unclassified_%' THEN
     v_amount:=COALESCE((v_cp->'values'->>v_group)::numeric,0);v_camount:=COALESCE((v_pp->'values'->>v_group)::numeric,0);v_tamount:=COALESCE((v_tp->'values'->>v_group)::numeric,0);
     -- Keep unclassified source amounts visible even when opposite balances net to zero.
     SELECT COALESCE(jsonb_agg(DISTINCT f->'accountIds'->0),'[]') INTO v_accounts
       FROM jsonb_array_elements((v_cp->'findings')||(v_pp->'findings')||COALESCE(v_tp->'findings','[]')) f
       WHERE f->>'code'='position_mapping_missing' AND EXISTS(SELECT 1 FROM jsonb_array_elements(v_current->'accounts') a
         WHERE a->>'id'=f->'accountIds'->>0 AND 'unclassified_'||(a->>'type')=v_group);
     IF v_amount<>0 OR v_camount<>0 OR v_tamount<>0 OR jsonb_array_length(v_accounts)>0 THEN
       v_values:=jsonb_build_array(v_amount,v_camount);IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array(v_tamount);END IF;
       v_rows:=v_rows||financial_statement_private.row(v_group,'أرصدة غير مصنفة — يلزم المراجعة','Unclassified balances — review required',v_values,'line',v_accounts);
     END IF;
   ELSE
     v_col:=CASE v_group WHEN 'assets_total' THEN 'assets' WHEN 'liabilities_total' THEN 'liabilities' WHEN 'equity_total' THEN 'equity'
       WHEN 'liabilities_equity_total' THEN 'liabilitiesAndEquity' ELSE 'imbalance' END;
     v_ar:=CASE v_group WHEN 'assets_total' THEN 'إجمالي الأصول' WHEN 'liabilities_total' THEN 'إجمالي الالتزامات' WHEN 'equity_total' THEN 'إجمالي حقوق الملكية'
       WHEN 'liabilities_equity_total' THEN 'إجمالي الالتزامات وحقوق الملكية' ELSE 'فرق مطابقة المركز المالي' END;
     v_label:=CASE v_group WHEN 'assets_total' THEN 'Total assets' WHEN 'liabilities_total' THEN 'Total liabilities' WHEN 'equity_total' THEN 'Total equity'
       WHEN 'liabilities_equity_total' THEN 'Total liabilities and equity' ELSE 'Position reconciliation difference' END;
     v_values:=jsonb_build_array((v_current->'totals'->>v_col)::numeric,(v_comparison->'totals'->>v_col)::numeric);
     IF v_third IS NOT NULL THEN v_values:=v_values||jsonb_build_array((v_third_source->'totals'->>v_col)::numeric); END IF;
     v_rows:=v_rows||financial_statement_private.row(v_group,v_ar,v_label,v_values,CASE WHEN v_group='position_difference' THEN 'reconciliation' ELSE 'total' END);
   END IF;
 END LOOP;
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','position','titleAr','قائمة المركز المالي','titleEn','Statement of financial position','columns',v_columns,'rows',v_rows));

 -- Apply the independently reviewed comparative presentation to its equity matrix.
 SELECT jsonb_set(p_config,'{accountMappings}',COALESCE(jsonb_agg(m||jsonb_build_object('positionLine',COALESCE(m->>'comparisonPositionLine',m->>'positionLine'))),'[]'))
   INTO v_prior_config FROM jsonb_array_elements(p_config->'accountMappings') m;
 v_activity:=financial_statement_private.activity(p_company,v_start,v_end,p_config);
 v_ca:=financial_statement_private.activity(p_company,v_cs,v_ce,v_prior_config);
 v_findings:=v_findings||(v_activity->'findings')||(v_ca->'findings');
 IF (v_ca->>'postedEntries')::integer=0 OR (v_comparison->'totals'->>'postedEntries')::integer=0 THEN
   v_findings:=v_findings||financial_statement_private.finding('comparison_source_missing','مصدر المقارنة غير مكتمل؛ الأرصدة الصفرية لا تعني أنها مؤكدة','Comparative source is missing; calculated zero balances are not verified comparisons');
 END IF;
 IF (v_activity->>'postedEntries')::integer=0 THEN
   v_findings:=v_findings||financial_statement_private.finding('period_source_missing','لا توجد قيود مرحلة خلال فترة الأداء المحددة','No posted source journals exist in the performance period');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_config->'accountMappings') m WHERE COALESCE((m->>'isCashEquivalent')::boolean,false)) THEN
   v_findings:=v_findings||financial_statement_private.finding('cash_accounts_required','يلزم تحديد حسابات النقد وما في حكمه صراحة','Explicit cash and cash-equivalent account definitions are required');
 END IF;
 v_profit:=(v_activity->>'profit')::numeric;v_cprofit:=(v_ca->>'profit')::numeric;
 SELECT COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_reclassifiable:%'),0),COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_nonreclassifiable:%'),0)
   INTO v_oci1,v_oci2 FROM jsonb_each_text(v_activity->'equity');
 SELECT COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_reclassifiable:%'),0),COALESCE(sum(value::numeric) FILTER(WHERE key LIKE 'oci_nonreclassifiable:%'),0)
   INTO v_coci1,v_coci2 FROM jsonb_each_text(v_ca->'equity');
 v_columns:=jsonb_build_array(jsonb_build_object('key','current','labelAr','الفترة الحالية','labelEn','Current','startDate',v_start,'endDate',v_end),
   jsonb_build_object('key','comparison','labelAr','الفترة المقارنة','labelEn','Comparative','startDate',v_cs,'endDate',v_ce));
 v_rows:='[]';
 FOR v_record IN SELECT * FROM financial_statement_private.catalog() WHERE category='income' AND key<>'income_tax' LOOP
   SELECT COALESCE(jsonb_agg(m->'accountId'),'[]') INTO v_accounts FROM jsonb_array_elements(p_config->'accountMappings') m WHERE m->>'incomeLine'=v_record.key;
   SELECT COALESCE(jsonb_agg((n->>'number')::integer),'[]') INTO v_notes FROM jsonb_array_elements(p_config->'notes') n WHERE n->>'code'=v_record.note_code;
   v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.label_ar,v_record.label_en,
     jsonb_build_array(COALESCE((v_activity->'income'->>v_record.key)::numeric,0),COALESCE((v_ca->'income'->>v_record.key)::numeric,0)),'line',v_accounts,v_notes);
 END LOOP;
 SELECT COALESCE(jsonb_agg(DISTINCT f->'accountIds'->0),'[]') INTO v_accounts
   FROM jsonb_array_elements((v_activity->'findings')||(v_ca->'findings')) f WHERE f->>'code'='income_mapping_missing';
 IF jsonb_array_length(v_accounts)>0 THEN
   v_rows:=v_rows||financial_statement_private.row('unclassified_income','دخل ومصروفات غير مصنفة — يلزم المراجعة','Unclassified income and expenses — review required',
     jsonb_build_array(COALESCE((v_activity->'income'->>'unclassified_income')::numeric,0),COALESCE((v_ca->'income'->>'unclassified_income')::numeric,0)),'line',v_accounts);
 END IF;
 v_rows:=v_rows||financial_statement_private.row('profit_before_tax','الربح قبل الضريبة','Profit before tax',jsonb_build_array(
   v_profit-COALESCE((v_activity->'income'->>'income_tax')::numeric,0),v_cprofit-COALESCE((v_ca->'income'->>'income_tax')::numeric,0)),'subtotal');
 v_rows:=v_rows||financial_statement_private.row('income_tax','ضريبة الدخل','Income tax',jsonb_build_array(COALESCE((v_activity->'income'->>'income_tax')::numeric,0),COALESCE((v_ca->'income'->>'income_tax')::numeric,0)));
 v_rows:=v_rows||financial_statement_private.row('profit','ربح أو خسارة الفترة','Profit or loss',jsonb_build_array(v_profit,v_cprofit),'total');
 v_rows:=v_rows||financial_statement_private.row('oci_reclassifiable','دخل شامل آخر قابل لإعادة التصنيف','Other comprehensive income that may be reclassified',jsonb_build_array(v_oci1,v_coci1));
 v_rows:=v_rows||financial_statement_private.row('oci_nonreclassifiable','دخل شامل آخر غير قابل لإعادة التصنيف','Other comprehensive income not reclassified',jsonb_build_array(v_oci2,v_coci2));
 v_rows:=v_rows||financial_statement_private.row('total_comprehensive_income','إجمالي الدخل الشامل','Total comprehensive income',jsonb_build_array(v_profit+v_oci1+v_oci2,v_cprofit+v_coci1+v_coci2),'total');
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','profit_loss_oci','titleAr','قائمة الربح أو الخسارة والدخل الشامل الآخر','titleEn','Statement of profit or loss and other comprehensive income','columns',v_columns,'rows',v_rows));

 SELECT jsonb_set(p_config,'{accountMappings}',COALESCE(jsonb_agg(m||jsonb_build_object('currentSplit',NULL,'comparisonSplit',NULL,'thirdSplit',NULL)),'[]'))
   INTO v_unsplit_config FROM jsonb_array_elements(p_config->'accountMappings') m;
 v_op:=financial_statement_private.equity_values(v_open,p_config,'comparison');
 v_cop:=financial_statement_private.equity_values(v_co,CASE WHEN v_third IS NOT NULL THEN p_config ELSE v_unsplit_config END,
   CASE WHEN v_third IS NOT NULL THEN 'third' ELSE 'comparison' END);
 -- A fixed year-end split is not a classification amount at an earlier YTD cutoff.
 v_ccp:=financial_statement_private.equity_values(v_cc,CASE WHEN v_ce=v_pc THEN p_config ELSE v_unsplit_config END,'comparison');
 v_findings:=v_findings||(v_op->'findings')||(v_cop->'findings')||(v_ccp->'findings');
 -- An explicit change in an equity presentation column is a zero-total transfer,
 -- separately from ledger movements. It never changes the underlying account balance.
 v_reclass:=financial_statement_private.equity_values(v_open,v_unsplit_config,'current');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
   v_amount:=COALESCE((v_reclass->'values'->>v_col)::numeric,0)-COALESCE((v_op->'values'->>v_col)::numeric,0);
   v_activity:=jsonb_set(v_activity,'{equity}',financial_statement_private.add_amount(v_activity->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_current,v_unsplit_config,'current');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
   v_amount:=COALESCE((v_cp->'values'->>v_col)::numeric,0)-COALESCE((v_reclass->'values'->>v_col)::numeric,0);
   v_activity:=jsonb_set(v_activity,'{equity}',financial_statement_private.add_amount(v_activity->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_co,v_unsplit_config,'comparison');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
   v_amount:=COALESCE((v_reclass->'values'->>v_col)::numeric,0)-COALESCE((v_cop->'values'->>v_col)::numeric,0);
   v_ca:=jsonb_set(v_ca,'{equity}',financial_statement_private.add_amount(v_ca->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_reclass:=financial_statement_private.equity_values(v_cc,v_unsplit_config,'comparison');
 FOR v_col IN SELECT key FROM financial_statement_private.catalog() WHERE category='equity' LOOP
   v_amount:=COALESCE((v_ccp->'values'->>v_col)::numeric,0)-COALESCE((v_reclass->'values'->>v_col)::numeric,0);
   v_ca:=jsonb_set(v_ca,'{equity}',financial_statement_private.add_amount(v_ca->'equity','transfers:'||v_col,v_amount));
 END LOOP;
 v_eq:=financial_statement_private.equity_statement('equity_current',v_op->'values',v_cp->'values',v_activity,v_start,v_end);
 v_ceq:=financial_statement_private.equity_statement('equity_comparative',v_cop->'values',v_ccp->'values',v_ca,v_cs,v_ce);
 IF (v_eq->>'difference')::numeric>0.005 OR (v_ceq->>'difference')::numeric>0.005 THEN
   v_findings:=v_findings||financial_statement_private.finding('equity_reconciliation_difference','حركة حقوق الملكية لا تتطابق مع مكوناتها في دفتر الأستاذ','Changes in equity do not reconcile by component to the ledger');
 END IF;
 v_statements:=v_statements||jsonb_build_array(v_eq->'statement',v_ceq->'statement');
 v_cash_open:=financial_statement_private.cash_balance(v_open,p_config);v_cash_close:=financial_statement_private.cash_balance(v_current,p_config);
 v_ccash_open:=financial_statement_private.cash_balance(v_co,p_config);v_ccash_close:=financial_statement_private.cash_balance(v_cc,p_config);
 SELECT COALESCE(sum(value::numeric),0) INTO v_cash_net FROM jsonb_each_text(v_activity->'cash');
 SELECT COALESCE(sum(value::numeric),0) INTO v_ccash_net FROM jsonb_each_text(v_ca->'cash');
 v_diff:=v_cash_open+v_cash_net-v_cash_close;v_cdiff:=v_ccash_open+v_ccash_net-v_ccash_close;
 IF abs(v_diff)>0.005 OR abs(v_cdiff)>0.005 THEN v_findings:=v_findings||financial_statement_private.finding('cash_flow_reconciliation_difference','التدفقات النقدية لا تتطابق مع أرصدة النقد بدفتر الأستاذ','Cash flows do not reconcile to opening and closing ledger cash'); END IF;
 v_rows:='[]';
 FOREACH v_key IN ARRAY ARRAY['opening','operating','investing','financing','exchange','net_change','closing','ledger_closing','difference'] LOOP
   IF v_key IN ('operating','investing','financing','exchange') THEN
     FOR v_record IN
       SELECT COALESCE(c.key,p.key) AS key,COALESCE(c.value,p.value) AS detail,
         COALESCE((c.value->>'amount')::numeric,0) AS amount,COALESCE((p.value->>'amount')::numeric,0) AS comparison_amount
       FROM jsonb_each(v_activity->'cashDetails') c FULL JOIN jsonb_each(v_ca->'cashDetails') p ON p.key=c.key
       WHERE COALESCE(c.value->>'category',p.value->>'category')=v_key
       ORDER BY CASE WHEN COALESCE(c.key,p.key) LIKE '%_receipts_%' THEN 0 ELSE 1 END,COALESCE(c.key,p.key)
     LOOP
       v_rows:=v_rows||financial_statement_private.row(v_record.key,v_record.detail->>'labelAr',v_record.detail->>'labelEn',
         jsonb_build_array(v_record.amount,v_record.comparison_amount),'line',v_record.detail->'accountIds');
     END LOOP;
   END IF;
   v_amount:=CASE v_key WHEN 'opening' THEN v_cash_open WHEN 'net_change' THEN v_cash_net WHEN 'closing' THEN v_cash_open+v_cash_net
     WHEN 'ledger_closing' THEN v_cash_close WHEN 'difference' THEN v_diff ELSE COALESCE((v_activity->'cash'->>v_key)::numeric,0) END;
   v_camount:=CASE v_key WHEN 'opening' THEN v_ccash_open WHEN 'net_change' THEN v_ccash_net WHEN 'closing' THEN v_ccash_open+v_ccash_net
     WHEN 'ledger_closing' THEN v_ccash_close WHEN 'difference' THEN v_cdiff ELSE COALESCE((v_ca->'cash'->>v_key)::numeric,0) END;
   v_label:=CASE v_key WHEN 'opening' THEN 'Opening cash and cash equivalents' WHEN 'operating' THEN 'Net operating cash flows'
     WHEN 'investing' THEN 'Net investing cash flows' WHEN 'financing' THEN 'Net financing cash flows' WHEN 'exchange' THEN 'Effect of exchange rate changes'
     WHEN 'net_change' THEN 'Net change in cash and cash equivalents' WHEN 'closing' THEN 'Closing cash and cash equivalents'
     WHEN 'ledger_closing' THEN 'Ledger closing cash' ELSE 'Cash reconciliation difference' END;
   v_ar:=CASE v_key WHEN 'opening' THEN 'النقد وما في حكمه أول الفترة' WHEN 'operating' THEN 'صافي التدفقات من الأنشطة التشغيلية'
     WHEN 'investing' THEN 'صافي التدفقات من الأنشطة الاستثمارية' WHEN 'financing' THEN 'صافي التدفقات من الأنشطة التمويلية' WHEN 'exchange' THEN 'أثر تغير أسعار الصرف'
     WHEN 'net_change' THEN 'صافي التغير في النقد وما في حكمه' WHEN 'closing' THEN 'النقد وما في حكمه آخر الفترة'
     WHEN 'ledger_closing' THEN 'النقد الختامي بدفتر الأستاذ' ELSE 'فرق مطابقة التدفقات النقدية' END;
   v_rows:=v_rows||financial_statement_private.row(v_key,v_ar,v_label,jsonb_build_array(v_amount,v_camount),
     CASE WHEN v_key IN ('ledger_closing','difference') THEN 'reconciliation' WHEN v_key IN ('net_change','closing') THEN 'total'
       WHEN v_key IN ('operating','investing','financing','exchange') THEN 'subtotal' ELSE 'line' END);
 END LOOP;
 v_statements:=v_statements||jsonb_build_array(jsonb_build_object('key','cash_flow','titleAr','قائمة التدفقات النقدية','titleEn','Statement of cash flows','columns',v_columns,'rows',v_rows));
 v_journals:=(v_activity->'journals')||(v_ca->'journals');
 v_hash:=encode(sha256(convert_to(jsonb_build_object('version',1,'configuration',p_config,'positionFingerprint',v_position->>'fingerprint',
   'opening',v_co->'source','comparisonEnd',v_cc->'source','third',v_third_source->'source','journals',v_journals)::text,'UTF8')),'hex');
 RETURN jsonb_build_object('version',1,'company',v_position->'company','configuration',p_config,'generatedAt',statement_timestamp(),
   'fingerprint',v_hash,'position',v_position,'statements',v_statements,'findings',v_findings,'journals',v_journals,'permissions',v_position->'permissions');
END;
$f$;

CREATE FUNCTION financial_statement_private.get_report(p_company uuid,p_configuration jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF NOT balance_sheet_private.has_access(p_company,'view') THEN RAISE EXCEPTION 'Not authorized to view financial statements' USING ERRCODE='42501'; END IF;
 RETURN financial_statement_private.calculate(p_company,p_configuration);
END;
$f$;
CREATE FUNCTION financial_statement_private.save_report(p_company uuid,p_configuration jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE v_payload jsonb;v_row public.professional_financial_statement_packages%ROWTYPE;
BEGIN
 IF NOT balance_sheet_private.has_access(p_company,'save') THEN RAISE EXCEPTION 'Not authorized to save financial statements' USING ERRCODE='42501'; END IF;
 v_payload:=financial_statement_private.calculate(p_company,p_configuration);
 INSERT INTO public.professional_financial_statement_packages(company_id,payload,source_fingerprint,created_by,created_by_name)
 VALUES(p_company,v_payload,v_payload->>'fingerprint',auth.uid(),balance_sheet_private.actor_name(p_company)) RETURNING * INTO v_row;
 INSERT INTO financial_statement_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
 VALUES(v_row.id,p_company,'created',auth.uid(),p_configuration->>'preparationNotes',v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$f$;
CREATE FUNCTION financial_statement_private.approve_report(p_id uuid,p_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='5s' AS $f$
DECLARE v_row public.professional_financial_statement_packages%ROWTYPE;v_current jsonb;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Financial statement approval requires read committed isolation' USING ERRCODE='25001';
 END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM public.professional_financial_statement_packages WHERE id=p_id AND company_id=public.get_user_company_id() FOR UPDATE;
 IF NOT FOUND OR NOT balance_sheet_private.has_access(v_row.company_id,'approve') THEN RAISE EXCEPTION 'Not authorized to approve financial statements' USING ERRCODE='42501'; END IF;
 IF v_row.created_by=auth.uid() THEN RAISE EXCEPTION 'Generator cannot approve their own financial statements' USING ERRCODE='42501'; END IF;
 IF v_row.status<>'draft' THEN RAISE EXCEPTION 'Only draft financial statements can be approved' USING ERRCODE='22023'; END IF;
 IF p_notes IS NULL OR length(btrim(p_notes))<20 OR length(p_notes)>10000 THEN RAISE EXCEPTION 'Review notes of 20 to 10000 characters are required' USING ERRCODE='22023'; END IF;
 IF p_confirmations IS NULL OR NOT(p_confirmations @> '{"classifications":true,"policies":true,"reconciliations":true,"disclosures":true,"periodCutoff":true}') THEN
   RAISE EXCEPTION 'All five financial statement confirmations are required' USING ERRCODE='22023';
 END IF;
 LOCK TABLE public.companies,public.chart_of_accounts,public.journal_entries,public.journal_entry_lines,public.vehicles IN SHARE MODE;
 v_current:=financial_statement_private.calculate(v_row.company_id,v_row.payload->'configuration');
 IF v_current->>'fingerprint' IS DISTINCT FROM v_row.source_fingerprint THEN RAISE EXCEPTION 'Financial statement source changed; save and review a new version' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_current->'findings') f WHERE f->>'severity'='error') THEN
   RAISE EXCEPTION 'Financial statements have blocking review findings' USING ERRCODE='22023';
 END IF;
 UPDATE public.professional_financial_statement_packages SET status='approved',approved_by=auth.uid(),approved_by_name=balance_sheet_private.actor_name(v_row.company_id),
   approved_at=clock_timestamp(),review_notes=btrim(p_notes),confirmations=p_confirmations WHERE id=p_id RETURNING * INTO v_row;
 INSERT INTO financial_statement_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
 VALUES(v_row.id,v_row.company_id,'approved',auth.uid(),btrim(p_notes),v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$f$;
CREATE FUNCTION financial_statement_private.list_reports(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
DECLARE v_rows jsonb;
BEGIN
 IF NOT balance_sheet_private.has_access(p_company,'view') THEN RAISE EXCEPTION 'Not authorized to view financial statements' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id),'[]') INTO v_rows FROM
   (SELECT * FROM public.professional_financial_statement_packages WHERE company_id=p_company ORDER BY created_at DESC,id LIMIT 50) r;
 RETURN v_rows;
END;
$f$;
CREATE FUNCTION financial_statement_private.void_report(p_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE v_row public.professional_financial_statement_packages%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM public.professional_financial_statement_packages WHERE id=p_id AND company_id=public.get_user_company_id() FOR UPDATE;
 IF NOT FOUND OR NOT balance_sheet_private.has_access(v_row.company_id,'view') OR NOT(
   (v_row.created_by=auth.uid() AND balance_sheet_private.has_access(v_row.company_id,'save')) OR balance_sheet_private.has_access(v_row.company_id,'approve')) THEN
   RAISE EXCEPTION 'Not authorized to void financial statements' USING ERRCODE='42501';
 END IF;
 IF v_row.status='voided' THEN RAISE EXCEPTION 'Financial statements are already voided' USING ERRCODE='22023'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason))<10 OR length(p_reason)>10000 THEN RAISE EXCEPTION 'A void reason of 10 to 10000 characters is required' USING ERRCODE='22023'; END IF;
 UPDATE public.professional_financial_statement_packages SET status='voided',voided_by=auth.uid(),voided_at=clock_timestamp(),void_reason=btrim(p_reason) WHERE id=p_id RETURNING * INTO v_row;
 INSERT INTO financial_statement_private.report_events(report_id,company_id,action,actor_id,reason,source_fingerprint)
 VALUES(v_row.id,v_row.company_id,'voided',auth.uid(),btrim(p_reason),v_row.source_fingerprint);
 RETURN to_jsonb(v_row);
END;
$f$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA financial_statement_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION financial_statement_private.get_report(uuid,jsonb),financial_statement_private.save_report(uuid,jsonb),
 financial_statement_private.approve_report(uuid,text,jsonb),financial_statement_private.list_reports(uuid),financial_statement_private.void_report(uuid,text) TO authenticated;

CREATE FUNCTION public.get_financial_statement_package_v1(p_company_id uuid,p_configuration jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $f$ SELECT financial_statement_private.get_report(p_company_id,p_configuration) $f$;
CREATE FUNCTION public.save_financial_statement_package_v1(p_company_id uuid,p_configuration jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $f$ SELECT financial_statement_private.save_report(p_company_id,p_configuration) $f$;
CREATE FUNCTION public.approve_financial_statement_package_v1(p_report_id uuid,p_review_notes text,p_confirmations jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $f$ SELECT financial_statement_private.approve_report(p_report_id,p_review_notes,p_confirmations) $f$;
CREATE FUNCTION public.list_financial_statement_packages_v1(p_company_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $f$ SELECT financial_statement_private.list_reports(p_company_id) $f$;
CREATE FUNCTION public.void_financial_statement_package_v1(p_report_id uuid,p_reason text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $f$ SELECT financial_statement_private.void_report(p_report_id,p_reason) $f$;
REVOKE ALL ON FUNCTION public.get_financial_statement_package_v1(uuid,jsonb),public.save_financial_statement_package_v1(uuid,jsonb),
 public.approve_financial_statement_package_v1(uuid,text,jsonb),public.list_financial_statement_packages_v1(uuid),public.void_financial_statement_package_v1(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_statement_package_v1(uuid,jsonb),public.save_financial_statement_package_v1(uuid,jsonb),
 public.approve_financial_statement_package_v1(uuid,text,jsonb),public.list_financial_statement_packages_v1(uuid),public.void_financial_statement_package_v1(uuid,text) TO authenticated;
COMMENT ON TABLE public.professional_financial_statement_packages IS 'Immutable server-calculated individual-entity financial statements. Internal approval is neither external audit certification nor an automatic assertion of IFRS compliance.';
NOTIFY pgrst,'reload schema';
COMMIT;
