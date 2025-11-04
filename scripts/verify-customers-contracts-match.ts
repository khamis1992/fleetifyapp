/**
 * Script: Verify Customers and Contracts Match JSON File
 * 
 * This script compares the database data with the JSON file to verify
 * all customers, vehicles, and contracts match correctly.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

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

interface VerificationResult {
  totalRecords: number;
  customersMatched: number;
  customersNotMatched: Array<{ name: string; vehicle: string; reason: string }>;
  customersPhoneMismatch: Array<{ name: string; vehicle: string; expected: string; actual: string }>;
  vehiclesMatched: number;
  vehiclesNotMatched: Array<{ vehicle: string; reason: string }>;
  contractsMatched: number;
  contractsNotMatched: Array<{ name: string; vehicle: string; reason: string }>;
  contractsDateMismatch: Array<{ name: string; vehicle: string; expected: string; actual: string }>;
  contractsAmountMismatch: Array<{ name: string; vehicle: string; expected: number; actual: number }>;
}

// Normalize phone number
function normalizePhone(phone: string | null): string | null {
  if (!phone || phone.trim() === '') return null;
  return phone.replace(/\D/g, '');
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
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
      } else {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        return new Date(year, month - 1, day);
      }
    }
  }

  return null;
}

// Find customer by name
async function findCustomer(customerName: string): Promise<{ id: string; phone: string } | null> {
  const trimmedName = customerName.trim();
  if (!trimmedName) return null;
  
  const nameParts = trimmedName.split(' ').filter(p => p.length > 0);
  
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Try Arabic names first
    let { data } = await supabase
      .from('customers')
      .select('id, phone, first_name_ar, last_name_ar')
      .ilike('first_name_ar', firstName)
      .ilike('last_name_ar', lastName)
      .limit(5);

    if (data && data.length > 0) {
      const exact = data.find(c => 
        c.first_name_ar?.trim() === firstName && 
        c.last_name_ar?.trim() === lastName
      );
      if (exact) return { id: exact.id, phone: exact.phone || '' };
      return { id: data[0].id, phone: data[0].phone || '' };
    }

    // Try English names
    const { data: data2 } = await supabase
      .from('customers')
      .select('id, phone, first_name, last_name')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .limit(5);

    if (data2 && data2.length > 0) {
      const exact = data2.find(c => 
        c.first_name?.trim() === firstName && 
        c.last_name?.trim() === lastName
      );
      if (exact) return { id: exact.id, phone: exact.phone || '' };
      return { id: data2[0].id, phone: data2[0].phone || '' };
    }
  }

  // Try matching as full name
  let { data: data3 } = await supabase
    .from('customers')
    .select('id, phone, first_name_ar, last_name_ar, first_name, last_name, company_name, company_name_ar')
    .limit(100);

  if (data3) {
    const matched = data3.find(c => {
      const fullNameAr = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
      const fullNameEn = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      return (
        fullNameAr === trimmedName ||
        fullNameEn === trimmedName ||
        c.company_name === trimmedName ||
        c.company_name_ar === trimmedName
      );
    });

    if (matched) return { id: matched.id, phone: matched.phone || '' };
  }

  return null;
}

// Find vehicle by plate number
async function findVehicle(plateNumber: string): Promise<string | null> {
  const normalized = normalizePlate(plateNumber);
  if (!normalized) return null;

  let { data } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('plate_number', normalized)
    .limit(1);

  if (data && data.length > 0) {
    return data[0].id;
  }

  const noSpaces = normalized.replace(/\s/g, '');
  const { data: data2 } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('plate_number', noSpaces)
    .limit(1);

  if (data2 && data2.length > 0) {
    return data2[0].id;
  }

  return null;
}

// Find contract by customer + vehicle
async function findContract(customerId: string, vehicleId: string | null, plateNumber: string): Promise<{ id: string; start_date: string; monthly_amount: number } | null> {
  if (vehicleId) {
    const { data } = await supabase
      .from('contracts')
      .select('id, start_date, monthly_amount')
      .eq('customer_id', customerId)
      .eq('vehicle_id', vehicleId)
      .in('status', ['active', 'rented', 'approved'])
      .order('start_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return {
        id: data[0].id,
        start_date: data[0].start_date,
        monthly_amount: Number(data[0].monthly_amount)
      };
    }
  }

  const normalized = normalizePlate(plateNumber);
  if (normalized) {
    const { data } = await supabase
      .from('contracts')
      .select('id, start_date, monthly_amount')
      .eq('customer_id', customerId)
      .ilike('license_plate', normalized)
      .in('status', ['active', 'rented', 'approved'])
      .order('start_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return {
        id: data[0].id,
        start_date: data[0].start_date,
        monthly_amount: Number(data[0].monthly_amount)
      };
    }
  }

  return null;
}

// Main verification function
async function verifyJSONData(jsonFile: string): Promise<VerificationResult> {
  console.log('📖 Reading JSON file...');
  const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
  const records: JSONRecord[] = JSON.parse(jsonContent);

  console.log(`📊 Found ${records.length} records to verify\n`);

  const result: VerificationResult = {
    totalRecords: records.length,
    customersMatched: 0,
    customersNotMatched: [],
    customersPhoneMismatch: [],
    vehiclesMatched: 0,
    vehiclesNotMatched: [],
    contractsMatched: 0,
    contractsNotMatched: [],
    contractsDateMismatch: [],
    contractsAmountMismatch: [],
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    console.log(`[${i + 1}/${records.length}] Checking: ${record.customer_name} - ${record.vehicle_number}`);

    // Check customer
    const customer = await findCustomer(record.customer_name);
    if (!customer) {
      result.customersNotMatched.push({
        name: record.customer_name,
        vehicle: record.vehicle_number,
        reason: 'Customer not found in database'
      });
      console.log(`   ⚠️  Customer not found`);
      continue;
    }

    result.customersMatched++;

    // Check customer phone
    const expectedPhone = normalizePhone(record.phone_number);
    const actualPhone = normalizePhone(customer.phone);
    if (expectedPhone && actualPhone && expectedPhone !== actualPhone) {
      result.customersPhoneMismatch.push({
        name: record.customer_name,
        vehicle: record.vehicle_number,
        expected: expectedPhone,
        actual: actualPhone
      });
      console.log(`   ⚠️  Phone mismatch: Expected ${expectedPhone}, Got ${actualPhone}`);
    } else if (!expectedPhone && record.phone_number) {
      console.log(`   ⚠️  Phone missing in JSON but present in DB: ${actualPhone}`);
    }

    // Check vehicle
    const vehicleId = await findVehicle(record.vehicle_number);
    if (!vehicleId) {
      result.vehiclesNotMatched.push({
        vehicle: record.vehicle_number,
        reason: 'Vehicle not found in database'
      });
      console.log(`   ⚠️  Vehicle not found`);
      continue;
    }

    result.vehiclesMatched++;

    // Check contract
    const contract = await findContract(customer.id, vehicleId, record.vehicle_number);
    if (!contract) {
      result.contractsNotMatched.push({
        name: record.customer_name,
        vehicle: record.vehicle_number,
        reason: 'Contract not found for customer + vehicle'
      });
      console.log(`   ⚠️  Contract not found`);
      continue;
    }

    result.contractsMatched++;

    // Check contract start date
    const expectedDate = parseDate(record.contract_start_date);
    if (expectedDate) {
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      if (contract.start_date !== expectedDateStr) {
        result.contractsDateMismatch.push({
          name: record.customer_name,
          vehicle: record.vehicle_number,
          expected: expectedDateStr,
          actual: contract.start_date
        });
        console.log(`   ⚠️  Date mismatch: Expected ${expectedDateStr}, Got ${contract.start_date}`);
      }
    }

    // Check contract monthly amount
    if (record.installment_amount && record.installment_amount > 0) {
      const expectedAmount = Number(record.installment_amount);
      const actualAmount = contract.monthly_amount;
      if (Math.abs(expectedAmount - actualAmount) > 0.01) {
        result.contractsAmountMismatch.push({
          name: record.customer_name,
          vehicle: record.vehicle_number,
          expected: expectedAmount,
          actual: actualAmount
        });
        console.log(`   ⚠️  Amount mismatch: Expected ${expectedAmount}, Got ${actualAmount}`);
      }
    }

    console.log(`   ✅ All matched`);
  }

  return result;
}

// Execute verification
const jsonFile = path.join(__dirname, '../.claude/vehicles_rental_data_enhanced.json');

verifyJSONData(jsonFile)
  .then((result) => {
    console.log('\n\n📊 Verification Summary:');
    console.log(`   Total records in JSON: ${result.totalRecords}`);
    console.log(`   Customers matched: ${result.customersMatched} (${(result.customersMatched/result.totalRecords*100).toFixed(1)}%)`);
    console.log(`   Vehicles matched: ${result.vehiclesMatched} (${(result.vehiclesMatched/result.totalRecords*100).toFixed(1)}%)`);
    console.log(`   Contracts matched: ${result.contractsMatched} (${(result.contractsMatched/result.totalRecords*100).toFixed(1)}%)`);
    
    console.log(`\n   Customers not matched: ${result.customersNotMatched.length}`);
    console.log(`   Customers phone mismatch: ${result.customersPhoneMismatch.length}`);
    console.log(`   Vehicles not matched: ${result.vehiclesNotMatched.length}`);
    console.log(`   Contracts not matched: ${result.contractsNotMatched.length}`);
    console.log(`   Contracts date mismatch: ${result.contractsDateMismatch.length}`);
    console.log(`   Contracts amount mismatch: ${result.contractsAmountMismatch.length}`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRecords: result.totalRecords,
        customersMatched: result.customersMatched,
        vehiclesMatched: result.vehiclesMatched,
        contractsMatched: result.contractsMatched,
        matchRate: {
          customers: `${(result.customersMatched/result.totalRecords*100).toFixed(1)}%`,
          vehicles: `${(result.vehiclesMatched/result.totalRecords*100).toFixed(1)}%`,
          contracts: `${(result.contractsMatched/result.totalRecords*100).toFixed(1)}%`,
        }
      },
      issues: {
        customersNotMatched: result.customersNotMatched,
        customersPhoneMismatch: result.customersPhoneMismatch,
        vehiclesNotMatched: result.vehiclesNotMatched,
        contractsNotMatched: result.contractsNotMatched,
        contractsDateMismatch: result.contractsDateMismatch,
        contractsAmountMismatch: result.contractsAmountMismatch,
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '../.cursor/verification-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Detailed report saved to .cursor/verification-report.json');
    
    // Print issues if any
    if (result.customersNotMatched.length > 0) {
      console.log('\n⚠️  Customers Not Matched:');
      result.customersNotMatched.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} | ${item.vehicle} - ${item.reason}`);
      });
      if (result.customersNotMatched.length > 10) {
        console.log(`   ... and ${result.customersNotMatched.length - 10} more`);
      }
    }

    if (result.customersPhoneMismatch.length > 0) {
      console.log('\n⚠️  Phone Number Mismatches:');
      result.customersPhoneMismatch.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} | ${item.vehicle}: Expected ${item.expected}, Got ${item.actual}`);
      });
      if (result.customersPhoneMismatch.length > 10) {
        console.log(`   ... and ${result.customersPhoneMismatch.length - 10} more`);
      }
    }

    if (result.contractsDateMismatch.length > 0) {
      console.log('\n⚠️  Contract Date Mismatches:');
      result.contractsDateMismatch.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} | ${item.vehicle}: Expected ${item.expected}, Got ${item.actual}`);
      });
      if (result.contractsDateMismatch.length > 10) {
        console.log(`   ... and ${result.contractsDateMismatch.length - 10} more`);
      }
    }

    if (result.contractsAmountMismatch.length > 0) {
      console.log('\n⚠️  Contract Amount Mismatches:');
      result.contractsAmountMismatch.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} | ${item.vehicle}: Expected ${item.expected}, Got ${item.actual}`);
      });
      if (result.contractsAmountMismatch.length > 10) {
        console.log(`   ... and ${result.contractsAmountMismatch.length - 10} more`);
      }
    }
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

