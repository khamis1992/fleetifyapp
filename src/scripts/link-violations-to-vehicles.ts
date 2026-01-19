import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script links traffic violations to vehicles based on vehicle_plate.

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

async function linkViolationsToVehicles() {
  console.log('Starting linking violations to vehicles...');
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

  // Get all violations for this company (with pagination)
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

  // Get all vehicles for this company
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
    console.log('Cannot link violations without vehicles.');
    return;
  }

  console.log(`Found ${allVehicles.length} vehicles.`);
  console.log('');

  // Create a map of plate numbers to vehicle IDs (with normalized variations)
  const plateToVehicleId = new Map<string, string>();

  allVehicles.forEach(vehicle => {
    if (vehicle.plate_number) {
      const normalized = vehicle.plate_number.trim().toString();
      
      // Add exact match
      plateToVehicleId.set(normalized, vehicle.id);
      
      // Add without leading zeros
      const withoutLeadingZeros = normalized.replace(/^0+/, '');
      if (withoutLeadingZeros !== normalized) {
        plateToVehicleId.set(withoutLeadingZeros, vehicle.id);
      }
      
      // Add with leading zeros (padded to 6 digits)
      const withLeadingZeros = normalized.padStart(6, '0');
      if (withLeadingZeros !== normalized) {
        plateToVehicleId.set(withLeadingZeros, vehicle.id);
      }
    }
  });

  console.log(`Created lookup map with ${plateToVehicleId.size} plate number variations.`);
  console.log('');

  // Find violations that need linking
  console.log('Analyzing violations...');
  const violationsToLink: Array<{ id: string; penalty_number: string; vehicle_plate: string; vehicle_id: string }> = [];
  const violationsAlreadyLinked = new Set<string>();
  const violationsWithoutPlate = new Set<string>();
  const violationsPlateNotFound = new Set<string>();

  for (const violation of allViolations) {
    // Skip if already linked
    if (violation.vehicle_id) {
      violationsAlreadyLinked.add(violation.id);
      continue;
    }

    // Skip if no plate number
    if (!violation.vehicle_plate || violation.vehicle_plate.trim() === '') {
      violationsWithoutPlate.add(violation.id);
      continue;
    }

    // Normalize plate number
    const normalizedPlate = violation.vehicle_plate.trim().toString();
    
    // Try to find vehicle by plate number
    const vehicleId = plateToVehicleId.get(normalizedPlate) ||
                     plateToVehicleId.get(normalizedPlate.replace(/^0+/, '')) ||
                     plateToVehicleId.get(normalizedPlate.padStart(6, '0'));

    if (vehicleId) {
      violationsToLink.push({
        id: violation.id,
        penalty_number: violation.penalty_number,
        vehicle_plate: normalizedPlate,
        vehicle_id: vehicleId
      });
    } else {
      violationsPlateNotFound.add(violation.id);
    }
  }

  console.log(`\n----------------------------------`);
  console.log('Link Analysis Results:');
  console.log(`Total violations: ${allViolations.length}`);
  console.log(`Already linked: ${violationsAlreadyLinked.size}`);
  console.log(`Without plate number: ${violationsWithoutPlate.size}`);
  console.log(`Plate number not found: ${violationsPlateNotFound.size}`);
  console.log(`To be linked: ${violationsToLink.length}`);
  console.log('----------------------------------\n');

  if (violationsToLink.length === 0) {
    console.log('No violations need to be linked.');
    return;
  }

  // Show sample violations to be linked
  console.log('Sample violations to be linked:');
  const sampleViolations = violationsToLink.slice(0, 10);
  
  sampleViolations.forEach(v => {
    const vehicle = allVehicles.find(veh => veh.id === v.vehicle_id);
    console.log(`  - ${v.penalty_number}: plate="${v.vehicle_plate}" -> vehicle_id="${v.vehicle_id}" (${vehicle?.plate_number || 'N/A'})`);
  });
  
  if (violationsToLink.length > 10) {
    console.log(`  ... and ${violationsToLink.length - 10} more`);
  }
  console.log('');

  // Link violations in batches
  const BATCH_SIZE = 50;
  let linkedCount = 0;
  let errorCount = 0;

  console.log('Starting linking process...\n');

  for (let i = 0; i < violationsToLink.length; i += BATCH_SIZE) {
    const batch = violationsToLink.slice(i, i + BATCH_SIZE);
    
    // Update each violation individually (Supabase doesn't support batch updates with different values easily)
    for (const violation of batch) {
      const { error: updateError } = await supabase
        .from('penalties')
        .update({ vehicle_id: violation.vehicle_id })
        .eq('id', violation.id);

      if (updateError) {
        if (errorCount < 10) {
          console.error(`Failed to link violation ${violation.penalty_number}:`, updateError.message);
        }
        errorCount++;
      } else {
        linkedCount++;
      }
    }

    // Show progress
    const progress = Math.min(i + BATCH_SIZE, violationsToLink.length);
    if (progress % 100 === 0 || progress === violationsToLink.length) {
      console.log(`Progress: ${progress}/${violationsToLink.length} processed (${linkedCount} linked, ${errorCount} errors)`);
    }
  }

  console.log('\n----------------------------------');
  console.log('Linking process finished.');
  console.log(`Total violations analyzed: ${allViolations.length}`);
  console.log(`Successfully linked: ${linkedCount} violations.`);
  console.log(`Errors: ${errorCount} violations.`);
  console.log(`Already linked: ${violationsAlreadyLinked.size} violations.`);
  console.log(`Without plate number: ${violationsWithoutPlate.size} violations.`);
  console.log(`Plate number not found: ${violationsPlateNotFound.size} violations.`);
  console.log('----------------------------------');
}

// Run the script
linkViolationsToVehicles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

