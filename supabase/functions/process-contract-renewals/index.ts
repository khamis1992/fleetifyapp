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

    console.log('Starting contract status update and notification processing...')

    // First, update contract statuses (expiration and suspension)
    const { error: statusUpdateError } = await supabaseClient.rpc('update_contract_statuses')
    
    if (statusUpdateError) {
      console.error('Error updating contract statuses:', statusUpdateError)
      throw statusUpdateError
    }

    console.log('Contract status update completed successfully')

    // Get contracts expiring within the next 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data: expiringContracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select(`
        *,
        company:companies(name, name_ar)
      `)
      .in('status', ['active', 'suspended'])
      .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])

    if (contractsError) {
      console.error('Error fetching expiring contracts:', contractsError)
      throw contractsError
    }

    console.log(`Found ${expiringContracts?.length || 0} expiring contracts`)

    const processedContracts = []
    let notificationsSent = 0

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
          .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        if (!existingNotification || existingNotification.length === 0) {
          try {
            // Send expiry warning notification
            await supabaseClient.functions.invoke('send-contract-notifications', {
              body: {
                notification_type: 'expiry_warning',
                contract_id: contract.id,
                company_id: contract.company_id,
                days_until_expiry: daysUntilExpiry
              }
            })

            console.log(`Sent expiry warning for contract ${contract.contract_number}`)
            notificationsSent++
          } catch (error) {
            console.error(`Failed to send expiry warning for contract ${contract.contract_number}:`, error)
          }
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
          .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        if (!existingRenewal || existingRenewal.length === 0) {
          try {
            // Send renewal reminder notification
            await supabaseClient.functions.invoke('send-contract-notifications', {
              body: {
                notification_type: 'renewal_reminder',
                contract_id: contract.id,
                company_id: contract.company_id,
                days_until_expiry: daysUntilExpiry
              }
            })

            console.log(`Sent renewal reminder for contract ${contract.contract_number}`)
            notificationsSent++
          } catch (error) {
            console.error(`Failed to send renewal reminder for contract ${contract.contract_number}:`, error)
          }
        }
      }

      processedContracts.push({
        contract_number: contract.contract_number,
        days_until_expiry: daysUntilExpiry,
        status: contract.status,
        company: contract.company?.name || contract.company?.name_ar
      })
    }

    // Check for contracts with payment issues
    const { data: activeContracts, error: activeError } = await supabaseClient
      .from('contracts')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])

    let paymentReminders = 0
    if (!activeError && activeContracts) {
      for (const contract of activeContracts) {
        // Check payment status
        const { data: paymentStatus, error: paymentError } = await supabaseClient.rpc(
          'check_contract_payment_status',
          { contract_id_param: contract.id }
        )

        if (!paymentError && paymentStatus && paymentStatus.length > 0) {
          const status = paymentStatus[0]
          
          // Send payment reminder for overdue contracts (but not suspended yet)
          if (status.is_overdue && status.days_overdue > 7 && status.days_overdue <= 30) {
            try {
              await supabaseClient.functions.invoke('send-contract-notifications', {
                body: {
                  notification_type: 'payment_reminder',
                  contract_id: contract.id,
                  company_id: contract.company_id,
                  overdue_amount: status.overdue_amount,
                  days_overdue: status.days_overdue
                }
              })

              console.log(`Sent payment reminder for contract ${contract.contract_number}`)
              paymentReminders++
            } catch (error) {
              console.error(`Failed to send payment reminder for contract ${contract.contract_number}:`, error)
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contract processing completed. Updated statuses and processed ${processedContracts.length} contracts.`,
        processed_contracts: processedContracts.length,
        notifications_sent: notificationsSent,
        payment_reminders: paymentReminders,
        contracts: processedContracts,
        timestamp: new Date().toISOString()
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