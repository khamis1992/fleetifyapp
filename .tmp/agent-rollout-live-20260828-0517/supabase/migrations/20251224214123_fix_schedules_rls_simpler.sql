
-- تحديث سياسة vehicle_installment_schedules
DROP POLICY IF EXISTS "Authenticated users can manage installment schedules" ON public.vehicle_installment_schedules;

CREATE POLICY "Authenticated users full access to installment schedules"
ON public.vehicle_installment_schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vehicle_installments vi
    JOIN profiles p ON p.company_id = vi.company_id
    WHERE vi.id = vehicle_installment_schedules.installment_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_installments vi
    JOIN profiles p ON p.company_id = vi.company_id
    WHERE vi.id = vehicle_installment_schedules.installment_id
    AND p.user_id = auth.uid()
  )
);
;
