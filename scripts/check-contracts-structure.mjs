import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase URL or Anon Key');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey?.substring(0, 20) + '...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkContractsStructure() {
  console.log('🔍 Checking contracts table structure and data...\n');

  try {
    // Try contracts table first
    console.log('📋 Fetching from contracts table...');
    const { data: contracts, error, count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact' });

    // Also try rental_contracts table
    console.log('📋 Fetching from rental_contracts table...');
    const { data: rentalContracts, error: rentalError, count: rentalCount } = await supabase
      .from('rental_contracts')
      .select('*', { count: 'exact' });

    if (rentalContracts && rentalContracts.length > 0) {
      console.log(`\n✅ Found ${rentalCount} records in rental_contracts table`);
      const rentalContract = rentalContracts[0];
      console.log('\n📋 Rental contract fields:');
      console.log('=====================================');
      Object.keys(rentalContract).sort().forEach(field => {
        const value = rentalContract[field];
        console.log(`  • ${field}: ${value}`);
      });
    }

    if (error) {
      console.error('❌ Error fetching contracts:', error);
      return;
    }

    console.log(`\n📊 Total contracts in database: ${count || contracts?.length || 0}`);

    if (contracts && contracts.length > 0) {
      const contract = contracts[0];
      console.log('\n📋 First contract fields:');
      console.log('=====================================');

      const fields = Object.keys(contract).sort();
      fields.forEach(field => {
        const value = contract[field];
        const valueType = value === null ? 'null' : typeof value;
        console.log(`  • ${field}: ${valueType} = ${JSON.stringify(value)?.substring(0, 50)}`);
      });

      console.log('\n🚗 Vehicle-related fields:');
      console.log('=====================================');
      const vehicleFields = fields.filter(f =>
        f.includes('vehicle') ||
        f.includes('license') ||
        f.includes('plate') ||
        f === 'make' ||
        f === 'model' ||
        f === 'year'
      );

      if (vehicleFields.length > 0) {
        vehicleFields.forEach(field => {
          console.log(`  ✓ ${field}: ${contract[field]}`);
        });
      } else {
        console.log('  ⚠️  No vehicle-related fields found directly on contracts table');
      }

      // Check if vehicle_id exists and fetch related vehicle
      if (contract.vehicle_id) {
        console.log(`\n🔗 Contract has vehicle_id: ${contract.vehicle_id}`);

        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', contract.vehicle_id)
          .single();

        if (vehicle) {
          console.log('  Vehicle data from vehicles table:');
          console.log(`    • plate_number: ${vehicle.plate_number}`);
          console.log(`    • make: ${vehicle.make}`);
          console.log(`    • model: ${vehicle.model}`);
          console.log(`    • year: ${vehicle.year}`);
          console.log(`    • status: ${vehicle.status}`);
        }
      }

      // Try to fetch with vehicle relation
      console.log('\n🔄 Attempting to fetch contract with vehicle relation...');
      const { data: contractWithVehicle, error: relationError } = await supabase
        .from('contracts')
        .select('*, vehicles(*)')
        .eq('id', contract.id)
        .single();

      if (contractWithVehicle && !relationError) {
        console.log('  ✓ Successfully fetched with vehicle relation');
        if (contractWithVehicle.vehicles) {
          console.log('  Vehicle data attached:', contractWithVehicle.vehicles);
        }
      } else if (relationError) {
        console.log('  ⚠️  Could not fetch vehicle relation:', relationError.message);
      }

    } else {
      console.log('⚠️  No contracts found in the database');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkContractsStructure();