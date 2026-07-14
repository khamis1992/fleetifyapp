-- Atomic legal conversion, reversal, case outcome, verification cancellation, and evidence retention.

ALTER TABLE public.legal_case_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.lawsuit_templates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(p_company_id uuid,p_contract_id uuid,p_notes text,p_priority text,p_case_type text,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_contract public.contracts%ROWTYPE; v_case public.legal_cases%ROWTYPE; v_case_number text; v_penalties numeric; v_name text; v_phone text; v_email text; v_vehicle_plate text; v_value numeric;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':legal-contract:'||p_contract_id::text,0));
 SELECT * INTO v_contract FROM public.contracts WHERE id=p_contract_id AND company_id=p_company_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Contract was not found' USING ERRCODE='P0001'; END IF;
 SELECT * INTO v_case FROM public.legal_cases WHERE company_id=p_company_id AND contract_id=p_contract_id AND lower(COALESCE(case_status,'')) IN('open','active','pending','on_hold','under_review') ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF FOUND THEN RETURN jsonb_build_object('legal_case',to_jsonb(v_case),'case_number',v_case.case_number,'total_case_value',v_case.case_value); END IF;
 SELECT COALESCE(NULLIF(company_name_ar,''),NULLIF(company_name,''),NULLIF(concat_ws(' ',first_name_ar,last_name_ar),''),NULLIF(concat_ws(' ',first_name,last_name),''),'عميل'),phone,email INTO v_name,v_phone,v_email FROM public.customers WHERE id=v_contract.customer_id AND company_id=p_company_id;
 IF NOT FOUND THEN v_name:='عميل'; v_phone:=NULL; v_email:=NULL; END IF;
 SELECT plate_number INTO v_vehicle_plate FROM public.vehicles WHERE id=v_contract.vehicle_id AND company_id=p_company_id;
 SELECT COALESCE(sum(amount),0) INTO v_penalties FROM public.penalties WHERE company_id=p_company_id AND contract_id=p_contract_id AND lower(COALESCE(payment_status,''))<>'paid' AND lower(COALESCE(status,''))<>'cancelled';
 v_value:=COALESCE(v_contract.balance_due,0)+COALESCE(v_contract.late_fine_amount,0)+v_penalties;
 v_case_number:=public.generate_legal_case_number(p_company_id);
 INSERT INTO public.legal_cases(company_id,contract_id,case_number,case_title,case_title_ar,case_type,case_status,priority,client_id,client_name,client_phone,client_email,case_value,description,notes,legal_fees,court_fees,other_expenses,total_costs,billing_status,is_confidential,legal_team,tags,filing_date,created_by)
 VALUES(p_company_id,p_contract_id,v_case_number,'تحصيل مستحقات عقد '||v_contract.contract_number,'تحصيل مستحقات عقد '||v_contract.contract_number,COALESCE(NULLIF(BTRIM(p_case_type),''),'payment_collection'),'pending',COALESCE(NULLIF(BTRIM(p_priority),''),'high'),v_contract.customer_id,v_name,v_phone,v_email,v_value,'قضية تحصيل مستحقات للعقد رقم '||v_contract.contract_number,concat_ws(E'\n','رقم العقد: '||v_contract.contract_number,'رقم لوحة المركبة: '||COALESCE(v_vehicle_plate,'-'),NULLIF(BTRIM(COALESCE(p_notes,'')),'')),0,0,0,0,'pending',false,'[]'::jsonb,jsonb_build_array('تحويل_من_عقد',v_contract.contract_number),CURRENT_DATE,v_actor_id) RETURNING * INTO v_case;
 UPDATE public.contracts SET status='under_legal_procedure',suspension_reason='تم التحويل للشؤون القانونية - قضية رقم '||v_case_number,updated_at=now() WHERE id=p_contract_id AND company_id=p_company_id;
 INSERT INTO public.contract_operations_log(contract_id,company_id,operation_type,operation_details,old_values,new_values,notes,performed_by)
 VALUES(p_contract_id,p_company_id,'convert_to_legal',jsonb_build_object('legal_case_id',v_case.id,'legal_case_number',v_case_number,'total_case_value',v_value),jsonb_build_object('status',v_contract.status),jsonb_build_object('status','under_legal_procedure'),'تم التحويل للشؤون القانونية',v_actor_id);
 RETURN jsonb_build_object('legal_case',to_jsonb(v_case),'case_number',v_case_number,'total_case_value',v_value);
END; $$;

CREATE OR REPLACE FUNCTION public.revert_contract_from_legal_v1(p_company_id uuid,p_contract_id uuid,p_reason text,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_contract public.contracts%ROWTYPE; v_state jsonb; v_target text; v_count integer;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 IF NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Reversal reason is required' USING ERRCODE='P0001'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':legal-contract:'||p_contract_id::text,0));
 SELECT * INTO v_contract FROM public.contracts WHERE id=p_contract_id AND company_id=p_company_id FOR UPDATE; IF NOT FOUND OR lower(COALESCE(v_contract.status::text,''))<>'under_legal_procedure' THEN RAISE EXCEPTION 'Contract is not under legal procedure' USING ERRCODE='P0001'; END IF;
 UPDATE public.legal_cases SET case_status='closed',notes=concat_ws(E'\n\n',NULLIF(notes,''),'تم إلغاء الإجراء القانوني: '||BTRIM(p_reason)),outcome_date=COALESCE(outcome_date,CURRENT_DATE),outcome_type=COALESCE(outcome_type,'withdrawn'),updated_at=now() WHERE company_id=p_company_id AND contract_id=p_contract_id AND lower(COALESCE(case_status,'')) IN('open','active','pending','on_hold','under_review'); GET DIAGNOSTICS v_count=ROW_COUNT;
 UPDATE public.contracts SET status='active',suspension_reason=NULL,updated_at=now() WHERE id=p_contract_id AND company_id=p_company_id;
 IF v_contract.vehicle_id IS NOT NULL THEN v_state:=public.system_agent_vehicle_derived_state(v_contract.vehicle_id,p_company_id); v_target:=v_state->>'target_status'; IF v_target IS NOT NULL THEN UPDATE public.vehicles SET status=v_target::public.vehicle_status,updated_at=now() WHERE id=v_contract.vehicle_id AND company_id=p_company_id; END IF; END IF;
 INSERT INTO public.contract_operations_log(contract_id,company_id,operation_type,operation_details,old_values,new_values,notes,performed_by) VALUES(p_contract_id,p_company_id,'revert_from_legal',jsonb_build_object('reason',BTRIM(p_reason),'closed_cases',v_count),jsonb_build_object('status',v_contract.status),jsonb_build_object('status','active'),'تم إلغاء الإجراء القانوني: '||BTRIM(p_reason),v_actor_id);
 RETURN jsonb_build_object('contract_id',p_contract_id,'closed_cases',v_count);
END; $$;

CREATE OR REPLACE FUNCTION public.close_legal_case_outcome_v1(p_company_id uuid,p_case_id uuid,p_case_direction text,p_outcome_type text,p_outcome_amount numeric,p_outcome_amount_type text,p_payment_direction text,p_outcome_date date,p_outcome_notes text,p_actor_id uuid DEFAULT NULL)
RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_case public.legal_cases%ROWTYPE;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 IF p_outcome_date IS NULL OR NULLIF(BTRIM(COALESCE(p_outcome_type,'')),'') IS NULL OR COALESCE(p_outcome_amount,0)<0 THEN RAISE EXCEPTION 'Outcome date, type, and non-negative amount are required' USING ERRCODE='P0001'; END IF;
 SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found' USING ERRCODE='P0001'; END IF;
 IF v_case.outcome_journal_entry_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.journal_entries j WHERE j.id=v_case.outcome_journal_entry_id AND j.company_id=p_company_id AND lower(COALESCE(j.status,''))='posted') THEN RAISE EXCEPTION 'Existing outcome journal is not posted' USING ERRCODE='P0001'; END IF;
 UPDATE public.legal_cases SET case_status='closed',case_direction=p_case_direction,outcome_type=BTRIM(p_outcome_type),outcome_amount=COALESCE(p_outcome_amount,0),outcome_amount_type=p_outcome_amount_type,payment_direction=p_payment_direction,outcome_date=p_outcome_date,outcome_notes=NULLIF(BTRIM(COALESCE(p_outcome_notes,'')),''),outcome_payment_status=CASE WHEN COALESCE(p_outcome_amount,0)>0 THEN 'pending' ELSE NULL END,updated_at=now() WHERE id=p_case_id AND company_id=p_company_id RETURNING * INTO v_case;
 INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,created_by) VALUES(p_case_id,p_company_id,'case_closed','تم إغلاق القضية','تم إغلاق القضية بنتيجة '||p_outcome_type||' والمبلغ '||COALESCE(p_outcome_amount,0)::text||' ر.ق. لم يُسجل نقد حتى إنشاء دفعة فعلية.',v_actor_id);
 RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_verified_contract_v1(p_company_id uuid,p_task_id uuid,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_task public.customer_verification_tasks%ROWTYPE; v_contract_id uuid;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_task FROM public.customer_verification_tasks WHERE id=p_task_id AND company_id=p_company_id FOR UPDATE; IF NOT FOUND OR v_task.contract_id IS NULL THEN RAISE EXCEPTION 'Verification task or contract was not found' USING ERRCODE='P0001'; END IF; v_contract_id:=v_task.contract_id;
 UPDATE public.contracts SET status='cancelled',updated_at=now() WHERE id=v_contract_id AND company_id=p_company_id;
 UPDATE public.delinquent_customers SET is_active=false,last_updated_at=now() WHERE contract_id=v_contract_id AND company_id=p_company_id;
 UPDATE public.customer_verification_tasks SET status='cancelled',updated_at=now() WHERE id=p_task_id AND company_id=p_company_id;
 RETURN jsonb_build_object('task_id',p_task_id,'contract_id',v_contract_id);
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_legal_document_v1(p_company_id uuid,p_document_id uuid,p_reason text,p_actor_id uuid DEFAULT NULL)
RETURNS public.legal_case_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_doc public.legal_case_documents%ROWTYPE;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 UPDATE public.legal_case_documents SET deleted_at=COALESCE(deleted_at,now()),deleted_by=COALESCE(deleted_by,v_actor_id),deletion_reason=COALESCE(deletion_reason,NULLIF(BTRIM(COALESCE(p_reason,'')),'')) WHERE id=p_document_id AND company_id=p_company_id RETURNING * INTO v_doc;
 IF v_doc.id IS NULL THEN RAISE EXCEPTION 'Legal document was not found' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,related_document_id,created_by) VALUES(v_doc.case_id,p_company_id,'document_deleted','تم أرشفة مستند','تم أرشفة المستند '||v_doc.document_title||' مع الاحتفاظ بدليل الحذف.',v_doc.id,v_actor_id);
 RETURN v_doc;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_legal_cases_v1(p_company_id uuid,p_case_ids uuid[],p_reason text,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_case public.legal_cases%ROWTYPE; v_state jsonb; v_target text; v_count integer:=0;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 IF COALESCE(cardinality(p_case_ids),0)=0 OR NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Case identifiers and cancellation reason are required' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_case_ids) requested(id) LEFT JOIN public.legal_cases legal_case ON legal_case.id=requested.id AND legal_case.company_id=p_company_id WHERE legal_case.id IS NULL) THEN RAISE EXCEPTION 'One or more legal cases are outside the current company' USING ERRCODE='42501'; END IF;
 FOR v_case IN SELECT * FROM public.legal_cases WHERE company_id=p_company_id AND id=ANY(p_case_ids) ORDER BY id FOR UPDATE LOOP
   IF lower(COALESCE(v_case.case_status,''))<>'cancelled' THEN
     UPDATE public.legal_cases SET case_status='cancelled',outcome_type=COALESCE(outcome_type,'withdrawn'),outcome_date=COALESCE(outcome_date,CURRENT_DATE),outcome_notes=concat_ws(E'\n',NULLIF(outcome_notes,''),BTRIM(p_reason)),updated_at=now() WHERE id=v_case.id AND company_id=p_company_id;
     INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,created_by) VALUES(v_case.id,p_company_id,'case_cancelled','تم إلغاء القضية','سبب الإلغاء: '||BTRIM(p_reason),v_actor_id);
     v_count:=v_count+1;
   END IF;
   IF v_case.contract_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.legal_cases other_case WHERE other_case.company_id=p_company_id AND other_case.contract_id=v_case.contract_id AND other_case.id<>v_case.id AND lower(COALESCE(other_case.case_status,'')) IN('open','active','pending','on_hold','under_review')) THEN
     UPDATE public.contracts SET status='active',suspension_reason=NULL,updated_at=now() WHERE id=v_case.contract_id AND company_id=p_company_id AND lower(COALESCE(status::text,''))='under_legal_procedure';
     SELECT public.system_agent_vehicle_derived_state(contract.vehicle_id,p_company_id) INTO v_state FROM public.contracts contract WHERE contract.id=v_case.contract_id AND contract.company_id=p_company_id AND contract.vehicle_id IS NOT NULL;
     v_target:=v_state->>'target_status';
     IF v_target IS NOT NULL THEN UPDATE public.vehicles vehicle SET status=v_target::public.vehicle_status,updated_at=now() FROM public.contracts contract WHERE contract.id=v_case.contract_id AND contract.vehicle_id=vehicle.id AND vehicle.company_id=p_company_id; END IF;
   END IF;
 END LOOP;
 RETURN jsonb_build_object('cancelled_cases',v_count);
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_lawsuit_template_v1(p_company_id uuid,p_template_id bigint,p_reason text,p_actor_id uuid DEFAULT NULL)
RETURNS public.lawsuit_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_template public.lawsuit_templates%ROWTYPE;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 UPDATE public.lawsuit_templates SET deleted_at=COALESCE(deleted_at,now()),deleted_by=COALESCE(deleted_by,v_actor_id),deletion_reason=COALESCE(deletion_reason,NULLIF(BTRIM(COALESCE(p_reason,'')),'')),updated_at=now() WHERE id=p_template_id AND company_id=p_company_id RETURNING * INTO v_template;
 IF v_template.id IS NULL THEN RAISE EXCEPTION 'Lawsuit template was not found' USING ERRCODE='P0001'; END IF;
 RETURN v_template;
END; $$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(uuid,uuid,text,text,text,uuid),public.revert_contract_from_legal_v1(uuid,uuid,text,uuid),public.close_legal_case_outcome_v1(uuid,uuid,text,text,numeric,text,text,date,text,uuid),public.cancel_verified_contract_v1(uuid,uuid,uuid),public.soft_delete_legal_document_v1(uuid,uuid,text,uuid),public.cancel_legal_cases_v1(uuid,uuid[],text,uuid),public.soft_delete_lawsuit_template_v1(uuid,bigint,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(uuid,uuid,text,text,text,uuid),public.revert_contract_from_legal_v1(uuid,uuid,text,uuid),public.close_legal_case_outcome_v1(uuid,uuid,text,text,numeric,text,text,date,text,uuid),public.cancel_verified_contract_v1(uuid,uuid,uuid),public.soft_delete_legal_document_v1(uuid,uuid,text,uuid),public.cancel_legal_cases_v1(uuid,uuid[],text,uuid),public.soft_delete_lawsuit_template_v1(uuid,bigint,text,uuid) TO authenticated,service_role;
