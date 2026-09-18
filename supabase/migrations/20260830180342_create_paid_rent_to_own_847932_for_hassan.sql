-- Create the manager-confirmed, fully paid rent-to-own record for vehicle
-- 847932 and Hassan bin Sasi Zaheri. Legal ownership remains with the
-- company until the planned transfer in December 2027.

BEGIN;

DO $migration$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_customer_id CONSTANT uuid := '7af11cdd-4b9a-4c86-a894-fff79ea7008e';
  v_vehicle_id CONSTANT uuid := '43cb61c2-9c1b-45c8-bf99-fbf28f329d4b';
  v_old_contract_id CONSTANT uuid := 'cd8a5d6d-676c-47a1-8974-e7b28540c3d4';
  v_plate_5901_contract_id CONSTANT uuid := 'b5a79278-6224-44eb-a6dc-44f3ab851d65';
  v_previous_assignment_id CONSTANT uuid := 'b90dd8e1-0189-4ceb-bb47-0aacd2575713';
  v_migration_key CONSTANT text := '20260830180342_create_paid_rent_to_own_847932_for_hassan';
  v_creation_key CONSTANT text := 'ownership-transfer-847932-hassan-20260830';
  v_source_sha CONSTANT text :=
    md5('direct-manager-paid-rent-to-own-847932-hassan-2026-08-30')
    || md5('fleetify:ownership-transfer-pending:847932:2027-12');
  v_contract_id uuid := gen_random_uuid();
  v_batch_id uuid;
  v_assignment_id uuid;
  v_before_vehicle jsonb;
  v_after_vehicle jsonb;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND (
        contract.contract_number = '847932'
        OR contract.creation_idempotency_key = v_creation_key
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND (
        batch.source_sha256 = v_source_sha
        OR batch.metadata ->> 'migration_key' = v_migration_key
      )
  ) THEN
    RAISE EXCEPTION 'The paid 847932 ownership-transfer record already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customers customer
    WHERE customer.id = v_customer_id
      AND customer.company_id = v_company_id
      AND customer.is_active
      AND btrim(customer.first_name) = 'حسن'
      AND btrim(customer.last_name) = 'بن ساسی ظاهری'
      AND customer.customer_code = 'IND-25-0276'
  ) THEN
    RAISE EXCEPTION 'Hassan bin Sasi Zaheri no longer matches customer IND-25-0276';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.vehicles vehicle ON vehicle.id = contract.vehicle_id
    WHERE contract.id = v_plate_5901_contract_id
      AND contract.company_id = v_company_id
      AND contract.customer_id = v_customer_id
      AND contract.contract_number = 'LTO20244'
      AND contract.status = 'active'
      AND regexp_replace(COALESCE(vehicle.plate_number, ''), '[^0-9]', '', 'g') = '5901'
      AND vehicle.status = 'rented'::public.vehicle_status
      AND vehicle.is_active
  ) THEN
    RAISE EXCEPTION 'Active contract LTO20244 for vehicle 5901 no longer matches the reviewed state';
  END IF;

  SELECT jsonb_build_object(
    'status', vehicle.status::text,
    'location', vehicle.location,
    'notes', vehicle.notes,
    'plate_number', vehicle.plate_number,
    'is_active', vehicle.is_active,
    'updated_at', vehicle.updated_at
  )
  INTO v_before_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND regexp_replace(COALESCE(vehicle.plate_number, ''), '[^0-9]', '', 'g') = '847932'
    AND vehicle.status = 'rented'::public.vehicle_status
    AND vehicle.is_active;

  IF v_before_vehicle IS NULL THEN
    RAISE EXCEPTION 'Vehicle 847932 no longer matches the reviewed active rented state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_old_contract_id
      AND contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.contract_number = 'LTO2024104'
      AND contract.status = 'cancelled'
      AND contract.customer_id <> v_customer_id
      AND contract.contract_amount = 68040
      AND contract.total_paid = 54432
      AND contract.balance_due = 13608
      AND contract.payment_status = 'partial'
  ) THEN
    RAISE EXCEPTION 'Cancelled legacy contract LTO2024104 no longer matches the reviewed state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.status IN ('active', 'under_legal_procedure')
  ) THEN
    RAISE EXCEPTION 'Vehicle 847932 already has a live contract';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.id = v_previous_assignment_id
      AND assignment.company_id = v_company_id
      AND assignment.vehicle_id = v_vehicle_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'::public.vehicle_status
  ) THEN
    RAISE EXCEPTION 'The active fleet assignment for vehicle 847932 changed';
  END IF;

  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, contract_date,
    start_date, end_date, contract_amount, monthly_amount, status,
    contract_type, vehicle_id, description, terms, created_by,
    vehicle_returned, auto_renew_enabled, last_payment_check_date, expired_at,
    total_paid, balance_due, payment_status, late_fine_amount,
    days_overdue, created_via, license_plate, make, model, year,
    vehicle_status, sub_status, creation_idempotency_key
  )
  SELECT
    v_contract_id,
    v_company_id,
    v_customer_id,
    '847932',
    DATE '2026-08-30',
    DATE '2026-08-30',
    DATE '2027-12-31',
    68040,
    0,
    'expired',
    'rent_to_own',
    vehicle.id,
    'عقد تمليك منتهٍ بالتملك مدفوع بالكامل. المركبة في حيازة حسن بن ساسي ظاهري، ونقل الملكية الفعلي مقرر في ديسمبر 2027 ولم يتم حتى تاريخ تسجيل هذا العقد.',
    'القيمة الإجمالية 68,040 ريال قطري مسددة بالكامل وفق إفادة الإدارة. اكتمل الالتزام المالي وبقي التزام نقل الملكية الفعلي مقرراً في ديسمبر 2027، ولا تعد هذه البيانات بذاتها إثباتاً على إتمام نقل الملكية لدى جهة المرور.',
    v_actor_user_id,
    false,
    false,
    now(),
    now(),
    68040,
    0,
    'paid',
    0,
    0,
    'admin_verified_paid_rent_to_own',
    vehicle.plate_number,
    vehicle.make,
    vehicle.model,
    vehicle.year,
    'out_of_service',
    'ownership_transfer_pending_2027_12',
    v_creation_key
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paid rent-to-own contract 847932 was not inserted';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - عقد تمليك 847932 مدفوع ونقل الملكية ديسمبر 2027',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    1,
    1,
    1,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'paid_rent_to_own_pending_title_transfer',
      'contract_id', v_contract_id,
      'contract_number', '847932',
      'contract_amount', 68040,
      'paid_amount', 68040,
      'balance_due', 0,
      'customer_id', v_customer_id,
      'customer_name', 'حسن بن ساسي ظاهري',
      'vehicle_id', v_vehicle_id,
      'plate_number', '847932',
      'planned_title_transfer', '2027-12',
      'title_transfer_completed', false,
      'payment_transaction_rows_created', 0,
      'invoice_rows_created', 0,
      'legacy_contract_rows_changed', 0,
      'plate_5901_contract_rows_changed', 0
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
    customer_id, supporting_contract_id, identity_resolution,
    target_status, target_location, decision_reason, source_fingerprint,
    source_evidence, before_state
  ) VALUES (
    v_batch_id,
    v_company_id,
    v_vehicle_id,
    2,
    '847932',
    'عقد تمليك مكتمل ومدفوع ونقل الملكية قيد الانتظار',
    'تمليك منتهٍ بالتملك',
    'حسن بن ساسي ظاهري',
    v_customer_id,
    v_contract_id,
    'exact_customer_and_contract',
    'out_of_service'::public.vehicle_status,
    'لدى حسن بن ساسي ظاهري - بانتظار نقل الملكية في ديسمبر 2027',
    'paid_rent_to_own_pending_transfer',
    md5(concat_ws('|', v_source_sha, v_vehicle_id::text, v_customer_id::text, v_contract_id::text)),
    jsonb_build_object(
      'source', 'direct_manager_instruction',
      'reported_on', '2026-08-30',
      'contract_amount', 68040,
      'paid_amount', 68040,
      'balance_due', 0,
      'payment_status', 'paid',
      'planned_title_transfer', '2027-12',
      'title_transfer_completed', false,
      'company_ownership_retained_until_transfer', true,
      'payment_transaction_row_created', false
    ),
    v_before_vehicle
  )
  RETURNING id INTO v_assignment_id;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET status = 'out_of_service'::public.vehicle_status,
      location = 'لدى حسن بن ساسي ظاهري - بانتظار نقل الملكية في ديسمبر 2027',
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[تمليك 847932 - نقل الملكية ديسمبر 2027]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[تمليك 847932 - نقل الملكية ديسمبر 2027] عقد التمليك باسم حسن بن ساسي ظاهري مدفوع بالكامل بقيمة 68,040 ريال. نقل الملكية الفعلي لم يتم بعد ومقرر في ديسمبر 2027؛ تبقى المركبة ضمن ملكية الشركة حتى إتمام النقل رسمياً.'
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
  )
  INTO v_after_vehicle
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
    v_actor_user_id, v_company_id,
    'PAID_RENT_TO_OWN_CONTRACT_CREATED', 'contract', v_contract_id,
    NULL,
    jsonb_build_object(
      'contract_number', '847932',
      'status', 'expired',
      'contract_type', 'rent_to_own',
      'contract_amount', 68040,
      'total_paid', 68040,
      'balance_due', 0,
      'payment_status', 'paid',
      'end_date', '2027-12-31',
      'title_transfer_completed', false
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس', '847932',
    'إنشاء عقد تمليك مكتمل ومدفوع بالكامل باسم حسن بن ساسي ظاهري مع بقاء نقل الملكية الرسمي معلقاً حتى ديسمبر 2027.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'vehicle_id', v_vehicle_id,
      'customer_id', v_customer_id,
      'fleet_reconciliation_batch_id', v_batch_id,
      'payment_transaction_rows_created', 0,
      'invoice_rows_created', 0
    ),
    'القيمة مسجلة كمسددة بالكامل وفق إفادة الإدارة؛ لم يتم إنشاء حركة دفع أو فاتورة تخمينية.'
  ),
  (
    v_actor_user_id, v_company_id,
    'VEHICLE_TITLE_TRANSFER_RECORDED_AS_PENDING', 'vehicle', v_vehicle_id,
    v_before_vehicle,
    v_after_vehicle || jsonb_build_object(
      'customer_id', v_customer_id,
      'contract_id', v_contract_id,
      'planned_title_transfer', '2027-12',
      'title_transfer_completed', false
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس', '847932',
    'تسجيل المركبة في حيازة حسن بن ساسي ظاهري بعقد تمليك مدفوع بالكامل، مع بقاء الملكية للشركة حتى النقل الرسمي في ديسمبر 2027.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'contract_id', v_contract_id,
      'customer_id', v_customer_id,
      'fleet_reconciliation_batch_id', v_batch_id,
      'fleet_reconciliation_assignment_id', v_assignment_id
    ),
    'نقل الملكية لم يتم بعد؛ لا يجوز إخراج المركبة من أصول الشركة قبل مستند النقل الرسمي.'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.customer_id = v_customer_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.contract_number = '847932'
      AND contract.status = 'expired'
      AND contract.contract_type = 'rent_to_own'
      AND contract.contract_amount = 68040
      AND contract.total_paid = 68040
      AND contract.balance_due = 0
      AND contract.payment_status = 'paid'
      AND contract.end_date = DATE '2027-12-31'
      AND contract.sub_status = 'ownership_transfer_pending_2027_12'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for paid contract 847932';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice WHERE invoice.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.payments payment WHERE payment.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'Unexpected financial transaction rows were created for the administrative paid summary';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.vehicles vehicle ON vehicle.id = contract.vehicle_id
    WHERE contract.id = v_plate_5901_contract_id
      AND contract.status = 'active'
      AND vehicle.status = 'rented'::public.vehicle_status
      AND vehicle.is_active
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: active 5901 contract changed unexpectedly';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_old_contract_id
      AND contract.status = 'cancelled'
      AND contract.total_paid = 54432
      AND contract.balance_due = 13608
      AND contract.payment_status = 'partial'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: legacy LTO2024104 changed unexpectedly';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    JOIN public.fleet_reconciliation_assignments assignment
      ON assignment.vehicle_id = vehicle.id
     AND assignment.company_id = vehicle.company_id
     AND assignment.is_active
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.is_active
      AND vehicle.status = 'out_of_service'::public.vehicle_status
      AND assignment.id = v_assignment_id
      AND assignment.customer_id = v_customer_id
      AND assignment.supporting_contract_id = v_contract_id
      AND assignment.decision_reason = 'paid_rent_to_own_pending_transfer'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for vehicle 847932 custody and pending transfer';
  END IF;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'applied',
      applied_at = now(),
      metadata = metadata || jsonb_build_object(
        'applied_assignment_count', 1,
        'audit_log_count', 2
      )
  WHERE id = v_batch_id;
END;
$migration$;

COMMIT;
