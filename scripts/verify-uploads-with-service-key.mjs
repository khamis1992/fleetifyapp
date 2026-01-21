#!/usr/bin/env node
/**
 * Verify All Vehicle Document Uploads
 *
 * This script requires VITE_SUPABASE_SERVICE_ROLE_KEY in .env file
 * to bypass RLS policies and see ALL uploaded documents.
 *
 * INSTRUCTIONS:
 * 1. Get service role key from: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api
 * 2. Add to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your-key-here
 * 3. Run: node scripts/verify-uploads-with-service-key.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: No Supabase key found in .env');
  console.error('\n📝 To fix this:');
  console.error('1. Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api');
  console.error('2. Copy the "service_role" key (NOT "anon" key)');
  console.error('3. Add to .env file:');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Verifying all vehicle document uploads...\n');

  // Check if we're using service role key
  const isServiceRole = supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') && supabaseKey.length > 200;

  if (isServiceRole) {
    console.log('✅ Using SERVICE ROLE key (bypasses RLS)\n');
  } else {
    console.log('⚠️  Using ANON key (may be blocked by RLS)\n');
  }

  try {
    // 1. Get total count of vehicle documents
    console.log('📊 Checking vehicle_documents table...');
    const { count: totalCount, error: countError } = await supabase
      .from('vehicle_documents')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error:', countError.message);
      return;
    }

    console.log(`✅ Total documents in database: ${totalCount || 0}\n`);

    if (!totalCount || totalCount === 0) {
      console.log('⚠️  No documents found. If you just uploaded files, they may still be processing.');
      console.log('   Otherwise, check if RLS policies are blocking access (use service role key).\n');
      return;
    }

    // 2. Get all documents with vehicle info
    console.log('📄 Fetching document details...\n');
    const { data: documents, error: docsError } = await supabase
      .from('vehicle_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('❌ Error:', docsError.message);
      return;
    }

    // 3. Group by vehicle
    const byVehicle = {};
    documents.forEach(doc => {
      const vid = doc.vehicle_id;
      if (!byVehicle[vid]) {
        byVehicle[vid] = [];
      }
      byVehicle[vid].push(doc);
    });

    console.log(`📊 Documents found across ${Object.keys(byVehicle).length} vehicles\n`);

    // 4. Get vehicle details for each
    const vehicleIds = Object.keys(byVehicle);
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model, year')
      .in('id', vehicleIds);

    if (vehiclesError) {
      console.error('⚠️  Could not fetch vehicle details:', vehiclesError.message);
    } else {
      const vehicleMap = {};
      vehicles.forEach(v => {
        vehicleMap[v.id] = v;
      });

      // 5. Display summary by vehicle
      console.log('🚗 Documents by Vehicle:\n');

      Object.entries(byVehicle).forEach(([vehicleId, docs]) => {
        const vehicle = vehicleMap[vehicleId];
        const plate = vehicle?.plate_number || 'Unknown';
        const makeModel = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Unknown Vehicle';

        console.log(`📍 Plate: ${plate} - ${makeModel}`);
        console.log(`   Vehicle ID: ${vehicleId}`);
        console.log(`   Documents: ${docs.length}`);

        docs.forEach((doc, i) => {
          console.log(`   ${i + 1}. ${doc.document_type || 'Unknown Type'}`);
          console.log(`      File: ${doc.file_name}`);
          console.log(`      Uploaded: ${doc.created_at}`);
          if (doc.file_url) {
            console.log(`      URL: ${doc.file_url.substring(0, 80)}...`);
          }
        });
        console.log('');
      });
    }

    // 6. Check storage bucket
    console.log('📦 Checking storage bucket...\n');
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('documents')
      .list('vehicle-documents', 1000);

    if (storageError) {
      console.error('⚠️  Could not access storage:', storageError.message);
    } else {
      console.log(`✅ Found ${storageFiles?.length || 0} items in storage bucket\n`);

      if (storageFiles && storageFiles.length > 0) {
        // Group by vehicle folder
        const byFolder = {};
        storageFiles.forEach(file => {
          if (file.name.includes('/')) {
            const folder = file.name.split('/')[0];
            if (!byFolder[folder]) {
              byFolder[folder] = [];
            }
            byFolder[folder].push(file);
          }
        });

        console.log('📁 Storage by Vehicle Folder:\n');
        Object.entries(byFolder).forEach(([folder, files]) => {
          console.log(`📂 ${folder}/: ${files.length} files`);
        });
        console.log('');
      }
    }

    // 7. Upload summary
    console.log('📋 Upload Summary:\n');
    console.log(`   Total Documents: ${totalCount}`);
    console.log(`   Vehicles with Docs: ${Object.keys(byVehicle).length}`);
    console.log(`   Upload Date: ${new Date().toISOString()}`);

    // 8. Check for today's uploads
    const today = new Date().toISOString().split('T')[0];
    const todayDocs = documents.filter(d => d.created_at.startsWith(today));
    console.log(`   Uploaded Today: ${todayDocs.length}\n`);

    if (todayDocs.length > 0) {
      console.log('✅ Recent uploads found! The upload was successful.\n');
    } else {
      console.log('⚠️  No uploads found from today. Documents may still be processing.\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

main().catch(console.error);
