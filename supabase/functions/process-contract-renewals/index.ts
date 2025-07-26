import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting contract renewal processing...')

    // Get contracts expiring within the next 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data: expiringContracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select(`
        *,
        company:companies(name, name_ar)
      `)
      .eq('status', 'active')
      .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])

    if (contractsError) {
      console.error('Error fetching expiring contracts:', contractsError)
      throw contractsError
    }

    console.log(`Found ${expiringContracts?.length || 0} expiring contracts`)

    const processedContracts = []

    for (const contract of expiringContracts || []) {
      const daysUntilExpiry = Math.ceil(
        (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      console.log(`Processing contract ${contract.contract_number}, expires in ${daysUntilExpiry} days`)

      // Send expiry warning at 30, 15, 7, and 1 days before expiry
      if ([30, 15, 7, 1].includes(daysUntilExpiry)) {
        // Check if notification already sent for this day
        const { data: existingNotification } = await supabaseClient
          .from('contract_notifications')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('notification_type', 'expiry_warning')
          .gte('created_at', new Date().toISOString().split('T')[0])
          .single()

        if (!existingNotification) {
          // Send expiry warning notification
          await supabaseClient.functions.invoke('send-contract-notifications', {
            body: {
              notification_type: 'expiry_warning',
              contract_id: contract.id,
              company_id: contract.company_id
            }
          })

          console.log(`Sent expiry warning for contract ${contract.contract_number}`)
        }
      }

      // Send renewal reminder at 15 and 7 days before expiry
      if ([15, 7].includes(daysUntilExpiry)) {
        // Check if renewal reminder already sent for this day
        const { data: existingRenewal } = await supabaseClient
          .from('contract_notifications')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('notification_type', 'renewal_reminder')
          .gte('created_at', new Date().toISOString().split('T')[0])
          .single()

        if (!existingRenewal) {
          // Send renewal reminder notification
          await supabaseClient.functions.invoke('send-contract-notifications', {
            body: {
              notification_type: 'renewal_reminder',
              contract_id: contract.id,
              company_id: contract.company_id
            }
          })

          console.log(`Sent renewal reminder for contract ${contract.contract_number}`)
        }
      }

      processedContracts.push({
        contract_number: contract.contract_number,
        days_until_expiry: daysUntilExpiry,
        company: contract.company?.name || contract.company?.name_ar
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم معالجة ${processedContracts.length} عقد`,
        processed_contracts: processedContracts.length,
        contracts: processedContracts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-contract-renewals:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})