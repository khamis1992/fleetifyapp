import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script links traffic violations to contracts based on vehicle_id.

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

async function linkViolationsToContracts() {
  console.log('Starting linking violations to contracts...');
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
      .select('id, penalty_number, vehicle_id, contract_id, vehicle_plate, penalty_date')
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

  // Get all active contracts for this company
  console.log('Fetching all contracts for the company...');
  const { data: allContracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, contract_number, vehicle_id, customer_id, status, start_date, end_date')
    .eq('company_id', AL_ARRAF_COMPANY_ID);

  if (contractsError) {
    console.error(`Error fetching contracts: ${contractsError.message}`);
    process.exit(1);
  }

  if (!allContracts || allContracts.length === 0) {
    console.warn('Warning: No contracts found for this company!');
    console.log('Cannot link violations without contracts.');
    return;
  }

  console.log(`Found ${allContracts.length} contracts.`);
  console.log('');

  // Helper function to find the best contract for a violation
  function findBestContractForViolation(violation: any): string | null {
    if (!violation.vehicle_id || !violation.penalty_date) {
      return null;
    }

    const violationDate = new Date(violation.penalty_date);
    const vehicleContracts = allContracts.filter(c => c.vehicle_id === violation.vehicle_id);

    if (vehicleContracts.length === 0) {
      return null;
    }

    // 1. First, try to find active contracts that contain the violation date
    const activeContractsInRange = vehicleContracts.filter(contract => {
      if (contract.status !== 'active') return false;
      
      const startDate = contract.start_date ? new Date(contract.start_date) : null;
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      
      const isAfterStart = !startDate || violationDate >= startDate;
      const isBeforeEnd = !endDate || violationDate <= endDate;
      
      return isAfterStart && isBeforeEnd;
    });

    if (activeContractsInRange.length > 0) {
      // If multiple active contracts, use the most recent one (by end_date)
      activeContractsInRange.sort((a, b) => {
        const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0;
        const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0;
        return bEndDate - aEndDate;
      });
      return activeContractsInRange[0].id;
    }

    // 2. If no active contract in range, try to find any contract that contains the violation date
    const contractsInRange = vehicleContracts.filter(contract => {
      const startDate = contract.start_date ? new Date(contract.start_date) : null;
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      
      const isAfterStart = !startDate || violationDate >= startDate;
      const isBeforeEnd = !endDate || violationDate <= endDate;
      
      return isAfterStart && isBeforeEnd;
    });

    if (contractsInRange.length > 0) {
      // Prioritize active, then by end_date (most recent first)
      contractsInRange.sort((a, b) => {
        const aActive = a.status === 'active' ? 1 : 0;
        const bActive = b.status === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        
        const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0;
        const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0;
        return bEndDate - aEndDate;
      });
      return contractsInRange[0].id;
    }

    // 3. If no contract contains the violation date, use the most recent contract before the violation date
    const contractsBeforeViolation = vehicleContracts.filter(contract => {
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      return endDate && violationDate > endDate;
    });

    if (contractsBeforeViolation.length > 0) {
      // Sort by end_date descending (most recent before violation)
      contractsBeforeViolation.sort((a, b) => {
        const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0;
        const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0;
        return bEndDate - aEndDate;
      });
      return contractsBeforeViolation[0].id;
    }

    // 4. Last resort: use the most recent active contract, or most recent contract
    const sortedContracts = [...vehicleContracts].sort((a, b) => {
      const aActive = a.status === 'active' ? 1 : 0;
      const bActive = b.status === 'active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      
      const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0;
      const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0;
      return bEndDate - aEndDate;
    });

    return sortedContracts[0]?.id || null;
  }

  console.log('Using smart contract matching based on violation date and contract period.');
  console.log('');

  // Find violations that need linking
  console.log('Analyzing violations...');
  const violationsToLink: Array<{ 
    id: string; 
    penalty_number: string; 
    vehicle_id: string; 
    contract_id: string;
    penalty_date: string;
    matchingReason: string;
  }> = [];
  const violationsAlreadyLinked = new Set<string>();
  const violationsWithoutVehicle = new Set<string>();
  const violationsVehicleNoContract = new Set<string>();
  const violationsWithoutDate = new Set<string>();

  for (const violation of allViolations) {
    // Skip if already linked
    if (violation.contract_id) {
      violationsAlreadyLinked.add(violation.id);
      continue;
    }

    // Skip if no vehicle_id
    if (!violation.vehicle_id) {
      violationsWithoutVehicle.add(violation.id);
      continue;
    }

    // Skip if no penalty_date
    if (!violation.penalty_date) {
      violationsWithoutDate.add(violation.id);
      continue;
    }

    // Find the best contract for this violation
    const contractId = findBestContractForViolation(violation);

    if (contractId) {
      const contract = allContracts.find(c => c.id === contractId);
      let matchingReason = '';
      
      if (contract) {
        const violationDate = new Date(violation.penalty_date);
        const startDate = contract.start_date ? new Date(contract.start_date) : null;
        const endDate = contract.end_date ? new Date(contract.end_date) : null;
        
        const isInRange = (!startDate || violationDate >= startDate) && (!endDate || violationDate <= endDate);
        
        if (contract.status === 'active' && isInRange) {
          matchingReason = 'عقد نشط ضمن الفترة';
        } else if (isInRange) {
          matchingReason = `عقد ${contract.status} ضمن الفترة`;
        } else {
          matchingReason = 'أحدث عقد قبل تاريخ المخالفة';
        }
      }
      
      violationsToLink.push({
        id: violation.id,
        penalty_number: violation.penalty_number,
        vehicle_id: violation.vehicle_id,
        contract_id: contractId,
        penalty_date: violation.penalty_date,
        matchingReason: matchingReason
      });
    } else {
      violationsVehicleNoContract.add(violation.id);
    }
  }

  console.log(`\n----------------------------------`);
  console.log('Link Analysis Results:');
  console.log(`Total violations: ${allViolations.length}`);
  console.log(`Already linked: ${violationsAlreadyLinked.size}`);
  console.log(`Without vehicle_id: ${violationsWithoutVehicle.size}`);
  console.log(`Without penalty_date: ${violationsWithoutDate.size}`);
  console.log(`Vehicle has no contract: ${violationsVehicleNoContract.size}`);
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
    const contract = allContracts.find(c => c.id === v.contract_id);
    console.log(`  - ${v.penalty_number}: date="${v.penalty_date}" -> contract="${contract?.contract_number || 'N/A'}" (${v.matchingReason})`);
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
    
    // Update each violation individually
    for (const violation of batch) {
      const { error: updateError } = await supabase
        .from('penalties')
        .update({ contract_id: violation.contract_id })
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
  console.log(`Without vehicle_id: ${violationsWithoutVehicle.size} violations.`);
  console.log(`Without penalty_date: ${violationsWithoutDate.size} violations.`);
  console.log(`Vehicle has no contract: ${violationsVehicleNoContract.size} violations.`);
  console.log('----------------------------------');
}

// Run the script
linkViolationsToContracts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

