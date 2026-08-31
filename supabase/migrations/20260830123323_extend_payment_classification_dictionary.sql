-- ================================================================
-- Migration: Extend payment accounting classification dictionary
-- Created: 2026-08-30
-- Description: payment_accounting_classifications.classification
--   only allowed 'customer_advance'. Approved accounting decisions
--   (2026-08-30) require flagging non-rent receipts as recovered
--   revenues (traffic fines, damage charges, insurance income) and
--   customer advances. This migration extends the CHECK constraint
--   with the approved reclassification kinds.
-- ================================================================

ALTER TABLE public.payment_accounting_classifications
  DROP CONSTRAINT IF EXISTS payment_accounting_classifications_classification_check;

ALTER TABLE public.payment_accounting_classifications
  ADD CONSTRAINT payment_accounting_classifications_classification_check
  CHECK (classification IN (
    'customer_advance',
    'recovered_traffic_fine',
    'recovered_damage_charge',
    'insurance_income',
    'non_rent_income'
  ));