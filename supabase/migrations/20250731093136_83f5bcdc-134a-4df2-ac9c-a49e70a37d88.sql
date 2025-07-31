-- إزالة التريجر الخاطئ لجدول المركبات
-- جدول vehicles لا يحتوي على عمود account_id وبالتالي لا يحتاج للتحقق منه
DROP TRIGGER IF EXISTS validate_vehicle_account_trigger ON public.vehicles;

-- حذف الوظيفة أيضاً إذا لم تعد مستخدمة
DROP FUNCTION IF EXISTS public.validate_vehicle_account();