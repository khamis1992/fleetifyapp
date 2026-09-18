-- Record the current operational custody of vehicle 846485 by employee
-- Osama Abdelmonem. The cancelled contract and every financial row remain
-- unchanged.

BEGIN;

DO $migration$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_vehicle_id CONSTANT uuid := '55c81bd1-807e-4be2-97e3-83b3366f8db2';
  v_contract_id CONSTANT uuid := '169f8e38-51af-4a0e-b8a3-70a98f74e141';
  v_employee_id CONSTANT uuid := '6250ce2a-f870-4b47-8072-41bde5d936af';
  v_previous_assignment_id CONSTANT uuid := '9fd89f52-1e7f-43b6-8adf-66c8150cca8d';
  v_migration_key CONSTANT text := '20260830175441_record_846485_employee_osama_custody';
  v_source_sha CONSTANT text :=
    md5('direct-manager-846485-employee-osama-2026-08-30')
    || md5('fleetify:reserved-employee:846485:005');
  v_batch_id uuid;
  v_assignment_id uuid;
  v_before_state jsonb;
  v_after_state jsonb;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND (
        batch.source_sha256 = v_source_sha
        OR batch.metadata ->> 'migration_key' = v_migration_key
      )
  ) THEN
    RAISE EXCEPTION 'Migration % has already been recorded', v_migration_key;
  END IF;

  SELECT jsonb_build_object(
    'status', vehicle.status::text,
    'location', vehicle.location,
    'notes', vehicle.notes,
    'plate_number', vehicle.plate_number,
    'is_active', vehicle.is_active,
    'updated_at', vehicle.updated_at
  )
  INTO v_before_state
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND regexp_replace(COALESCE(vehicle.plate_number, ''), '[^0-9]', '', 'g') = '846485'
    AND vehicle.status = 'rented'::public.vehicle_status
    AND vehicle.is_active;

  IF v_before_state IS NULL THEN
    RAISE EXCEPTION 'Vehicle 846485 no longer matches the reviewed rented state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.contract_number = 'LTO20248'
      AND contract.status = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Cancelled contract LTO20248 no longer matches vehicle 846485';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employees employee
    WHERE employee.id = v_employee_id
      AND employee.company_id = v_company_id
      AND employee.employee_number = '005'
      AND employee.is_active
      AND btrim(employee.first_name) = 'اسامة'
      AND btrim(employee.last_name) = 'عبدالمنعم'
  ) THEN
    RAISE EXCEPTION 'Employee 005 (Osama Abdelmonem) no longer matches the reviewed record';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.id = v_previous_assignment_id
      AND assignment.company_id = v_company_id
      AND assignment.vehicle_id = v_vehicle_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'::public.vehicle_status
      AND btrim(COALESCE(assignment.source_customer_name, '')) = 'اسامة'
  ) THEN
    RAISE EXCEPTION 'The active Osama fleet assignment no longer matches the reviewed state';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - المركبة 846485 مع الموظف اسامة - 2026-08-30',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    1,
    1,
    0,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'employee_vehicle_custody_correction',
      'plate_number', '846485',
      'employee_id', v_employee_id,
      'employee_number', '005',
      'employee_name', 'اسامة عبدالمنعم',
      'cancelled_contract_id', v_contract_id,
      'cancelled_contract_number', 'LTO20248',
      'contract_rows_changed', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  )
  RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.id = v_previous_assignment_id
    AND assignment.is_active;

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, source_customer_name,
    source_customer_phone, customer_id, supporting_contract_id,
    identity_resolution, target_status, target_location, decision_reason,
    source_fingerprint, source_evidence, before_state
  ) VALUES (
    v_batch_id,
    v_company_id,
    v_vehicle_id,
    2,
    '846485',
    'تصحيح الحيازة من مستأجر إلى موظف',
    'موظف',
    'اسامة عبدالمنعم',
    '31411919',
    NULL,
    NULL,
    'exact_employee_record',
    'reserved_employee'::public.vehicle_status,
    'مع الموظف اسامة عبدالمنعم',
    'reported_employee_custody',
    md5(concat_ws('|', v_source_sha, v_vehicle_id::text, v_employee_id::text)),
    jsonb_build_object(
      'source', 'direct_manager_instruction',
      'reported_on', '2026-08-30',
      'employee_id', v_employee_id,
      'employee_number', '005',
      'employee_name', 'اسامة عبدالمنعم',
      'employee_phone', '31411919',
      'contract_number', 'LTO20248',
      'contract_status', 'cancelled',
      'contracts_unchanged', true,
      'financial_records_unchanged', true
    ),
    v_before_state
  )
  RETURNING id INTO v_assignment_id;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET status = 'reserved_employee'::public.vehicle_status,
      location = 'مع الموظف اسامة عبدالمنعم',
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[تصحيح تشغيلي 2026-08-30 - الموظف اسامة]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[تصحيح تشغيلي 2026-08-30 - الموظف اسامة] العقد LTO20248 ملغى، والمركبة مستخدمة حالياً من قبل الموظف اسامة عبدالمنعم (رقم 005).'
        )
      END,
      updated_at = now()
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle 846485 was not updated';
  END IF;

  SELECT jsonb_build_object(
    'status', vehicle.status::text,
    'location', vehicle.location,
    'notes', vehicle.notes,
    'plate_number', vehicle.plate_number,
    'is_active', vehicle.is_active,
    'updated_at', vehicle.updated_at
  )
  INTO v_after_state
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET after_state = v_after_state
  WHERE assignment.id = v_assignment_id;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id,
    v_company_id,
    'VEHICLE_CUSTODY_CORRECTED_TO_EMPLOYEE',
    'vehicle',
    v_vehicle_id,
    v_before_state,
    v_after_state || jsonb_build_object(
      'custodian_type', 'employee',
      'employee_id', v_employee_id,
      'employee_number', '005',
      'employee_name', 'اسامة عبدالمنعم'
    ),
    'info',
    'khamis-1992@hotmail.com',
    'خميس',
    '846485',
    'تصحيح حالة المركبة من مؤجرة إلى محجوزة لموظف وتسجيل حيازتها لدى الموظف اسامة عبدالمنعم، مع إبقاء العقد LTO20248 ملغى دون تعديل مالي.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'fleet_reconciliation_batch_id', v_batch_id,
      'fleet_reconciliation_assignment_id', v_assignment_id,
      'employee_id', v_employee_id,
      'contract_id', v_contract_id,
      'contract_rows_changed', 0,
      'financial_records_changed', false
    ),
    'المركبة 846485 مستخدمة حالياً من قبل الموظف اسامة عبدالمنعم؛ العقد LTO20248 ملغى.'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    JOIN public.fleet_reconciliation_assignments assignment
      ON assignment.vehicle_id = vehicle.id
     AND assignment.company_id = vehicle.company_id
     AND assignment.is_active
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status = 'reserved_employee'::public.vehicle_status
      AND vehicle.location = 'مع الموظف اسامة عبدالمنعم'
      AND assignment.id = v_assignment_id
      AND assignment.target_status = 'reserved_employee'::public.vehicle_status
      AND assignment.decision_reason = 'reported_employee_custody'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for employee custody of vehicle 846485';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.status = 'cancelled'
      AND contract.balance_due = 40385
      AND contract.payment_status = 'partial'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: LTO20248 financial/legal state changed unexpectedly';
  END IF;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'applied',
      applied_at = now(),
      metadata = metadata || jsonb_build_object(
        'applied_assignment_count', 1,
        'audit_log_count', 1
      )
  WHERE id = v_batch_id;
END;
$migration$;

COMMIT;
