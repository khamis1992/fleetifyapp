BEGIN;
SET LOCAL lock_timeout='5s';
CREATE SCHEMA IF NOT EXISTS contract_finance_private;
REVOKE ALL ON SCHEMA contract_finance_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA contract_finance_private TO authenticated;
CREATE TABLE contract_finance_private.no_claim_closures(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id),
 contract_id uuid NOT NULL REFERENCES public.contracts(id),
 request_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 10 AND 2000),
 revision text NOT NULL,
 preview jsonb NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,request_id)
);
ALTER TABLE contract_finance_private.no_claim_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON contract_finance_private.no_claim_closures FROM PUBLIC,anon,authenticated;
CREATE INDEX no_claim_closures_contract_idx ON contract_finance_private.no_claim_closures(company_id,contract_id,created_at DESC);

CREATE FUNCTION contract_finance_private.require_closure_access(p_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.company_id=p_company AND COALESCE(p.is_active,true)
 ) OR NOT public.is_finance_action_authorized(auth.uid(),p_company,ARRAY['finance.invoice.cancel'],
 ARRAY['super_admin','admin','company_admin','accountant']) THEN
  RAISE EXCEPTION 'لا تملك صلاحية اعتماد إقفال المطالبات في هذه الشركة' USING ERRCODE='42501';
 END IF;
END;$fn$;
REVOKE ALL ON FUNCTION contract_finance_private.require_closure_access(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION contract_finance_private.no_claim_snapshot(p_company uuid,p_contract uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE c public.contracts%ROWTYPE;s record;snap jsonb;targets jsonb:='[]';blockers jsonb:='[]';
 impact jsonb;invoice_facts jsonb;pending_count integer;total numeric:=0;item_ok boolean;
BEGIN
 SELECT * INTO STRICT c FROM public.contracts WHERE company_id=p_company AND id=p_contract;
 snap:=public.contract_financial_integrity_snapshot_internal_v1(p_company,p_contract);
 impact:=public.get_contract_cancellation_impact_v1(p_company,p_contract);
 IF lower(c.status) NOT IN('cancelled','canceled') THEN
  blockers:=blockers||jsonb_build_array('هذا الإجراء متاح للعقود الملغاة فقط. حدد قرار إلغاء العقد أولًا.');
 END IF;
 IF (snap->>'outstanding')::numeric>0.005 THEN
  blockers:=blockers||jsonb_build_array('توجد فواتير مفتوحة؛ يجب تسويتها قبل اعتماد عدم وجود مطالبات.');
 END IF;
 IF (snap->>'header_mismatch')::boolean OR EXISTS(
  SELECT 1 FROM jsonb_array_elements(snap->'issues') x WHERE x->>'code'<>'schedule_obligation_review'
 ) THEN
  blockers:=blockers||jsonb_build_array('توجد اختلافات مالية أخرى؛ اطلب المطابقة وعالجها قبل الإقفال.');
 END IF;
 IF (impact->>'open_penalty_count')::integer>0 THEN
  blockers:=blockers||jsonb_build_array('توجد مخالفات على العميل تحتاج تسوية مستقلة؛ إقفال الأقساط لا يسقطها.');
 END IF;
 IF EXISTS(SELECT 1 FROM public.penalties p WHERE p.company_id=p_company AND p.contract_id=p_contract
  AND p.responsibility_party IS NULL AND lower(COALESCE(p.payment_status,'')) NOT IN('paid','completed')
  AND lower(COALESCE(p.status,'')) NOT IN('handled','resolved','waived','transferred','cancelled','canceled','void','voided')) THEN
  blockers:=blockers||jsonb_build_array('توجد مخالفات لم تُحسم جهة مسؤوليتها؛ راجعها قبل اعتماد عدم وجود مطالبات.');
 END IF;
 SELECT count(*) INTO pending_count FROM public.payments p WHERE p.company_id=p_company
  AND (p.contract_id=p_contract OR p.invoice_id IN(SELECT id FROM public.invoices WHERE company_id=p_company AND contract_id=p_contract))
  AND lower(COALESCE(p.payment_status,'')) NOT IN('completed','paid','confirmed','cancelled','canceled','failed','void','voided','reversed','refunded');
 IF pending_count>0 THEN blockers:=blockers||jsonb_build_array('توجد دفعات غير مكتملة؛ احسمها قبل اعتماد الإقفال.'); END IF;
 FOR s IN
  SELECT sch.*,i.invoice_number,i.invoice_month,i.invoice_type,i.penalty_id,i.total_amount,
   i.status AS invoice_status,i.payment_status AS invoice_payment_status,i.journal_entry_id,j.reversal_entry_id,
   public.canonical_invoice_paid_amount(i.id,NULL) AS invoice_paid
  FROM public.contract_payment_schedules sch
  LEFT JOIN public.invoices i ON i.id=sch.cancelled_invoice_id AND i.company_id=p_company AND i.contract_id=p_contract
  LEFT JOIN public.journal_entries j ON j.id=i.journal_entry_id AND j.company_id=p_company
  WHERE sch.company_id=p_company AND sch.contract_id=p_contract
   AND public.financial_record_is_active_v1(sch.status) AND sch.financial_hold_reason IS NOT NULL
  ORDER BY sch.due_date,sch.id
 LOOP
  item_ok:=COALESCE(s.financial_hold_reason='cancelled_invoice_obligation_review'
   AND s.invoice_id IS NULL AND s.paid_amount=0 AND s.amount>0
   AND s.invoice_number IS NOT NULL AND s.penalty_id IS NULL AND s.invoice_type IN('sales','service')
   AND NOT public.financial_record_is_active_v1(s.invoice_status)
   AND NOT public.financial_record_is_active_v1(s.invoice_payment_status)
   AND s.invoice_month=s.due_date AND s.total_amount=s.amount AND s.invoice_paid=0
   AND (s.journal_entry_id IS NULL OR public.journal_entries_are_exact_reversals(s.journal_entry_id,s.reversal_entry_id)),false);
  targets:=targets||jsonb_build_array(jsonb_build_object('id',s.id,'due_date',s.due_date,'amount',s.amount,
   'invoice_id',s.cancelled_invoice_id,'invoice_number',s.invoice_number,'eligible',item_ok));
  total:=total+s.amount;
 END LOOP;
 IF jsonb_array_length(targets)=0 THEN blockers:=blockers||jsonb_build_array('لا توجد أقساط معلقة تحتاج هذا الإقفال.');
 ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(targets) x WHERE NOT (x->>'eligible')::boolean) THEN
  blockers:=blockers||jsonb_build_array('بعض الأقساط لا تطابق فاتورة إيجار ملغاة بلا سداد وعكس محاسبي صحيح؛ يلزم مراجعتها أولًا.');
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',i.id,'month',i.invoice_month,'amount',i.total_amount,
  'status',i.status,'payment_status',i.payment_status,'paid',public.canonical_invoice_paid_amount(i.id,NULL),
  'journal_id',i.journal_entry_id) ORDER BY i.id),'[]') INTO invoice_facts
 FROM public.invoices i WHERE i.company_id=p_company AND i.contract_id=p_contract;
 RETURN jsonb_build_object('version',1,'company_id',p_company,'contract_id',p_contract,
  'contract_number',c.contract_number,'contract_status',c.status,'eligible',jsonb_array_length(blockers)=0,
  'blockers',blockers,'canonical_paid',snap->'canonical_paid','outstanding',snap->'outstanding',
  'review_amount',total,'schedule_count',jsonb_array_length(targets),'schedules',targets,
  'open_penalty_amount',impact->'open_penalty_amount','pending_payment_count',pending_count,
  'revision',md5(jsonb_build_object('state',snap-'checked_at','end_date',c.end_date,'targets',targets,
   'invoices',invoice_facts,'penalties',impact,'pending',pending_count,'blockers',blockers)::text));
END;$fn$;
REVOKE ALL ON FUNCTION contract_finance_private.no_claim_snapshot(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION contract_finance_private.preview_no_claim_closure(p_company uuid,p_contract uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 PERFORM contract_finance_private.require_closure_access(p_company);
 RETURN contract_finance_private.no_claim_snapshot(p_company,p_contract);
EXCEPTION WHEN no_data_found THEN
 RAISE EXCEPTION 'العقد غير موجود في الشركة الحالية' USING ERRCODE='42501';
END;$fn$;
REVOKE ALL ON FUNCTION contract_finance_private.preview_no_claim_closure(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION contract_finance_private.preview_no_claim_closure(uuid,uuid) TO authenticated;

CREATE FUNCTION contract_finance_private.close_no_claim_closure(
 p_company uuid,p_contract uuid,p_revision text,p_request uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE preview jsonb;state jsonb;answer jsonb;old_request contract_finance_private.no_claim_closures%ROWTYPE;
 s public.contract_payment_schedules%ROWTYPE;after_s jsonb;d record;closure_id uuid:=gen_random_uuid();
 n integer:=0;amount_closed numeric:=0;marker text;
BEGIN
 PERFORM contract_finance_private.require_closure_access(p_company);
 IF p_request IS NULL OR p_revision IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 2000 THEN
  RAISE EXCEPTION 'أدخل سببًا واضحًا من 10 إلى 2000 حرف واعتمد معاينة حديثة.' USING ERRCODE='22023';
 END IF;
 -- Serialize retries before acquiring the same invoice -> contract locks as receipt commands.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_company::text||':'||p_request::text,0));
 SELECT * INTO old_request FROM contract_finance_private.no_claim_closures WHERE company_id=p_company AND request_id=p_request;
 IF FOUND THEN
  IF old_request.contract_id<>p_contract OR old_request.actor_id<>auth.uid()
   OR old_request.revision<>p_revision OR old_request.reason<>btrim(p_reason) THEN
   RAISE EXCEPTION 'استُخدم رقم الطلب لقرار مختلف؛ حدّث المعاينة.' USING ERRCODE='22023';
  END IF;
  RETURN old_request.result||jsonb_build_object('replayed',true);
 END IF;
 PERFORM 1 FROM public.invoices WHERE company_id=p_company AND contract_id=p_contract ORDER BY id FOR UPDATE NOWAIT;
 PERFORM 1 FROM public.contracts WHERE company_id=p_company AND id=p_contract FOR UPDATE NOWAIT;
 IF NOT FOUND THEN RAISE EXCEPTION 'العقد غير موجود في الشركة الحالية' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.contract_payment_schedules WHERE company_id=p_company AND contract_id=p_contract ORDER BY id FOR UPDATE NOWAIT;
 preview:=contract_finance_private.no_claim_snapshot(p_company,p_contract);
 IF preview->>'revision' IS DISTINCT FROM p_revision THEN
  RAISE EXCEPTION 'تغيرت بيانات العقد بعد المعاينة؛ حدّثها وراجع المبالغ مجددًا.' USING ERRCODE='40001';
 END IF;
 IF NOT (preview->>'eligible')::boolean THEN
  RAISE EXCEPTION '%',preview->'blockers'->>0 USING ERRCODE='23514';
 END IF;
 marker:='contract_no_claim:'||closure_id::text;
 FOR s IN SELECT sch.* FROM public.contract_payment_schedules sch
  WHERE sch.company_id=p_company AND sch.contract_id=p_contract
   AND sch.id IN(SELECT (x->>'id')::uuid FROM jsonb_array_elements(preview->'schedules') x)
  ORDER BY sch.due_date,sch.id
 LOOP
  UPDATE public.contract_payment_schedules SET status='cancelled',financial_hold_reason='resolved_no_current_claim',
   notes=concat_ws(E'\n',NULLIF(notes,''),'[إقفال بلا مطالبات '||closure_id::text||'] '||btrim(p_reason)),updated_at=now()
  WHERE id=s.id AND company_id=p_company RETURNING to_jsonb(contract_payment_schedules.*) INTO after_s;
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,after_value,metadata)
  VALUES(marker,'approved_no_current_claim',p_company,'contract_payment_schedules',s.id,to_jsonb(s),after_s,
   jsonb_build_object('closure_id',closure_id,'actor_id',auth.uid(),'reason',btrim(p_reason),
    'schedule_resolution','closed','block_billing_month',true,'decision','no_current_claim','source','contract_closure_ui'));
  n:=n+1;amount_closed:=amount_closed+s.amount;
 END LOOP;
 IF n<>(preview->>'schedule_count')::integer OR amount_closed<>(preview->>'review_amount')::numeric THEN
  RAISE EXCEPTION 'تغير نطاق الأقساط أثناء الإقفال؛ لم يُعتمد أي تعديل.' USING ERRCODE='40001';
 END IF;
 -- Independent customer penalties and open invoices were checked above.
 FOR d IN SELECT * FROM public.delinquent_customers WHERE company_id=p_company AND contract_id=p_contract FOR UPDATE LOOP
  INSERT INTO public.financial_data_repair_snapshots(migration_version,repair_key,company_id,entity_type,entity_id,before_value,metadata)
  VALUES(marker,'clear_resolved_delinquency_cache',p_company,'delinquent_customers',d.id,to_jsonb(d),jsonb_build_object('closure_id',closure_id));
  UPDATE public.delinquent_customers SET is_active=false,overdue_amount=0,late_penalty=0,violations_amount=0,total_debt=0,
   months_unpaid=0,days_overdue=0,last_updated_at=now() WHERE id=d.id AND company_id=p_company;
  UPDATE public.financial_data_repair_snapshots SET after_value=(SELECT to_jsonb(x) FROM public.delinquent_customers x WHERE x.id=d.id AND x.company_id=p_company)
   WHERE migration_version=marker AND company_id=p_company AND entity_type='delinquent_customers' AND entity_id=d.id;
 END LOOP;
 state:=public.reconcile_contract_financial_integrity_internal_v1(p_company,p_contract,false);
 IF state->>'status'<>'matched' OR (state->'snapshot'->>'outstanding')::numeric<>0
  OR (state->'snapshot'->>'review_amount')::numeric<>0
  OR (state->'snapshot'->>'canonical_paid')::numeric<>(preview->>'canonical_paid')::numeric THEN
  RAISE EXCEPTION 'لم تجتز الحالة التحقق النهائي؛ لم يُعتمد الإقفال.' USING ERRCODE='23514';
 END IF;
 UPDATE public.contract_financial_reconciliation_queue SET status='matched',last_result=state,checked_at=now(),attempts=0,last_error=NULL
 WHERE company_id=p_company AND contract_id=p_contract;
 answer:=jsonb_build_object('version',1,'company_id',p_company,'contract_id',p_contract,'closure_id',closure_id,
  'status','closed','closed_count',n,'closed_amount',amount_closed,'canonical_paid',preview->'canonical_paid','replayed',false);
 INSERT INTO contract_finance_private.no_claim_closures(id,company_id,contract_id,request_id,actor_id,reason,revision,preview,result)
 VALUES(closure_id,p_company,p_contract,p_request,auth.uid(),btrim(p_reason),p_revision,preview,answer);
 RETURN answer;
EXCEPTION WHEN lock_not_available THEN
 RAISE EXCEPTION 'تجري عملية مالية أخرى على العقد؛ انتظر ثم حدّث المعاينة.' USING ERRCODE='55P03';
END;$fn$;
REVOKE ALL ON FUNCTION contract_finance_private.close_no_claim_closure(uuid,uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION contract_finance_private.close_no_claim_closure(uuid,uuid,text,uuid,text) TO authenticated;

CREATE FUNCTION public.preview_contract_no_claim_closure_v1(p_company_id uuid,p_contract_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT contract_finance_private.preview_no_claim_closure(p_company_id,p_contract_id);
$fn$;
CREATE FUNCTION public.close_contract_no_claim_closure_v1(
 p_company_id uuid,p_contract_id uuid,p_revision text,p_request_id uuid,p_reason text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT contract_finance_private.close_no_claim_closure(p_company_id,p_contract_id,p_revision,p_request_id,p_reason);
$fn$;
REVOKE ALL ON FUNCTION public.preview_contract_no_claim_closure_v1(uuid,uuid),
 public.close_contract_no_claim_closure_v1(uuid,uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_contract_no_claim_closure_v1(uuid,uuid),
 public.close_contract_no_claim_closure_v1(uuid,uuid,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
