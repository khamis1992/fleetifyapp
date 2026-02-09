-- ================================================================
-- Vehicle Plate History
-- ================================================================
-- Supports two scenarios:
-- 1) Correction: fixing a wrong plate number entry
-- 2) Traffic authority change: official full plate number change
--
-- When plate changes officially, we keep the old plate linked to the same vehicle
-- to avoid breaking historical contracts/violations.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_plate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,

  old_plate_number TEXT NOT NULL,
  old_plate_normalized TEXT NOT NULL,
  new_plate_number TEXT NOT NULL,
  new_plate_normalized TEXT NOT NULL,

  change_type TEXT NOT NULL CHECK (change_type IN ('correction', 'traffic_authority_change')),
  changed_by UUID NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL
);

-- Foreign keys (only if referenced tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'vehicle_plate_history_company_id_fkey'
        AND table_name = 'vehicle_plate_history'
    ) THEN
      ALTER TABLE public.vehicle_plate_history
        ADD CONSTRAINT vehicle_plate_history_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'vehicle_plate_history_vehicle_id_fkey'
        AND table_name = 'vehicle_plate_history'
    ) THEN
      ALTER TABLE public.vehicle_plate_history
        ADD CONSTRAINT vehicle_plate_history_vehicle_id_fkey
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'vehicle_plate_history_changed_by_fkey'
        AND table_name = 'vehicle_plate_history'
    ) THEN
      ALTER TABLE public.vehicle_plate_history
        ADD CONSTRAINT vehicle_plate_history_changed_by_fkey
        FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_history_company_id
  ON public.vehicle_plate_history(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_history_vehicle_id
  ON public.vehicle_plate_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_history_old_plate_norm
  ON public.vehicle_plate_history(company_id, old_plate_normalized);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_history_new_plate_norm
  ON public.vehicle_plate_history(company_id, new_plate_normalized);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_history_changed_at
  ON public.vehicle_plate_history(company_id, changed_at DESC);

-- RLS
ALTER TABLE public.vehicle_plate_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'vehicle_plate_history'
        AND policyname = 'Users can view vehicle plate history from their company'
    ) THEN
      CREATE POLICY "Users can view vehicle plate history from their company"
        ON public.vehicle_plate_history FOR SELECT
        USING (
          company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        );
    END IF;

    -- INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'vehicle_plate_history'
        AND policyname = 'Users can insert vehicle plate history for their company'
    ) THEN
      CREATE POLICY "Users can insert vehicle plate history for their company"
        ON public.vehicle_plate_history FOR INSERT
        WITH CHECK (
          company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        );
    END IF;

    -- UPDATE (rare, but allowed for admins)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'vehicle_plate_history'
        AND policyname = 'Users can update vehicle plate history from their company'
    ) THEN
      CREATE POLICY "Users can update vehicle plate history from their company"
        ON public.vehicle_plate_history FOR UPDATE
        USING (
          company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        );
    END IF;

    -- DELETE (rare, but allowed for admins)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'vehicle_plate_history'
        AND policyname = 'Users can delete vehicle plate history from their company'
    ) THEN
      CREATE POLICY "Users can delete vehicle plate history from their company"
        ON public.vehicle_plate_history FOR DELETE
        USING (
          company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
        );
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.vehicle_plate_history IS
'Tracks historical vehicle plate numbers to support corrections and official traffic authority plate changes.';

