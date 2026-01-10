/**
 * Script to Generate Missing Payment Schedules for Contract Invoices
 *
 * This script generates payment_schedule records for invoices that don't have them.
 * It's idempotent - can be run multiple times safely.
 *
 * Usage:
 *   node scripts/generate-payment-schedules-from-invoices.js --contract-id <uuid>
 *   node scripts/generate-payment-schedules-from-invoices.js --contract-number C-ALF-0085
 *   node scripts/generate-payment-schedules-from-invoices.js --all-contracts
 *
 * Build:
 *   npm run build:script
 *
 * Requirements:
 *   - Supabase connection configured
 *   - Service role or admin access
 *
 * Environment variables:
 *   SUPABASE_URL - Supabase project URL (optional, uses default)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required)
 */

import { createClient } from '@supabase/supabase-js';
import { argv } from 'process';

// @ts-ignore - Supabase client types
type SupabaseClient = ReturnType<typeof createClient>;

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Type definitions
interface Contract {
  id: string;
  contract_number: string;
  company_id: string;
  customer_id: string;
  contract_amount: number;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  contract_type: string;
  status: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  contract_id: string;
  company_id: string;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  payment_status: string;
  status: string;
  subtotal: number;
  tax_amount: number | null;
}

interface PaymentSchedule {
  id: string;
  contract_id: string;
  invoice_id: string | null;
  company_id: string;
  amount: number;
  due_date: string;
  installment_number: number;
  status: string;
  paid_amount: number | null;
  paid_date: string | null;
  description: string | null;
}

interface GenerationResult {
  success: boolean;
  contractNumber: string;
  contractId: string;
  invoicesProcessed: number;
  schedulesCreated: number;
  schedulesSkipped: number;
  errors: string[];
  warnings: string[];
}

// Initialize Supabase client
function getSupabaseClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Parse command line arguments
function parseArgs() {
  const args = {
    contractId: '',
    contractNumber: '',
    allContracts: false,
    dryRun: false,
    verbose: false
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--contract-id':
        args.contractId = argv[++i];
        break;
      case '--contract-number':
        args.contractNumber = argv[++i];
        break;
      case '--all-contracts':
        args.allContracts = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Generate Payment Schedules from Contract Invoices

Usage:
  npx ts-node scripts/generate-payment-schedules-from-invoices.ts [options]

Options:
  --contract-id <uuid>       Generate for specific contract ID
  --contract-number <num>    Generate for specific contract number (e.g., C-ALF-0085)
  --all-contracts            Generate for all contracts with missing schedules
  --dry-run                  Show what would be done without making changes
  --verbose, -v              Show detailed output
  --help, -h                 Show this help message

Examples:
  # Generate for specific contract by number
  npx ts-node scripts/generate-payment-schedules-from-invoices.ts --contract-number C-ALF-0085

  # Generate for specific contract by ID
  npx ts-node scripts/generate-payment-schedules-from-invoices.ts --contract-id 12345678-1234-1234-1234-123456789012

  # Scan and fix all contracts
  npx ts-node scripts/generate-payment-schedules-from-invoices.ts --all-contracts

  # Dry run to see what would be done
  npx ts-node scripts/generate-payment-schedules-from-invoices.ts --all-contracts --dry-run
`);
}

// Validate invoice before creating payment schedule
function validateInvoice(invoice: Invoice): { valid: boolean; reason?: string } {
  if (!invoice.contract_id) {
    return { valid: false, reason: 'Invoice has no contract_id' };
  }

  if (invoice.total_amount <= 0) {
    return { valid: false, reason: 'Invoice total_amount is zero or negative' };
  }

  // Skip fully paid invoices - they should already have schedules or don't need them
  if (invoice.payment_status === 'paid' && invoice.total_amount > 0) {
    return { valid: false, reason: 'Invoice is already fully paid' };
  }

  return { valid: true };
}

// Calculate installment number from invoice date and contract start
function calculateInstallmentNumber(invoice: Invoice, contract: Contract): number {
  const invoiceDate = new Date(invoice.invoice_date);
  const startDate = new Date(contract.start_date);

  // Calculate months difference
  const monthsDiff =
    (invoiceDate.getFullYear() - startDate.getFullYear()) * 12 +
    (invoiceDate.getMonth() - startDate.getMonth());

  return Math.max(1, monthsDiff + 1);
}

// Generate description for payment schedule
function generateScheduleDescription(invoice: Invoice, installmentNumber: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const invoiceDate = new Date(invoice.invoice_date);
  const monthName = monthNames[invoiceDate.getMonth()];
  const year = invoiceDate.getFullYear();

  return `Installment ${installmentNumber} - ${monthName} ${year} (${invoice.invoice_number})`;
}

// Determine payment schedule status based on invoice status
function determineScheduleStatus(invoice: Invoice): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  if (dueDate) {
    dueDate.setHours(0, 0, 0, 0);
  }

  // If invoice is partially paid, schedule is partially paid
  if (invoice.payment_status === 'partially_paid') {
    return 'partially_paid';
  }

  // If invoice is paid, schedule is paid
  if (invoice.payment_status === 'paid') {
    return 'paid';
  }

  // Check if overdue
  if (dueDate && dueDate < today) {
    return 'overdue';
  }

  // Default to pending
  return 'pending';
}

// Check if payment schedule already exists for an invoice
async function hasExistingSchedule(
  supabase: any,
  invoiceId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('contract_payment_schedules')
    .select('id')
    .eq('invoice_id', invoiceId)
    .limit(1);

  if (error) {
    console.warn(`Warning checking existing schedule: ${error.message}`);
    return false;
  }

  return data && data.length > 0;
}

// Get all invoices for a contract
async function getContractInvoices(
  supabase: any,
  contractId: string
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', contractId)
    .order('invoice_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  return data || [];
}

// Get payment schedules for a contract
async function getContractPaymentSchedules(
  supabase: any,
  contractId: string
): Promise<PaymentSchedule[]> {
  const { data, error } = await supabase
    .from('contract_payment_schedules')
    .select('*')
    .eq('contract_id', contractId)
    .order('installment_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch payment schedules: ${error.message}`);
  }

  return data || [];
}

// Generate payment schedules for a single contract
async function generatePaymentSchedulesForContract(
  supabase: any,
  contract: Contract,
  dryRun: boolean = false,
  verbose: boolean = false
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: false,
    contractNumber: contract.contract_number,
    contractId: contract.id,
    invoicesProcessed: 0,
    schedulesCreated: 0,
    schedulesSkipped: 0,
    errors: [],
    warnings: []
  };

  try {
    if (verbose) {
      console.log(`\nProcessing contract ${contract.contract_number}:`);
      console.log(`  ID: ${contract.id}`);
      console.log(`  Type: ${contract.contract_type}`);
      console.log(`  Status: ${contract.status}`);
      console.log(`  Amount: ${contract.contract_amount}`);
    }

    // Get invoices for this contract
    const invoices = await getContractInvoices(supabase, contract.id);

    if (invoices.length === 0) {
      result.warnings.push('No invoices found for this contract');
      if (verbose) {
        console.log('  No invoices found');
      }
      result.success = true;
      return result;
    }

    if (verbose) {
      console.log(`  Found ${invoices.length} invoices`);
    }

    // Get existing payment schedules
    const existingSchedules = await getContractPaymentSchedules(supabase, contract.id);
    const existingInvoiceIds = new Set(
      existingSchedules.map(s => s.invoice_id).filter(Boolean)
    );

    if (verbose && existingSchedules.length > 0) {
      console.log(`  Existing payment schedules: ${existingSchedules.length}`);
    }

    // Process each invoice
    for (const invoice of invoices) {
      result.invoicesProcessed++;

      if (verbose) {
        console.log(`\n  Invoice: ${invoice.invoice_number}`);
        console.log(`    Date: ${invoice.invoice_date}`);
        console.log(`    Due Date: ${invoice.due_date || 'N/A'}`);
        console.log(`    Amount: ${invoice.total_amount}`);
        console.log(`    Status: ${invoice.payment_status}`);
      }

      // Validate invoice
      const validation = validateInvoice(invoice);
      if (!validation.valid) {
        result.warnings.push(`Invoice ${invoice.invoice_number}: ${validation.reason}`);
        if (verbose) {
          console.log(`    Skipped: ${validation.reason}`);
        }
        result.schedulesSkipped++;
        continue;
      }

      // Check if schedule already exists
      if (existingInvoiceIds.has(invoice.id)) {
        if (verbose) {
          console.log(`    Already has payment schedule - skipping`);
        }
        result.schedulesSkipped++;
        continue;
      }

      // Calculate installment number
      const installmentNumber = calculateInstallmentNumber(invoice, contract);

      // Generate description
      const description = generateScheduleDescription(invoice, installmentNumber);

      // Determine status
      const status = determineScheduleStatus(invoice);

      // Determine due date (use invoice due date, or invoice date, or calculate based on contract)
      const dueDate = invoice.due_date || invoice.invoice_date;

      // Prepare payment schedule record
      const scheduleRecord = {
        contract_id: contract.id,
        invoice_id: invoice.id,
        company_id: contract.company_id,
        amount: invoice.total_amount,
        due_date: dueDate,
        installment_number: installmentNumber,
        status,
        paid_amount: invoice.payment_status === 'paid' ? invoice.total_amount : null,
        paid_date: invoice.payment_status === 'paid' ? invoice.invoice_date : null,
        description,
        notes: `Auto-generated from invoice ${invoice.invoice_number}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (verbose) {
        console.log(`    Creating payment schedule:`);
        console.log(`      Installment: ${installmentNumber}`);
        console.log(`      Due Date: ${dueDate}`);
        console.log(`      Status: ${status}`);
        console.log(`      Description: ${description}`);
      }

      if (!dryRun) {
        // Insert the payment schedule
        const { error: insertError } = await supabase
          .from('contract_payment_schedules')
          .insert(scheduleRecord);

        if (insertError) {
          const errorMsg = `Failed to create schedule for invoice ${invoice.invoice_number}: ${insertError.message}`;
          result.errors.push(errorMsg);
          if (verbose) {
            console.log(`    ERROR: ${insertError.message}`);
          }
          continue;
        }

        if (verbose) {
          console.log(`    Payment schedule created`);
        }
      } else {
        if (verbose) {
          console.log(`    [DRY RUN] Would create payment schedule`);
        }
      }

      result.schedulesCreated++;
    }

    result.success = result.errors.length === 0;

    if (verbose) {
      console.log(`\n  Summary:`);
      console.log(`    Invoices processed: ${result.invoicesProcessed}`);
      console.log(`    Schedules created: ${result.schedulesCreated}`);
      console.log(`    Schedules skipped: ${result.schedulesSkipped}`);
      console.log(`    Errors: ${result.errors.length}`);
      console.log(`    Warnings: ${result.warnings.length}`);
    }

  } catch (error: any) {
    result.errors.push(error.message || 'Unknown error');
    result.success = false;
  }

  return result;
}

// Main function
async function main() {
  console.log('=== Payment Schedule Generation from Invoices ===\n');

  const args = parseArgs();
  const supabase = getSupabaseClient();

  // Validate arguments
  if (!args.contractId && !args.contractNumber && !args.allContracts) {
    console.error('Error: Must specify --contract-id, --contract-number, or --all-contracts');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  if (args.dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  const results: GenerationResult[] = [];

  try {
    if (args.contractNumber) {
      // Process single contract by number
      console.log(`Fetching contract: ${args.contractNumber}`);

      const { data: contract, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('contract_number', args.contractNumber)
        .single();

      if (error || !contract) {
        console.error(`Contract not found: ${args.contractNumber}`);
        process.exit(1);
      }

      const result = await generatePaymentSchedulesForContract(
        supabase,
        contract,
        args.dryRun,
        args.verbose
      );
      results.push(result);

    } else if (args.contractId) {
      // Process single contract by ID
      console.log(`Fetching contract ID: ${args.contractId}`);

      const { data: contract, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', args.contractId)
        .single();

      if (error || !contract) {
        console.error(`Contract not found: ${args.contractId}`);
        process.exit(1);
      }

      const result = await generatePaymentSchedulesForContract(
        supabase,
        contract,
        args.dryRun,
        args.verbose
      );
      results.push(result);

    } else if (args.allContracts) {
      // Find all contracts with invoices but no payment schedules
      console.log('Scanning for contracts with missing payment schedules...\n');

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, contract_number, company_id, customer_id, contract_amount, monthly_amount, start_date, end_date, contract_type, status')
        .eq('status', 'active')
        .order('contract_number', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch contracts: ${error.message}`);
      }

      console.log(`Found ${contracts.length} active contracts\n`);

      for (const contract of contracts) {
        const result = await generatePaymentSchedulesForContract(
          supabase,
          contract,
          args.dryRun,
          args.verbose
        );
        results.push(result);
      }
    }

    // Print summary
    console.log('\n=== FINAL SUMMARY ===\n');

    const totalCreated = results.reduce((sum, r) => sum + r.schedulesCreated, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.schedulesSkipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(`Total contracts processed: ${results.length}`);
    console.log(`Total payment schedules created: ${totalCreated}`);
    console.log(`Total payment schedules skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log('\n=== ERRORS ===');
      for (const result of results) {
        for (const error of result.errors) {
          console.log(`[${result.contractNumber}] ${error}`);
        }
      }
    }

    if (args.verbose && totalWarnings > 0) {
      console.log('\n=== WARNINGS ===');
      for (const result of results) {
        for (const warning of result.warnings) {
          console.log(`[${result.contractNumber}] ${warning}`);
        }
      }
    }

    if (args.dryRun) {
      console.log('\n[DRY RUN] No changes were made. Run without --dry-run to apply changes.');
    }

    process.exit(totalErrors > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main();
