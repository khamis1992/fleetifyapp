-- Restore trigger definitions only when a trigger with the same name is absent.

DO $$
DECLARE
  cleanup record;
BEGIN
  FOR cleanup IN
    SELECT *
    FROM public.database_trigger_cleanup_log
    WHERE migration_version = '20260712051500'
      AND restored_at IS NULL
    ORDER BY removed_at
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger
      JOIN pg_class relation ON relation.oid = trigger.tgrelid
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = cleanup.table_schema
        AND relation.relname = cleanup.table_name
        AND trigger.tgname = cleanup.trigger_name
        AND NOT trigger.tgisinternal
    ) THEN
      EXECUTE cleanup.trigger_definition;
    END IF;

    UPDATE public.database_trigger_cleanup_log
    SET restored_at = now()
    WHERE id = cleanup.id;
  END LOOP;
END;
$$;
