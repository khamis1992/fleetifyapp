
BEGIN;

-- 1) Tighten vehicles RLS

-- Remove overly broad public policy and re-create for anon only
DROP POLICY IF EXISTS "Public access to vehicles via quotation approval" ON public.vehicles;

CREATE POLICY "Public access to vehicles via quotation approval (anon only)"
ON public.vehicles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM quotations
    WHERE quotations.vehicle_id = vehicles.id
      AND quotations.approval_token IS NOT NULL
  )
);

-- Drop ambiguous/overlapping manage policies to avoid duplication and gaps
DROP POLICY IF EXISTS "Admins can manage vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Staff can manage vehicles in their company" ON public.vehicles;
DROP POLICY IF EXISTS "Super admins have full access to vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON public.vehicles;

-- Recreate clear, explicit policies

-- SELECT: company users see their company vehicles, super_admin sees all
CREATE POLICY "Vehicles select in company"
ON public.vehicles
FOR SELECT
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- INSERT: enforce company boundary (or super_admin)
CREATE POLICY "Vehicles insert in company"
ON public.vehicles
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = get_user_company(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- UPDATE: can update only rows from same company, and keep them in same company (or super_admin)
CREATE POLICY "Vehicles update in company"
ON public.vehicles
FOR UPDATE
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::user_role)
)
WITH CHECK (
  (company_id = get_user_company(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- DELETE: can delete only rows from same company (or super_admin)
CREATE POLICY "Vehicles delete in company"
ON public.vehicles
FOR DELETE
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- 2) Add triggers to enforce company_id correctness on vehicles

CREATE OR REPLACE FUNCTION public.enforce_vehicle_company_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super BOOLEAN := FALSE;
BEGIN
  -- Allow internal/service operations
  IF current_setting('request.jwt.claims', TRUE) IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    is_super := has_role(auth.uid(), 'super_admin'::user_role);
  EXCEPTION WHEN OTHERS THEN
    is_super := FALSE;
  END;

  IF NOT is_super THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.company_id IS DISTINCT FROM get_user_company(auth.uid()) THEN
        RAISE EXCEPTION 'company_id must equal your company';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'changing company_id is not allowed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_vehicle_company_scope ON public.vehicles;
CREATE TRIGGER trg_enforce_vehicle_company_scope
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_company_scope();

-- 3) Enforce consistency between contracts and vehicles.company_id

CREATE OR REPLACE FUNCTION public.enforce_contract_vehicle_company_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  is_super BOOLEAN := FALSE;
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow internal/service operations
  IF current_setting('request.jwt.claims', TRUE) IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    is_super := has_role(auth.uid(), 'super_admin'::user_role);
  EXCEPTION WHEN OTHERS THEN
    is_super := FALSE;
  END;

  SELECT company_id INTO v_company
  FROM vehicles
  WHERE id = NEW.vehicle_id;

  -- If vehicle not found, let FK (if exists) or app logic handle it
  IF v_company IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_super AND NEW.company_id IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'Contract company_id (%) must match vehicle''s company_id (%)', NEW.company_id, v_company;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_contract_vehicle_company_consistency ON public.contracts;
CREATE TRIGGER trg_contract_vehicle_company_consistency
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contract_vehicle_company_consistency();

-- 4) Backfill: fix vehicles whose company_id mismatches their contracts,
-- only when all referencing contracts agree on a single company

WITH vehicle_companies AS (
  SELECT
    c.vehicle_id,
    COUNT(DISTINCT c.company_id) AS companies_count,
    MIN(c.company_id) AS single_company_id
  FROM contracts c
  WHERE c.vehicle_id IS NOT NULL
  GROUP BY c.vehicle_id
),
to_fix AS (
  SELECT v.id AS vehicle_id, vc.single_company_id
  FROM vehicles v
  JOIN vehicle_companies vc ON vc.vehicle_id = v.id
  WHERE vc.companies_count = 1
    AND v.company_id IS DISTINCT FROM vc.single_company_id
)
UPDATE vehicles v
SET company_id = tf.single_company_id
FROM to_fix tf
WHERE v.id = tf.vehicle_id;

COMMIT;
