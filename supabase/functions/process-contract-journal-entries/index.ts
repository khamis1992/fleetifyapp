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

    // Get failed journal entry creation attempts from the last 24 hours
    const { data: failedLogs, error: logsError } = await supabase
      .from('contract_creation_log')
      .select(`
        contract_id,
        company_id,
        operation_step,
        status,
        error_message,
        created_at
      `)
      .eq('operation_step', 'journal_entry_creation')
      .eq('status', 'failed')
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
              operation_step: 'journal_entry_creation',
              status: 'background_retry_failed',
              error_message: journalError.message,
              metadata: {
                background_job: true,
                retry_attempt: true,
                contract_number: contract.contract_number
              }
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
              operation_step: 'journal_entry_creation',
              status: 'background_retry_completed',
              metadata: {
                background_job: true,
                retry_attempt: true,
                journal_entry_id: journalEntryId,
                contract_number: contract.contract_number
              }
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