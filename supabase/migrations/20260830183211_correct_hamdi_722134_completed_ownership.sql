-- Record completed ownership of vehicle 722134 by Hamdi Thabet. Historical
-- invoices, payments, and balances remain untouched.

BEGIN;

DO $migration$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_customer_id CONSTANT uuid := 'cd68fe4d-3ad4-4da1-9192-15543c26be65';
  v_vehicle_id CONSTANT uuid := 'f0787b08-23f2-4f20-b117-6c5212247249';
  v_contract_id CONSTANT uuid := 'f0a9947b-2656-465e-8e85-33032dbf80d3';
  v_previous_assignment_id CONSTANT uuid := '24e410ad-caa5-4888-a52e-d77adaf0d04f';
  v_migration_key CONSTANT text := '20260830183211_correct_hamdi_722134_completed_ownership';
  v_source_sha CONSTANT text :=
    md5('direct-manager-hamdi-722134-completed-ownership-2026-08-30')
    || md5('fleetify:ownership-completed:722134:hamdi-thabet');
  v_batch_id uuid;
  v_assignment_id uuid;
  v_before_vehicle jsonb;
  v_after_vehicle jsonb;
  v_before_contract jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND (
        batch.source_sha256 = v_source_sha
        OR batch.metadata ->> 'migration_key' = v_migration_key
      )
  ) THEN
    RAISE EXCEPTION 'Migration % has already been recorded', v_migration_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customers customer
    WHERE customer.id = v_customer_id
      AND customer.company_id = v_company_id
      AND customer.customer_code = 'IND-25-0283'
      AND customer.is_active
      AND btrim(customer.first_name) = 'حمدي'
      AND btrim(customer.last_name) = 'ثابت خليفة محمد'
  ) THEN
    RAISE EXCEPTION 'Hamdi Thabet no longer matches customer IND-25-0283';
  END IF;

  SELECT to_jsonb(vehicle)
  INTO v_before_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND regexp_replace(COALESCE(vehicle.plate_number, ''), '[^0-9]', '', 'g') = '722134'
    AND vehicle.status = 'rented'::public.vehicle_status
    AND vehicle.is_active;

  SELECT to_jsonb(contract)
  INTO v_before_contract
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.customer_id = v_customer_id
    AND contract.vehicle_id = v_vehicle_id
    AND contract.contract_number = 'LTO2024230'
    AND contract.status = 'cancelled'
    AND contract.payment_status = 'paid'
    AND contract.balance_due = 0
    AND contract.total_paid = 8479;

  IF v_before_vehicle IS NULL OR v_before_contract IS NULL THEN
    RAISE EXCEPTION 'Vehicle 722134 or contract LTO2024230 changed after review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.id = v_previous_assignment_id
      AND assignment.company_id = v_company_id
      AND assignment.vehicle_id = v_vehicle_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'::public.vehicle_status
  ) THEN
    RAISE EXCEPTION 'The active 722134 fleet assignment changed after review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.id <> v_contract_id
      AND contract.status IN ('active', 'under_legal_procedure')
  ) THEN
    RAISE EXCEPTION 'Vehicle 722134 now has another live contract';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - تمليك 722134 إلى حمدي ثابت - 2026-08-30',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    1,
    1,
    1,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'completed_paid_ownership_transfer',
      'customer_id', v_customer_id,
      'customer_name', 'حمدي ثابت خليفة محمد',
      'contract_id', v_contract_id,
      'contract_number', 'LTO2024230',
      'vehicle_id', v_vehicle_id,
      'plate_number', '722134',
      'payment_status', 'paid',
      'balance_due', 0,
      'ownership_transfer_completed', true,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  ) RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.id = v_previous_assignment_id
    AND assignment.is_active;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.contracts contract
  SET status = 'expired',
      contract_type = 'rent_to_own',
      description = concat_ws(
        E'\n',
        NULLIF(btrim(COALESCE(contract.description, '')), ''),
        '[تصحيح إداري 2026-08-30] العقد مكتمل ومدفوع بالكامل، وتم نقل ملكية المركبة 722134 إلى حمدي ثابت خليفة محمد؛ المركبة لم تعد تابعة لأسطول الشركة.'
      ),
      terms = concat_ws(
        E'\n',
        NULLIF(btrim(COALESCE(contract.terms, '')), ''),
        'اكتمل السداد ورصيد العقد صفر. لم تُنشأ بهذا التصحيح حركة دفع أو فاتورة جديدة.'
      ),
      expired_at = now(),
      sub_status = 'ownership_transferred_completed',
      vehicle_status = 'out_of_service',
      updated_at = now()
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id;

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, source_customer_name,
    customer_id, supporting_contract_id, identity_resolution,
    target_status, target_location, decision_reason, source_fingerprint,
    source_evidence, before_state
  ) VALUES (
    v_batch_id, v_company_id, v_vehicle_id, 2, '722134',
    'اكتمال عقد التمليك وخروج المركبة من أسطول الشركة',
    'ملكية منقولة', 'حمدي ثابت خليفة محمد', v_customer_id,
    v_contract_id, 'exact_customer_contract_and_vehicle',
    'out_of_service'::public.vehicle_status,
    'تم نقل الملكية إلى حمدي ثابت - خارج أسطول الشركة',
    'ownership_transferred_completed',
    md5(concat_ws('|', v_source_sha, v_vehicle_id::text, v_customer_id::text)),
    jsonb_build_object(
      'source', 'direct_manager_instruction',
      'reported_on', '2026-08-30',
      'ownership_transfer_completed', true,
      'company_fleet_membership', false,
      'before_contract', v_before_contract,
      'financial_rows_changed', false
    ),
    jsonb_build_object(
      'status', v_before_vehicle->>'status',
      'location', v_before_vehicle->>'location',
      'notes', v_before_vehicle->>'notes',
      'plate_number', v_before_vehicle->>'plate_number',
      'is_active', (v_before_vehicle->>'is_active')::boolean,
      'updated_at', v_before_vehicle->>'updated_at'
    )
  ) RETURNING id INTO v_assignment_id;

  UPDATE public.vehicles vehicle
  SET status = 'out_of_service'::public.vehicle_status,
      is_active = false,
      location = 'تم نقل الملكية إلى حمدي ثابت - خارج أسطول الشركة',
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[تمليك مكتمل 722134 - حمدي ثابت]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[تمليك مكتمل 722134 - حمدي ثابت] تم سداد كامل قيمة العقد ونقل ملكية المركبة إلى حمدي ثابت خليفة محمد؛ المركبة لم تعد تابعة لأسطول الشركة.'
        )
      END,
      updated_at = now()
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  SELECT jsonb_build_object(
    'status', vehicle.status::text,
    'location', vehicle.location,
    'notes', vehicle.notes,
    'plate_number', vehicle.plate_number,
    'is_active', vehicle.is_active,
    'updated_at', vehicle.updated_at
  ) INTO v_after_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET after_state = v_after_vehicle
  WHERE assignment.id = v_assignment_id;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES
  (
    v_actor_user_id, v_company_id, 'CONTRACT_CORRECTED_TO_COMPLETED_OWNERSHIP',
    'contract', v_contract_id, v_before_contract,
    jsonb_build_object(
      'status', 'expired', 'payment_status', 'paid', 'balance_due', 0,
      'sub_status', 'ownership_transferred_completed',
      'vehicle_status', 'out_of_service'
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس', 'LTO2024230',
    'تصحيح العقد من ملغى إلى مكتمل/منتهي ومدفوع، وتسجيل اكتمال نقل ملكية المركبة 722134 إلى حمدي ثابت.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'vehicle_id', v_vehicle_id, 'financial_rows_changed', false),
    'بقيت المدفوعات والفواتير كما هي.'
  ),
  (
    v_actor_user_id, v_company_id, 'VEHICLE_REMOVED_FROM_FLEET_AFTER_OWNERSHIP_TRANSFER',
    'vehicle', v_vehicle_id, v_before_vehicle, v_after_vehicle,
    'info', 'khamis-1992@hotmail.com', 'خميس', '722134',
    'إخراج المركبة من أسطول الشركة بعد اكتمال نقل ملكيتها إلى حمدي ثابت.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'contract_id', v_contract_id, 'customer_id', v_customer_id),
    'المركبة غير نشطة وخارج الخدمة في سجل الأسطول.'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.vehicles vehicle ON vehicle.id = contract.vehicle_id
    JOIN public.fleet_reconciliation_assignments assignment
      ON assignment.vehicle_id = vehicle.id
     AND assignment.company_id = vehicle.company_id
     AND assignment.is_active
    WHERE contract.id = v_contract_id
      AND contract.status = 'expired'
      AND contract.contract_type = 'rent_to_own'
      AND contract.payment_status = 'paid'
      AND contract.balance_due = 0
      AND contract.total_paid = 8479
      AND contract.sub_status = 'ownership_transferred_completed'
      AND vehicle.status = 'out_of_service'::public.vehicle_status
      AND vehicle.is_active = false
      AND assignment.id = v_assignment_id
      AND assignment.decision_reason = 'ownership_transferred_completed'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for completed ownership of vehicle 722134';
  END IF;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'applied', applied_at = now(),
      metadata = metadata || jsonb_build_object(
        'applied_assignment_count', 1,
        'audit_log_count', 2
      )
  WHERE id = v_batch_id;
END;
$migration$;

COMMIT;
