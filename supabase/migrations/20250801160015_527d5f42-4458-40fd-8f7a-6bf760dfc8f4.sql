-- Create storage bucket for landing page media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('landing-media', 'landing-media', true);

-- Create policies for landing media access
CREATE POLICY "Landing media are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'landing-media');

CREATE POLICY "Super admins can upload landing media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'landing-media' AND has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Super admins can update landing media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'landing-media' AND has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Super admins can delete landing media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'landing-media' AND has_role(auth.uid(), 'super_admin'::user_role));