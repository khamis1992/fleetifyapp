
-- حذف السياسات القديمة المقيدة
DROP POLICY IF EXISTS "Managers can manage installment schedules in their company" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Users can view installment schedules in their company" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Allow authenticated users to insert installment schedules" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Allow authenticated users to update installment schedules" ON public.vehicle_installment_schedules;

-- سياسة بسيطة وشاملة
CREATE POLICY "Authenticated users can manage installment schedules"
ON public.vehicle_installment_schedules
FOR ALL
TO authenticated
USING (
  installment_id IN (
    SELECT vi.id FROM vehicle_installments vi
    WHERE vi.company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  installment_id IN (
    SELECT vi.id FROM vehicle_installments vi
    WHERE vi.company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);
;
