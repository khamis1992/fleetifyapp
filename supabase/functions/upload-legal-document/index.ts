import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Upload Legal Document function up and running!")

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileBase64, filename } = await req.json()

    if (!fileBase64 || !filename) {
      throw new Error('Missing fileBase64 or filename')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Convert Base64 to Uint8Array
    const binaryString = atob(fileBase64.split(',')[1] || fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create unique filename to prevent overwrites
    // Ensure filename is safe
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `legal-documents/${timestamp}-${safeFilename}`;

    console.log(`Uploading to ${storagePath}...`)

    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, bytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get Public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    console.log('Upload successful:', publicUrl)

    // Schedule cleanup after 1 hour (optional, but good practice if these are temp files)
    // For now we keep them as they might be needed later.

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl: publicUrl,
        path: storagePath
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
