#!/usr/bin/env node

/**
 * Migration Status Checker
 * Checks which migrations have been applied to Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected tables for different features
const expectedTables = {
  core: [
    'companies', 'profiles', 'customers', 'contracts', 'vehicles',
    'payments', 'invoices', 'chart_of_accounts', 'journal_entries'
  ],
  vendors: [
    'vendors', 'vendor_categories', 'vendor_contacts', 
    'vendor_documents', 'vendor_performance', 'purchase_orders', 
    'vendor_payments'
  ],
  reports: ['report_favorites'],
  learning: ['learning_interactions', 'learning_patterns', 'adaptive_rules'],
  property: ['property_maintenance', 'property_maintenance_history'],
  other: [
    'rental_payment_receipts', 'legal_cases', 'audit_logs',
    'vehicle_insurance', 'vehicle_groups', 'contract_drafts',
    'driver_licenses', 'vehicle_inspections'
  ]
};

async function checkTables() {
  console.log('\n🔍 Checking Migration Status...\n');

  // Try direct table check approach
  console.log('📋 Checking tables directly...\n');
  await checkTablesDirectly();
}

async function checkTablesDirectly() {
  const allTables = Object.values(expectedTables).flat();
  const existingTables = new Set();
  
  for (const table of allTables) {
    try {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}`);
      } else {
        console.log(`✅ ${table}`);
        existingTables.add(table);
      }
    } catch (err) {
      console.log(`❌ ${table}`);
    }
  }
  
  // Summary by category
  console.log('\n' + '='.repeat(50));
  for (const [category, tables] of Object.entries(expectedTables)) {
    const categoryExists = tables.filter(t => existingTables.has(t)).length;
    const categoryTotal = tables.length;
    const status = categoryExists === categoryTotal ? '✅' : '⚠️';
    console.log(`${status} ${category.toUpperCase()}: ${categoryExists}/${categoryTotal}`);
  }
  
  // Overall summary
  const existingCount = existingTables.size;
  const totalCount = allTables.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Migration Summary: ${existingCount}/${totalCount} tables exist`);
  
  if (existingCount === totalCount) {
    console.log('✅ All migrations are complete!\n');
  } else {
    console.log(`⚠️  ${totalCount - existingCount} tables are missing\n`);
    
    const missing = allTables.filter(t => !existingTables.has(t));
    console.log('\nMissing tables:');
    missing.forEach(t => console.log(`  - ${t}`));
  }
  
  console.log('');
}

// Run the check
checkTables().catch(console.error);
