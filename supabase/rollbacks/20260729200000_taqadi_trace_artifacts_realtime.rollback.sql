-- Rollback for 20260729200000_taqadi_trace_artifacts_realtime.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_filing_jobs'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.taqadi_filing_jobs;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_filing_job_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.taqadi_filing_job_events;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'taqadi_automation_workers'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.taqadi_automation_workers;
    END IF;
  END IF;
END $$;

-- Remove trace/heal artifacts before restoring the narrower constraint.
DELETE FROM public.taqadi_filing_artifacts
WHERE artifact_type IN ('trace', 'heal_proposal');

ALTER TABLE public.taqadi_filing_artifacts
  DROP CONSTRAINT IF EXISTS taqadi_filing_artifacts_artifact_type_check;

ALTER TABLE public.taqadi_filing_artifacts
  ADD CONSTRAINT taqadi_filing_artifacts_artifact_type_check CHECK (
    artifact_type IN ('screenshot', 'receipt', 'submission_summary', 'error_snapshot')
  );
