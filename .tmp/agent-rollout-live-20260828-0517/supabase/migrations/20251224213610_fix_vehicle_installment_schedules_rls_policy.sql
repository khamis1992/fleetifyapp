
-- إضافة سياسة INSERT بسيطة لجداول الأقساط
CREATE POLICY "Allow authenticated users to insert installment schedules"
ON public.vehicle_installment_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  installment_id IN (
    SELECT vi.id 
    FROM vehicle_installments vi 
    JOIN profiles p ON vi.company_id = p.company_id
    WHERE p.user_id = auth.uid()
  )
);

-- إضافة سياسة UPDATE بسيطة
CREATE POLICY "Allow authenticated users to update installment schedules"
ON public.vehicle_installment_schedules
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND
  installment_id IN (
    SELECT vi.id 
    FROM vehicle_installments vi 
    JOIN profiles p ON vi.company_id = p.company_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  installment_id IN (
    SELECT vi.id 
    FROM vehicle_installments vi 
    JOIN profiles p ON vi.company_id = p.company_id
    WHERE p.user_id = auth.uid()
  )
);
;
