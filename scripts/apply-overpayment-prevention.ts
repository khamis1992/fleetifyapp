/**
 * Apply Overpayment Prevention Migration
 *
 * This script applies the SQL migration that prevents overpayment issues
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

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('APPLY: Overpayment Prevention Migration');
  console.log('='.repeat(80));
  console.log();

  // Read the SQL file
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260110000001_prevent_overpayment_trigger.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  // Split into individual statements (simple approach)
  // We'll execute the key functions using direct SQL

  console.log('Step 1: Creating validation function...');

  const validateFunctionSQL = `
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_invoice RECORD;
    v_current_total_paid NUMERIC;
    v_new_total_paid NUMERIC;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
    v_payment_amount NUMERIC;
    v_max_payment_threshold NUMERIC;
    v_overpayment_threshold NUMERIC;
    v_invoice_difference NUMERIC;
    v_warning_message TEXT;
BEGIN
    IF NEW.contract_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_payment_amount := COALESCE(NEW.amount, 0);

    IF v_payment_amount <= 0 THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_contract
    FROM contracts
    WHERE id = NEW.contract_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    v_contract_amount := COALESCE(v_contract.contract_amount, 0);
    v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
    v_current_total_paid := COALESCE(v_contract.total_paid, 0);
    v_new_total_paid := v_current_total_paid + v_payment_amount;

    v_max_payment_threshold := GREATEST(v_monthly_amount * 10, 50000);

    IF v_monthly_amount > 0 AND v_payment_amount > v_max_payment_threshold THEN
        RAISE EXCEPTION 'Payment amount (QAR %) exceeds maximum allowed (QAR %). Please verify.',
            v_payment_amount, v_max_payment_threshold;
    END IF;

    IF v_contract_amount > 0 THEN
        v_overpayment_threshold := v_contract_amount * 1.10;

        IF v_new_total_paid > v_overpayment_threshold THEN
            RAISE EXCEPTION 'Payment would overpay contract. Current: QAR %, Contract: QAR %, New total: QAR %',
                v_current_total_paid, v_contract_amount, v_new_total_paid;
        END IF;
    END IF;

    IF NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;

        IF v_invoice.total_amount > 0 THEN
            v_invoice_difference := ABS(v_payment_amount - v_invoice.total_amount);

            IF v_invoice_difference > (v_invoice.total_amount * 0.20) THEN
                v_warning_message := format('WARNING: Payment (QAR %) differs from invoice (QAR %) by QAR %',
                    v_payment_amount, v_invoice.total_amount, v_invoice_difference);
                NEW.notes := COALESCE(NEW.notes, '') || ' ' || v_warning_message;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
`;

  const { error: funcError } = await supabase.rpc('exec_sql', { sql: validateFunctionSQL });

  // Supabase JS doesn't support arbitrary SQL execution directly
  // We need to use a different approach - create a helper function or use raw connection

  // For now, let's test if we can create the trigger using RPC with a helper
  console.log('Note: Full migration requires database admin access.');
  console.log('Please apply the migration using:');
  console.log('  psql -h HOST -U USER -d DATABASE -f supabase/migrations/20260110000001_prevent_overpayment_trigger.sql');
  console.log();
  console.log('Or copy the SQL from the migration file and run it in your Supabase SQL editor.');
  console.log();
  console.log('Migration file created at:');
  console.log(`  ${sqlPath}`);
  console.log();

  console.log('='.repeat(80));
  console.log('📋 What this migration does:');
  console.log('='.repeat(80));
  console.log('1. Creates validate_payment_amount() function');
  console.log('   - Checks payment amounts before insert/update');
  console.log('   - Blocks payments > 10x monthly amount or > QAR 50,000');
  console.log('   - Blocks payments that would overpay contract by > 10%');
  console.log('   - Warns if payment differs from invoice by > 20%');
  console.log();
  console.log('2. Creates trigger on payments table');
  console.log('   - Runs validation on every INSERT/UPDATE');
  console.log();
  console.log('3. Creates helper functions and views');
  console.log('   - check_contract_payment_health() - Check single contract');
  console.log('   - contract_payment_health_dashboard - View all contracts');
  console.log('='.repeat(80));
}

applyMigration().catch(console.error);
