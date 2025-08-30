-- تنظيف شامل ونهائي لجميع الدوال المتضاربة
-- ========================================================

-- حذف جميع إصدارات create_contract_journal_entry
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid) CASCADE; 
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid, uuid, uuid, uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid) CASCADE;

-- حذف جميع إصدارات create_customer_financial_account
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, jsonb) CASCADE;

-- حذف جميع إصدارات create_payment_journal_entry
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(record) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment_journal_entry(uuid) CASCADE;

-- حذف الإصدار القديم من create_contract_journal_entry_enhanced
DROP FUNCTION IF EXISTS public.create_contract_journal_entry_enhanced(uuid) CASCADE;

-- التأكد من وجود الإصدارات المحسنة الوحيدة
-- لا حاجة لإعادة إنشائها إذا كانت موجودة بالفعل - نتأكد فقط