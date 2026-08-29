-- Fix search_path using ALTER FUNCTION - Batch 2
-- This batch covers creation and transaction functions

ALTER FUNCTION public.create_contract_with_transaction(uuid, uuid, uuid, date, date, text, integer, numeric, numeric, uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.create_customer_with_contract(uuid, text, text, numeric) SET search_path = '';
ALTER FUNCTION public.create_inventory_snapshot() SET search_path = '';
ALTER FUNCTION public.create_invoice_journal_entry() SET search_path = '';
ALTER FUNCTION public.create_journal_entry_with_transaction(uuid, text, date, text, jsonb, text, uuid) SET search_path = '';
ALTER FUNCTION public.create_openai_edge_function() SET search_path = '';
ALTER FUNCTION public.create_payment_journal_entry() SET search_path = '';
ALTER FUNCTION public.create_payment_with_transaction(uuid, uuid, uuid, numeric, date, text, text, text, text, uuid) SET search_path = '';
ALTER FUNCTION public.create_sample_system_logs(uuid) SET search_path = '';
ALTER FUNCTION public.deactivate_expired_demo_sessions() SET search_path = '';;
