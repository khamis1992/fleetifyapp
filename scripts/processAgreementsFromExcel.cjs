/**
 * Process Agreements from Excel File
 *
 * This script:
 * 1. Reads Excel file with vehicle/customer data
 * 2. Creates new active agreements with Arabic names
 * 3. Generates historical invoices for replaced contracts
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration - READ FROM .env FILE
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const EXCEL_FILE_PATH = 'C:/Users/khamis/Desktop/بيانات_المركبات_نظيف.xlsx';
const LATE_FEE_AMOUNT = 3000; // SAR
const DRY_RUN = process.argv.includes('--dry-run'); // Test mode

// Logging
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  processing: (msg) => console.log(`🔄 ${msg}`)
};

// Statistics
const stats = {
  totalRows: 0,
  contractsCreated: 0,
  contractsUpdated: 0,
  customersUpdated: 0,
  invoicesCreated: 0,
  errors: 0,
  skipped: 0
};

/**
 * Parse date from Excel (handles various formats)
 */
function parseExcelDate(dateValue) {
  if (!dateValue) return null;

  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }

  // If it's an Excel serial number
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    // Handle DD/MM/YYYY or D/M/YYYY format
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber(prefix = 'INV') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate contract number
 */
function generateContractNumber(prefix = 'CNT') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Get months between two dates
 */
function getMonthsBetween(startDate, endDate) {
  const months = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current < end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Read and parse Excel file
 */
async function readExcelFile() {
  log.info(`Reading Excel file: ${EXCEL_FILE_PATH}`);

  const workbook = XLSX.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  log.success(`Excel file read successfully: ${data.length} rows`);
  stats.totalRows = data.length;

  return data;
}

/**
 * Get company ID (assuming single company for now)
 */
async function getCompanyId() {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Failed to get company ID');
  }

  return data.id;
}

/**
 * Find vehicle by number
 */
async function findVehicleByNumber(vehicleNumber, companyId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_number', vehicleNumber.toString())
    .maybeSingle();

  if (error) {
    log.error(`Error finding vehicle ${vehicleNumber}: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Find cancelled contract by vehicle
 */
async function findCancelledContract(vehicleId, companyId) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error(`Error finding cancelled contract: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Update customer with Arabic name
 */
async function updateCustomer(customerId, arabicName, phone) {
  if (DRY_RUN) {
    log.info(`[DRY RUN] Would update customer ${customerId} with name: ${arabicName}`);
    return true;
  }

  const updateData = {
    first_name: arabicName,
    last_name: '', // Arabic name in first_name
    updated_at: new Date().toISOString()
  };

  if (phone) {
    updateData.phone = phone.toString();
  }

  const { error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId);

  if (error) {
    log.error(`Error updating customer: ${error.message}`);
    return false;
  }

  stats.customersUpdated++;
  return true;
}

/**
 * Create new contract
 */
async function createContract(contractData) {
  if (DRY_RUN) {
    log.info(`[DRY RUN] Would create contract for vehicle ${contractData.vehicle_id}`);
    return { id: 'dry-run-id' };
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert(contractData)
    .select()
    .single();

  if (error) {
    log.error(`Error creating contract: ${error.message}`);
    return null;
  }

  stats.contractsCreated++;
  return data;
}

/**
 * Update existing contract to active
 */
async function updateContractToActive(contractId, newData) {
  if (DRY_RUN) {
    log.info(`[DRY RUN] Would update contract ${contractId} to active`);
    return true;
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'active',
      start_date: newData.start_date,
      monthly_amount: newData.monthly_amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', contractId);

  if (error) {
    log.error(`Error updating contract: ${error.message}`);
    return false;
  }

  stats.contractsUpdated++;
  return true;
}

/**
 * Generate historical invoices
 */
async function generateHistoricalInvoices(oldContract, newStartDate, companyId) {
  if (!oldContract.end_date) {
    log.warning(`Old contract ${oldContract.contract_number} has no end_date, skipping invoices`);
    return 0;
  }

  const oldEndDate = new Date(oldContract.end_date);
  const newStart = new Date(newStartDate);

  // Get months between old end and new start
  const months = getMonthsBetween(oldEndDate, newStart);

  if (months.length === 0) {
    log.info(`No gap between contracts, no historical invoices needed`);
    return 0;
  }

  log.info(`Generating ${months.length} historical invoices from ${oldEndDate.toISOString().split('T')[0]} to ${newStartDate}`);

  let created = 0;

  for (const month of months) {
    const invoiceDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const dueDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const totalAmount = parseFloat(oldContract.monthly_amount) + LATE_FEE_AMOUNT;

    if (DRY_RUN) {
      log.info(`[DRY RUN] Would create invoice for ${invoiceDate.toISOString().split('T')[0]}: ${totalAmount} SAR`);
      created++;
      continue;
    }

    const invoiceData = {
      company_id: companyId,
      customer_id: oldContract.customer_id,
      contract_id: oldContract.id,
      invoice_number: generateInvoiceNumber(),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      total_amount: totalAmount,
      status: 'overdue',
      notes: `فاتورة تاريخية - الإيجار: ${oldContract.monthly_amount} + غرامة تأخير: ${LATE_FEE_AMOUNT}`,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('invoices')
      .insert(invoiceData);

    if (error) {
      log.error(`Error creating invoice: ${error.message}`);
      stats.errors++;
    } else {
      created++;
      stats.invoicesCreated++;
    }
  }

  return created;
}

/**
 * Process a single row from Excel
 */
async function processRow(row, index, companyId) {
  log.processing(`\n--- Processing Row ${index + 1}/${stats.totalRows} ---`);

  const vehicleNumber = row['رقم المركبة'];
  const customerName = row['اسم العميل'];
  const phone = row['رقم الجوال'];
  const startDateRaw = row['تاريخ بداية العقد'];
  const monthlyAmount = parseFloat(row['القسط الشهري']);

  // Validate data
  if (!vehicleNumber) {
    log.warning(`Row ${index + 1}: Missing vehicle number, skipping`);
    stats.skipped++;
    return;
  }

  if (!customerName) {
    log.warning(`Row ${index + 1}: Missing customer name, skipping`);
    stats.skipped++;
    return;
  }

  if (!monthlyAmount || monthlyAmount <= 0) {
    log.warning(`Row ${index + 1}: Invalid monthly amount, skipping`);
    stats.skipped++;
    return;
  }

  const startDate = parseExcelDate(startDateRaw);
  if (!startDate) {
    log.warning(`Row ${index + 1}: Invalid start date, skipping`);
    stats.skipped++;
    return;
  }

  log.info(`Vehicle: ${vehicleNumber}, Customer: ${customerName}, Amount: ${monthlyAmount}, Start: ${startDate}`);

  // Find vehicle
  const vehicle = await findVehicleByNumber(vehicleNumber, companyId);
  if (!vehicle) {
    log.warning(`Vehicle ${vehicleNumber} not found in database, skipping`);
    stats.skipped++;
    return;
  }

  log.success(`Found vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.id})`);

  // Find cancelled contract for this vehicle
  const oldContract = await findCancelledContract(vehicle.id, companyId);

  if (oldContract) {
    log.info(`Found cancelled contract: ${oldContract.contract_number}`);
    log.info(`Old customer: ${oldContract.customer_id}`);

    // Update customer with Arabic name
    await updateCustomer(oldContract.customer_id, customerName, phone);

    // Update contract to active with new dates
    const updated = await updateContractToActive(oldContract.id, {
      start_date: startDate,
      monthly_amount: monthlyAmount
    });

    if (updated) {
      log.success(`Contract ${oldContract.contract_number} reactivated`);

      // Generate historical invoices
      const invoicesCreated = await generateHistoricalInvoices(oldContract, startDate, companyId);
      log.success(`Created ${invoicesCreated} historical invoices`);
    }
  } else {
    log.warning(`No cancelled contract found for vehicle ${vehicleNumber}`);
    log.info(`Would need to create new contract (requires customer creation)`);
    stats.skipped++;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Starting Agreement Processing Script\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}`);
  console.log(`Late Fee: ${LATE_FEE_AMOUNT} SAR per invoice\n`);

  try {
    // Read Excel
    const rows = await readExcelFile();

    // Get company ID
    const companyId = await getCompanyId();
    log.success(`Using company ID: ${companyId}`);

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        await processRow(rows[i], i, companyId);
      } catch (error) {
        log.error(`Error processing row ${i + 1}: ${error.message}`);
        stats.errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Rows:           ${stats.totalRows}`);
    console.log(`Contracts Created:    ${stats.contractsCreated}`);
    console.log(`Contracts Updated:    ${stats.contractsUpdated}`);
    console.log(`Customers Updated:    ${stats.customersUpdated}`);
    console.log(`Invoices Created:     ${stats.invoicesCreated}`);
    console.log(`Skipped:              ${stats.skipped}`);
    console.log(`Errors:               ${stats.errors}`);
    console.log('='.repeat(50));

    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made to the database');
      console.log('Run without --dry-run flag to apply changes');
    } else {
      console.log('\n✅ Processing complete!');
    }

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
