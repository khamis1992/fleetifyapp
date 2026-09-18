BEGIN;

DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_old_values jsonb;
  v_old_contract jsonb;
  v_old_profile jsonb;
BEGIN
  SELECT log.old_values
  INTO v_old_values
  FROM public.audit_logs log
  WHERE log.company_id = v_company_id
    AND log.resource_id = v_contract_id::text
    AND log.action = 'correct_lto2024276_from_signed_schedule_20260903162734'
  ORDER BY log.created_at DESC
  LIMIT 1;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'LTO2024276 correction audit snapshot was not found';
  END IF;

  v_old_contract := v_old_values -> 'contract';
  v_old_profile := v_old_values -> 'litigation_profile';

  DELETE FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
    AND schedule.notes = 'Authoritative schedule transcribed from the identity-matched signed PDF; do not regenerate from amount/month quotient.'
    AND COALESCE(schedule.paid_amount, 0) = 0
    AND schedule.invoice_id IS NULL;

  UPDATE public.contract_payment_schedules schedule
  SET
    status = old_schedule.status,
    invoice_id = old_schedule.invoice_id,
    paid_amount = old_schedule.paid_amount,
    paid_date = old_schedule.paid_date,
    notes = old_schedule.notes,
    updated_at = old_schedule.updated_at
  FROM pg_catalog.jsonb_to_recordset(v_old_values -> 'active_schedules') AS old_schedule(
    id uuid,
    status text,
    invoice_id uuid,
    paid_amount numeric,
    paid_date date,
    notes text,
    updated_at timestamptz
  )
  WHERE schedule.id = old_schedule.id
    AND schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id;

  UPDATE public.contracts contract
  SET
    monthly_amount = (v_old_contract ->> 'monthly_amount')::numeric,
    contract_amount = (v_old_contract ->> 'contract_amount')::numeric,
    balance_due = NULLIF(v_old_contract ->> 'balance_due', '')::numeric,
    total_paid = NULLIF(v_old_contract ->> 'total_paid', '')::numeric,
    payment_status = v_old_contract ->> 'payment_status',
    updated_at = (v_old_contract ->> 'updated_at')::timestamptz
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id;

  IF v_old_profile IS NOT NULL AND v_old_profile <> 'null'::jsonb THEN
    UPDATE public.legal_case_litigation_profile profile
    SET
      security_deposit_amount = NULLIF(v_old_profile ->> 'security_deposit_amount', '')::numeric,
      notes = v_old_profile ->> 'notes',
      updated_at = NULLIF(v_old_profile ->> 'updated_at', '')::timestamptz
    WHERE profile.company_id = v_company_id
      AND profile.contract_id = v_contract_id;
  END IF;

  DELETE FROM public.audit_logs log
  WHERE log.company_id = v_company_id
    AND log.resource_id = v_contract_id::text
    AND log.action = 'correct_lto2024276_from_signed_schedule_20260903162734';
END;
$$;

COMMIT;
