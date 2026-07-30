-- Diagnostics upgrade for the Taqadi filing automation:
-- 1. Allow Playwright trace archives and selector-heal proposals as artifacts.
-- 2. Publish filing job/state changes over Supabase Realtime so the ERP panel
--    reacts instantly instead of polling every three seconds.

ALTER TABLE public.taqadi_filing_artifacts
  DROP CONSTRAINT IF EXISTS taqadi_filing_artifacts_artifact_type_check;

ALTER TABLE public.taqadi_filing_artifacts
  ADD CONSTRAINT taqadi_filing_artifacts_artifact_type_check CHECK (
    artifact_type IN (
      'screenshot',
      'receipt',
      'submission_summary',
      'error_snapshot',
      'trace',
      'heal_proposal'
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_filing_jobs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.taqadi_filing_jobs;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_filing_job_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.taqadi_filing_job_events;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_automation_workers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.taqadi_automation_workers;
    END IF;
  END IF;
END $$;
