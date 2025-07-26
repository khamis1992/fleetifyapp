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

    const { notification_type, contract_id, company_id } = await req.json()

    console.log('Processing notification:', { notification_type, contract_id, company_id })

    // Get contract details
    const { data: contract, error: contractError } = await supabaseClient
      .from('contracts')
      .select(`
        *,
        customer:customers(first_name, last_name, company_name, email, phone),
        company:companies(name, name_ar)
      `)
      .eq('id', contract_id)
      .single()

    if (contractError) {
      console.error('Error fetching contract:', contractError)
      throw contractError
    }

    // Get notification settings for users in the company
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        notification_settings(email_notifications, sms_notifications, expiry_reminder_days, renewal_reminder_days)
      `)
      .eq('company_id', company_id)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    const notifications = []

    for (const user of users || []) {
      let title = ''
      let message = ''
      let shouldSend = false

      switch (notification_type) {
        case 'expiry_warning':
          const daysUntilExpiry = Math.ceil(
            (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          
          if (user.notification_settings?.[0]?.expiry_reminder_days >= daysUntilExpiry) {
            title = 'تنبيه انتهاء عقد'
            message = `العقد رقم ${contract.contract_number} سينتهي خلال ${daysUntilExpiry} يوم. يرجى اتخاذ الإجراء اللازم.`
            shouldSend = true
          }
          break

        case 'renewal_reminder':
          const daysUntilRenewal = Math.ceil(
            (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          
          if (user.notification_settings?.[0]?.renewal_reminder_days >= daysUntilRenewal) {
            title = 'تذكير تجديد عقد'
            message = `حان وقت تجديد العقد رقم ${contract.contract_number}. يرجى مراجعة شروط التجديد.`
            shouldSend = true
          }
          break

        case 'approval_required':
          title = 'موافقة مطلوبة على عقد'
          message = `العقد رقم ${contract.contract_number} يحتاج إلى موافقتك. يرجى مراجعة التفاصيل والموافقة أو الرفض.`
          shouldSend = true
          break

        case 'status_change':
          title = 'تغيير حالة عقد'
          message = `تم تغيير حالة العقد رقم ${contract.contract_number} إلى "${contract.status}".`
          shouldSend = true
          break
      }

      if (shouldSend && user.notification_settings?.[0]?.email_notifications) {
        // Create notification record
        const { error: notificationError } = await supabaseClient
          .from('contract_notifications')
          .insert({
            company_id,
            contract_id,
            notification_type,
            recipient_id: user.user_id,
            recipient_email: user.email,
            title,
            message,
            delivery_status: 'pending'
          })

        if (notificationError) {
          console.error('Error creating notification:', notificationError)
        } else {
          notifications.push({
            recipient: user.email,
            title,
            message
          })
        }
      }
    }

    // In a production environment, you would send actual emails here
    // For now, we'll just log the notifications that would be sent
    console.log('Notifications to be sent:', notifications)

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم إنشاء ${notifications.length} إشعار`,
        notifications_count: notifications.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-contract-notifications:', error)
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