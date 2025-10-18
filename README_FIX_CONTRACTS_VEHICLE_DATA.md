# Fix for Contracts Not Showing Vehicle Data

## Issue
Contracts in the Al-Arraj company are not displaying vehicle data because:
1. The foreign key constraint between the `contracts` and `vehicles` tables is missing
2. The contracts data fetching hook wasn't retrieving vehicle information

## Solution Applied
1. Updated the `useContractsData` hook to fetch vehicle data using a two-query approach to avoid PostgREST relationship errors
2. Modified the `ContractCard` component to display vehicle information when available

## Temporary Solution (Currently Active)
The current implementation fetches contracts and vehicles in separate queries and combines them in code, which works without requiring database changes.

## Permanent Solution (Recommended)
To optimize performance and enable PostgREST's automatic joins, apply the foreign key constraint:

### Steps to Apply Foreign Key Constraint:

1. **Execute the SQL migration**:
   ```sql
   -- Add Foreign Key Constraint Between Contracts and Vehicles
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

   -- Refresh the PostgREST schema cache
   NOTIFY pgrst, 'reload schema';

   COMMENT ON CONSTRAINT contracts_vehicle_id_fkey ON public.contracts IS 
   'Foreign key relationship between contracts and vehicles tables. Required for PostgREST automatic joins.';
   ```

2. **After applying the constraint**, you can optimize the code to use a single query by updating the `useContractsData` hook to include the vehicle join:
   ```typescript
   // In useContractsData.tsx, replace the query with:
   let query = supabase
     .from('contracts')
     .select(`
       *,
       customers(
         id,
         first_name_ar,
         last_name_ar,
         first_name,
         last_name,
         company_name_ar,
         company_name,
         customer_type
       ),
       cost_center:cost_centers(
         id,
         center_code,
         center_name,
         center_name_ar
       ),
       vehicle:vehicles!vehicle_id(
         id,
         plate_number,
         make,
         model,
         year,
         status
       )
     `)
     .order('created_at', { ascending: false });
   ```

## Benefits of the Foreign Key Constraint
1. **Database Integrity**: Ensures referential integrity between contracts and vehicles
2. **Performance**: Enables single-query fetching with automatic joins
3. **PostgREST Optimization**: Allows PostgREST to optimize queries automatically
4. **Future-Proofing**: Makes it easier to add more vehicle-related features

## Current Status
✅ Contracts now display vehicle data correctly
✅ Solution works without database changes
✅ Code is ready for optimization when the foreign key is applied