-- Correct the legacy contract LTO2024104 from expired to cancelled without
-- releasing vehicle 847932. The vehicle has an active fleet-reconciliation
-- assignment to the reported current renter حسام ساسي ظاهري.
DO $migration$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_contract_id CONSTANT UUID := 'cd8a5d6d-676c-47a1-8974-e7b28540c3d4'::UUID;
  v_vehicle_id CONSTANT UUID := '43cb61c2-9c1b-45c8-bf99-fbf28f329d4b'::UUID;
  v_assignment_id CONSTANT UUID := 'b90dd8e1-0189-4ceb-bb47-0aacd2575713'::UUID;
  v_actor_user_id CONSTANT UUID := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::UUID;
  v_migration_key CONSTANT TEXT := '20260830171454_cancel_lto2024104';
  v_reason CONSTANT TEXT := 'تصحيح إداري معتمد بتاريخ 2026-08-30: العقد LTO2024104 ملغى. لم تُغيّر الفواتير أو الرصيد المالي. بقيت المركبة 847932 بحالة مؤجرة استناداً إلى تسوية الأسطول النشطة التي تسجل المستأجر الحالي المبلّغ عنه: حسام ساسي ظاهري.';
BEGIN
  PERFORM 1
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.contract_number = 'LTO2024104'
    AND contract.vehicle_id = v_vehicle_id
    AND contract.status = 'expired'
    AND contract.balance_due = 13608
    AND contract.vehicle_returned = false
    AND contract.vehicle_status IS NULL
    AND contract.legal_status IS NULL
    AND contract.sub_status IS NULL
    AND contract.description IS NULL
    AND contract.suspension_reason IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LTO2024104 no longer matches the reviewed expired state';
  END IF;

  PERFORM 1
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND vehicle.plate_number = '847932'
    AND vehicle.status::TEXT = 'rented'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle 847932 no longer matches the reviewed rented state';
  END IF;

  PERFORM 1
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.id = v_assignment_id
    AND assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active = true
    AND assignment.target_status::TEXT = 'rented'
    AND BTRIM(assignment.source_customer_name) = 'حسام ساسي ظاهري'
    AND assignment.decision_reason = 'reported_current_renter';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The active fleet assignment for vehicle 847932 no longer matches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contracts other_contract
    WHERE other_contract.company_id = v_company_id
      AND other_contract.vehicle_id = v_vehicle_id
      AND other_contract.id <> v_contract_id
  ) THEN
    RAISE EXCEPTION 'A second contract is now linked to vehicle 847932; reassess before cancellation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.legal_transfer_employee_reviews review
    WHERE review.company_id = v_company_id
      AND review.contract_id = v_contract_id
      AND review.status IN ('awaiting_assignment', 'pending', 'in_progress', 'corrections_required', 'deferred')
  ) THEN
    RAISE EXCEPTION 'LTO2024104 now has a legal case or an open legal review';
  END IF;

  UPDATE public.contracts
  SET status = 'cancelled',
      suspension_reason = v_reason,
      updated_at = NOW()
  WHERE id = v_contract_id AND company_id = v_company_id;

  -- The contract-status trigger must preserve the reconciliation override.
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status::TEXT = 'rented'
  ) THEN
    RAISE EXCEPTION 'Cancellation unexpectedly released vehicle 847932 despite its active reconciliation assignment';
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by
  ) VALUES (
    v_contract_id, v_company_id, 'contract_status_corrected_to_cancelled',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'vehicle_id', v_vehicle_id,
      'fleet_reconciliation_assignment_id', v_assignment_id,
      'financial_records_changed', false
    ),
    jsonb_build_object(
      'status', 'expired',
      'vehicle_status', 'rented',
      'balance_due', 13608
    ),
    jsonb_build_object(
      'status', 'cancelled',
      'vehicle_status', 'rented',
      'reported_current_renter', 'حسام ساسي ظاهري',
      'balance_due', 13608
    ),
    v_reason,
    v_actor_user_id
  );

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id, v_company_id,
    'CONTRACT_STATUS_CORRECTED_TO_CANCELLED',
    'contract', v_contract_id,
    jsonb_build_object('status', 'expired', 'vehicle_status', 'rented'),
    jsonb_build_object(
      'status', 'cancelled',
      'vehicle_status', 'rented',
      'reported_current_renter', 'حسام ساسي ظاهري'
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس',
    'LTO2024104',
    'تصحيح حالة العقد من منتهي إلى ملغى مع الحفاظ على حالة المركبة المؤجرة وفق تسوية الأسطول.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'vehicle_id', v_vehicle_id,
      'fleet_reconciliation_assignment_id', v_assignment_id,
      'financial_records_changed', false
    ),
    v_reason
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.status = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Post-migration verification failed for LTO2024104';
  END IF;
END;
$migration$;
