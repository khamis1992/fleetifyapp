DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_contract_with_billing_graph_atomic'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_company_id uuid, p_customer_id uuid, p_vehicle_id uuid, p_contract_type text, p_start_date date, p_end_date date, p_contract_amount numeric, p_monthly_amount numeric, p_description text, p_terms text, p_cost_center_id uuid, p_created_by uuid, p_assigned_to_profile_id uuid, p_contract_date date, p_auto_renew_enabled boolean, p_created_via text, p_idempotency_key text';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'create_contract_with_billing_graph_atomic(17-arg) was not found';
  END IF;

  v_def := replace(
    v_def,
    'OR v_existing_contract.cost_center_id IS DISTINCT FROM COALESCE(p_cost_center_id, public.get_customer_default_cost_center(p_customer_id))',
    'OR v_existing_contract.cost_center_id IS DISTINCT FROM p_cost_center_id'
  );

  EXECUTE v_def;
END;
$$;
