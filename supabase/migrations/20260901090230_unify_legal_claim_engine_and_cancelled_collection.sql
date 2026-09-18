-- Unify legal-claim calculation across transfer, lawsuit preparation and
-- judgment cut-off. Cancelled/closed contracts can be sent for collection
-- without reactivating them or changing the vehicle state.

BEGIN;

ALTER TABLE public.legal_cases
  ADD COLUMN IF NOT EXISTS source_contract_status text,
  ADD COLUMN IF NOT EXISTS vehicle_custody_at_transfer text,
  ADD COLUMN IF NOT EXISTS vehicle_returned_at_transfer date,
  ADD COLUMN IF NOT EXISTS claim_calculation_version text NOT NULL DEFAULT 'v4',
  ADD COLUMN IF NOT EXISTS claim_calculated_at timestamptz;

ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_vehicle_custody_at_transfer_check;

ALTER TABLE public.legal_cases
  ADD CONSTRAINT legal_cases_vehicle_custody_at_transfer_check
  CHECK (
    vehicle_custody_at_transfer IS NULL
    OR vehicle_custody_at_transfer IN ('with_defendant', 'returned')
  );

COMMENT ON COLUMN public.legal_cases.source_contract_status IS
  'Immutable contract status observed when the case was created; cancelled collection cases preserve this status on the contract.';
COMMENT ON COLUMN public.legal_cases.vehicle_custody_at_transfer IS
  'Operator-confirmed custody at legal transfer. with_defendant enables post-contract accrual; returned prevents it.';
COMMENT ON COLUMN public.legal_cases.vehicle_returned_at_transfer IS
  'Documented return date when available. A returned custody decision may be recorded without inventing a return date.';

CREATE TABLE IF NOT EXISTS public.legal_claim_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (
    snapshot_type IN ('transfer', 'filing', 'initial_judgment', 'manual_review')
  ),
  version integer NOT NULL CHECK (version > 0),
  claim_scope text NOT NULL CHECK (
    claim_scope IN ('full_outstanding', 'traffic_violations_only')
  ),
  as_of_date date NOT NULL,
  cutoff_date date NOT NULL,
  vehicle_custody text NOT NULL CHECK (vehicle_custody IN ('with_defendant', 'returned', 'unknown')),
  contract_status text NOT NULL,
  total_amount numeric(14, 2) NOT NULL CHECK (total_amount >= 0),
  breakdown jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_legal_claim_snapshot_version
    UNIQUE (company_id, contract_id, case_id, snapshot_type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_claim_snapshots_contract
  ON public.legal_claim_snapshots(company_id, contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_claim_snapshots_case
  ON public.legal_claim_snapshots(case_id, snapshot_type, created_at DESC)
  WHERE case_id IS NOT NULL;

ALTER TABLE public.legal_claim_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_claim_snapshots_company_select
  ON public.legal_claim_snapshots;
CREATE POLICY legal_claim_snapshots_company_select
  ON public.legal_claim_snapshots
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

REVOKE ALL ON TABLE public.legal_claim_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.legal_claim_snapshots TO authenticated;
GRANT ALL ON TABLE public.legal_claim_snapshots TO service_role;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(
  p_company_id uuid,
  p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
  p_claim_scope text DEFAULT 'full_outstanding',
  p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_scope text := NULLIF(BTRIM(p_claim_scope), '');
  v_initial_judgment_date date;
  v_effective_date date;
BEGIN
  IF v_scope IS NULL THEN
    SELECT legal_case.claim_scope
    INTO v_scope
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled'
    ORDER BY legal_case.created_at DESC
    LIMIT 1;
    v_scope := COALESCE(v_scope, 'full_outstanding');
  END IF;

  IF v_scope NOT IN ('full_outstanding', 'traffic_violations_only') THEN
    RAISE EXCEPTION 'Unsupported legal claim scope' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = p_company_id AND contract.id = p_contract_id
  ) THEN
    RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT MIN(legal_case.outcome_date)
  INTO v_initial_judgment_date
  FROM public.legal_cases legal_case
  WHERE legal_case.company_id = p_company_id
    AND legal_case.contract_id = p_contract_id
    AND legal_case.outcome_date IS NOT NULL
    AND legal_case.workflow_stage IN (
      'judgment_issued', 'appeal', 'enforcement', 'collection', 'closed'
    )
    AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled';

  v_effective_date := LEAST(
    p_as_of_date,
    COALESCE(v_initial_judgment_date, p_as_of_date)
  );

  RETURN (
    WITH base AS (
      SELECT public.calculate_legal_claim_breakdown_v3(
        p_company_id,
        p_contract_id,
        v_effective_date
      ) AS value
    ),
    valid_rental_invoices AS (
      SELECT
        invoice.id,
        invoice.invoice_number,
        invoice.due_date,
        GREATEST(
          COALESCE(invoice.balance_due, invoice.total_amount - COALESCE(invoice.paid_amount, 0)),
          0
        )::numeric AS amount
      FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id
        AND invoice.contract_id = p_contract_id
        AND invoice.penalty_id IS NULL
        AND LOWER(COALESCE(invoice.invoice_type, '')) = 'sales'
        AND invoice.due_date <= v_effective_date
        AND LOWER(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
        )
        AND LOWER(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
        )
        AND GREATEST(
          COALESCE(invoice.balance_due, invoice.total_amount - COALESCE(invoice.paid_amount, 0)),
          0
        ) > 0
    ),
    invoice_audit AS (
      SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE id = ANY(COALESCE(p_excluded_invoice_ids, ARRAY[]::uuid[]))
        ), 0) AS manually_excluded_amount,
        COALESCE(JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', id,
            'invoice_number', invoice_number,
            'due_date', due_date,
            'amount', ROUND(amount, 2)
          ) ORDER BY due_date, invoice_number
        ) FILTER (
          WHERE NOT (id = ANY(COALESCE(p_excluded_invoice_ids, ARRAY[]::uuid[])))
        ), '[]'::jsonb) AS included_invoices,
        COALESCE(JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', id,
            'invoice_number', invoice_number,
            'due_date', due_date,
            'amount', ROUND(amount, 2)
          ) ORDER BY due_date, invoice_number
        ) FILTER (
          WHERE id = ANY(COALESCE(p_excluded_invoice_ids, ARRAY[]::uuid[]))
        ), '[]'::jsonb) AS excluded_invoices
      FROM valid_rental_invoices
    ),
    future_rent AS (
      SELECT COALESCE(SUM(GREATEST(
        COALESCE(invoice.balance_due, invoice.total_amount - COALESCE(invoice.paid_amount, 0)),
        0
      )), 0) AS amount
      FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id
        AND invoice.contract_id = p_contract_id
        AND invoice.penalty_id IS NULL
        AND LOWER(COALESCE(invoice.invoice_type, '')) = 'sales'
        AND invoice.due_date > v_effective_date
        AND LOWER(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
        )
        AND LOWER(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
        )
    ),
    evidence AS (
      SELECT EXISTS (
        SELECT 1
        FROM public.contract_documents document
        WHERE document.company_id = p_company_id
          AND document.contract_id = p_contract_id
          AND document.document_type = 'violations_proof'
          AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      ) AS violations_proof_ready
    ),
    penalty_totals AS (
      SELECT
        COUNT(*)::integer AS violation_count,
        COALESCE(SUM(COALESCE(penalty.amount, 0)), 0)::numeric AS amount
      FROM public.penalties penalty
      WHERE penalty.company_id = p_company_id
        AND penalty.contract_id = p_contract_id
        AND LOWER(COALESCE(penalty.payment_status, '')) <> 'paid'
        AND LOWER(COALESCE(penalty.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
        )
    ),
    case_context AS (
      SELECT
        legal_case.id AS case_id,
        legal_case.case_number,
        legal_case.source_contract_status,
        legal_case.vehicle_custody_at_transfer,
        legal_case.vehicle_returned_at_transfer,
        v_initial_judgment_date AS initial_judgment_date
      FROM public.legal_cases legal_case
      WHERE legal_case.company_id = p_company_id
        AND legal_case.contract_id = p_contract_id
        AND LOWER(COALESCE(legal_case.case_status, '')) <> 'cancelled'
      ORDER BY legal_case.created_at DESC
      LIMIT 1
    ),
    context AS (
      SELECT
        contract.status::text AS current_contract_status,
        contract.vehicle_returned,
        contract.late_fine_amount,
        COALESCE(
          case_row.vehicle_custody_at_transfer,
          profile.vehicle_custody,
          CASE WHEN contract.vehicle_returned THEN 'returned' ELSE 'unknown' END
        ) AS vehicle_custody,
        case_row.case_id,
        case_row.case_number,
        case_row.initial_judgment_date,
        COALESCE(
          case_row.vehicle_returned_at_transfer,
          profile.vehicle_returned_at
        ) AS returned_at
      FROM public.contracts contract
      LEFT JOIN case_context case_row ON TRUE
      LEFT JOIN public.legal_case_litigation_profile profile
        ON profile.company_id = contract.company_id
       AND profile.contract_id = contract.id
      WHERE contract.company_id = p_company_id
        AND contract.id = p_contract_id
    ),
    components AS (
      SELECT
        GREATEST(
          COALESCE((base.value ->> 'recorded_due_amount')::numeric, 0)
            - invoice_audit.manually_excluded_amount,
          0
        ) AS rent,
        COALESCE((base.value ->> 'legal_extension_rent_amount')::numeric, 0) AS extension_rent,
        COALESCE((base.value ->> 'contractual_compensation_amount')::numeric, 0) AS contractual_compensation,
        COALESCE((base.value ->> 'damage_amount')::numeric, 0) AS damages,
        CASE WHEN evidence.violations_proof_ready
          THEN penalty_totals.amount ELSE 0 END AS traffic_violations,
        COALESCE((base.value ->> 'retention_amount')::numeric, 0) AS retention,
        COALESCE((base.value ->> 'deposit_deduction')::numeric, 0) AS security_deposit_deduction,
        invoice_audit.manually_excluded_amount,
        invoice_audit.included_invoices,
        invoice_audit.excluded_invoices,
        penalty_totals.violation_count,
        evidence.violations_proof_ready,
        base.value
      FROM base
      CROSS JOIN invoice_audit
      CROSS JOIN penalty_totals
      CROSS JOIN evidence
    ),
    final_amounts AS (
      SELECT
        components.*,
        CASE WHEN v_scope = 'traffic_violations_only'
          THEN components.traffic_violations
          ELSE GREATEST(
            components.rent
              + components.extension_rent
              + components.contractual_compensation
              + components.damages
              + components.traffic_violations
              + components.retention
              - components.security_deposit_deduction,
            0
          )
        END AS total
      FROM components
    )
    SELECT JSONB_BUILD_OBJECT(
      'version', 'v4',
      'claim_scope', v_scope,
      'as_of_date', p_as_of_date,
      'cutoff_date', COALESCE((final.value ->> 'rent_cutoff_date')::date, v_effective_date),
      'cutoff_source', CASE
        WHEN context.initial_judgment_date IS NOT NULL
          AND context.initial_judgment_date <= p_as_of_date THEN 'initial_judgment'
        WHEN context.returned_at IS NOT NULL
          AND context.returned_at <= p_as_of_date THEN 'vehicle_return'
        ELSE 'as_of_date'
      END,
      'initial_judgment_date', context.initial_judgment_date,
      'case_id', context.case_id,
      'case_number', context.case_number,
      'contract_status', context.current_contract_status,
      'vehicle_custody', context.vehicle_custody,
      'violations_proof_ready', final.violations_proof_ready,
      'violation_count', final.violation_count,
      'components', JSONB_BUILD_OBJECT(
        'rent_due', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.rent END, 2),
        'legal_extension_rent', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.extension_rent END, 2),
        'contractual_compensation', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.contractual_compensation END, 2),
        'damages', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.damages END, 2),
        'traffic_violations', ROUND(final.traffic_violations, 2),
        'retention', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.retention END, 2),
        'security_deposit_deduction', ROUND(CASE WHEN v_scope = 'traffic_violations_only' THEN 0 ELSE final.security_deposit_deduction END, 2)
      ),
      'included_invoices', CASE WHEN v_scope = 'traffic_violations_only' THEN '[]'::jsonb ELSE final.included_invoices END,
      'excluded_invoices', CASE WHEN v_scope = 'traffic_violations_only' THEN final.included_invoices || final.excluded_invoices ELSE final.excluded_invoices END,
      'excluded_invoice_ids', TO_JSONB(COALESCE(p_excluded_invoice_ids, ARRAY[]::uuid[])),
      'excluded_amounts', JSONB_BUILD_OBJECT(
        'manual_invoice_exclusions', ROUND(final.manually_excluded_amount, 2),
        'future_rent', ROUND(future_rent.amount, 2),
        'penalty_linked_invoices', COALESCE((final.value ->> 'excluded_penalty_invoice_due_amount')::numeric, 0),
        'non_rent_invoices', COALESCE((final.value ->> 'excluded_non_rent_invoice_due_amount')::numeric, 0),
        'legacy_late_fine', COALESCE(context.late_fine_amount, 0)
      ),
      'total', ROUND(final.total, 2)
    )
    FROM final_amounts final
    CROSS JOIN future_rent
    CROSS JOIN context
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_statement_v4(uuid, uuid, date, text, uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_statement_v4(uuid, uuid, date, text, uuid[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.calculate_legal_claim_statement_v4(uuid, uuid, date, text, uuid[]) IS
  'Canonical legal claim statement. Includes due rent only, evidenced unpaid penalties, documented extras and post-contract accrual while custody remains with the defendant. Future rent, penalty-linked invoices, non-rent invoices and legacy late_fine_amount are disclosed but excluded. Accrual stops at the initial judgment outcome_date.';

CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_invoices jsonb;
  v_penalties jsonb;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to prepare this contract for legal transfer'
      USING ERRCODE = '42501';
  END IF;

  v_result := public.get_legal_transfer_readiness_v1(p_company_id, p_contract_id);

  SELECT COALESCE(JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', invoice.id,
      'invoice_number', invoice.invoice_number,
      'invoice_date', invoice.invoice_date,
      'due_date', invoice.due_date,
      'total_amount', invoice.total_amount,
      'paid_amount', invoice.paid_amount,
      'balance_due', GREATEST(
        COALESCE(invoice.balance_due, invoice.total_amount - COALESCE(invoice.paid_amount, 0)),
        0
      ),
      'payment_status', invoice.payment_status,
      'status', invoice.status,
      'journal_entry_id', invoice.journal_entry_id,
      'can_edit_amount',
        invoice.journal_entry_id IS NULL
        AND COALESCE(invoice.paid_amount, 0) <= 0.01
        AND NOT EXISTS (
          SELECT 1 FROM public.payments payment WHERE payment.invoice_id = invoice.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.payment_allocations allocation
          WHERE allocation.allocation_type = 'invoice'
            AND allocation.target_id = invoice.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.invoice_items item WHERE item.invoice_id = invoice.id
        )
    ) ORDER BY invoice.due_date, invoice.created_at
  ), '[]'::jsonb)
  INTO v_invoices
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND invoice.penalty_id IS NULL
    AND LOWER(COALESCE(invoice.invoice_type, '')) = 'sales'
    AND invoice.due_date <= ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date)
    AND LOWER(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted', 'paid'
    )
    AND LOWER(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted', 'paid'
    )
    AND GREATEST(
      COALESCE(invoice.balance_due, invoice.total_amount - COALESCE(invoice.paid_amount, 0)),
      0
    ) > 0;

  SELECT COALESCE(JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', penalty.id,
      'violation_number', penalty.penalty_number,
      'violation_date', penalty.penalty_date,
      'violation_type', COALESCE(penalty.violation_type, 'مخالفة مرورية'),
      'description', COALESCE(penalty.reason, penalty.notes),
      'fine_amount', penalty.amount,
      'total_amount', penalty.amount,
      'liability_amount', penalty.amount,
      'status', COALESCE(penalty.status, 'pending'),
      'responsibility_party', 'customer'
    ) ORDER BY penalty.penalty_date, penalty.created_at
  ), '[]'::jsonb)
  INTO v_penalties
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.contract_id = p_contract_id
    AND LOWER(COALESCE(penalty.payment_status, '')) <> 'paid'
    AND LOWER(COALESCE(penalty.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
    );

  RETURN v_result || JSONB_BUILD_OBJECT(
    'invoices', v_invoices,
    'violations', v_penalties,
    'violations_source', 'penalties',
    'invoices_source', 'due_rental_sales_only'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v2(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_claim_scope text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_scope text := COALESCE(NULLIF(BTRIM(p_claim_scope), ''), 'full_outstanding');
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_excluded_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_statement jsonb;
  v_result jsonb;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to complete legal readiness for this contract'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(ARRAY_AGG(value::uuid), ARRAY[]::uuid[])
  INTO v_excluded_invoice_ids
  FROM JSONB_ARRAY_ELEMENTS_TEXT(
    COALESCE(v_payload -> 'excluded_invoice_ids', '[]'::jsonb)
  ) AS item(value);

  v_statement := public.calculate_legal_claim_statement_v4(
    p_company_id,
    p_contract_id,
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
    v_scope,
    v_excluded_invoice_ids
  );

  IF v_scope = 'traffic_violations_only'
     AND COALESCE((v_statement ->> 'total')::numeric, 0) <= 0
  THEN
    RAISE EXCEPTION 'No evidenced unpaid traffic violations are available for this claim'
      USING ERRCODE = 'P0001';
  END IF;

  v_payload := v_payload || JSONB_BUILD_OBJECT(
    'claim_scope', v_scope,
    'claim_amount', (v_statement ->> 'total')::numeric,
    'claim_statement', v_statement,
    'claim_components', v_statement -> 'components',
    'violation_count', COALESCE((v_statement ->> 'violation_count')::integer, 0),
    'violation_total', COALESCE((v_statement -> 'components' ->> 'traffic_violations')::numeric, 0),
    'included_invoice_ids', COALESCE((
      SELECT JSONB_AGG(item ->> 'id')
      FROM JSONB_ARRAY_ELEMENTS(v_statement -> 'included_invoices') item
    ), '[]'::jsonb),
    'vehicle_custody_at_transfer', CASE
      WHEN COALESCE((v_payload ->> 'vehicle_returned')::boolean, false)
        THEN 'returned'
      ELSE 'with_defendant'
    END
  );

  v_result := public.complete_legal_transfer_readiness_with_scope_v1(
    p_company_id,
    p_contract_id,
    v_payload,
    v_scope,
    p_actor_id
  );

  RETURN v_result || JSONB_BUILD_OBJECT('claim_statement', v_statement);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v2(uuid, uuid, jsonb, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v2(uuid, uuid, jsonb, text, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.freeze_legal_claim_snapshot_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_case_id uuid,
  p_snapshot_type text,
  p_as_of_date date,
  p_claim_scope text,
  p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.legal_claim_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_statement jsonb;
  v_snapshot public.legal_claim_snapshots%ROWTYPE;
  v_version integer;
BEGIN
  IF p_snapshot_type NOT IN ('transfer', 'filing', 'initial_judgment', 'manual_review') THEN
    RAISE EXCEPTION 'Unsupported claim snapshot type' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to freeze this legal claim'
      USING ERRCODE = '42501';
  END IF;
  IF p_case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = p_case_id
      AND legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
  ) THEN
    RAISE EXCEPTION 'Legal case does not belong to this contract' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':legal-claim-snapshot:' || p_contract_id::text,
      0
    )
  );

  v_statement := public.calculate_legal_claim_statement_v4(
    p_company_id,
    p_contract_id,
    p_as_of_date,
    p_claim_scope,
    p_excluded_invoice_ids
  );

  SELECT COALESCE(MAX(snapshot.version), 0) + 1
  INTO v_version
  FROM public.legal_claim_snapshots snapshot
  WHERE snapshot.company_id = p_company_id
    AND snapshot.contract_id = p_contract_id
    AND snapshot.case_id IS NOT DISTINCT FROM p_case_id
    AND snapshot.snapshot_type = p_snapshot_type;

  INSERT INTO public.legal_claim_snapshots (
    company_id, contract_id, case_id, snapshot_type, version, claim_scope,
    as_of_date, cutoff_date, vehicle_custody, contract_status, total_amount,
    breakdown, created_by
  )
  VALUES (
    p_company_id,
    p_contract_id,
    p_case_id,
    p_snapshot_type,
    v_version,
    COALESCE(NULLIF(BTRIM(p_claim_scope), ''), 'full_outstanding'),
    p_as_of_date,
    COALESCE((v_statement ->> 'cutoff_date')::date, p_as_of_date),
    CASE
      WHEN v_statement ->> 'vehicle_custody' IN ('with_defendant', 'returned')
        THEN v_statement ->> 'vehicle_custody'
      ELSE 'unknown'
    END,
    COALESCE(v_statement ->> 'contract_status', 'unknown'),
    COALESCE((v_statement ->> 'total')::numeric, 0),
    v_statement,
    v_actor
  )
  RETURNING * INTO v_snapshot;

  RETURN v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid, uuid, uuid, text, date, text, uuid[], uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid, uuid, uuid, text, date, text, uuid[], uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_collection_v2(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_claim_scope text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_scope text := COALESCE(NULLIF(BTRIM(p_claim_scope), ''), 'full_outstanding');
  v_contract public.contracts%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_result jsonb;
  v_review jsonb;
  v_review_scope text;
  v_case_id uuid;
  v_case_number text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_vehicle_plate text;
  v_statement jsonb;
  v_excluded_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_snapshot public.legal_claim_snapshots%ROWTYPE;
  v_preserve_contract boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_scope NOT IN ('full_outstanding', 'traffic_violations_only') THEN
    RAISE EXCEPTION 'Unsupported legal claim scope' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to transfer this contract'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':legal-contract:' || p_contract_id::text,
      0
    )
  );

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.company_id = p_company_id AND contract.id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_case
  FROM public.legal_cases legal_case
  WHERE legal_case.company_id = p_company_id
    AND legal_case.contract_id = p_contract_id
    AND LOWER(COALESCE(legal_case.case_status, '')) IN (
      'open', 'active', 'pending', 'on_hold', 'under_review'
    )
  ORDER BY legal_case.created_at
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'legal_case', TO_JSONB(v_case),
      'case_number', v_case.case_number,
      'total_case_value', v_case.case_value,
      'claim_scope', v_case.claim_scope,
      'preserved_contract_status', v_case.source_contract_status
    );
  END IF;

  IF LOWER(COALESCE(v_contract.status, '')) NOT IN (
    'active', 'cancelled', 'canceled', 'closed', 'expired'
  ) THEN
    RAISE EXCEPTION 'Contract status is not eligible for legal collection'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT operation.operation_details,
         operation.operation_details ->> 'claim_scope'
  INTO v_review, v_review_scope
  FROM public.contract_operations_log operation
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type = 'legal_transfer_readiness_completed'
    AND COALESCE((operation.operation_details ->> 'ready')::boolean, false)
  ORDER BY operation.performed_at DESC
  LIMIT 1;

  IF v_review IS NULL OR v_review_scope IS DISTINCT FROM v_scope THEN
    RAISE EXCEPTION 'Complete the legal transfer readiness wizard for the selected scope before conversion'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.check_contract_has_verified_signed_lease_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'A verified signed contract is required for legal transfer'
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.check_contract_identity_verified_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'Customer identity must be verified before legal transfer'
      USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE((v_review ->> 'vehicle_returned')::boolean, false)
     IS DISTINCT FROM COALESCE(p_vehicle_returned, false)
  THEN
    RAISE EXCEPTION 'Vehicle custody does not match the latest readiness review'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(ARRAY_AGG(value::uuid), ARRAY[]::uuid[])
  INTO v_excluded_invoice_ids
  FROM JSONB_ARRAY_ELEMENTS_TEXT(
    COALESCE(v_review -> 'excluded_invoice_ids', '[]'::jsonb)
  ) AS item(value);

  v_preserve_contract := LOWER(COALESCE(v_contract.status, '')) IN (
    'cancelled', 'canceled', 'closed', 'expired'
  );

  IF NOT v_preserve_contract THEN
    v_result := public.convert_contract_to_legal_with_scope_v1(
      p_company_id,
      p_contract_id,
      p_notes,
      p_priority,
      p_case_type,
      p_vehicle_returned,
      v_scope,
      p_actor_id
    );
    IF COALESCE((v_result ->> 'blocked')::boolean, false) THEN
      RETURN v_result;
    END IF;
    v_case_id := NULLIF(v_result -> 'legal_case' ->> 'id', '')::uuid;
    v_case_number := v_result ->> 'case_number';
  ELSE
    SELECT
      COALESCE(
        NULLIF(customer.company_name_ar, ''),
        NULLIF(customer.company_name, ''),
        NULLIF(CONCAT_WS(' ', customer.first_name_ar, customer.last_name_ar), ''),
        NULLIF(CONCAT_WS(' ', customer.first_name, customer.last_name), ''),
        'عميل'
      ),
      customer.phone,
      customer.email
    INTO v_customer_name, v_customer_phone, v_customer_email
    FROM public.customers customer
    WHERE customer.company_id = p_company_id AND customer.id = v_contract.customer_id;

    SELECT vehicle.plate_number
    INTO v_vehicle_plate
    FROM public.vehicles vehicle
    WHERE vehicle.company_id = p_company_id AND vehicle.id = v_contract.vehicle_id;

    v_case_number := public.generate_legal_case_number(p_company_id);
    INSERT INTO public.legal_cases (
      company_id, contract_id, case_number, case_title, case_title_ar,
      case_type, case_status, priority, client_id, client_name, client_phone,
      client_email, case_value, claim_scope, description, notes, legal_fees,
      court_fees, other_expenses, total_costs, billing_status, is_confidential,
      legal_team, tags, filing_date, created_by, source_contract_status,
      vehicle_custody_at_transfer, claim_calculation_version,
      claim_calculated_at
    ) VALUES (
      p_company_id,
      p_contract_id,
      v_case_number,
      CASE WHEN v_scope = 'traffic_violations_only'
        THEN 'مطالبة مخالفات مرورية - عقد ' || v_contract.contract_number
        ELSE 'تحصيل التزامات مالية سابقة - عقد ' || v_contract.contract_number END,
      CASE WHEN v_scope = 'traffic_violations_only'
        THEN 'مطالبة مخالفات مرورية - عقد ' || v_contract.contract_number
        ELSE 'تحصيل التزامات مالية سابقة - عقد ' || v_contract.contract_number END,
      COALESCE(NULLIF(BTRIM(p_case_type), ''), 'payment_collection'),
      'pending',
      COALESCE(NULLIF(BTRIM(p_priority), ''), 'high'),
      v_contract.customer_id,
      COALESCE(v_customer_name, 'عميل'),
      v_customer_phone,
      v_customer_email,
      0,
      v_scope,
      CASE WHEN p_vehicle_returned
        THEN 'قضية تحصيل التزامات مالية باقية بعد استلام المركبة دون إعادة تفعيل العقد الملغي.'
        ELSE 'قضية تحصيل والتزام برد المركبة مع بقاء حالة العقد الملغي محفوظة.'
      END,
      CONCAT_WS(
        E'\n',
        'رقم العقد: ' || v_contract.contract_number,
        'حالة العقد المحفوظة: ' || v_contract.status,
        'رقم لوحة المركبة: ' || COALESCE(v_vehicle_plate, '-'),
        CASE WHEN p_vehicle_returned
          THEN 'حالة المركبة عند التحويل: مستلمة من العميل'
          ELSE 'حالة المركبة عند التحويل: ما زالت لدى العميل' END,
        NULLIF(BTRIM(COALESCE(p_notes, '')), '')
      ),
      0, 0, 0, 0, 'pending', false, '[]'::jsonb,
      JSONB_BUILD_ARRAY('تحويل_من_عقد_ملغي', v_contract.contract_number),
      CURRENT_DATE,
      v_actor,
      v_contract.status,
      CASE WHEN p_vehicle_returned THEN 'returned' ELSE 'with_defendant' END,
      'v4',
      now()
    ) RETURNING * INTO v_case;

    v_case_id := v_case.id;
    v_result := JSONB_BUILD_OBJECT(
      'legal_case', TO_JSONB(v_case),
      'case_number', v_case_number,
      'preserved_contract_status', v_contract.status
    );

    INSERT INTO public.contract_operations_log (
      contract_id, company_id, operation_type, operation_details,
      old_values, new_values, notes, performed_by
    ) VALUES (
      p_contract_id,
      p_company_id,
      'convert_cancelled_contract_to_legal_collection',
      JSONB_BUILD_OBJECT(
        'legal_case_id', v_case_id,
        'legal_case_number', v_case_number,
        'claim_scope', v_scope,
        'contract_status_preserved', true,
        'vehicle_state_preserved', true
      ),
      JSONB_BUILD_OBJECT('status', v_contract.status, 'vehicle_returned', v_contract.vehicle_returned),
      JSONB_BUILD_OBJECT('status', v_contract.status, 'vehicle_returned', v_contract.vehicle_returned),
      'تم إنشاء قضية تحصيل مع حفظ حالة العقد الملغي وحالة المركبة دون تعديل.',
      v_actor
    );
  END IF;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Legal conversion did not return a case id' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.legal_case_litigation_profile (
    company_id, contract_id, case_id, vehicle_custody, created_by, notes
  ) VALUES (
    p_company_id,
    p_contract_id,
    v_case_id,
    CASE WHEN p_vehicle_returned THEN 'unknown' ELSE 'with_defendant' END,
    v_actor,
    CASE WHEN p_vehicle_returned
      THEN 'أكد المشغل استلام المركبة عند التحويل؛ يلزم ربط محضر الاسترداد لإثبات تاريخ العودة.'
      ELSE 'أكد المشغل أن المركبة ما زالت في حيازة المدعى عليه عند التحويل.' END
  )
  ON CONFLICT (company_id, contract_id) DO UPDATE
  SET case_id = EXCLUDED.case_id,
      vehicle_custody = CASE
        WHEN NOT p_vehicle_returned THEN 'with_defendant'
        WHEN public.legal_case_litigation_profile.vehicle_custody IN ('returned', 'recovered_by_company')
          THEN public.legal_case_litigation_profile.vehicle_custody
        ELSE 'unknown'
      END,
      notes = CONCAT_WS(E'\n', public.legal_case_litigation_profile.notes, EXCLUDED.notes),
      updated_at = now();

  UPDATE public.legal_cases legal_case
  SET source_contract_status = COALESCE(legal_case.source_contract_status, v_contract.status),
      vehicle_custody_at_transfer = CASE WHEN p_vehicle_returned THEN 'returned' ELSE 'with_defendant' END,
      claim_scope = v_scope,
      claim_calculation_version = 'v4',
      claim_calculated_at = now(),
      updated_at = now()
  WHERE legal_case.id = v_case_id AND legal_case.company_id = p_company_id;

  v_statement := public.calculate_legal_claim_statement_v4(
    p_company_id,
    p_contract_id,
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
    v_scope,
    v_excluded_invoice_ids
  );

  UPDATE public.legal_cases legal_case
  SET case_value = COALESCE((v_statement ->> 'total')::numeric, 0),
      description = CASE WHEN v_scope = 'traffic_violations_only'
        THEN 'مطالبة قانونية تقتصر على المخالفات المرورية غير المسددة المثبتة.'
        WHEN v_preserve_contract
          THEN 'مطالبة بالتزامات مالية سابقة بعد انتهاء العلاقة التشغيلية واستلام المركبة، دون احتساب إيجار مستقبلي.'
        ELSE 'مطالبة قانونية محسوبة من الاستحقاقات الحالة والمبالغ المثبتة، مع استمرار الأجرة عند بقاء المركبة لدى العميل حتى الحكم الابتدائي.'
      END,
      notes = CONCAT_WS(
        E'\n',
        legal_case.notes,
        'محرك المطالبة: v4',
        'قيمة المطالبة عند التحويل: ' || COALESCE(v_statement ->> 'total', '0') || ' ر.ق'
      ),
      updated_at = now()
  WHERE legal_case.id = v_case_id AND legal_case.company_id = p_company_id
  RETURNING * INTO v_case;

  SELECT * INTO v_snapshot
  FROM public.freeze_legal_claim_snapshot_v1(
    p_company_id,
    p_contract_id,
    v_case_id,
    'transfer',
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
    v_scope,
    v_excluded_invoice_ids,
    v_actor
  );

  UPDATE public.contract_operations_log operation
  SET operation_details = COALESCE(operation.operation_details, '{}'::jsonb)
    || JSONB_BUILD_OBJECT(
      'total_case_value', (v_statement ->> 'total')::numeric,
      'claim_statement', v_statement,
      'claim_snapshot_id', v_snapshot.id,
      'contract_status_preserved', v_preserve_contract
    )
  WHERE operation.company_id = p_company_id
    AND operation.contract_id = p_contract_id
    AND operation.operation_type IN ('convert_to_legal', 'convert_cancelled_contract_to_legal_collection')
    AND operation.operation_details ->> 'legal_case_id' = v_case_id::text;

  RETURN JSONB_BUILD_OBJECT(
    'legal_case', TO_JSONB(v_case),
    'case_number', v_case.case_number,
    'total_case_value', (v_statement ->> 'total')::numeric,
    'claim_scope', v_scope,
    'claim_statement', v_statement,
    'claim_snapshot_id', v_snapshot.id,
    'preserved_contract_status', CASE WHEN v_preserve_contract THEN v_contract.status ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_collection_v2(uuid, uuid, text, text, text, boolean, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_collection_v2(uuid, uuid, text, text, text, boolean, text, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.freeze_initial_judgment_claim_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_excluded_invoice_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NEW.contract_id IS NULL
     OR NEW.outcome_date IS NULL
     OR NEW.workflow_stage IS DISTINCT FROM 'judgment_issued'
     OR (
       OLD.workflow_stage IS NOT DISTINCT FROM NEW.workflow_stage
       AND OLD.outcome_date IS NOT DISTINCT FROM NEW.outcome_date
     )
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_claim_snapshots snapshot
    WHERE snapshot.company_id = NEW.company_id
      AND snapshot.case_id = NEW.id
      AND snapshot.snapshot_type = 'initial_judgment'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ARRAY_AGG(value::uuid), ARRAY[]::uuid[])
  INTO v_excluded_invoice_ids
  FROM public.legal_claim_snapshots transfer_snapshot
  CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS_TEXT(
    COALESCE(transfer_snapshot.breakdown -> 'excluded_invoice_ids', '[]'::jsonb)
  ) item(value)
  WHERE transfer_snapshot.company_id = NEW.company_id
    AND transfer_snapshot.case_id = NEW.id
    AND transfer_snapshot.snapshot_type = 'transfer';

  PERFORM public.freeze_legal_claim_snapshot_v1(
    NEW.company_id,
    NEW.contract_id,
    NEW.id,
    'initial_judgment',
    NEW.outcome_date,
    COALESCE(NEW.claim_scope, 'full_outstanding'),
    v_excluded_invoice_ids,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_initial_judgment_claim_snapshot_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_initial_judgment_claim_snapshot_v1()
  TO service_role;

DROP TRIGGER IF EXISTS trg_freeze_initial_judgment_claim_snapshot
  ON public.legal_cases;
CREATE TRIGGER trg_freeze_initial_judgment_claim_snapshot
AFTER UPDATE OF workflow_stage, outcome_date ON public.legal_cases
FOR EACH ROW
EXECUTE FUNCTION public.freeze_initial_judgment_claim_snapshot_v1();

COMMIT;
