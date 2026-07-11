-- ============================================================================
-- Migration: Fix COALESCE Gap in Balance Check Trigger
-- Date: 2026-07-08
-- Issue: enforce_journal_entry_financial_controls trigger accepts NULL totals
--        as balanced because COALESCE(NULL, 0) = 0 and ABS(0 - 0) = 0 passes.
-- Fix: Reject NULL total_debit/total_credit before the COALESCE balance check.
--
-- Identified by: Sisyphus Agent (financial report verification)
-- Related report: docs/financial-system-expanded-analysis-2026-07-08.md (issue C4)
--
-- ROLLBACK:
--   To revert this migration, re-run the original function definition from
--   20260627001000_financial_controls_layer.sql (lines 157-193) which uses
--   the COALESCE-only check without the NULL guard.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_journal_entry_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow bypass for SECURITY DEFINER functions (e.g. cancel_invoice_with_reversal)
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Verify the accounting period is open for this entry date
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.entry_date);

    -- Reject NULL totals: a journal entry must have explicit debit and credit amounts.
    -- Without this check, COALESCE(NULL, 0) = 0 and ABS(0 - 0) = 0 passes the
    -- balance validation, allowing entries with no amounts specified.
    IF NEW.total_debit IS NULL OR NEW.total_credit IS NULL THEN
      RAISE EXCEPTION 'Journal entry total_debit and total_credit must not be NULL. Entry ID: %', COALESCE(NEW.id::text, 'N/A')
        USING ERRCODE = 'not_null_violation';
    END IF;

    -- Verify the entry is balanced (debit total must equal credit total within 0.01 tolerance)
    IF ABS(NEW.total_debit - NEW.total_credit) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry must be balanced before saving. Debit: %, Credit: %', NEW.total_debit, NEW.total_credit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Prevent mutation of posted journal entries (immutable fields)
  IF TG_OP = 'UPDATE'
    AND LOWER(COALESCE(OLD.status, '')) = 'posted'
    AND (
      NEW.entry_number IS DISTINCT FROM OLD.entry_number OR
      NEW.entry_date IS DISTINCT FROM OLD.entry_date OR
      NEW.company_id IS DISTINCT FROM OLD.company_id OR
      NEW.total_debit IS DISTINCT FROM OLD.total_debit OR
      NEW.total_credit IS DISTINCT FROM OLD.total_credit OR
      NEW.reference_type IS DISTINCT FROM OLD.reference_type OR
      NEW.reference_id IS DISTINCT FROM OLD.reference_id
    )
  THEN
    RAISE EXCEPTION 'Posted journal entries are immutable. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger to the updated function
DROP TRIGGER IF EXISTS enforce_journal_entry_financial_controls_trigger ON public.journal_entries;
CREATE TRIGGER enforce_journal_entry_financial_controls_trigger
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_journal_entry_financial_controls();

-- ============================================================================
-- Verification queries (run manually in Supabase SQL Editor after migration):
--
-- 1. Test NULL rejection:
--    INSERT INTO journal_entries (company_id, entry_date, total_debit, total_credit, status)
--    VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4', NOW(), NULL, NULL, 'draft');
--    -- Expected: ERROR: Journal entry total_debit and total_credit must not be NULL
--
-- 2. Test balanced entry still works:
--    INSERT INTO journal_entries (company_id, entry_date, total_debit, total_credit, status)
--    VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4', NOW(), 100.00, 100.00, 'draft');
--    -- Expected: INSERT succeeds
--
-- 3. Test unbalanced entry still rejected:
--    INSERT INTO journal_entries (company_id, entry_date, total_debit, total_credit, status)
--    VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4', NOW(), 100.00, 50.00, 'draft');
--    -- Expected: ERROR: Journal entry must be balanced before saving
-- ============================================================================