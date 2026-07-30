-- Rollback for 20260729230000_customer_document_validation_insert_only.sql
-- Restores the original behavior (validate on INSERT and UPDATE).

DROP TRIGGER IF EXISTS validate_customer_documents_trigger ON public.customers;

CREATE TRIGGER validate_customer_documents_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_documents();
