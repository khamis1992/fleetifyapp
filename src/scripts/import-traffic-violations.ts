import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script is intended for a one-time data migration.

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

const JSON_FILE_PATH = path.join(process.cwd(), '.claude/traffic_violations_full.json');
const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // الصحيح من الملفات الأخرى

interface Violation {
  id: number;
  violation_number: string;
  date: string;
  time: string;
  plate_number: string;
  location: string;
  violation: string;
  fine: number;
  points: number;
}

async function main() {
  console.log('Starting traffic violation import...');
  console.log(`Reading file from: ${JSON_FILE_PATH}`);

  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`Error: File not found at ${JSON_FILE_PATH}`);
    process.exit(1);
  }

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

  // First, let's check what plate numbers exist in the database
  console.log('Checking existing vehicles in database...');
  const { data: existingVehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('plate_number')
    .eq('company_id', AL_ARRAF_COMPANY_ID)
    .limit(10);
  
  if (vehiclesError) {
    console.warn(`Warning: Could not fetch existing vehicles: ${vehiclesError.message}`);
  } else if (existingVehicles && existingVehicles.length > 0) {
    console.log(`Sample plate numbers in database: ${existingVehicles.map(v => v.plate_number).join(', ')}`);
  } else {
    console.warn('Warning: No vehicles found in database for this company!');
  }
  console.log('');

  const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
  const violations: Violation[] = JSON.parse(fileContent);

  console.log(`Found ${violations.length} violations in the JSON file.`);
  
  // Show sample plate numbers from JSON file
  const samplePlates = violations.slice(0, 10).map(v => v.plate_number).filter(Boolean);
  console.log(`Sample plate numbers in JSON file: ${samplePlates.join(', ')}`);
  console.log('Starting import process...\n');

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const notFoundPlates = new Set<string>(); // Track unique plate numbers not found
  let insertedWithVehicle = 0; // Track violations inserted with vehicle link
  let insertedWithoutVehicle = 0; // Track violations inserted without vehicle link
  let insertedWithoutPlate = 0; // Track violations inserted without plate number
  
  // Batch processing for better performance
  const BATCH_SIZE = 50; // Process violations in batches
  const violationsToInsert: any[] = [];
  const violationsWithoutPlate: any[] = [];
  const violationsWithoutVehicle: any[] = [];

  for (let i = 0; i < violations.length; i++) {
    const violation = violations[i];
    
    // Show progress every 100 records
    if ((i + 1) % 100 === 0) {
      console.log(`Progress: ${i + 1}/${violations.length} processed (${successCount} success, ${skippedCount} skipped, ${errorCount} errors)`);
    }

    if (!violation.plate_number || violation.plate_number.trim() === '') {
      // Add to batch for violations without plate
      violationsWithoutPlate.push({
        company_id: AL_ARRAF_COMPANY_ID,
        penalty_number: violation.violation_number,
        violation_type: violation.violation || 'غير محدد',
        penalty_date: violation.date,
        amount: violation.fine,
        location: violation.location || 'غير محدد',
        vehicle_plate: null,
        reason: violation.violation || 'مخالفة مرورية',
        status: 'confirmed' as const,
        payment_status: 'unpaid' as const,
      });
      
      // Insert batch when it reaches BATCH_SIZE
      if (violationsWithoutPlate.length >= BATCH_SIZE) {
        const { error: insertErrorNoPlate } = await supabase
          .from('penalties')
          .insert(violationsWithoutPlate);
        
        if (insertErrorNoPlate) {
          // Handle individual errors if batch insert fails
          for (const v of violationsWithoutPlate) {
            const { error: singleError } = await supabase
              .from('penalties')
              .insert(v);
            
            if (singleError) {
              if (singleError.code === '23505') {
                skippedCount++;
              } else {
                errorCount++;
                skippedCount++;
              }
            } else {
              successCount++;
              insertedWithoutPlate++;
            }
          }
        } else {
          successCount += violationsWithoutPlate.length;
          insertedWithoutPlate += violationsWithoutPlate.length;
        }
        violationsWithoutPlate.length = 0; // Clear batch
      }
      continue;
    }

    try {
      // Normalize plate number: trim whitespace and convert to string
      const normalizedPlate = violation.plate_number.trim().toString();
      
      // 1. Find the vehicle by plate number (try exact match first, then try without leading zeros)
      let { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('plate_number', normalizedPlate)
        .eq('company_id', AL_ARRAF_COMPANY_ID)
        .single();

      // If not found, try removing leading zeros
      if (vehicleError || !vehicle) {
        const plateWithoutLeadingZeros = normalizedPlate.replace(/^0+/, '');
        if (plateWithoutLeadingZeros !== normalizedPlate) {
          const result = await supabase
            .from('vehicles')
            .select('id, plate_number')
            .eq('plate_number', plateWithoutLeadingZeros)
            .eq('company_id', AL_ARRAF_COMPANY_ID)
            .single();
          
          if (result.data && !result.error) {
            vehicle = result.data;
            vehicleError = null;
          }
        }
      }

      // If still not found, try with leading zeros added
      if (vehicleError || !vehicle) {
        const plateWithLeadingZeros = normalizedPlate.padStart(6, '0');
        if (plateWithLeadingZeros !== normalizedPlate) {
          const result = await supabase
            .from('vehicles')
            .select('id, plate_number')
            .eq('plate_number', plateWithLeadingZeros)
            .eq('company_id', AL_ARRAF_COMPANY_ID)
            .single();
          
          if (result.data && !result.error) {
            vehicle = result.data;
            vehicleError = null;
          }
        }
      }

      if (vehicleError || !vehicle) {
        // Track unique plate numbers not found
        notFoundPlates.add(normalizedPlate);
        
        // Add to batch for violations without vehicle
        violationsWithoutVehicle.push({
          company_id: AL_ARRAF_COMPANY_ID,
          penalty_number: violation.violation_number,
          violation_type: violation.violation || 'غير محدد',
          penalty_date: violation.date,
          amount: violation.fine,
          location: violation.location || 'غير محدد',
          vehicle_plate: normalizedPlate,
          reason: violation.violation || 'مخالفة مرورية',
          status: 'confirmed' as const,
          payment_status: 'unpaid' as const,
        });
        
        // Insert batch when it reaches BATCH_SIZE
        if (violationsWithoutVehicle.length >= BATCH_SIZE) {
          const { error: insertErrorWithoutVehicle } = await supabase
            .from('penalties')
            .insert(violationsWithoutVehicle);
          
          if (insertErrorWithoutVehicle) {
            // Handle individual errors if batch insert fails
            for (const v of violationsWithoutVehicle) {
              const { error: singleError } = await supabase
                .from('penalties')
                .insert(v);
              
              if (singleError) {
                if (singleError.code === '23505') {
                  skippedCount++;
                } else {
                  errorCount++;
                  skippedCount++;
                }
              } else {
                successCount++;
                insertedWithoutVehicle++;
              }
            }
          } else {
            successCount += violationsWithoutVehicle.length;
            insertedWithoutVehicle += violationsWithoutVehicle.length;
          }
          violationsWithoutVehicle.length = 0; // Clear batch
        }
        
        continue;
      }
      
      // Add to batch for violations with vehicle
      violationsToInsert.push({
        company_id: AL_ARRAF_COMPANY_ID,
        penalty_number: violation.violation_number,
        violation_type: violation.violation || 'غير محدد',
        penalty_date: violation.date,
        amount: violation.fine,
        location: violation.location || 'غير محدد',
        vehicle_plate: normalizedPlate,
        reason: violation.violation || 'مخالفة مرورية',
        status: 'confirmed' as const,
        payment_status: 'unpaid' as const,
        vehicle_id: vehicle.id
      });
      
      // Insert batch when it reaches BATCH_SIZE
      if (violationsToInsert.length >= BATCH_SIZE) {
        const { error: insertError } = await supabase
          .from('penalties')
          .insert(violationsToInsert);
        
        if (insertError) {
          // Handle individual errors if batch insert fails
          for (const v of violationsToInsert) {
            const { error: singleError } = await supabase
              .from('penalties')
              .insert(v);
            
            if (singleError) {
              if (singleError.code === '23505') {
                skippedCount++;
              } else {
                errorCount++;
              }
            } else {
              successCount++;
              insertedWithVehicle++;
            }
          }
        } else {
          successCount += violationsToInsert.length;
          insertedWithVehicle += violationsToInsert.length;
        }
        violationsToInsert.length = 0; // Clear batch
      }
    } catch (e) {
      // Only log first 10 exceptions to avoid spam
      if (errorCount < 10) {
        console.error(`An unexpected error occurred for violation ${violation.violation_number}:`, e);
      }
      errorCount++;
    }
  }
  
  // Insert remaining batches
  if (violationsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('penalties')
      .insert(violationsToInsert);
    
    if (insertError) {
      for (const v of violationsToInsert) {
        const { error: singleError } = await supabase
          .from('penalties')
          .insert(v);
        
        if (singleError) {
          if (singleError.code === '23505') {
            skippedCount++;
          } else {
            errorCount++;
          }
        } else {
          successCount++;
          insertedWithVehicle++;
        }
      }
    } else {
      successCount += violationsToInsert.length;
      insertedWithVehicle += violationsToInsert.length;
    }
  }
  
  if (violationsWithoutVehicle.length > 0) {
    const { error: insertErrorWithoutVehicle } = await supabase
      .from('penalties')
      .insert(violationsWithoutVehicle);
    
    if (insertErrorWithoutVehicle) {
      for (const v of violationsWithoutVehicle) {
        const { error: singleError } = await supabase
          .from('penalties')
          .insert(v);
        
        if (singleError) {
          if (singleError.code === '23505') {
            skippedCount++;
          } else {
            errorCount++;
            skippedCount++;
          }
        } else {
          successCount++;
          insertedWithoutVehicle++;
        }
      }
    } else {
      successCount += violationsWithoutVehicle.length;
      insertedWithoutVehicle += violationsWithoutVehicle.length;
    }
  }
  
  if (violationsWithoutPlate.length > 0) {
    const { error: insertErrorNoPlate } = await supabase
      .from('penalties')
      .insert(violationsWithoutPlate);
    
    if (insertErrorNoPlate) {
      for (const v of violationsWithoutPlate) {
        const { error: singleError } = await supabase
          .from('penalties')
          .insert(v);
        
        if (singleError) {
          if (singleError.code === '23505') {
            skippedCount++;
          } else {
            errorCount++;
            skippedCount++;
          }
        } else {
          successCount++;
          insertedWithoutPlate++;
        }
      }
    } else {
      successCount += violationsWithoutPlate.length;
      insertedWithoutPlate += violationsWithoutPlate.length;
    }
  }

  console.log('\n----------------------------------');
  console.log('Import process finished.');
  console.log(`Total processed: ${violations.length}`);
  console.log(`Successfully inserted: ${successCount} violations.`);
  console.log(`  - With vehicle link: ${insertedWithVehicle}`);
  console.log(`  - Without vehicle link (plate found but vehicle not in DB): ${insertedWithoutVehicle}`);
  console.log(`  - Without plate number: ${insertedWithoutPlate}`);
  console.log(`Skipped: ${skippedCount} violations (duplicates or errors).`);
  console.log(`Errors: ${errorCount} violations.`);
  
  if (notFoundPlates.size > 0) {
    console.log(`\nUnique plate numbers not found in database: ${notFoundPlates.size}`);
    // Show first 10 examples
    const examples = Array.from(notFoundPlates).slice(0, 10);
    console.log(`Examples: ${examples.join(', ')}`);
    if (notFoundPlates.size > 10) {
      console.log(`... and ${notFoundPlates.size - 10} more`);
    }
  }
  
  console.log('----------------------------------');
}

main();
