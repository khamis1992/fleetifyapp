-- Cancel C-ALF-0105 and return vehicle 848014 to the available fleet without
-- waiving or transferring Hamdi Thabet's unpaid traffic-penalty liability.

BEGIN;

-- "handled" means the liability was explicitly reviewed for contract closure;
-- it does not mean paid, waived, cancelled, or transferred to the company.
ALTER TABLE public.penalties
  DROP CONSTRAINT IF EXISTS penalties_status_check;
ALTER TABLE public.penalties
  ADD CONSTRAINT penalties_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'handled'));

DO $migration$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_migration_key CONSTANT text :=
    '20260830183606_cancel_c_alf_0105_retain_hamdi_penalties_and_release_848014';
  v_source_sha CONSTANT text :=
    md5('direct-manager-cancel-c-alf-0105-retain-hamdi-penalties-2026-08-30')
    || md5('fleetify:848014:300-paid:800-customer-unpaid');
  v_customer_id uuid;
  v_vehicle_id uuid;
  v_contract_id uuid;
  v_previous_assignment_id uuid;
  v_batch_id uuid;
  v_assignment_id uuid;
  v_before_vehicle jsonb;
  v_after_vehicle jsonb;
  v_before_contract jsonb;
  v_before_penalties jsonb;
  v_before_invoices jsonb;
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

  SELECT customer.id
  INTO v_customer_id
  FROM public.customers customer
  WHERE customer.company_id = v_company_id
    AND customer.customer_code = 'IND-25-0283'
    AND customer.is_active
    AND btrim(customer.first_name) = 'حمدي'
    AND btrim(customer.last_name) = 'ثابت خليفة محمد';

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Hamdi Thabet no longer matches active customer IND-25-0283';
  END IF;

  SELECT vehicle.id, to_jsonb(vehicle)
  INTO v_vehicle_id, v_before_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.company_id = v_company_id
    AND regexp_replace(COALESCE(vehicle.plate_number, ''), '[^0-9]', '', 'g') = '848014'
    AND vehicle.status = 'rented'::public.vehicle_status
    AND vehicle.is_active
  FOR UPDATE;

  SELECT contract.id, to_jsonb(contract)
  INTO v_contract_id, v_before_contract
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.contract_number = 'C-ALF-0105'
    AND contract.customer_id = v_customer_id
    AND contract.vehicle_id = v_vehicle_id
    AND contract.status = 'active'
    AND contract.payment_status = 'partial'
    AND contract.contract_amount = 62000
    AND contract.total_paid = 25802
    AND contract.balance_due = 36198
    AND COALESCE(contract.vehicle_returned, false) = false
  FOR UPDATE;

  IF v_before_vehicle IS NULL OR v_before_contract IS NULL THEN
    RAISE EXCEPTION 'Vehicle 848014 or contract C-ALF-0105 changed after review';
  END IF;

  SELECT assignment.id
  INTO v_previous_assignment_id
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active
    AND assignment.target_status = 'rented'::public.vehicle_status
  FOR UPDATE;

  IF v_previous_assignment_id IS NULL THEN
    RAISE EXCEPTION 'The active rented assignment for vehicle 848014 changed after review';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.id <> v_contract_id
      AND (
        contract.status IN ('active', 'pending', 'confirmed')
        OR (
          contract.status = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
  ) THEN
    RAISE EXCEPTION 'Vehicle 848014 now has another live or unreturned legal contract';
  END IF;

  PERFORM 1
  FROM public.penalties penalty
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_contract_id
  FOR UPDATE;

  SELECT jsonb_agg(to_jsonb(penalty) ORDER BY penalty.penalty_number)
  INTO v_before_penalties
  FROM public.penalties penalty
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_contract_id;

  IF jsonb_array_length(COALESCE(v_before_penalties, '[]'::jsonb)) <> 3
     OR NOT EXISTS (
       SELECT 1
       FROM public.penalties penalty
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number = '2400047855'
         AND penalty.amount = 300
         AND penalty.status = 'pending'
         AND penalty.payment_status = 'unpaid'
         AND penalty.customer_payment_status = 'unpaid'
         AND penalty.responsibility_party = 'customer'
         AND penalty.customer_id = v_customer_id
         AND penalty.responsible_customer_id = v_customer_id
     )
     OR (
       SELECT count(*)
       FROM public.penalties penalty
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number IN (
           'MOI-848014-2026-08-02-300',
           'MOI-848014-2026-08-12-500'
         )
         AND penalty.status = 'pending'
         AND penalty.payment_status = 'unpaid'
         AND penalty.customer_payment_status = 'unpaid'
         AND penalty.responsibility_party = 'customer'
         AND penalty.customer_id = v_customer_id
         AND penalty.responsible_customer_id = v_customer_id
     ) <> 2
     OR (
       SELECT COALESCE(sum(penalty.amount), 0)
       FROM public.penalties penalty
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number IN (
           'MOI-848014-2026-08-02-300',
           'MOI-848014-2026-08-12-500'
         )
     ) <> 800
  THEN
    RAISE EXCEPTION 'The three reviewed C-ALF-0105 penalties changed after approval';
  END IF;

  SELECT jsonb_agg(to_jsonb(invoice) ORDER BY invoice.id)
  INTO v_before_invoices
  FROM public.invoices invoice
  JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_contract_id;

  IF jsonb_array_length(COALESCE(v_before_invoices, '[]'::jsonb)) <> 3
     OR (
       SELECT count(*)
       FROM public.invoices invoice
       JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number = '2400047855'
         AND invoice.status::text = 'paid'
         AND invoice.payment_status::text = 'paid'
         AND invoice.total_amount = 300
         AND invoice.paid_amount = 300
         AND invoice.balance_due = 0
     ) <> 1
     OR (
       SELECT count(*)
       FROM public.invoices invoice
       JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number IN (
           'MOI-848014-2026-08-02-300',
           'MOI-848014-2026-08-12-500'
         )
         AND invoice.status::text = 'overdue'
         AND invoice.payment_status::text = 'unpaid'
         AND invoice.paid_amount = 0
     ) <> 2
     OR (
       SELECT COALESCE(sum(invoice.balance_due), 0)
       FROM public.invoices invoice
       JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_contract_id
         AND penalty.penalty_number IN (
           'MOI-848014-2026-08-02-300',
           'MOI-848014-2026-08-12-500'
         )
     ) <> 800
  THEN
    RAISE EXCEPTION 'The linked penalty invoices changed after approval';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - إلغاء C-ALF-0105 وإتاحة 848014 - 2026-08-30',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    1,
    1,
    1,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'cancel_contract_retain_customer_penalties_and_release_vehicle',
      'customer_id', v_customer_id,
      'customer_name', 'حمدي ثابت خليفة محمد',
      'contract_id', v_contract_id,
      'contract_number', 'C-ALF-0105',
      'vehicle_id', v_vehicle_id,
      'plate_number', '848014',
      'paid_penalty_reconciled_count', 1,
      'paid_penalty_reconciled_amount', 300,
      'unpaid_customer_penalty_count', 2,
      'unpaid_customer_penalty_amount', 800,
      'penalty_amount_transferred_to_company', 0,
      'penalty_amount_waived', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'contract_financial_summary_changed', false
    )
  ) RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.id = v_previous_assignment_id
    AND assignment.is_active;

  UPDATE public.penalties penalty
  SET status = 'confirmed',
      payment_status = 'paid',
      customer_payment_status = 'paid',
      responsibility_party = 'customer',
      responsibility_reason =
        'تصحيح حالة السداد وفق الفاتورة المرتبطة المدفوعة بالكامل؛ تبقى المخالفة منسوبة إلى حمدي ثابت.',
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_user_id,
      responsible_customer_id = v_customer_id,
      original_contract_id = v_contract_id,
      original_contract_number = 'C-ALF-0105',
      customer_id = v_customer_id,
      contract_id = v_contract_id,
      paid_by_company = false,
      company_paid_date = NULL,
      notes = CASE
        WHEN COALESCE(penalty.notes, '') LIKE '%[تصحيح مخالفة 300 مدفوعة عند إلغاء C-ALF-0105]%'
          THEN penalty.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(penalty.notes, '')), ''),
          '[تصحيح مخالفة 300 مدفوعة عند إلغاء C-ALF-0105] ثبت سدادها بالكامل من الفاتورة المرتبطة؛ لم تُنقل إلى الشركة ولم تُسقط.'
        )
      END,
      updated_at = now()
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_contract_id
    AND penalty.penalty_number = '2400047855';

  UPDATE public.penalties penalty
  SET status = 'handled',
      payment_status = 'unpaid',
      customer_payment_status = 'unpaid',
      responsibility_party = 'customer',
      responsibility_reason =
        'عولجت إدارياً للسماح بإلغاء C-ALF-0105 فقط؛ مبلغ المخالفة غير مسدد ويبقى كاملاً على مسؤولية حمدي ثابت دون إسقاط أو نقل إلى الشركة.',
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_user_id,
      responsible_customer_id = v_customer_id,
      original_contract_id = v_contract_id,
      original_contract_number = 'C-ALF-0105',
      customer_id = v_customer_id,
      contract_id = v_contract_id,
      paid_by_company = false,
      company_paid_date = NULL,
      notes = CASE
        WHEN COALESCE(penalty.notes, '') LIKE '%[معالجة دون إسقاط أو نقل - C-ALF-0105]%'
          THEN penalty.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(penalty.notes, '')), ''),
          '[معالجة دون إسقاط أو نقل - C-ALF-0105] المخالفة غير مسددة وتبقى على مسؤولية حمدي ثابت وفاتورتها قائمة بعد إلغاء العقد.'
        )
      END,
      updated_at = now()
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_contract_id
    AND penalty.penalty_number IN (
      'MOI-848014-2026-08-02-300',
      'MOI-848014-2026-08-12-500'
    );

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.contracts contract
  SET status = 'cancelled',
      vehicle_returned = true,
      suspension_reason = concat_ws(
        E'\n',
        NULLIF(btrim(COALESCE(contract.suspension_reason, '')), ''),
        'إلغاء معتمد بتاريخ 2026-08-30 وإعادة المركبة 848014 إلى حالة متوفرة. مخالفتا 800 ريال بقيتا غير مسددتين وعلى مسؤولية حمدي ثابت، ومخالفة 300 ريال صُححت كمدفوعة وفق فاتورتها.'
      ),
      description = concat_ws(
        E'\n',
        NULLIF(btrim(COALESCE(contract.description, '')), ''),
        '[إلغاء معتمد 2026-08-30] أُلغي العقد وأُعيدت المركبة 848014 وأصبحت متوفرة. لا يُعد الإلغاء إسقاطاً لرصيد العقد أو لمخالفتي 800 ريال القائمتين على العميل.'
      ),
      expired_at = now(),
      sub_status = 'returned_available_after_cancellation',
      vehicle_status = 'available',
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
    v_batch_id, v_company_id, v_vehicle_id, 2, '848014',
    'إلغاء العقد وإرجاع المركبة إلى المتاح',
    'متوفرة', NULL, NULL,
    v_contract_id, 'exact_contract_customer_and_vehicle',
    'available'::public.vehicle_status, 'متوفرة',
    'returned_available_after_cancellation',
    md5(concat_ws('|', v_source_sha, v_vehicle_id::text, v_contract_id::text)),
    jsonb_build_object(
      'source', 'direct_manager_approval',
      'approved_on', '2026-08-30',
      'before_contract', v_before_contract,
      'before_penalties', v_before_penalties,
      'before_invoices', v_before_invoices,
      'paid_penalty', jsonb_build_object('count', 1, 'amount', 300),
      'unpaid_customer_penalties', jsonb_build_object('count', 2, 'amount', 800),
      'transferred_to_company', false,
      'waived', false,
      'financial_rows_changed', false
    ),
    jsonb_build_object(
      'status', v_before_vehicle ->> 'status',
      'location', v_before_vehicle ->> 'location',
      'notes', v_before_vehicle ->> 'notes',
      'plate_number', v_before_vehicle ->> 'plate_number',
      'is_active', (v_before_vehicle ->> 'is_active')::boolean,
      'updated_at', v_before_vehicle ->> 'updated_at'
    )
  ) RETURNING id INTO v_assignment_id;

  UPDATE public.vehicles vehicle
  SET status = 'available'::public.vehicle_status,
      is_active = true,
      location = 'متوفرة',
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[إلغاء C-ALF-0105 - المركبة متوفرة]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[إلغاء C-ALF-0105 - المركبة متوفرة] أُلغي العقد وأُعيدت المركبة 848014؛ المركبة متوفرة وليست مؤجرة. بقيت مخالفات 800 ريال على مسؤولية حمدي ثابت ولم تُنقل إلى الشركة.'
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
    v_actor_user_id, v_company_id, 'CONTRACT_PENALTIES_RECONCILED_FOR_CANCELLATION',
    'contract', v_contract_id, v_before_penalties,
    jsonb_build_object(
      'paid_penalty_count', 1,
      'paid_penalty_amount', 300,
      'unpaid_handled_penalty_count', 2,
      'unpaid_customer_liability_amount', 800,
      'responsibility_party', 'customer',
      'transferred_to_company_amount', 0,
      'waived_amount', 0
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس', 'C-ALF-0105',
    'تصحيح مخالفة 300 ريال كمدفوعة، ومعالجة مخالفتي 800 ريال مع إبقائهما غير مسددتين وعلى مسؤولية حمدي ثابت.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'customer_id', v_customer_id),
    'لم تتغير الفواتير أو المدفوعات، ولم تُنقل أي مخالفة إلى الشركة ولم تُسقط.'
  ),
  (
    v_actor_user_id, v_company_id, 'CONTRACT_CANCELLED_AFTER_CUSTOMER_PENALTY_REVIEW',
    'contract', v_contract_id, v_before_contract,
    jsonb_build_object(
      'status', 'cancelled',
      'vehicle_returned', true,
      'sub_status', 'returned_available_after_cancellation',
      'contract_amount', 62000,
      'total_paid', 25802,
      'balance_due', 36198,
      'payment_status', 'partial'
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس', 'C-ALF-0105',
    'إلغاء العقد وإثبات رد المركبة، مع إبقاء الملخص المالي ومطالبات العميل دون إسقاط.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'vehicle_id', v_vehicle_id),
    'الإلغاء لا يشكل تنازلاً عن الرصيد أو المخالفات القائمة.'
  ),
  (
    v_actor_user_id, v_company_id, 'VEHICLE_RETURNED_TO_AVAILABLE_AFTER_CONTRACT_CANCELLATION',
    'vehicle', v_vehicle_id, v_before_vehicle, v_after_vehicle,
    'info', 'khamis-1992@hotmail.com', 'خميس', '848014',
    'إرجاع المركبة 848014 من مؤجرة إلى متوفرة بعد إلغاء C-ALF-0105.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'contract_id', v_contract_id),
    'المركبة نشطة تشغيلياً ومتاحة للتخصيص.'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.vehicles vehicle
      ON vehicle.id = contract.vehicle_id
     AND vehicle.company_id = contract.company_id
    JOIN public.fleet_reconciliation_assignments assignment
      ON assignment.company_id = vehicle.company_id
     AND assignment.vehicle_id = vehicle.id
     AND assignment.is_active
    WHERE contract.id = v_contract_id
      AND contract.status = 'cancelled'
      AND contract.vehicle_returned = true
      AND contract.sub_status = 'returned_available_after_cancellation'
      AND contract.payment_status = 'partial'
      AND contract.contract_amount = 62000
      AND contract.total_paid = 25802
      AND contract.balance_due = 36198
      AND vehicle.status = 'available'::public.vehicle_status
      AND vehicle.is_active
      AND vehicle.location = 'متوفرة'
      AND assignment.id = v_assignment_id
      AND assignment.target_status = 'available'::public.vehicle_status
      AND assignment.decision_reason = 'returned_available_after_cancellation'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed for contract C-ALF-0105 or vehicle 848014';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_contract_id
      AND penalty.penalty_number = '2400047855'
      AND penalty.amount = 300
      AND penalty.status = 'confirmed'
      AND penalty.payment_status = 'paid'
      AND penalty.customer_payment_status = 'paid'
      AND penalty.responsibility_party = 'customer'
      AND penalty.customer_id = v_customer_id
      AND penalty.responsible_customer_id = v_customer_id
      AND COALESCE(penalty.paid_by_company, false) = false
  ) OR (
    SELECT count(*)
    FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_contract_id
      AND penalty.penalty_number IN (
        'MOI-848014-2026-08-02-300',
        'MOI-848014-2026-08-12-500'
      )
      AND penalty.status = 'handled'
      AND penalty.payment_status = 'unpaid'
      AND penalty.customer_payment_status = 'unpaid'
      AND penalty.responsibility_party = 'customer'
      AND penalty.customer_id = v_customer_id
      AND penalty.responsible_customer_id = v_customer_id
      AND penalty.original_contract_id = v_contract_id
      AND penalty.original_contract_number = 'C-ALF-0105'
      AND COALESCE(penalty.paid_by_company, false) = false
  ) <> 2 OR (
    SELECT COALESCE(sum(penalty.amount), 0)
    FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_contract_id
      AND penalty.status = 'handled'
      AND penalty.payment_status = 'unpaid'
  ) <> 800
  THEN
    RAISE EXCEPTION 'Postcondition failed for the approved C-ALF-0105 penalty treatment';
  END IF;

  IF (
    SELECT jsonb_agg(to_jsonb(invoice) ORDER BY invoice.id)
    FROM public.invoices invoice
    JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_contract_id
  ) IS DISTINCT FROM v_before_invoices THEN
    RAISE EXCEPTION 'A linked invoice changed unexpectedly; rolling back the whole transaction';
  END IF;

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'applied',
      applied_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'applied_assignment_count', 1,
        'audit_log_count', 3,
        'verified_unpaid_customer_penalty_amount', 800,
        'verified_invoice_rows_unchanged', true
      )
  WHERE batch.id = v_batch_id;
END;
$migration$;

COMMIT;
