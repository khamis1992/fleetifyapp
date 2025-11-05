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

    // Format phone number according to Ultramsg API requirements
    // Required format: +1408XXXXXXX (international format with +)
    let formattedPhone = phone.trim();
    
    // Remove all non-digits except +
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    
    // If starts with 00, replace with +
    if (formattedPhone.startsWith('00')) {
      formattedPhone = '+' + formattedPhone.substring(2);
    }
    // If starts with country code without +, add +
    else if (formattedPhone.length > 0 && !formattedPhone.startsWith('+')) {
      // Common country codes: 974 (Qatar/Kuwait), 966 (Saudi), 971 (UAE), etc.
      // For Kuwait/Qatar numbers starting with 974, add +
      if (formattedPhone.startsWith('974')) {
        formattedPhone = '+' + formattedPhone;
      }
      // For other formats, assume international format needed
      else if (formattedPhone.length >= 8) {
        formattedPhone = '+' + formattedPhone;
      }
    }
    
    // Validate phone number (must have + and at least 8 digits)
    if (!formattedPhone.startsWith('+') || formattedPhone.length < 10) {
      console.error(`❌ Invalid phone format: ${phone} → ${formattedPhone}`);
      return { 
        success: false, 
        error: `Invalid phone number format. Expected international format with + (e.g., +97412345678). Got: ${phone}` 
      };
    }

    console.log(`📞 Sending to: ${formattedPhone} (original: ${phone})`);

    // Validate message length (Ultramsg max: 4096 characters)
    if (message.length > 4096) {
      console.warn(`⚠️ Message too long (${message.length} chars), truncating to 4096`);
      message = message.substring(0, 4096);
    }
    
    // Prepare request body according to Ultramsg API documentation
    // API Reference: https://docs.ultramsg.com/api/post/messages/chat
    const requestBody = {
      token: ULTRAMSG_TOKEN,
      to: formattedPhone, // International format: +1408XXXXXXX
      body: message, // UTF-8 or UTF-16 string with emoji, max 4096 characters
    };
    
    console.log('📤 Sending to Ultramsg API:', {
      url: `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      to: formattedPhone,
      messageLength: message.length,
    });
    
    // Call Ultramsg API
    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Parse response
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Ultramsg response:', responseText);
      return { 
        success: false, 
        error: `Invalid response from Ultramsg: ${responseText.substring(0, 100)}` 
      };
    }
    
    // Log full response for debugging
    console.log('📥 Ultramsg API Response:', JSON.stringify(data));
    
    // Check response according to Ultramsg API documentation
    // Success indicators: sent=true, or id/msgId present, or status='sent'
    if (data.sent === 'true' || data.sent === true || data.id || data.msgId || data.status === 'sent') {
      return { 
        success: true, 
        messageId: data.id || data.msgId || data.messageId || 'unknown'
      };
    } 
    // Check for error response
    else if (data.error || data.message) {
      const errorMsg = data.error || data.message || 'Unknown error from Ultramsg';
      console.error('❌ Ultramsg API Error:', errorMsg);
      return { 
        success: false, 
        error: errorMsg
      };
    }
    // If response status is not OK, treat as error
    else if (!response.ok) {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    // Unknown response format
    else {
      console.warn('⚠️ Unknown response format from Ultramsg:', data);
      return { 
        success: false, 
        error: `Unexpected response format: ${JSON.stringify(data).substring(0, 200)}` 
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

    // Fetch grouped reminders (one per customer)
    const { data: groupedReminders, error: fetchError } = await supabase.rpc(
      'get_grouped_reminders_for_today'
    );

    if (fetchError) {
      console.error('❌ Error fetching grouped reminders:', fetchError);
      throw fetchError;
    }

    if (!groupedReminders || groupedReminders.length === 0) {
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

    console.log(`📤 Processing ${groupedReminders.length} grouped reminders...`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each grouped reminder
    for (const group of groupedReminders) {
      console.log(`\n📨 Processing group for ${group.customer_name} (${group.invoice_count} invoices)`);
      
      // Generate grouped message
      const { data: messageData, error: msgError } = await supabase.rpc(
        'generate_grouped_reminder_message',
        {
          p_customer_name: group.customer_name,
          p_invoices_data: group.invoices_data,
          p_total_amount: group.total_amount,
          p_invoice_count: group.invoice_count,
          p_reminder_type: group.reminder_type,
          p_company_id: group.company_id
        }
      );

      if (msgError) {
        console.error(`❌ Error generating message:`, msgError);
        failedCount++;
        continue;
      }

      const message = messageData;
      console.log(`📝 Generated message (${message.length} chars)`);
      
      const sendResult = await sendWhatsAppMessage(
        group.phone_number,
        message
      );

      // Get all reminder IDs in this group
      const reminderIds = group.invoices_data.map((inv: any) => inv.reminder_id);

      if (sendResult.success) {
        // Update ALL reminders in group to 'sent'
        const { error: updateError } = await supabase
          .from('reminder_schedules')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            delivery_status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .in('id', reminderIds);

        if (updateError) {
          console.error(`❌ Error updating reminders:`, updateError);
        }

        // Log to reminder_history for each reminder
        const historyRecords = reminderIds.map((rid: string) => ({
          reminder_schedule_id: rid,
          action: 'sent',
          success: true,
          phone_number: group.phone_number,
          message_sent: message,
        }));

        await supabase
          .from('reminder_history')
          .insert(historyRecords);

        successCount++;
        console.log(`✅ Sent grouped message to ${group.customer_name} (${group.phone_number})`);
        console.log(`   📊 Covered ${group.invoice_count} invoices, total: ${group.total_amount}`);
        
        results.push({
          customer: group.customer_name,
          status: 'sent',
          invoice_count: group.invoice_count,
          total_amount: group.total_amount,
          messageId: sendResult.messageId
        });
      } else {
        // Update ALL reminders in group to 'failed'
        const { error: updateError } = await supabase
          .from('reminder_schedules')
          .update({
            status: 'failed',
            last_error: sendResult.error || 'Unknown error',
            retry_count: supabase.raw('COALESCE(retry_count, 0) + 1'),
            next_retry_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', reminderIds);

        if (updateError) {
          console.error(`❌ Error updating failed reminders:`, updateError);
        }

        // Log to reminder_history
        const historyRecords = reminderIds.map((rid: string) => ({
          reminder_schedule_id: rid,
          action: 'failed',
          success: false,
          phone_number: group.phone_number,
          error_message: sendResult.error || 'Unknown error',
        }));

        await supabase
          .from('reminder_history')
          .insert(historyRecords);

        failedCount++;
        console.log(`❌ Failed to send to ${group.customer_name}: ${sendResult.error}`);
        
        results.push({
          customer: group.customer_name,
          status: 'failed',
          invoice_count: group.invoice_count,
          error: sendResult.error
        });
      }

      // Delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Processing complete in ${duration}ms`);
    console.log(`📊 Results: ${successCount} customers sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${groupedReminders.length} grouped reminders (${successCount} customers)`,
        customers_sent: successCount,
        customers_failed: failedCount,
        total_groups: groupedReminders.length,
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

