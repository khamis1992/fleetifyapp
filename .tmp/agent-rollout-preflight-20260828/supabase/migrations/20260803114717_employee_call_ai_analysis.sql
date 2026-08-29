ALTER TABLE public.customer_communications
  ADD COLUMN IF NOT EXISTS transcription_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS transcript_text text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS transcription_error text,
  ADD COLUMN IF NOT EXISTS transcription_completed_at timestamptz;
ALTER TABLE public.customer_communications
  DROP CONSTRAINT IF EXISTS customer_communications_transcription_status_check;
ALTER TABLE public.customer_communications
  ADD CONSTRAINT customer_communications_transcription_status_check
  CHECK (transcription_status IN ('not_requested', 'pending', 'processing', 'completed', 'failed'));
CREATE INDEX IF NOT EXISTS idx_customer_communications_transcription_status
  ON public.customer_communications(company_id, transcription_status)
  WHERE transcription_status IN ('pending', 'processing', 'failed');
COMMENT ON COLUMN public.customer_communications.transcript_text
  IS 'AI-generated transcript of the attached call recording.';
COMMENT ON COLUMN public.customer_communications.ai_analysis
  IS 'Structured AI analysis of the call transcript.';
