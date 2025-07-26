import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmartRenewalRequest {
  contract_ids: string[];
  renewal_settings: {
    duration_months: number;
    new_amount?: number;
    terms?: string;
    auto_renew_enabled?: boolean;
  };
  company_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contract_ids, renewal_settings, company_id }: SmartRenewalRequest = await req.json()

    console.log('Processing smart renewal for contracts:', contract_ids)

    const processedContracts = []
    const failedContracts = []

    for (const contractId of contract_ids) {
      try {
        // Get the original contract with related data
        const { data: originalContract, error: fetchError } = await supabaseClient
          .from('contracts')
          .select(`
            *,
            customer:customers(first_name, last_name, company_name),
            vehicle:vehicles(plate_number, make, model)
          `)
          .eq('id', contractId)
          .eq('company_id', company_id)
          .single()

        if (fetchError) {
          console.error(`Error fetching contract ${contractId}:`, fetchError)
          failedContracts.push({ contractId, error: fetchError.message })
          continue
        }

        // Verify the contract is eligible for smart renewal
        if (originalContract.status !== 'expired') {
          failedContracts.push({ 
            contractId, 
            error: 'Contract is not expired' 
          })
          continue
        }

        if (originalContract.vehicle_returned === true) {
          failedContracts.push({ 
            contractId, 
            error: 'Vehicle has already been returned' 
          })
          continue
        }

        // Calculate new dates
        const currentDate = new Date()
        const newStartDate = currentDate.toISOString().split('T')[0]
        const newEndDate = new Date()
        newEndDate.setMonth(newEndDate.getMonth() + renewal_settings.duration_months)
        const newEndDateStr = newEndDate.toISOString().split('T')[0]

        // Calculate new contract amount (use provided amount or add 10% to original)
        const newAmount = renewal_settings.new_amount || (originalContract.contract_amount * 1.1)
        
        // Create new contract
        const { data: newContract, error: createError } = await supabaseClient
          .from('contracts')
          .insert({
            contract_number: `${originalContract.contract_number}-SR${Date.now()}`,
            contract_date: newStartDate,
            start_date: newStartDate,
            end_date: newEndDateStr,
            contract_amount: newAmount,
            monthly_amount: newAmount / renewal_settings.duration_months,
            contract_type: originalContract.contract_type,
            customer_id: originalContract.customer_id,
            vehicle_id: originalContract.vehicle_id,
            cost_center_id: originalContract.cost_center_id,
            description: `تجديد ذكي: ${originalContract.description || ''}`,
            terms: renewal_settings.terms || `تجديد ذكي للعقد الأصلي رقم ${originalContract.contract_number}`,
            status: 'active',
            company_id: company_id,
            auto_renew_enabled: renewal_settings.auto_renew_enabled || false,
            vehicle_returned: false
          })
          .select()
          .single()

        if (createError) {
          console.error(`Error creating renewed contract for ${contractId}:`, createError)
          failedContracts.push({ contractId, error: createError.message })
          continue
        }

        // Update original contract status
        const { error: updateError } = await supabaseClient
          .from('contracts')
          .update({ 
            status: 'renewed',
            last_renewal_check: new Date().toISOString()
          })
          .eq('id', contractId)

        if (updateError) {
          console.error(`Error updating original contract ${contractId}:`, updateError)
          // Don't fail the entire process for this
        }

        // Send renewal notification
        try {
          await supabaseClient.functions.invoke('send-contract-notifications', {
            body: {
              notification_type: 'smart_renewal_completed',
              contract_id: newContract.id,
              company_id: company_id,
              original_contract_id: contractId
            }
          })
        } catch (notifError) {
          console.warn(`Failed to send notification for contract ${contractId}:`, notifError)
          // Don't fail the process for notification errors
        }

        processedContracts.push({
          original_contract_id: contractId,
          new_contract_id: newContract.id,
          contract_number: newContract.contract_number,
          customer_name: originalContract.customer ? 
            `${originalContract.customer.first_name || ''} ${originalContract.customer.last_name || ''}`.trim() ||
            originalContract.customer.company_name : 'Unknown',
          vehicle_info: originalContract.vehicle ? 
            `${originalContract.vehicle.make} ${originalContract.vehicle.model} (${originalContract.vehicle.plate_number})` : 
            'No Vehicle',
          new_amount: newAmount,
          duration_months: renewal_settings.duration_months
        })

      } catch (error) {
        console.error(`Unexpected error processing contract ${contractId}:`, error)
        failedContracts.push({ contractId, error: error.message })
      }
    }

    console.log(`Smart renewal completed: ${processedContracts.length} successful, ${failedContracts.length} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم تجديد ${processedContracts.length} عقد بنجاح`,
        processed_contracts: processedContracts,
        failed_contracts: failedContracts,
        summary: {
          total_requested: contract_ids.length,
          successful: processedContracts.length,
          failed: failedContracts.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-smart-contract-renewals:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})