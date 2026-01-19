-- إضافة حقل storage_path وجعل file_content اختياري
ALTER TABLE csv_file_archives 
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'csv-archives';

-- إنشاء bucket للملفات المؤرشفة إذا لم يكن موجود
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-archives', 'csv-archives', false)
ON CONFLICT (id) DO NOTHING;

-- إضافة policies للـ storage
CREATE POLICY "Users can upload to their company folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'csv-archives' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM companies 
    WHERE id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view their company files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'csv-archives'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM companies 
    WHERE id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their company files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'csv-archives'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM companies 
    WHERE id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  )
);