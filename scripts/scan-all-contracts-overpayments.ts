/**
 * Scan All Contracts for Overpayment Issues
 *
 * This script checks all contracts for:
 * 1. Total paid exceeding contract amount
 * 2. Negative balance due
 * 3. Suspiciously large individual payments
 * 4. Missing payment schedules
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ContractIssue {
  contract_number: string;
  contract_id: string;
  contract_amount: number;
  total_paid: number;
  balance_due: number;
  issue_type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggested_action: string;
}

interface PaymentAnalysis {
  payment_number: string;
  amount: number;
  invoice_id: string | null;
  invoice_number: string | null;
  expected_amount: number | null;
  difference: number | null;
}

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanAllContracts() {
  console.log('='.repeat(80));
  console.log('SCAN: All Contracts for Overpayment Issues');
  console.log('='.repeat(80));
  console.log();

  const issues: ContractIssue[] = [];
  const suspiciousPayments: PaymentAnalysis[] = [];

  // Get all contracts
  console.log('Fetching all contracts...');
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('*')
    .order('contract_number');

  if (contractsError) {
    console.error('Error fetching contracts:', contractsError.message);
    return;
  }

  if (!contracts || contracts.length === 0) {
    console.log('No contracts found');
    return;
  }

  console.log(`Found ${contracts.length} contracts`);
  console.log();

  // Check each contract
  for (const contract of contracts) {
    const contractAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = contract.balance_due || 0;

    // Issue 1: Negative balance due (overpayment)
    if (balanceDue < 0) {
      const overpayment = Math.abs(balanceDue);
      issues.push({
        contract_number: contract.contract_number,
        contract_id: contract.id,
        contract_amount: contractAmount,
        total_paid: totalPaid,
        balance_due: balanceDue,
        issue_type: 'negative_balance',
        severity: overpayment > 10000 ? 'high' : overpayment > 5000 ? 'medium' : 'low',
        description: `Contract has been overpaid by QAR ${overpayment.toLocaleString()}`,
        suggested_action: 'Review payments and correct any incorrect payment amounts'
      });
    }

    // Issue 2: Total paid exceeds contract amount
    if (totalPaid > contractAmount && contractAmount > 0) {
      const overpayment = totalPaid - contractAmount;
      issues.push({
        contract_number: contract.contract_number,
        contract_id: contract.id,
        contract_amount: contractAmount,
        total_paid: totalPaid,
        balance_due: balanceDue,
        issue_type: 'overpayment',
        severity: overpayment > 10000 ? 'high' : overpayment > 5000 ? 'medium' : 'low',
        description: `Total paid (QAR ${totalPaid.toLocaleString()}) exceeds contract amount (QAR ${contractAmount.toLocaleString()}) by QAR ${overpayment.toLocaleString()}`,
        suggested_action: 'Review payments for incorrect amounts'
      });
    }

    // Issue 3: Check for suspiciously large individual payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*, invoices!inner(invoice_number, total_amount)')
      .eq('contract_id', contract.id);

    if (payments && payments.length > 0) {
      // Calculate average payment amount
      const avgPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length;
      const monthlyAmount = contract.monthly_amount || 0;

      for (const payment of payments) {
        const paymentAmount = payment.amount || 0;
        const invoiceData = payment.invoices as any;

        // Flag payments that are more than 5x the average or monthly amount
        const threshold = Math.max(avgPayment * 5, monthlyAmount * 3);

        if (paymentAmount > threshold && paymentAmount > 5000) {
          const expectedAmount = invoiceData?.total_amount || monthlyAmount;
          const difference = paymentAmount - expectedAmount;

          suspiciousPayments.push({
            payment_number: payment.payment_number,
            amount: paymentAmount,
            invoice_id: payment.invoice_id,
            invoice_number: invoiceData?.invoice_number || null,
            expected_amount: expectedAmount,
            difference: difference
          });
        }
      }
    }

    // Issue 4: Missing payment schedules
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('contract_id', contract.id);

    const { count: scheduleCount } = await supabase
      .from('contract_payment_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('contract_id', contract.id);

    if (invoices && invoices.length > 0 && scheduleCount !== null && scheduleCount < invoices.length) {
      issues.push({
        contract_number: contract.contract_number,
        contract_id: contract.id,
        contract_amount: contractAmount,
        total_paid: totalPaid,
        balance_due: balanceDue,
        issue_type: 'missing_schedules',
        severity: 'low',
        description: `Contract has ${invoices.length} invoices but only ${scheduleCount} payment schedules`,
        suggested_action: 'Generate missing payment schedules using the migration function'
      });
    }
  }

  // Report results
  console.log('='.repeat(80));
  console.log('SCAN RESULTS');
  console.log('='.repeat(80));
  console.log();

  // Group issues by severity
  const highSeverityIssues = issues.filter(i => i.severity === 'high');
  const mediumSeverityIssues = issues.filter(i => i.severity === 'medium');
  const lowSeverityIssues = issues.filter(i => i.severity === 'low');

  console.log(`🔴 HIGH SEVERITY: ${highSeverityIssues.length} issues`);
  console.log(`🟡 MEDIUM SEVERITY: ${mediumSeverityIssues.length} issues`);
  console.log(`🟢 LOW SEVERITY: ${lowSeverityIssues.length} issues`);
  console.log();

  if (suspiciousPayments.length > 0) {
    console.log(`⚠️  SUSPICIOUS PAYMENTS: ${suspiciousPayments.length} found`);
    console.log();
  }

  // Print high severity issues
  if (highSeverityIssues.length > 0) {
    console.log('─'.repeat(80));
    console.log('🔴 HIGH SEVERITY ISSUES (Requires Immediate Attention)');
    console.log('─'.repeat(80));
    highSeverityIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. Contract: ${issue.contract_number}`);
      console.log(`   Amount: QAR ${issue.contract_amount.toLocaleString()} | Paid: QAR ${issue.total_paid.toLocaleString()} | Balance: QAR ${issue.balance_due.toLocaleString()}`);
      console.log(`   Issue: ${issue.description}`);
      console.log(`   Action: ${issue.suggested_action}`);
      console.log();
    });
  }

  // Print medium severity issues
  if (mediumSeverityIssues.length > 0) {
    console.log('─'.repeat(80));
    console.log('🟡 MEDIUM SEVERITY ISSUES');
    console.log('─'.repeat(80));
    mediumSeverityIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. Contract: ${issue.contract_number}`);
      console.log(`   Issue: ${issue.description}`);
      console.log(`   Action: ${issue.suggested_action}`);
      console.log();
    });
  }

  // Print suspicious payments
  if (suspiciousPayments.length > 0) {
    console.log('─'.repeat(80));
    console.log('⚠️  SUSPICIOUS PAYMENTS (Possible Incorrect Amounts)');
    console.log('─'.repeat(80));
    suspiciousPayments.forEach((payment, idx) => {
      console.log(`${idx + 1}. Payment: ${payment.payment_number}`);
      console.log(`   Amount: QAR ${payment.amount.toLocaleString()}`);
      if (payment.invoice_number) {
        console.log(`   Invoice: ${payment.invoice_number} (Expected: QAR ${payment.expected_amount?.toLocaleString()})`);
      }
      console.log(`   Difference: QAR ${payment.difference?.toLocaleString()} more than expected`);
      console.log();
    });
  }

  // Print low severity issues
  if (lowSeverityIssues.length > 0) {
    console.log('─'.repeat(80));
    console.log('🟢 LOW SEVERITY ISSUES');
    console.log('─'.repeat(80));
    lowSeverityIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. Contract: ${issue.contract_number}`);
      console.log(`   Issue: ${issue.description}`);
      console.log();
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Contracts Scanned: ${contracts.length}`);
  console.log(`Total Issues Found: ${issues.length}`);
  console.log(`Suspicious Payments: ${suspiciousPayments.length}`);
  console.log();

  if (issues.length === 0 && suspiciousPayments.length === 0) {
    console.log('✅ No issues found! All contracts are healthy.');
  } else {
    console.log('⚠️  Issues were found. Please review and fix them.');
    console.log();
    console.log('Recommended next steps:');
    console.log('1. Review high severity issues immediately');
    console.log('2. Investigate suspicious payments');
    console.log('3. Generate missing payment schedules');
    console.log('4. Apply the prevention trigger to avoid future issues');
  }

  console.log('='.repeat(80));

  // Export to JSON for further processing
  const report = {
    scan_date: new Date().toISOString(),
    total_contracts: contracts.length,
    issues_found: issues.length,
    suspicious_payments: suspiciousPayments.length,
    high_severity: highSeverityIssues.length,
    medium_severity: mediumSeverityIssues.length,
    low_severity: lowSeverityIssues.length,
    issues: issues,
    suspicious_payments: suspiciousPayments
  };

  return report;
}

scanAllContracts()
  .then((report) => {
    console.log();
    console.log('📄 Report generated. You can access it programmatically if needed.');
    return report;
  })
  .catch((error) => {
    console.error('❌ Error during scan:', error);
    process.exit(1);
  });
