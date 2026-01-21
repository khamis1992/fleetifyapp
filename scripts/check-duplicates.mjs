#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const vehicleId = '36479adc-4e2f-4ab1-8cbb-36033a4e5005';

async function checkDuplicates() {
  console.log(`🔍 Checking documents for vehicle: ${vehicleId}`);

  // 1. Get vehicle info
  const { data: vehicle, error: vError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (vError) {
    console.error('❌ Error fetching vehicle:', vError.message);
    return;
  }

  console.log(`🚗 Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.plate_number})`);

  // 2. Get vehicle documents
  const { data: vDocs, error: vdError } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId);

  console.log(`\n📄 Vehicle Documents (${vDocs?.length || 0}):`);
  vDocs?.forEach(doc => {
    console.log(`   • ID: ${doc.id}, Type: ${doc.document_type}, Name: ${doc.document_name}, Path: ${doc.document_url}`);
  });

  // 3. Get contracts for this vehicle to find customers
  const { data: contracts, error: cError } = await supabase
    .from('contracts')
    .select('*, customer:customers(*)')
    .eq('vehicle_id', vehicleId);

  if (contracts && contracts.length > 0) {
    console.log(`\n📋 Contracts associated with this vehicle (${contracts.length}):`);
    for (const contract of contracts) {
      console.log(`   • Contract: ${contract.contract_number}, Customer: ${contract.customer?.first_name} ${contract.customer?.last_name} (${contract.customer_id})`);
      
      // 4. Get customer documents
      const { data: custDocs, error: cdError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', contract.customer_id);

      console.log(`      📄 Customer Documents (${custDocs?.length || 0}):`);
      custDocs?.forEach(doc => {
        console.log(`         - ID: ${doc.id}, Type: ${doc.document_type}, Name: ${doc.document_name}, Path: ${doc.file_path}`);
      });

      // 5. Get contract documents
      const { data: contractDocs, error: condError } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contract.id);

      console.log(`      📄 Contract Documents (${contractDocs?.length || 0}):`);
      contractDocs?.forEach(doc => {
        console.log(`         - ID: ${doc.id}, Type: ${doc.document_type}, Name: ${doc.document_name}, Path: ${doc.file_path}`);
      });
    }
  } else {
    console.log('\n⚠️ No contracts found for this vehicle.');
  }
}

checkDuplicates();
