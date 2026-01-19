-- Vehicle Reservation System Table
CREATE TABLE IF NOT EXISTS public.vehicle_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  hold_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'converted', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_hold_until CHECK (hold_until > created_at)
);

CREATE INDEX idx_vehicle_reservations_company ON public.vehicle_reservations(company_id);
CREATE INDEX idx_vehicle_reservations_vehicle ON public.vehicle_reservations(vehicle_id);
CREATE INDEX idx_vehicle_reservations_customer ON public.vehicle_reservations(customer_id);
CREATE INDEX idx_vehicle_reservations_status ON public.vehicle_reservations(status);
CREATE INDEX idx_vehicle_reservations_dates ON public.vehicle_reservations(start_date, end_date);

-- Driver Management Table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  license_number TEXT UNIQUE NOT NULL,
  license_expiry TIMESTAMPTZ NOT NULL,
  license_class VARCHAR(5),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'assigned', 'on_trip')),
  commission_rate NUMERIC DEFAULT 10 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  vehicle_id UUID REFERENCES public.vehicles(id),
  total_earnings NUMERIC DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_drivers_company ON public.drivers(company_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_license ON public.drivers(license_number);

-- Driver Assignments Table
CREATE TABLE IF NOT EXISTS public.driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  trip_distance NUMERIC DEFAULT 0 CHECK (trip_distance >= 0),
  commission_amount NUMERIC DEFAULT 0 CHECK (commission_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_driver_assignments_company ON public.driver_assignments(company_id);
CREATE INDEX idx_driver_assignments_driver ON public.driver_assignments(driver_id);
CREATE INDEX idx_driver_assignments_contract ON public.driver_assignments(contract_id);
CREATE INDEX idx_driver_assignments_status ON public.driver_assignments(status);
CREATE INDEX idx_driver_assignments_dates ON public.driver_assignments(start_date, end_date);

-- Enable RLS
ALTER TABLE public.vehicle_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_reservations
CREATE POLICY "Users can view own company reservations"
  ON public.vehicle_reservations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create reservations in own company"
  ON public.vehicle_reservations FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company reservations"
  ON public.vehicle_reservations FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for drivers
CREATE POLICY "Users can view own company drivers"
  ON public.drivers FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create drivers in own company"
  ON public.drivers FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company drivers"
  ON public.drivers FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for driver_assignments
CREATE POLICY "Users can view own company assignments"
  ON public.driver_assignments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create assignments in own company"
  ON public.driver_assignments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own company assignments"
  ON public.driver_assignments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE public.vehicle_reservations IS 'Vehicle reservation system for online customers';
COMMENT ON TABLE public.drivers IS 'Chauffeur-driven rental drivers with performance tracking';
COMMENT ON TABLE public.driver_assignments IS 'Driver assignments to contracts with commission tracking';
