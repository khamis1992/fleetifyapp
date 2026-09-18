BEGIN;

-- Preserve the original renter/contract while allowing an explicit transfer of
-- an open traffic penalty to the company. The live customer_id/contract_id are
-- cleared only by the atomic cancellation command so customer/legal balances
-- cannot continue to claim a company-borne penalty.
ALTER TABLE public.penalties
  ADD COLUMN IF NOT EXISTS responsibility_party text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS responsibility_reason text,
  ADD COLUMN IF NOT EXISTS responsibility_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsibility_decided_by uuid,
  ADD COLUMN IF NOT EXISTS responsible_customer_id uuid,
  ADD COLUMN IF NOT EXISTS original_contract_id uuid,
  ADD COLUMN IF NOT EXISTS original_contract_number text;

UPDATE public.penalties penalty
SET responsibility_party = CASE
      WHEN COALESCE(penalty.paid_by_company, false) AND penalty.customer_id IS NULL THEN 'company'
      ELSE 'customer'
    END,
    responsible_customer_id = COALESCE(penalty.responsible_customer_id, penalty.customer_id),
    original_contract_id = COALESCE(penalty.original_contract_id, penalty.contract_id),
    original_contract_number = COALESCE(penalty.original_contract_number, contract.contract_number)
FROM public.contracts contract
WHERE contract.id = penalty.contract_id
  AND contract.company_id = penalty.company_id
  AND (
    penalty.responsible_customer_id IS NULL
    OR penalty.original_contract_id IS NULL
    OR penalty.original_contract_number IS NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'penalties_responsibility_party_check'
      AND conrelid = 'public.penalties'::regclass
  ) THEN
    ALTER TABLE public.penalties
      ADD CONSTRAINT penalties_responsibility_party_check
      CHECK (responsibility_party IN ('customer', 'company', 'under_review', 'cancelled'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_penalties_company_responsibility
  ON public.penalties(company_id, responsibility_party, payment_status);

CREATE INDEX IF NOT EXISTS idx_penalties_original_contract
  ON public.penalties(company_id, original_contract_id)
  WHERE original_contract_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_contract_cancellation_impact_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'requires_company_transfer', v_open_count > 0,
    'blocked_penalty_count', v_blocked_count,
    'authorized_to_transfer', v_authorized,
    'can_transfer', v_open_count > 0 AND v_blocked_count = 0 AND v_authorized
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_contract_with_company_traffic_penalties_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text,
  p_transfer_open_penalties_to_company boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_actor_role text := COALESCE(
    NULLIF(auth.role()::text, ''),
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_contract public.contracts%ROWTYPE;
  v_old_status text;
  v_penalty_ids uuid[] := ARRAY[]::uuid[];
  v_open_count integer := 0;
  v_open_amount numeric := 0;
  v_blocked_penalty_number text;
  v_cancelled_invoice_count integer := 0;
  v_transferred_count integer := 0;
  v_invoice record;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Company and contract are required' USING ERRCODE = 'P0001';
  END IF;
  IF length(BTRIM(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'اكتب سبب إلغاء واضحاً من 5 أحرف على الأقل' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.user_id = v_actor
        AND profile.company_id = p_company_id
        AND COALESCE(profile.is_active, true)
    ) THEN
      RAISE EXCEPTION 'لا تملك صلاحية إلغاء عقد تابع لهذه الشركة'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text || ':cancel-contract:' || p_contract_id::text));

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على العقد ضمن الشركة الحالية' USING ERRCODE = 'P0001';
  END IF;

  v_old_status := v_contract.status::text;

  IF lower(COALESCE(v_contract.status::text, '')) IN ('cancelled', 'canceled') THEN
    RETURN jsonb_build_object(
      'contract', to_jsonb(v_contract),
      'status', 'already_cancelled',
      'transferred_penalty_count', 0,
      'cancelled_invoice_count', 0
    );
  END IF;

  -- Lock only the exact open penalties linked by company + contract. Plate-only
  -- matching is deliberately forbidden here.
  PERFORM 1
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.contract_id = p_contract_id
  FOR UPDATE;

  SELECT
    COALESCE(array_agg(penalty.id ORDER BY penalty.id), ARRAY[]::uuid[]),
    count(*),
    COALESCE(sum(penalty.amount), 0)
  INTO v_penalty_ids, v_open_count, v_open_amount
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.contract_id = p_contract_id
    AND penalty.responsibility_party <> 'company'
    AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed')
    AND lower(COALESCE(penalty.status, '')) NOT IN (
      'handled', 'resolved', 'waived', 'transferred', 'cancelled', 'canceled', 'void', 'voided'
    );

  IF v_open_count > 0 AND NOT COALESCE(p_transfer_open_penalties_to_company, false) THEN
    RAISE EXCEPTION
      'لا يمكن إلغاء العقد: توجد % مخالفة غير مسددة بإجمالي % ر.ق. اختر تحويلها إلى مسؤولية الشركة أو عالجها أولاً',
      v_open_count,
      trim(to_char(v_open_amount, 'FM999G999G999G990D00'))
      USING ERRCODE = 'P0001';
  END IF;

  IF v_open_count > 0 THEN
    IF v_actor_role <> 'service_role' AND NOT public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.cancel'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    ) THEN
      RAISE EXCEPTION 'تحويل المخالفات إلى الشركة يتطلب صلاحية إلغاء الفواتير المالية'
        USING ERRCODE = '42501';
    END IF;

    SELECT penalty.penalty_number
    INTO v_blocked_penalty_number
    FROM public.penalties penalty
    JOIN public.invoices invoice
      ON invoice.company_id = p_company_id
     AND invoice.penalty_id = penalty.id
     AND lower(COALESCE(invoice.status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
     AND lower(COALESCE(invoice.payment_status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
    WHERE penalty.id = ANY(v_penalty_ids)
      AND (
        COALESCE(invoice.paid_amount, 0) > 0
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
        )
      )
    ORDER BY penalty.penalty_date, penalty.penalty_number
    LIMIT 1;

    IF v_blocked_penalty_number IS NOT NULL THEN
      RAISE EXCEPTION
        'لا يمكن تحويل المخالفة % إلى الشركة لأن فاتورتها عليها دفعة عميل. ألغِ الدفعة أو أعد تخصيصها أولاً',
        v_blocked_penalty_number
        USING ERRCODE = 'P0001';
    END IF;

    FOR v_invoice IN
      SELECT invoice.id
      FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id
        AND invoice.penalty_id = ANY(v_penalty_ids)
        AND lower(COALESCE(invoice.status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
        AND lower(COALESCE(invoice.payment_status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
      ORDER BY invoice.created_at, invoice.id
      FOR UPDATE
    LOOP
      PERFORM public.cancel_invoice_with_reversal(
        v_invoice.id,
        p_company_id,
        'تحويل مخالفة إلى مسؤولية الشركة عند إلغاء العقد ' || v_contract.contract_number || ': ' || BTRIM(p_reason)
      );
      v_cancelled_invoice_count := v_cancelled_invoice_count + 1;
    END LOOP;

    UPDATE public.penalties penalty
    SET responsibility_party = 'company',
        responsibility_reason = BTRIM(p_reason),
        responsibility_decided_at = now(),
        responsibility_decided_by = v_actor,
        responsible_customer_id = COALESCE(penalty.responsible_customer_id, penalty.customer_id, v_contract.customer_id),
        original_contract_id = COALESCE(penalty.original_contract_id, v_contract.id),
        original_contract_number = COALESCE(penalty.original_contract_number, v_contract.contract_number),
        customer_id = NULL,
        contract_id = NULL,
        customer_payment_status = 'not_applicable',
        notes = concat_ws(
          E'\n',
          NULLIF(BTRIM(COALESCE(penalty.notes, '')), ''),
          'نقلت مسؤولية المخالفة إلى الشركة عند إلغاء العقد ' || v_contract.contract_number || ': ' || BTRIM(p_reason)
        ),
        updated_at = now()
    WHERE penalty.company_id = p_company_id
      AND penalty.id = ANY(v_penalty_ids);

    GET DIAGNOSTICS v_transferred_count = ROW_COUNT;
    IF v_transferred_count <> v_open_count THEN
      RAISE EXCEPTION 'تغيرت المخالفات أثناء الإلغاء؛ لم يتم حفظ أي جزء من العملية'
        USING ERRCODE = '40001';
    END IF;
  END IF;

  UPDATE public.contracts contract
  SET status = 'cancelled',
      suspension_reason = BTRIM(p_reason),
      updated_at = now()
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  RETURNING contract.* INTO v_contract;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تغير العقد أثناء الإلغاء؛ لم يتم حفظ أي جزء من العملية'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id,
    company_id,
    operation_type,
    operation_details,
    old_values,
    new_values,
    notes,
    performed_by
  ) VALUES (
    p_contract_id,
    p_company_id,
    'contract_cancelled_with_penalty_resolution',
    jsonb_build_object(
      'reason', BTRIM(p_reason),
      'penalty_resolution', CASE WHEN v_open_count > 0 THEN 'company' ELSE 'none' END,
      'penalty_ids', to_jsonb(v_penalty_ids),
      'transferred_penalty_count', v_transferred_count,
      'transferred_penalty_amount', round(v_open_amount, 2),
      'cancelled_penalty_invoice_count', v_cancelled_invoice_count
    ),
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'cancelled'),
    'إلغاء العقد' || CASE
      WHEN v_transferred_count > 0 THEN ' وتحويل المخالفات المفتوحة إلى مسؤولية الشركة'
      ELSE ''
    END || ': ' || BTRIM(p_reason),
    v_actor
  );

  RETURN jsonb_build_object(
    'contract', to_jsonb(v_contract),
    'status', 'cancelled',
    'transferred_penalty_count', v_transferred_count,
    'transferred_penalty_amount', round(v_open_amount, 2),
    'cancelled_invoice_count', v_cancelled_invoice_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_cancellation_impact_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contract_cancellation_impact_v1(uuid, uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_contract_with_company_traffic_penalties_v1(uuid, uuid, text, boolean, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_contract_with_company_traffic_penalties_v1(uuid, uuid, text, boolean, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_contract_cancellation_impact_v1(uuid, uuid) IS
'Returns the exact open traffic-penalty impact and transfer eligibility before contract cancellation.';

COMMENT ON FUNCTION public.cancel_contract_with_company_traffic_penalties_v1(uuid, uuid, text, boolean, uuid) IS
'Atomically reverses unpaid penalty invoices, transfers exact contract-linked penalties to company responsibility with snapshots, and cancels the contract.';

COMMIT;
