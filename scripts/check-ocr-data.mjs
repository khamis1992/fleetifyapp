import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkOCRData() {
  console.log('🔍 Checking if OCR extracted and updated vehicle data...\n');

  // Get all uploaded documents with metadata
  const { data: docs, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Checking ${docs.length} recent documents...\n`);

  // Show schema to see what fields exist
  console.log('📋 Document Schema:\n');
  console.log(Object.keys(docs[0] || {}).join('\n'));
  console.log('\n');

  // Check for OCR-related fields
  const ocrFields = [
    'ocr_data', 'ocr extracted', 'extracted_data', 'metadata',
    'vin', 'chassis_number', 'make', 'model', 'year', 'color',
    'registration_date', 'expiry_date', 'vehicle_details'
  ];

  console.log('🔍 Looking for OCR data fields:\n');

  let foundOCRData = false;

  docs.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.document_name}`);
    console.log(`   Vehicle ID: ${doc.vehicle_id}`);

    // Check each potential OCR field
    ocrFields.forEach(field => {
      if (doc[field] !== undefined && doc[field] !== null) {
        console.log(`   ✅ Found ${field}: ${JSON.stringify(doc[field])}`);
        foundOCRData = true;
      }
    });

    // Show all non-null fields
    console.log(`   All fields:`);
    Object.entries(doc).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'id' && key !== 'vehicle_id') {
        const displayValue = String(value).length > 50
          ? String(value).substring(0, 50) + '...'
          : String(value);
        console.log(`     • ${key}: ${displayValue}`);
      }
    });

    console.log('');
  });

  if (!foundOCRData) {
    console.log('⚠️  No OCR data fields found in documents.\n');

    // Check if there's an OCR results table or similar
    console.log('🔍 Checking for OCR-related tables...\n');

    const tables = [
      'ocr_results',
      'vehicle_ocr_data',
      'document_ocr',
      'ocr_extractions',
      'extracted_vehicle_data'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error && count > 0) {
          console.log(`✅ Found table "${table}" with ${count} records`);
        }
      } catch (e) {
        // Table doesn't exist
      }
    }
  }

  // Check a sample vehicle to see if data was updated
  console.log('\n' + '=' .repeat(80));
  console.log('\n🚗 Checking if vehicle details were updated...\n');
  console.log('=' .repeat(80));

  if (docs.length > 0) {
    const sampleVehicleId = docs[0].vehicle_id;

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', sampleVehicleId)
      .single();

    if (vehicle) {
      console.log('\nSample Vehicle:\n');
      console.log(JSON.stringify(vehicle, null, 2));
      console.log('\n');

      // Check if there's an updated_at field that shows recent changes
      if (vehicle.updated_at) {
        const uploadDate = docs[0].created_at;
        const updateDate = vehicle.updated_at;

        console.log('📅 Dates:\n');
        console.log(`   Document uploaded: ${uploadDate}`);
        console.log(`   Vehicle updated: ${updateDate}`);

        const timeDiff = new Date(updateDate) - new Date(uploadDate);

        if (Math.abs(timeDiff) < 5000) { // Within 5 seconds
          console.log(`   ✅ Vehicle was updated around the same time as document upload!`);
          console.log(`   Time difference: ${timeDiff}ms`);
        } else {
          console.log(`   ❌ Vehicle was NOT updated during document upload`);
          console.log(`   Time difference: ${timeDiff}ms (${(timeDiff / 1000 / 60).toFixed(1)} minutes)`);
        }
      }
    }
  }
}

checkOCRData().catch(console.error);
