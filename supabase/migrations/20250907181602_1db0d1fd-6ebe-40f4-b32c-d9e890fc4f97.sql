-- Fix RLS policies for csv-archives storage bucket to allow access to template files

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view csv-archives" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload to csv-archives" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their csv-archives" ON storage.objects;

-- Create policy to allow authenticated users to view files in csv-archives
-- This includes both template files in root and user/company specific files
CREATE POLICY "Users can view csv-archives files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'csv-archives' 
  AND auth.role() = 'authenticated'
  AND (
    -- Allow access to template files in root (no folder structure)
    (name NOT LIKE '%/%' AND name NOT LIKE '.%')
    OR 
    -- Allow access to user's own company files
    (name LIKE (auth.uid()::text || '/' || (
      SELECT company_id::text 
      FROM profiles 
      WHERE user_id = auth.uid()
    ) || '/%'))
  )
);

-- Create policy to allow users to upload files to their company folder
CREATE POLICY "Users can upload csv-archives files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'csv-archives' 
  AND auth.role() = 'authenticated'
  AND name LIKE (auth.uid()::text || '/' || (
    SELECT company_id::text 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) || '/%')
);

-- Create policy to allow users to delete their own company files
CREATE POLICY "Users can delete their csv-archives files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'csv-archives' 
  AND auth.role() = 'authenticated'
  AND name LIKE (auth.uid()::text || '/' || (
    SELECT company_id::text 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) || '/%')
);

-- Create policy to allow admins to upload template files to root
CREATE POLICY "Admins can upload template files to csv-archives root" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'csv-archives' 
  AND auth.role() = 'authenticated'
  AND name NOT LIKE '%/%'  -- Root level files only
  AND (
    SELECT role FROM profiles WHERE user_id = auth.uid()
  ) IN ('super_admin', 'company_admin')
);