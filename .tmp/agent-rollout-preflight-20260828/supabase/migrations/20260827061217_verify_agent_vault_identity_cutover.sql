DO $smoke$
DECLARE
  v_secret text;
  v_ok boolean;
BEGIN
  SELECT secret.decrypted_secret
  INTO v_secret
  FROM public.agent_invocation_registry registry
  JOIN vault.decrypted_secrets secret ON secret.name = registry.vault_secret_name
  WHERE registry.agent_id = 'contract-terms-scanner'
    AND registry.enabled = true;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Vault identity is unavailable';
  END IF;

  v_ok := public.verify_scheduled_agent_invocation_v1(
    'contract-terms-scanner',
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
    v_secret,
    'production-cutover-smoke'
  );
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Valid Vault identity was rejected';
  END IF;

  v_ok := public.verify_scheduled_agent_invocation_v1(
    'contract-terms-scanner',
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
    repeat('x', 32),
    'production-cutover-negative-smoke'
  );
  IF v_ok THEN
    RAISE EXCEPTION 'Invalid identity was accepted';
  END IF;
END;
$smoke$;;
