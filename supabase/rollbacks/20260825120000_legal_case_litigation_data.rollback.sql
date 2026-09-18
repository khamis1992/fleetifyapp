-- تراجع عن: 20260825120000_legal_case_litigation_data.sql
-- حذف جداول بيانات التقاضي (الملف التقاضي، الإنذارات الموثقة، مصاريف الأضرار)
-- تحذير: الحذف نهائي ويمس بيانات القضايا المرتبطة.

DROP TABLE IF EXISTS public.legal_case_damage_costs CASCADE;
DROP TABLE IF EXISTS public.legal_case_formal_notices CASCADE;
DROP TABLE IF EXISTS public.legal_case_litigation_profile CASCADE;

DROP FUNCTION IF EXISTS public.update_damage_costs_updated_at();
DROP FUNCTION IF EXISTS public.update_formal_notices_updated_at();
DROP FUNCTION IF EXISTS public.update_litigation_profile_updated_at();
