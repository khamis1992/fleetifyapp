#!/usr/bin/env node

/**
 * Bulk Upload Vehicle Documents Script
 *
 * This script:
 * 1. Reads all vehicle form images from D:\استمارات المركبات
 * 2. Uses OCR to extract plate numbers
 * 3. Uploads to Supabase storage
 * 4. Links documents to vehicles in the database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = 'D:\\استمارات المركبات';
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const BATCH_SIZE = 2; // Process 2 files at a time for quality

// Supabase configuration (read from .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please ensure .env file contains:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Arabic plate number OCR patterns
const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ARABIC_TO_ENGLISH = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

/**
 * Convert Arabic numerals to English
 */
function convertArabicNumerals(text) {
  return text.split('').map(char => ARABIC_TO_ENGLISH[char] || char).join('');
}

/**
 * Extract plate number from filename
 * Filenames are like: "7035.jpeg", "8204.jpeg", "WhatsApp Image 2026-01-20 at 2.16.38 PM.jpeg"
 */
function extractPlateFromFilename(filename) {
  // Try to match a pattern of 4-7 digits at the start of the filename
  const match = filename.match(/^(\d{4,7})/);
  if (match) return match[1];

  // Try to find digits anywhere in the filename (for WhatsApp images with plate in name)
  const digitMatch = filename.match(/(\d{4,7})/);
  if (digitMatch) return digitMatch[1];

  return null;
}

/**
 * Extract plate number from OCR text using multiple patterns
 */
function extractPlateNumber(ocrText, filename = null) {
  // First, try to extract from filename
  if (filename) {
    const plateFromFilename = extractPlateFromFilename(filename);
    if (plateFromFilename) {
      console.log(`  🔖 Plate from filename: ${plateFromFilename}`);
      return plateFromFilename;
    }
  }

  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Pattern 1: 4-7 digit numbers (Qatar plate format)
  const digitPattern = /\b\d{4,7}\b/;

  // Pattern 2: Qatar-specific patterns
  const qatarPattern = /\b(?:دولة قطر|قطر)\s*:?\s*(\d+)/i;

  for (const line of lines) {
    // Convert Arabic numerals first
    const convertedLine = convertArabicNumerals(line);

    // Try Qatar pattern
    const qatarMatch = convertedLine.match(qatarPattern);
    if (qatarMatch) return qatarMatch[1];

    // Try digit pattern
    const digitMatch = convertedLine.match(digitPattern);
    if (digitMatch) return digitMatch[0];
  }

  return null;
}

/**
 * Perform OCR on an image file
 */
async function performOCR(imagePath) {
  console.log(`  🔍 Performing OCR on ${path.basename(imagePath)}...`);

  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'ara+eng', // Arabic and English
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            process.stdout.write(`\r    Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      }
    );

    process.stdout.write('\r                    \r'); // Clear progress line
    return text;
  } catch (error) {
    console.error(`    ❌ OCR Error: ${error.message}`);
    return null;
  }
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToStorage(filePath, plateNumber) {
  const fileName = `${plateNumber}_${Date.now()}_${path.basename(filePath)}`;
  const storagePath = `${COMPANY_ID}/${fileName}`;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
      .from('vehicle-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-documents')
      .getPublicUrl(storagePath);

    return {
      path: storagePath,
      publicUrl,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error(`    ❌ Storage Upload Error: ${error.message}`);
    return null;
  }
}

/**
 * Find vehicle by plate number
 */
async function findVehicleByPlate(plateNumber) {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('license_plate', plateNumber)
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`    ❌ Vehicle Lookup Error: ${error.message}`);
    return null;
  }
}

/**
 * Create vehicle document record
 */
async function createVehicleDocument(vehicleId, documentData) {
  try {
    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        company_id: COMPANY_ID,
        document_type: 'registration_form',
        file_name: documentData.fileName,
        file_path: documentData.path,
        file_url: documentData.publicUrl,
        file_size: documentData.size,
        mime_type: 'image/jpeg',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`    ❌ Database Insert Error: ${error.message}`);
    return null;
  }
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);

  // Step 1: Try to extract plate from filename first
  let plateNumber = extractPlateFromFilename(filename);

  // Step 2: If not found in filename, try OCR
  if (!plateNumber) {
    console.log(`  🔍 No plate in filename, trying OCR...`);
    const ocrText = await performOCR(filePath);
    if (!ocrText) {
      console.log(`  ⚠️  Skipped: OCR failed`);
      return { success: false, reason: 'OCR failed' };
    }
    plateNumber = extractPlateNumber(ocrText, null);
  } else {
    console.log(`  🔖 Extracted plate from filename: ${plateNumber}`);
    // Skip OCR since we have the plate from filename
  }

  if (!plateNumber) {
    console.log(`  ⚠️  Skipped: No plate number found`);
    return { success: false, reason: 'No plate number found' };
  }

  console.log(`  ✅ Plate Number: ${plateNumber}`);

  // Step 3: Find vehicle
  const vehicle = await findVehicleByPlate(plateNumber);
  if (!vehicle) {
    console.log(`  ⚠️  Skipped: Vehicle not found for plate ${plateNumber}`);
    return { success: false, reason: 'Vehicle not found', plateNumber };
  }

  console.log(`  ✅ Vehicle Found: ${vehicle.make} ${vehicle.model} (${vehicle.year})`);

  // Step 4: Upload to storage
  const storageData = await uploadToStorage(filePath, plateNumber);
  if (!storageData) {
    console.log(`  ⚠️  Skipped: Storage upload failed`);
    return { success: false, reason: 'Storage upload failed', plateNumber };
  }

  console.log(`  ✅ Uploaded to Storage: ${storageData.path}`);

  // Step 5: Create database record
  const docRecord = await createVehicleDocument(vehicle.id, {
    fileName: path.basename(filePath),
    ...storageData
  });

  if (!docRecord) {
    console.log(`  ⚠️  Skipped: Database insert failed`);
    return { success: false, reason: 'Database insert failed', plateNumber };
  }

  console.log(`  ✅ Document Record Created: ID ${docRecord.id}`);
  return {
    success: true,
    plateNumber,
    vehicle: vehicle,
    documentId: docRecord.id
  };
}

/**
 * Process files in batches
 */
async function processBatch(files) {
  const results = [];

  for (const file of files) {
    const result = await processFile(file);
    results.push(result);

    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Bulk Vehicle Document Upload\n');
  console.log(`📁 Source Directory: ${SOURCE_DIR}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}\n`);

  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Get all JPEG files
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.jpg'))
    .map(file => path.join(SOURCE_DIR, file))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No JPEG files found in source directory');
    process.exit(0);
  }

  console.log(`📊 Found ${files.length} files to process\n`);
  console.log('⚙️  Configuration:');
  console.log(`   - Batch Size: ${BATCH_SIZE} files at a time`);
  console.log(`   - OCR Engine: Tesseract.js (Arabic + English)`);
  console.log(`   - Storage: vehicle-documents bucket\n`);

  // Process in batches
  const results = {
    total: files.length,
    success: 0,
    failed: 0,
    failures: [],
    startTime: Date.now()
  };

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Batch ${batchNum}/${totalBatches} (Files ${i + 1}-${Math.min(i + BATCH_SIZE, files.length)})`);
    console.log(`${'='.repeat(60)}`);

    const batchResults = await processBatch(batch);

    // Update stats
    batchResults.forEach(result => {
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.failures.push({
          file: batch[batchResults.indexOf(result)],
          reason: result.reason,
          plateNumber: result.plateNumber
        });
      }
    });
  }

  // Summary
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 UPLOAD SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successfully Uploaded: ${results.success} files`);
  console.log(`❌ Failed: ${results.failed} files`);
  console.log(`⏱️  Total Time: ${duration} seconds`);
  console.log(`${'='.repeat(60)}\n`);

  if (results.failures.length > 0) {
    console.log('❌ Failed Files:\n');
    results.failures.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${path.basename(failure.file)}`);
      console.log(`     Reason: ${failure.reason}`);
      if (failure.plateNumber) {
        console.log(`     Plate: ${failure.plateNumber}`);
      }
      console.log('');
    });
  }

  console.log('✅ Process complete!');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});
