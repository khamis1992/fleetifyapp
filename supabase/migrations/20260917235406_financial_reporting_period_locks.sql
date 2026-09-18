-- Explicit cumulative reporting locks integrated with existing accounting_periods.
-- Schema, existing triggers and constraints verified read-only on 2026-09-18.
-- No periods are locked, unlocked or created merely by installing this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.financial_reporting_period_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id),
  accounting_period_id uuid NOT NULL UNIQUE REFERENCES public.accounting_periods(id),
  locked_through date NOT NULL CHECK (isfinite(locked_through) AND locked_through >= DATE '0001-01-01'),
  status text NOT NULL CHECK (status IN ('locked', 'unlocked')),
  changed_by uuid NOT NULL,
  changed_by_name text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 20 AND 4000)
);
ALTER TABLE public.financial_reporting_period_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_reporting_period_locks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.financial_reporting_period_locks TO authenticated;
CREATE POLICY reporting_period_locks_read ON public.financial_reporting_period_locks
  FOR SELECT TO authenticated USING (balance_sheet_private.has_access(company_id, 'view'));

CREATE TABLE balance_sheet_private.period_lock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id uuid NOT NULL REFERENCES public.financial_reporting_period_locks(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  action text NOT NULL CHECK (action IN ('locked', 'unlocked')),
  locked_through date NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 20 AND 4000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX period_lock_events_company_time ON balance_sheet_private.period_lock_events(company_id, created_at DESC, id);
ALTER TABLE balance_sheet_private.period_lock_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON balance_sheet_private.period_lock_events FROM PUBLIC, anon, authenticated, service_role;

-- An ungranted transaction-local capability, not a user-settable GUC. Legacy
-- SECURITY DEFINER reopening routines cannot accidentally open our managed row.
CREATE TABLE balance_sheet_private.period_lock_mutations (
  transaction_id xid8 NOT NULL,
  accounting_period_id uuid NOT NULL,
  PRIMARY KEY (transaction_id, accounting_period_id)
);
ALTER TABLE balance_sheet_private.period_lock_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON balance_sheet_private.period_lock_mutations FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION balance_sheet_private.immutable_period_lock_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  RAISE EXCEPTION 'Reporting period lock history cannot be changed or deleted' USING ERRCODE='42501';
END;
$fn$;
CREATE TRIGGER immutable_period_lock_history BEFORE UPDATE OR DELETE ON balance_sheet_private.period_lock_events
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.immutable_period_lock_history();
CREATE TRIGGER immutable_period_lock_history_truncate BEFORE TRUNCATE ON balance_sheet_private.period_lock_events
  FOR EACH STATEMENT EXECUTE FUNCTION balance_sheet_private.immutable_period_lock_history();
CREATE TRIGGER preserve_reporting_lock_state BEFORE DELETE OR TRUNCATE ON public.financial_reporting_period_locks
  FOR EACH STATEMENT EXECUTE FUNCTION balance_sheet_private.immutable_period_lock_history();

CREATE FUNCTION balance_sheet_private.guard_accounting_period_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE
  v_id uuid;
  v_managed public.financial_reporting_period_locks%ROWTYPE;
BEGIN
  v_id := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
  SELECT * INTO v_managed FROM public.financial_reporting_period_locks
    WHERE accounting_period_id=v_id OR (TG_OP='UPDATE' AND accounting_period_id=OLD.id);
  IF FOUND THEN
    IF TG_OP='DELETE' OR NOT EXISTS (SELECT 1 FROM balance_sheet_private.period_lock_mutations
      WHERE transaction_id=pg_current_xact_id() AND accounting_period_id=v_managed.accounting_period_id) THEN
      RAISE EXCEPTION 'Use the authorized reporting period lock or unlock command with a reason' USING ERRCODE='42501';
    END IF;
    IF NEW.id IS DISTINCT FROM v_managed.accounting_period_id
      OR NEW.company_id IS DISTINCT FROM v_managed.company_id
      OR NEW.start_date IS DISTINCT FROM DATE '0001-01-01'
      OR NEW.end_date IS DISTINCT FROM v_managed.locked_through
      OR NEW.status IS DISTINCT FROM (CASE WHEN v_managed.status='locked' THEN 'locked' ELSE 'open' END) THEN
      RAISE EXCEPTION 'Managed reporting period and lock state must agree' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND ROW(OLD.company_id,OLD.start_date,OLD.end_date,OLD.status)
    IS NOT DISTINCT FROM ROW(NEW.company_id,NEW.start_date,NEW.end_date,NEW.status) THEN RETURN NEW; END IF;
  -- This also serializes existing ordinary period closing/reopening with ledger writes.
  -- Both tables are always locked in this order. No company data is modified here.
  LOCK TABLE public.journal_entries, public.journal_entry_lines IN SHARE MODE;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$fn$;
CREATE TRIGGER aa_guard_reporting_accounting_period BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.guard_accounting_period_lock();

CREATE FUNCTION balance_sheet_private.assert_reporting_period_open(p_company uuid, p_date date)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  -- A repeatable-read snapshot can predate a newly committed period row. Fail
  -- closed rather than allowing an old snapshot to bypass a concurrent lock.
  IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
    RAISE EXCEPTION 'Ledger changes require READ COMMITTED isolation for period lock verification' USING ERRCODE='40001';
  END IF;
  IF p_company IS NULL OR p_date IS NULL OR NOT isfinite(p_date) OR p_date<DATE '0001-01-01' THEN
    RAISE EXCEPTION 'A valid company and accounting date are required' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_periods p WHERE p.company_id=p_company
    AND p_date BETWEEN p.start_date AND p.end_date AND lower(p.status) IN ('closed','locked')) THEN
    RAISE EXCEPTION 'Accounting date is in a closed or locked financial period' USING ERRCODE='55000';
  END IF;
END;
$fn$;

CREATE FUNCTION balance_sheet_private.guard_reporting_journal_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF TG_OP='UPDATE' AND
    (to_jsonb(OLD)-ARRAY['description','workflow_notes','rejection_reason','reviewed_by','reviewed_at','updated_at','updated_by'])
    IS NOT DISTINCT FROM
    (to_jsonb(NEW)-ARRAY['description','workflow_notes','rejection_reason','reviewed_by','reviewed_at','updated_at','updated_by']) THEN
    RETURN NEW;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM balance_sheet_private.assert_reporting_period_open(OLD.company_id,OLD.entry_date);
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM balance_sheet_private.assert_reporting_period_open(NEW.company_id,NEW.entry_date);
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$fn$;
CREATE TRIGGER aa_guard_reporting_journal_period BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.guard_reporting_journal_entry();

CREATE FUNCTION balance_sheet_private.guard_reporting_journal_line()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE v_entry record; v_id uuid;
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(OLD)-'line_description') IS NOT DISTINCT FROM (to_jsonb(NEW)-'line_description') THEN
    RETURN NEW;
  END IF;
  -- Lock both parents in deterministic order when moving a line. FOR SHARE
  -- prevents a concurrent parent date/company change while checking its period.
  FOR v_id IN SELECT DISTINCT x FROM unnest(ARRAY[
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.journal_entry_id END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN NEW.journal_entry_id END]) x WHERE x IS NOT NULL ORDER BY x LOOP
    SELECT e.company_id,e.entry_date INTO v_entry FROM public.journal_entries e WHERE e.id=v_id FOR SHARE;
    IF NOT FOUND THEN
      -- A parent DELETE's cascaded child DELETE was already guarded on the parent.
      IF TG_OP='DELETE' THEN CONTINUE; END IF;
      RAISE EXCEPTION 'Journal entry does not exist' USING ERRCODE='23503';
    END IF;
    PERFORM balance_sheet_private.assert_reporting_period_open(v_entry.company_id,v_entry.entry_date);
  END LOOP;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$fn$;
CREATE TRIGGER aa_guard_reporting_journal_line_period BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION balance_sheet_private.guard_reporting_journal_line();

-- Keep the existing balance and posted-header immutability checks, but do not
-- make a description/review-note update fail merely because its date is closed.
CREATE OR REPLACE FUNCTION public.enforce_journal_entry_financial_controls()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN RETURN COALESCE(NEW,OLD); END IF;
  IF TG_OP='UPDATE' AND
    (to_jsonb(OLD)-ARRAY['description','workflow_notes','rejection_reason','reviewed_by','reviewed_at','updated_at','updated_by'])
    IS NOT DISTINCT FROM
    (to_jsonb(NEW)-ARRAY['description','workflow_notes','rejection_reason','reviewed_by','reviewed_at','updated_at','updated_by']) THEN RETURN NEW; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id,NEW.entry_date);
    IF NEW.total_debit IS NULL OR NEW.total_credit IS NULL THEN
      RAISE EXCEPTION 'Journal entry total_debit and total_credit must not be NULL. Entry ID: %',COALESCE(NEW.id::text,'N/A') USING ERRCODE='not_null_violation';
    END IF;
    IF ABS(NEW.total_debit-NEW.total_credit)>0.01 THEN
      RAISE EXCEPTION 'Journal entry must be balanced before saving. Debit: %, Credit: %',NEW.total_debit,NEW.total_credit USING ERRCODE='P0001';
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND lower(COALESCE(OLD.status,''))='posted' AND (
    NEW.entry_number IS DISTINCT FROM OLD.entry_number OR NEW.entry_date IS DISTINCT FROM OLD.entry_date
    OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.total_debit IS DISTINCT FROM OLD.total_debit
    OR NEW.total_credit IS DISTINCT FROM OLD.total_credit OR NEW.reference_type IS DISTINCT FROM OLD.reference_type
    OR NEW.reference_id IS DISTINCT FROM OLD.reference_id) THEN
    RAISE EXCEPTION 'Posted journal entries are immutable. Create a reversal entry instead.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE FUNCTION public.list_financial_reporting_period_locks_v1(p_company uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'view') THEN
    RAISE EXCEPTION 'Not authorized to view reporting period locks' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object('company_id',p_company,
    'managed_lock',(SELECT to_jsonb(l) FROM public.financial_reporting_period_locks l WHERE l.company_id=p_company),
    'other_closed_periods',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'period_name',p.period_name,
      'start_date',p.start_date,'end_date',p.end_date,'status',p.status) ORDER BY p.end_date DESC,p.id)
      FROM public.accounting_periods p WHERE p.company_id=p_company AND lower(p.status) IN ('closed','locked')
      AND NOT EXISTS(SELECT 1 FROM public.financial_reporting_period_locks l WHERE l.accounting_period_id=p.id)),'[]'::jsonb),
    'history',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC,e.id) FROM
      (SELECT * FROM balance_sheet_private.period_lock_events WHERE company_id=p_company ORDER BY created_at DESC,id LIMIT 100) e),'[]'::jsonb),
    'can_manage',balance_sheet_private.has_access(p_company,'approve'));
END;
$fn$;

CREATE FUNCTION public.lock_financial_reporting_period_v1(p_company uuid,p_locked_through date,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE v_lock public.financial_reporting_period_locks%ROWTYPE; v_period uuid; v_name text;
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'approve') THEN
    RAISE EXCEPTION 'Not authorized to lock reporting periods' USING ERRCODE='42501';
  END IF;
  IF p_locked_through IS NULL OR NOT isfinite(p_locked_through) OR p_locked_through<DATE '0001-01-01'
    OR p_locked_through>(clock_timestamp() AT TIME ZONE 'Asia/Qatar')::date THEN
    RAISE EXCEPTION 'Invalid reporting period cutoff' USING ERRCODE='22023';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 4000 THEN
    RAISE EXCEPTION 'A reporting period reason of 20 to 4000 characters is required' USING ERRCODE='22023';
  END IF;
  IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
    RAISE EXCEPTION 'Period changes require READ COMMITTED isolation' USING ERRCODE='40001';
  END IF;
  -- Advisory lock serializes first-time lock creation as well as subsequent
  -- commands; table locks serialize those commands with every ledger writer.
  PERFORM pg_advisory_xact_lock(hashtextextended('financial-reporting-period:'||p_company::text,0));
  LOCK TABLE public.journal_entries,public.journal_entry_lines IN SHARE MODE;
  SELECT * INTO v_lock FROM public.financial_reporting_period_locks WHERE company_id=p_company FOR UPDATE;
  IF FOUND AND v_lock.status='locked' AND p_locked_through<=v_lock.locked_through THEN
    RAISE EXCEPTION 'Cutoff must extend the active lock; explicitly unlock before reducing it' USING ERRCODE='22023';
  END IF;
  v_name:=COALESCE(balance_sheet_private.actor_name(p_company),auth.uid()::text);
  IF v_lock.id IS NULL THEN
    v_period:=gen_random_uuid();
    INSERT INTO public.accounting_periods(id,company_id,period_name,start_date,end_date,status,is_adjustment_period)
      VALUES(v_period,p_company,'Reporting cutoff lock',DATE '0001-01-01',p_locked_through,'locked',false);
    INSERT INTO public.financial_reporting_period_locks(company_id,accounting_period_id,locked_through,status,changed_by,changed_by_name,reason)
      VALUES(p_company,v_period,p_locked_through,'locked',auth.uid(),v_name,btrim(p_reason)) RETURNING * INTO v_lock;
  ELSE
    UPDATE public.financial_reporting_period_locks SET locked_through=p_locked_through,status='locked',changed_by=auth.uid(),
      changed_by_name=v_name,changed_at=clock_timestamp(),reason=btrim(p_reason) WHERE id=v_lock.id RETURNING * INTO v_lock;
    INSERT INTO balance_sheet_private.period_lock_mutations VALUES(pg_current_xact_id(),v_lock.accounting_period_id);
    UPDATE public.accounting_periods SET end_date=p_locked_through,status='locked',updated_at=clock_timestamp() WHERE id=v_lock.accounting_period_id;
    DELETE FROM balance_sheet_private.period_lock_mutations WHERE transaction_id=pg_current_xact_id() AND accounting_period_id=v_lock.accounting_period_id;
  END IF;
  INSERT INTO balance_sheet_private.period_lock_events(lock_id,company_id,action,locked_through,actor_id,actor_name,reason)
    VALUES(v_lock.id,p_company,'locked',p_locked_through,auth.uid(),v_name,btrim(p_reason));
  RETURN to_jsonb(v_lock);
END;
$fn$;

CREATE FUNCTION public.unlock_financial_reporting_period_v1(p_company uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $fn$
DECLARE v_lock public.financial_reporting_period_locks%ROWTYPE; v_name text;
BEGIN
  IF NOT balance_sheet_private.has_access(p_company,'approve') THEN
    RAISE EXCEPTION 'Not authorized to unlock reporting periods' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 4000 THEN
    RAISE EXCEPTION 'A reporting period reason of 20 to 4000 characters is required' USING ERRCODE='22023';
  END IF;
  IF current_setting('transaction_isolation') NOT IN ('read committed','read uncommitted') THEN
    RAISE EXCEPTION 'Period changes require READ COMMITTED isolation' USING ERRCODE='40001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('financial-reporting-period:'||p_company::text,0));
  LOCK TABLE public.journal_entries,public.journal_entry_lines IN SHARE MODE;
  SELECT * INTO v_lock FROM public.financial_reporting_period_locks WHERE company_id=p_company FOR UPDATE;
  IF NOT FOUND OR v_lock.status<>'locked' THEN RAISE EXCEPTION 'No active reporting period lock' USING ERRCODE='22023'; END IF;
  v_name:=COALESCE(balance_sheet_private.actor_name(p_company),auth.uid()::text);
  UPDATE public.financial_reporting_period_locks SET status='unlocked',changed_by=auth.uid(),changed_by_name=v_name,
    changed_at=clock_timestamp(),reason=btrim(p_reason) WHERE id=v_lock.id RETURNING * INTO v_lock;
  INSERT INTO balance_sheet_private.period_lock_mutations VALUES(pg_current_xact_id(),v_lock.accounting_period_id);
  UPDATE public.accounting_periods SET status='open',updated_at=clock_timestamp() WHERE id=v_lock.accounting_period_id;
  DELETE FROM balance_sheet_private.period_lock_mutations WHERE transaction_id=pg_current_xact_id() AND accounting_period_id=v_lock.accounting_period_id;
  INSERT INTO balance_sheet_private.period_lock_events(lock_id,company_id,action,locked_through,actor_id,actor_name,reason)
    VALUES(v_lock.id,p_company,'unlocked',v_lock.locked_through,auth.uid(),v_name,btrim(p_reason));
  RETURN to_jsonb(v_lock);
END;
$fn$;

REVOKE ALL ON FUNCTION balance_sheet_private.immutable_period_lock_history(),balance_sheet_private.guard_accounting_period_lock(),
  balance_sheet_private.assert_reporting_period_open(uuid,date),balance_sheet_private.guard_reporting_journal_entry(),
  balance_sheet_private.guard_reporting_journal_line() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_financial_reporting_period_locks_v1(uuid),
  public.lock_financial_reporting_period_v1(uuid,date,text),public.unlock_financial_reporting_period_v1(uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_financial_reporting_period_locks_v1(uuid),
  public.lock_financial_reporting_period_v1(uuid,date,text),public.unlock_financial_reporting_period_v1(uuid,text) TO authenticated;
COMMIT;
