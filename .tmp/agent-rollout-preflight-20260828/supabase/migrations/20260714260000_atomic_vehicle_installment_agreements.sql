-- Create vehicle-financing agreements, allocations, and schedules together.

CREATE OR REPLACE FUNCTION public.create_vehicle_installment_agreement_v1(p_company_id uuid,p_data jsonb,p_actor_id uuid DEFAULT NULL)
RETURNS public.vehicle_installments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_row public.vehicle_installments%ROWTYPE; v_vehicle_id uuid; v_vendor_id uuid; v_vehicle_ids jsonb; v_is_multi boolean; v_index integer; v_count integer; v_amount numeric; v_schedule_amount numeric; v_interest numeric; v_start date; v_end date; v_agreement_date date; v_total numeric; v_down_payment numeric; v_principal_total numeric; v_principal numeric; v_remaining_principal numeric; v_allocated_total numeric;
BEGIN
 v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(COALESCE(p_data,'null'::jsonb))<>'object' OR NULLIF(BTRIM(COALESCE(p_data->>'agreement_number','')),'') IS NULL THEN RAISE EXCEPTION 'Agreement payload and number are required' USING ERRCODE='P0001'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':vehicle-installment:'||BTRIM(p_data->>'agreement_number'),0));
 SELECT * INTO v_row FROM public.vehicle_installments WHERE company_id=p_company_id AND agreement_number=BTRIM(p_data->>'agreement_number') ORDER BY created_at LIMIT 1;
 IF FOUND THEN RETURN v_row; END IF;
 v_vehicle_ids:=COALESCE(p_data->'vehicle_ids','[]'::jsonb); v_is_multi:=COALESCE(p_data->>'contract_type','')='multi_vehicle' OR jsonb_array_length(v_vehicle_ids)>1;
 v_vehicle_id:=NULLIF(p_data->>'vehicle_id','')::uuid; v_vendor_id:=NULLIF(p_data->>'vendor_id','')::uuid; v_count:=COALESCE((p_data->>'number_of_installments')::integer,0); v_amount:=COALESCE((p_data->>'installment_amount')::numeric,0); v_interest:=COALESCE((p_data->>'interest_rate')::numeric,0); v_start:=NULLIF(p_data->>'start_date','')::date; v_end:=NULLIF(p_data->>'end_date','')::date; v_agreement_date:=NULLIF(p_data->>'agreement_date','')::date; v_total:=COALESCE((p_data->>'total_amount')::numeric,0); v_down_payment:=COALESCE((p_data->>'down_payment')::numeric,0); v_principal_total:=v_total-v_down_payment;
 IF v_count<1 OR v_count>600 OR v_amount<=0 OR v_interest<0 OR v_start IS NULL OR v_end IS NULL OR v_end<v_start OR v_agreement_date IS NULL OR v_total<=0 OR v_down_payment<0 OR v_down_payment>=v_total OR v_amount*v_count+0.01<v_principal_total THEN RAISE EXCEPTION 'Agreement financial terms and dates are invalid' USING ERRCODE='P0001'; END IF;
 IF v_vendor_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.customers customer WHERE customer.id=v_vendor_id AND customer.company_id=p_company_id) THEN RAISE EXCEPTION 'Agreement vendor is outside the current company' USING ERRCODE='P0001'; END IF;
 IF NOT v_is_multi AND (v_vehicle_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id=v_vehicle_id AND v.company_id=p_company_id)) THEN RAISE EXCEPTION 'Agreement vehicle is outside the current company' USING ERRCODE='P0001'; END IF;
 IF v_is_multi AND (jsonb_array_length(v_vehicle_ids)<1 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(v_vehicle_ids) x(id) WHERE NOT EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id=x.id::uuid AND v.company_id=p_company_id))) THEN RAISE EXCEPTION 'One or more agreement vehicles are outside the current company' USING ERRCODE='P0001'; END IF;
 IF v_is_multi AND (jsonb_array_length(v_vehicle_ids)<>(SELECT count(DISTINCT x.id) FROM jsonb_array_elements_text(v_vehicle_ids) x(id)) OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(v_vehicle_ids) x(id) WHERE COALESCE((p_data->'vehicle_amounts'->>x.id)::numeric,0)<=0)) THEN RAISE EXCEPTION 'Vehicle allocations must be unique and positive' USING ERRCODE='P0001'; END IF;
 IF v_is_multi THEN SELECT COALESCE(sum((p_data->'vehicle_amounts'->>x.id)::numeric),0) INTO v_allocated_total FROM jsonb_array_elements_text(v_vehicle_ids) x(id); IF abs(v_allocated_total-v_total)>0.01 THEN RAISE EXCEPTION 'Vehicle allocations must equal the agreement total amount' USING ERRCODE='P0001'; END IF; END IF;
 INSERT INTO public.vehicle_installments(vendor_id,vehicle_id,agreement_number,total_amount,down_payment,installment_amount,number_of_installments,interest_rate,start_date,end_date,agreement_date,notes,status,contract_type,total_vehicles_count,company_id,created_by)
 VALUES(v_vendor_id,CASE WHEN v_is_multi THEN NULL ELSE v_vehicle_id END,BTRIM(p_data->>'agreement_number'),v_total,v_down_payment,v_amount,v_count,v_interest,v_start,v_end,v_agreement_date,NULLIF(BTRIM(COALESCE(p_data->>'notes','')),''),'active',CASE WHEN v_is_multi THEN 'multi_vehicle' ELSE 'single_vehicle' END,CASE WHEN v_is_multi THEN jsonb_array_length(v_vehicle_ids) ELSE 1 END,p_company_id,v_actor_id) RETURNING * INTO v_row;
 IF v_is_multi THEN
   INSERT INTO public.contract_vehicles(company_id,vehicle_installment_id,vehicle_id,allocated_amount)
   SELECT p_company_id,v_row.id,x.id::uuid,COALESCE((p_data->'vehicle_amounts'->>x.id)::numeric,0) FROM jsonb_array_elements_text(v_vehicle_ids) x(id);
 END IF;
 v_remaining_principal:=v_principal_total;
 FOR v_index IN 1..v_count LOOP
   v_principal:=CASE WHEN v_index=v_count THEN v_remaining_principal ELSE round(v_principal_total/v_count,2) END;
   v_schedule_amount:=CASE WHEN v_index=v_count THEN GREATEST(v_amount,v_principal) ELSE v_amount END;
   INSERT INTO public.vehicle_installment_schedules(company_id,installment_id,installment_number,due_date,amount,principal_amount,interest_amount,status,paid_amount)
   VALUES(p_company_id,v_row.id,v_index,(v_start+(v_index-1)*interval '1 month')::date,v_schedule_amount,v_principal,round(v_schedule_amount-v_principal,2),'pending',0);
   v_remaining_principal:=v_remaining_principal-v_principal;
 END LOOP;
 RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.create_vehicle_installment_agreement_v1(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_vehicle_installment_agreement_v1(uuid,jsonb,uuid) TO authenticated,service_role;
