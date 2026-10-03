-- Only existing active unreversed canonical invoice drafts may be posted. No financial source rows changed.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN IF encode(sha256(convert_to(pg_get_functiondef('public.post_due_journal_drafts_v1(uuid,uuid)'::regprocedure),'UTF8')),'hex')<>'2922437607006f1d546e07712486a2ef7fe015c1eaf4c00a8e5f8b2019c7b554' THEN RAISE EXCEPTION 'Inspected post-due function changed'; END IF; END;$guard$;
CREATE OR REPLACE FUNCTION public.post_due_journal_drafts_v1(p_company_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_count integer := 0;
  v_amount numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND v_actor IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF v_actor IS NULL AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  WITH due AS (
    -- ACTIVE_CANONICAL_DRAFT_ONLY_20261003020000
    SELECT e.id FROM public.journal_entries e
    JOIN public.invoices i ON i.id=e.reference_id AND i.company_id=e.company_id
    WHERE (p_company_id IS NULL OR e.company_id=p_company_id)
      AND e.status='draft' AND e.reference_type='invoice'
      AND e.entry_date IS NOT NULL AND e.entry_date<=v_today
      AND i.journal_entry_id=e.id
      AND public.financial_record_is_active_v1(i.status)
      AND public.financial_record_is_active_v1(i.payment_status)
      AND e.reversal_entry_id IS NULL AND e.reversed_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.journal_entries existing
        WHERE existing.company_id=e.company_id AND existing.reference_type='invoice'
          AND existing.reference_id=i.id AND existing.status='posted' AND existing.id<>e.id)
    ORDER BY e.entry_date,e.id
    LIMIT 500
  ), posted AS (
    UPDATE public.journal_entries e
    SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
    FROM due WHERE e.id = due.id
    RETURNING e.id, e.total_debit
  )
  SELECT count(*), COALESCE(sum(total_debit), 0) INTO v_count, v_amount FROM posted;

  RETURN jsonb_build_object('postedCount', v_count, 'postedAmount', v_amount, 'asOf', v_today);
END;
$function$
;
COMMIT;
