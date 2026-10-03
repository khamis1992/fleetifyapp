-- Apply as a new forward migration to restore the inspected original function.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN IF encode(sha256(convert_to(pg_get_functiondef('public.post_due_journal_drafts_v1(uuid,uuid)'::regprocedure),'UTF8')),'hex')<>'bc73125ab513868edf59cf093733d9df0983d1431d1d9defc855f86893cc9ad7' THEN RAISE EXCEPTION 'Repaired post-due function changed'; END IF; END;$guard$;
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
    SELECT id FROM public.journal_entries
    WHERE (p_company_id IS NULL OR company_id = p_company_id)
      AND status = 'draft' AND reference_type = 'invoice'
      AND entry_date IS NOT NULL AND entry_date <= v_today
    ORDER BY entry_date, id
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
