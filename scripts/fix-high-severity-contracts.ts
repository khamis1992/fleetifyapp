/**
 * Fix High-Severity Contracts
 *
 * This script investigates and fixes the 33 high-severity contracts
 * identified in the scan.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ContractIssue {
  contract_number: string;
  contract_id: string;
  contract_amount: number;
  total_paid: number;
  balance_due: number;
  issue_type: 'zero_amount_with_payments' | 'actual_overpayment';
  overpayment: number;
}

interface ContractInvestigation {
  contract_number: string;
  contract_id: string;
  contract_amount: number;
  total_paid: number;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  invoice_count: number;
  total_invoice_amount: number;
  payment_count: number;
  payments: any[];
  invoices: any[];
  suggested_contract_amount: number;
  fix_type: 'set_contract_amount' | 'fix_payment_amount' | 'needs_manual_review';
  fix_description: string;
}

// High severity contracts from scan
const HIGH_SEVERITY_CONTRACTS = [
  '319', 'AGR-202504-424958', 'C-ALF-0001', 'C-ALF-0068', 'C-ALF-0077',
  'C-ALF-0083', 'LTO2024100', 'LTO2024103', 'LTO2024104', 'LTO2024115',
  'LTO2024124', 'LTO2024156', 'LTO2024248', 'LTO2024251', 'LTO2024261',
  'LTO2024263', 'LTO202427', 'LTO2024270', 'LTO2024273', 'LTO2024285',
  'LTO202429', 'LTO2024340', 'LTO202437', 'LTO202453', 'LTO202494',
  'MR2024181', 'MR2024232', 'MR202476', 'Ret-2018212', 'Ret-2018218'
];

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
    } catch (error) {}
  }
  return env;
}

const env = loadEnv();
let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim();
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) supabaseKey = supabaseKey.slice(1, -1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateContract(contractNumber: string): Promise<ContractInvestigation | null> {
  // Get contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', contractNumber)
    .single();

  if (!contract) return null;

  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', contract.id);

  // Get payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', contract.id)
    .order('payment_date', { ascending: false });

  const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

  // Determine fix type
  let fixType: ContractInvestigation['fix_type'] = 'needs_manual_review';
  let fixDescription = 'Needs manual investigation';
  let suggestedAmount = contract.contract_amount || 0;

  if (contract.contract_amount === 0 && totalInvoiceAmount > 0) {
    // Contract has 0 amount but has invoices - use invoice total
    fixType = 'set_contract_amount';
    suggestedAmount = totalInvoiceAmount;
    fixDescription = `Set contract amount to QAR ${totalInvoiceAmount.toLocaleString()} based on invoice total`;
  } else if (contract.contract_amount === 0 && payments && payments.length > 0) {
    // Contract has 0 amount and payments but no invoices
    fixType = 'set_contract_amount';
    // Calculate from monthly amount * duration if available
    if (contract.monthly_amount && contract.start_date && contract.end_date) {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                     (endDate.getMonth() - startDate.getMonth()) + 1;
      suggestedAmount = contract.monthly_amount * months;
      fixDescription = `Set contract amount to QAR ${suggestedAmount.toLocaleString()} (${months} months × QAR ${contract.monthly_amount})`;
    } else {
      suggestedAmount = contract.total_paid || 0;
      fixDescription = `Set contract amount to QAR ${suggestedAmount.toLocaleString()} based on total paid`;
    }
  } else if (contract.contract_amount > 0 && contract.total_paid > contract.contract_amount) {
    // Actual overpayment - need to investigate payments
    fixType = 'fix_payment_amount';
    fixDescription = `Overpayment of QAR ${(contract.total_paid - contract.contract_amount).toLocaleString()} - check payments`;
    suggestedAmount = contract.contract_amount;
  }

  return {
    contract_number: contract.contract_number,
    contract_id: contract.id,
    contract_amount: contract.contract_amount || 0,
    total_paid: contract.total_paid || 0,
    monthly_amount: contract.monthly_amount || 0,
    start_date: contract.start_date,
    end_date: contract.end_date,
    invoice_count: invoices?.length || 0,
    total_invoice_amount: totalInvoiceAmount,
    payment_count: payments?.length || 0,
    payments: payments || [],
    invoices: invoices || [],
    suggested_contract_amount: suggestedAmount,
    fix_type: fixType,
    fix_description: fixDescription
  };
}

async function fixHighSeverityContracts() {
  console.log('='.repeat(80));
  console.log('FIX: High-Severity Contracts');
  console.log('='.repeat(80));
  console.log();

  const investigations: ContractInvestigation[] = [];

  console.log(`Investigating ${HIGH_SEVERITY_CONTRACTS.length} high-severity contracts...`);
  console.log();

  for (let i = 0; i < HIGH_SEVERITY_CONTRACTS.length; i++) {
    const contractNumber = HIGH_SEVERITY_CONTRACTS[i];
    const progress = Math.round(((i + 1) / HIGH_SEVERITY_CONTRACTS.length) * 100);

    process.stdout.write(`\r[${progress}%] Investigating ${contractNumber}...`);

    const investigation = await investigateContract(contractNumber);
    if (investigation) {
      investigations.push(investigation);
    }
  }

  console.log();
  console.log();

  // Group by fix type
  const zeroAmountFixes = investigations.filter(i => i.fix_type === 'set_contract_amount');
  const paymentFixes = investigations.filter(i => i.fix_type === 'fix_payment_amount');
  const manualReviews = investigations.filter(i => i.fix_type === 'needs_manual_review');

  console.log('='.repeat(80));
  console.log('INVESTIGATION RESULTS');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total Investigated: ${investigations.length}`);
  console.log(`Contract Amount = 0 (need amount set): ${zeroAmountFixes.length}`);
  console.log(`Actual Overpayments (need payment fix): ${paymentFixes.length}`);
  console.log(`Needs Manual Review: ${manualReviews.length}`);
  console.log();

  // Category 1: Contracts with QAR 0 amount
  if (zeroAmountFixes.length > 0) {
    console.log('─'.repeat(80));
    console.log('CATEGORY 1: Contracts with QAR 0 Amount (Can Auto-Fix)');
    console.log('─'.repeat(80));
    console.log();

    zeroAmountFixes.forEach(inv => {
      console.log(`Contract: ${inv.contract_number}`);
      console.log(`  Current Amount: QAR ${inv.contract_amount.toLocaleString()}`);
      console.log(`  Total Paid: QAR ${inv.total_paid.toLocaleString()}`);
      console.log(`  Invoice Count: ${inv.invoice_count}`);
      console.log(`  Invoice Total: QAR ${inv.total_invoice_amount.toLocaleString()}`);
      console.log(`  Suggested Amount: QAR ${inv.suggested_contract_amount.toLocaleString()}`);
      console.log(`  Fix: ${inv.fix_description}`);
      console.log();
    });
  }

  // Category 2: Actual overpayments
  if (paymentFixes.length > 0) {
    console.log('─'.repeat(80));
    console.log('CATEGORY 2: Actual Overpayments (Need Payment Investigation)');
    console.log('─'.repeat(80));
    console.log();

    paymentFixes.forEach(inv => {
      console.log(`Contract: ${inv.contract_number}`);
      console.log(`  Contract Amount: QAR ${inv.contract_amount.toLocaleString()}`);
      console.log(`  Total Paid: QAR ${inv.total_paid.toLocaleString()}`);
      console.log(`  Overpayment: QAR ${(inv.total_paid - inv.contract_amount).toLocaleString()}`);
      console.log();

      // Find suspicious payments
      const avgPayment = inv.payments.reduce((sum, p) => sum + (p.amount || 0), 0) / inv.payments.length;
      const threshold = Math.max((inv.monthly_amount || 0) * 5, avgPayment * 5);

      console.log(`  Payments:`);
      inv.payments.forEach(p => {
        const isSuspicious = (p.amount || 0) > threshold && (p.amount || 0) > 5000;
        console.log(`    - ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()}${isSuspicious ? ' ⚠️ SUSPICIOUS' : ''}`);
      });
      console.log();
    });
  }

  // Generate fix SQL
  console.log('='.repeat(80));
  console.log('GENERATING FIX SQL');
  console.log('='.repeat(80));
  console.log();

  const fixStatements: string[] = [];

  // Fix 1: Set contract amounts
  zeroAmountFixes.forEach(inv => {
    fixStatements.push(`-- Contract: ${inv.contract_number}`);
    fixStatements.push(`-- ${inv.fix_description}`);
    fixStatements.push(`UPDATE contracts`);
    fixStatements.push(`SET contract_amount = ${inv.suggested_contract_amount}`);
    fixStatements.push(`WHERE id = '${inv.contract_id}';`);
    fixStatements.push('');
  });

  // Fix 2: Flag contracts needing payment investigation
  if (paymentFixes.length > 0) {
    fixStatements.push(`-- Contracts needing payment investigation`);
    paymentFixes.forEach(inv => {
      fixStatements.push(`-- Contract: ${inv.contract_number} - Overpayment: QAR ${(inv.total_paid - inv.contract_amount).toLocaleString()}`);
    });
    fixStatements.push('');
    fixStatements.push(`-- These contracts have suspicious payment amounts that need manual review`);
    fixStatements.push(`-- Run: npx tsx scripts/investigate-contract-payments.ts ${paymentFixes.map(i => i.contract_number).join(' ')}`);
    fixStatements.push('');
  }

  const fixSQL = `
-- ==========================================
-- Auto-Generated Fix SQL for High-Severity Contracts
-- Generated: ${new Date().toISOString()}
-- ==========================================
-- IMPORTANT: Review this SQL before running!
-- Run in your Supabase SQL Editor
-- ==========================================

${fixStatements.join('\n')}

-- ==========================================
-- Verification Query
-- ==========================================
SELECT
    contract_number,
    contract_amount,
    total_paid,
    balance_due,
    CASE
        WHEN contract_amount = 0 THEN 'ZERO_AMOUNT'
        WHEN total_paid > contract_amount THEN 'OVERPAID'
        ELSE 'OK'
    END AS status
FROM contracts
WHERE contract_number IN (${HIGH_SEVERITY_CONTRACTS.map(c => `'${c}'`).join(', ')})
ORDER BY
    CASE
        WHEN contract_amount = 0 THEN 1
        WHEN total_paid > contract_amount THEN 2
        ELSE 3
    END,
    total_paid DESC;
`;

  const outputPath = join(process.cwd(), 'scripts', 'generated-fix-high-severity.sql');
  writeFileSync(outputPath, fixSQL);

  console.log('✅ Fix SQL generated at:');
  console.log(`   ${outputPath}`);
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total Contracts: ${investigations.length}`);
  console.log();
  console.log('Auto-Fix Available:');
  console.log(`  - ${zeroAmountFixes.length} contracts can have their amount set automatically`);
  console.log();
  console.log('Manual Review Required:');
  console.log(`  - ${paymentFixes.length} contracts need payment investigation`);
  console.log(`  - ${manualReviews.length} contracts need full manual review`);
  console.log();

  // Estimate impact
  const totalOverpayment = investigations.reduce((sum, i) => {
    if (i.contract_amount > 0 && i.total_paid > i.contract_amount) {
      return sum + (i.total_paid - i.contract_amount);
    }
    return sum;
  }, 0);

  console.log(`Total Overpayment to Fix: QAR ${totalOverpayment.toLocaleString()}`);
  console.log();

  console.log('Next Steps:');
  console.log('1. Review the generated SQL file');
  console.log('2. Apply the contract amount fixes in Supabase SQL Editor');
  console.log('3. For overpayment contracts, investigate payments individually');
  console.log('4. Run verification query to confirm fixes');
  console.log();

  console.log('='.repeat(80));
}

fixHighSeverityContracts()
  .then(() => {
    console.log('✅ Investigation complete!');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
