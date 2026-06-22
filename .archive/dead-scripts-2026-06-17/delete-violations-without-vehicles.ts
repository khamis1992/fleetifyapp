import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script deletes traffic violations that don't have corresponding vehicles in the system.

// Simple function to load .env file manually
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

// Load environment variables
loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
};
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable is not set.");
  console.error("Please create a .env file in the root of the project and add the key.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // شركة العراف

async function deleteViolationsWithoutVehicles() {
  console.log('Starting cleanup of violations without vehicles...');
  console.log(`Company ID: ${AL_ARRAF_COMPANY_ID}`);
  console.log('');

  // First, verify the company exists
  console.log('Verifying company ID...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, name_ar')
    .eq('id', AL_ARRAF_COMPANY_ID)
    .single();
  
  if (companyError || !company) {
    console.error(`Error: Company with ID ${AL_ARRAF_COMPANY_ID} not found in database!`);
    console.error('Please verify the company ID is correct.');
    process.exit(1);
  }
  
  console.log(`Company verified: ${company.name_ar || company.name} (ID: ${company.id})`);
  console.log('');

  // Get all violations for this company (with pagination to handle large datasets)
  console.log('Fetching all violations for the company...');
  const allViolations: any[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: pageViolations, error: violationsError } = await supabase
      .from('penalties')
      .select('id, penalty_number, vehicle_plate, vehicle_id')
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .range(offset, offset + PAGE_SIZE - 1);

    if (violationsError) {
      console.error(`Error fetching violations: ${violationsError.message}`);
      process.exit(1);
    }

    if (!pageViolations || pageViolations.length === 0) {
      hasMore = false;
    } else {
      allViolations.push(...pageViolations);
      offset += PAGE_SIZE;
      
      // If we got fewer than PAGE_SIZE, we've reached the end
      if (pageViolations.length < PAGE_SIZE) {
        hasMore = false;
      }
      
      console.log(`  Fetched ${allViolations.length} violations so far...`);
    }
  }

  if (allViolations.length === 0) {
    console.log('No violations found for this company.');
    return;
  }

  console.log(`Found ${allViolations.length} total violations.`);
  console.log('');

  // Get all vehicle plate numbers for this company
  console.log('Fetching all vehicles for the company...');
  const { data: allVehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('company_id', AL_ARRAF_COMPANY_ID);

  if (vehiclesError) {
    console.error(`Error fetching vehicles: ${vehiclesError.message}`);
    process.exit(1);
  }

  if (!allVehicles || allVehicles.length === 0) {
    console.warn('Warning: No vehicles found for this company!');
    console.log('All violations will be marked for deletion.');
  } else {
    console.log(`Found ${allVehicles.length} vehicles.`);
  }
  console.log('');

  // Create a Set of valid vehicle plate numbers (normalized)
  const validPlateNumbers = new Set<string>();
  const validVehicleIds = new Set<string>();

  if (allVehicles && allVehicles.length > 0) {
    allVehicles.forEach(vehicle => {
      if (vehicle.plate_number) {
        const normalized = vehicle.plate_number.trim().toString();
        validPlateNumbers.add(normalized);
        // Also add without leading zeros
        const withoutLeadingZeros = normalized.replace(/^0+/, '');
        if (withoutLeadingZeros !== normalized) {
          validPlateNumbers.add(withoutLeadingZeros);
        }
        // Also add with leading zeros (padded to 6 digits)
        const withLeadingZeros = normalized.padStart(6, '0');
        if (withLeadingZeros !== normalized) {
          validPlateNumbers.add(withLeadingZeros);
        }
        // Add vehicle ID
        validVehicleIds.add(vehicle.id);
      }
    });
  }

  console.log(`Created lookup set with ${validPlateNumbers.size} normalized plate number variations.`);
  console.log('');

  // Find violations to delete
  const violationsToDelete: string[] = [];
  const violationsWithPlateButNoVehicle: string[] = [];
  const violationsWithInvalidVehicleId: string[] = [];
  const violationsWithNullPlate: string[] = [];

  console.log('Analyzing violations...');
  for (const violation of allViolations) {
    let shouldDelete = false;
    let reason = '';

    // Case 1: Violation has vehicle_id but vehicle doesn't exist
    if (violation.vehicle_id) {
      if (!validVehicleIds.has(violation.vehicle_id)) {
        shouldDelete = true;
        reason = 'vehicle_id does not exist';
        violationsWithInvalidVehicleId.push(violation.id);
      }
    }

    // Case 2: Violation has vehicle_plate but no matching vehicle
    if (violation.vehicle_plate) {
      const normalizedPlate = violation.vehicle_plate.trim().toString();
      
      // Check if plate exists in valid plates
      const plateExists = validPlateNumbers.has(normalizedPlate) ||
        validPlateNumbers.has(normalizedPlate.replace(/^0+/, '')) ||
        validPlateNumbers.has(normalizedPlate.padStart(6, '0'));

      if (!plateExists && !violation.vehicle_id) {
        // Also check if vehicle_id exists (maybe it was set manually)
        if (!violation.vehicle_id) {
          shouldDelete = true;
          reason = 'vehicle_plate does not match any vehicle';
          violationsWithPlateButNoVehicle.push(violation.id);
        }
      }
    } else {
      // Case 3: Violation has no vehicle_plate and no vehicle_id
      if (!violation.vehicle_id) {
        shouldDelete = true;
        reason = 'no vehicle_plate and no vehicle_id';
        violationsWithNullPlate.push(violation.id);
      }
    }

    if (shouldDelete) {
      violationsToDelete.push(violation.id);
    }
  }

  console.log(`\n----------------------------------`);
  console.log('Analysis Results:');
  console.log(`Total violations analyzed: ${allViolations.length}`);
  console.log(`Violations to delete: ${violationsToDelete.length}`);
  console.log(`  - With plate but no vehicle: ${violationsWithPlateButNoVehicle.length}`);
  console.log(`  - With invalid vehicle_id: ${violationsWithInvalidVehicleId.length}`);
  console.log(`  - With no plate and no vehicle_id: ${violationsWithNullPlate.length}`);
  console.log(`Violations to keep: ${allViolations.length - violationsToDelete.length}`);
  console.log('----------------------------------\n');

  if (violationsToDelete.length === 0) {
    console.log('No violations need to be deleted. All violations have valid vehicles.');
    return;
  }

  // Show sample violations to be deleted
  console.log('Sample violations to be deleted:');
  const sampleViolations = allViolations
    .filter(v => violationsToDelete.includes(v.id))
    .slice(0, 10);
  
  sampleViolations.forEach(v => {
    console.log(`  - ${v.penalty_number}: plate="${v.vehicle_plate || 'N/A'}", vehicle_id="${v.vehicle_id || 'N/A'}"`);
  });
  
  if (violationsToDelete.length > 10) {
    console.log(`  ... and ${violationsToDelete.length - 10} more`);
  }
  console.log('');

  // Ask for confirmation (in a real scenario, you might want to use readline)
  console.log('⚠️  WARNING: This will permanently delete the violations listed above.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  
  // Wait 5 seconds before proceeding
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\nStarting deletion process...\n');

  // Delete in batches
  const BATCH_SIZE = 50;
  let deletedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < violationsToDelete.length; i += BATCH_SIZE) {
    const batch = violationsToDelete.slice(i, i + BATCH_SIZE);
    
    const { error: deleteError } = await supabase
      .from('penalties')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, deleteError.message);
      
      // Try deleting individually if batch fails
      for (const id of batch) {
        const { error: singleError } = await supabase
          .from('penalties')
          .delete()
          .eq('id', id);

        if (singleError) {
          if (errorCount < 10) {
            console.error(`Failed to delete violation ${id}:`, singleError.message);
          }
          errorCount++;
        } else {
          deletedCount++;
        }
      }
    } else {
      deletedCount += batch.length;
    }

    // Show progress
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= violationsToDelete.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, violationsToDelete.length)}/${violationsToDelete.length} processed (${deletedCount} deleted, ${errorCount} errors)`);
    }
  }

  console.log('\n----------------------------------');
  console.log('Deletion process finished.');
  console.log(`Total violations analyzed: ${allViolations.length}`);
  console.log(`Successfully deleted: ${deletedCount} violations.`);
  console.log(`Errors: ${errorCount} violations.`);
  console.log(`Remaining violations: ${allViolations.length - deletedCount}`);
  console.log('----------------------------------');
}

// Run the script
deleteViolationsWithoutVehicles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

