-- Create storage bucket for vehicle condition diagrams
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-condition-diagrams', 'vehicle-condition-diagrams', true);

-- Create storage policies for diagram uploads
CREATE POLICY "Users can view diagrams in their company" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'vehicle-condition-diagrams' AND 
       EXISTS (
           SELECT 1 FROM public.contract_documents cd
           JOIN public.contracts c ON cd.contract_id = c.id
           WHERE c.company_id = get_user_company(auth.uid())
           AND cd.file_path = name
       ));

CREATE POLICY "Staff can upload diagrams in their company" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'vehicle-condition-diagrams' AND 
            has_role(auth.uid(), 'company_admin'::user_role) OR 
            has_role(auth.uid(), 'manager'::user_role) OR 
            has_role(auth.uid(), 'sales_agent'::user_role));

CREATE POLICY "Staff can update diagrams in their company" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'vehicle-condition-diagrams' AND 
       has_role(auth.uid(), 'company_admin'::user_role) OR 
       has_role(auth.uid(), 'manager'::user_role) OR 
       has_role(auth.uid(), 'sales_agent'::user_role));