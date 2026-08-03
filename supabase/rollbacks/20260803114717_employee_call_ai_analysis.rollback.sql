DROP INDEX IF EXISTS public.idx_customer_communications_transcription_status;

ALTER TABLE public.customer_communications
  DROP CONSTRAINT IF EXISTS customer_communications_transcription_status_check,
  DROP COLUMN IF EXISTS transcription_completed_at,
  DROP COLUMN IF EXISTS transcription_error,
  DROP COLUMN IF EXISTS ai_analysis,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS transcript_text,
  DROP COLUMN IF EXISTS transcription_status;
