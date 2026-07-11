-- Tools to safely clean duplicate journal entries before enforcing
-- unique financial references. This does not delete accounting records.
-- It keeps one canonical journal per payment/invoice/contract reference,
-- reverses extra posted journals, and detaches duplicate references.

CREATE OR REPLACE FUNCTION public.preview_duplicate_financial_journal_references()
RETURNS TABLE (
  company_id uuid,
  reference_type text,
  reference_id uuid,
  duplicate_count integer,
  canonical_journal_entry_id uuid,
  duplicate_journal_entry_ids uuid[],
  duplicate_total_debit numeric,
  duplicate_total_credit numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      je.id,
      je.company_id,
      je.reference_type,
      je.reference_id,
      je.total_debit,
      je.total_credit,
      ROW_NUMBER() OVER (
        PARTITION BY je.company_id, je.reference_type, je.reference_id
        ORDER BY
          CASE
            WHEN je.reference_type = 'payment' AND p.journal_entry_id = je.id THEN 0
            WHEN je.reference_type = 'invoice' AND i.journal_entry_id = je.id THEN 0
            WHEN je.reference_type = 'contract' AND c.journal_entry_id = je.id THEN 0
            ELSE 1
          END,
          CASE WHEN LOWER(COALESCE(je.status, '')) = 'posted' THEN 0 ELSE 1 END,
          je.created_at ASC NULLS LAST,
          je.id
      ) AS rn,
      COUNT(*) OVER (
        PARTITION BY je.company_id, je.reference_type, je.reference_id
      ) AS duplicate_count
    FROM public.journal_entries je
    LEFT JOIN public.payments p
      ON je.reference_type = 'payment'
     AND p.company_id = je.company_id
     AND p.id = je.reference_id
    LEFT JOIN public.invoices i
      ON je.reference_type = 'invoice'
     AND i.company_id = je.company_id
     AND i.id = je.reference_id
    LEFT JOIN public.contracts c
      ON je.reference_type = 'contract'
     AND c.company_id = je.company_id
     AND c.id = je.reference_id
    WHERE je.reference_type IN ('payment', 'invoice', 'contract')
      AND je.reference_id IS NOT NULL
  )
  SELECT
    r.company_id,
    r.reference_type,
    r.reference_id,
    MAX(r.duplicate_count)::integer AS duplicate_count,
    (ARRAY_AGG(r.id ORDER BY r.rn) FILTER (WHERE r.rn = 1))[1] AS canonical_journal_entry_id,
    ARRAY_AGG(r.id ORDER BY r.rn) FILTER (WHERE r.rn > 1) AS duplicate_journal_entry_ids,
    COALESCE(SUM(r.total_debit) FILTER (WHERE r.rn > 1), 0) AS duplicate_total_debit,
    COALESCE(SUM(r.total_credit) FILTER (WHERE r.rn > 1), 0) AS duplicate_total_credit
  FROM ranked r
  WHERE r.duplicate_count > 1
  GROUP BY r.company_id, r.reference_type, r.reference_id;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_financial_journal_references(
  p_apply boolean DEFAULT false,
  p_limit integer DEFAULT 500,
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_processed integer := 0;
  v_reversed integer := 0;
  v_detached integer := 0;
  v_relinked integer := 0;
  v_line_count integer;
  v_reversal_entry_id uuid;
  v_reversal_number text;
  v_actor uuid := p_actor_id;
BEGIN
  IF COALESCE(p_limit, 0) <= 0 THEN
    p_limit := 500;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  FOR v_row IN
    WITH ranked AS (
      SELECT
        je.*,
        ROW_NUMBER() OVER (
          PARTITION BY je.company_id, je.reference_type, je.reference_id
          ORDER BY
            CASE
              WHEN je.reference_type = 'payment' AND p.journal_entry_id = je.id THEN 0
              WHEN je.reference_type = 'invoice' AND i.journal_entry_id = je.id THEN 0
              WHEN je.reference_type = 'contract' AND c.journal_entry_id = je.id THEN 0
              ELSE 1
            END,
            CASE WHEN LOWER(COALESCE(je.status, '')) = 'posted' THEN 0 ELSE 1 END,
            je.created_at ASC NULLS LAST,
            je.id
        ) AS rn,
        FIRST_VALUE(je.id) OVER (
          PARTITION BY je.company_id, je.reference_type, je.reference_id
          ORDER BY
            CASE
              WHEN je.reference_type = 'payment' AND p.journal_entry_id = je.id THEN 0
              WHEN je.reference_type = 'invoice' AND i.journal_entry_id = je.id THEN 0
              WHEN je.reference_type = 'contract' AND c.journal_entry_id = je.id THEN 0
              ELSE 1
            END,
            CASE WHEN LOWER(COALESCE(je.status, '')) = 'posted' THEN 0 ELSE 1 END,
            je.created_at ASC NULLS LAST,
            je.id
        ) AS canonical_journal_entry_id,
        COUNT(*) OVER (
          PARTITION BY je.company_id, je.reference_type, je.reference_id
        ) AS duplicate_count
      FROM public.journal_entries je
      LEFT JOIN public.payments p
        ON je.reference_type = 'payment'
       AND p.company_id = je.company_id
       AND p.id = je.reference_id
      LEFT JOIN public.invoices i
        ON je.reference_type = 'invoice'
       AND i.company_id = je.company_id
       AND i.id = je.reference_id
      LEFT JOIN public.contracts c
        ON je.reference_type = 'contract'
       AND c.company_id = je.company_id
       AND c.id = je.reference_id
      WHERE je.reference_type IN ('payment', 'invoice', 'contract')
        AND je.reference_id IS NOT NULL
    )
    SELECT *
    FROM ranked
    WHERE duplicate_count > 1
      AND rn > 1
    ORDER BY company_id, reference_type, reference_id, rn
    LIMIT p_limit
  LOOP
    v_processed := v_processed + 1;

    IF NOT p_apply THEN
      CONTINUE;
    END IF;

    v_reversal_entry_id := NULL;

    SELECT COUNT(*)
    INTO v_line_count
    FROM public.journal_entry_lines
    WHERE journal_entry_id = v_row.id;

    IF LOWER(COALESCE(v_row.status, '')) = 'posted'
       AND v_row.reversal_entry_id IS NULL
       AND v_line_count > 0
    THEN
      v_reversal_number :=
        'DUPREV-' ||
        TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS') ||
        '-' || SUBSTRING(v_row.id::text, 1, 8);

      INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        status,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        created_by,
        posted_by,
        posted_at,
        created_at,
        updated_at,
        workflow_notes
      )
      VALUES (
        v_row.company_id,
        LEFT(v_reversal_number, 50),
        v_row.entry_date,
        'draft',
        LEFT('Duplicate reversal ' || COALESCE(v_row.entry_number, v_row.id::text), 50),
        LEFT(v_row.reference_type || '_duplicate_reversal', 50),
        v_row.id,
        COALESCE(v_row.total_credit, 0),
        COALESCE(v_row.total_debit, 0),
        v_actor,
        NULL,
        NULL,
        now(),
        now(),
        'Generated by cleanup_duplicate_financial_journal_references. Canonical journal: ' ||
          v_row.canonical_journal_entry_id::text
      )
      RETURNING id INTO v_reversal_entry_id;

      INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        line_description,
        line_number,
        cost_center_id,
        asset_id,
        employee_id
      )
      SELECT
        v_reversal_entry_id,
        line.account_id,
        COALESCE(line.credit_amount, 0),
        COALESCE(line.debit_amount, 0),
        'Duplicate reversal - ' || COALESCE(line.line_description, v_row.entry_number, v_row.id::text),
        ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
        line.cost_center_id,
        line.asset_id,
        line.employee_id
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_row.id;

      UPDATE public.journal_entries
      SET status = 'posted',
          posted_by = v_actor,
          posted_at = now(),
          updated_at = now()
      WHERE id = v_reversal_entry_id
        AND company_id = v_row.company_id;

      v_reversed := v_reversed + 1;
    END IF;

    UPDATE public.journal_entries
    SET status = CASE
          WHEN LOWER(COALESCE(status, '')) = 'posted' THEN 'reversed'
          WHEN LOWER(COALESCE(status, '')) IN ('reversed', 'cancelled') THEN status
          ELSE 'cancelled'
        END,
        reversal_entry_id = COALESCE(v_reversal_entry_id, reversal_entry_id),
        reversed_at = CASE
          WHEN LOWER(COALESCE(status, '')) = 'posted' THEN now()
          ELSE reversed_at
        END,
        reversed_by = CASE
          WHEN LOWER(COALESCE(status, '')) = 'posted' THEN v_actor
          ELSE reversed_by
        END,
        reference_type = v_row.reference_type || '_duplicate',
        workflow_notes = CONCAT_WS(
          E'\n',
          NULLIF(workflow_notes, ''),
          'Duplicate financial reference detached. Original reference: ' ||
            v_row.reference_type || ':' || v_row.reference_id::text ||
            '. Canonical journal: ' || v_row.canonical_journal_entry_id::text ||
            CASE
              WHEN v_reversal_entry_id IS NULL THEN ''
              ELSE '. Reversal journal: ' || v_reversal_entry_id::text
            END
        ),
        updated_at = now(),
        updated_by = v_actor
    WHERE id = v_row.id
      AND company_id = v_row.company_id;

    v_detached := v_detached + 1;

    IF v_row.reference_type = 'payment' THEN
      UPDATE public.payments
      SET journal_entry_id = v_row.canonical_journal_entry_id,
          updated_at = now()
      WHERE id = v_row.reference_id
        AND company_id = v_row.company_id
        AND (journal_entry_id IS NULL OR journal_entry_id = v_row.id);
      IF FOUND THEN v_relinked := v_relinked + 1; END IF;
    ELSIF v_row.reference_type = 'invoice' THEN
      UPDATE public.invoices
      SET journal_entry_id = v_row.canonical_journal_entry_id,
          updated_at = now()
      WHERE id = v_row.reference_id
        AND company_id = v_row.company_id
        AND (journal_entry_id IS NULL OR journal_entry_id = v_row.id);
      IF FOUND THEN v_relinked := v_relinked + 1; END IF;
    ELSIF v_row.reference_type = 'contract' THEN
      UPDATE public.contracts
      SET journal_entry_id = v_row.canonical_journal_entry_id,
          updated_at = now()
      WHERE id = v_row.reference_id
        AND company_id = v_row.company_id
        AND (journal_entry_id IS NULL OR journal_entry_id = v_row.id);
      IF FOUND THEN v_relinked := v_relinked + 1; END IF;
    END IF;
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', '', true);

  RETURN jsonb_build_object(
    'apply', p_apply,
    'processed_duplicate_entries', v_processed,
    'reversed_posted_duplicates', v_reversed,
    'detached_duplicate_references', v_detached,
    'relinked_source_records', v_relinked,
    'remaining_duplicate_groups', (
      SELECT COUNT(*) FROM public.preview_duplicate_financial_journal_references()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_duplicate_financial_journal_references() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_financial_journal_references(boolean, integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cleanup_all_duplicate_financial_journal_references(
  p_batch_size integer DEFAULT 500,
  p_max_batches integer DEFAULT 50,
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch integer := 0;
  v_result jsonb;
  v_processed integer := 0;
  v_reversed integer := 0;
  v_detached integer := 0;
  v_relinked integer := 0;
  v_remaining integer := 0;
BEGIN
  IF COALESCE(p_batch_size, 0) <= 0 THEN
    p_batch_size := 500;
  END IF;

  IF COALESCE(p_max_batches, 0) <= 0 THEN
    p_max_batches := 50;
  END IF;

  LOOP
    EXIT WHEN v_batch >= p_max_batches;

    v_batch := v_batch + 1;

    v_result := public.cleanup_duplicate_financial_journal_references(
      true,
      p_batch_size,
      p_actor_id
    );

    v_processed := v_processed + COALESCE((v_result ->> 'processed_duplicate_entries')::integer, 0);
    v_reversed := v_reversed + COALESCE((v_result ->> 'reversed_posted_duplicates')::integer, 0);
    v_detached := v_detached + COALESCE((v_result ->> 'detached_duplicate_references')::integer, 0);
    v_relinked := v_relinked + COALESCE((v_result ->> 'relinked_source_records')::integer, 0);
    v_remaining := COALESCE((v_result ->> 'remaining_duplicate_groups')::integer, 0);

    EXIT WHEN COALESCE((v_result ->> 'processed_duplicate_entries')::integer, 0) = 0;
    EXIT WHEN v_remaining = 0;
  END LOOP;

  RETURN jsonb_build_object(
    'batches_run', v_batch,
    'processed_duplicate_entries', v_processed,
    'reversed_posted_duplicates', v_reversed,
    'detached_duplicate_references', v_detached,
    'relinked_source_records', v_relinked,
    'remaining_duplicate_groups', v_remaining,
    'stopped_because',
      CASE
        WHEN v_remaining = 0 THEN 'completed'
        WHEN v_batch >= p_max_batches THEN 'max_batches_reached'
        ELSE 'no_more_processed_entries'
      END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_all_duplicate_financial_journal_references(integer, integer, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.preview_duplicate_financial_journal_references() IS
'Reports duplicate payment/invoice/contract journal references before enforcing the unique journal reference guard.';

COMMENT ON FUNCTION public.cleanup_duplicate_financial_journal_references(boolean, integer, uuid) IS
'Batch cleanup for duplicate financial journal references. Dry-run with p_apply=false; apply reversals/detachments with p_apply=true.';

COMMENT ON FUNCTION public.cleanup_all_duplicate_financial_journal_references(integer, integer, uuid) IS
'Runs cleanup_duplicate_financial_journal_references repeatedly in bounded batches until duplicate financial journal references are cleaned or the batch cap is reached.';
