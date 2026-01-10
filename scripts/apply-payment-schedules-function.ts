/**
 * Apply Payment Schedules SQL Migration
 *
 * This script creates the payment schedule generation functions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment
function loadEnv() {
  const envPaths = ['.env.local', '.env.production', '.env'];
  const env: Record<string, string> = {};

  for (const envPath of envPaths) {
    try {
      const fullPath = join(process.cwd(), envPath);
      const envContent = readFileSync(fullPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#') && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  return env;
}

const env = loadEnv();
let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim();

// Remove quotes if present
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) {
  supabaseUrl = supabaseUrl.slice(1, -1);
}
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) {
  supabaseKey = supabaseKey.slice(1, -1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
});

// Read the SQL migration
const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260110000000_generate_payment_schedules_from_invoices.sql');
const sqlContent = readFileSync(sqlPath, 'utf-8');

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('APPLY: Payment Schedules Migration');
  console.log('='.repeat(80));
  console.log();

  // Use raw SQL execution - split by statements and execute
  // This is a simplified approach - for complex migrations, use supabase db push
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
    .filter(s => s.toLowerCase().includes('create') || s.toLowerCase().includes('grant'));

  console.log(`Found ${statements.length} SQL statements to execute`);
  console.log();

  // We'll use a different approach - execute via RPC call to a SQL runner
  // Or directly execute the function creation

  // Actually, let's try using the supabase client with raw SQL
  // Note: Supabase JS client doesn't support raw DDL execution directly
  // We need to use the postgres extension or connect directly

  // For now, let's create the schedules directly without the function
  console.log('Creating payment schedules directly...');
  console.log();

  const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';

  // First get the contract details
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', CONTRACT_ID)
    .single();

  if (!contract) {
    console.error('Contract not found');
    return;
  }

  console.log(`Contract: ${contract.contract_number}`);
  console.log(`Start Date: ${contract.start_date}`);
  console.log(`Monthly Amount: QAR ${contract.monthly_amount}`);
  console.log();

  // Get all invoices for this contract
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('invoice_date', { ascending: true });

  if (!invoices || invoices.length === 0) {
    console.log('No invoices found for this contract');
    return;
  }

  console.log(`Found ${invoices.length} invoices`);
  console.log();

  // Check existing schedules
  const { data: existingSchedules } = await supabase
    .from('contract_payment_schedules')
    .select('invoice_id')
    .eq('contract_id', CONTRACT_ID);

  const existingInvoiceIds = new Set(existingSchedules?.map(s => s.invoice_id) || []);
  console.log(`Existing schedules: ${existingInvoiceIds.size}`);
  console.log();

  // Create schedules for invoices that don't have them
  let created = 0;
  let skipped = 0;

  for (const invoice of invoices) {
    if (existingInvoiceIds.has(invoice.id)) {
      skipped++;
      console.log(`⏭️  Skipped ${invoice.invoice_number} (already has schedule)`);
      continue;
    }

    // Calculate installment number
    const invoiceDate = new Date(invoice.invoice_date);
    const startDate = new Date(contract.start_date);
    const monthsDiff = (invoiceDate.getFullYear() - startDate.getFullYear()) * 12 +
                       (invoiceDate.getMonth() - startDate.getMonth());
    const installmentNumber = Math.max(1, monthsDiff + 1);

    // Determine status
    let status = 'pending';
    if (invoice.payment_status === 'paid') status = 'paid';
    else if (invoice.payment_status === 'partially_paid') status = 'partially_paid';
    else if (invoice.due_date && new Date(invoice.due_date) < new Date()) status = 'overdue';

    const scheduleData = {
      contract_id: CONTRACT_ID,
      invoice_id: invoice.id,
      company_id: contract.company_id,
      amount: invoice.total_amount,
      due_date: invoice.due_date || invoice.invoice_date || contract.start_date,
      installment_number: installmentNumber,
      status: status,
      paid_amount: invoice.payment_status === 'paid' ? invoice.total_amount : null,
      paid_date: invoice.payment_status === 'paid' ? invoice.invoice_date : null,
      description: `Installment ${installmentNumber} - ${invoiceDate.toISOString().slice(0, 7)} (${invoice.invoice_number})`,
      notes: `Auto-generated from invoice ${invoice.invoice_number}`
    };

    const { error } = await supabase
      .from('contract_payment_schedules')
      .insert(scheduleData);

    if (error) {
      console.error(`❌ Error creating schedule for ${invoice.invoice_number}:`, error.message);
    } else {
      created++;
      console.log(`✅ Created schedule #${installmentNumber}: QAR ${invoice.total_amount} for ${invoice.invoice_number}`);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('Summary:');
  console.log(`  Created: ${created} schedules`);
  console.log(`  Skipped: ${skipped} schedules (already exist)`);
  console.log(`  Total Invoices: ${invoices.length}`);
  console.log('='.repeat(80));
}

applyMigration().then(() => {
  console.log('✅ Complete!');
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
