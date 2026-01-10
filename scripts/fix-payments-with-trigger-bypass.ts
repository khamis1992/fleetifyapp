/**
 * Fix Payments - Bypassing the Validation Trigger
 *
 * Temporarily disables the overpayment prevention trigger to fix
 * historical incorrect payments, then re-enables it.
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

async function fixWithBypass() {
  console.log('='.repeat(80));
  console.log('FIXING PAYMENTS (BYPASSING VALIDATION TRIGGER)');
  console.log('='.repeat(80));
  console.log();

  // SQL to bypass trigger and fix payments
  const fixSQL = `
-- Step 1: Disable trigger temporarily
DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON payments;

-- Step 2: Fix the suspicious payments
UPDATE payments
SET amount = 1450,
    notes = 'CORRECTED: Was 70561. Reduced by 69111. Historical data fix - entry error'
WHERE id = '9f9fed27-f063-4d23-9964-a8bbac06de02';

UPDATE payments
SET amount = 1000,
    notes = 'CORRECTED: Was 71101. Reduced by 70101. Historical data fix - entry error'
WHERE id = 'fb9095c7-0c13-4716-9565-8c05eb8c1ebe';

-- Step 3: Recalculate contract totals for affected contracts
UPDATE contracts
SET total_paid = (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.contract_id = contracts.id
),
balance_due = contract_amount - (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.contract_id = contracts.id
)
WHERE id IN ('1c4e5129-841b-423b-a3cc-29f44192204f', '2064a8b1-49fa-4125-a4a2-46df65bc945e');

-- Step 4: Re-enable the trigger
CREATE TRIGGER prevent_overpayment_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_amount();

-- Step 5: Verify
SELECT
    c.contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    p.payment_number,
    p.amount
FROM contracts c
JOIN payments p ON p.contract_id = c.id
WHERE c.id IN ('1c4e5129-841b-423b-a3cc-29f44192204f', '2064a8b1-49fa-4125-a4a2-46df65bc945e')
ORDER BY c.contract_number, p.payment_date;
`;

  // Write SQL to file for manual execution
  const fs = require('fs');
  const outputPath = join(process.cwd(), 'scripts', 'bypass-trigger-fix.sql');
  fs.writeFileSync(outputPath, fixSQL);

  console.log('SQL file generated at:');
  console.log(`  ${outputPath}`);
  console.log();

  console.log('⚠️  The payment validation trigger is preventing historical fixes.');
  console.log();
  console.log('Please apply this fix by:');
  console.log('1. Go to Supabase SQL Editor');
  console.log(`2. Copy and run the SQL from: ${outputPath}`);
  console.log('3. The SQL will:');
  console.log('   - Temporarily disable the trigger');
  console.log('   - Fix the 2 suspicious payments');
  console.log('   - Recalculate contract totals');
  console.log('   - Re-enable the trigger');
  console.log();

  console.log('After applying, verify by running:');
  console.log('  npx tsx scripts/scan-all-contracts-overpayments.ts');
  console.log();

  console.log('='.repeat(80));
}

fixWithBypass().catch(console.error);
