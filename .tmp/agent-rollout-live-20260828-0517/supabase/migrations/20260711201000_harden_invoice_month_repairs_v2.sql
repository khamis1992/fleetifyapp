-- Align missing-invoice protection with both invoice-month uniqueness interpretations.

CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_invoice_repair_v2(
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
  v_schedule public.contract_payment_schedules%ROWTYPE;
BEGIN
  IF p_command NOT IN ('schedule.link_invoice', 'contract.generate_missing_invoice') THEN
    RAISE EXCEPTION 'Unsupported contract invoice repair command';
  END IF;

  SELECT * INTO v_schedule
  FROM public.contract_payment_schedules s
  WHERE s.id = p_entity_id::uuid
    AND s.company_id = p_company_id
  FOR UPDATE;

  IF v_schedule.id IS NULL THEN
    RAISE EXCEPTION 'Payment schedule was not found in the requested company';
  END IF;

  IF p_command = 'contract.generate_missing_invoice' AND EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = v_schedule.contract_id
      AND (
        date_trunc('month', i.invoice_date)::date = date_trunc('month', v_schedule.due_date)::date
        OR date_trunc('month', i.due_date)::date = date_trunc('month', v_schedule.due_date)::date
      )
  ) THEN
    RAISE EXCEPTION 'Invoice month is already occupied by invoice_date or due_date; generation was safely blocked';
  END IF;

  RETURN public.system_agent_apply_contract_invoice_repair(
    p_run_id,
    p_job_id,
    p_finding_id,
    p_command,
    p_company_id,
    p_entity_id,
    p_expected_before,
    p_values,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('month_guard', 'invoice_date_or_due_date_v2')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_contract_invoice_repair_v2(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_invoice_repair_v2(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
