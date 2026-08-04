-- Follow-up to 20260803223000: the legacy zero placeholders carry one DRAFT
-- zero-balanced journal (never posted), not a posted one. A draft zero journal
-- never entered the ledger, so it is deleted outright; a posted zero journal
-- is reversed instead. All other safety gates are unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_retire_paid_zero_invoice_placeholders(
  p_company_id uuid,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_invoice record;
  v_month date;
  v_journal record;
  v_journal_count integer;
  v_replacement_id uuid;
  v_retired integer := 0;
  v_regenerated integer := 0;
  v_skipped integer := 0;
  v_report jsonb := '[]'::jsonb;
  v_reason text;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF v_role <> 'service_role' AND NOT v_trusted_direct_session THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required' USING ERRCODE = '22023';
  END IF;

  FOR v_invoice IN
    SELECT invoice.*
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id IS NOT NULL
      AND abs(COALESCE(invoice.total_amount, 0)) <= 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY COALESCE(invoice.invoice_month, invoice.invoice_date), invoice.id
  LOOP
    v_reason := NULL;
    v_month := date_trunc(
      'month',
      COALESCE(v_invoice.invoice_month, v_invoice.invoice_date)::timestamp without time zone
    )::date;

    IF abs(COALESCE(v_invoice.subtotal, 0)) > 0.01
       OR abs(COALESCE(v_invoice.tax_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.discount_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.paid_amount, 0)) > 0.01
       OR abs(COALESCE(v_invoice.balance_due, 0)) > 0.01
       OR v_invoice.payment_id IS NOT NULL
       OR COALESCE(v_invoice.manual_review_required, false)
       OR v_invoice.manual_idempotency_key IS NOT NULL
    THEN
      v_reason := 'nonzero_or_flagged_invoice_row';
    ELSIF EXISTS (
      SELECT 1 FROM public.payments payment
      WHERE payment.company_id = p_company_id AND payment.invoice_id = v_invoice.id
    ) THEN
      v_reason := 'payment_history';
    ELSIF EXISTS (
      SELECT 1 FROM public.payment_allocations allocation
      WHERE allocation.company_id = p_company_id
        AND allocation.allocation_type = 'invoice'
        AND allocation.target_id = v_invoice.id
    ) THEN
      v_reason := 'allocation_history';
    ELSIF EXISTS (
      SELECT 1 FROM public.invoice_approval_history approval
      WHERE approval.company_id = p_company_id AND approval.invoice_id = v_invoice.id
    ) THEN
      v_reason := 'approval_history';
    ELSIF EXISTS (
      SELECT 1 FROM public.invoice_ocr_logs ocr_log
      WHERE ocr_log.company_id = p_company_id AND ocr_log.invoice_id = v_invoice.id
    ) THEN
      v_reason := 'ocr_history';
    ELSE
      SELECT count(*)
      INTO v_journal_count
      FROM public.journal_entries entry
      WHERE entry.company_id = p_company_id
        AND entry.reference_type = 'invoice'
        AND entry.reference_id = v_invoice.id;

      IF v_journal_count IS DISTINCT FROM 1 THEN
        v_reason := 'journal_count_' || COALESCE(v_journal_count::text, 'null');
      ELSE
        SELECT entry.*
        INTO v_journal
        FROM public.journal_entries entry
        WHERE entry.company_id = p_company_id
          AND entry.reference_type = 'invoice'
          AND entry.reference_id = v_invoice.id;

        IF lower(COALESCE(v_journal.status, '')) NOT IN ('draft', 'posted')
           OR abs(COALESCE(v_journal.total_debit, 0)) > 0.01
           OR abs(COALESCE(v_journal.total_credit, 0)) > 0.01
           OR v_journal.reversed_at IS NOT NULL
           OR v_journal.reviewed_at IS NOT NULL
           OR v_journal.reviewed_by IS NOT NULL
           OR EXISTS (
             SELECT 1
             FROM public.journal_entry_status_history history
             WHERE history.journal_entry_id = v_journal.id
           )
           OR EXISTS (
             SELECT 1
             FROM public.journal_entry_lines line
             WHERE line.journal_entry_id = v_journal.id
               AND (
                 abs(COALESCE(line.debit_amount, 0)) > 0.01
                 OR abs(COALESCE(line.credit_amount, 0)) > 0.01
               )
           )
        THEN
          v_reason := 'journal_not_single_zero_draft_or_posted';
        END IF;
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_skipped := v_skipped + 1;
      v_report := v_report || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'month', v_month,
        'action', 'skipped',
        'reason', v_reason
      ));
      CONTINUE;
    END IF;

    IF p_dry_run THEN
      v_report := v_report || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'contract_id', v_invoice.contract_id,
        'month', v_month,
        'journal_status', lower(COALESCE(v_journal.status, '')),
        'action', 'would_retire_and_regenerate'
      ));
      v_retired := v_retired + 1;
      CONTINUE;
    END IF;

    BEGIN
      PERFORM set_config('app.financial_controls_bypass', 'on', true);

      IF lower(COALESCE(v_journal.status, '')) = 'draft' THEN
        -- A draft zero journal never entered the ledger; remove it with its lines.
        DELETE FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = v_journal.id;
        DELETE FROM public.journal_entries entry
        WHERE entry.id = v_journal.id
          AND lower(COALESCE(entry.status, '')) = 'draft'
          AND abs(COALESCE(entry.total_debit, 0)) <= 0.01
          AND abs(COALESCE(entry.total_credit, 0)) <= 0.01;
      ELSE
        -- A posted zero journal stays as audit history, closed as reversed.
        UPDATE public.journal_entries entry
        SET status = 'reversed',
            reversed_at = now(),
            workflow_notes = left(COALESCE(NULLIF(BTRIM(entry.workflow_notes), ''), '')
              || E'\nReversed zero placeholder journal during canonical month repair 20260803230000', 2000),
            updated_at = now()
        WHERE entry.id = v_journal.id
          AND lower(COALESCE(entry.status, '')) = 'posted'
          AND abs(COALESCE(entry.total_debit, 0)) <= 0.01
          AND abs(COALESCE(entry.total_credit, 0)) <= 0.01;
      END IF;

      UPDATE public.invoices invoice
      SET status = 'cancelled',
          payment_status = 'cancelled',
          notes = concat_ws(
            E'\n',
            NULLIF(BTRIM(COALESCE(invoice.notes, '')), ''),
            'Retired paid zero placeholder; canonical month reissued 20260803230000'
          ),
          updated_at = now()
      WHERE invoice.id = v_invoice.id
        AND invoice.company_id = p_company_id
        AND abs(COALESCE(invoice.total_amount, 0)) <= 0.01;

      PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

      v_replacement_id := public.generate_invoice_for_contract_month(
        v_invoice.contract_id,
        v_month
      );
      IF v_replacement_id IS NULL THEN
        RAISE EXCEPTION 'canonical generator returned no invoice for month %', v_month;
      END IF;

      v_retired := v_retired + 1;
      v_regenerated := v_regenerated + 1;
      v_report := v_report || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'contract_id', v_invoice.contract_id,
        'month', v_month,
        'action', 'retired_and_regenerated',
        'replacement_invoice_id', v_replacement_id
      ));
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
      v_skipped := v_skipped + 1;
      v_report := v_report || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'contract_id', v_invoice.contract_id,
        'month', v_month,
        'action', 'error',
        'reason', left(SQLERRM, 500)
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'mode', CASE WHEN p_dry_run THEN 'dry_run' ELSE 'apply' END,
    'company_id', p_company_id,
    'retired', v_retired,
    'regenerated', v_regenerated,
    'skipped', v_skipped,
    'rows', v_report
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_retire_paid_zero_invoice_placeholders(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_retire_paid_zero_invoice_placeholders(uuid, boolean)
  TO service_role;

COMMIT;
