-- ============================================================
-- Relax validate_customer_documents trigger to INSERT only
-- ============================================================
-- Problem: the trigger fired on INSERT OR UPDATE and raised an
-- exception whenever national_id_expiry / license_expiry was in
-- the past. On UPDATE this blocked *any* field change for customers
-- whose ID had expired (phone, nationality, address...), and it also
-- blocked recording a genuinely expired expiry date extracted from
-- an ID card — which is exactly the data a tracking system needs.
--
-- Fix: enforce the rule only when registering a NEW customer
-- (INSERT), which matches the original intent of the message
-- "...قبل تسجيل العميل". Updates to existing records are allowed.
-- ============================================================

DROP TRIGGER IF EXISTS validate_customer_documents_trigger ON public.customers;

CREATE TRIGGER validate_customer_documents_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_documents();
