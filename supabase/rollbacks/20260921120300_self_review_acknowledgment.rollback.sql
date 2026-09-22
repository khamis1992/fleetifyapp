-- Rollback of 20260921120300_self_review_acknowledgment.sql
-- Drops the acknowledged (self-review) overloads and facades and restores the
-- strict approved_by <> created_by table checks; the strict three-argument
-- functions from 20260921120100 remain in effect.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.professional_balance_sheet_reports
  DROP CONSTRAINT IF EXISTS professional_balance_sheet_approval;
ALTER TABLE public.professional_balance_sheet_reports
  ADD CONSTRAINT professional_balance_sheet_approval CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_by <> created_by
      AND approved_at IS NOT NULL AND approved_by_name IS NOT NULL
      AND review_notes IS NOT NULL AND length(btrim(review_notes)) >= 20
      AND confirmations IS NOT NULL
      AND confirmations @> '{"assets":true,"liabilities":true,"equity":true,"reconciliation":true,"completeness":true}'::jsonb));

ALTER TABLE public.professional_financial_statement_packages
  DROP CONSTRAINT IF EXISTS professional_financial_statement_packages_approval;
ALTER TABLE public.professional_financial_statement_packages
  ADD CONSTRAINT professional_financial_statement_packages_strict_approval CHECK (
    status <> 'approved' OR (approved_by IS NOT NULL AND approved_by <> created_by
      AND approved_at IS NOT NULL AND approved_by_name IS NOT NULL
      AND review_notes IS NOT NULL AND length(btrim(review_notes)) >= 20
      AND confirmations IS NOT NULL
      AND confirmations @> '{"classifications":true,"policies":true,"reconciliations":true,"disclosures":true,"periodCutoff":true}'::jsonb));

DROP FUNCTION IF EXISTS public.post_manual_journal_entry_v1(uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS balance_sheet_private.approve_report(uuid, text, jsonb, boolean);
DROP FUNCTION IF EXISTS financial_statement_private.approve_report(uuid, text, jsonb, boolean);
DROP FUNCTION IF EXISTS public.approve_professional_balance_sheet_v1(uuid, text, jsonb, boolean);
DROP FUNCTION IF EXISTS public.approve_financial_statement_package_v1(uuid, text, jsonb, boolean);

NOTIFY pgrst,'reload schema';
COMMIT;
