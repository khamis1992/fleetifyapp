-- Create contract_vehicles table to support multiple vehicles per contract
CREATE TABLE public.contract_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  vehicle_installment_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique vehicle per installment
  UNIQUE(vehicle_installment_id, vehicle_id)
);

-- Add RLS policies for contract_vehicles
ALTER TABLE public.contract_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract vehicles in their company" 
ON public.contract_vehicles 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage contract vehicles in their company" 
ON public.contract_vehicles 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_contract_vehicles_updated_at
BEFORE UPDATE ON public.contract_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify vehicle_installments to support multi-vehicle contracts
ALTER TABLE public.vehicle_installments 
ADD COLUMN contract_type TEXT DEFAULT 'single_vehicle' CHECK (contract_type IN ('single_vehicle', 'multi_vehicle')),
ADD COLUMN total_vehicles_count INTEGER DEFAULT 1;

-- Create function to calculate vehicle installment distribution
CREATE OR REPLACE FUNCTION public.distribute_vehicle_installment_amount(
  p_installment_id UUID,
  p_total_amount NUMERIC,
  p_vehicle_amounts JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_vehicle_count INTEGER;
  v_amount_per_vehicle NUMERIC;
  v_vehicle RECORD;
  v_company_id UUID;
BEGIN
  -- Get company_id and validate installment exists
  SELECT company_id INTO v_company_id 
  FROM vehicle_installments 
  WHERE id = p_installment_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Installment not found';
  END IF;
  
  -- Get vehicle count for this installment
  SELECT COUNT(*) INTO v_vehicle_count
  FROM contract_vehicles
  WHERE vehicle_installment_id = p_installment_id;
  
  IF v_vehicle_count = 0 THEN
    RAISE EXCEPTION 'No vehicles found for this installment';
  END IF;
  
  -- If specific amounts provided, use them; otherwise distribute equally
  IF p_vehicle_amounts IS NOT NULL THEN
    -- Update with specific amounts
    FOR v_vehicle IN 
      SELECT cv.id, cv.vehicle_id, (p_vehicle_amounts->cv.vehicle_id::text)::numeric as amount
      FROM contract_vehicles cv
      WHERE cv.vehicle_installment_id = p_installment_id
    LOOP
      UPDATE contract_vehicles 
      SET allocated_amount = COALESCE(v_vehicle.amount, p_total_amount / v_vehicle_count)
      WHERE id = v_vehicle.id;
    END LOOP;
  ELSE
    -- Distribute equally
    v_amount_per_vehicle := p_total_amount / v_vehicle_count;
    
    UPDATE contract_vehicles 
    SET allocated_amount = v_amount_per_vehicle
    WHERE vehicle_installment_id = p_installment_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add vehicles to installment contract
CREATE OR REPLACE FUNCTION public.add_vehicles_to_installment(
  p_installment_id UUID,
  p_vehicle_ids UUID[],
  p_vehicle_amounts NUMERIC[] DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_id UUID;
  v_amount NUMERIC;
  i INTEGER;
BEGIN
  -- Get company_id from installment
  SELECT company_id INTO v_company_id 
  FROM vehicle_installments 
  WHERE id = p_installment_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Installment not found';
  END IF;
  
  -- Insert vehicles
  FOR i IN 1..array_length(p_vehicle_ids, 1) LOOP
    v_vehicle_id := p_vehicle_ids[i];
    v_amount := CASE 
      WHEN p_vehicle_amounts IS NOT NULL AND i <= array_length(p_vehicle_amounts, 1) 
      THEN p_vehicle_amounts[i]
      ELSE 0
    END;
    
    INSERT INTO contract_vehicles (
      company_id,
      vehicle_installment_id,
      vehicle_id,
      allocated_amount
    ) VALUES (
      v_company_id,
      p_installment_id,
      v_vehicle_id,
      v_amount
    );
  END LOOP;
  
  -- Update total vehicles count
  UPDATE vehicle_installments 
  SET 
    total_vehicles_count = array_length(p_vehicle_ids, 1),
    contract_type = CASE 
      WHEN array_length(p_vehicle_ids, 1) > 1 THEN 'multi_vehicle'
      ELSE 'single_vehicle'
    END
  WHERE id = p_installment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;