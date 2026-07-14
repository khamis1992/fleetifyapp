BEGIN;

ALTER TABLE public.customer_notes
  ADD COLUMN IF NOT EXISTS call_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_notes_call_status_check'
      AND conrelid = 'public.customer_notes'::regclass
  ) THEN
    ALTER TABLE public.customer_notes
      ADD CONSTRAINT customer_notes_call_status_check
      CHECK (call_status IS NULL OR call_status IN ('answered', 'no_answer', 'busy'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_customer_notes_company_customer_created
  ON public.customer_notes (company_id, customer_id, created_at DESC);

COMMENT ON COLUMN public.customer_notes.call_status IS
  'Optional phone-call outcome: answered, no_answer, or busy.';

COMMIT;
