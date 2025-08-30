-- حذف الإصدار القديم من create_contract_safe
DROP FUNCTION IF EXISTS public.create_contract_safe(uuid, uuid, jsonb) CASCADE;

-- التحقق من إتمام التنظيف - جميع الدوال الأساسية يجب أن تكون موحدة الآن
-- ✅ create_contract_journal_entry_enhanced - إصدار واحد
-- ✅ create_customer_financial_account_enhanced - إصدار واحد  
-- ✅ create_payment_journal_entry_enhanced - إصدار واحد
-- ✅ get_mapped_account_enhanced - إصدار واحد
-- ✅ create_contract_safe - سيصبح إصدار واحد بعد هذا الحذف