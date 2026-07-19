-- A cancelled legal case is withdrawn by the company, which is distinct from
-- a court dismissal. The cancellation RPC already writes this canonical value.
ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_outcome_type_check;

ALTER TABLE public.legal_cases
  ADD CONSTRAINT legal_cases_outcome_type_check
  CHECK (
    outcome_type IS NULL
    OR outcome_type IN (
      'won',
      'lost',
      'settled',
      'dismissed',
      'pending',
      'withdrawn'
    )
  );

