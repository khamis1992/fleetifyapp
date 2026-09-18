
-- إضافة سياسة INSERT منفصلة للجداول
CREATE POLICY "Authenticated users can insert installment schedules"
ON public.vehicle_installment_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_installments vi
    JOIN profiles p ON p.company_id = vi.company_id
    WHERE vi.id = installment_id
    AND p.user_id = auth.uid()
  )
);
;
