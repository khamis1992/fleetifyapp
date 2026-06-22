import { supabase } from '@/integrations/supabase/client';

export async function addVehicleFieldsToContracts() {
  console.log('🚗 Adding vehicle fields to contracts table...');

  try {
    // Check if the columns already exist by trying to query them
    const { data: testData, error: testError } = await supabase
      .from('contracts')
      .select('id, license_plate, make, model, year, vehicle_status')
      .limit(1);

    if (!testError) {
      console.log('✅ Vehicle fields already exist in contracts table');
      return { success: true, message: 'Vehicle fields already exist' };
    }

    // If error contains "column does not exist", we need to add the columns
    if (testError.message.includes('column') && testError.message.includes('does not exist')) {
      console.log('📝 Vehicle fields do not exist, adding them now...');

      // SQL to add vehicle fields
      const sql = `
        -- Add vehicle fields directly to contracts table if they don't exist
        DO $$
        BEGIN
          -- Add license_plate column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'contracts'
                        AND column_name = 'license_plate') THEN
            ALTER TABLE public.contracts ADD COLUMN license_plate TEXT;
          END IF;

          -- Add make column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'contracts'
                        AND column_name = 'make') THEN
            ALTER TABLE public.contracts ADD COLUMN make TEXT;
          END IF;

          -- Add model column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'contracts'
                        AND column_name = 'model') THEN
            ALTER TABLE public.contracts ADD COLUMN model TEXT;
          END IF;

          -- Add year column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'contracts'
                        AND column_name = 'year') THEN
            ALTER TABLE public.contracts ADD COLUMN year INTEGER;
          END IF;

          -- Add vehicle_status column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'contracts'
                        AND column_name = 'vehicle_status') THEN
            ALTER TABLE public.contracts ADD COLUMN vehicle_status TEXT;
          END IF;
        END $$;

        -- Update existing contracts to populate vehicle fields from linked vehicles if available
        UPDATE public.contracts c
        SET
          license_plate = COALESCE(c.license_plate, v.plate_number),
          make = COALESCE(c.make, v.make),
          model = COALESCE(c.model, v.model),
          year = COALESCE(c.year, v.year),
          vehicle_status = COALESCE(c.vehicle_status, v.status::TEXT)
        FROM public.vehicles v
        WHERE c.vehicle_id = v.id
          AND c.vehicle_id IS NOT NULL
          AND (c.license_plate IS NULL OR c.make IS NULL OR c.model IS NULL);
      `;

      // Execute the SQL using RPC (if available) or direct SQL execution
      const { error: execError } = await supabase.rpc('exec_sql', { query: sql }).catch(async (err) => {
        // If RPC doesn't exist, we'll need to handle this differently
        console.log('⚠️ exec_sql RPC not available, checking if fields can be added manually');
        return { error: err };
      });

      if (execError) {
        console.error('❌ Error adding vehicle fields:', execError);
        return { success: false, error: execError.message };
      }

      console.log('✅ Vehicle fields added successfully');
      return { success: true, message: 'Vehicle fields added successfully' };
    }

    // Unknown error
    console.error('❌ Unexpected error:', testError);
    return { success: false, error: testError.message };

  } catch (error) {
    console.error('❌ Error in addVehicleFieldsToContracts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Function to check if vehicle fields exist and have data
export async function checkVehicleFieldsInContracts() {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, license_plate, make, model, year, vehicle_status')
      .limit(10);

    if (error) {
      console.error('❌ Error checking vehicle fields:', error);
      return { exists: false, error: error.message };
    }

    console.log('✅ Vehicle fields check result:', {
      exists: true,
      sampleData: data
    });

    return { exists: true, data };
  } catch (error) {
    console.error('❌ Error in checkVehicleFieldsInContracts:', error);
    return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}