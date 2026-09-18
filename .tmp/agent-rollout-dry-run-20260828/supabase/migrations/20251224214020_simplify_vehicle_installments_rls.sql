
-- حذف السياسات القديمة المقيدة
DROP POLICY IF EXISTS "Managers can manage vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Users can view vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Allow authenticated users to insert vehicle installments" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Allow authenticated users to update vehicle installments" ON public.vehicle_installments;

-- سياسة بسيطة وشاملة للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can manage vehicle installments"
ON public.vehicle_installments
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);
;
