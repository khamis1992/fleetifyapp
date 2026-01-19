/**
 * Import Vehicle Data for Al-Arraf Contracts
 * 
 * This script reads agreements_with_details.sql and updates
 * the contracts table with missing vehicle data (license_plate, make, model, year)
 * 
 * Usage:
 *   npx tsx scripts/import-alaraf-vehicles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const ALARAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

interface VehicleData {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
}

async function main() {
  console.log('');
  console.log('====================================================================');
  console.log('🚗 IMPORTING VEHICLE DATA FOR AL-ARRAF CONTRACTS');
  console.log('====================================================================');
  console.log('');

  // Read agreements_with_details.sql
  const filePath = path.join(__dirname, '../.qoder/agreements_with_details.sql');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Extract INSERT statements
  const insertPattern = /INSERT INTO agreements_with_details VALUES \('([^']+)', '[^']*', '[^']*', '[^']*', '[^']*', [^,]+, '[^']*', '[^']*', '([^']*)', '([^']*)', '([^']*)', (\d+),/g;
  
  const vehicleData: VehicleData[] = [];
  let match;

  while ((match = insertPattern.exec(fileContent)) !== null) {
    const [_, id, license_plate, make, model, year] = match;
    
    // Only add if we have vehicle data
    if (license_plate && license_plate.trim()) {
      vehicleData.push({
        id,
        license_plate: license_plate.trim(),
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year)
      });
    }
  }

  console.log(`📊 Found ${vehicleData.length} records with vehicle data`);
  console.log('');

  // Update contracts in batches
  const batchSize = 50;
  let totalUpdated = 0;

  for (let i = 0; i < vehicleData.length; i += batchSize) {
    const batch = vehicleData.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vehicleData.length / batchSize)}...`);

    for (const data of batch) {
      const { error } = await supabase
        .from('contracts')
        .update({
          license_plate: data.license_plate,
          make: data.make,
          model: data.model,
          year: data.year,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .eq('company_id', ALARAF_COMPANY_ID)
        .or('license_plate.is.null,license_plate.eq.');

      if (!error) {
        totalUpdated++;
      } else if (error.code !== 'PGRST116') { // PGRST116 = no rows to update (already has data)
        console.error(`   ⚠️ Error updating ${data.id}:`, error.message);
      }
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('====================================================================');
  console.log('✅ IMPORT COMPLETED!');
  console.log('====================================================================');
  console.log(`Total contracts updated: ${totalUpdated}`);
  console.log('');

  // Verification
  const { count, error } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', ALARAF_COMPANY_ID)
    .not('license_plate', 'is', null)
    .neq('license_plate', '');

  if (!error) {
    console.log(`📊 Total contracts with vehicle data: ${count}`);
  }

  console.log('');
  console.log('🎯 NEXT STEP:');
  console.log('Run: complete_alaraf_vehicle_sync.sql in Supabase to link vehicles!');
  console.log('====================================================================');
  console.log('');
}

main().catch(console.error);

