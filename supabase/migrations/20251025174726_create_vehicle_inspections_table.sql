-- Migration: Create Vehicle Inspections Table
-- Task 4.2: Vehicle Check-In/Check-Out Workflow
-- Created: 2025-10-25

-- ===============================
-- Vehicle Inspections Table
-- ===============================
-- Purpose: Track vehicle condition at rental start (check-in) and end (check-out)
-- with photo documentation, damage tracking, and customer signatures

CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  -- Inspection metadata
  inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('check_in', 'check_out')),
  inspected_by UUID REFERENCES public.profiles(id),
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Vehicle condition fields
  fuel_level INT CHECK (fuel_level >= 0 AND fuel_level <= 100),
  odometer_reading INT CHECK (odometer_reading >= 0),
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),

  -- Damage documentation (JSONB for flexibility)
  -- exterior_condition: Array of { location: string, severity: string, description: string, photo_url?: string }
  -- interior_condition: Array of { location: string, severity: string, description: string, photo_url?: string }
  exterior_condition JSONB DEFAULT '[]'::jsonb,
  interior_condition JSONB DEFAULT '[]'::jsonb,

  -- Photo documentation
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Additional notes and signature
  notes TEXT,
  customer_signature TEXT, -- Base64 encoded signature image

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign key constraints
  CONSTRAINT fk_inspection_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_inspection_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_inspection_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_inspection_inspector FOREIGN KEY (inspected_by) REFERENCES public.profiles(id)
);

-- ===============================
-- Indexes for Performance
-- ===============================

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_company
  ON public.vehicle_inspections(company_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_contract
  ON public.vehicle_inspections(contract_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle
  ON public.vehicle_inspections(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_type
  ON public.vehicle_inspections(inspection_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_date
  ON public.vehicle_inspections(inspection_date);

-- Composite index for common query pattern: get inspections by contract and type
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_contract_type
  ON public.vehicle_inspections(contract_id, inspection_type);

-- ===============================
-- Row Level Security (RLS)
-- ===============================

ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view inspections for their company
CREATE POLICY "Users can view company vehicle inspections"
  ON public.vehicle_inspections
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can create inspections for their company
CREATE POLICY "Users can create vehicle inspections"
  ON public.vehicle_inspections
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update inspections for their company (within 24 hours)
CREATE POLICY "Users can update recent vehicle inspections"
  ON public.vehicle_inspections
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
    AND created_at > now() - INTERVAL '24 hours'
  );

-- ===============================
-- Helper Functions
-- ===============================

-- Function to get the previous inspection for comparison (check-out vs check-in)
CREATE OR REPLACE FUNCTION get_previous_inspection(
  p_contract_id UUID,
  p_current_type VARCHAR(20)
) RETURNS UUID AS $$
DECLARE
  v_previous_inspection_id UUID;
BEGIN
  -- If current is check_out, find the check_in
  IF p_current_type = 'check_out' THEN
    SELECT id INTO v_previous_inspection_id
    FROM public.vehicle_inspections
    WHERE contract_id = p_contract_id
      AND inspection_type = 'check_in'
    ORDER BY inspection_date DESC
    LIMIT 1;
  END IF;

  RETURN v_previous_inspection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate damage charges based on inspection differences
CREATE OR REPLACE FUNCTION calculate_damage_charges(
  p_check_in_id UUID,
  p_check_out_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_check_in_damages JSONB;
  v_check_out_damages JSONB;
  v_new_damages JSONB := '[]'::jsonb;
  v_total_charge NUMERIC := 0;
BEGIN
  -- Get damages from both inspections
  SELECT
    exterior_condition || interior_condition
  INTO v_check_in_damages
  FROM public.vehicle_inspections
  WHERE id = p_check_in_id;

  SELECT
    exterior_condition || interior_condition
  INTO v_check_out_damages
  FROM public.vehicle_inspections
  WHERE id = p_check_out_id;

  -- In a real implementation, you would compare the damage arrays
  -- and identify new damages that weren't present at check-in
  -- For now, return a structure for the frontend to process

  RETURN jsonb_build_object(
    'check_in_damages', v_check_in_damages,
    'check_out_damages', v_check_out_damages,
    'new_damages', v_new_damages,
    'total_charge', v_total_charge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- Comments for Documentation
-- ===============================

COMMENT ON TABLE public.vehicle_inspections IS
  'Vehicle inspection records for check-in and check-out workflows with photo documentation';

COMMENT ON COLUMN public.vehicle_inspections.inspection_type IS
  'Type of inspection: check_in (rental start) or check_out (rental end)';

COMMENT ON COLUMN public.vehicle_inspections.exterior_condition IS
  'JSON array of exterior damage objects with location, severity, description, and optional photo_url';

COMMENT ON COLUMN public.vehicle_inspections.interior_condition IS
  'JSON array of interior damage objects with location, severity, description, and optional photo_url';

COMMENT ON COLUMN public.vehicle_inspections.photo_urls IS
  'Array of URLs to inspection photos stored in Supabase Storage';

COMMENT ON COLUMN public.vehicle_inspections.customer_signature IS
  'Base64 encoded image of customer signature confirming inspection accuracy';
