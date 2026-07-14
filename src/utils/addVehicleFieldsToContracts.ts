import { supabase } from '@/integrations/supabase/client';

/**
 * Verifies that the contract vehicle snapshot fields are available.
 * Schema changes are intentionally never executed from the browser client.
 */
export async function addVehicleFieldsToContracts() {
  const result = await checkVehicleFieldsInContracts();

  if (result.exists) {
    return { success: true, message: 'Vehicle fields already exist' };
  }

  return {
    success: false,
    error: result.error || 'Vehicle fields are missing. Apply the reviewed Supabase migration before retrying.',
  };
}

export async function checkVehicleFieldsInContracts() {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, license_plate, make, model, year, vehicle_status')
      .limit(10);

    if (error) {
      console.error('Error checking vehicle fields:', error);
      return { exists: false as const, error: error.message };
    }

    return { exists: true as const, data };
  } catch (error) {
    console.error('Error checking vehicle fields:', error);
    return {
      exists: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
