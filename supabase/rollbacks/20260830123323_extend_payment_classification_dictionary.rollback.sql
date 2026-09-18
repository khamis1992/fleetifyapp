-- Rollback: extend_payment_classification_dictionary

ALTER TABLE public.payment_accounting_classifications
  DROP CONSTRAINT IF EXISTS payment_accounting_classifications_classification_check;

-- Remove rows added under extended kinds first (they violate the old constraint).
DELETE FROM public.payment_accounting_classifications
WHERE classification IN (
  'recovered_traffic_fine',
  'recovered_damage_charge',
  'insurance_income',
  'non_rent_income'
);

ALTER TABLE public.payment_accounting_classifications
  ADD CONSTRAINT payment_accounting_classifications_classification_check
  CHECK ((classification = 'customer_advance'::text));