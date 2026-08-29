-- create_payment_atomic (hardened 2026-08-03) runs with search_path = ''.
-- These trigger/helper functions were written assuming `public` in the path
-- and reference their tables unqualified, so every atomic payment failed with
-- "relation \"invoices\" does not exist". Restoring their design-time path
-- keeps the hardening on the entrypoint intact while fixing the callees.
ALTER FUNCTION public.update_invoice_on_payment() SET search_path = public;
ALTER FUNCTION public.update_schedule_on_payment() SET search_path = public;
ALTER FUNCTION public.check_payment_overpayment() SET search_path = public;
ALTER FUNCTION public.update_legal_collection_on_payment() SET search_path = public;
ALTER FUNCTION public.update_contract_balance() SET search_path = public;
ALTER FUNCTION public.auto_delete_cancelled_invoice() SET search_path = public;
ALTER FUNCTION public.auto_link_invoice_to_schedule() SET search_path = public;
ALTER FUNCTION public.sync_payment_schedule_with_invoice() SET search_path = public;
ALTER FUNCTION public.sync_schedule_with_invoice() SET search_path = public;
ALTER FUNCTION public.log_audit_trail() SET search_path = public;;
