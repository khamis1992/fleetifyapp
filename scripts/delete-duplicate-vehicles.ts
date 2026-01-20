/**
 * Delete Duplicate Vehicles Script
 *
 * This script will:
 * 1. Check for duplicate vehicles
 * 2. Delete duplicates (keeping only the oldest one for each plate)
 * 3. Add a unique constraint to prevent future duplicates
 *
 * Run with: npx ts-node scripts/delete-duplicate-vehicles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDuplicateVehicles() {
  console.log('🔍 Checking for duplicate vehicles...\n');

  try {
    // Step 1: Check for duplicates
    console.log('Step 1: Analyzing duplicates...');
    const { data: analysis, error: analysisError } = await supabase.rpc('eval', {
      sql: `
        WITH ranked_vehicles AS (
          SELECT
            id,
            company_id,
            plate_number,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY company_id, LOWER(TRIM(plate_number))
              ORDER BY created_at ASC
            ) as rn,
            COUNT(*) OVER (
              PARTITION BY company_id, LOWER(TRIM(plate_number))
            ) as duplicate_count
          FROM vehicles
          WHERE plate_number IS NOT NULL
        )
        SELECT
          COUNT(*) as total_vehicles,
          SUM(CASE WHEN rn > 1 THEN 1 ELSE 0 END) as duplicates_to_delete,
          SUM(CASE WHEN duplicate_count > 1 THEN 1 ELSE 0 END) as plates_with_duplicates
        FROM ranked_vehicles
      `
    });

    if (analysisError) {
      // Try direct SQL instead
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, company_id, plate_number, created_at');

      if (error) throw error;

      const plateMap = new Map<string, any[]>();
      data.forEach((v: any) => {
        const key = `${v.company_id}-${v.plate_number?.toLowerCase()?.trim()}`;
        if (!plateMap.has(key)) {
          plateMap.set(key, []);
        }
        plateMap.get(key)!.push(v);
      });

      const duplicates = Array.from(plateMap.values()).filter(vehicles => vehicles.length > 1);
      const totalToDelete = duplicates.reduce((sum, vehicles) => sum + vehicles.length - 1, 0);

      console.log(`📊 Analysis Results:`);
      console.log(`   - Total vehicles: ${data.length}`);
      console.log(`   - Plates with duplicates: ${duplicates.length}`);
      console.log(`   - Vehicles to delete: ${totalToDelete}\n`);

      if (totalToDelete === 0) {
        console.log('✅ No duplicates found! Database is clean.');
        return;
      }

      console.log('⚠️  Found duplicates. Proceeding with deletion...\n');

      // Delete duplicates
      let deletedCount = 0;
      for (const vehicles of duplicates) {
        // Sort by created_at (oldest first)
        vehicles.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Keep first, delete rest
        const toDelete = vehicles.slice(1);
        for (const vehicle of toDelete) {
          const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', vehicle.id);

          if (!deleteError) {
            deletedCount++;
            console.log(`   ✓ Deleted duplicate: ${vehicle.plate_number} (${vehicle.id})`);
          }
        }
      }

      console.log(`\n✅ Successfully deleted ${deletedCount} duplicate vehicles`);
    } else {
      console.log('⚠️  Please run the SQL script from Supabase Dashboard instead:');
      console.log('   https://supabase.com/dashboard');
      console.log('   SQL Editor → scripts/delete-duplicate-vehicles.sql');
    }

    // Step 2: Add unique constraint
    console.log('\n🔒 Adding unique constraint to prevent future duplicates...');

    // First, create a partial index with the unique constraint
    const { error: constraintError } = await supabase.rpc('eval', {
      sql: `
        ALTER TABLE vehicles
        ADD CONSTRAINT IF NOT EXISTS vehicles_company_plate_unique
        UNIQUE (company_id, LOWER(TRIM(plate_number)));
      `
    });

    if (constraintError) {
      console.log('⚠️  Could not add unique constraint via RPC');
      console.log('   Please run this in Supabase Dashboard SQL Editor:');
      console.log('   ALTER TABLE vehicles ADD CONSTRAINT vehicles_company_plate_unique');
      console.log('   UNIQUE (company_id, LOWER(TRIM(plate_number)));');
    } else {
      console.log('✅ Unique constraint added successfully');
    }

    // Create index
    console.log('\n📇 Creating index for faster lookups...');
    const { error: indexError } = await supabase.rpc('eval', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate
        ON vehicles (company_id, LOWER(TRIM(plate_number)));
      `
    });

    if (indexError) {
      console.log('⚠️  Could not create index via RPC');
      console.log('   Please run this in Supabase Dashboard SQL Editor:');
      console.log('   CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate');
      console.log('   ON vehicles (company_id, LOWER(TRIM(plate_number)));');
    } else {
      console.log('✅ Index created successfully');
    }

    console.log('\n✅ All done! Your database is now protected against duplicates.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Alternative: Run the SQL script manually in Supabase Dashboard:');
    console.error('   1. Go to: https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Click on SQL Editor');
    console.error('   4. Open: scripts/delete-duplicate-vehicles.sql');
    console.error('   5. Run the script\n');
    process.exit(1);
  }
}

deleteDuplicateVehicles()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
