CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3(p_company_id uuid, p_contract_id uuid, p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar'::text))::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH contract_row AS (
    SELECT c.*
    FROM public.contracts c
    WHERE c.company_id = p_company_id
      AND c.id = p_contract_id
  ),
  profile AS (
    SELECT p.*
    FROM public.legal_case_litigation_profile p
    WHERE p.company_id = p_company_id
      AND p.contract_id = p_contract_id
  ),
  case_dates AS (
    SELECT
      MIN(lc.judgment_final_at::DATE) FILTER (
        WHERE lc.judgment_final_at IS NOT NULL
          AND LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'
      ) AS judgment_date,
      MIN(lc.outcome_date) FILTER (
        WHERE lc.outcome_date IS NOT NULL
          AND lc.workflow_stage IN ('judgment_issued', 'closed')
          AND LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'
      ) AS outcome_date
    FROM public.legal_cases lc
    WHERE lc.company_id = p_company_id
      AND lc.contract_id = p_contract_id
  ),
  due_invoice_components AS (
    SELECT
      i.due_date,
      LOWER(COALESCE(i.invoice_type, '')) AS invoice_type,
      i.penalty_id,
      GREATEST(
        COALESCE(i.balance_due, i.total_amount - COALESCE(i.paid_amount, 0)),
        0
      ) AS amount
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND i.due_date <= p_as_of_date
      AND LOWER(COALESCE(i.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
  ),
  due_invoices AS (
    SELECT component.due_date, component.amount
    FROM due_invoice_components component
    WHERE component.penalty_id IS NULL
      AND component.invoice_type = 'sales'
      AND component.amount > 0
  ),
  excluded_invoice_components AS (
    SELECT
      COALESCE(SUM(component.amount) FILTER (
        WHERE component.penalty_id IS NOT NULL
      ), 0) AS penalty_invoice_due_amount,
      COALESCE(SUM(component.amount) FILTER (
        WHERE component.penalty_id IS NULL
          AND component.invoice_type <> 'sales'
      ), 0) AS non_rent_invoice_due_amount
    FROM due_invoice_components component
  ),
  due_schedules AS (
    SELECT
      s.due_date,
      GREATEST(s.amount - COALESCE(s.paid_amount, 0), 0) AS amount
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND s.due_date <= p_as_of_date
      AND s.invoice_id IS NULL
      AND LOWER(COALESCE(s.status, '')) NOT IN (
        'paid', 'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.company_id = s.company_id
          AND i.contract_id = s.contract_id
          AND i.penalty_id IS NULL
          AND LOWER(COALESCE(i.invoice_type, '')) = 'sales'
          AND LOWER(COALESCE(i.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
          )
          AND LOWER(COALESCE(i.payment_status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
          )
          AND DATE_TRUNC('month', COALESCE(i.invoice_month, i.due_date)::TIMESTAMP)
              = DATE_TRUNC('month', s.due_date::TIMESTAMP)
      )
  ),
  claim_rows AS (
    SELECT due_date, amount FROM due_invoices
    UNION ALL
    SELECT due_date, amount FROM due_schedules WHERE amount > 0
  ),
  covered_months AS (
    SELECT DATE_TRUNC(
      'month', COALESCE(i.invoice_month, i.due_date)::TIMESTAMP
    )::DATE AS month_start
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND i.penalty_id IS NULL
      AND LOWER(COALESCE(i.invoice_type, '')) = 'sales'
      AND LOWER(COALESCE(i.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
    UNION
    SELECT DATE_TRUNC('month', s.due_date::TIMESTAMP)::DATE
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND LOWER(COALESCE(s.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed', 'deleted'
      )
  ),
  legal_period AS (
    SELECT
      c.id AS contract_id,
      c.status AS contract_status,
      c.monthly_amount,
      c.vehicle_returned,
      p.vehicle_custody,
      p.vehicle_returned_at,
      p.termination_date,
      p.termination_date_status,
      p.retention_daily_rate,
      p.retention_rate_source,
      p.retention_rate_source_ref,
      p.retention_rate_source_document_id,
      GREATEST(
        (DATE_TRUNC('month', c.end_date::TIMESTAMP) + INTERVAL '1 month')::DATE,
        COALESCE(
          ((SELECT MAX(month_start) FROM covered_months) + INTERVAL '1 month')::DATE,
          (DATE_TRUNC('month', c.end_date::TIMESTAMP) + INTERVAL '1 month')::DATE
        )
      ) AS extension_start_date,
      LEAST(
        p_as_of_date,
        COALESCE(p.vehicle_returned_at, p_as_of_date),
        COALESCE(
          CASE WHEN p.termination_date_status = 'confirmed' THEN p.termination_date END,
          p_as_of_date
        ),
        COALESCE(cd.judgment_date, p_as_of_date),
        COALESCE(cd.outcome_date, p_as_of_date)
      ) AS rent_cutoff_date,
      (
        SELECT MIN(event_date)
        FROM (VALUES
          (CASE WHEN p.termination_date_status = 'confirmed' THEN p.termination_date END),
          (cd.judgment_date),
          (cd.outcome_date)
        ) AS rescission_events(event_date)
        WHERE event_date IS NOT NULL
      ) AS rescission_effective_date
    FROM contract_row c
    LEFT JOIN profile p ON TRUE
    CROSS JOIN case_dates cd
  ),
  extension_months AS (
    SELECT
      lp.*,
      month_start::DATE,
      (month_start + INTERVAL '1 month - 1 day')::DATE AS month_end
    FROM legal_period lp
    CROSS JOIN LATERAL GENERATE_SERIES(
      DATE_TRUNC('month', lp.extension_start_date::TIMESTAMP),
      DATE_TRUNC('month', lp.rent_cutoff_date::TIMESTAMP),
      INTERVAL '1 month'
    ) month_start
    WHERE lp.contract_status = 'under_legal_procedure'
      AND lp.monthly_amount > 0
      AND lp.vehicle_returned IS NOT TRUE
      AND lp.vehicle_custody = 'with_defendant'
      AND lp.extension_start_date <= lp.rent_cutoff_date
  ),
  extension_amount AS (
    SELECT COALESCE(SUM(
      em.monthly_amount
      * (
          LEAST(em.rent_cutoff_date, em.month_end)
          - GREATEST(em.extension_start_date, em.month_start)
          + 1
        )::NUMERIC
      / EXTRACT(DAY FROM em.month_end)::NUMERIC
    ), 0) AS amount
    FROM extension_months em
  ),
  contractual_raw AS (
    SELECT
      CASE p.contractual_compensation_method
        WHEN 'fixed' THEN p.contractual_compensation_rate
        WHEN 'daily' THEN COALESCE((
          SELECT SUM(
            GREATEST(p_as_of_date - r.due_date, 0)
            * p.contractual_compensation_rate
          )
          FROM claim_rows r
        ), 0)
        WHEN 'monthly' THEN COALESCE((
          SELECT COUNT(DISTINCT DATE_TRUNC('month', r.due_date::TIMESTAMP))
            * p.contractual_compensation_rate
          FROM claim_rows r
        ), 0)
        WHEN 'per_invoice' THEN (
          SELECT COUNT(*) * p.contractual_compensation_rate FROM claim_rows
        )
        ELSE 0
      END AS amount,
      p.contractual_compensation_cap AS cap
    FROM profile p
    WHERE p.contractual_compensation_enabled
      AND NULLIF(BTRIM(p.contractual_compensation_clause_number), '') IS NOT NULL
      AND NULLIF(BTRIM(p.contractual_compensation_clause_text), '') IS NOT NULL
      AND p.contractual_compensation_method IN ('fixed', 'daily', 'monthly', 'per_invoice')
      AND p.contractual_compensation_rate > 0
      AND p.contractual_compensation_document_id IS NOT NULL
  ),
  extras AS (
    SELECT
      COALESCE((
        SELECT CASE
          WHEN cap IS NULL THEN amount
          ELSE LEAST(amount, GREATEST(cap, 0))
        END
        FROM contractual_raw
      ), 0) AS contractual_amount,
      COALESCE((
        SELECT SUM(GREATEST(
          d.amount
            - COALESCE(d.depreciation_deduction, 0)
            - COALESCE(d.insurance_recovery, 0),
          0
        ))
        FROM public.legal_case_damage_costs d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.verified
          AND d.evidence_document_id IS NOT NULL
      ), 0) AS damage_amount,
      CASE WHEN EXISTS (
        SELECT 1
        FROM public.contract_documents d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.document_type = 'violations_proof'
          AND d.file_path IS NOT NULL
      ) THEN COALESCE((
        SELECT SUM(COALESCE(pe.amount, 0))
        FROM public.penalties pe
        WHERE pe.company_id = p_company_id
          AND pe.contract_id = p_contract_id
          AND COALESCE(pe.payment_status, '') <> 'paid'
          AND COALESCE(pe.status, '') <> 'cancelled'
      ), 0) ELSE 0 END AS violations_amount,
      COALESCE((
        SELECT
          GREATEST(
            LEAST(p_as_of_date, COALESCE(lp.vehicle_returned_at, p_as_of_date))
              - (lp.rescission_effective_date + 1) + 1,
            0
          ) * lp.retention_daily_rate
        FROM legal_period lp
        WHERE lp.vehicle_custody = 'with_defendant'
          AND lp.vehicle_returned IS NOT TRUE
          AND lp.rescission_effective_date IS NOT NULL
          AND lp.rescission_effective_date < LEAST(
            p_as_of_date,
            COALESCE(lp.vehicle_returned_at, p_as_of_date)
          )
          AND lp.retention_daily_rate > 0
          AND lp.retention_rate_source IS NOT NULL
          AND NULLIF(BTRIM(lp.retention_rate_source_ref), '') IS NOT NULL
          AND lp.retention_rate_source_document_id IS NOT NULL
      ), 0) AS retention_amount,
      COALESCE((
        SELECT CASE WHEN p.apply_security_deposit
          THEN GREATEST(COALESCE(p.security_deposit_amount, 0), 0)
          ELSE 0
        END
        FROM profile p
      ), 0) AS deposit_deduction
  ),
  totals AS (
    SELECT
      COALESCE((SELECT SUM(amount) FROM claim_rows), 0) AS recorded_due_amount,
      COALESCE((SELECT amount FROM extension_amount), 0) AS legal_extension_rent_amount,
      excluded.penalty_invoice_due_amount,
      excluded.non_rent_invoice_due_amount,
      e.contractual_amount,
      e.damage_amount,
      e.violations_amount,
      e.retention_amount,
      e.deposit_deduction
    FROM extras e
    CROSS JOIN excluded_invoice_components excluded
  )
  SELECT JSONB_BUILD_OBJECT(
    'recorded_due_amount', ROUND(t.recorded_due_amount, 2),
    'legal_extension_rent_amount', ROUND(t.legal_extension_rent_amount, 2),
    'contractual_compensation_amount', ROUND(t.contractual_amount, 2),
    'damage_amount', ROUND(t.damage_amount, 2),
    'violations_amount', ROUND(t.violations_amount, 2),
    'retention_amount', ROUND(t.retention_amount, 2),
    'deposit_deduction', ROUND(t.deposit_deduction, 2),
    'excluded_penalty_invoice_due_amount', ROUND(t.penalty_invoice_due_amount, 2),
    'excluded_non_rent_invoice_due_amount', ROUND(t.non_rent_invoice_due_amount, 2),
    'total', ROUND(GREATEST(
      t.recorded_due_amount
        + t.legal_extension_rent_amount
        + t.contractual_amount
        + t.damage_amount
        + t.violations_amount
        + t.retention_amount
        - t.deposit_deduction,
      0
    ), 2),
    'extension_start_date', (SELECT extension_start_date FROM legal_period),
    'rent_cutoff_date', (SELECT rent_cutoff_date FROM legal_period),
    'retention_start_date', (
      SELECT rescission_effective_date + 1 FROM legal_period
    ),
    'as_of_date', p_as_of_date
  )
  FROM totals t;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(p_company_id uuid, p_contract_id uuid, p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar'::text))::date, p_claim_scope text DEFAULT 'full_outstanding'::text, p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$;
