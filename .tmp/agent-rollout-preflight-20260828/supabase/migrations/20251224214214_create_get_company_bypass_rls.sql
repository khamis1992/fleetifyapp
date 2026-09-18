
-- إنشاء دالة تتجاوز RLS للحصول على company_id
CREATE OR REPLACE FUNCTION public.get_user_company_direct(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- تحديث سياسة vehicle_installments
DROP POLICY IF EXISTS "Authenticated users full access to vehicle installments" ON public.vehicle_installments;

CREATE POLICY "Users can manage their company vehicle installments"
ON public.vehicle_installments
FOR ALL
TO authenticated
USING (company_id = get_user_company_direct(auth.uid()))
WITH CHECK (company_id = get_user_company_direct(auth.uid()));

-- تحديث سياسة schedules
DROP POLICY IF EXISTS "Authenticated users full access to installment schedules" ON public.vehicle_installment_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert installment schedules" ON public.vehicle_installment_schedules;

CREATE POLICY "Users can manage their company installment schedules"
ON public.vehicle_installment_schedules
FOR ALL
TO authenticated
USING (
  installment_id IN (
    SELECT id FROM vehicle_installments 
    WHERE company_id = get_user_company_direct(auth.uid())
  )
)
WITH CHECK (
  installment_id IN (
    SELECT id FROM vehicle_installments 
    WHERE company_id = get_user_company_direct(auth.uid())
  )
);
;
