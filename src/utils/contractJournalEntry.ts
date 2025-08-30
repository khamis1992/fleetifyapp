// Utility functions for contract journal entry creation
// This provides a fallback when database functions are not available

import { supabase } from '@/integrations/supabase/client'

export interface ContractJournalEntryResult {
  success: boolean
  journal_entry_id?: string
  journal_entry_number?: string
  error?: string
}

/**
 * Ensure essential account mappings exist for contract creation
 * This function forcefully creates the required account mappings using correct schema
 */
async function ensureEssentialAccountMappings(companyId: string): Promise<void> {
  console.log('🔧 [ACCOUNT_MAPPINGS] Starting comprehensive account mapping setup for company:', companyId)
  
  const essentialMappings = [
    { typeCode: 'RECEIVABLES', accountType: 'assets', accountName: 'ذمم العملاء', accountCode: '1201' },
    { typeCode: 'RENTAL_REVENUE', accountType: 'revenue', accountName: 'إيرادات تأجير المركبات', accountCode: '4101' },
    { typeCode: 'REVENUE', accountType: 'revenue', accountName: 'إيرادات عامة', accountCode: '4100' },
    { typeCode: 'SALES_REVENUE', accountType: 'revenue', accountName: 'إيرادات المبيعات', accountCode: '4102' }
  ]
  
  for (const mapping of essentialMappings) {
    try {
      console.log(`🔍 [ACCOUNT_MAPPINGS] Processing ${mapping.typeCode}...`)
      
      // First get the default account type ID
      const { data: defaultAccountType } = await supabase
        .from('default_account_types')
        .select('id')
        .eq('type_code', mapping.typeCode)
        .maybeSingle()
        
      if (!defaultAccountType) {
        console.warn(`⚠️ [ACCOUNT_MAPPINGS] Default account type ${mapping.typeCode} not found, skipping...`)
        continue
      }
      
      // Check if mapping already exists
      const { data: existingMapping } = await supabase
        .from('account_mappings')
        .select('id, chart_of_accounts_id, chart_of_accounts(id, account_name)')
        .eq('company_id', companyId)
        .eq('default_account_type_id', defaultAccountType.id)
        .eq('is_active', true)
        .maybeSingle()
        
      if (existingMapping && existingMapping.chart_of_accounts) {
        console.log(`✅ [ACCOUNT_MAPPINGS] Mapping for ${mapping.typeCode} already exists -> ${existingMapping.chart_of_accounts_id}`)
        continue
      }
      
      // Find or create the account
      let accountId: string
      
      // Look for existing account of the right type
      const { data: existingAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_name')
        .eq('company_id', companyId)
        .eq('account_type', mapping.accountType)
        .eq('is_active', true)
        .eq('is_header', false)
        .order('created_at', { ascending: true })
        
      if (existingAccounts && existingAccounts.length > 0) {
        accountId = existingAccounts[0].id
        console.log(`📋 [ACCOUNT_MAPPINGS] Using existing ${mapping.accountType} account: ${accountId} (${existingAccounts[0].account_name})`)
      } else {
        // Create new account
        console.log(`🆕 [ACCOUNT_MAPPINGS] Creating new account for ${mapping.typeCode}...`)
        
        const { data: newAccount, error: createError } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: companyId,
            account_code: mapping.accountCode,
            account_name: mapping.accountName,
            account_type: mapping.accountType,
            balance_type: mapping.accountType === 'assets' ? 'debit' : 'credit',
            is_active: true,
            is_header: false,
            account_level: 2,
            parent_account_id: null,
            current_balance: 0
          })
          .select('id')
          .single()
          
        if (createError || !newAccount) {
          console.error(`❌ [ACCOUNT_MAPPINGS] Failed to create ${mapping.typeCode} account:`, createError)
          throw new Error(`Failed to create account for ${mapping.typeCode}: ${createError?.message}`)
        }
        
        accountId = newAccount.id
        console.log(`✅ [ACCOUNT_MAPPINGS] Created new account ${accountId} for ${mapping.typeCode}`)
      }
      
      // Remove any existing mappings for this type to avoid conflicts
      await supabase
        .from('account_mappings')
        .delete()
        .eq('company_id', companyId)
        .eq('default_account_type_id', defaultAccountType.id)
        
      // Create the new mapping with correct schema
      const { error: mappingError } = await supabase
        .from('account_mappings')
        .insert({
          company_id: companyId,
          default_account_type_id: defaultAccountType.id,
          chart_of_accounts_id: accountId,
          is_active: true
        })
        
      if (mappingError) {
        console.error(`❌ [ACCOUNT_MAPPINGS] Failed to create ${mapping.typeCode} mapping:`, mappingError)
        throw new Error(`Failed to create mapping for ${mapping.typeCode}: ${mappingError.message}`)
      }
      
      console.log(`✅ [ACCOUNT_MAPPINGS] Successfully created mapping: ${mapping.typeCode} -> ${accountId}`)
      
    } catch (error: any) {
      console.error(`❌ [ACCOUNT_MAPPINGS] Critical error for ${mapping.typeCode}:`, error)
      throw new Error(`Critical error setting up ${mapping.typeCode}: ${error.message}`)
    }
  }
  
  // Verify all critical mappings are now available
  console.log('🔍 [ACCOUNT_MAPPINGS] Verifying essential mappings...')
  const criticalTypes = ['RECEIVABLES', 'REVENUE', 'RENTAL_REVENUE']
  
  for (const typeCode of criticalTypes) {
    const { data: defaultType } = await supabase
      .from('default_account_types')
      .select('id')
      .eq('type_code', typeCode)
      .maybeSingle()
      
    if (!defaultType) {
      console.warn(`⚠️ [ACCOUNT_MAPPINGS] Default type ${typeCode} not found during verification`)
      continue
    }
    
    const { data: mapping } = await supabase
      .from('account_mappings')
      .select('id, chart_of_accounts_id, chart_of_accounts(id, account_name)')
      .eq('company_id', companyId)
      .eq('default_account_type_id', defaultType.id)
      .eq('is_active', true)
      .maybeSingle()
      
    if (!mapping || !mapping.chart_of_accounts) {
      throw new Error(`Critical verification failed: ${typeCode} mapping not found after setup`)
    }
    
    console.log(`✅ [ACCOUNT_MAPPINGS] Verified ${typeCode} -> ${mapping.chart_of_accounts_id} (${mapping.chart_of_accounts.account_name})`)
  }
  
  console.log('🎉 [ACCOUNT_MAPPINGS] All essential account mappings verified and ready!')
}

/**
 * Create journal entry for a contract manually
 * This is a fallback when the database function is not available
 */
export async function createContractJournalEntryManual(
  contractId: string,
  companyId: string
): Promise<ContractJournalEntryResult> {
  try {
    console.log('📝 [JOURNAL_ENTRY] Creating manual journal entry for contract:', contractId)

    // First, ensure we have the necessary account mappings
    await ensureEssentialAccountMappings(companyId)

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return {
        success: false,
        error: 'Contract not found'
      }
    }

    // Skip if contract amount is 0 or negative
    if (contract.contract_amount <= 0) {
      console.log('⚠️ [JOURNAL_ENTRY] Contract amount is 0 or negative, skipping journal entry creation')
      return {
        success: true,
        journal_entry_id: undefined,
        journal_entry_number: undefined
      }
    }

    // Get account mappings with enhanced error handling and correct schema
    let receivableAccount: string | null = null
    let revenueAccount: string | null = null
    
    console.log('🔍 [JOURNAL_ENTRY] Looking up account mappings using correct schema...')
    
    // Try to get RECEIVABLES account mapping
    try {
      const { data: receivablesType } = await supabase
        .from('default_account_types')
        .select('id')
        .eq('type_code', 'RECEIVABLES')
        .maybeSingle()
        
      if (receivablesType) {
        const { data: receivableMapping } = await supabase
          .from('account_mappings')
          .select('chart_of_accounts_id, chart_of_accounts(id, account_name)')
          .eq('company_id', companyId)
          .eq('default_account_type_id', receivablesType.id)
          .eq('is_active', true)
          .maybeSingle()
          
        if (receivableMapping && receivableMapping.chart_of_accounts) {
          receivableAccount = receivableMapping.chart_of_accounts_id
          console.log(`✅ [JOURNAL_ENTRY] Found RECEIVABLES mapping: ${receivableAccount} (${receivableMapping.chart_of_accounts.account_name})`)
        }
      }
      
      if (!receivableAccount) {
        console.warn('⚠️ [JOURNAL_ENTRY] RECEIVABLES mapping not found, trying direct lookup')
        
        // Direct account lookup as fallback
        const { data: receivableAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_name')
          .eq('company_id', companyId)
          .eq('account_type', 'assets')
          .eq('is_active', true)
          .eq('is_header', false)
          .order('created_at', { ascending: true })
          .limit(1)
          
        if (receivableAccounts && receivableAccounts.length > 0) {
          receivableAccount = receivableAccounts[0].id
          console.log(`📋 [JOURNAL_ENTRY] Using first assets account: ${receivableAccount} (${receivableAccounts[0].account_name})`)
        }
      }
    } catch (error) {
      console.error('❌ [JOURNAL_ENTRY] Error looking up receivables account:', error)
    }

    // Try to get REVENUE account mapping (try multiple types)
    try {
      const revenueTypes = ['RENTAL_REVENUE', 'REVENUE', 'SALES_REVENUE']
      
      for (const typeCode of revenueTypes) {
        const { data: revenueType } = await supabase
          .from('default_account_types')
          .select('id')
          .eq('type_code', typeCode)
          .maybeSingle()
          
        if (revenueType) {
          const { data: revenueMapping } = await supabase
            .from('account_mappings')
            .select('chart_of_accounts_id, chart_of_accounts(id, account_name)')
            .eq('company_id', companyId)
            .eq('default_account_type_id', revenueType.id)
            .eq('is_active', true)
            .maybeSingle()
            
          if (revenueMapping && revenueMapping.chart_of_accounts) {
            revenueAccount = revenueMapping.chart_of_accounts_id
            console.log(`✅ [JOURNAL_ENTRY] Found ${typeCode} mapping: ${revenueAccount} (${revenueMapping.chart_of_accounts.account_name})`)
            break
          }
        }
      }
      
      if (!revenueAccount) {
        console.warn('⚠️ [JOURNAL_ENTRY] No revenue mapping found, trying direct lookup')
        
        // Direct account lookup as fallback
        const { data: revenueAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_name')
          .eq('company_id', companyId)
          .eq('account_type', 'revenue')
          .eq('is_active', true)
          .eq('is_header', false)
          .order('created_at', { ascending: true })
          .limit(1)
          
        if (revenueAccounts && revenueAccounts.length > 0) {
          revenueAccount = revenueAccounts[0].id
          console.log(`📋 [JOURNAL_ENTRY] Using first revenue account: ${revenueAccount} (${revenueAccounts[0].account_name})`)
        }
      }
    } catch (error) {
      console.error('❌ [JOURNAL_ENTRY] Error looking up revenue account:', error)
    }

    // Final check if we have required accounts after enhanced mapping setup
    if (!receivableAccount || !revenueAccount) {
      console.error('❌ [JOURNAL_ENTRY] Missing required accounts after comprehensive setup')
      console.error('❌ [JOURNAL_ENTRY] Available accounts:', {
        receivableAccountId: receivableAccount,
        revenueAccountId: revenueAccount
      })
      
      // Return more specific error message
      const missingAccounts = []
      if (!receivableAccount) missingAccounts.push('حساب الذمم المدينة')
      if (!revenueAccount) missingAccounts.push('حساب الإيرادات')
      
      return {
        success: false,
        error: `لا يمكن إنشاء القيد المحاسبي - الحسابات التالية مفقودة: ${missingAccounts.join('، ')}. يرجى إعداد ربط الحسابات في إعدادات الشركة.`,
        journal_entry_id: undefined,
        journal_entry_number: undefined
      }
    }

    // Get sales cost center
    const { data: salesCostCenter } = await supabase
      .from('cost_centers')
      .select('id')
      .eq('company_id', companyId)
      .eq('center_code', 'SALES')
      .eq('is_active', true)
      .limit(1)
      .single()

    // Generate journal entry number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const { data: entryCount } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact' })
      .eq('company_id', companyId)
      .gte('entry_date', new Date().toISOString().split('T')[0])
      .lt('entry_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const journalEntryNumber = `JE-${today}-${String((entryCount?.length || 0) + 1).padStart(4, '0')}`

    // Create journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_number: journalEntryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description: `Contract Revenue - ${contract.contract_number}`,
        reference_type: 'contract',
        reference_id: contractId,
        total_debit: contract.contract_amount,
        total_credit: contract.contract_amount,
        status: 'posted',
        created_by: contract.created_by
      })
      .select()
      .single()

    if (journalError || !journalEntry) {
      console.error('❌ [JOURNAL_ENTRY] Failed to create journal entry:', journalError)
      return {
        success: false,
        error: 'Failed to create journal entry'
      }
    }

    // Create journal entry lines
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert([
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount,
          cost_center_id: salesCostCenter?.id,
          line_number: 1,
          line_description: `Accounts Receivable - ${contract.contract_number}`,
          debit_amount: contract.contract_amount,
          credit_amount: 0
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: revenueAccount,
          cost_center_id: salesCostCenter?.id,
          line_number: 2,
          line_description: `Contract Revenue - ${contract.contract_number}`,
          debit_amount: 0,
          credit_amount: contract.contract_amount
        }
      ])

    if (linesError) {
      console.error('❌ [JOURNAL_ENTRY] Failed to create journal entry lines:', linesError)
      // Try to clean up the journal entry
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id)
      return {
        success: false,
        error: 'Failed to create journal entry lines'
      }
    }

    // Update contract with journal entry reference
    await supabase
      .from('contracts')
      .update({ journal_entry_id: journalEntry.id })
      .eq('id', contractId)

    console.log('✅ [JOURNAL_ENTRY] Successfully created manual journal entry')

    return {
      success: true,
      journal_entry_id: journalEntry.id,
      journal_entry_number: journalEntryNumber
    }

  } catch (error: any) {
    console.error('❌ [JOURNAL_ENTRY] Error creating manual journal entry:', error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

export interface ContractCreationParams {
  p_company_id: string
  p_customer_id: string
  p_vehicle_id?: string | null
  p_contract_type?: string
  p_start_date?: string
  p_end_date?: string
  p_contract_amount?: number
  p_monthly_amount?: number
  p_description?: string | null
  p_terms?: string | null
  p_cost_center_id?: string | null
  p_created_by?: string | null
}

/**
 * Create contract with fallback journal entry creation
 */
export async function createContractWithFallback(contractParams: ContractCreationParams) {
  console.log('🚀 [CONTRACT_CREATION] Starting contract creation with enhanced fallback strategy')
  
  // First, try to manually create the contract with full control
  // This bypasses any database function conflicts
  try {
    console.log('🔄 [CONTRACT_CREATION] Using direct contract creation approach')
    
    // Create contract manually without journal entry first
    const contractData = {
      company_id: contractParams.p_company_id,
      customer_id: contractParams.p_customer_id,
      vehicle_id: contractParams.p_vehicle_id,
      contract_type: contractParams.p_contract_type || 'rental',
      contract_date: new Date().toISOString().split('T')[0],
      start_date: contractParams.p_start_date,
      end_date: contractParams.p_end_date,
      contract_amount: contractParams.p_contract_amount || 0,
      monthly_amount: contractParams.p_monthly_amount || contractParams.p_contract_amount || 0,
      description: contractParams.p_description,
      terms: contractParams.p_terms,
      status: 'draft',
      created_by: contractParams.p_created_by
    }

    // Generate contract number
    const { data: contractCount } = await supabase
      .from('contracts')
      .select('id', { count: 'exact' })
      .eq('company_id', contractParams.p_company_id)

    const contractNumber = `CNT-${new Date().getFullYear().toString().slice(-2)}-${String((contractCount?.length || 0) + 1).padStart(4, '0')}`
    
    // Add contract number to contract data
    const completeContractData = {
      ...contractData,
      contract_number: contractNumber
    }

    // Insert contract
    const { data: newContract, error: contractError } = await supabase
      .from('contracts')
      .insert(completeContractData)
      .select()
      .single()

    if (contractError || !newContract) {
      throw new Error('Failed to create contract: ' + (contractError?.message || 'Unknown error'))
    }

    console.log('✅ [CONTRACT_CREATION] Contract created successfully:', newContract.id)

    // Try to create journal entry manually
    let journalResult
    try {
      journalResult = await createContractJournalEntryManual(
        newContract.id,
        contractParams.p_company_id
      )
    } catch (journalError: any) {
      console.error('❌ [CONTRACT_CREATION] Manual journal entry creation failed:', journalError)
      journalResult = {
        success: false,
        error: journalError.message || 'Failed to create journal entry'
      }
    }

    // Build response similar to the main function
    const response: any = {
      success: true,
      contract_id: newContract.id,
      contract_number: contractNumber
    }

    if (journalResult.success && journalResult.journal_entry_id) {
      response.journal_entry_id = journalResult.journal_entry_id
      response.journal_entry_number = journalResult.journal_entry_number
      
      // Update contract status to active if journal entry was created
      await supabase
        .from('contracts')
        .update({ 
          status: 'active',
          journal_entry_id: journalResult.journal_entry_id 
        })
        .eq('id', newContract.id)
        
      console.log('✅ [CONTRACT_CREATION] Journal entry created successfully')
    } else {
      response.requires_manual_entry = true
      if (journalResult.error) {
        response.warnings = [`Journal entry creation failed: ${journalResult.error}. Contract created but requires manual journal entry.`]
      } else {
        response.warnings = ['Journal entry could not be created automatically. Please create manually.']
      }
      
      console.warn('⚠️ [CONTRACT_CREATION] Contract created but journal entry failed:', {
        contractId: newContract.id,
        journalError: journalResult.error || 'Unknown error'
      })
    }

    return { data: response, error: null }

  } catch (error: any) {
    console.log('⚠️ [CONTRACT_CREATION] Direct creation failed, trying database function approach')
    
    // Try the database function as a secondary approach
    try {
      const { data: result, error: createError } = await supabase
        .rpc('create_contract_with_journal_entry', contractParams)

      if (createError) {
        throw createError
      }

      return { data: result, error: null }
    } catch (dbError: any) {
      console.error('❌ [CONTRACT_CREATION] Both direct and database function approaches failed')
      console.error('❌ [CONTRACT_CREATION] Original error:', error)
      console.error('❌ [CONTRACT_CREATION] Database function error:', dbError)
      
      // Return the most informative error
      if (error.message?.includes('required') || error.message?.includes('validation')) {
        throw error
      } else {
        throw new Error('فشل في إنشاء العقد: ' + (error.message || dbError.message || 'خطأ غير معروف'))
      }
    }
  }
}