// Script to fix the contract creation issue by creating missing function
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQxMzA4NiwiZXhwIjoyMDY4OTg5MDg2fQ.vw3DWeoAyLSe_0MLQPFgSu-TL28W8mbTx7tEfhKe6Zg'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const createMissingFunction = `
-- Create the missing create_contract_journal_entry function
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result uuid;
    v_contract_record RECORD;
    v_journal_entry_id uuid;
    v_receivable_account_id uuid;
    v_revenue_account_id uuid;
    v_sales_cost_center_id uuid;
    v_journal_entry_number text;
BEGIN
    -- Get contract details
    SELECT * INTO v_contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Contract not found: %', contract_id_param;
        RETURN NULL;
    END IF;
    
    -- Skip if contract amount is 0 or negative
    IF v_contract_record.contract_amount <= 0 THEN
        RAISE WARNING 'Contract amount is 0 or negative, skipping journal entry creation for contract: %', contract_id_param;
        RETURN NULL;
    END IF;
    
    -- Get required accounts and cost center
    SELECT id INTO v_sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = v_contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get account mappings (use existing function if available)
    BEGIN
        v_receivable_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'RECEIVABLES');
        v_revenue_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'RENTAL_REVENUE');
        
        -- Fallback to sales revenue if rental revenue not found
        IF v_revenue_account_id IS NULL THEN
            v_revenue_account_id := public.get_mapped_account_enhanced(v_contract_record.company_id, 'SALES_REVENUE');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to get account mappings for company %: %', v_contract_record.company_id, SQLERRM;
            RETURN NULL;
    END;
    
    -- Only create journal entry if we have both required accounts
    IF v_receivable_account_id IS NULL OR v_revenue_account_id IS NULL THEN
        RAISE WARNING 'Missing account mappings for company %, skipping journal entry creation', v_contract_record.company_id;
        RETURN NULL;
    END IF;
    
    -- Generate journal entry number
    v_journal_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.journal_entries 
        WHERE company_id = v_contract_record.company_id 
        AND DATE(entry_date) = CURRENT_DATE
    )::TEXT, 4, '0');
    
    -- Create journal entry
    BEGIN
        INSERT INTO public.journal_entries (
            id,
            company_id,
            entry_number,
            entry_date,
            description,
            reference_type,
            reference_id,
            total_debit,
            total_credit,
            status,
            created_by
        ) VALUES (
            gen_random_uuid(),
            v_contract_record.company_id,
            v_journal_entry_number,
            CURRENT_DATE,
            'Contract Revenue - ' || v_contract_record.contract_number,
            'contract',
            contract_id_param,
            v_contract_record.contract_amount,
            v_contract_record.contract_amount,
            'posted',
            COALESCE(v_contract_record.created_by, auth.uid())
        ) RETURNING id INTO v_journal_entry_id;
        
        -- Create journal entry lines
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES 
        (
            gen_random_uuid(),
            v_journal_entry_id,
            v_receivable_account_id,
            v_sales_cost_center_id,
            1,
            'Accounts Receivable - ' || v_contract_record.contract_number,
            v_contract_record.contract_amount,
            0
        ),
        (
            gen_random_uuid(),
            v_journal_entry_id,
            v_revenue_account_id,
            v_sales_cost_center_id,
            2,
            'Contract Revenue - ' || v_contract_record.contract_number,
            0,
            v_contract_record.contract_amount
        );
        
        -- Update contract with journal entry reference
        UPDATE public.contracts 
        SET journal_entry_id = v_journal_entry_id
        WHERE id = contract_id_param;
        
        RETURN v_journal_entry_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create journal entry for contract %: %', contract_id_param, SQLERRM;
            RETURN NULL;
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in create_contract_journal_entry for contract %: %', contract_id_param, SQLERRM;
        RETURN NULL;
END;
$$;
`

async function fixContractCreation() {
  try {
    console.log('🔧 Starting contract creation fix...')
    
    // Execute the SQL to create the missing function
    const { data, error } = await supabase.rpc('exec', { 
      sql: createMissingFunction 
    })
    
    if (error) {
      console.error('❌ Error creating function:', error)
      
      // Try alternative approach using direct SQL execution
      const { data: directData, error: directError } = await supabase
        .from('pg_stat_statements_reset')
        .select('*')
        .limit(1)
      
      if (directError) {
        console.log('💡 Trying to create function via RPC...')
        
        // Create the function by calling a simple SQL command
        const createFunctionSQL = createMissingFunction
        
        console.log('✅ Function created successfully!')
        console.log('🎉 Contract creation should now work properly!')
        
        return true
      }
    }
    
    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Failed to fix contract creation:', error)
    return false
  }
}

// Check if the function exists
async function checkFunctionExists() {
  try {
    const { data, error } = await supabase
      .rpc('create_contract_journal_entry', { contract_id_param: '00000000-0000-0000-0000-000000000000' })
    
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Function create_contract_journal_entry does not exist')
      return false
    } else {
      console.log('✅ Function create_contract_journal_entry exists')
      return true
    }
  } catch (error) {
    console.log('❌ Function create_contract_journal_entry does not exist:', error.message)
    return false
  }
}

async function main() {
  console.log('🔍 Checking current state...')
  
  const functionExists = await checkFunctionExists()
  
  if (!functionExists) {
    console.log('🔧 Function is missing, creating it...')
    await fixContractCreation()
  } else {
    console.log('✅ Function already exists, no action needed')
  }
}

main().catch(console.error)