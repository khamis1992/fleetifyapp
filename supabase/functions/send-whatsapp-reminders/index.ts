/**
 * Supabase Edge Function: Send WhatsApp Reminders
 * ================================================
 * Purpose: Process queued payment reminders and send via WhatsApp
 * Integration: Ultramsg API
 * Trigger: Manual invoke or Cron job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const ULTRAMSG_INSTANCE_ID = Deno.env.get('ULTRAMSG_INSTANCE_ID');
const ULTRAMSG_TOKEN = Deno.env.get('ULTRAMSG_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Reminder {
  id: string;
  phone_number: string;
  message_template: string;
  customer_name: string;
  invoice_id: string;
  customer_id: string;
  reminder_type: string;
}

/**
 * Send WhatsApp message via Ultramsg API
 */
async function sendWhatsAppMessage(
  phone: string, 
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Validate environment variables
    if (!ULTRAMSG_INSTANCE_ID || !ULTRAMSG_TOKEN) {
      console.error('❌ Missing Ultramsg credentials');
      return { 
        success: false, 
        error: 'Missing Ultramsg credentials. Please configure ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN.' 
      };
    }

    // Format phone number (remove all non-digits)
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Validate phone number
    if (!formattedPhone || formattedPhone.length < 8) {
      return { success: false, error: 'Invalid phone number format' };
    }

    console.log(`📞 Sending to: ${formattedPhone}`);

    // Call Ultramsg API
    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: ULTRAMSG_TOKEN,
          to: formattedPhone,
          body: message,
        }),
      }
    );

    const data = await response.json();
    
    // Check response
    if (data.sent === 'true' || data.sent === true) {
      return { 
        success: true, 
        messageId: data.id || data.msgId 
      };
    } else {
      return { 
        success: false, 
        error: data.error || 'Unknown error from Ultramsg' 
      };
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { 
      success: false, 
      error: error.message || 'Network error' 
    };
  }
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const startTime = Date.now();

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }

    console.log('🚀 Starting WhatsApp reminder processing...');

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check for test mode
    const body = await req.json().catch(() => ({}));
    if (body.test && body.phone && body.message) {
      console.log('🧪 Test mode: sending single message');
      const result = await sendWhatsAppMessage(body.phone, body.message);
      
      return new Response(
        JSON.stringify({ 
          success: result.success,
          message: result.success ? 'Test message sent!' : 'Failed to send test message',
          error: result.error,
          messageId: result.messageId
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Fetch queued reminders
    const { data: reminders, error: fetchError } = await supabase
      .from('reminder_schedules')
      .select('id, phone_number, message_template, customer_name, invoice_id, customer_id, reminder_type')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50); // Process max 50 at a time

    if (fetchError) {
      console.error('❌ Error fetching reminders:', fetchError);
      throw fetchError;
    }

    if (!reminders || reminders.length === 0) {
      console.log('📭 No reminders to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No reminders in queue',
          sent: 0,
          failed: 0,
          duration: Date.now() - startTime
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    console.log(`📤 Processing ${reminders.length} reminders...`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each reminder
    for (const reminder of reminders as Reminder[]) {
      console.log(`\n📨 Processing reminder ${reminder.id} for ${reminder.customer_name}`);
      
      const sendResult = await sendWhatsAppMessage(
        reminder.phone_number,
        reminder.message_template
      );

      if (sendResult.success) {
        // Update status to 'sent'
        const { error: updateError } = await supabase
          .from('reminder_schedules')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            delivery_status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`❌ Error updating reminder ${reminder.id}:`, updateError);
        }

        // Log to reminder_history
        await supabase
          .from('reminder_history')
          .insert({
            reminder_schedule_id: reminder.id,
            action: 'sent',
            success: true,
            phone_number: reminder.phone_number,
            message_sent: reminder.message_template,
          });

        successCount++;
        console.log(`✅ Sent to ${reminder.customer_name} (${reminder.phone_number})`);
        
        results.push({
          id: reminder.id,
          status: 'sent',
          customer: reminder.customer_name,
          messageId: sendResult.messageId
        });
      } else {
        // Update status to 'failed'
        const { error: updateError } = await supabase
          .from('reminder_schedules')
          .update({
            status: 'failed',
            last_error: sendResult.error || 'Unknown error',
            retry_count: supabase.raw('COALESCE(retry_count, 0) + 1'),
            next_retry_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Retry in 30 mins
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`❌ Error updating failed reminder ${reminder.id}:`, updateError);
        }

        // Log to reminder_history
        await supabase
          .from('reminder_history')
          .insert({
            reminder_schedule_id: reminder.id,
            action: 'failed',
            success: false,
            phone_number: reminder.phone_number,
            error_message: sendResult.error || 'Unknown error',
          });

        failedCount++;
        console.log(`❌ Failed to send to ${reminder.customer_name}: ${sendResult.error}`);
        
        results.push({
          id: reminder.id,
          status: 'failed',
          customer: reminder.customer_name,
          error: sendResult.error
        });
      }

      // Delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Processing complete in ${duration}ms`);
    console.log(`📊 Results: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${reminders.length} reminders`,
        sent: successCount,
        failed: failedCount,
        duration,
        results,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('💥 Error in send-whatsapp-reminders:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        duration: Date.now() - startTime
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

