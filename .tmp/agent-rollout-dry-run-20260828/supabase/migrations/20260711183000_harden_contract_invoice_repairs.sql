-- Revalidate contract invoice repairs in the same transaction that applies them.

CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_invoice_repair(
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
  v_contract public.contracts%ROWTYPE;
  v_target_invoice_id uuid;
  v_candidate_count integer;
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
  IF lower(COALESCE(v_schedule.status, '')) IN ('cancelled','canceled','void','voided','deleted') THEN
    RAISE EXCEPTION 'Cancelled payment schedules cannot be invoiced or relinked';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts c
  WHERE c.id = v_schedule.contract_id
    AND c.company_id = p_company_id
  FOR UPDATE;

  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'Schedule contract was not found in the requested company';
  END IF;
  IF lower(COALESCE(v_contract.status, '')) NOT IN ('active','under_legal_procedure') THEN
    RAISE EXCEPTION 'Only active contracts can receive automatic invoice repairs';
  END IF;
  IF v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_schedule.due_date < v_contract.start_date
     OR v_schedule.due_date > v_contract.end_date
  THEN
    RAISE EXCEPTION 'Schedule date is outside the active contract period';
  END IF;

  IF p_command = 'schedule.link_invoice' THEN
    IF v_schedule.invoice_id IS NOT NULL THEN
      RAISE EXCEPTION 'An existing invoice link requires an atomic swap review';
    END IF;
    IF NULLIF(p_values ->> 'invoice_id', '') IS NULL THEN
      RAISE EXCEPTION 'Missing target invoice ID';
    END IF;
    v_target_invoice_id := (p_values ->> 'invoice_id')::uuid;

    SELECT count(*) INTO v_candidate_count
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = v_schedule.contract_id
      AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
          date_trunc('month', v_schedule.due_date)::date
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted')
      AND lower(COALESCE(i.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','failed','reversed','refunded');

    IF v_candidate_count <> 1 OR NOT EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = v_target_invoice_id
        AND i.company_id = p_company_id
        AND i.contract_id = v_schedule.contract_id
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', v_schedule.due_date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted')
        AND lower(COALESCE(i.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','failed','reversed','refunded')
    ) THEN
      RAISE EXCEPTION 'Target invoice is not the only active same-contract same-month candidate';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules other_schedule
      WHERE other_schedule.company_id = p_company_id
        AND other_schedule.id <> v_schedule.id
        AND other_schedule.invoice_id = v_target_invoice_id
        AND lower(COALESCE(other_schedule.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted')
    ) THEN
      RAISE EXCEPTION 'Target invoice is already linked to another active payment schedule';
    END IF;
  ELSE
    IF v_schedule.invoice_id IS NOT NULL THEN
      RAISE EXCEPTION 'Schedule already has an invoice';
    END IF;
    IF COALESCE(v_schedule.amount, 0) <= 0.01 THEN
      RAISE EXCEPTION 'Zero-value schedules do not receive automatic invoices';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.company_id = p_company_id
        AND i.contract_id = v_schedule.contract_id
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', v_schedule.due_date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted')
        AND lower(COALESCE(i.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','failed','reversed','refunded')
    ) THEN
      RAISE EXCEPTION 'An active invoice now exists for the schedule month';
    END IF;
  END IF;

  RETURN public.system_agent_apply_repair(
    p_run_id,
    p_job_id,
    p_finding_id,
    p_command,
    p_company_id,
    p_entity_id,
    p_expected_before,
    p_values,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('guard', 'contract_invoice_v1')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_contract_invoice_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_invoice_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
