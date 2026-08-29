-- Tighten RLS on vehicles and enforce company scoping
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on vehicles
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vehicles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', r.policyname);
  END LOOP;
END $$;

-- Strict company-scoped policies
CREATE POLICY "Vehicles are viewable by company users"
ON public.vehicles
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Vehicles are insertable by company users"
ON public.vehicles
FOR INSERT
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Vehicles are updatable by company users"
ON public.vehicles
FOR UPDATE
USING (company_id = get_user_company(auth.uid()))
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Vehicles are deletable by company users"
ON public.vehicles
FOR DELETE
USING (company_id = get_user_company(auth.uid()));

-- Auto-set company_id on insert if missing
CREATE OR REPLACE FUNCTION public.set_vehicle_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_vehicle_company_id_trigger ON public.vehicles;
CREATE TRIGGER set_vehicle_company_id_trigger
BEFORE INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_vehicle_company_id();;
