-- Create property_maintenance table
CREATE TABLE IF NOT EXISTS public.property_maintenance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    property_id UUID NOT NULL,
    maintenance_number TEXT NOT NULL,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'emergency', 'repair', 'improvement', 'renovation', 'inspection', 'cleaning', 'electrical', 'plumbing', 'hvac', 'painting', 'flooring')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    estimated_cost NUMERIC(10,3),
    actual_cost NUMERIC(10,3),
    currency TEXT DEFAULT 'KWD',
    assigned_to UUID,
    contractor_name TEXT,
    contractor_phone TEXT,
    location_details TEXT,
    required_materials TEXT[],
    notes TEXT,
    images TEXT[],
    documents TEXT[],
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.property_maintenance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage maintenance in their company" 
ON public.property_maintenance 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

-- Create indexes
CREATE INDEX idx_property_maintenance_property_id ON public.property_maintenance(property_id);
CREATE INDEX idx_property_maintenance_status ON public.property_maintenance(status);
CREATE INDEX idx_property_maintenance_company_id ON public.property_maintenance(company_id);
CREATE INDEX idx_property_maintenance_maintenance_type ON public.property_maintenance(maintenance_type);

-- Add foreign key constraints
ALTER TABLE public.property_maintenance 
ADD CONSTRAINT fk_property_maintenance_property 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;