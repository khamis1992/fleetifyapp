-- Fix the foreign key constraint name issue and verify relationships
-- Check if the foreign key exists and create it with the correct name if needed

DO $$
BEGIN
    -- Drop constraint if it exists with the incorrect name
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vehicle_installments_vendor_id' 
        AND table_name = 'vehicle_installments'
    ) THEN
        ALTER TABLE public.vehicle_installments 
        DROP CONSTRAINT fk_vehicle_installments_vendor_id;
    END IF;
    
    -- Create the foreign key constraint with the expected name pattern
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'vehicle_installments_vendor_id_fkey' 
        AND table_name = 'vehicle_installments'
    ) THEN
        ALTER TABLE public.vehicle_installments 
        ADD CONSTRAINT vehicle_installments_vendor_id_fkey 
        FOREIGN KEY (vendor_id) 
        REFERENCES public.customers(id) 
        ON DELETE CASCADE;
    END IF;
    
    -- Similarly for vehicle_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vehicle_installments_vehicle_id' 
        AND table_name = 'vehicle_installments'
    ) THEN
        ALTER TABLE public.vehicle_installments 
        DROP CONSTRAINT fk_vehicle_installments_vehicle_id;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'vehicle_installments_vehicle_id_fkey' 
        AND table_name = 'vehicle_installments'
    ) THEN
        ALTER TABLE public.vehicle_installments 
        ADD CONSTRAINT vehicle_installments_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) 
        REFERENCES public.vehicles(id) 
        ON DELETE SET NULL;
    END IF;
END $$;