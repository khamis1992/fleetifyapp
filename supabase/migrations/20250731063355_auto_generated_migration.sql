-- إصلاح التحذيرات الأمنية من خطة التنظيف السابقة

-- إضافة SET search_path للدوال الجديدة لحل مشكلة Function Search Path Mutable

-- 1. تحديث دالة منع الحسابات التجريبية
CREATE OR REPLACE FUNCTION public.prevent_test_accounts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- منع إنشاء حسابات تحتوي على كلمات تجريبية
    IF (
        NEW.account_name ILIKE '%test%' 
        OR NEW.account_name ILIKE '%تجريبي%'
        OR NEW.account_name ILIKE '%Test User%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%تجريبي%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%Test User%'
    ) AND NEW.is_system = false THEN
        RAISE EXCEPTION 'لا يُسمح بإنشاء حسابات تحتوي على بيانات تجريبية. يرجى استخدام أسماء حسابات حقيقية.'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. تحديث دالة منع العملاء التجريبيين
CREATE OR REPLACE FUNCTION public.prevent_test_customers()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- منع إنشاء عملاء تحتوي أسماؤهم على كلمات تجريبية
    IF (
        COALESCE(NEW.first_name, '') ILIKE '%test%' 
        OR COALESCE(NEW.last_name, '') ILIKE '%test%'
        OR COALESCE(NEW.company_name, '') ILIKE '%test%'
        OR COALESCE(NEW.first_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.last_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.company_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.first_name, '') = 'Test User'
        OR COALESCE(NEW.company_name, '') = 'Test User'
    ) THEN
        RAISE EXCEPTION 'لا يُسمح بإنشاء عملاء تحتوي أسماؤهم على بيانات تجريبية. يرجى استخدام أسماء عملاء حقيقية.'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$;