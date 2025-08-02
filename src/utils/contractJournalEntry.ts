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
 * Create journal entry for a contract manually
 * This is a fallback when the database function is not available
 */
export async function createContractJournalEntryManual(
  contractId: string,
  companyId: string
): Promise<ContractJournalEntryResult> {
  try {
    console.log('📝 [JOURNAL_ENTRY] Creating manual journal entry for contract:', contractId)

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

    // Get account mappings
    const { data: receivableAccount } = await supabase
      .rpc('get_mapped_account_enhanced', {
        company_id_param: companyId,
        account_type_code_param: 'RECEIVABLES'
      })

    let { data: revenueAccount } = await supabase
      .rpc('get_mapped_account_enhanced', {
        company_id_param: companyId,
        account_type_code_param: 'RENTAL_REVENUE'
      })

    // Fallback to sales revenue if rental revenue not found
    if (!revenueAccount) {
      const { data: salesRevenue } = await supabase
        .rpc('get_mapped_account_enhanced', {
          company_id_param: companyId,
          account_type_code_param: 'SALES_REVENUE'
        })
      revenueAccount = salesRevenue
    }

    // Check if we have required accounts
    if (!receivableAccount || !revenueAccount) {
      console.log('⚠️ [JOURNAL_ENTRY] Missing account mappings, skipping journal entry creation')
      return {
        success: true,
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
  try {
    // First try the main function
    const { data: result, error: createError } = await supabase
      .rpc('create_contract_with_journal_entry', contractParams)

    if (createError) {
      throw createError
    }

    return { data: result, error: null }

  } catch (error: any) {
    console.log('⚠️ [CONTRACT_CREATION] Main function failed, trying fallback approach')

    // If main function fails due to missing create_contract_journal_entry function,
    // try to create contract without journal entry first, then add journal entry manually
    if (error.message?.includes('create_contract_journal_entry') && 
        error.message?.includes('does not exist')) {
      
      console.log('🔄 [CONTRACT_CREATION] Using fallback: creating contract without journal entry first')
      
      try {
        // Create contract manually without journal entry
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

        // Try to create journal entry manually
        const journalResult = await createContractJournalEntryManual(
          newContract.id,
          contractParams.p_company_id
        )

        // Build response similar to the main function
        const response: any = {
          success: true,
          contract_id: newContract.id,
          contract_number: contractNumber
        }

        if (journalResult.success && journalResult.journal_entry_id) {
          response.journal_entry_id = journalResult.journal_entry_id
          response.journal_entry_number = journalResult.journal_entry_number
        } else {
          response.requires_manual_entry = true
          response.warnings = ['Journal entry could not be created automatically. Please create manually.']
        }

        return { data: response, error: null }

      } catch (fallbackError: any) {
        console.error('❌ [CONTRACT_CREATION] Fallback also failed:', fallbackError)
        throw fallbackError
      }
    }

    // If it's a different error, re-throw it
    throw error
  }
}