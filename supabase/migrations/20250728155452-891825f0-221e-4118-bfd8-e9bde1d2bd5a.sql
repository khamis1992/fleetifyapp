-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding-assets', 'branding-assets', true);

-- Create storage policies for branding assets
CREATE POLICY "Companies can view their branding assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Companies can upload their branding assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'branding-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Companies can update their branding assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'branding-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Companies can delete their branding assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'branding-assets' AND auth.uid() IS NOT NULL);