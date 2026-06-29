-- Rollback for the accidental blood-work setup SQL.
-- Run this manually in the SAME Supabase project where the wrong file was applied.
--
-- Warning:
-- This removes the blood-work tables, their RLS policies, marker definitions,
-- and the blood-reports storage bucket/objects. If you have legitimate data in
-- these objects, export it first before running this rollback.

BEGIN;

-- Storage policies created by the accidental script.
DROP POLICY IF EXISTS "Users can upload their own blood reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own blood reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own blood reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own blood reports" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for blood reports" ON storage.objects;

-- Supabase blocks direct deletion from storage.objects.
-- Delete objects from the Storage UI/API first if files exist, then delete the
-- bucket from the Storage UI. The table cleanup below is still safe to run.

-- Table policies created by the accidental script.
DROP POLICY IF EXISTS "Users can view own blood work records" ON public.blood_work_records;
DROP POLICY IF EXISTS "Users can insert own blood work records" ON public.blood_work_records;
DROP POLICY IF EXISTS "Users can update own blood work records" ON public.blood_work_records;
DROP POLICY IF EXISTS "Users can delete own blood work records" ON public.blood_work_records;

DROP POLICY IF EXISTS "Users can view own blood markers" ON public.blood_markers;
DROP POLICY IF EXISTS "Users can insert own blood markers" ON public.blood_markers;
DROP POLICY IF EXISTS "Users can update own blood markers" ON public.blood_markers;
DROP POLICY IF EXISTS "Users can delete own blood markers" ON public.blood_markers;

DROP POLICY IF EXISTS "Anyone can read marker definitions" ON public.blood_marker_definitions;

-- Drop accidental tables. CASCADE removes indexes/constraints attached to them.
DROP TABLE IF EXISTS public.blood_markers CASCADE;
DROP TABLE IF EXISTS public.blood_work_records CASCADE;
DROP TABLE IF EXISTS public.blood_marker_definitions CASCADE;

COMMIT;
