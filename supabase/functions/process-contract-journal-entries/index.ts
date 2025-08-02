import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContractCreationLog {
  contract_id: string
  company_id: string
  operation_step: string
  status: string
  error_message?: string
  created_at: string
}

interface Contract {
  id: string
  status: string
  journal_entry_id?: string
  contract_number: string
  company_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 [BACKGROUND_JOB] Starting contract journal entry processing...')

    // Clean up any orphaned logs first
    console.log('🧹 [BACKGROUND_JOB] Cleaning up orphaned logs...')
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_orphaned_contract_logs')
    
    if (cleanupError) {
      console.error('⚠️ [BACKGROUND_JOB] Failed to cleanup orphaned logs:', cleanupError)
    } else {
      console.log(`✅ [BACKGROUND_JOB] Cleaned up ${cleanupResult || 0} orphaned logs`)
    }

    // Get failed journal entry creation attempts from the last 24 hours
    const { data: failedLogs, error: logsError } = await supabase
      .from('contract_creation_log')
      .select(`
        contract_id,
        company_id,
        step_name,
        step_status,
        error_message,
        created_at
      `)
      .eq('step_name', 'journal_entry_creation')
      .in('step_status', ['failed', 'retry_1', 'retry_2', 'retry_3'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('❌ [BACKGROUND_JOB] Failed to fetch failed logs:', logsError)
      throw logsError
    }

    if (!failedLogs || failedLogs.length === 0) {
      console.log('✅ [BACKGROUND_JOB] No failed journal entries to process')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No failed journal entries to process',
          processed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`📋 [BACKGROUND_JOB] Found ${failedLogs.length} failed journal entry logs`)

    // Get unique contract IDs that need processing
    const uniqueContractIds = [...new Set(failedLogs.map(log => log.contract_id))]

    // Check which contracts are active but missing journal entries
    const { data: contractsToProcess, error: contractsError } = await supabase
      .from('contracts')
      .select('id, status, journal_entry_id, contract_number, company_id')
      .in('id', uniqueContractIds)
      .eq('status', 'active')
      .is('journal_entry_id', null)

    if (contractsError) {
      console.error('❌ [BACKGROUND_JOB] Failed to fetch contracts:', contractsError)
      throw contractsError
    }

    if (!contractsToProcess || contractsToProcess.length === 0) {
      console.log('✅ [BACKGROUND_JOB] No active contracts missing journal entries')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active contracts missing journal entries',
          processed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`🔧 [BACKGROUND_JOB] Processing ${contractsToProcess.length} contracts`)

    let processed = 0
    let errors = 0
    const results = []

    // Process each contract
    for (const contract of contractsToProcess as Contract[]) {
      try {
        console.log(`📝 [BACKGROUND_JOB] Processing contract ${contract.contract_number} (${contract.id})`)

        // Double-check that contract still exists and is valid
        const { data: contractExists, error: checkError } = await supabase
          .rpc('validate_contract_exists', {
            contract_id_param: contract.id
          })

        if (checkError) {
          console.error(`❌ [BACKGROUND_JOB] Error validating contract ${contract.contract_number}:`, checkError)
          errors++
          results.push({
            contract_id: contract.id,
            contract_number: contract.contract_number,
            success: false,
            error: `Contract validation failed: ${checkError.message}`
          })
          continue
        }

        if (!contractExists) {
          console.warn(`⚠️ [BACKGROUND_JOB] Contract ${contract.contract_number} no longer exists, skipping...`)
          
          // Mark logs for this contract as obsolete
          await supabase
            .from('contract_creation_log')
            .insert({
              company_id: contract.company_id,
              contract_id: contract.id,
              step_name: 'journal_entry_creation',
              step_status: 'contract_not_found',
              error_message: 'Contract no longer exists in database',
              step_details: {
                background_job: true,
                cleanup_reason: 'contract_deleted',
                contract_number: contract.contract_number
              },
              created_by: null
            })
          
          continue
        }

        // Attempt to create journal entry using the database function
        const { data: journalEntryId, error: journalError } = await supabase
          .rpc('create_contract_journal_entry', {
            contract_id_param: contract.id
          })

        if (journalError) {
          console.error(`❌ [BACKGROUND_JOB] Failed to create journal entry for contract ${contract.contract_number}:`, journalError)
          
          // Log the retry failure
          await supabase
            .from('contract_creation_log')
            .insert({
              company_id: contract.company_id,
              contract_id: contract.id,
              step_name: 'journal_entry_creation',
              step_status: 'background_retry_failed',
              error_message: journalError.message,
              step_details: {
                background_job: true,
                retry_attempt: true,
                contract_number: contract.contract_number
              },
              created_by: null
            })

          errors++
          results.push({
            contract_id: contract.id,
            contract_number: contract.contract_number,
            success: false,
            error: journalError.message
          })
          continue
        }

        if (journalEntryId) {
          console.log(`✅ [BACKGROUND_JOB] Successfully created journal entry ${journalEntryId} for contract ${contract.contract_number}`)
          
          // Log the successful retry
          await supabase
            .from('contract_creation_log')
            .insert({
              company_id: contract.company_id,
              contract_id: contract.id,
              step_name: 'journal_entry_creation',
              step_status: 'background_retry_completed',
              step_details: {
                background_job: true,
                retry_attempt: true,
                journal_entry_id: journalEntryId,
                contract_number: contract.contract_number
              },
              created_by: null
            })

          processed++
          results.push({
            contract_id: contract.id,
            contract_number: contract.contract_number,
            success: true,
            journal_entry_id: journalEntryId
          })
        }

      } catch (error) {
        console.error(`❌ [BACKGROUND_JOB] Unexpected error processing contract ${contract.contract_number}:`, error)
        errors++
        results.push({
          contract_id: contract.id,
          contract_number: contract.contract_number,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`🎉 [BACKGROUND_JOB] Processing complete: ${processed} successful, ${errors} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Background job completed: ${processed} processed, ${errors} failed`,
        processed,
        errors,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ [BACKGROUND_JOB] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processed: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})