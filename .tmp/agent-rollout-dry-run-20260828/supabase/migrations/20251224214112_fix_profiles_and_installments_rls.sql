
-- إضافة سياسة بسيطة للمستخدمين للوصول إلى ملفهم الشخصي
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- تحديث سياسة vehicle_installments لتكون أبسط
DROP POLICY IF EXISTS "Authenticated users can manage vehicle installments" ON public.vehicle_installments;

CREATE POLICY "Authenticated users full access to vehicle installments"
ON public.vehicle_installments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = vehicle_installments.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = vehicle_installments.company_id
  )
);
;
