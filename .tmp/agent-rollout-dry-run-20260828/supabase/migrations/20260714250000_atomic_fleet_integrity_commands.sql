-- Canonical fleet commands used by both pages and the system agent.

CREATE OR REPLACE FUNCTION public.sync_company_vehicle_states_v1(p_company_id uuid, p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_id uuid; v_vehicle record; v_state jsonb; v_target text; v_status_count integer := 0; v_mileage_count integer := 0;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':fleet-state-sync', 0));
  FOR v_vehicle IN SELECT vehicle.id, vehicle.status, vehicle.current_mileage, vehicle.odometer_reading FROM public.vehicles vehicle WHERE vehicle.company_id=p_company_id AND vehicle.is_active=true FOR UPDATE LOOP
    v_state := public.system_agent_vehicle_derived_state(v_vehicle.id, p_company_id); v_target := v_state->>'target_status';
    IF v_target IS NOT NULL AND lower(COALESCE(v_vehicle.status::text,'')) <> lower(v_target) THEN
      UPDATE public.vehicles SET status=v_target::public.vehicle_status, updated_at=now() WHERE id=v_vehicle.id AND company_id=p_company_id; v_status_count:=v_status_count+1;
    END IF;
    IF (v_state->>'maximum_mileage')::numeric > GREATEST(COALESCE(v_vehicle.current_mileage,0),COALESCE(v_vehicle.odometer_reading,0)) THEN
      UPDATE public.vehicles SET current_mileage=(v_state->>'maximum_mileage')::numeric, odometer_reading=(v_state->>'maximum_mileage')::numeric, updated_at=now() WHERE id=v_vehicle.id AND company_id=p_company_id; v_mileage_count:=v_mileage_count+1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('status_updates',v_status_count,'mileage_updates',v_mileage_count,'contracts_linked',0);
END; $$;
CREATE OR REPLACE FUNCTION public.deactivate_vehicle_v1(p_company_id uuid,p_vehicle_id uuid,p_reason text,p_actor_id uuid DEFAULT NULL)
RETURNS public.vehicles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_vehicle public.vehicles%ROWTYPE;
BEGIN
  v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
  IF NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Deactivation reason is required' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_vehicle FROM public.vehicles WHERE id=p_vehicle_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle was not found' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM public.contracts c WHERE c.company_id=p_company_id AND c.vehicle_id=p_vehicle_id AND lower(COALESCE(c.status::text,'')) IN ('active','under_legal_procedure'))
    OR EXISTS(SELECT 1 FROM public.vehicle_maintenance m WHERE m.company_id=p_company_id AND m.vehicle_id=p_vehicle_id AND lower(COALESCE(m.status::text,''))='in_progress')
    OR EXISTS(SELECT 1 FROM public.vehicle_reservations r WHERE r.company_id=p_company_id AND r.vehicle_id=p_vehicle_id AND lower(COALESCE(r.status::text,'')) NOT IN('cancelled','canceled','completed','expired') AND r.end_date>=CURRENT_DATE)
  THEN RAISE EXCEPTION 'Vehicle has an active contract, maintenance, or reservation and cannot be deactivated' USING ERRCODE='P0001'; END IF;
  UPDATE public.vehicles SET is_active=false,status='out_of_service'::public.vehicle_status,notes=concat_ws(E'\n',NULLIF(notes,''),'Deactivated: '||BTRIM(p_reason)),updated_at=now() WHERE id=p_vehicle_id AND company_id=p_company_id RETURNING * INTO v_vehicle;
  RETURN v_vehicle;
END; $$;
CREATE OR REPLACE FUNCTION public.record_odometer_reading_v1(
 p_company_id uuid,p_vehicle_id uuid,p_odometer_reading numeric,p_fuel_level_percentage numeric,p_reading_type text,
 p_contract_id uuid,p_permit_id uuid,p_notes text,p_location text,p_actor_id uuid DEFAULT NULL
) RETURNS public.odometer_readings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_vehicle public.vehicles%ROWTYPE; v_current numeric; v_row public.odometer_readings%ROWTYPE;
BEGIN
 v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_vehicle FROM public.vehicles WHERE id=p_vehicle_id AND company_id=p_company_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle was not found' USING ERRCODE='P0001'; END IF;
 SELECT GREATEST(COALESCE(v_vehicle.current_mileage,0),COALESCE(v_vehicle.odometer_reading,0),COALESCE(max(r.odometer_reading),0)) INTO v_current FROM public.odometer_readings r WHERE r.company_id=p_company_id AND r.vehicle_id=p_vehicle_id;
 IF p_odometer_reading IS NULL OR p_odometer_reading<=0 OR p_odometer_reading<v_current THEN RAISE EXCEPTION 'Odometer reading cannot be below %',v_current USING ERRCODE='P0001'; END IF;
 IF p_contract_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=p_contract_id AND c.company_id=p_company_id AND c.vehicle_id=p_vehicle_id) THEN RAISE EXCEPTION 'Odometer contract does not match the vehicle' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.odometer_readings(company_id,vehicle_id,reading_date,odometer_reading,fuel_level_percentage,reading_type,recorded_by,contract_id,permit_id,notes,location,is_verified)
 VALUES(p_company_id,p_vehicle_id,now(),p_odometer_reading,p_fuel_level_percentage,p_reading_type,v_actor_id,p_contract_id,p_permit_id,NULLIF(BTRIM(COALESCE(p_notes,'')),''),NULLIF(BTRIM(COALESCE(p_location,'')),''),false) RETURNING * INTO v_row;
 UPDATE public.vehicles SET odometer_reading=p_odometer_reading,current_mileage=GREATEST(COALESCE(current_mileage,0),p_odometer_reading),updated_at=now() WHERE id=p_vehicle_id AND company_id=p_company_id;
 RETURN v_row;
END; $$;
CREATE OR REPLACE FUNCTION public.save_vehicle_reservation_v1(
 p_company_id uuid,p_reservation_id uuid,p_vehicle_id uuid,p_customer_name text,p_start_date date,p_end_date date,p_status text,p_notes text,p_actor_id uuid DEFAULT NULL
) RETURNS public.vehicle_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_vehicle public.vehicles%ROWTYPE; v_row public.vehicle_reservations%ROWTYPE; v_id uuid:=COALESCE(p_reservation_id,gen_random_uuid());
BEGIN
 v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 IF p_start_date IS NULL OR p_end_date<p_start_date OR NULLIF(BTRIM(COALESCE(p_customer_name,'')),'') IS NULL THEN RAISE EXCEPTION 'Reservation dates and customer are required' USING ERRCODE='P0001'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':reservation:'||p_vehicle_id::text,0));
 SELECT * INTO v_vehicle FROM public.vehicles WHERE id=p_vehicle_id AND company_id=p_company_id AND is_active=true FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle was not found or is inactive' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.vehicle_reservations r WHERE r.company_id=p_company_id AND r.vehicle_id=p_vehicle_id AND r.id<>v_id AND lower(COALESCE(r.status::text,'')) NOT IN('cancelled','canceled','completed','expired') AND daterange(r.start_date,r.end_date,'[]')&&daterange(p_start_date,p_end_date,'[]'))
   OR EXISTS(SELECT 1 FROM public.contracts c WHERE c.company_id=p_company_id AND c.vehicle_id=p_vehicle_id AND lower(COALESCE(c.status::text,'')) IN('active','under_legal_procedure') AND daterange(c.start_date,COALESCE(c.end_date,'infinity'::date),'[]')&&daterange(p_start_date,p_end_date,'[]'))
 THEN RAISE EXCEPTION 'Vehicle already has an overlapping reservation or contract' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.vehicle_reservations(id,company_id,vehicle_id,customer_name,vehicle_plate,vehicle_make,vehicle_model,start_date,end_date,hold_until,status,notes)
 VALUES(v_id,p_company_id,p_vehicle_id,BTRIM(p_customer_name),v_vehicle.plate_number,v_vehicle.make,v_vehicle.model,p_start_date,p_end_date,now()+interval '24 hours',COALESCE(NULLIF(BTRIM(p_status),''),'pending'),NULLIF(BTRIM(COALESCE(p_notes,'')),''))
 ON CONFLICT(id) DO UPDATE SET vehicle_id=EXCLUDED.vehicle_id,customer_name=EXCLUDED.customer_name,vehicle_plate=EXCLUDED.vehicle_plate,vehicle_make=EXCLUDED.vehicle_make,vehicle_model=EXCLUDED.vehicle_model,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,status=EXCLUDED.status,notes=EXCLUDED.notes,updated_at=now()
 WHERE vehicle_reservations.company_id=p_company_id RETURNING * INTO v_row;
 IF v_row.id IS NULL THEN RAISE EXCEPTION 'Reservation is outside the current company' USING ERRCODE='42501'; END IF;
 RETURN v_row;
END; $$;
CREATE OR REPLACE FUNCTION public.cancel_vehicle_reservation_v1(p_company_id uuid,p_reservation_id uuid,p_actor_id uuid DEFAULT NULL)
RETURNS public.vehicle_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_row public.vehicle_reservations%ROWTYPE;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 UPDATE public.vehicle_reservations SET status='cancelled',updated_at=now() WHERE id=p_reservation_id AND company_id=p_company_id AND lower(COALESCE(status::text,'')) NOT IN('completed','cancelled','canceled') RETURNING * INTO v_row;
 IF v_row.id IS NULL THEN RAISE EXCEPTION 'Reservation cannot be cancelled or is outside the current company' USING ERRCODE='P0001'; END IF; RETURN v_row;
END; $$;
CREATE OR REPLACE FUNCTION public.complete_vehicle_maintenance_v1(p_company_id uuid,p_maintenance_id uuid,p_actor_id uuid DEFAULT NULL)
RETURNS public.vehicle_maintenance LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; v_row public.vehicle_maintenance%ROWTYPE; v_state jsonb; v_target text;
BEGIN v_actor_id:=CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
 IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_row FROM public.vehicle_maintenance WHERE id=p_maintenance_id AND company_id=p_company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Maintenance was not found' USING ERRCODE='P0001'; END IF;
 UPDATE public.vehicle_maintenance SET status='completed',completed_date=COALESCE(completed_date,CURRENT_DATE),updated_at=now() WHERE id=v_row.id AND company_id=p_company_id RETURNING * INTO v_row;
 v_state:=public.system_agent_vehicle_derived_state(v_row.vehicle_id,p_company_id); v_target:=v_state->>'target_status';
 IF v_target IS NOT NULL THEN UPDATE public.vehicles SET status=v_target::public.vehicle_status,updated_at=now() WHERE id=v_row.vehicle_id AND company_id=p_company_id; END IF;
 RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.sync_company_vehicle_states_v1(uuid,uuid),public.deactivate_vehicle_v1(uuid,uuid,text,uuid),public.record_odometer_reading_v1(uuid,uuid,numeric,numeric,text,uuid,uuid,text,text,uuid),public.save_vehicle_reservation_v1(uuid,uuid,uuid,text,date,date,text,text,uuid),public.cancel_vehicle_reservation_v1(uuid,uuid,uuid),public.complete_vehicle_maintenance_v1(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_company_vehicle_states_v1(uuid,uuid),public.deactivate_vehicle_v1(uuid,uuid,text,uuid),public.record_odometer_reading_v1(uuid,uuid,numeric,numeric,text,uuid,uuid,text,text,uuid),public.save_vehicle_reservation_v1(uuid,uuid,uuid,text,date,date,text,text,uuid),public.cancel_vehicle_reservation_v1(uuid,uuid,uuid),public.complete_vehicle_maintenance_v1(uuid,uuid,uuid) TO authenticated,service_role;
