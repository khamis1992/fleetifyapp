/**
 * Apply Overpayment Prevention Trigger
 *
 * This script executes the SQL migration to add payment validation triggers
 * Since Supabase JS client doesn't support DDL execution directly,
 * we use the rpc approach or provide instructions for manual execution
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

// Split SQL into individual statements
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

    SELECT * INTO v_contract FROM contracts WHERE id = NEW.contract_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

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

const checkHealthFunctionSQL = `
CREATE OR REPLACE FUNCTION check_contract_payment_health(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_result JSONB;
    v_health_status TEXT;
    v_issues TEXT[];
BEGIN
    SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Contract not found', 'contract_id', p_contract_id);
    END IF;

    v_issues := '{}';

    IF v_contract.contract_amount > 0 AND v_contract.total_paid > v_contract.contract_amount THEN
        v_health_status := 'overpaid';
        v_issues := v_issues || format('Overpaid by QAR %', v_contract.total_paid - v_contract.contract_amount);
    ELSIF v_contract.contract_amount > 0 AND v_contract.total_paid > (v_contract.contract_amount * 0.90) THEN
        v_health_status := 'nearly_complete';
    ELSIF v_contract.total_paid > 0 THEN
        v_health_status := 'active';
    ELSE
        v_health_status := 'no_payments';
    END IF;

    IF v_contract.contract_amount = 0 AND v_contract.total_paid > 0 THEN
        v_health_status := 'needs_review';
        v_issues := v_issues || format('Contract has QAR 0 amount but QAR % in payments', v_contract.total_paid);
    END IF;

    v_result := jsonb_build_object(
        'contract_id', p_contract_id,
        'contract_number', v_contract.contract_number,
        'health_status', v_health_status,
        'contract_amount', v_contract.contract_amount,
        'total_paid', v_contract.total_paid,
        'balance_due', v_contract.balance_due,
        'payment_percentage', CASE WHEN v_contract.contract_amount > 0 THEN
            ROUND((v_contract.total_paid / v_contract.contract_amount * 100)::numeric, 2) ELSE NULL END,
        'issues', v_issues,
        'is_healthy', CASE WHEN v_health_status IN ('overpaid', 'needs_review') THEN false ELSE true END
    );

    RETURN v_result;
END;
$$;
`;

const dashboardViewSQL = `
CREATE OR REPLACE VIEW contract_payment_health_dashboard AS
SELECT
    c.id AS contract_id,
    c.contract_number,
    c.contract_type,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    c.monthly_amount,
    c.status AS contract_status,
    c.start_date,
    c.end_date,
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 0 THEN 'needs_review'
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 'overpaid'
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 0.90) THEN 'nearly_complete'
        WHEN c.total_paid > 0 THEN 'active'
        ELSE 'no_payments'
    END AS payment_health,
    CASE WHEN c.contract_amount > 0 THEN ROUND((c.total_paid / c.contract_amount * 100)::numeric, 2) ELSE NULL END AS payment_percentage,
    CASE WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN c.total_paid - c.contract_amount ELSE NULL END AS overpayment_amount,
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN true
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 1.10) THEN true
        ELSE false
    END AS needs_review
FROM contracts c
WHERE c.is_active = true
ORDER BY
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN 1
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 2
        ELSE 3
    END,
    c.total_paid DESC;
`;

const dropTriggerSQL = `DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON payments;`;

const createTriggerSQL = `
CREATE TRIGGER prevent_overpayment_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_amount();
`;

const grantPermissionsSQL = `
GRANT EXECUTE ON FUNCTION validate_payment_amount TO authenticated;
GRANT EXECUTE ON FUNCTION check_contract_payment_health TO authenticated;
GRANT SELECT ON contract_payment_health_dashboard TO authenticated;
`;

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('APPLYING OVERPAYMENT PREVENTION TRIGGER');
  console.log('='.repeat(80));
  console.log();

  const statements = [
    { name: 'Validate Payment Function', sql: validateFunctionSQL },
    { name: 'Check Contract Health Function', sql: checkHealthFunctionSQL },
    { name: 'Dashboard View', sql: dashboardViewSQL },
    { name: 'Drop Old Trigger', sql: dropTriggerSQL },
    { name: 'Create Trigger', sql: createTriggerSQL },
    { name: 'Grant Permissions', sql: grantPermissionsSQL },
  ];

  // Since Supabase JS client doesn't support DDL directly,
  // we'll create an RPC function to execute the SQL
  console.log('Creating SQL execution helper...');

  const helperSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_command TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_command;
    RETURN 'OK';
END;
$$;
  `;

  // First, try to create the helper function using rpc
  try {
    // We need to execute the SQL directly
    console.log();
    console.log('⚠️  Supabase JS client does not support DDL execution directly.');
    console.log();
    console.log('Please apply the migration using one of these methods:');
    console.log();
    console.log('Option 1: Supabase Dashboard (Recommended)');
    console.log('  1. Go to https://app.supabase.com');
    console.log('  2. Select your project');
    console.log('  3. Go to SQL Editor');
    console.log('  4. Copy and paste the SQL from:');
    console.log(`     ${join(process.cwd(), 'supabase/migrations/20260110000001_prevent_overpayment_trigger.sql')}`);
    console.log();
    console.log('Option 2: Using psql command line');
    console.log(`  psql "${supabaseUrl.replace('https://', 'postgresql://postgres:').replace('/rest/v1', '/postgres')}" -f supabase/migrations/20260110000001_prevent_overpayment_trigger.sql`);
    console.log();
    console.log('Option 3: Generate SQL file to run manually');
    console.log('  See: scripts/generated-apply-trigger.sql');
    console.log();

    // Write the combined SQL to a file for easy execution
    const combinedSQL = `
-- ==========================================
-- Overpayment Prevention Trigger Migration
-- Auto-generated by apply-overpayment-trigger.ts
-- ==========================================

${validateFunctionSQL}

${checkHealthFunctionSQL}

${dashboardViewSQL}

${dropTriggerSQL}

${createTriggerSQL}

${grantPermissionsSQL}

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('validate_payment_amount', 'check_contract_payment_health');

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
AND trigger_name = 'prevent_overpayment_trigger';

-- Check if view exists
SELECT table_name, table_type
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'contract_payment_health_dashboard';
`;

    const outputPath = join(process.cwd(), 'scripts', 'generated-apply-trigger.sql');
    const fs = require('fs');
    fs.writeFileSync(outputPath, combinedSQL);

    console.log('✅ Generated SQL file at:');
    console.log(`   ${outputPath}`);
    console.log();
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

applyMigration().catch(console.error);
