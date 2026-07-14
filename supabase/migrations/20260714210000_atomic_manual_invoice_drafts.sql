-- Atomically create invoice headers and their items.

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS manual_idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_manual_idempotency
  ON public.invoices(company_id, manual_idempotency_key)
  WHERE manual_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_manual_invoice_v1(
  p_company_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_invoice_type text,
  p_due_date date,
  p_customer_id uuid,
  p_vendor_id uuid,
  p_currency text,
  p_discount_amount numeric,
  p_notes text,
  p_terms text,
  p_contract_id uuid,
  p_cost_center_id uuid,
  p_fixed_asset_id uuid,
  p_items jsonb,
  p_idempotency_key uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_item record;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_discount numeric := COALESCE(p_discount_amount, 0);
  v_line_total numeric;
  v_line_tax numeric;
  v_account_id uuid;
  v_item_cost_center_id uuid;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR p_invoice_date IS NULL
     OR NULLIF(BTRIM(COALESCE(p_invoice_number, '')), '') IS NULL
     OR lower(BTRIM(COALESCE(p_invoice_type, ''))) NOT IN ('sales', 'purchase', 'service')
     OR jsonb_typeof(COALESCE(p_items, 'null'::jsonb)) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR v_discount < 0
  THEN
    RAISE EXCEPTION 'Invoice number, date, type, idempotency key, and at least one item are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, p_invoice_date) THEN
    RAISE EXCEPTION 'Invoice creation is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':manual-invoice:' || p_idempotency_key::text, 0
  ));
  SELECT invoice.* INTO v_invoice FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id AND invoice.manual_idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_invoice; END IF;

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customers customer WHERE customer.id = p_customer_id AND customer.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'Invoice customer is outside the current company' USING ERRCODE = 'P0001'; END IF;
  IF p_vendor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendors vendor WHERE vendor.id = p_vendor_id AND vendor.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'Invoice vendor is outside the current company' USING ERRCODE = 'P0001'; END IF;
  IF p_contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contracts contract WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'Invoice contract is outside the current company' USING ERRCODE = 'P0001'; END IF;
  IF p_cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers center WHERE center.id = p_cost_center_id AND center.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'Invoice cost center is outside the current company' USING ERRCODE = 'P0001'; END IF;
  IF p_fixed_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fixed_assets asset WHERE asset.id = p_fixed_asset_id AND asset.company_id = p_company_id
  ) THEN RAISE EXCEPTION 'Invoice asset is outside the current company' USING ERRCODE = 'P0001'; END IF;

  FOR v_item IN SELECT item.value FROM jsonb_array_elements(p_items) item(value)
  LOOP
    IF NULLIF(BTRIM(COALESCE(v_item.value ->> 'description', '')), '') IS NULL
       OR COALESCE((v_item.value ->> 'quantity')::numeric, 0) <= 0
       OR COALESCE((v_item.value ->> 'unit_price')::numeric, -1) < 0
       OR COALESCE((v_item.value ->> 'tax_rate')::numeric, 0) < 0
    THEN RAISE EXCEPTION 'Invoice contains an invalid item' USING ERRCODE = 'P0001'; END IF;
    v_account_id := NULLIF(v_item.value ->> 'account_id', '')::uuid;
    v_item_cost_center_id := COALESCE(NULLIF(v_item.value ->> 'cost_center_id', '')::uuid, p_cost_center_id);
    IF v_account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.chart_of_accounts account WHERE account.id = v_account_id
        AND account.company_id = p_company_id AND account.is_active = true
        AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
    ) THEN RAISE EXCEPTION 'Invoice item account is not postable for the current company' USING ERRCODE = 'P0001'; END IF;
    IF v_item_cost_center_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cost_centers center WHERE center.id = v_item_cost_center_id AND center.company_id = p_company_id
    ) THEN RAISE EXCEPTION 'Invoice item cost center is outside the current company' USING ERRCODE = 'P0001'; END IF;
    v_line_total := round((v_item.value ->> 'quantity')::numeric * (v_item.value ->> 'unit_price')::numeric, 2);
    v_line_tax := round(v_line_total * COALESCE((v_item.value ->> 'tax_rate')::numeric, 0) / 100, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_tax := v_tax + v_line_tax;
  END LOOP;
  IF v_discount > v_subtotal + v_tax THEN
    RAISE EXCEPTION 'Invoice discount exceeds its subtotal and tax' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.invoices (
    company_id, invoice_number, invoice_date, invoice_type, due_date, customer_id, vendor_id,
    subtotal, tax_amount, discount_amount, total_amount, paid_amount, balance_due, currency,
    status, payment_status, notes, terms, contract_id, cost_center_id, fixed_asset_id,
    created_by, manual_idempotency_key
  ) VALUES (
    p_company_id, BTRIM(p_invoice_number), p_invoice_date, lower(BTRIM(p_invoice_type)), p_due_date,
    p_customer_id, p_vendor_id, v_subtotal, v_tax, v_discount, v_subtotal + v_tax - v_discount,
    0, v_subtotal + v_tax - v_discount, COALESCE(NULLIF(BTRIM(p_currency), ''), 'QAR'),
    'draft', 'unpaid', NULLIF(BTRIM(COALESCE(p_notes, '')), ''), NULLIF(BTRIM(COALESCE(p_terms, '')), ''),
    p_contract_id, p_cost_center_id, p_fixed_asset_id, v_actor_id, p_idempotency_key
  ) RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_items (
    invoice_id, line_number, item_description, item_description_ar, quantity, unit_price,
    line_total, tax_rate, tax_amount, account_id, cost_center_id
  )
  SELECT v_invoice.id, item.ordinality::integer, BTRIM(item.value ->> 'description'),
    NULLIF(BTRIM(COALESCE(item.value ->> 'description_ar', '')), ''),
    (item.value ->> 'quantity')::numeric, (item.value ->> 'unit_price')::numeric,
    round((item.value ->> 'quantity')::numeric * (item.value ->> 'unit_price')::numeric, 2),
    COALESCE((item.value ->> 'tax_rate')::numeric, 0),
    round((item.value ->> 'quantity')::numeric * (item.value ->> 'unit_price')::numeric
      * COALESCE((item.value ->> 'tax_rate')::numeric, 0) / 100, 2),
    NULLIF(item.value ->> 'account_id', '')::uuid,
    COALESCE(NULLIF(item.value ->> 'cost_center_id', '')::uuid, p_cost_center_id)
  FROM jsonb_array_elements(p_items) WITH ORDINALITY item(value, ordinality)
  ORDER BY item.ordinality;
  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_invoice_v1(uuid, text, date, text, date, uuid, uuid, text, numeric, text, text, uuid, uuid, uuid, jsonb, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_invoice_v1(uuid, text, date, text, date, uuid, uuid, text, numeric, text, text, uuid, uuid, uuid, jsonb, uuid, uuid) TO authenticated, service_role;

