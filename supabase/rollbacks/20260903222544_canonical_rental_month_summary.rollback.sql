-- No business records are created or removed by either direction.
DROP FUNCTION IF EXISTS public.get_canonical_rental_month_summary_v1(uuid,date);
-- Roll back dependent readers first. String-body SQL references may not be
-- dependency-tracked: absence of a DROP error does not prove no caller remains.
DROP FUNCTION IF EXISTS public.canonical_rental_invoice_settlement_v1(uuid);
DROP FUNCTION IF EXISTS public.canonical_contract_invoice_settlement_v1(uuid);
