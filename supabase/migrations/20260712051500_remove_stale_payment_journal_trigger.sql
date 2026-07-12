-- Remove only stale payment triggers whose trigger function emits the observed
-- missing create_payment_journal_entry(payments) warning. Preserve definitions
-- for an exact rollback and prove the canonical triggers remain installed.

CREATE TABLE IF NOT EXISTS public.database_trigger_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version text NOT NULL,
  table_schema text NOT NULL,
  table_name text NOT NULL,
  trigger_name text NOT NULL,
  trigger_definition text NOT NULL,
  function_schema text NOT NULL,
  function_name text NOT NULL,
  function_definition text NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  UNIQUE (migration_version, table_schema, table_name, trigger_name)
);

ALTER TABLE public.database_trigger_cleanup_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.database_trigger_cleanup_log
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.database_trigger_cleanup_log
  TO service_role;

DO $$
DECLARE
  stale_trigger record;
  v_removed integer := 0;
  v_canonical integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_canonical
  FROM pg_trigger trigger
  JOIN pg_class relation ON relation.oid = trigger.tgrelid
  JOIN pg_namespace relation_namespace ON relation_namespace.oid = relation.relnamespace
  JOIN pg_proc function ON function.oid = trigger.tgfoid
  JOIN pg_namespace function_namespace ON function_namespace.oid = function.pronamespace
  WHERE relation_namespace.nspname = 'public'
    AND relation.relname = 'payments'
    AND NOT trigger.tgisinternal
    AND trigger.tgname IN ('payment_journal_before_insert', 'payment_journal_before_completion')
    AND function_namespace.nspname = 'public'
    AND function.proname = 'trg_payment_journal_entry_fn';

  IF v_canonical <> 2 THEN
    RAISE EXCEPTION 'Canonical payment journal triggers are incomplete; expected 2 and found %', v_canonical;
  END IF;

  FOR stale_trigger IN
    SELECT
      trigger.tgname AS trigger_name,
      pg_get_triggerdef(trigger.oid, true) AS trigger_definition,
      function_namespace.nspname AS function_schema,
      function.proname AS function_name,
      pg_get_functiondef(function.oid) AS function_definition
    FROM pg_trigger trigger
    JOIN pg_class relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace relation_namespace ON relation_namespace.oid = relation.relnamespace
    JOIN pg_proc function ON function.oid = trigger.tgfoid
    JOIN pg_namespace function_namespace ON function_namespace.oid = function.pronamespace
    WHERE relation_namespace.nspname = 'public'
      AND relation.relname = 'payments'
      AND NOT trigger.tgisinternal
      AND pg_get_functiondef(function.oid) LIKE '%Failed to create journal entry for payment%'
    ORDER BY trigger.tgname
  LOOP
    INSERT INTO public.database_trigger_cleanup_log (
      migration_version, table_schema, table_name, trigger_name,
      trigger_definition, function_schema, function_name, function_definition
    ) VALUES (
      '20260712051500', 'public', 'payments', stale_trigger.trigger_name,
      stale_trigger.trigger_definition, stale_trigger.function_schema,
      stale_trigger.function_name, stale_trigger.function_definition
    );

    EXECUTE format('DROP TRIGGER %I ON public.payments', stale_trigger.trigger_name);
    v_removed := v_removed + 1;
  END LOOP;

  IF v_removed = 0 THEN
    RAISE EXCEPTION 'The stale payment warning trigger was not found; cleanup refused';
  END IF;

  SELECT COUNT(*) INTO v_canonical
  FROM pg_trigger trigger
  JOIN pg_class relation ON relation.oid = trigger.tgrelid
  JOIN pg_namespace relation_namespace ON relation_namespace.oid = relation.relnamespace
  JOIN pg_proc function ON function.oid = trigger.tgfoid
  JOIN pg_namespace function_namespace ON function_namespace.oid = function.pronamespace
  WHERE relation_namespace.nspname = 'public'
    AND relation.relname = 'payments'
    AND NOT trigger.tgisinternal
    AND trigger.tgname IN ('payment_journal_before_insert', 'payment_journal_before_completion')
    AND function_namespace.nspname = 'public'
    AND function.proname = 'trg_payment_journal_entry_fn';

  IF v_canonical <> 2 THEN
    RAISE EXCEPTION 'Canonical payment journal triggers changed during stale-trigger cleanup';
  END IF;
END;
$$;
