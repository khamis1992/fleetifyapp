BEGIN;

CREATE OR REPLACE FUNCTION public.generate_amendment_number(p_company_id uuid, p_contract_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amendment_count integer;
  v_contract_number text;
BEGIN
  SELECT contract_number INTO v_contract_number FROM public.contracts WHERE id = p_contract_id;
  SELECT count(*) INTO v_amendment_count FROM public.contract_amendments
  WHERE contract_id = p_contract_id AND company_id = p_company_id;
  RETURN v_contract_number || '-AMD-' || lpad((v_amendment_count + 1)::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_contract_amendment(p_amendment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amendment record;
  v_key text;
  v_value text;
BEGIN
  SELECT * INTO v_amendment FROM public.contract_amendments WHERE id = p_amendment_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Amendment not found'); END IF;
  IF v_amendment.status <> 'approved' THEN RETURN jsonb_build_object('success', false, 'error', 'Amendment must be approved before applying'); END IF;
  IF v_amendment.applied_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Amendment already applied'); END IF;
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_amendment.new_values)
  LOOP
    EXECUTE format('UPDATE contracts SET %I = $1, updated_at = NOW() WHERE id = $2', v_key)
      USING v_value, v_amendment.contract_id;
  END LOOP;
  UPDATE public.contract_amendments SET applied_at = now(), updated_at = now() WHERE id = p_amendment_id;
  RETURN jsonb_build_object('success', true, 'contract_id', v_amendment.contract_id, 'applied_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_amendment_number(uuid, uuid) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_contract_amendment(uuid) TO PUBLIC, anon, authenticated, service_role;

COMMIT;
