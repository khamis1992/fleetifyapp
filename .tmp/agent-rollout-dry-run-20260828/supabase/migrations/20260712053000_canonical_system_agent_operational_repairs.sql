-- Canonical database-side derivations for non-finance system-agent commands.
-- Worker values are advisory only and are never written directly.

CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle public.vehicles%ROWTYPE;
  v_has_active_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
  v_target_status text;
  v_maximum_mileage numeric := 0;
BEGIN
  SELECT * INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id AND vehicle.company_id = p_company_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND lower(COALESCE(contract.status::text, '')) IN ('active', 'under_legal_procedure')
      AND (contract.start_date IS NULL OR contract.start_date <= CURRENT_DATE)
      AND (contract.end_date IS NULL OR contract.end_date >= CURRENT_DATE)
  ) INTO v_has_active_contract;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = p_company_id
      AND maintenance.vehicle_id = p_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id
      AND reservation.vehicle_id = p_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN ('cancelled', 'canceled', 'completed', 'expired')
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
    WHEN lower(COALESCE(v_vehicle.status::text, '')) IN (
      'maintenance', 'accident', 'stolen', 'police_station',
      'out_of_service', 'reserved_employee', 'municipality'
    ) THEN NULL
    WHEN v_has_open_maintenance THEN 'maintenance'
    WHEN v_has_active_contract THEN 'rented'
    WHEN v_has_active_reservation THEN 'street_52'
    WHEN lower(COALESCE(v_vehicle.status::text, '')) = 'street_52' THEN NULL
    WHEN v_vehicle.is_active = false THEN 'out_of_service'
    ELSE 'available'
  END;

  SELECT GREATEST(
    COALESCE(v_vehicle.current_mileage, 0),
    COALESCE(v_vehicle.odometer_reading, 0),
    COALESCE(MAX(reading.odometer_reading), 0)
  )
  INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_active_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.system_agent_customer_balance_state(
  p_balance_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_active_invoice_total numeric := 0;
  v_completed_receipts numeric := 0;
  v_overdue_amount numeric := 0;
  v_days_overdue integer := 0;
  v_last_payment_amount numeric;
  v_last_payment_date date;
BEGIN
  SELECT balance.customer_id INTO v_customer_id
  FROM public.customer_balances balance
  JOIN public.customers customer
    ON customer.id = balance.customer_id AND customer.company_id = balance.company_id
  WHERE balance.id = p_balance_id AND balance.company_id = p_company_id;
  IF v_customer_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(COALESCE(invoice.total_amount, 0)), 0)
  INTO v_active_invoice_total
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.customer_id = v_customer_id
    AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded'
    );

  SELECT COALESCE(SUM(COALESCE(payment.amount, 0)), 0)
  INTO v_completed_receipts
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.customer_id = v_customer_id
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

  WITH invoice_state AS (
    SELECT
      COALESCE(invoice.due_date, invoice.invoice_date)::date AS due_date,
      GREATEST(
        COALESCE(invoice.total_amount, 0)
          - public.canonical_invoice_paid_amount(invoice.id, NULL),
        0
      ) AS balance_due
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.customer_id = v_customer_id
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded'
      )
  )
  SELECT
    COALESCE(SUM(state.balance_due) FILTER (
      WHERE state.due_date < CURRENT_DATE AND state.balance_due > 0.01
    ), 0),
    COALESCE(MAX(CURRENT_DATE - state.due_date) FILTER (
      WHERE state.due_date < CURRENT_DATE AND state.balance_due > 0.01
    ), 0)
  INTO v_overdue_amount, v_days_overdue
  FROM invoice_state state;

  SELECT payment.amount, payment.payment_date
  INTO v_last_payment_amount, v_last_payment_date
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.customer_id = v_customer_id
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
  ORDER BY payment.payment_date DESC NULLS LAST, payment.created_at DESC, payment.id DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'current_balance', round((v_active_invoice_total - v_completed_receipts)::numeric, 2),
    'overdue_amount', round(v_overdue_amount::numeric, 2),
    'days_overdue', v_days_overdue,
    'last_payment_amount', CASE
      WHEN v_last_payment_amount IS NULL THEN NULL
      ELSE round(v_last_payment_amount::numeric, 2)
    END,
    'last_payment_date', v_last_payment_date
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.system_agent_inventory_movement_state(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'quantity_on_hand', round(COALESCE(SUM(
      CASE upper(COALESCE(movement.movement_type::text, ''))
        WHEN 'PURCHASE' THEN abs(COALESCE(movement.quantity, 0))
        WHEN 'TRANSFER_IN' THEN abs(COALESCE(movement.quantity, 0))
        WHEN 'RETURN' THEN abs(COALESCE(movement.quantity, 0))
        WHEN 'IN' THEN abs(COALESCE(movement.quantity, 0))
        WHEN 'SALE' THEN -abs(COALESCE(movement.quantity, 0))
        WHEN 'TRANSFER_OUT' THEN -abs(COALESCE(movement.quantity, 0))
        WHEN 'OUT' THEN -abs(COALESCE(movement.quantity, 0))
        WHEN 'ADJUSTMENT' THEN COALESCE(movement.quantity, 0)
        ELSE 0
      END
    ), 0)::numeric, 2),
    'last_movement_at', MAX(movement.movement_date)
  )
  FROM public.inventory_movements movement
  WHERE movement.company_id = p_company_id
    AND movement.item_id = p_item_id
    AND movement.warehouse_id = p_warehouse_id;
$$;
CREATE OR REPLACE FUNCTION public.system_agent_attendance_hours(p_attendance_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.attendance_records%ROWTYPE;
  v_check_in timestamp;
  v_check_out timestamp;
  v_break_start timestamp;
  v_break_end timestamp;
  v_hours numeric;
BEGIN
  SELECT * INTO v_record
  FROM public.attendance_records attendance
  WHERE attendance.id = p_attendance_id;
  IF NOT FOUND OR v_record.check_in_time IS NULL OR v_record.check_out_time IS NULL THEN
    RETURN NULL;
  END IF;

  v_check_in := v_record.attendance_date + v_record.check_in_time;
  v_check_out := v_record.attendance_date + v_record.check_out_time;
  IF v_check_out <= v_check_in THEN RETURN NULL; END IF;

  v_hours := EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 3600;
  IF v_record.break_start_time IS NOT NULL AND v_record.break_end_time IS NOT NULL THEN
    v_break_start := v_record.attendance_date + v_record.break_start_time;
    v_break_end := v_record.attendance_date + v_record.break_end_time;
    IF v_break_end > v_break_start
       AND v_break_start >= v_check_in
       AND v_break_end <= v_check_out
    THEN
      v_hours := v_hours - EXTRACT(EPOCH FROM (v_break_end - v_break_start)) / 3600;
    END IF;
  END IF;

  RETURN round(GREATEST(v_hours, 0)::numeric, 2);
END;
$$;
CREATE OR REPLACE FUNCTION public.system_agent_leave_balance_state(p_balance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.leave_balances%ROWTYPE;
  v_used numeric := 0;
BEGIN
  SELECT * INTO v_balance
  FROM public.leave_balances balance
  WHERE balance.id = p_balance_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(COALESCE(request.total_days, 0)), 0)
  INTO v_used
  FROM public.leave_requests request
  WHERE request.employee_id = v_balance.employee_id
    AND request.leave_type_id = v_balance.leave_type_id
    AND lower(COALESCE(request.status, '')) = 'approved'
    AND EXTRACT(YEAR FROM request.start_date)::integer = v_balance.year;

  RETURN jsonb_build_object(
    'used_days', round(v_used::numeric, 2),
    'remaining_days', round(GREATEST(COALESCE(v_balance.total_days, 0) - v_used, 0)::numeric, 2)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_vehicle_derived_state(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_customer_balance_state(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_inventory_movement_state(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_attendance_hours(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_leave_balance_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_vehicle_derived_state(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_customer_balance_state(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_inventory_movement_state(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_attendance_hours(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_leave_balance_state(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_operational_repair(
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
  v_balance public.customer_balances%ROWTYPE;
  v_stock public.inventory_stock_levels%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_employee public.employees%ROWTYPE;
  v_attendance public.attendance_records%ROWTYPE;
  v_leave public.leave_balances%ROWTYPE;
  v_payroll public.payroll%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_derived jsonb;
  v_target jsonb;
  v_expected_matches boolean := false;
  v_entity_uuid uuid;
  v_item_id uuid;
  v_warehouse_id uuid;
  v_created_id uuid;
  v_repair_entity_id text := p_entity_id;
  v_repair_id uuid := gen_random_uuid();
  v_effective_date date;
  v_target_status text;
  v_target_number numeric;
  v_repair_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'operational_v2');
BEGIN
  IF p_command NOT IN (
    'vehicle.sync_status',
    'vehicle.sync_mileage',
    'customer.sync_balance',
    'inventory.sync_stock_level',
    'inventory.create_stock_level',
    'legal.sync_case_costs',
    'employee.sync_active_status',
    'employee.sync_attendance_hours',
    'employee.sync_leave_balance',
    'employee.sync_payroll_net'
  ) THEN
    RAISE EXCEPTION 'Command is not handled by the canonical operational repair gateway';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' THEN
    RAISE EXCEPTION 'System agent job is not an active apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL
     OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Operational finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_registry.domain <> v_job.domain
     OR v_finding.confidence < v_registry.min_confidence
  THEN
    RAISE EXCEPTION 'Operational repair command is disabled, out of scope, or below confidence threshold';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_values, '{}'::jsonb)) supplied(field_name)
    WHERE NOT (supplied.field_name = ANY(v_registry.allowed_fields))
  ) THEN
    RAISE EXCEPTION 'Repair payload contains a field outside the command registry';
  END IF;

  IF p_command IN ('vehicle.sync_status', 'vehicle.sync_mileage') THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_vehicle
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_entity_uuid AND vehicle.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_vehicle), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_derived := public.system_agent_vehicle_derived_state(v_vehicle.id, p_company_id);
    IF v_derived IS NULL THEN RAISE EXCEPTION 'Vehicle derivation failed'; END IF;

    IF p_command = 'vehicle.sync_status' THEN
      v_target_status := v_derived ->> 'target_status';
      IF v_target_status IS NULL OR lower(COALESCE(v_vehicle.status::text, '')) = lower(v_target_status) THEN
        v_after := v_before;
      ELSE
        IF NOT v_expected_matches THEN
          RAISE EXCEPTION 'Vehicle changed after detection and is still inconsistent';
        END IF;
        UPDATE public.vehicles vehicle
        SET status = v_target_status::public.vehicle_status, updated_at = now()
        WHERE vehicle.id = v_vehicle.id AND vehicle.company_id = p_company_id;
        SELECT * INTO v_vehicle FROM public.vehicles WHERE id = v_entity_uuid;
        v_after := public.system_agent_pick_fields(to_jsonb(v_vehicle), v_registry.allowed_fields);
        IF lower(COALESCE(v_vehicle.status::text, '')) <> lower(v_target_status) THEN
          RAISE EXCEPTION 'Vehicle status failed canonical postcondition verification';
        END IF;
      END IF;
    ELSE
      v_target_number := (v_derived ->> 'maximum_mileage')::numeric;
      IF abs(COALESCE(v_vehicle.current_mileage, 0) - v_target_number) <= 0.01
         AND abs(COALESCE(v_vehicle.odometer_reading, 0) - v_target_number) <= 0.01
      THEN
        v_after := v_before;
      ELSE
        IF NOT v_expected_matches THEN
          RAISE EXCEPTION 'Vehicle mileage changed after detection and is still inconsistent';
        END IF;
        UPDATE public.vehicles vehicle
        SET
          current_mileage = v_target_number,
          odometer_reading = v_target_number,
          updated_at = now()
        WHERE vehicle.id = v_vehicle.id AND vehicle.company_id = p_company_id;
        SELECT * INTO v_vehicle FROM public.vehicles WHERE id = v_entity_uuid;
        v_after := public.system_agent_pick_fields(to_jsonb(v_vehicle), v_registry.allowed_fields);
        IF abs(COALESCE(v_vehicle.current_mileage, 0) - v_target_number) > 0.01
           OR abs(COALESCE(v_vehicle.odometer_reading, 0) - v_target_number) > 0.01
        THEN
          RAISE EXCEPTION 'Vehicle mileage failed canonical postcondition verification';
        END IF;
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata || jsonb_build_object('derived_state', v_derived);

  ELSIF p_command = 'customer.sync_balance' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_balance
    FROM public.customer_balances balance
    WHERE balance.id = v_entity_uuid AND balance.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer balance is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_balance), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_target := public.system_agent_customer_balance_state(v_balance.id, p_company_id);
    IF v_target IS NULL THEN RAISE EXCEPTION 'Customer balance derivation failed'; END IF;

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Customer balance changed after detection and is still inconsistent';
      END IF;
      UPDATE public.customer_balances balance
      SET
        current_balance = (v_target ->> 'current_balance')::numeric,
        overdue_amount = (v_target ->> 'overdue_amount')::numeric,
        days_overdue = (v_target ->> 'days_overdue')::integer,
        last_payment_amount = CASE
          WHEN v_target ->> 'last_payment_amount' IS NULL THEN NULL
          ELSE (v_target ->> 'last_payment_amount')::numeric
        END,
        last_payment_date = CASE
          WHEN v_target ->> 'last_payment_date' IS NULL THEN NULL
          ELSE (v_target ->> 'last_payment_date')::date
        END,
        updated_at = now()
      WHERE balance.id = v_balance.id AND balance.company_id = p_company_id;
      SELECT * INTO v_balance FROM public.customer_balances WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_balance), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Customer balance failed canonical postcondition verification';
      END IF;
    END IF;

  ELSIF p_command = 'inventory.sync_stock_level' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_stock
    FROM public.inventory_stock_levels stock
    WHERE stock.id = v_entity_uuid AND stock.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock level is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_stock), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_derived := public.system_agent_inventory_movement_state(
      p_company_id, v_stock.item_id, v_stock.warehouse_id
    );
    v_target_number := (v_derived ->> 'quantity_on_hand')::numeric;
    IF v_target_number < 0 OR v_target_number - COALESCE(v_stock.quantity_reserved, 0) < 0 THEN
      RAISE EXCEPTION 'Movement ledger or reservations produce negative available stock; manual inventory review is required';
    END IF;
    v_target := jsonb_build_object(
      'quantity_on_hand', v_target_number,
      'quantity_available', round((v_target_number - COALESCE(v_stock.quantity_reserved, 0))::numeric, 2),
      'last_movement_at', v_derived -> 'last_movement_at'
    );

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Stock level changed after detection and is still inconsistent';
      END IF;
      UPDATE public.inventory_stock_levels stock
      SET
        quantity_on_hand = (v_target ->> 'quantity_on_hand')::numeric,
        quantity_available = (v_target ->> 'quantity_available')::numeric,
        last_movement_at = CASE
          WHEN v_target ->> 'last_movement_at' IS NULL THEN NULL
          ELSE (v_target ->> 'last_movement_at')::timestamptz
        END,
        updated_at = now()
      WHERE stock.id = v_stock.id AND stock.company_id = p_company_id;
      SELECT * INTO v_stock FROM public.inventory_stock_levels WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_stock), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Stock level failed movement-ledger postcondition verification';
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata || jsonb_build_object(
      'item_id', v_stock.item_id,
      'warehouse_id', v_stock.warehouse_id,
      'derived_state', v_derived
    );

  ELSIF p_command = 'inventory.create_stock_level' THEN
    IF p_entity_id !~* '^[0-9a-f-]{36}:[0-9a-f-]{36}$' THEN
      RAISE EXCEPTION 'Inventory pair identifier is invalid';
    END IF;
    v_item_id := split_part(p_entity_id, ':', 1)::uuid;
    v_warehouse_id := split_part(p_entity_id, ':', 2)::uuid;

    PERFORM 1 FROM public.inventory_items item
    WHERE item.id = v_item_id AND item.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item is outside the active company'; END IF;
    PERFORM 1 FROM public.inventory_warehouses warehouse
    WHERE warehouse.id = v_warehouse_id AND warehouse.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory warehouse is outside the active company'; END IF;

    SELECT * INTO v_stock
    FROM public.inventory_stock_levels stock
    WHERE stock.company_id = p_company_id
      AND stock.item_id = v_item_id
      AND stock.warehouse_id = v_warehouse_id
    FOR UPDATE;

    IF FOUND THEN
      v_before := jsonb_build_object(
        'exists', true,
        'quantity_on_hand', v_stock.quantity_on_hand,
        'quantity_available', v_stock.quantity_available,
        'last_movement_at', v_stock.last_movement_at
      );
      v_after := v_before;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.inventory_movements movement
        WHERE movement.company_id = p_company_id
          AND movement.item_id = v_item_id
          AND movement.warehouse_id = v_warehouse_id
      ) THEN
        RAISE EXCEPTION 'No movement ledger supports creation of this stock level';
      END IF;
      v_before := jsonb_build_object('exists', false);
      v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
        OR v_before @> p_expected_before;
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Inventory pair changed after detection';
      END IF;

      v_derived := public.system_agent_inventory_movement_state(
        p_company_id, v_item_id, v_warehouse_id
      );
      v_target_number := (v_derived ->> 'quantity_on_hand')::numeric;
      IF v_target_number < 0 THEN
        RAISE EXCEPTION 'Movement ledger produces negative stock; create requires manual inventory review';
      END IF;

      INSERT INTO public.inventory_stock_levels (
        company_id, item_id, warehouse_id, quantity_on_hand,
        quantity_reserved, quantity_available, last_movement_at, updated_at
      ) VALUES (
        p_company_id,
        v_item_id,
        v_warehouse_id,
        v_target_number,
        0,
        v_target_number,
        CASE
          WHEN v_derived ->> 'last_movement_at' IS NULL THEN NULL
          ELSE (v_derived ->> 'last_movement_at')::timestamptz
        END,
        now()
      ) RETURNING id INTO v_created_id;

      SELECT * INTO v_stock FROM public.inventory_stock_levels WHERE id = v_created_id;
      v_repair_entity_id := v_created_id::text;
      v_after := jsonb_build_object(
        'exists', true,
        'quantity_on_hand', v_stock.quantity_on_hand,
        'quantity_available', v_stock.quantity_available,
        'last_movement_at', v_stock.last_movement_at
      );
      v_repair_metadata := v_repair_metadata || jsonb_build_object(
        'created_stock_level_id', v_created_id,
        'item_id', v_item_id,
        'warehouse_id', v_warehouse_id,
        'derived_state', v_derived
      );
    END IF;

  ELSIF p_command = 'legal.sync_case_costs' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_case
    FROM public.legal_cases legal_case
    WHERE legal_case.id = v_entity_uuid AND legal_case.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Legal case is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_case), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_target_number := round((
      COALESCE(v_case.legal_fees, 0)
      + COALESCE(v_case.court_fees, 0)
      + COALESCE(v_case.other_expenses, 0)
    )::numeric, 2);
    v_target := jsonb_build_object('total_costs', v_target_number);

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Legal case changed after detection and is still inconsistent';
      END IF;
      UPDATE public.legal_cases legal_case
      SET total_costs = v_target_number, updated_at = now()
      WHERE legal_case.id = v_case.id AND legal_case.company_id = p_company_id;
      SELECT * INTO v_case FROM public.legal_cases WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_case), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Legal case costs failed canonical postcondition verification';
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata || jsonb_build_object(
      'legal_fees', v_case.legal_fees,
      'court_fees', v_case.court_fees,
      'other_expenses', v_case.other_expenses
    );

  ELSIF p_command = 'employee.sync_active_status' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_employee
    FROM public.employees employee
    WHERE employee.id = v_entity_uuid AND employee.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_employee), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    IF v_employee.termination_date IS NULL OR v_employee.termination_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Employee termination date does not support automatic deactivation';
    END IF;
    v_target := jsonb_build_object('is_active', false, 'account_status', 'inactive');

    IF v_employee.is_active = false THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Employee changed after detection and is still inconsistent';
      END IF;
      UPDATE public.employees employee
      SET is_active = false, account_status = 'inactive', updated_at = now()
      WHERE employee.id = v_employee.id AND employee.company_id = p_company_id;
      SELECT * INTO v_employee FROM public.employees WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_employee), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Employee deactivation failed postcondition verification';
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata
      || jsonb_build_object('termination_date', v_employee.termination_date);

  ELSIF p_command = 'employee.sync_attendance_hours' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT attendance.* INTO v_attendance
    FROM public.attendance_records attendance
    JOIN public.employees employee ON employee.id = attendance.employee_id
    WHERE attendance.id = v_entity_uuid AND employee.company_id = p_company_id
    FOR UPDATE OF attendance;
    IF NOT FOUND THEN RAISE EXCEPTION 'Attendance record is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_attendance), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    IF COALESCE(v_attendance.is_approved, false) THEN
      RAISE EXCEPTION 'Approved attendance cannot be changed automatically';
    END IF;
    v_target_number := public.system_agent_attendance_hours(v_attendance.id);
    IF v_target_number IS NULL THEN
      RAISE EXCEPTION 'Attendance timestamps do not form a valid positive duration';
    END IF;
    v_target := jsonb_build_object('total_hours', v_target_number);

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Attendance changed after detection and is still inconsistent';
      END IF;
      UPDATE public.attendance_records attendance
      SET total_hours = v_target_number, updated_at = now()
      WHERE attendance.id = v_attendance.id AND COALESCE(attendance.is_approved, false) = false;
      SELECT * INTO v_attendance FROM public.attendance_records WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_attendance), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Attendance hours failed canonical postcondition verification';
      END IF;
    END IF;

  ELSIF p_command = 'employee.sync_leave_balance' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT balance.* INTO v_leave
    FROM public.leave_balances balance
    JOIN public.employees employee ON employee.id = balance.employee_id
    WHERE balance.id = v_entity_uuid AND employee.company_id = p_company_id
    FOR UPDATE OF balance;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave balance is outside the active company'; END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_leave), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_target := public.system_agent_leave_balance_state(v_leave.id);
    IF v_target IS NULL THEN RAISE EXCEPTION 'Leave balance derivation failed'; END IF;

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Leave balance changed after detection and is still inconsistent';
      END IF;
      UPDATE public.leave_balances balance
      SET
        used_days = (v_target ->> 'used_days')::numeric,
        remaining_days = (v_target ->> 'remaining_days')::numeric,
        updated_at = now()
      WHERE balance.id = v_leave.id;
      SELECT * INTO v_leave FROM public.leave_balances WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_leave), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Leave balance failed canonical postcondition verification';
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata || jsonb_build_object(
      'employee_id', v_leave.employee_id,
      'leave_type_id', v_leave.leave_type_id,
      'year', v_leave.year
    );

  ELSIF p_command = 'employee.sync_payroll_net' THEN
    v_entity_uuid := p_entity_id::uuid;
    SELECT * INTO v_payroll
    FROM public.payroll payroll
    WHERE payroll.id = v_entity_uuid AND payroll.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payroll is outside the active company'; END IF;

    v_effective_date := v_payroll.payroll_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_payroll), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    IF lower(COALESCE(v_payroll.status, '')) IN ('paid', 'posted', 'approved', 'completed')
       OR v_payroll.journal_entry_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'Approved, posted, paid, or journal-linked payroll cannot be changed automatically';
    END IF;
    v_target_number := round((
      COALESCE(v_payroll.basic_salary, 0)
      + COALESCE(v_payroll.allowances, 0)
      + COALESCE(v_payroll.overtime_amount, 0)
      - COALESCE(v_payroll.deductions, 0)
      - COALESCE(v_payroll.tax_amount, 0)
    )::numeric, 2);
    IF v_target_number < 0 THEN
      RAISE EXCEPTION 'Payroll components produce a negative net amount and require HR review';
    END IF;
    v_target := jsonb_build_object('net_amount', v_target_number);

    IF v_before IS NOT DISTINCT FROM v_target THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Payroll changed after detection and is still inconsistent';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Payroll repair is blocked by a closed accounting period';
      END IF;
      UPDATE public.payroll payroll
      SET net_amount = v_target_number, updated_at = now()
      WHERE payroll.id = v_payroll.id AND payroll.company_id = p_company_id;
      SELECT * INTO v_payroll FROM public.payroll WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_payroll), v_registry.allowed_fields);
      IF v_after IS DISTINCT FROM v_target THEN
        RAISE EXCEPTION 'Payroll net amount failed canonical postcondition verification';
      END IF;
    END IF;
    v_repair_metadata := v_repair_metadata || jsonb_build_object(
      'basic_salary', v_payroll.basic_salary,
      'allowances', v_payroll.allowances,
      'overtime_amount', v_payroll.overtime_amount,
      'deductions', v_payroll.deductions,
      'tax_amount', v_payroll.tax_amount,
      'journal_entry_id', v_payroll.journal_entry_id
    );
  END IF;

  IF v_before IS NULL OR v_after IS NULL THEN
    RAISE EXCEPTION 'Operational repair did not produce auditable states';
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object(
      'status', 'verified_no_change',
      'command', p_command,
      'entity_id', p_entity_id,
      'state', v_after
    );
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, v_job.domain, p_command,
    v_registry.entity_table, v_repair_entity_id, v_before, v_after, v_repair_metadata
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', v_repair_entity_id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_operational_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_operational_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_apply_operational_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical operational mutation gateway for fleet, customers, inventory, legal, and employee agents. Values are derived and verified inside PostgreSQL.';
