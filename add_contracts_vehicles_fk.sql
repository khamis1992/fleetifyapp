-- Add Foreign Key Constraint Between Contracts and Vehicles
-- This fixes the PGRST200 error: "Could not find a relationship between 'contracts' and 'vehicles'"

-- Step 1: Check if the foreign key already exists
DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'contracts_vehicle_id_fkey'
        AND table_name = 'contracts'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.contracts
        ADD CONSTRAINT contracts_vehicle_id_fkey
        FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles(id)
        ON DELETE SET NULL  -- If vehicle is deleted, set contract's vehicle_id to NULL
        ON UPDATE CASCADE;  -- If vehicle id changes, update contract's vehicle_id
        
        RAISE NOTICE 'Foreign key constraint contracts_vehicle_id_fkey added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint contracts_vehicle_id_fkey already exists';
    END IF;
END $$;

-- Step 2: Verify the constraint was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'contracts'
    AND kcu.column_name = 'vehicle_id';

-- Step 3: Refresh the PostgREST schema cache
-- This is important! PostgREST needs to reload its schema cache to recognize the new relationship
NOTIFY pgrst, 'reload schema';

COMMENT ON CONSTRAINT contracts_vehicle_id_fkey ON public.contracts IS 
'Foreign key relationship between contracts and vehicles tables. Required for PostgREST automatic joins.';
