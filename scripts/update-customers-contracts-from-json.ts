/**
 * Script: Update Customers and Contracts from JSON
 * 
 * This script reads the vehicles_rental_data_enhanced.json file and updates:
 * - Customer phone numbers
 * - Vehicle plate numbers
 * - Contract start dates
 * - Contract monthly amounts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file if exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

// Try to load from .qoder/mcp-settings.json as fallback
function loadFromMcpConfig() {
  const mcpConfigPath = path.join(__dirname, '../.qoder/mcp-settings.json');
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      const supabaseConfig = mcpConfig?.mcpServers?.supabase?.env;
      if (supabaseConfig) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseConfig.SUPABASE_URL) {
          process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseConfig.SUPABASE_URL;
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseConfig.SUPABASE_SERVICE_ROLE_KEY) {
          process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseConfig.SUPABASE_SERVICE_ROLE_KEY;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load MCP config:', error);
    }
  }
}

// Load environment variables
console.log('🔄 Loading environment variables...');
loadEnvFile();
loadFromMcpConfig();

// Get Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

console.log('🔑 Credentials status:');
console.log(`   URL: ${SUPABASE_URL ? '✅ Found' : '❌ Missing'}`);
console.log(`   Service Key: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing'}`);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing Supabase SERVICE_ROLE_KEY');
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('Or create a .env file with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('\nYou can find the service role key in Supabase Dashboard:');
  console.error('  Settings → API → service_role key');
  process.exit(1);
}

console.log('✅ Credentials loaded successfully\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface JSONRecord {
  vehicle_number: string;
  customer_name: string;
  contract_start_date: string;
  installment_amount: number;
  phone_number: string;
  notes: string | null;
  category: string;
}

interface UpdateResult {
  customersUpdated: number;
  customersCreated: number;
  vehiclesUpdated: number;
  contractsUpdated: number;
  contractsCreated: number;
  contractsReactivated: number;
  contractsMatched: number;
  unmatched: string[];
}

// Get default company ID
async function getDefaultCompanyId(): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  return data?.id || null;
}

// Normalize phone number - improved to handle 974 prefix and 00 prefix
function normalizePhone(phone: string | null): string | null {
  if (!phone || phone.trim() === '') return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove country code prefixes
  if (cleaned.startsWith('974')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
    if (cleaned.startsWith('974')) {
      cleaned = cleaned.substring(3);
    }
  }
  
  // Return cleaned phone (should be 8 digits for Kuwait)
  return cleaned || null;
}

// Compare phone numbers (handles normalization)
function comparePhones(phone1: string | null, phone2: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);
  return norm1 === norm2 && norm1 !== null;
}

// Normalize plate number
function normalizePlate(plate: string | null): string | null {
  if (!plate || plate.trim() === '') return null;
  return plate.trim().replace(/\s+/g, ' ').toUpperCase();
}

// Parse date from various formats
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-' || dateStr === ' ') {
    return null;
  }

  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0] || format === formats[1]) {
        // DD/MM/YYYY or DD-MM-YYYY
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
      } else {
        // YYYY-MM-DD
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
      }
    }
  }

  return null;
}

// Find customer by name - improved matching
async function findCustomer(customerName: string): Promise<{ id: string; phone: string } | null> {
  const trimmedName = customerName.trim().replace(/\s+/g, ' '); // Normalize spaces
  if (!trimmedName) return null;
  
  const nameParts = trimmedName.split(' ').filter(p => p.length > 0);
  
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Strategy 1: Try Arabic names first (exact match)
    let { data } = await supabase
      .from('customers')
      .select('id, phone, first_name_ar, last_name_ar')
      .ilike('first_name_ar', firstName)
      .ilike('last_name_ar', lastName)
      .limit(10);

    if (data && data.length > 0) {
      // Prioritize exact match
      const exact = data.find(c => {
        const fn = c.first_name_ar?.trim() || '';
        const ln = c.last_name_ar?.trim() || '';
        return fn === firstName && ln === lastName;
      });
      if (exact) return { id: exact.id, phone: exact.phone || '' };
      // Return first match
      return { id: data[0].id, phone: data[0].phone || '' };
    }

    // Strategy 2: Try English names
    const { data: data2 } = await supabase
      .from('customers')
      .select('id, phone, first_name, last_name')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .limit(10);

    if (data2 && data2.length > 0) {
      const exact = data2.find(c => {
        const fn = c.first_name?.trim() || '';
        const ln = c.last_name?.trim() || '';
        return fn === firstName && ln === lastName;
      });
      if (exact) return { id: exact.id, phone: exact.phone || '' };
      return { id: data2[0].id, phone: data2[0].phone || '' };
    }
  }

  // Strategy 3: Match full name as single field (better for Arabic)
  // Fetch more records for better matching
  let { data: data3 } = await supabase
    .from('customers')
    .select('id, phone, first_name_ar, last_name_ar, first_name, last_name, company_name, company_name_ar')
    .limit(200); // Increased limit for better matching

  if (data3) {
    const matched = data3.find(c => {
      const fullNameAr = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
      const fullNameEn = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      const fullNameArNoSpaces = fullNameAr.replace(/\s+/g, ' ');
      const fullNameEnNoSpaces = fullNameEn.replace(/\s+/g, ' ');
      
      return (
        fullNameAr === trimmedName ||
        fullNameEn === trimmedName ||
        fullNameArNoSpaces === trimmedName ||
        fullNameEnNoSpaces === trimmedName ||
        c.company_name === trimmedName ||
        c.company_name_ar === trimmedName
      );
    });

    if (matched) return { id: matched.id, phone: matched.phone || '' };
  }

  // Strategy 4: Partial match with better scoring
  const { data: data4 } = await supabase
    .from('customers')
    .select('id, phone, first_name_ar, last_name_ar, first_name, last_name')
    .or(`first_name_ar.ilike.%${trimmedName}%,last_name_ar.ilike.%${trimmedName}%,first_name.ilike.%${trimmedName}%,last_name.ilike.%${trimmedName}%`)
    .limit(10);

  if (data4 && data4.length > 0) {
    // Score matches and return best one
    const scored = data4.map(c => {
      const fullNameAr = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
      const fullNameEn = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      let score = 0;
      
      if (fullNameAr === trimmedName || fullNameEn === trimmedName) score += 10;
      if (fullNameAr.includes(trimmedName) || fullNameEn.includes(trimmedName)) score += 5;
      
      return { ...c, score };
    }).sort((a, b) => b.score - a.score);
    
    if (scored[0].score > 0) {
      return { id: scored[0].id, phone: scored[0].phone || '' };
    }
  }

  return null;
}

// Create customer if not found
async function createCustomer(
  customerName: string,
  phone: string,
  companyId: string
): Promise<string | null> {
  const trimmedName = customerName.trim().replace(/\s+/g, ' ');
  const nameParts = trimmedName.split(' ').filter(p => p.length > 0);
  
  let firstName = '';
  let lastName = '';
  let firstNameAr = '';
  let lastNameAr = '';
  
  // Determine if name is Arabic (contains Arabic characters)
  const isArabic = /[\u0600-\u06FF]/.test(trimmedName);
  
  if (nameParts.length >= 2) {
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(' ');
    
    if (isArabic) {
      firstNameAr = firstName;
      lastNameAr = lastName;
    } else {
      firstName = firstName;
      lastName = lastName;
    }
  } else {
    // Single name - treat as first name
    if (isArabic) {
      firstNameAr = trimmedName;
    } else {
      firstName = trimmedName;
    }
  }
  
  const normalizedPhone = normalizePhone(phone) || phone;
  
  const customerData: any = {
    company_id: companyId,
    customer_type: 'individual',
    phone: normalizedPhone,
    is_active: true,
  };
  
  if (firstNameAr) customerData.first_name_ar = firstNameAr;
  if (lastNameAr) customerData.last_name_ar = lastNameAr;
  if (firstName) customerData.first_name = firstName;
  if (lastName) customerData.last_name = lastName;
  
  // If no first/last name, use company_name
  if (!firstNameAr && !firstName) {
    customerData.company_name = isArabic ? trimmedName : '';
    customerData.company_name_ar = isArabic ? trimmedName : '';
    customerData.customer_type = 'corporate';
  }
  
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id')
    .single();
  
  if (error) {
    console.error(`   ❌ Error creating customer: ${error.message}`);
    return null;
  }
  
  return data?.id || null;
}

// Find vehicle by plate number
async function findVehicle(plateNumber: string): Promise<string | null> {
  const normalized = normalizePlate(plateNumber);
  if (!normalized) return null;

  // Try exact match
  let { data, error } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('plate_number', normalized)
    .limit(1);

  if (data && data.length > 0) {
    return data[0].id;
  }

  // Try without spaces
  const noSpaces = normalized.replace(/\s/g, '');
  const { data: data2 } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('plate_number', noSpaces)
    .limit(1);

  if (data2 && data2.length > 0) {
    return data2[0].id;
  }

  // Try partial match
  const { data: data3 } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .ilike('plate_number', `%${normalized}%`)
    .limit(5);

  if (data3 && data3.length === 1) {
    return data3[0].id;
  }

  return null;
}

// Find contract by customer (any status) - IMPROVED
async function findContract(customerId: string, vehicleId: string | null, plateNumber: string): Promise<{ id: string; status: string } | null> {
  // Strategy 1: Try exact match (customer + vehicle) - active contracts first
  if (vehicleId) {
    const { data } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('customer_id', customerId)
      .eq('vehicle_id', vehicleId)
      .in('status', ['active', 'rented', 'approved'])
      .order('start_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return { id: data[0].id, status: data[0].status };
    }
  }

  // Strategy 2: Try by license_plate - active contracts
  const normalized = normalizePlate(plateNumber);
  if (normalized) {
    const { data } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('customer_id', customerId)
      .ilike('license_plate', normalized)
      .in('status', ['active', 'rented', 'approved'])
      .order('start_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return { id: data[0].id, status: data[0].status };
    }
  }

  // Strategy 3: Any active contract for this customer (regardless of vehicle)
  const { data: data3 } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('customer_id', customerId)
    .in('status', ['active', 'rented', 'approved'])
    .order('start_date', { ascending: false })
    .limit(1);

  if (data3 && data3.length > 0) {
    return { id: data3[0].id, status: data3[0].status };
  }

  // Strategy 4: ANY contract for this customer (including cancelled/expired) 
  // This will be reactivated if found
  const { data: data4 } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('customer_id', customerId)
    .order('start_date', { ascending: false })
    .limit(1);

  if (data4 && data4.length > 0) {
    return { id: data4[0].id, status: data4[0].status };
  }

  return null;
}

// Generate unique contract number
async function generateContractNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);
  
  const nextNumber = (count || 0) + 1;
  return `CNT-${year}-${String(nextNumber).padStart(4, '0')}`;
}

// Create new contract
async function createContract(
  customerId: string,
  vehicleId: string,
  plateNumber: string,
  startDate: Date,
  monthlyAmount: number,
  companyId: string
): Promise<string | null> {
  const contractNumber = await generateContractNumber(companyId);
  
  // Calculate end_date (1 year from start_date)
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  const contractData = {
    company_id: companyId,
    customer_id: customerId,
    vehicle_id: vehicleId,
    contract_number: contractNumber,
    license_plate: normalizePlate(plateNumber),
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    monthly_amount: monthlyAmount,
    contract_amount: monthlyAmount * 12, // Default to 12 months
    contract_type: 'rental',
    status: 'active',
  };
  
  const { data, error } = await supabase
    .from('contracts')
    .insert(contractData)
    .select('id')
    .single();
  
  if (error) {
    console.error(`   ❌ Error creating contract: ${error.message}`);
    return null;
  }
  
  return data?.id || null;
}

// Main update function
async function updateFromJSON(jsonFile: string): Promise<UpdateResult> {
  console.log('📖 Reading JSON file...');
  const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
  const records: JSONRecord[] = JSON.parse(jsonContent);

  console.log(`📊 Found ${records.length} records to process`);

  // Get default company ID
  const defaultCompanyId = await getDefaultCompanyId();
  if (!defaultCompanyId) {
    console.error('❌ No company found in database');
    process.exit(1);
  }
  console.log(`🏢 Using company ID: ${defaultCompanyId}\n`);

  const result: UpdateResult = {
    customersUpdated: 0,
    customersCreated: 0,
    vehiclesUpdated: 0,
    contractsUpdated: 0,
    contractsCreated: 0,
    contractsReactivated: 0,
    contractsMatched: 0,
    unmatched: [],
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    console.log(`\n[${i + 1}/${records.length}] Processing: ${record.customer_name} - ${record.vehicle_number}`);

    // Skip records with invalid data
    if (!record.customer_name || record.customer_name.trim() === '') {
      console.log(`   ⚠️  Skipping record with empty customer name`);
      continue;
    }

    if (!record.vehicle_number || record.vehicle_number.trim() === '') {
      console.log(`   ⚠️  Skipping record with empty vehicle number`);
      continue;
    }

    // Find customer
    let customerResult = await findCustomer(record.customer_name);
    let customerId: string | null = null;
    
    if (!customerResult) {
      // Customer not found - create it
      console.log(`   ⚠️  Customer not found, creating new customer...`);
      
      if (!record.phone_number || record.phone_number === null) {
        console.log(`   ⚠️  Cannot create customer without phone number`);
        result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (No phone number)`);
        continue;
      }
      
      customerId = await createCustomer(record.customer_name, record.phone_number, defaultCompanyId);
      
      if (customerId) {
        console.log(`   ✅ Created new customer: ${record.customer_name}`);
        result.customersCreated++;
        customerResult = { id: customerId, phone: normalizePhone(record.phone_number) || '' };
      } else {
        console.log(`   ❌ Failed to create customer`);
        result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (Failed to create)`);
        continue;
      }
    } else {
      customerId = customerResult.id;
    }

    // Update customer phone
    const normalizedPhone = normalizePhone(record.phone_number);
    if (normalizedPhone) {
      // Check if phone needs update (handles 000000000 and mismatches)
      const currentPhone = customerResult.phone;
      const needsUpdate = 
        !currentPhone || 
        currentPhone === '000000000' || 
        !comparePhones(currentPhone, normalizedPhone);
      
      if (needsUpdate) {
        const { error } = await supabase
          .from('customers')
          .update({ phone: normalizedPhone, updated_at: new Date().toISOString() })
          .eq('id', customerId);

        if (!error) {
          console.log(`   ✅ Updated customer phone: ${normalizedPhone} (was: ${currentPhone || 'empty'})`);
          result.customersUpdated++;
        } else {
          console.log(`   ⚠️  Error updating customer phone: ${error.message}`);
        }
      }
    }

    // Find vehicle
    const vehicleId = await findVehicle(record.vehicle_number);
    if (!vehicleId) {
      console.log(`   ⚠️  Vehicle not found: ${record.vehicle_number}`);
      result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (Vehicle not found)`);
      continue;
    }

    // Update vehicle plate if different
    const normalizedPlate = normalizePlate(record.vehicle_number);
    if (normalizedPlate) {
      // Check current plate first
      const { data: currentVehicle } = await supabase
        .from('vehicles')
        .select('plate_number')
        .eq('id', vehicleId)
        .single();

      if (currentVehicle && normalizePlate(currentVehicle.plate_number) !== normalizedPlate) {
        const { error } = await supabase
          .from('vehicles')
          .update({ plate_number: normalizedPlate, updated_at: new Date().toISOString() })
          .eq('id', vehicleId);

        if (!error) {
          console.log(`   ✅ Updated vehicle plate: ${normalizedPlate}`);
          result.vehiclesUpdated++;
        } else {
          console.log(`   ⚠️  Error updating vehicle plate: ${error.message}`);
        }
      }
    }

    // Find contract
    const contractResult = await findContract(customerId!, vehicleId, record.vehicle_number);
    
    if (!contractResult) {
      // No contract found - create new one
      console.log(`   ⚠️  Contract not found, creating new contract...`);
      
      const parsedDate = parseDate(record.contract_start_date);
      if (!parsedDate) {
        console.log(`   ⚠️  Invalid contract start date, skipping contract creation`);
        result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (Invalid date)`);
        continue;
      }

      if (!record.installment_amount || record.installment_amount <= 0) {
        console.log(`   ⚠️  Invalid installment amount, skipping contract creation`);
        result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (Invalid amount)`);
        continue;
      }

      const newContractId = await createContract(
        customerId!,
        vehicleId,
        defaultCompanyId,
        record.vehicle_number,
        parsedDate,
        record.installment_amount
      );

      if (newContractId) {
        console.log(`   ✅ Created new contract for ${record.customer_name}`);
        result.contractsCreated++;
        result.contractsMatched++;
      } else {
        console.log(`   ❌ Failed to create contract`);
        result.unmatched.push(`${record.customer_name} | ${record.vehicle_number} (Failed to create contract)`);
      }
      continue;
    }

    result.contractsMatched++;
    const contractId = contractResult.id;
    const currentStatus = contractResult.status;

    // Get current contract data
    const { data: currentContract } = await supabase
      .from('contracts')
      .select('start_date, monthly_amount, license_plate, vehicle_id, status')
      .eq('id', contractId)
      .single();

    if (!currentContract) {
      console.log(`   ⚠️  Contract not found`);
      continue;
    }

    // Prepare update object
    const updates: any = {};
    let hasUpdates = false;

    // Reactivate if not active
    if (!['active', 'rented', 'approved'].includes(currentStatus)) {
      updates.status = 'active';
      hasUpdates = true;
      console.log(`   🔄 Reactivating contract from '${currentStatus}' to 'active'`);
      result.contractsReactivated++;
    }

    // Update contract start_date
    const parsedDate = parseDate(record.contract_start_date);
    if (parsedDate) {
      const dateStr = parsedDate.toISOString().split('T')[0];
      if (currentContract.start_date !== dateStr) {
        updates.start_date = dateStr;
        hasUpdates = true;
      }
    }

    // Update contract monthly_amount
    if (record.installment_amount && record.installment_amount > 0) {
      if (Number(currentContract.monthly_amount) !== record.installment_amount) {
        updates.monthly_amount = record.installment_amount;
        hasUpdates = true;
      }
    }

    // Update contract license_plate and vehicle_id
    if (normalizedPlate) {
      if (normalizePlate(currentContract.license_plate || '') !== normalizedPlate) {
        updates.license_plate = normalizedPlate;
        hasUpdates = true;
      }
      if (currentContract.vehicle_id !== vehicleId) {
        updates.vehicle_id = vehicleId;
        hasUpdates = true;
      }
    }

    // Execute updates if any
    if (hasUpdates) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId);

      if (!error) {
        console.log(`   ✅ Updated contract: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`);
        result.contractsUpdated++;
      } else {
        console.log(`   ⚠️  Error updating contract: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️  Contract already up to date`);
    }
  }

  return result;
}

// Execute
const jsonFile = path.join(__dirname, '../.claude/vehicles_rental_data_enhanced.json');

updateFromJSON(jsonFile)
  .then((result) => {
    console.log('\n\n📊 Update Summary:');
    console.log(`   Customers created: ${result.customersCreated}`);
    console.log(`   Customers updated: ${result.customersUpdated}`);
    console.log(`   Vehicles updated: ${result.vehiclesUpdated}`);
    console.log(`   Contracts created: ${result.contractsCreated}`);
    console.log(`   Contracts updated: ${result.contractsUpdated}`);
    console.log(`   Contracts reactivated: ${result.contractsReactivated}`);
    console.log(`   Contracts matched: ${result.contractsMatched}`);
    console.log(`   Unmatched records: ${result.unmatched.length}`);
    
    if (result.unmatched.length > 0) {
      console.log('\n⚠️  Unmatched records:');
      result.unmatched.slice(0, 20).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item}`);
      });
      if (result.unmatched.length > 20) {
        console.log(`   ... and ${result.unmatched.length - 20} more`);
      }
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: result,
      unmatched: result.unmatched,
    };

    fs.writeFileSync(
      path.join(__dirname, '../.cursor/update-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Report saved to .cursor/update-report.json');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

