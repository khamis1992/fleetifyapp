-- Harden vehicle-status repairs with database-side operational evidence.

CREATE OR REPLACE FUNCTION public.system_agent_apply_vehicle_status_repair(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_target text;
  v_repair_id uuid := gen_random_uuid();
  v_has_active_contract boolean;
  v_has_open_maintenance boolean;
  v_has_active_reservation boolean;
BEGIN
  IF p_command <> 'vehicle.sync_status' THEN
    RAISE EXCEPTION 'Dedicated vehicle repair gateway only accepts vehicle.sync_status';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs
  WHERE id = p_job_id AND run_id = p_run_id AND company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' OR v_job.domain <> 'fleet' THEN
    RAISE EXCEPTION 'System agent job is not an active fleet apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings
  WHERE id = p_finding_id AND run_id = p_run_id AND job_id = p_job_id AND company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL OR v_finding.repair_command <> p_command
     OR v_finding.status IN ('repaired', 'rolled_back') THEN
    RAISE EXCEPTION 'Vehicle finding is invalid or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry
  WHERE command = p_command AND enabled AND reversible AND NOT approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Vehicle repair command is disabled or below its confidence threshold';
  END IF;

  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_entity_id::uuid AND company_id = p_company_id
  FOR UPDATE;
  IF v_vehicle.id IS NULL THEN RAISE EXCEPTION 'Vehicle is outside the active company'; END IF;

  v_before := jsonb_build_object('status', v_vehicle.status::text);
  IF COALESCE(p_expected_before, '{}'::jsonb) <> '{}'::jsonb
     AND NOT (v_before @> p_expected_before) THEN
    RAISE EXCEPTION 'Vehicle changed after detection; repair was safely aborted';
  END IF;

  v_target := p_values ->> 'status';
  IF lower(COALESCE(v_vehicle.status::text, '')) IN (
    'maintenance','out_of_service','accident','stolen','police_station','reserved_employee','municipality'
  ) THEN
    RAISE EXCEPTION 'Protected vehicle status cannot be changed by the system agent';
  END IF;
  IF v_target NOT IN ('available','rented','maintenance','out_of_service','street_52') THEN
    RAISE EXCEPTION 'Unsupported target vehicle status';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.company_id = p_company_id AND c.vehicle_id = v_vehicle.id
      AND c.status IN ('active', 'under_legal_procedure')
      AND c.start_date <= current_date AND c.end_date >= current_date
  ) INTO v_has_active_contract;
  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_maintenance vm
    WHERE vm.company_id = p_company_id AND vm.vehicle_id = v_vehicle.id
      AND lower(COALESCE(vm.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;
  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_reservations vr
    WHERE vr.company_id = p_company_id AND vr.vehicle_id = v_vehicle.id
      AND lower(COALESCE(vr.status, '')) NOT IN ('cancelled','canceled','completed','expired')
      AND vr.start_date <= current_date AND vr.end_date >= current_date
  ) INTO v_has_active_reservation;

  IF v_target = 'maintenance' AND NOT v_has_open_maintenance THEN
    RAISE EXCEPTION 'No in-progress maintenance supports the target status';
  ELSIF v_target = 'rented' AND NOT v_has_active_contract THEN
    RAISE EXCEPTION 'No active contract supports the target status';
  ELSIF v_target = 'street_52' AND NOT v_has_active_reservation THEN
    RAISE EXCEPTION 'No active reservation supports the target status';
  ELSIF v_target = 'out_of_service' AND COALESCE(v_vehicle.is_active, true) THEN
    RAISE EXCEPTION 'Active vehicle cannot be auto-marked out of service';
  ELSIF v_target = 'available' AND (
    v_has_active_contract OR v_has_open_maintenance OR v_has_active_reservation OR v_vehicle.status::text = 'street_52'
  ) THEN
    RAISE EXCEPTION 'Operational records do not support making this vehicle available';
  END IF;

  UPDATE public.vehicles
  SET status = v_target::public.vehicle_status, updated_at = now()
  WHERE id = v_vehicle.id AND company_id = p_company_id;
  SELECT jsonb_build_object('status', v.status::text) INTO v_after
  FROM public.vehicles v WHERE v.id = v_vehicle.id;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'fleet', p_command,
    'vehicles', v_vehicle.id::text, v_before, v_after, COALESCE(p_metadata, '{}'::jsonb)
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;

  RETURN jsonb_build_object('repair_id', v_repair_id, 'command', p_command, 'before', v_before, 'after', v_after);
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_vehicle_status_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_vehicle_status_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
