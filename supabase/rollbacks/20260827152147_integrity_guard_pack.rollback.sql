BEGIN;

-- The prepaid invoice-date trigger predates this guard pack in production and
-- is deliberately retained by rollback; removing it would re-enable M+1 dates.

REVOKE ALL ON FUNCTION public.close_stale_system_audit_reviews_v1(uuid)
  FROM service_role;
DROP FUNCTION IF EXISTS public.close_stale_system_audit_reviews_v1(uuid);

DROP VIEW IF EXISTS public.contract_documents_effective_contract_v1;
DROP TRIGGER IF EXISTS trg_resolve_signed_document_canonical_link
  ON public.contract_documents;
DROP FUNCTION IF EXISTS public.resolve_signed_document_canonical_link();
DROP TABLE IF EXISTS public.contract_document_canonical_links;
REVOKE EXECUTE ON FUNCTION public.normalize_vehicle_plate(text)
  FROM authenticated, service_role;

DROP TRIGGER IF EXISTS trg_00_guard_legal_case_contract_identity
  ON public.legal_cases;
DROP FUNCTION IF EXISTS public.guard_legal_case_contract_identity();

DROP TRIGGER IF EXISTS trg_00_guard_payment_allocation_identity
  ON public.payment_allocations;
DROP FUNCTION IF EXISTS public.guard_payment_allocation_identity();

DROP TRIGGER IF EXISTS trg_00_guard_payment_invoice_identity
  ON public.payments;
DROP FUNCTION IF EXISTS public.guard_payment_invoice_identity();

DROP TRIGGER IF EXISTS trg_00_normalize_customer_national_id
  ON public.customers;
DROP FUNCTION IF EXISTS public.normalize_customer_national_id_on_write();
DROP INDEX IF EXISTS public.customers_company_normalized_national_id_unique;
DROP FUNCTION IF EXISTS public.normalize_national_id(text);

-- Canonical national ID values are intentionally not denormalized. The prior
-- punctuation/digit-script representation cannot be recovered safely.

COMMIT;
