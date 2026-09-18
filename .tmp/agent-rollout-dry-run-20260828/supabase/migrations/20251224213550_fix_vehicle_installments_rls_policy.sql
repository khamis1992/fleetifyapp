
-- إضافة سياسة INSERT بسيطة
CREATE POLICY "Allow authenticated users to insert vehicle installments"
ON public.vehicle_installments
FOR INSERT
TO authenticated
WITH CHECK (
  -- المستخدم مسجل دخول
  auth.uid() IS NOT NULL
  AND
  -- الشركة تتطابق مع شركة المستخدم من جدول profiles
  company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- إضافة سياسة UPDATE بسيطة
CREATE POLICY "Allow authenticated users to update vehicle installments"
ON public.vehicle_installments
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND
  company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);
;
