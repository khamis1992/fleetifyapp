/**
 * Supabase Edge Function: Send WhatsApp Document
 * ================================================
 * Purpose: Send PDF documents via WhatsApp using Ultramsg API
 * This bypasses CORS issues by running on the server side
 * 
 * Approach: Store PDF in Supabase Storage, then send URL via WhatsApp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Ultramsg configuration
const ULTRAMSG_INSTANCE_ID = 'instance148672';
const ULTRAMSG_TOKEN = 'rls3i8flwugsei1j';

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Format phone number for WhatsApp
 */
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  if (!cleaned.startsWith('974') && cleaned.length === 8) {
    cleaned = '974' + cleaned;
  }
  return cleaned;
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, documentBase64, filename, caption } = await req.json();

    if (!phone || !documentBase64 || !filename) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: phone, documentBase64, filename'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const formattedPhone = formatPhone(phone);
    console.log(`📎 Sending document to ${formattedPhone}`);
    console.log(`📄 Filename: ${filename}`);

    // Extract base64 data
    let base64Data = documentBase64;
    if (base64Data.startsWith('data:')) {
      base64Data = base64Data.split(',')[1] || base64Data;
    }

    console.log(`📤 Document size: ${Math.round(base64Data.length / 1024)} KB`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Convert base64 to binary
    const pdfBytes = base64ToUint8Array(base64Data);
    
    // Generate unique filename
    const uniqueFilename = `whatsapp-docs/${Date.now()}-${filename}`;
    
    console.log(`📤 Uploading to Storage: ${uniqueFilename}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(uniqueFilename, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      
      // Fallback to direct base64 method
      console.log('⚠️ Falling back to direct base64 method...');
      
      const documentDataUri = `data:application/pdf;base64,${base64Data}`;
      const sendUrl = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/document`;
      
      const params = new URLSearchParams();
      params.append('token', ULTRAMSG_TOKEN);
      params.append('to', formattedPhone);
      params.append('filename', filename);
      params.append('document', documentDataUri);
      if (caption) {
        params.append('caption', caption);
      }
      
      const sendResponse = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const sendData = await sendResponse.json();
      console.log('📩 Direct Send Response:', JSON.stringify(sendData));

      if (sendData.sent === 'true' || sendData.sent === true || sendData.id) {
        return new Response(JSON.stringify({
          success: true,
          messageId: sendData.id,
          method: 'direct-base64'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: sendData.error || sendData.message || 'Failed to send document',
          response: sendData
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uniqueFilename);

    const publicUrl = urlData.publicUrl;
    console.log(`✅ Uploaded to: ${publicUrl}`);

    // Send document via Ultramsg using the URL
    const sendUrl = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/document`;
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: ULTRAMSG_TOKEN,
        to: formattedPhone,
        filename: filename,
        document: publicUrl,
        caption: caption || '',
      }),
    });

    const sendData = await sendResponse.json();
    console.log('📩 Send Response:', JSON.stringify(sendData));

    if (sendData.sent === 'true' || sendData.sent === true || sendData.id) {
      console.log(`✅ Document sent successfully via URL`);
      
      // Schedule cleanup (delete file after 1 hour)
      // Note: This runs asynchronously and may not complete
      setTimeout(async () => {
        try {
          await supabase.storage.from('documents').remove([uniqueFilename]);
          console.log(`🗑️ Cleaned up: ${uniqueFilename}`);
        } catch (e) {
          console.log(`⚠️ Cleanup failed: ${e.message}`);
        }
      }, 3600000); // 1 hour
      
      return new Response(JSON.stringify({
        success: true,
        messageId: sendData.id,
        method: 'storage-url',
        url: publicUrl
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      const errorMsg = Array.isArray(sendData.error) 
        ? sendData.error.join(', ') 
        : (sendData.error || sendData.message || 'Failed to send document');
      
      console.error(`❌ Failed to send: ${errorMsg}`);
      
      return new Response(JSON.stringify({
        success: false,
        error: errorMsg,
        response: sendData
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
