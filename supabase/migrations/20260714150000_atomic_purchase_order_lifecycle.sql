-- Atomic purchase-order creation, status transitions, and inventory receipt posting.

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE RESTRICT;

ALTER TABLE public.goods_receipts
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipt_active_journal
  ON public.journal_entries(company_id, reference_id)
  WHERE lower(COALESCE(reference_type, '')) = 'goods_receipt'
    AND lower(COALESCE(status, '')) <> 'reversed'
    AND reversal_entry_id IS NULL;

ALTER TABLE public.purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_positive_values_v1;
ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT purchase_order_items_positive_values_v1 CHECK (
    quantity > 0 AND unit_price >= 0 AND total_price >= 0
    AND COALESCE(received_quantity, 0) >= 0
    AND COALESCE(received_quantity, 0) <= quantity
  ) NOT VALID;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_v1;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_v1 CHECK (
    status IN ('draft', 'pending_approval', 'approved', 'sent_to_vendor',
               'partially_received', 'received', 'cancelled')
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.prepare_purchase_order_item_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 OR COALESCE(NEW.unit_price, 0) < 0 THEN
    RAISE EXCEPTION 'Purchase order item quantity and price are invalid' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_status FROM public.purchase_orders WHERE id = OLD.purchase_order_id FOR UPDATE;
    IF v_status NOT IN ('draft', 'pending_approval')
       AND COALESCE(current_setting('app.purchase_order_receipt_v1', true), '') <> 'authorized'
    THEN
      RAISE EXCEPTION 'Finalized purchase order items can only change through the receipt gateway' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  NEW.total_price := round((NEW.quantity * NEW.unit_price)::numeric, 3);
  NEW.received_quantity := COALESCE(NEW.received_quantity, 0);
  IF NEW.received_quantity < 0 OR NEW.received_quantity > NEW.quantity THEN
    RAISE EXCEPTION 'Received quantity is outside the ordered quantity' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_purchase_order_item_v1 ON public.purchase_order_items;
CREATE TRIGGER prepare_purchase_order_item_v1
BEFORE INSERT OR UPDATE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.prepare_purchase_order_item_v1();

CREATE OR REPLACE FUNCTION public.refresh_purchase_order_totals_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  v_subtotal numeric;
BEGIN
  SELECT round(COALESCE(sum(item.total_price), 0)::numeric, 3)
  INTO v_subtotal
  FROM public.purchase_order_items item
  WHERE item.purchase_order_id = v_order_id;

  UPDATE public.purchase_orders purchase_order
  SET subtotal = v_subtotal,
      total_amount = round((v_subtotal + COALESCE(purchase_order.tax_amount, 0))::numeric, 3),
      updated_at = now()
  WHERE purchase_order.id = v_order_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_purchase_order_totals_v1 ON public.purchase_order_items;
CREATE TRIGGER refresh_purchase_order_totals_v1
AFTER INSERT OR UPDATE OF quantity, unit_price, total_price OR DELETE
ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.refresh_purchase_order_totals_v1();

CREATE OR REPLACE FUNCTION public.guard_purchase_order_lifecycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Purchase orders are retained for audit; cancel the draft instead' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND COALESCE(current_setting('app.purchase_order_transition_v1', true), '') <> 'authorized'
     AND COALESCE(current_setting('app.purchase_order_receipt_v1', true), '') <> 'authorized'
  THEN
    RAISE EXCEPTION 'Purchase order status can only change through an approved gateway' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_purchase_order_lifecycle_v1 ON public.purchase_orders;
CREATE TRIGGER guard_purchase_order_lifecycle_v1
BEFORE UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_order_lifecycle_v1();

CREATE OR REPLACE FUNCTION public.create_purchase_order_v1(
  p_company_id uuid,
  p_vendor_id uuid,
  p_order_date date,
  p_expected_delivery_date date,
  p_notes text,
  p_terms_and_conditions text,
  p_delivery_address text,
  p_contact_person text,
  p_phone text,
  p_email text,
  p_items jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.purchase_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_order public.purchase_orders%ROWTYPE;
  v_item jsonb;
  v_order_number text;
  v_inventory_item_id uuid;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Purchase order requires at least one item' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vendors vendor
    WHERE vendor.id = p_vendor_id AND vendor.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Vendor is outside the active company' USING ERRCODE = 'P0001';
  END IF;

  v_order_number := public.generate_purchase_order_number(p_company_id);
  INSERT INTO public.purchase_orders (
    company_id, vendor_id, order_number, order_date, expected_delivery_date,
    status, subtotal, tax_amount, total_amount, currency, notes,
    terms_and_conditions, delivery_address, contact_person, phone, email, created_by
  ) VALUES (
    p_company_id, p_vendor_id, v_order_number, COALESCE(p_order_date, CURRENT_DATE),
    p_expected_delivery_date, 'draft', 0, 0, 0, 'QAR', NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    NULLIF(BTRIM(COALESCE(p_terms_and_conditions, '')), ''),
    NULLIF(BTRIM(COALESCE(p_delivery_address, '')), ''),
    NULLIF(BTRIM(COALESCE(p_contact_person, '')), ''),
    NULLIF(BTRIM(COALESCE(p_phone, '')), ''), NULLIF(BTRIM(COALESCE(p_email, '')), ''),
    v_actor_id
  ) RETURNING * INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item ->> 'quantity')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, -1) < 0
       OR NULLIF(BTRIM(COALESCE(v_item ->> 'description', '')), '') IS NULL
    THEN
      RAISE EXCEPTION 'Purchase order contains an invalid item' USING ERRCODE = 'P0001';
    END IF;
    v_inventory_item_id := NULLIF(v_item ->> 'inventory_item_id', '')::uuid;
    IF v_inventory_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.inventory_items item
      WHERE item.id = v_inventory_item_id AND item.company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'Purchase order inventory item is outside the active company' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.purchase_order_items (
      purchase_order_id, inventory_item_id, item_code, description, description_ar,
      quantity, unit_price, unit_of_measure, received_quantity, notes
    ) VALUES (
      v_order.id, v_inventory_item_id, NULLIF(BTRIM(COALESCE(v_item ->> 'item_code', '')), ''),
      BTRIM(v_item ->> 'description'), NULLIF(BTRIM(COALESCE(v_item ->> 'description_ar', '')), ''),
      (v_item ->> 'quantity')::numeric, (v_item ->> 'unit_price')::numeric,
      COALESCE(NULLIF(BTRIM(COALESCE(v_item ->> 'unit_of_measure', '')), ''), 'PCS'),
      0, NULLIF(BTRIM(COALESCE(v_item ->> 'notes', '')), '')
    );
  END LOOP;

  SELECT * INTO v_order FROM public.purchase_orders WHERE id = v_order.id;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_purchase_order_v1(
  uuid, uuid, date, date, text, text, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_order_v1(
  uuid, uuid, date, date, text, text, text, text, text, text, jsonb, uuid
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transition_purchase_order_status_v1(
  p_company_id uuid,
  p_purchase_order_id uuid,
  p_target_status text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.purchase_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.purchase_orders%ROWTYPE;
  v_actor_id uuid;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_target_status IN ('received', 'partially_received') THEN
    RAISE EXCEPTION 'Received status can only be derived by the goods receipt gateway' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_order FROM public.purchase_orders purchase_order
  WHERE purchase_order.id = p_purchase_order_id AND purchase_order.company_id = p_company_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Purchase order was not found'; END IF;
  IF v_order.status = p_target_status THEN RETURN v_order; END IF;
  IF NOT (
    (v_order.status = 'draft' AND p_target_status IN ('pending_approval', 'approved', 'sent_to_vendor', 'cancelled')) OR
    (v_order.status = 'pending_approval' AND p_target_status IN ('approved', 'cancelled')) OR
    (v_order.status = 'approved' AND p_target_status IN ('sent_to_vendor', 'cancelled')) OR
    (v_order.status = 'sent_to_vendor' AND p_target_status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Invalid purchase order transition from % to %', v_order.status, p_target_status USING ERRCODE = 'P0001';
  END IF;
  IF p_target_status = 'cancelled' AND (
    EXISTS (SELECT 1 FROM public.purchase_order_items item WHERE item.purchase_order_id = v_order.id AND COALESCE(item.received_quantity, 0) > 0)
    OR EXISTS (SELECT 1 FROM public.goods_receipts receipt WHERE receipt.purchase_order_id = v_order.id AND receipt.status <> 'cancelled')
  ) THEN
    RAISE EXCEPTION 'A purchase order with receipts cannot be cancelled automatically' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.purchase_order_transition_v1', 'authorized', true);
  UPDATE public.purchase_orders
  SET status = p_target_status,
      approved_by = CASE WHEN p_target_status IN ('approved', 'sent_to_vendor') THEN COALESCE(approved_by, v_actor_id) ELSE approved_by END,
      approved_at = CASE WHEN p_target_status IN ('approved', 'sent_to_vendor') THEN COALESCE(approved_at, now()) ELSE approved_at END,
      updated_at = now()
  WHERE id = v_order.id AND company_id = p_company_id
  RETURNING * INTO v_order;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_purchase_order_status_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_status_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.receive_purchase_order_v1(
  p_company_id uuid,
  p_purchase_order_id uuid,
  p_warehouse_id uuid,
  p_receipt_date date,
  p_delivery_note_number text,
  p_notes text,
  p_items jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.goods_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_order public.purchase_orders%ROWTYPE;
  v_receipt public.goods_receipts%ROWTYPE;
  v_po_item public.purchase_order_items%ROWTYPE;
  v_item jsonb;
  v_inventory_item_id uuid;
  v_match_count integer;
  v_quantity numeric;
  v_receipt_amount numeric := 0;
  v_effective_unit_cost numeric;
  v_all_received boolean;
  v_any_received boolean;
  v_inventory_account_id uuid;
  v_payable_account_id uuid;
  v_journal_id uuid := gen_random_uuid();
  v_entry_date date := COALESCE(p_receipt_date, CURRENT_DATE);
  v_receipt_number text;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Goods receipt requires at least one item' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) value
    GROUP BY value ->> 'purchase_order_item_id' HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Goods receipt contains a duplicate purchase order item' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_order FROM public.purchase_orders purchase_order
  WHERE purchase_order.id = p_purchase_order_id AND purchase_order.company_id = p_company_id
  FOR UPDATE;
  IF v_order.id IS NULL OR v_order.status NOT IN ('approved', 'sent_to_vendor', 'partially_received') THEN
    RAISE EXCEPTION 'Purchase order is not eligible for receipt' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_warehouses warehouse
    WHERE warehouse.id = p_warehouse_id AND warehouse.company_id = p_company_id AND warehouse.is_active
  ) THEN
    RAISE EXCEPTION 'Warehouse is outside the active company' USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, v_entry_date) THEN
    RAISE EXCEPTION 'Purchase order receipt is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  SELECT account.id INTO v_inventory_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id AND mapping.is_active
    AND lower(account_type.type_code) IN ('inventory', 'purchases')
    AND account.company_id = p_company_id AND account.is_active
    AND NOT COALESCE(account.is_header, false) AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
  ORDER BY CASE WHEN lower(account_type.type_code) = 'inventory' THEN 0 ELSE 1 END, mapping.id LIMIT 1;

  SELECT account.id INTO v_payable_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id AND mapping.is_active
    AND lower(account_type.type_code) = 'accounts_payable'
    AND account.company_id = p_company_id AND account.is_active
    AND NOT COALESCE(account.is_header, false) AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.balance_type, '')) = 'credit'
  ORDER BY mapping.id LIMIT 1;
  IF v_inventory_account_id IS NULL OR v_payable_account_id IS NULL THEN
    RAISE EXCEPTION 'Inventory/purchases and accounts payable mappings are required' USING ERRCODE = 'P0001';
  END IF;

  v_receipt_number := public.generate_goods_receipt_number(p_company_id);
  INSERT INTO public.goods_receipts (
    company_id, purchase_order_id, receipt_number, receipt_date, received_by,
    warehouse_id, delivery_note_number, notes, status
  ) VALUES (
    p_company_id, v_order.id, v_receipt_number, v_entry_date, v_actor_id,
    p_warehouse_id, NULLIF(BTRIM(COALESCE(p_delivery_note_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), 'completed'
  ) RETURNING * INTO v_receipt;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := COALESCE((v_item ->> 'quantity_received')::numeric, 0);
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Received quantity must be greater than zero'; END IF;
    SELECT * INTO v_po_item FROM public.purchase_order_items item
    WHERE item.id = (v_item ->> 'purchase_order_item_id')::uuid
      AND item.purchase_order_id = v_order.id
    FOR UPDATE;
    IF v_po_item.id IS NULL OR COALESCE(v_po_item.received_quantity, 0) + v_quantity > v_po_item.quantity THEN
      RAISE EXCEPTION 'Goods receipt exceeds the remaining ordered quantity' USING ERRCODE = 'P0001';
    END IF;

    v_inventory_item_id := v_po_item.inventory_item_id;
    IF v_inventory_item_id IS NULL AND NULLIF(BTRIM(COALESCE(v_po_item.item_code, '')), '') IS NOT NULL THEN
      SELECT count(*), min(item.id) INTO v_match_count, v_inventory_item_id
      FROM public.inventory_items item
      WHERE item.company_id = p_company_id AND item.is_active
        AND lower(item.item_code) = lower(v_po_item.item_code);
      IF v_match_count <> 1 THEN v_inventory_item_id := NULL; END IF;
    END IF;
    IF v_inventory_item_id IS NULL THEN
      RAISE EXCEPTION 'Purchase order item % has no unique inventory item link', v_po_item.id USING ERRCODE = 'P0001';
    END IF;

    v_effective_unit_cost := CASE
      WHEN v_order.subtotal > 0 THEN round((v_po_item.unit_price * v_order.total_amount / v_order.subtotal)::numeric, 3)
      ELSE v_po_item.unit_price
    END;
    INSERT INTO public.goods_receipt_items (
      goods_receipt_id, purchase_order_item_id, received_quantity, notes
    ) VALUES (
      v_receipt.id, v_po_item.id, v_quantity, NULLIF(BTRIM(COALESCE(v_item ->> 'notes', '')), '')
    );
    INSERT INTO public.inventory_movements (
      company_id, item_id, warehouse_id, movement_type, quantity, movement_date,
      reference_type, reference_id, reference_number, unit_cost, total_cost, notes, created_by
    ) VALUES (
      p_company_id, v_inventory_item_id, p_warehouse_id, 'PURCHASE', v_quantity, v_entry_date,
      'GOODS_RECEIPT', v_receipt.id, v_receipt.receipt_number, v_effective_unit_cost,
      round((v_quantity * v_effective_unit_cost)::numeric, 3),
      COALESCE(NULLIF(BTRIM(COALESCE(v_item ->> 'notes', '')), ''), 'Purchase order receipt'), v_actor_id
    );
    PERFORM set_config('app.purchase_order_receipt_v1', 'authorized', true);
    UPDATE public.purchase_order_items
    SET inventory_item_id = v_inventory_item_id,
        received_quantity = COALESCE(received_quantity, 0) + v_quantity,
        updated_at = now()
    WHERE id = v_po_item.id;
    v_receipt_amount := v_receipt_amount + round((v_quantity * v_effective_unit_cost)::numeric, 3);
  END LOOP;

  SELECT bool_and(COALESCE(item.received_quantity, 0) >= item.quantity),
         bool_or(COALESCE(item.received_quantity, 0) > 0)
  INTO v_all_received, v_any_received
  FROM public.purchase_order_items item WHERE item.purchase_order_id = v_order.id;
  IF v_all_received THEN
    SELECT round((v_order.total_amount - COALESCE(sum(entry.total_debit), 0))::numeric, 3)
    INTO v_receipt_amount
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id AND lower(COALESCE(entry.reference_type, '')) = 'goods_receipt'
      AND entry.reference_id IN (SELECT receipt.id FROM public.goods_receipts receipt WHERE receipt.purchase_order_id = v_order.id)
      AND lower(COALESCE(entry.status, '')) = 'posted' AND entry.reversal_entry_id IS NULL;
  END IF;
  IF v_receipt_amount <= 0 THEN RAISE EXCEPTION 'Goods receipt accounting amount is invalid'; END IF;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id,
    'JE-GR-' || to_char(v_entry_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8),
    v_entry_date, 'Goods receipt ' || v_receipt.receipt_number || ' for ' || v_order.order_number,
    'goods_receipt', v_receipt.id, 'posted', v_receipt_amount, v_receipt_amount,
    v_actor_id, v_actor_id, now()
  );
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
  ) VALUES
    (v_journal_id, v_inventory_account_id, 'Inventory receipt ' || v_receipt.receipt_number, v_receipt_amount, 0, 1),
    (v_journal_id, v_payable_account_id, 'Accounts payable for ' || v_order.order_number, 0, v_receipt_amount, 2);
  UPDATE public.goods_receipts SET journal_entry_id = v_journal_id, updated_at = now()
  WHERE id = v_receipt.id AND company_id = p_company_id;

  PERFORM set_config('app.purchase_order_receipt_v1', 'authorized', true);
  UPDATE public.purchase_orders
  SET status = CASE WHEN v_all_received THEN 'received' WHEN v_any_received THEN 'partially_received' ELSE status END,
      delivery_date = CASE WHEN v_all_received THEN v_entry_date ELSE delivery_date END,
      updated_at = now()
  WHERE id = v_order.id AND company_id = p_company_id;

  SELECT * INTO v_receipt FROM public.goods_receipts WHERE id = v_receipt.id;
  RETURN v_receipt;
END;
$$;

REVOKE ALL ON FUNCTION public.receive_purchase_order_v1(
  uuid, uuid, uuid, date, text, text, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_v1(
  uuid, uuid, uuid, date, text, text, jsonb, uuid
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.prepare_purchase_order_item_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_purchase_order_totals_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_purchase_order_lifecycle_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_purchase_order_item_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_purchase_order_totals_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_purchase_order_lifecycle_v1() TO service_role;

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES
  ('purchase_order.sync_totals', 'inventory', 'Recalculate purchase order totals from its item ledger.',
   'purchase_orders', ARRAY['subtotal', 'total_amount'], true, false, 'allow_derived', 1.0, true),
  ('purchase_order.sync_receipt_status', 'inventory', 'Derive partial or complete receipt status from item quantities.',
   'purchase_orders', ARRAY['status'], true, false, 'allow_derived', 1.0, true)
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = EXCLUDED.reversible,
  approval_required = EXCLUDED.approval_required,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  enabled = EXCLUDED.enabled,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.system_agent_apply_purchase_order_repair_v1(
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
  v_order public.purchase_orders%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_subtotal numeric;
  v_target_status text;
  v_any_received boolean;
  v_all_received boolean;
  v_repair_id uuid := gen_random_uuid();
BEGIN
  IF p_command NOT IN ('purchase_order.sync_totals', 'purchase_order.sync_receipt_status') THEN
    RAISE EXCEPTION 'Command is not handled by the purchase order repair gateway';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Purchase order repairs do not accept caller-selected values';
  END IF;

  SELECT * INTO v_job FROM public.system_agent_jobs job
  WHERE job.id = p_job_id AND job.run_id = p_run_id AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' OR v_job.domain <> 'inventory' THEN
    RAISE EXCEPTION 'System agent inventory job is not an active apply job';
  END IF;
  SELECT * INTO v_finding FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Purchase order finding is invalid, mismatched, or already processed';
  END IF;
  SELECT * INTO v_registry FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command AND registry.domain = 'inventory'
    AND registry.enabled AND registry.reversible AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Purchase order repair command is disabled or below confidence threshold';
  END IF;
  SELECT * INTO v_order FROM public.purchase_orders purchase_order
  WHERE purchase_order.id = p_entity_id::uuid AND purchase_order.company_id = p_company_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Purchase order is outside the active company'; END IF;

  v_before := public.system_agent_pick_fields(to_jsonb(v_order), v_registry.allowed_fields);
  IF NOT (v_before @> COALESCE(p_expected_before, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'Purchase order changed after detection';
  END IF;

  IF p_command = 'purchase_order.sync_totals' THEN
    SELECT round(COALESCE(sum(item.total_price), 0)::numeric, 3)
    INTO v_subtotal FROM public.purchase_order_items item WHERE item.purchase_order_id = v_order.id;
    UPDATE public.purchase_orders
    SET subtotal = v_subtotal,
        total_amount = round((v_subtotal + COALESCE(tax_amount, 0))::numeric, 3),
        updated_at = now()
    WHERE id = v_order.id AND company_id = p_company_id;
  ELSE
    SELECT bool_or(COALESCE(item.received_quantity, 0) > 0),
           bool_and(COALESCE(item.received_quantity, 0) >= item.quantity)
    INTO v_any_received, v_all_received
    FROM public.purchase_order_items item WHERE item.purchase_order_id = v_order.id;
    IF NOT COALESCE(v_any_received, false) THEN
      RAISE EXCEPTION 'No received quantities support automatic status change';
    END IF;
    v_target_status := CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END;
    PERFORM set_config('app.purchase_order_transition_v1', 'authorized', true);
    UPDATE public.purchase_orders
    SET status = v_target_status,
        delivery_date = CASE WHEN v_all_received THEN COALESCE(delivery_date, CURRENT_DATE) ELSE delivery_date END,
        updated_at = now()
    WHERE id = v_order.id AND company_id = p_company_id;
  END IF;

  SELECT * INTO v_order FROM public.purchase_orders WHERE id = v_order.id;
  v_after := public.system_agent_pick_fields(to_jsonb(v_order), v_registry.allowed_fields);
  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'state', v_after);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'inventory', p_command,
    'purchase_orders', v_order.id::text, v_before, v_after,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('handler_version', 'purchase_order_v1')
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;
  RETURN jsonb_build_object('status', 'repaired', 'repair_id', v_repair_id,
    'command', p_command, 'entity_id', v_order.id, 'before', v_before, 'after', v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_apply_purchase_order_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_purchase_order_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_purchase_order_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_purchase_order_v1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_purchase_order_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_order public.purchase_orders%ROWTYPE;
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'purchase_order_v1' THEN
    RETURN public.system_agent_rollback_repair_before_purchase_order_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Only an applied repair can be rolled back'; END IF;
  SELECT * INTO v_order FROM public.purchase_orders purchase_order
  WHERE purchase_order.id = v_repair.entity_id::uuid AND purchase_order.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Purchase order was not found'; END IF;
  v_current := public.system_agent_pick_fields(to_jsonb(v_order),
    CASE WHEN v_repair.command = 'purchase_order.sync_totals'
      THEN ARRAY['subtotal', 'total_amount']::text[] ELSE ARRAY['status']::text[] END);
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Purchase order changed after repair; rollback was safely aborted';
  END IF;

  PERFORM set_config('app.purchase_order_transition_v1', 'authorized', true);
  IF v_repair.command = 'purchase_order.sync_totals' THEN
    UPDATE public.purchase_orders SET
      subtotal = (v_repair.before_state ->> 'subtotal')::numeric,
      total_amount = (v_repair.before_state ->> 'total_amount')::numeric,
      updated_at = now()
    WHERE id = v_order.id AND company_id = v_repair.company_id;
  ELSE
    UPDATE public.purchase_orders SET
      status = v_repair.before_state ->> 'status', updated_at = now()
    WHERE id = v_order.id AND company_id = v_repair.company_id;
  END IF;

  UPDATE public.system_agent_repairs SET status = 'rolled_back', rolled_back_at = now(),
    rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
    error = NULL, updated_at = now() WHERE id = p_repair_id;
  UPDATE public.system_agent_findings SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;
  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text) TO service_role;
