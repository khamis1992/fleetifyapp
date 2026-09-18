CREATE OR REPLACE FUNCTION public.get_contract_cancellation_impact_v1(p_company_id uuid, p_contract_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(auth.role()::text, ''),
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_open_count integer := 0;
  v_open_amount numeric := 0;
  v_blocked_count integer := 0;
  v_authorized boolean := false;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Company and contract are required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.user_id = v_actor
        AND profile.company_id = p_company_id
        AND COALESCE(profile.is_active, true)
    ) THEN
      RAISE EXCEPTION 'The contract does not belong to the current company'
        USING ERRCODE = '42501';
    END IF;

    v_authorized := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.cancel'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
  ELSE
    v_authorized := true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Contract was not found for the current company' USING ERRCODE = 'P0001';
  END IF;

  WITH open_penalties AS (
    SELECT penalty.id, penalty.amount
    FROM public.penalties penalty
    WHERE penalty.company_id = p_company_id
      AND penalty.contract_id = p_contract_id
      AND penalty.responsibility_party <> 'company'
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed')
      AND lower(COALESCE(penalty.status, '')) NOT IN (
        'handled', 'resolved', 'waived', 'transferred', 'cancelled', 'canceled', 'void', 'voided'
      )
  )
  SELECT count(*), COALESCE(sum(amount), 0)
  INTO v_open_count, v_open_amount
  FROM open_penalties;

  WITH open_penalties AS (
    SELECT penalty.id
    FROM public.penalties penalty
    WHERE penalty.company_id = p_company_id
      AND penalty.contract_id = p_contract_id
      AND penalty.responsibility_party <> 'company'
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed')
      AND lower(COALESCE(penalty.status, '')) NOT IN (
        'handled', 'resolved', 'waived', 'transferred', 'cancelled', 'canceled', 'void', 'voided'
      )
  )
  SELECT count(DISTINCT penalty.id)
  INTO v_blocked_count
  FROM open_penalties penalty
  JOIN public.invoices invoice
    ON invoice.company_id = p_company_id
   AND invoice.penalty_id = penalty.id
   AND lower(COALESCE(invoice.status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
   AND lower(COALESCE(invoice.payment_status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
  WHERE COALESCE(invoice.paid_amount, 0) > 0
     OR lower(COALESCE(invoice.status::text, '')) IN ('paid', 'completed')
     OR lower(COALESCE(invoice.payment_status::text, '')) IN ('paid', 'completed', 'partial', 'partially_paid')
     OR EXISTS (
       SELECT 1
       FROM public.payments payment
       WHERE payment.company_id = p_company_id
         AND lower(COALESCE(payment.payment_status::text, '')) NOT IN (
           'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
         )
         AND (
           payment.invoice_id = invoice.id
           OR EXISTS (
             SELECT 1
             FROM public.payment_allocations allocation
             WHERE allocation.payment_id = payment.id
               AND allocation.allocation_type = 'invoice'
               AND allocation.target_id = invoice.id
               AND allocation.is_active = true
           )
         )
     );

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'open_penalty_count', v_open_count,
    'open_penalty_amount', round(v_open_amount, 2),
    'requires_company_transfer', false,
    'blocked_penalty_count', v_blocked_count,
    'authorized_to_transfer', v_authorized,
    'can_transfer', false
  );
END;
$function$
;
