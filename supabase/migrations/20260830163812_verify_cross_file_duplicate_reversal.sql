-- ================================================================
-- Migration: Document cross-file duplicate payment reversal operation
-- Created: 2026-08-29
-- Description: Operational record (no DDL). On 2026-08-29 the 126
--   cross-file duplicate PAY-XLS payments identified in
--   review_cross_file_duplicate_payments were reversed canonically via
--   cancel_payment_with_reversal (actor: KHAMIS AL-JABOR admin
--   user_id e729f598-0aef-4d83-b8ec-ee9290a9986e), each producing a
--   balanced REV-JE-* journal reversal. The original PBC imports were
--   retained. The review table rows are all marked status='reversed'.
--   This migration only verifies and logs that state; it mutates nothing.
-- ================================================================

DO $$
DECLARE
  v_total integer;
  v_reversed integer;
  v_reversal_journals integer;
  v_negative_invoices integer;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.review_cross_file_duplicate_payments;

  SELECT COUNT(*) INTO v_reversed
  FROM public.review_cross_file_duplicate_payments
  WHERE status = 'reversed';

  SELECT COUNT(*) INTO v_reversal_journals
  FROM public.journal_entries
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND entry_number LIKE 'REV-JE-%'
    AND created_at >= '2026-08-29';

  SELECT COUNT(*) INTO v_negative_invoices
  FROM public.invoices
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND COALESCE(balance_due, 0) < -0.01;

  IF v_reversed <> v_total OR v_total = 0 THEN
    RAISE EXCEPTION 'Cross-file reversal verification failed: % of % rows reversed', v_reversed, v_total;
  END IF;

  IF v_reversal_journals < v_total THEN
    RAISE EXCEPTION 'Cross-file reversal verification failed: % reversal journals for % reversed payments', v_reversal_journals, v_total;
  END IF;

  RAISE NOTICE 'Cross-file duplicate reversal verified: %/% rows reversed, % balanced journals, % negative-balance invoices.',
    v_reversed, v_total, v_reversal_journals, v_negative_invoices;
END $$;