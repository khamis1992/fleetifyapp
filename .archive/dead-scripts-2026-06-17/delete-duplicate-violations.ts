import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script deletes duplicate traffic violations based on penalty_number.

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

async function deleteDuplicateViolations() {
  console.log('Starting cleanup of duplicate violations...');
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
      .select('id, penalty_number, created_at, penalty_date, amount, vehicle_plate')
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .order('created_at', { ascending: false })
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

  // Find duplicates based on penalty_number
  console.log('Analyzing duplicates...');
  const penaltyNumberMap = new Map<string, typeof allViolations>();

  // Group violations by penalty_number
  for (const violation of allViolations) {
    if (!violation.penalty_number) {
      continue; // Skip violations without penalty_number
    }

    const normalizedPenaltyNumber = violation.penalty_number.trim();
    
    if (!penaltyNumberMap.has(normalizedPenaltyNumber)) {
      penaltyNumberMap.set(normalizedPenaltyNumber, []);
    }
    
    penaltyNumberMap.get(normalizedPenaltyNumber)!.push(violation);
  }

  // Find groups with duplicates (more than 1 violation)
  const duplicateGroups: Array<{ penalty_number: string; violations: typeof allViolations }> = [];
  
  for (const [penaltyNumber, violations] of penaltyNumberMap.entries()) {
    if (violations.length > 1) {
      duplicateGroups.push({
        penalty_number: penaltyNumber,
        violations: violations
      });
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups (penalty_numbers with multiple entries).`);
  console.log('');

  if (duplicateGroups.length === 0) {
    console.log('No duplicates found. All violations are unique.');
    return;
  }

  // Analyze duplicates
  let totalDuplicates = 0;
  const violationsToDelete: string[] = [];
  const violationsToKeep: Map<string, string> = new Map(); // penalty_number -> id to keep

  console.log('Determining which violations to keep and which to delete...');
  console.log('Strategy: Keep the most recent violation (based on created_at)');
  console.log('');

  for (const group of duplicateGroups) {
    const violations = group.violations;
    
    // Sort by created_at (most recent first - already sorted from query)
    // Keep the first one (most recent), delete the rest
    const violationToKeep = violations[0];
    const violationsToDeleteInGroup = violations.slice(1);

    violationsToKeep.set(group.penalty_number, violationToKeep.id);
    
    for (const violation of violationsToDeleteInGroup) {
      violationsToDelete.push(violation.id);
      totalDuplicates++;
    }
  }

  console.log(`\n----------------------------------`);
  console.log('Duplicate Analysis Results:');
  console.log(`Total violations: ${allViolations.length}`);
  console.log(`Unique penalty_numbers: ${penaltyNumberMap.size}`);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Violations to delete: ${violationsToDelete.length}`);
  console.log(`Violations to keep: ${violationsToDelete.length + duplicateGroups.length} (one per duplicate group)`);
  console.log(`Final violations count after cleanup: ${allViolations.length - violationsToDelete.length}`);
  console.log('----------------------------------\n');

  // Show sample duplicates
  console.log('Sample duplicate groups:');
  const sampleGroups = duplicateGroups.slice(0, 10);
  
  for (const group of sampleGroups) {
    const violations = group.violations;
    const toKeep = violations[0];
    const toDelete = violations.slice(1);
    
    console.log(`\nPenalty Number: ${group.penalty_number}`);
    console.log(`  Total duplicates: ${violations.length}`);
    console.log(`  ✓ Keeping: ID ${toKeep.id} (created: ${toKeep.created_at}, date: ${toKeep.penalty_date}, amount: ${toKeep.amount})`);
    console.log(`  ✗ Deleting ${toDelete.length} duplicate(s):`);
    toDelete.forEach(v => {
      console.log(`    - ID ${v.id} (created: ${v.created_at}, date: ${v.penalty_date}, amount: ${v.amount})`);
    });
  }
  
  if (duplicateGroups.length > 10) {
    console.log(`\n  ... and ${duplicateGroups.length - 10} more duplicate groups`);
  }
  console.log('');

  // Show statistics
  const duplicateStats = {
    groupsWith2: duplicateGroups.filter(g => g.violations.length === 2).length,
    groupsWith3: duplicateGroups.filter(g => g.violations.length === 3).length,
    groupsWith4Plus: duplicateGroups.filter(g => g.violations.length >= 4).length,
  };

  console.log('Duplicate Statistics:');
  console.log(`  Groups with 2 duplicates: ${duplicateStats.groupsWith2}`);
  console.log(`  Groups with 3 duplicates: ${duplicateStats.groupsWith3}`);
  console.log(`  Groups with 4+ duplicates: ${duplicateStats.groupsWith4Plus}`);
  console.log('');

  // Ask for confirmation
  console.log('⚠️  WARNING: This will permanently delete the duplicate violations listed above.');
  console.log('⚠️  For each duplicate group, the most recent violation will be kept.');
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
    const progress = Math.min(i + BATCH_SIZE, violationsToDelete.length);
    if (progress % 100 === 0 || progress === violationsToDelete.length) {
      console.log(`Progress: ${progress}/${violationsToDelete.length} processed (${deletedCount} deleted, ${errorCount} errors)`);
    }
  }

  console.log('\n----------------------------------');
  console.log('Deletion process finished.');
  console.log(`Total violations before cleanup: ${allViolations.length}`);
  console.log(`Duplicate violations found: ${violationsToDelete.length}`);
  console.log(`Successfully deleted: ${deletedCount} duplicate violations.`);
  console.log(`Errors: ${errorCount} violations.`);
  console.log(`Remaining violations: ${allViolations.length - deletedCount}`);
  console.log(`Cleanup saved: ${deletedCount} duplicate entries`);
  console.log('----------------------------------');
}

// Run the script
deleteDuplicateViolations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

