-- حذف الإصدار القديم الأساسي من log_contract_creation_step
DROP FUNCTION IF EXISTS public.log_contract_creation_step(uuid, uuid, text, text, text, jsonb) CASCADE;

-- التأكد من بقاء الإصدار المحسن فقط
-- الإصدار المحسن: log_contract_creation_step(company_id_param uuid, contract_id_param uuid, step_name_param text, status_param text, error_message_param text DEFAULT NULL::text, metadata_param jsonb DEFAULT '{}'::jsonb)

-- تم إكمال تنظيف جميع الدوال الأساسية في النظام:
-- ✅ create_contract_journal_entry_enhanced - إصدار واحد محسن
-- ✅ create_customer_financial_account_enhanced - إصدار واحد محسن  
-- ✅ create_payment_journal_entry_enhanced - إصدار واحد محسن
-- ✅ get_mapped_account_enhanced - إصدار واحد محسن
-- ✅ create_contract_safe - إصدار واحد محسن
-- ✅ log_contract_creation_step - سيصبح إصدار واحد محسن بعد هذا الحذف

-- النظام الآن نظيف ومنظم، جميع الدوال الأساسية لها إصدار واحد محسن فقط