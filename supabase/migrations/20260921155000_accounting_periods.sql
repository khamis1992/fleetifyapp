-- Monthly accounting periods activated:
--  * creates open monthly periods from the earliest ledger date through next
--    month (nothing is closed — closing stays an explicit reviewer action and
--    the existing closed-period guards apply the moment one is closed);
--  * links every existing journal entry to its covering period;
--  * auto-assigns the period on insert (creating the current month when missing).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Create the open monthly periods.
-- ---------------------------------------------------------------------------
INSERT INTO public.accounting_periods (company_id, period_name, start_date, end_date, status, is_adjustment_period)
SELECT v.company_id, to_char(m, 'YYYY-MM'), m::date, (m + INTERVAL '1 month' - INTERVAL '1 day')::date, 'open', false
FROM generate_series(
  (SELECT date_trunc('month', min(entry_date))::timestamp FROM public.journal_entries WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'),
  date_trunc('month', ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar') + INTERVAL '1 month')::timestamp),
  INTERVAL '1 month'
) AS m
CROSS JOIN (VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid)) AS v(company_id)
WHERE (SELECT min(entry_date) FROM public.journal_entries WHERE company_id = v.company_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounting_periods p
    WHERE p.company_id = v.company_id AND p.period_name = to_char(m, 'YYYY-MM')
  );

-- ---------------------------------------------------------------------------
-- 2. Link existing entries (all statuses) to their covering period.
-- ---------------------------------------------------------------------------
UPDATE public.journal_entries e
SET accounting_period_id = p.id, updated_at = now()
FROM public.accounting_periods p
WHERE p.company_id = e.company_id
  AND e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND e.accounting_period_id IS NULL
  AND e.entry_date >= p.start_date AND e.entry_date <= p.end_date;

-- ---------------------------------------------------------------------------
-- 3. Auto-assign on insert (creating the current month when missing).
--    Closed-period prevention already lives in assert_financial_period_is_open.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_journal_accounting_period()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE v_period public.accounting_periods%ROWTYPE; v_month date;
BEGIN
  IF NEW.accounting_period_id IS NOT NULL OR NEW.entry_date IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_period FROM public.accounting_periods
  WHERE company_id = NEW.company_id
    AND NEW.entry_date >= start_date AND NEW.entry_date <= end_date
  ORDER BY start_date LIMIT 1;
  IF v_period.id IS NULL THEN
    v_month := date_trunc('month', NEW.entry_date)::date;
    INSERT INTO public.accounting_periods (company_id, period_name, start_date, end_date, status, is_adjustment_period)
    VALUES (NEW.company_id, to_char(v_month, 'YYYY-MM'), v_month,
            (v_month + INTERVAL '1 month' - INTERVAL '1 day')::date, 'open', false)
    ON CONFLICT DO NOTHING
    RETURNING * INTO v_period;
    IF v_period.id IS NULL THEN
      SELECT * INTO v_period FROM public.accounting_periods
      WHERE company_id = NEW.company_id AND NEW.entry_date >= start_date AND NEW.entry_date <= end_date
      ORDER BY start_date LIMIT 1;
    END IF;
  END IF;
  NEW.accounting_period_id := v_period.id;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.assign_journal_accounting_period() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS assign_journal_accounting_period ON public.journal_entries;
CREATE TRIGGER assign_journal_accounting_period
  BEFORE INSERT OR UPDATE OF entry_date, status ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.assign_journal_accounting_period();

INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
VALUES (
  'accounting_periods_activated',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'accounting_periods',
  'accounting_period',
  'info',
  'Monthly accounting periods created (open), existing entries linked, and auto-assignment wired (migration 20260921155000).',
  jsonb_build_object('periods', (SELECT count(*) FROM public.accounting_periods WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'),
    'unlinkedEntries', (SELECT count(*) FROM public.journal_entries WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND accounting_period_id IS NULL), 'at', now())
);

NOTIFY pgrst,'reload schema';
COMMIT;
